import { LLMClassificationService, RateLimitError } from '../../services/LLMClassificationService';

describe('Rate Limit Error Handling', () => {
  it('should throw RateLimitError on 429 status code', async () => {
    const mockGenerateContent = jest.fn();
    mockGenerateContent.mockRejectedValue({
      status: 429,
      message: 'Rate limit exceeded. Please retry in 24.142365999s.',
    });

    const mockClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const classifier = new LLMClassificationService(mockClient as any);

    await expect(
      classifier.classifyArticle('Test Title', 'Test Content')
    ).rejects.toThrow(RateLimitError);

    await expect(
      classifier.classifyArticle('Test Title', 'Test Content')
    ).rejects.toThrow(/Rate limit exceeded/);
  });

  it('should extract retry delay from error message', async () => {
    const mockGenerateContent = jest.fn();
    mockGenerateContent.mockRejectedValue({
      status: 429,
      message: 'You exceeded your current quota. Please retry in 24.142365999s.',
    });

    const mockClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const classifier = new LLMClassificationService(mockClient as any);

    try {
      await classifier.classifyArticle('Test Title', 'Test Content');
      fail('Should have thrown RateLimitError');
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      if (error instanceof RateLimitError) {
        expect(error.retryAfterSeconds).toBe(25); // Ceil of 24.142
      }
    }
  });

  it('should use default retry delay if extraction fails', async () => {
    const mockGenerateContent = jest.fn();
    mockGenerateContent.mockRejectedValue({
      status: 429,
      message: 'Rate limit exceeded without delay info',
    });

    const mockClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const classifier = new LLMClassificationService(mockClient as any);

    try {
      await classifier.classifyArticle('Test Title', 'Test Content');
      fail('Should have thrown RateLimitError');
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      if (error instanceof RateLimitError) {
        expect(error.retryAfterSeconds).toBe(60); // Default
      }
    }
  });
});
