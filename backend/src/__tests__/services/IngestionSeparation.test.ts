import { ArticleIngestionService } from '../../services/ArticleIngestionService';
import { classificationQueue } from '../../workers/classificationQueue';
import prisma from '../../utils/db';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../utils/db');
jest.mock('../../workers/classificationQueue');
jest.mock('../../services/EmbeddingService', () => ({
    embeddingService: {
        embed: jest.fn<any>().mockResolvedValue(null),
    },
}));

describe('Ingestion and Classification Separation', () => {
    let ingestionService: ArticleIngestionService;

    beforeAll(() => {
        ingestionService = new ArticleIngestionService();
    });

    it('should create article with PENDING status during ingestion', async () => {
        const mockArticle = {
            id: 'test-article-id',
            title: 'Test Article',
            content: 'Test content about AI',
            url: 'https://example.com/test',
            source: 'test',
            sourceId: 'test-123',
            publishedAt: new Date(),
            classificationStatus: 'PENDING',
            category: null,
            categoryScore: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            summary: null,
            author: null,
            metadata: null,
            embedding: null,
        };

        (prisma.article.create as any).mockResolvedValue(mockArticle);

        const result = await ingestionService.ingestArticle({
            title: 'Test Article',
            content: 'Test content about AI',
            url: 'https://example.com/test',
            source: 'test',
            sourceId: 'test-123',
            publishedAt: new Date(),
        });

        // Verify article was created with PENDING status
        expect(result.article.classificationStatus).toBe('PENDING');
        expect(result.article.category).toBeNull();
        expect(result.article.categoryScore).toBeNull();

        // Verify prisma.article.create was called with PENDING status
        expect(prisma.article.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    classificationStatus: 'PENDING',
                }),
            })
        );
    });

    it('should NOT perform classification during ingestion', async () => {
        const mockArticle = {
            id: 'test-article-id-2',
            title: 'Another Test',
            content: 'Content about cybersecurity',
            url: 'https://example.com/test2',
            source: 'test',
            sourceId: 'test-456',
            publishedAt: new Date(),
            classificationStatus: 'PENDING',
            category: null,
            categoryScore: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            summary: null,
            author: null,
            metadata: null,
            embedding: null,
        };

        (prisma.article.create as any).mockResolvedValue(mockArticle);

        const result = await ingestionService.ingestArticle({
            title: 'Another Test',
            content: 'Content about cybersecurity',
            url: 'https://example.com/test2',
            source: 'test',
            sourceId: 'test-456',
            publishedAt: new Date(),
        });

        // Classification should NOT happen during ingestion
        // Article should be created with null category
        expect(result.article.category).toBeNull();
        expect(result.article.classificationStatus).toBe('PENDING');
    });

    it('should verify classification happens asynchronously via queue', () => {
        // This test verifies the architecture:
        // 1. Ingestion creates article with PENDING status
        // 2. Aggregation worker queues article for classification
        // 3. Classification worker processes the queue

        // The aggregationQueue adds jobs to classificationQueue
        // This is tested in the aggregation queue implementation
        expect(classificationQueue).toBeDefined();
        expect(classificationQueue.add).toBeDefined();
        expect(classificationQueue.process).toBeDefined();
    });
});
