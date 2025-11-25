import cron from 'node-cron';
import { logger } from '../utils/logger';
import { aggregationQueue } from './aggregationQueue';
import { config } from '../config';

export class Scheduler {
  private aggregationTask?: cron.ScheduledTask;

  start(): void {
    logger.info('Starting scheduler...');

    // Schedule aggregation every N minutes
    const aggregationCron = `*/${config.fetching.intervalMinutes} * * * *`;
    this.aggregationTask = cron.schedule(aggregationCron, async () => {
      logger.info('Running scheduled aggregation');
      
      try {
        // Queue Reddit aggregation
        await aggregationQueue.add('fetch-reddit', {}, {
          jobId: `reddit-${Date.now()}`,
        });
        
        // Queue RSS aggregation
        await aggregationQueue.add('fetch-rss', {}, {
          jobId: `rss-${Date.now()}`,
        });
        
        logger.info('Aggregation jobs queued');
      } catch (error) {
        logger.error('Error queuing aggregation jobs:', error);
      }
    });

    // Run immediately on startup
    this.runInitialAggregation();
    
    logger.info(`Aggregation scheduled every ${config.fetching.intervalMinutes} minutes`);
  }

  stop(): void {
    logger.info('Stopping scheduler...');
    
    if (this.aggregationTask) {
      this.aggregationTask.stop();
    }
    
    logger.info('Scheduler stopped');
  }

  private async runInitialAggregation(): Promise<void> {
    logger.info('Running initial aggregation...');
    
    setTimeout(async () => {
      try {
        await aggregationQueue.add('fetch-reddit', {});
        await aggregationQueue.add('fetch-rss', {});
      } catch (error) {
        logger.error('Error in initial aggregation:', error);
      }
    }, 5000); // 5 seconds delay on startup
  }
}
