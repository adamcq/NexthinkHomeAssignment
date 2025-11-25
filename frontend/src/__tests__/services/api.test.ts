import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SearchResult, Article, CategoryStats } from '../../types';

// Use vi.hoisted to ensure mocks are available before import
const { mockPost, mockGet } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
}));

// Mock axios before importing the module
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: mockPost,
      get: mockGet,
    })),
  },
}));

// Import after mocking
import { searchArticles, getArticleById, listArticles, getCategoryStats } from '../../services/api';

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchArticles', () => {
    it('calls the search endpoint with correct parameters', async () => {
      const mockResponse: SearchResult = {
        articles: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const params = { query: 'AI', category: 'AI_EMERGING_TECH' as const };
      const result = await searchArticles(params);

      expect(result).toEqual(mockResponse);
      expect(mockPost).toHaveBeenCalledWith('/articles/search', params);
    });
  });

  describe('getArticleById', () => {
    it('fetches article by ID', async () => {
      const mockArticle: Article = {
        id: '123',
        title: 'Test Article',
        content: 'Content',
        summary: 'Summary',
        url: 'https://example.com',
        source: 'techcrunch',
        sourceId: 'test-123',
        author: 'John Doe',
        publishedAt: '2025-11-25T10:00:00Z',
        fetchedAt: '2025-11-25T11:00:00Z',
        category: 'AI_EMERGING_TECH',
        categoryScore: 0.9,
      };

      mockGet.mockResolvedValue({ data: mockArticle });

      const result = await getArticleById('123');

      expect(result).toEqual(mockArticle);
      expect(mockGet).toHaveBeenCalledWith('/articles/123');
    });
  });

  describe('listArticles', () => {
    it('lists articles with parameters', async () => {
      const mockResponse: SearchResult = {
        articles: [],
        total: 100,
        limit: 20,
        offset: 0,
      };

      mockGet.mockResolvedValue({ data: mockResponse });

      const params = { limit: 20, offset: 0 };
      const result = await listArticles(params);

      expect(result).toEqual(mockResponse);
      expect(mockGet).toHaveBeenCalledWith('/articles', { params });
    });
  });

  describe('getCategoryStats', () => {
    it('fetches category statistics', async () => {
      const mockStats: CategoryStats[] = [
        { category: 'AI_EMERGING_TECH', count: 50 },
        { category: 'CYBERSECURITY', count: 30 },
      ];

      mockGet.mockResolvedValue({ data: mockStats });

      const result = await getCategoryStats();

      expect(result).toEqual(mockStats);
      expect(mockGet).toHaveBeenCalledWith('/articles/stats/categories');
    });
  });
});
