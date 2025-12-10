import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { redis } from './utils/redis';
import prisma from './utils/db';
import articlesRouter from './api/routes/articles';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
// Rate limiting - temporarily disabled for easier development
// const limiter = rateLimit({
//   windowMs: config.rateLimit.windowMs,
//   max: config.rateLimit.maxRequests,
//   standardHeaders: true,
//   legacyHeaders: false,
//   store: new RedisStore({
//     // @ts-expect-error - RedisStore typing mismatch with ioredis
//     sendCommand: async (...args: string[]) => await redis.call(...args as [string, ...string[]]),
//   }),
//   message: 'Too many requests from this IP, please try again later.',
// });

// app.use('/api/', limiter);

// Health check
app.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    await redis.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        redis: 'up',
      },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service health check failed',
    });
  }
});

import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';

// ...

// API routes
app.use('/api/articles', articlesRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
