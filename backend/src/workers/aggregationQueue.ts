import Bull from 'bull';
import { config } from '../config';
import { logger } from '../utils/logger';
import { RedditAggregator } from '../aggregators/RedditAggregator';
import { RSSAggregator } from '../aggregators/RSSAggregator';
import { RateLimitError } from '../services/LLMClassificationService';

export const aggregationQueue = new Bull('article-aggregation', config.redis.url, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

// Process Reddit aggregation jobs
aggregationQueue.process('fetch-reddit', async (job) => {
  logger.info('Processing Reddit aggregation job');
  
  try {
    const aggregator = new RedditAggregator();
    const count = await aggregator.aggregateAndStore();
    logger.info(`Reddit aggregation complete: ${count} articles stored`);
    return { source: 'reddit', articlesStored: count };
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Re-queue the job with delay based on API's retry-after
      const delayMs = error.retryAfterSeconds * 1000;
      
      await aggregationQueue.add('fetch-reddit', job.data, {
        delay: delayMs,
        jobId: `reddit-retry-${Date.now()}`,
      });
      
      logger.warn(
        `Rate limit hit for Reddit aggregation. Retrying in ${error.retryAfterSeconds}s (scheduled for ${new Date(Date.now() + delayMs).toISOString()})`
      );
      
      return {
        source: 'reddit',
        rateLimited: true,
        retryAfterSeconds: error.retryAfterSeconds,
        retryScheduledAt: new Date(Date.now() + delayMs).toISOString(),
      };
    }
    
    // Re-throw other errors for Bull's retry mechanism
    throw error;
  }
});

// Process RSS aggregation jobs
aggregationQueue.process('fetch-rss', async (job) => {
  logger.info('Processing RSS aggregation job');
  
  try {
    const aggregator = new RSSAggregator();
    const count = await aggregator.aggregateAndStore();
    logger.info(`RSS aggregation complete: ${count} articles stored`);
    return { source: 'rss', articlesStored: count };
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Re-queue the job with delay based on API's retry-after
      const delayMs = error.retryAfterSeconds * 1000;
      
      await aggregationQueue.add('fetch-rss', job.data, {
        delay: delayMs,
        jobId: `rss-retry-${Date.now()}`,
      });
      
      logger.warn(
        `Rate limit hit for RSS aggregation. Retrying in ${error.retryAfterSeconds}s (scheduled for ${new Date(Date.now() + delayMs).toISOString()})`
      );
      
      return {
        source: 'rss',
        rateLimited: true,
        retryAfterSeconds: error.retryAfterSeconds,
        retryScheduledAt: new Date(Date.now() + delayMs).toISOString(),
      };
    }
    
    // Re-throw other errors for Bull's retry mechanism
    throw error;
  }
});

// Error handling
aggregationQueue.on('error', (error) => {
  logger.error('Aggregation queue error:', error);
});

aggregationQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

aggregationQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed:`, result);
});
