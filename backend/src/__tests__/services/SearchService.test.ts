import { SearchService } from '../../services/SearchService';
import { db } from '../../utils/db';
import { redis } from '../../utils/redis';
import { Category } from '@prisma/client';

jest.mock('../../utils/db');
jest.mock('../../utils/redis');

describe('SearchService', () => {
  let searchService: SearchService;
  let mockEmbeddingService: { embed: jest.Mock };

  beforeEach(() => {
    mockEmbeddingService = { embed: jest.fn().mockResolvedValue([0.1, 0.2]) };
    searchService = new SearchService(mockEmbeddingService as any);
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should return cached results if available', async () => {
      const cachedResults = {
        articles: [
          {
            id: '1',
            title: 'Cached Article',
            content: 'Cached content',
          },
        ],
        total: 1,
      };

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedResults));

      const result = await searchService.search({
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(cachedResults);
      expect(db.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it('should perform full-text search when no category filter', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const mockArticles = [
        {
          id: '1',
          title: 'AI Article',
          content: 'Article about AI',
          category: Category.AI_EMERGING_TECH,
          total_count: BigInt(1),
        },
      ];

      (db.$queryRawUnsafe as jest.Mock).mockResolvedValue(mockArticles);

      const result = await searchService.search({
        query: 'artificial intelligence',
        limit: 10,
        offset: 0,
      });

      expect(result.articles).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should filter by category when specified', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const mockArticles = [
        {
          id: '1',
          title: 'Security Article',
          category: Category.CYBERSECURITY,
        },
      ];

      (db.$queryRawUnsafe as jest.Mock).mockResolvedValue(mockArticles);
      (db.article.count as jest.Mock).mockResolvedValue(1);

      const result = await searchService.search({
        query: 'breach',
        category: Category.CYBERSECURITY,
        limit: 10,
        offset: 0,
      });

      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].category).toBe(Category.CYBERSECURITY);
    });

    it('should perform semantic search when enabled', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const mockArticles = [
        {
          id: '1',
          title: 'Semantic Match',
          similarity: 0.85,
        },
      ];

      (db.$queryRawUnsafe as jest.Mock).mockResolvedValue(mockArticles);
      (db.article.count as jest.Mock).mockResolvedValue(1);

      const result = await searchService.search({
        query: 'machine learning applications',
        limit: 10,
        offset: 0,
      });

      expect(result.articles).toHaveLength(1);
      expect(mockEmbeddingService.embed).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      const mockArticles = [
        { id: '11', title: 'Article 11', total_count: BigInt(25) },
        { id: '12', title: 'Article 12', total_count: BigInt(25) },
      ];

      (db.$queryRawUnsafe as jest.Mock).mockResolvedValue(mockArticles);

      const result = await searchService.search({
        query: 'test',
        limit: 10,
        offset: 10, // Second page
      });

      expect(result.articles).toHaveLength(2);
      expect(result.total).toBe(25);
    });
  });

  describe('getCategoryStats', () => {
    it('should return article counts by category', async () => {
      const mockStats = [
        { category: Category.CYBERSECURITY, _count: { _all: 15 } },
        { category: Category.AI_EMERGING_TECH, _count: { _all: 23 } },
        { category: Category.SOFTWARE_DEVELOPMENT, _count: { _all: 18 } },
      ];

      (db.article.groupBy as jest.Mock).mockResolvedValue(mockStats);

      const result = await searchService.getCategoryStats();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('category');
      expect(result[0]).toHaveProperty('count');
      expect(result[0].count).toBeGreaterThan(0);
    });

    it('should handle empty database', async () => {
      (db.article.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await searchService.getCategoryStats();

      expect(result).toEqual([]);
    });
  });
});
