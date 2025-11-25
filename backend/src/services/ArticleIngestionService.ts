import { Prisma, Article } from '@prisma/client';
import prisma from '../utils/db';
import { logger } from '../utils/logger';
import { LLMClassificationService, ClassificationResult, RateLimitError } from './LLMClassificationService';
import { EmbeddingService } from './EmbeddingService';

export interface ArticleIngestionInput {
  title: string;
  content: string;
  summary?: string | null;
  url: string;
  source: string;
  sourceId: string;
  author?: string | null;
  publishedAt: Date;
  metadata?: Prisma.JsonValue | null;
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
      const rssCategories =
        input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
          ? (input.metadata as Prisma.JsonObject).rssCategories
          : undefined;

      classification = await this.classificationService.classifyArticle(
        input.title,
        input.content,
        Array.isArray(rssCategories) ? (rssCategories as string[]) : undefined
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
        metadata,
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
    baseMetadata: Prisma.JsonValue | null | undefined,
    classification: ClassificationResult | null
  ): Prisma.JsonValue {
    const metadata: Prisma.JsonObject = this.asJsonObject(baseMetadata);

    if (classification?.secondaryCategories?.length) {
      metadata.secondaryCategories = classification.secondaryCategories.map((entry) => ({
        category: entry.category,
        confidence: entry.confidence,
      }));
    }

    if (classification?.reasoning) {
      metadata.classificationReasoning = classification.reasoning;
    }

    if (classification) {
      metadata.classifiedAt = new Date().toISOString();
    }

    return metadata;
  }

  private asJsonObject(value: Prisma.JsonValue | null | undefined): Prisma.JsonObject {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...(value as Prisma.JsonObject) };
    }
    return {};
  }

  private buildEmbeddingText(input: ArticleIngestionInput): string {
    const summaryOrContent = input.summary || input.content;
    const truncatedContent = summaryOrContent.substring(0, 4000);
    return `${input.title}\n\n${truncatedContent}`;
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
