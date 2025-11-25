import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Category } from '@prisma/client';

type StructuredCategory = {
  category: Category;
  confidence: number;
  reasoning?: string;
};

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export interface ClassificationResult {
  category: Category;
  confidence: number;
  reasoning: string;
  secondaryCategories: Array<{ category: Category; confidence: number }>;
}

export class LLMClassificationService {
  private readonly ai: GoogleGenAI;
  private readonly secondaryThreshold = 0.6;
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second

  constructor(client?: GoogleGenAI) {
    this.ai = client ?? new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }

  async classifyArticle(
    title: string,
    content: string,
    sourceCategories?: string[]
  ): Promise<ClassificationResult> {
    return this.classifyWithRetry(title, content, sourceCategories, 0);
  }

  private async classifyWithRetry(
    title: string,
    content: string,
    sourceCategories: string[] | undefined,
    attempt: number
  ): Promise<ClassificationResult> {
    try {
      logger.debug(`Classifying article (attempt ${attempt + 1}/${this.maxRetries}): ${title.substring(0, 50)}...`);

      const systemInstruction = this.getSystemPrompt();
      const userPrompt = this.buildClassificationPrompt(title, content, sourceCategories);

      const response = await this.ai.models.generateContent({
        model: config.gemini.model,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: this.getClassificationSchema(),
        },
      });

      const responseText = response?.text;

      if (!responseText) {
        throw new Error('Empty response from Gemini classification');
      }

      const payload = this.extractStructuredCategories(responseText);

      const sortedCategories = [...payload].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
      const primary = sortedCategories[0] ?? { category: 'OTHER', confidence: 0.5 };

      const category = primary.category;
      const confidence = typeof primary.confidence === 'number' ? primary.confidence : 0.5;
      const reasoning = primary.reasoning || 'No reasoning provided';

      const secondaryCategories = sortedCategories
        .slice(1)
        .filter((entry) => typeof entry.confidence === 'number' && entry.confidence >= this.secondaryThreshold)
        .map((entry) => ({
          category: entry.category,
          confidence: entry.confidence as number,
        }));

      logger.debug(`Classification result: ${category} (${confidence}) with ${secondaryCategories.length} secondary matches`);

      return {
        category,
        confidence,
        reasoning,
        secondaryCategories,
      };
    } catch (error) {
      // Check if this is a 429 rate limit error
      if (this.isRateLimitError(error)) {
        const retryDelay = this.extractRetryDelay(error);
        logger.warn(`Rate limit exceeded. Retry after ${retryDelay}s`);
        
        // Throw RateLimitError so the caller can handle it appropriately
        throw new RateLimitError(
          `Rate limit exceeded. Please retry after ${retryDelay} seconds.`,
          retryDelay,
          error
        );
      }

      // For other errors, attempt retry with exponential backoff
      if (attempt < this.maxRetries - 1) {
        const delay = this.baseRetryDelay * Math.pow(2, attempt);
        logger.warn(`Classification failed (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${delay}ms`, error);
        await this.sleep(delay);
        return this.classifyWithRetry(title, content, sourceCategories, attempt + 1);
      }

      logger.error('Error classifying article after all retries:', error);
      throw error instanceof Error ? error : new Error('Classification failed');
    }
  }

  private isRateLimitError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as { status?: number; message?: string };
      return err.status === 429 || (err.message?.includes('quota') ?? false);
    }
    return false;
  }

  private extractRetryDelay(error: unknown): number {
    // Default to 60 seconds if we can't extract the delay
    let retryDelay = 60;

    try {
      const err = error as { message?: string };
      if (err.message) {
        // Try to parse the error message to extract retryDelay
        const match = err.message.match(/Please retry in ([\d.]+)s/);
        if (match && match[1]) {
          retryDelay = Math.ceil(parseFloat(match[1]));
        }
      }
    } catch (parseError) {
      logger.debug('Could not extract retry delay from error, using default', parseError);
    }

    return retryDelay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getSystemPrompt(): string {
    return `You are an IT news classifier. Analyze the provided title and content, then rank the categories below. Always respond with structured JSON that follows the provided schema. Categories:

1. CYBERSECURITY - Security breaches, vulnerabilities, privacy, encryption, hacking, data protection
2. AI_EMERGING_TECH - Artificial Intelligence, Machine Learning, quantum computing, blockchain, AR/VR, emerging technologies
3. SOFTWARE_DEVELOPMENT - Programming languages, frameworks, DevOps, open source, software engineering, development tools
4. HARDWARE_DEVICES - CPUs, GPUs, smartphones, IoT devices, consumer electronics, computer hardware
5. TECH_INDUSTRY_BUSINESS - Company news, acquisitions, stock market, regulations, tech industry business
6. OTHER - General tech news that doesn't fit the above categories

Return the best-fitting category as the primary entry along with optional secondary candidates.`;
  }

  private buildClassificationPrompt(
    title: string,
    content: string,
    sourceCategories?: string[]
  ): string {
    // Limit content length to avoid token limits
    const truncatedContent = content.substring(0, 2000);
    const trimmedCategories = (sourceCategories || [])
      .map((c) => c.trim())
      .filter(Boolean);
    const categoriesLine = trimmedCategories.length
      ? `\n\nSource categories (from RSS): ${trimmedCategories.join(', ')}`
      : '';
    
    return `Classify the following IT news article:

Title: ${title}

Content: ${truncatedContent}${categoriesLine}

Use the source categories only as a hint if they are helpful and consistent with the content. Provide your classification in JSON format.`;
  }

  private getClassificationSchema() {
    return {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: [
                  'CYBERSECURITY',
                  'AI_EMERGING_TECH',
                  'SOFTWARE_DEVELOPMENT',
                  'HARDWARE_DEVICES',
                  'TECH_INDUSTRY_BUSINESS',
                  'OTHER',
                ],
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
              },
              reasoning: {
                type: 'string',
              },
            },
            required: ['category', 'confidence'],
          },
        },
      },
      required: ['categories'],
    };
  }

  private extractStructuredCategories(responseText: string): StructuredCategory[] {
    try {
      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed?.categories)) {
        return parsed.categories;
      }
    } catch (error) {
      logger.warn('Failed to parse classification JSON response:', error);
    }

    throw new Error('Unable to parse structured classification response');
  }
}
