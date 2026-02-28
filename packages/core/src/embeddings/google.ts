/**
 * Google (Gemini) Embedding Provider
 * 
 * Requires: @google/genai npm package (replaces @google/generative-ai)
 * Environment: GOOGLE_API_KEY
 */

import { GoogleGenAI } from '@google/genai';
import type { IEmbeddingProvider, ProviderOptions } from './types.js';
import { EmbeddingError, EmbeddingErrorCodes } from '../types/errors.js';
import { validateApiKey, DEFAULT_BATCH_SIZES, KNOWN_DIMENSIONS } from './types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('google');

export class GoogleEmbedding implements IEmbeddingProvider {
  readonly modelName: string;
  readonly dimension: number;
  readonly providerName = 'google';
  
  private client: GoogleGenAI;
  private batchSize: number;

  constructor(options: ProviderOptions = {}) {
    const apiKey = options.apiKey || process.env.GOOGLE_API_KEY;
    validateApiKey(apiKey, 'Google');

    this.client = new GoogleGenAI({ apiKey });
    this.modelName = options.model || 'gemini-embedding-001';
    this.batchSize = options.batchSize || DEFAULT_BATCH_SIZES.google;
    
    // Google gemini-embedding-001 outputs 3072 by default, but 768 is recommended
    this.dimension = options.dimension || 768;
    
    logger.info('GoogleEmbedding initialized', { model: this.modelName, dimension: this.dimension });
  }

  /**
   * Embed texts using Google Generative AI
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    logger.debug('Embedding texts', { count: texts.length, model: this.modelName });

    try {
      const allEmbeddings: number[][] = [];

      // Google API processes one text at a time for embeddings
      for (const text of texts) {
        const result = await this.client.models.embedContent({
          model: this.modelName,
          contents: text,
        });

        const embedding = result.embeddings?.[0]?.values;
        if (!embedding) {
          throw new Error('No embedding returned');
        }

        // Truncate to configured dimension if needed
        const truncatedEmbedding = embedding.slice(0, this.dimension);
        allEmbeddings.push(truncatedEmbedding);
      }

      logger.info('Embedding completed', { total: allEmbeddings.length });
      return allEmbeddings;

    } catch (error) {
      const err = error as any;
      
      if (err.status === 429) {
        throw new EmbeddingError(
          'Google rate limit exceeded',
          'RATE_LIMIT',
          error
        );
      }
      
      if (err.status === 401 || err.status === 403) {
        throw new EmbeddingError(
          'Google authentication failed. Check your API key.',
          'API_KEY_MISSING',
          error
        );
      }

      throw new EmbeddingError(
        `Google embedding failed: ${err.message}`,
        'API_ERROR',
        error
      );
    }
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      provider: this.providerName,
      model: this.modelName,
      dimension: this.dimension,
      batchSize: this.batchSize,
    };
  }
}
