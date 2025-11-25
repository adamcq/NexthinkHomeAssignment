import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisClient {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export const redisClient = new RedisClient();
export const redis = redisClient.getClient();
