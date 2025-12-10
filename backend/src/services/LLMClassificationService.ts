import { GoogleGenAI, SafetySetting, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Category } from '@prisma/client';
import { SourceMetadata } from '../types/metadata';

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

export class SafetyBlockError extends Error {
  constructor(public readonly blockReason: string) {
    super(`Content generation blocked due to safety: ${blockReason}`);
    this.name = 'SafetyBlockError';
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

  constructor(client?: GoogleGenAI) {
    this.ai = client ?? new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }

  async classifyArticle(
    title: string,
    content: string,
    metadata?: SourceMetadata
  ): Promise<ClassificationResult> {
    try {
      logger.debug(`Classifying article: ${title.substring(0, 50)}...`);

      const systemInstruction = this.getSystemPrompt();
      const userPrompt = this.buildClassificationPrompt(title, content, metadata);

      const safetySettings: SafetySetting[] = [
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ];

      const response = await this.ai.models.generateContent({
        model: config.gemini.model,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: this.getClassificationSchema(),
          safetySettings: safetySettings
        },
      });

      if (response?.promptFeedback?.blockReason) {
        logger.error(`The Response from Gemini classification was blocked. Block reason: ${response.promptFeedback.blockReason}`);
        throw new SafetyBlockError(response.promptFeedback.blockReason);

        // Alternative solution:
        return {
            category: 'OTHER', // or a specific 'BLOCKED' category if your schema supports it
            confidence: 0.0,
            reasoning: `Content blocked by API Safety Policy (${response.promptFeedback.blockReason}). Likely involves sensitive or prohibited topics (e.g. CSAM, high violence).`,
            secondaryCategories: []
        };
      }

      const responseText = response?.text;

      if (!responseText) {
        logger.error(`The Response from Gemini classification has no text. Response: ${JSON.stringify(response)}`);
        throw new Error('No response text from Gemini classification, the response is:\n' + JSON.stringify(response));
      } 

      const payload = this.extractStructuredCategories(responseText);

      return this.processPayload(payload);
    } catch (error) {
      if (this.isRateLimitError(error)) {
        const retryDelay = this.extractRetryDelay(error);
        logger.warn(`Rate limit exceeded. Retry after ${retryDelay}s. Full error:`, error);
        
        // Throw RateLimitError so the caller can handle it appropriately
        throw new RateLimitError(
          `Rate limit exceeded. Please retry after ${retryDelay} seconds.`,
          retryDelay,
          error
        );
      }
      
      logger.error('Error classifying article:', error);
      throw error instanceof Error ? error : new Error('Classification failed');
    }
  }

  private processPayload(payload: StructuredCategory[]): ClassificationResult {
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
  }

  private isRateLimitError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null) {
      const err = error as { code?: number; message?: string };
      return err.code === 429 || (err.message?.includes('quota') ?? false);
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
    metadata?: SourceMetadata
  ): string {
    // Limit content length to avoid token limits
    const truncatedContent = content.substring(0, 4000);
    
    const metadataHints = metadata 
      ? `\n\nAdditional context:\n${JSON.stringify(metadata, null, 2)}`
      : '';
    
    return `Classify the following IT news article:

Title: ${title}

Content: ${truncatedContent}${metadataHints}

Use the additional context only as hints if they are helpful and consistent with the content. Provide your classification in JSON format.`;
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
