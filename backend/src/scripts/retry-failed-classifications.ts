import prisma from '../utils/db';
import { classificationQueue } from '../workers/classificationQueue';
import { logger } from '../utils/logger';
import { redis } from '../utils/redis';

async function retryFailedClassifications() {
  try {
    
    const failedArticles = await prisma.article.findMany({
      where: { classificationStatus: 'FAILED' },
      select: { id: true, title: true },
    });

    if (failedArticles.length === 0) {
      logger.info('No failed articles found. All good!');
      await prisma.$disconnect();
      await classificationQueue.close();
      process.exit(0);
    }

    logger.info(`Found ${failedArticles.length} failed article(s) to retry.`);

    classificationQueue.isReady().then(() => {
    logger.info('Classification queue is ready.');
    }).catch((err) => {
    logger.error('Error waiting for classification queue to be ready:', err);
    });

    for (const article of failedArticles) {
      logger.info(`Retrying: article ${article.id} with title: ${article.title.substring(0, 60)}...`);
      
      // Reset status to PENDING
      await prisma.article.update({
        where: { id: article.id },
        data: { classificationStatus: 'PENDING' },
      });

      logger.info(`Reset article ${article.id} status to PENDING`);

      // Re-queue for classification
      await classificationQueue.add({ articleId: article.id });

      logger.info(`Re-queued article ${article.id}`);
    }

    logger.info(`Successfully re-queued ${failedArticles.length} article(s)`);
    
    // Give it a moment to ensure queue jobs are created
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    await prisma.$disconnect();
    await classificationQueue.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error retrying failed classifications:', error);
    await prisma.$disconnect();
    await classificationQueue.close();
    process.exit(1);
  }
}

retryFailedClassifications();
