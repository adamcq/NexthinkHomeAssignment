import request from 'supertest';
import express from 'express';
import articlesRouter from '../../../api/routes/articles';
import { SearchService } from '../../../services/SearchService';
import { db } from '../../../utils/db';
import { Category } from '@prisma/client';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../services/SearchService');
jest.mock('../../../utils/db');

describe('Articles API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/articles', articlesRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/articles/search', () => {
    it('should search articles successfully', async () => {
      const mockResults = {
        articles: [
          {
            id: '1',
            title: 'Test Article',
            content: 'Test content',
            category: Category.CYBERSECURITY,
          },
        ],
        total: 1,
      };

      (SearchService.prototype.search as jest.Mock).mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/articles/search')
        .send({
          query: 'cybersecurity',
          limit: 10,
          offset: 0,
        })
        .expect(200);

      expect(response.body).toEqual(mockResults);
    });

    it('should validate search parameters', async () => {
      const response = await request(app)
        .post('/api/articles/search')
        .send({
          query: '', // Invalid: empty query
          limit: -5, // Invalid: negative limit
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should filter by category', async () => {
      const mockResults = {
        articles: [
          {
            id: '1',
            category: Category.AI_EMERGING_TECH,
          },
        ],
        total: 1,
      };

      (SearchService.prototype.search as jest.Mock).mockResolvedValue(mockResults);

      await request(app)
        .post('/api/articles/search')
        .send({
          query: 'machine learning',
          category: 'AI_EMERGING_TECH',
          limit: 10,
        })
        .expect(200);

      expect(SearchService.prototype.search).toHaveBeenCalledWith(
        expect.objectContaining({
          category: Category.AI_EMERGING_TECH,
        })
      );
    });
  });

  describe('GET /api/articles/:id', () => {
    it('should get article by ID', async () => {
      const mockArticle = {
        id: '1',
        title: 'Test Article',
        content: 'Test content',
        category: Category.CYBERSECURITY,
      };

      (db.article.findUnique as jest.Mock).mockResolvedValue(mockArticle);

      const response = await request(app)
        .get('/api/articles/1')
        .expect(200);

      expect(response.body).toEqual(mockArticle);
    });

    it('should return 404 for non-existent article', async () => {
      (db.article.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app)
        .get('/api/articles/nonexistent')
        .expect(404);
    });
  });

  describe('GET /api/articles', () => {
    it('should list articles with pagination', async () => {
      const mockArticles = [
        { id: '1', title: 'Article 1' },
        { id: '2', title: 'Article 2' },
      ];

      (db.article.findMany as jest.Mock).mockResolvedValue(mockArticles);
      (db.article.count as jest.Mock).mockResolvedValue(50);

      const response = await request(app)
        .get('/api/articles?limit=10&offset=0')
        .expect(200);

      expect(response.body.articles).toHaveLength(2);
      expect(response.body.total).toBe(50);
    });

    it('should filter by category in list', async () => {
      const mockArticles = [
        { id: '1', category: Category.CYBERSECURITY },
      ];

      (db.article.findMany as jest.Mock).mockResolvedValue(mockArticles);
      (db.article.count as jest.Mock).mockResolvedValue(1);

      await request(app)
        .get('/api/articles?category=CYBERSECURITY')
        .expect(200);

      expect(db.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: Category.CYBERSECURITY,
          }),
        })
      );
    });

    it('should validate pagination parameters', async () => {
      await request(app)
        .get('/api/articles?limit=1000') // Exceeds max limit
        .expect(400);
    });
  });

  describe('GET /api/articles/stats/categories', () => {
    it('should return category statistics', async () => {
      const mockStats = [
        { category: Category.CYBERSECURITY, count: 15 },
        { category: Category.AI_EMERGING_TECH, count: 23 },
      ];

      (SearchService.prototype.getCategoryStats as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/articles/stats/categories')
        .expect(200);

      expect(response.body).toEqual(mockStats);
    });
  });
});
