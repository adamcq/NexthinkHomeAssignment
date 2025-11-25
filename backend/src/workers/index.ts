import './aggregationQueue';
import { Scheduler } from './scheduler';
import { logger } from '../utils/logger';
import prisma from '../utils/db';
import { redis } from '../utils/redis';

// Initialize scheduler
const scheduler = new Scheduler();

logger.info('Starting worker processes...');
scheduler.start();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down workers...`);
  
  scheduler.stop();
  
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
  
  try {
    await redis.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
