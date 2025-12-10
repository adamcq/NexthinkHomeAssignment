import { LLMClassificationService } from '../../services/LLMClassificationService';
import { Category } from '@prisma/client';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
  };
});

describe('LLMClassificationService', () => {
  let classifier: LLMClassificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateContent.mockReset();
    classifier = new LLMClassificationService();
  });

  describe('classifyArticle', () => {
    it('should classify article into correct category', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          categories: [
            {
              category: 'CYBERSECURITY',
              confidence: 0.95,
              reasoning: 'Article discusses security vulnerabilities',
            },
            {
              category: 'SOFTWARE_DEVELOPMENT',
              confidence: 0.62,
            },
          ],
        }),
      });

      const result = await classifier.classifyArticle(
        'Security Breach at Major Tech Company',
        'A major security vulnerability was discovered...',
        {
          type: 'rss',
          source: 'TechCrunch',
          rssCategories: ['Security', 'Breach']
        }
      );

      expect(result.category).toBe(Category.CYBERSECURITY);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.secondaryCategories).toHaveLength(1);
      expect(result.secondaryCategories[0].category).toBe(Category.SOFTWARE_DEVELOPMENT);
    });

    it('should handle classification errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));

      await expect(
        classifier.classifyArticle('Test Title', 'Test Content')
      ).rejects.toThrow();
    });

    it('should default to OTHER for ambiguous content', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          categories: [
            {
              category: 'OTHER',
              confidence: 0.45,
              reasoning: 'Content is too general',
            },
          ],
        }),
      });

      const result = await classifier.classifyArticle(
        'Generic Tech News',
        'Some generic tech content...'
      );

      expect(result.category).toBe(Category.OTHER);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});
