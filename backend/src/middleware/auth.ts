import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import prisma from '../utils/db';

export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({ error: 'API key required' });
      return;
    }

    // Check if API key exists and is active
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
    });

    if (!key || !key.isActive) {
      res.status(403).json({ error: 'Invalid or inactive API key' });
      return;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    // Attach key info to request
    (req as any).apiKey = key;
    
    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Optional auth - allows requests with or without API key
export const optionalApiKeyAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (apiKey) {
      const key = await prisma.apiKey.findUnique({
        where: { key: apiKey },
      });

      if (key && key.isActive) {
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });
        (req as any).apiKey = key;
      }
    }
    
    next();
  } catch (error) {
    logger.error('Optional API key authentication error:', error);
    next();
  }
};
