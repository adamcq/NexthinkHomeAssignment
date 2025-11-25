import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { logger } from '../utils/logger';

const MAX_EMBED_LENGTH = 8000;

export class EmbeddingService {
  private readonly ai: GoogleGenAI;

  constructor(client?: GoogleGenAI) {
    this.ai = client ?? new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }

  async embed(text: string): Promise<number[]> {
    try {
      const trimmed = text.substring(0, MAX_EMBED_LENGTH);
      const result = await this.ai.models.embedContent({
        model: config.gemini.embeddingModel,
        contents: trimmed,
      });
      
      const values = result?.embeddings?.[0]?.values ?? [];

      if (!values.length) {
        throw new Error('Embedding service returned an empty vector');
      }

      logger.debug(`Generated embedding of length ${values.length} for text of length ${trimmed.length}`);
      return values;
    } catch (error) {
      logger.error('Error generating embedding with Gemini:', error);
      throw error instanceof Error ? error : new Error('Embedding generation failed');
    }
  }
}

export const embeddingService = new EmbeddingService();
