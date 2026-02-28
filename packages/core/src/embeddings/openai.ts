/**
 * OpenAI Embedding Provider
 * 
 * Requires: openai npm package
 * Environment: OPENAI_API_KEY, OPENAI_BASE_URL (optional)
 */

import { OpenAI } from 'openai';
import type { IEmbeddingProvider, ProviderOptions } from './types.js';
import { EmbeddingError, EmbeddingErrorCodes } from '../types/errors.js';
import { validateApiKey, DEFAULT_BATCH_SIZES, KNOWN_DIMENSIONS } from './types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('openai');

export class OpenAIEmbedding implements IEmbeddingProvider {
  readonly modelName: string;
  readonly dimension: number;
  readonly providerName = 'openai';
  
  private client: OpenAI;
  private batchSize: number;

  constructor(options: ProviderOptions = {}) {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    validateApiKey(apiKey, 'OpenAI');

    const baseURL = options.baseURL || process.env.OPENAI_BASE_URL;
    
    this.client = new OpenAI({
      apiKey,
      ...(baseURL && { baseURL }),
    });

    this.modelName = options.model || 'text-embedding-3-small';
    this.batchSize = options.batchSize || DEFAULT_BATCH_SIZES.openai;
    
    // Get dimension from known dimensions or user override
    this.dimension = options.dimension || KNOWN_DIMENSIONS[this.modelName] || 1536;
    
    logger.info('OpenAIEmbedding initialized', { model: this.modelName, dimension: this.dimension });
  }

  /**
   * Embed single text or batch of texts
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    logger.debug('Embedding texts', { count: texts.length, model: this.modelName });

    try {
      // Split into batches
      const batches = this.chunkArray(texts, this.batchSize);
      const allEmbeddings: number[][] = [];

      for (const batch of batches) {
        const response = await this.client.embeddings.create({
          model: this.modelName,
          input: batch,
        });

        const embeddings = response.data.map(item => item.embedding);
        allEmbeddings.push(...embeddings);
        
        logger.debug('Batch completed', { batchSize: batch.length });
      }

      logger.info('Embedding completed', { total: allEmbeddings.length });
      return allEmbeddings;

    } catch (error) {
      const err = error as any;
      
      if (err.status === 429) {
        throw new EmbeddingError(
          'OpenAI rate limit exceeded',
          EmbeddingErrorCodes.RATE_LIMIT,
          error
        );
      }
      
      if (err.status === 401) {
        throw new EmbeddingError(
          'OpenAI authentication failed. Check your API key.',
          EmbeddingErrorCodes.API_KEY_MISSING,
          error
        );
      }

      throw new EmbeddingError(
        `OpenAI embedding failed: ${err.message}`,
        EmbeddingErrorCodes.API_ERROR,
        error
      );
    }
  }

  /**
   * Chunk array into smaller batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
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
