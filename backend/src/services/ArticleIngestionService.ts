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
  classification: ClassificationResult | null;
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
    let classification: ClassificationResult | null = null;
    let embedding: number[] | null = null;

    // Classify article - REQUIRED for ingestion
    try {
      classification = await this.classificationService.classifyArticle(
        input.title,
        input.content,
        input.metadata
      );
    } catch (error) {
      // Re-throw rate limit errors - caller must handle retry logic
      if (error instanceof RateLimitError) {
        logger.error('Rate limit exceeded during classification, cannot ingest article', {
          retryAfterSeconds: error.retryAfterSeconds,
        });
        throw error;
      }
      
      // For other errors, also fail the ingestion - we require classification
      logger.error('Article classification failed, cannot ingest without classification', error);
      throw error;
    }

    // Generate embedding
    try {
      embedding = await this.embeddingService.embed(this.buildEmbeddingText(input));
    } catch (error) {
      logger.warn('Embedding generation failed, continuing without vector data', error);
    }

    const metadata = this.buildMetadata(input.metadata, classification);

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
        category: classification?.category ?? null,
        categoryScore: classification?.confidence ?? null,
      },
    });

    if (embedding?.length) {
      await this.persistEmbedding(article.id, embedding);
    }

    return {
      article,
      classification,
      embeddingStored: Boolean(embedding?.length),
    };
  }

  private buildMetadata(
    baseMetadata: SourceMetadata | undefined,
    classification: ClassificationResult | null
  ): EnrichedMetadata | undefined {
    if (!baseMetadata && !classification) {
      return undefined;
    }

    // Start with the source metadata or minimal structure
    const enriched: EnrichedMetadata = baseMetadata 
      ? { ...baseMetadata }
      : { type: 'unknown' } as EnrichedMetadata;

    if (classification?.secondaryCategories?.length) {
      enriched.secondaryCategories = classification.secondaryCategories.map((entry) => ({
        category: entry.category,
        confidence: entry.confidence,
      }));
    }

    if (classification?.reasoning) {
      enriched.classificationReasoning = classification.reasoning;
    }

    if (classification) {
      enriched.classifiedAt = new Date().toISOString();
    }

    return enriched;
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
