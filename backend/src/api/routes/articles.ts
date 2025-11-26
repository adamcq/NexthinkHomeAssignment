import express, { Request, Response } from 'express';
import { z } from 'zod';
import { SearchService } from '../../services/SearchService';
import type { SearchParams } from '../../services/SearchService';
import { logger } from '../../utils/logger';
import prisma from '../../utils/db';

const router = express.Router();
const searchService = new SearchService();
const CATEGORY_VALUES = [
  'CYBERSECURITY',
  'AI_EMERGING_TECH',
  'SOFTWARE_DEVELOPMENT',
  'HARDWARE_DEVICES',
  'TECH_INDUSTRY_BUSINESS',
  'OTHER',
] as const;
type CategoryValue = typeof CATEGORY_VALUES[number];
type PrismaCategory = CategoryValue;

// Validation schemas
const searchSchema = z.object({
  query: z.string().optional(),
  category: z.enum(CATEGORY_VALUES).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  source: z.enum(['reddit', 'arstechnica', 'techcrunch']).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});
type SearchRequestBody = z.infer<typeof searchSchema>;

/**
 * @swagger
 * /api/articles/search:
 *   post:
 *     summary: Search for articles using semantic/keyword search
 *     description: Search articles by query text (uses vector similarity if query provided), with optional filters for category, source, and date range. Returns paginated results.
 *     tags: [Articles]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchRequest'
 *           examples:
 *             semanticSearch:
 *               summary: Semantic search with filters
 *               value:
 *                 query: "artificial intelligence machine learning"
 *                 category: "AI_EMERGING_TECH"
 *                 limit: 10
 *             categoryFilter:
 *               summary: Filter by category only
 *               value:
 *                 category: "CYBERSECURITY"
 *                 limit: 20
 *             dateRange:
 *               summary: Filter by date range
 *               value:
 *                 startDate: "2024-01-01T00:00:00Z"
 *                 endDate: "2024-01-31T23:59:59Z"
 *     responses:
 *       200:
 *         description: Search results with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *             example:
 *               articles:
 *                 - id: "cm3x1y2z3a4b5c6d7e8f9g0h"
 *                   title: "New AI Model Breakthrough"
 *                   content: "Researchers have developed..."
 *                   url: "https://techcrunch.com/article"
 *                   source: "techcrunch"
 *                   category: "AI_EMERGING_TECH"
 *                   categoryScore: 0.95
 *                   classificationStatus: "COMPLETED"
 *                   publishedAt: "2024-01-15T10:30:00Z"
 *               total: 150
 *               limit: 20
 *               offset: 0
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Invalid request parameters"
 *               details:
 *                 - path: ["limit"]
 *                   message: "Number must be less than or equal to 100"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const params: SearchRequestBody = searchSchema.parse(req.body);

    const searchParams: SearchParams = {
      query: params.query,
      category: params.category as PrismaCategory | undefined,
      source: params.source,
      limit: params.limit,
      offset: params.offset,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
    };

    const results = await searchService.search(searchParams);

    res.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request parameters', details: error.errors });
      return;
    }

    logger.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     summary: Get a single article by ID
 *     description: Retrieve detailed information about a specific article including its classification status and metadata.
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique article identifier
 *         example: "cm3x1y2z3a4b5c6d7e8f9g0h"
 *     responses:
 *       200:
 *         description: Article details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 *             example:
 *               id: "cm3x1y2z3a4b5c6d7e8f9g0h"
 *               title: "New AI Model Breakthrough"
 *               content: "Researchers have developed a new AI model..."
 *               summary: "A brief overview..."
 *               url: "https://techcrunch.com/article"
 *               source: "techcrunch"
 *               sourceId: "abc123"
 *               author: "John Doe"
 *               publishedAt: "2024-01-15T10:30:00Z"
 *               category: "AI_EMERGING_TECH"
 *               categoryScore: 0.95
 *               classificationStatus: "COMPLETED"
 *               metadata:
 *                 type: "rss"
 *                 source: "techcrunch"
 *                 classifiedAt: "2024-01-15T10:35:00Z"
 *       404:
 *         description: Article not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Article not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json(article);
  } catch (error) {
    logger.error('Get article error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: List articles with optional filters
 *     description: Retrieve a paginated list of articles. Optionally filter by category and/or source. Results are ordered by publication date (newest first).
 *     tags: [Articles]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [CYBERSECURITY, AI_EMERGING_TECH, SOFTWARE_DEVELOPMENT, HARDWARE_DEVICES, TECH_INDUSTRY_BUSINESS, OTHER]
 *         description: Filter by article category
 *         example: "AI_EMERGING_TECH"
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [reddit, arstechnica, techcrunch]
 *         description: Filter by article source
 *         example: "techcrunch"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of articles to return
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of articles to skip (for pagination)
 *         example: 0
 *     responses:
 *       200:
 *         description: List of articles with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListResponse'
 *             example:
 *               articles:
 *                 - id: "cm3x1y2z3a4b5c6d7e8f9g0h"
 *                   title: "New AI Model Breakthrough"
 *                   url: "https://techcrunch.com/article"
 *                   source: "techcrunch"
 *                   category: "AI_EMERGING_TECH"
 *                   publishedAt: "2024-01-15T10:30:00Z"
 *               total: 500
 *               limit: 20
 *               offset: 0
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidLimit:
 *                 summary: Limit exceeds maximum
 *                 value:
 *                   error: "Limit exceeds maximum of 100"
 *               invalidCategory:
 *                 summary: Invalid category value
 *                 value:
 *                   error: "Invalid category filter"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    if (Number.isNaN(limit) || Number.isNaN(offset) || limit < 1 || offset < 0) {
      res.status(400).json({ error: 'Invalid pagination parameters' });
      return;
    }

    if (limit > 100) {
      res.status(400).json({ error: 'Limit exceeds maximum of 100' });
      return;
    }

    const where: any = {};
    if (req.query.category) {
      const categoryValue = req.query.category.toString().toUpperCase() as CategoryValue;
      if (!CATEGORY_VALUES.includes(categoryValue)) {
        res.status(400).json({ error: 'Invalid category filter' });
        return;
      }
      where.category = categoryValue;
    }
    if (req.query.source) {
      where.source = req.query.source as string;
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      articles,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('List articles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/articles/stats/categories:
 *   get:
 *     summary: Get category statistics
 *     description: Retrieve the count of articles in each category. Useful for displaying category distribution or filtering options.
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: Category statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CategoryStats'
 *             example:
 *               - category: "AI_EMERGING_TECH"
 *                 count: 150
 *               - category: "CYBERSECURITY"
 *                 count: 120
 *               - category: "SOFTWARE_DEVELOPMENT"
 *                 count: 95
 *               - category: "HARDWARE_DEVICES"
 *                 count: 80
 *               - category: "TECH_INDUSTRY_BUSINESS"
 *                 count: 45
 *               - category: "OTHER"
 *                 count: 10
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats/categories', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await searchService.getCategoryStats();
    res.json(stats);
  } catch (error) {
    logger.error('Get category stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
