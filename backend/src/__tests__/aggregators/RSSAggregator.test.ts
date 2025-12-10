import { RSSAggregator } from '../../aggregators/RSSAggregator';
import { db } from '../../utils/db';
import { redis } from '../../utils/redis';
import { ArticleIngestionService } from '../../services/ArticleIngestionService';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../utils/db');
jest.mock('../../utils/redis');
jest.mock('rss-parser');
jest.mock('html-to-text', () => ({
  htmlToText: jest.fn((html: string) => html.replace(/<[^>]*>/g, '')),
}));

describe('RSSAggregator', () => {
  let aggregator: RSSAggregator;
  let mockIngestionService: Pick<ArticleIngestionService, 'ingestArticle'>;

  beforeEach(() => {
    mockIngestionService = {
      ingestArticle: jest.fn().mockResolvedValue({
        article: { id: '1' } as any,
        classification: null,
        embeddingStored: false,
      }),
    };
    aggregator = new RSSAggregator(mockIngestionService as ArticleIngestionService);
    jest.clearAllMocks();
  });

  describe('aggregate', () => {
    it('should fetch articles from RSS feeds', async () => {
      const mockArticle = {
        title: 'Test Article',
        link: 'https://example.com/article',
        contentSnippet: '<p>Test content</p>',
        pubDate: new Date().toISOString(),
        categories: ['Apps', 'Social'],
      };

      // Mock RSS parser
      const mockParseURL = jest.fn().mockResolvedValue({
        items: [mockArticle],
      });

      (aggregator as any).parser.parseURL = mockParseURL;

      // Mock Redis and DB
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setex as jest.Mock).mockResolvedValue('OK');
      const result = await aggregator.aggregate();

      expect(result.length).toBeGreaterThan(0);
      expect(mockParseURL).toHaveBeenCalled();
      expect(mockIngestionService.ingestArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            rssCategories: ['Apps', 'Social'],
          }),
        })
      );
    });

    it('should skip duplicate articles', async () => {
      const mockArticle = {
        title: 'Duplicate Article',
        link: 'https://example.com/duplicate',
        contentSnippet: 'Duplicate content',
        pubDate: new Date().toISOString(),
      };

      const mockParseURL = jest.fn().mockResolvedValue({
        items: [mockArticle],
      });

      (aggregator as any).parser.parseURL = mockParseURL;

      // Mock Redis to return existing article (duplicate)
      (redis.get as jest.Mock).mockResolvedValue('exists');

      const result = await aggregator.aggregate();

      expect(mockIngestionService.ingestArticle).not.toHaveBeenCalled();
    });

    it('should handle RSS feed errors gracefully', async () => {
      const mockParseURL = jest.fn().mockRejectedValue(new Error('Feed unavailable'));

      (aggregator as any).parser.parseURL = mockParseURL;

      // Should not throw, but log error
      await expect(aggregator.aggregate()).resolves.not.toThrow();
    });
  });
});
