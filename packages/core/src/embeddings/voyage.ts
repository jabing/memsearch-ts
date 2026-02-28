/**
 * Voyage AI Embedding Provider
 * 
 * Requires: voyageai npm package (optional) or direct HTTP calls
 * Environment: VOYAGE_API_KEY
 */

import type { IEmbeddingProvider, ProviderOptions } from './types.js';
import { EmbeddingError, EmbeddingErrorCodes } from '../types/errors.js';
import { validateApiKey, DEFAULT_BATCH_SIZES, KNOWN_DIMENSIONS } from './types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('voyage');

interface VoyageAPIResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

export class VoyageEmbedding implements IEmbeddingProvider {
  readonly modelName: string;
  readonly dimension: number;
  readonly providerName = 'voyage';
  
  private apiKey: string;
  private batchSize: number;
  private baseURL: string;

  constructor(options: ProviderOptions = {}) {
    const apiKey = options.apiKey || process.env.VOYAGE_API_KEY;
    validateApiKey(apiKey, 'Voyage');

    this.apiKey = apiKey;
    this.modelName = options.model || 'voyage-3-lite';
    this.batchSize = options.batchSize || DEFAULT_BATCH_SIZES.voyage;
    this.baseURL = 'https://api.voyageai.com/v1';
    
    this.dimension = options.dimension || KNOWN_DIMENSIONS[this.modelName] || 1024;
    
    logger.info('VoyageEmbedding initialized', { model: this.modelName, dimension: this.dimension });
  }

  /**
   * Embed texts using Voyage AI API
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    logger.debug('Embedding texts', { count: texts.length, model: this.modelName });

    try {
      const batches = this.chunkArray(texts, this.batchSize);
      const allEmbeddings: number[][] = [];

      for (const batch of batches) {
        const response = await this.makeRequest({
          model: this.modelName,
          input: batch,
        });

        // Sort by index to maintain order
        const sorted = response.data.sort((a, b) => a.index - b.index);
        const embeddings = sorted.map(item => item.embedding);
        allEmbeddings.push(...embeddings);
      }

      logger.info('Embedding completed', { total: allEmbeddings.length });
      return allEmbeddings;

    } catch (error) {
      const err = error as any;
      
      if (err.status === 429) {
        throw new EmbeddingError(
          'Voyage rate limit exceeded',
          'RATE_LIMIT',
          error
        );
      }
      
      if (err.status === 401) {
        throw new EmbeddingError(
          'Voyage authentication failed. Check your API key.',
          'API_KEY_MISSING',
          error
        );
      }

      throw new EmbeddingError(
        `Voyage embedding failed: ${err.message}`,
        'API_ERROR',
        error
      );
    }
  }

  /**
   * Make HTTP request to Voyage API
   */
  private async makeRequest(body: { model: string; input: string[] }): Promise<VoyageAPIResponse> {
    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Voyage API error: ${response.status} ${JSON.stringify(error)}`);
    }

    return response.json();
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
