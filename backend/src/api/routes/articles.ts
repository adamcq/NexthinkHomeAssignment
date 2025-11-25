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

// TODO: Implement SWAGGER documentation for all endpoints

/**
 * @swagger
 * /api/articles/search:
 *   post:
 *     summary: Search for articles
 *     tags: [Articles]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *               category:
 *                 type: string
 *               limit:
 *                 type: number
 *               offset:
 *                 type: number
 *     responses:
 *       200:
 *         description: Search results
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
 *     summary: Get article by ID
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article details
 *       404:
 *         description: Article not found
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
 *     tags: [Articles]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: List of articles
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
 * /api/articles/categories:
 *   get:
 *     summary: Get category statistics
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: Category statistics
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
