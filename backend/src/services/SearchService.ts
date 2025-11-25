import prisma from '../utils/db';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import { Category } from '@prisma/client';
import * as crypto from 'crypto';
import { EmbeddingService, embeddingService } from './EmbeddingService';

export interface SearchParams {
  query?: string;
  category?: Category;
  startDate?: Date;
  endDate?: Date;
  source?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  articles: any[];
  total: number;
  limit: number;
  offset: number;
}

export class SearchService {
  private embeddingService: EmbeddingService;

  constructor(embedding: EmbeddingService = embeddingService) {
    this.embeddingService = embedding;
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const {
      query,
      limit = 20,
      offset = 0,
    } = params;

    // Try to get from cache
    if (query) {
      const cached = await this.getFromCache(params);
      if (cached) {
        logger.debug('Returning cached search results');
        return cached;
      }
    }

    try {
      let articles;
      
      if (query) {
        // Perform hybrid search (keyword + semantic)
        articles = await this.hybridSearch(query, params);
      } else {
        // Simple filtered query
        articles = await this.filteredSearch(params);
      }

      // Get total count
      const total = await this.getCount(params);

      const result: SearchResult = {
        articles,
        total,
        limit,
        offset,
      };

      // Cache results
      if (query) {
        await this.cacheResults(params, result);
      }

      return result;
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  private async hybridSearch(query: string, params: SearchParams): Promise<any[]> {
    const { category, startDate, endDate, source, limit = 20, offset = 0 } = params;

    let vectorLiteral: string | null = null;

    try {
      const embedding = await this.embeddingService.embed(query);
      if (embedding.length) {
        vectorLiteral = `'${this.formatVectorLiteral(embedding)}'::vector`;
      }
    } catch (error) {
      logger.warn('Semantic embedding generation failed, continuing with keyword search:', error);
    }

    // Build where clause
    const where: any = {};
    
    if (category) where.category = category;
    if (source) where.source = source;
    if (startDate || endDate) {
      where.publishedAt = {};
      if (startDate) where.publishedAt.gte = startDate;
      if (endDate) where.publishedAt.lte = endDate;
    }

    // Full-text search using PostgreSQL
    const valueParams: any[] = [query];

    if (category) {
      valueParams.push(category);
    }

    if (source) {
      valueParams.push(source);
    }

    if (startDate) {
      valueParams.push(startDate);
    }

    if (endDate) {
      valueParams.push(endDate);
    }

    const filters: string[] = [];
    let dynamicIndex = 2;
    if (category) {
      filters.push(`category = $${dynamicIndex++}`);
    }
    if (source) {
      filters.push(`source = $${dynamicIndex++}`);
    }
    if (startDate) {
      filters.push(`"publishedAt" >= $${dynamicIndex++}`);
    }
    if (endDate) {
      filters.push(`"publishedAt" <= $${dynamicIndex++}`);
    }

    const whereClause = filters.length ? `AND ${filters.join(' AND ')}` : '';
    const textRankExpr = `ts_rank(\n          to_tsvector('english', title || ' ' || content), \n          plainto_tsquery('english', $1)\n        )`;
    const vectorScoreExpr = vectorLiteral ? `COALESCE(1 - ("Article"."embedding" <#> ${vectorLiteral}), 0)` : '0';
    const hybridScoreExpr = vectorLiteral ? '(text_rank + vector_score)' : 'text_rank';

    const queryText = `
      WITH ranked AS (
        SELECT 
          id, title, content, summary, url, source, author, 
          "publishedAt", "fetchedAt", category, "categoryScore",
          ${textRankExpr} as text_rank,
          ${vectorScoreExpr} as vector_score
        FROM "Article"
        WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
        ${whereClause}
      )
      SELECT *,
        ${hybridScoreExpr} as hybrid_score
      FROM ranked
      ORDER BY ${vectorLiteral ? 'hybrid_score' : 'text_rank'} DESC
      LIMIT $${dynamicIndex} 
      OFFSET $${dynamicIndex + 1}
    `;

    valueParams.push(limit, offset);

    const articles = await prisma.$queryRawUnsafe(queryText, ...valueParams);

    return articles as any[];
  }

  private async filteredSearch(params: SearchParams): Promise<any[]> {
    const { category, startDate, endDate, source, limit = 20, offset = 0 } = params;

    const where: any = {};
    
    if (category) where.category = category;
    if (source) where.source = source;
    if (startDate || endDate) {
      where.publishedAt = {};
      if (startDate) where.publishedAt.gte = startDate;
      if (endDate) where.publishedAt.lte = endDate;
    }

    return await prisma.article.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: offset,
      take: limit,
    });
  }

  private async getCount(params: SearchParams): Promise<number> {
    const { query, category, startDate, endDate, source } = params;

    const where: any = {};
    
    if (category) where.category = category;
    if (source) where.source = source;
    if (startDate || endDate) {
      where.publishedAt = {};
      if (startDate) where.publishedAt.gte = startDate;
      if (endDate) where.publishedAt.lte = endDate;
    }

    if (query) {
      // Count with full-text search (if supported)
      const result = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count
        FROM "Article"
        WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
        ${category ? `AND category = $2` : ''}
        ${source ? `AND source = $${category ? 3 : 2}` : ''}
      `, query, ...(category ? [category] : []), ...(source ? [source] : [])) as Array<{ count?: string }>;

      const countValue = result?.[0]?.count;
      if (countValue !== undefined) {
        return parseInt(countValue, 10);
      }

      // Fallback to simple LIKE-based count when raw result is unavailable (e.g., in tests)
      return await prisma.article.count({
        where: {
          ...where,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
      });
    }

    return await prisma.article.count({ where });
  }

  async getArticleById(id: string): Promise<any | null> {
    return await prisma.article.findUnique({
      where: { id },
    });
  }

  async getCategoryStats(): Promise<any> {
    const stats = await prisma.article.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
      where: {
        category: { not: null },
      },
    });

    return stats.map(stat => ({
      category: stat.category,
      count: stat._count.id ?? (stat._count as any)._all ?? 0,
    }));
  }

  private getCacheKey(params: SearchParams): string {
    const key = JSON.stringify(params);
    return `search:${crypto.createHash('md5').update(key).digest('hex')}`;
  }

  private async getFromCache(params: SearchParams): Promise<SearchResult | null> {
    try {
      const key = this.getCacheKey(params);
      const cached = await redis.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.warn('Cache get error:', error);
      return null;
    }
  }

  private async cacheResults(params: SearchParams, results: SearchResult): Promise<void> {
    try {
      const key = this.getCacheKey(params);
      await redis.setex(key, 300, JSON.stringify(results)); // 5 minutes
    } catch (error) {
      logger.warn('Cache set error:', error);
    }
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
