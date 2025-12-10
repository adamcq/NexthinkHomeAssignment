import { Prisma, Article } from '@prisma/client';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { LLMClassificationService, ClassificationResult, RateLimitError } from './LLMClassificationService';
import { EmbeddingService } from './EmbeddingService';
import { SourceMetadata, EnrichedMetadata } from '../types/metadata';

export interface ArticleIngestionInput {
  title: string;
  content: string;
  summary?: string | null;
  url: string;
  source: string;
  sourceId: string;
  author?: string | null;
  publishedAt: Date;
  metadata?: SourceMetadata;
}

interface IngestionResult {
  article: Article;
  embeddingStored: boolean;
}

export class ArticleIngestionService {
  private classificationService: LLMClassificationService;
  private embeddingService: EmbeddingService;

  constructor(
    classificationService?: LLMClassificationService,
    embeddingService?: EmbeddingService
  ) {
    this.classificationService = classificationService || new LLMClassificationService();
    this.embeddingService = embeddingService || require('./EmbeddingService').embeddingService;
  }

  async ingestArticle(input: ArticleIngestionInput): Promise<IngestionResult> {
    let embedding: number[] | null = null;

    // Generate embedding
    try {
      embedding = await this.embeddingService.embed(this.buildEmbeddingText(input));
    } catch (error) {
      logger.warn('Embedding generation failed, continuing without vector data', error);
    }

    const metadata = this.buildMetadata(input.metadata);

    const article = await prisma.article.create({
      data: {
        title: input.title,
        content: input.content,
        summary: input.summary,
        url: input.url,
        source: input.source,
        sourceId: input.sourceId,
        author: input.author,
        publishedAt: input.publishedAt,
        metadata: metadata as unknown as Prisma.JsonValue,
        classificationStatus: 'PENDING',
      },
    });

    if (embedding?.length) {
      await this.persistEmbedding(article.id, embedding);
    }

    // Queue for classification immediately - no database scanning needed
    try {
      const { classificationQueue } = await import('../workers/classificationQueue');
      await classificationQueue.add({ articleId: article.id });
      logger.debug(`Queued article ${article.id} for classification`);
    } catch (error) {
      logger.warn(`Failed to queue article ${article.id} for classification:`, error);
      // Don't fail ingestion if queueing fails - article will be in PENDING state
      // and can be picked up by a backfill script if needed
    }

    return {
      article,
      embeddingStored: Boolean(embedding?.length),
    };
  }

  private buildMetadata(
    baseMetadata: SourceMetadata | undefined
  ): EnrichedMetadata | undefined {
    if (!baseMetadata) {
      return undefined;
    }

    // Start with the source metadata
    return { ...baseMetadata };
  }

  private buildEmbeddingText(input: ArticleIngestionInput): string {
    const contentOrSummary = input.content || input.summary || '';
    const truncatedContent = contentOrSummary.substring(0, 4000); // should give enough context
    return `${input.title}\n\n${truncatedContent}\n\n${input.metadata ? JSON.stringify(input.metadata) : ''}`;
  }

  private async persistEmbedding(articleId: string, embedding: number[]): Promise<void> {
    const literal = this.formatVectorLiteral(embedding);
    await prisma.$executeRaw`UPDATE "Article" SET embedding = ${literal}::vector WHERE id = ${articleId}`;
  }

  private formatVectorLiteral(values: number[]): string {
    const trimmed = values.map((value) => {
      if (!Number.isFinite(value)) {
        return '0';
      }
      return Number(value).toFixed(6);
    });

    return `[${trimmed.join(',')}]`;
  }
}

export const articleIngestionService = new ArticleIngestionService();
