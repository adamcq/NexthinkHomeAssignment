import Bull from 'bull';
import { config } from '../config';
import { logger } from '../utils/logger';
import prisma from '../utils/db';
import { LLMClassificationService, RateLimitError } from '../services/LLMClassificationService';
import { EnrichedMetadata } from '../types/metadata';
import { Prisma } from '@prisma/client';

export const classificationQueue = new Bull('article-classification', config.redis.url, {
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});

const classificationService = new LLMClassificationService();

classificationQueue.process(async (job) => {
    const { articleId } = job.data;
    logger.info(`Processing classification for article ${articleId}`);

    try {
        const article = await prisma.article.findUnique({
            where: { id: articleId },
        });

        if (!article) {
            logger.error(`Article ${articleId} not found`);
            return;
        }

        if (article.classificationStatus === 'COMPLETED') {
            logger.info(`Article ${articleId} already classified`);
            return;
        }

        const classification = await classificationService.classifyArticle(
            article.title,
            article.content,
            article.metadata as any
        );

        // Update metadata with classification details
        const currentMetadata = (article.metadata as any) || {};
        const enrichedMetadata: EnrichedMetadata = {
            ...currentMetadata,
            classifiedAt: new Date().toISOString(),
        };

        if (classification.secondaryCategories?.length) {
            enrichedMetadata.secondaryCategories = classification.secondaryCategories;
        }
        if (classification.reasoning) {
            enrichedMetadata.classificationReasoning = classification.reasoning;
        }

        await prisma.article.update({
            where: { id: articleId },
            data: {
                category: classification.category,
                categoryScore: classification.confidence,
                classificationStatus: 'COMPLETED',
                metadata: enrichedMetadata as unknown as Prisma.JsonValue,
            },
        });

        logger.info(`Article ${articleId} classified as ${classification.category}`);
        return { articleId, category: classification.category };

    } catch (error) {
        if (error instanceof RateLimitError) {
            const delayMs = error.retryAfterSeconds * 1000;
            logger.warn(`Rate limit hit for article ${articleId}. Retrying in ${error.retryAfterSeconds}s`);

            // Re-queue with the specific delay from the API
            // Remove current job from retry count and create new delayed job
            await classificationQueue.add(
                { articleId },
                {
                    delay: delayMs,
                    attempts: 5, // Full retry attempts for the new job
                    jobId: `${articleId}-retry-${Date.now()}`,
                }
            );

            // Don't throw - we've handled it by re-queueing
            return { articleId, rateLimited: true, retryAfterSeconds: error.retryAfterSeconds };
        }

        logger.error(`Classification failed for article ${articleId}:`, error);

        // For other errors, throw to let Bull retry with exponential backoff
        throw error;
    }
});

classificationQueue.on('failed', async (job, err) => {
    logger.error(`Classification job ${job.id} failed:`, err);
    if (job.attemptsMade >= job.opts.attempts!) {
        const { articleId } = job.data;
        try {
            await prisma.article.update({
                where: { id: articleId },
                data: { classificationStatus: 'FAILED' },
            });
        } catch (updateErr) {
            logger.error(`Failed to update status to FAILED for article ${articleId}`, updateErr);
        }
    }
});
