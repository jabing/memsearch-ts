/**
 * Ollama Embedding Provider (Local)
 * 
 * Requires: ollama npm package
 * Environment: OLLAMA_HOST (optional, defaults to http://localhost:11434)
 * No API key needed - runs locally
 */

import Ollama from 'ollama';
import type { IEmbeddingProvider, ProviderOptions } from './types.js';
import { EmbeddingError, EmbeddingErrorCodes } from '../types/errors.js';
import { DEFAULT_BATCH_SIZES } from './types.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ollama');

export class OllamaEmbedding implements IEmbeddingProvider {
  readonly modelName: string;
  readonly dimension: number;
  readonly providerName = 'ollama';
  
  private client: Ollama;
  private batchSize: number;

  constructor(options: ProviderOptions = {}) {
    const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    
    this.client = new Ollama({ host });
    this.modelName = options.model || 'nomic-embed-text';
    this.batchSize = options.batchSize || DEFAULT_BATCH_SIZES.ollama;
    
    // Auto-detect dimension by embedding a test string
    this.dimension = options.dimension || this.detectDimension();
    
    logger.info('OllamaEmbedding initialized', { model: this.modelName, dimension: this.dimension, host });
  }

  /**
   * Detect dimension from model
   */
  private detectDimension(): number {
    try {
      const response = this.client.embed({
        model: this.modelName,
        input: 'test',
      });
      return response.embedding.length;
    } catch (error) {
      logger.warn('Failed to detect dimension, using default 768');
      return 768;
    }
  }

  /**
   * Embed texts using Ollama
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    logger.debug('Embedding texts', { count: texts.length, model: this.modelName });

    try {
      const allEmbeddings: number[][] = [];

      // Ollama processes one text at a time
      for (const text of texts) {
        const response = await this.client.embed({
          model: this.modelName,
          input: text,
        });

        allEmbeddings.push(response.embedding);
      }

      logger.info('Embedding completed', { total: allEmbeddings.length });
      return allEmbeddings;

    } catch (error) {
      const err = error as any;
      
      if (err.code === 'ECONNREFUSED') {
        throw new EmbeddingError(
          'Cannot connect to Ollama. Make sure Ollama is running on ' + process.env.OLLAMA_HOST || 'http://localhost:11434',
          EmbeddingErrorCodes.API_ERROR,
          error
        );
      }

      if (err.response?.status === 404) {
        throw new EmbeddingError(
          `Model '${this.modelName}' not found. Run: ollama pull ${this.modelName}`,
          EmbeddingErrorCodes.MODEL_NOT_FOUND,
          error
        );
      }

      throw new EmbeddingError(
        `Ollama embedding failed: ${err.message}`,
        EmbeddingErrorCodes.API_ERROR,
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
