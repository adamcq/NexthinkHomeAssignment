import prisma from '../utils/db';
import { logger } from '../utils/logger';

/**
 * Fix PENDING articles that have been classified but status wasn't updated.
 * This can happen due to race conditions or errors during the classification process.
 */
async function fixPendingStatus() {
  try {
    logger.info('Fixing PENDING articles that have been classified.');
    
    const result = await prisma.article.updateMany({
      where: {
        classificationStatus: 'PENDING',
        category: { not: null },
      },
      data: {
        classificationStatus: 'COMPLETED',
      },
    });

    logger.info(`Updated ${result.count} article(s) from PENDING to COMPLETED`);
    
    if (result.count > 0) {
      logger.info(`Fixed ${result.count} misclassified PENDING articles`);
    }
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error fixing pending status:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixPendingStatus();
