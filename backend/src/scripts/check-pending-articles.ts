import prisma from '../utils/db';
import { logger } from '../utils/logger';

async function checkPendingArticles() {
  try {
    logger.info('Checking PENDING articles that might be misclassified.');
    
    // Find PENDING articles that have a category (meaning they were classified but status wasn't updated)
    const pendingButClassified = await prisma.article.findMany({
      where: {
        classificationStatus: 'PENDING',
        category: { not: null },
      },
      select: {
        id: true,
        title: true,
        category: true,
        categoryScore: true,
      },
      take: 100,
    });

    if (pendingButClassified.length === 0) {
      logger.info('No misclassified PENDING articles found.');
    } else {
      logger.info(`Found ${pendingButClassified.length} PENDING articles that have a category assigned!`);
      logger.info('These should be marked as COMPLETED. Here are the first 5:');
      
      pendingButClassified.slice(0, 5).forEach((article, i) => {
        logger.info(`${i + 1}. ${article.title.substring(0, 50)}`);
        logger.info(`   Category: ${article.category} (score: ${article.categoryScore})`);
        logger.info(`   ID: ${article.id}\n`);
      });
      
      // Ask to fix them
      logger.info('To fix these, run: `npm run fix-pending-status`\n');
    }

    // Also check truly pending (no category assigned)
    const trulyPending = await prisma.article.findMany({
      where: {
        classificationStatus: 'PENDING',
        category: null,
      },
      select: { id: true },
    });

    logger.info(`Summary:`);
    logger.info(`   - PENDING with category assigned: ${pendingButClassified.length}`);
    logger.info(`   - PENDING without category (truly pending): ${trulyPending.length}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error checking pending articles:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkPendingArticles();
