import prisma from '../utils/db';
import { logger } from '../utils/logger';

async function listFailedArticles() {
  try {
    logger.info('Searching for FAILED articles...\n');

    const failedArticles = await prisma.article.findMany({
      where: { classificationStatus: 'FAILED' },
      select: {
        id: true,
        title: true,
        source: true,
        publishedAt: true,
        url: true,
      },
      orderBy: { publishedAt: 'desc' },
    });

    if (failedArticles.length === 0) {
      logger.info('No failed articles found.\n');
    } else {
      logger.info(`Found ${failedArticles.length} failed article(s):\n`);

      failedArticles.forEach((article, i) => {
        logger.info(`${i + 1}. ${article.title.substring(0, 70)}`);
        logger.info(`   Source: ${article.source}`);
        logger.info(`   Published: ${article.publishedAt.toISOString()}`);
        logger.info(`   ID: ${article.id}`);
        logger.info(`   URL: ${article.url}\n`);
      });
    }

    // Also show summary stats
    const stats = await prisma.article.groupBy({
      by: ['classificationStatus'],
      _count: { id: true },
    });

    logger.info('Classification Status Summary:');
    stats.forEach(stat => {
      logger.info(`   ${stat.classificationStatus}: ${stat._count.id}`);
    });
    logger.info('');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error listing failed articles:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

listFailedArticles();
