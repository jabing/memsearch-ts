/**
 * Embedding provider protocol and types
 */

import { EmbeddingError, EmbeddingErrorCodes } from '../types/errors.js';

/**
 * Embedding provider interface - all providers must implement this
 */
export interface IEmbeddingProvider {
  readonly modelName: string;
  readonly dimension: number;
  readonly providerName: string;
  embed(texts: string[]): Promise<number[][]>;
  embedBatch?(texts: string[]): Promise<number[][]>;
}

/**
 * Provider factory options
 */
export interface ProviderOptions {
  model?: string;
  batchSize?: number;
  apiKey?: string;
  baseURL?: string;
  dimension?: number;
}

/**
 * Provider registry type
 */
export type ProviderType = 'openai' | 'google' | 'ollama' | 'voyage';

/**
 * Default batch sizes for each provider
 */
export const DEFAULT_BATCH_SIZES: Record<ProviderType, number> = {
  openai: 2048,
  google: 100,
  ollama: 512,
  voyage: 512,
};

/**
 * Default dimensions for common models
 */
export const KNOWN_DIMENSIONS: Record<string, number> = {
  // OpenAI
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
  
  // Google
  'gemini-embedding-001': 768,
  'text-embedding-004': 768,
  
  // Voyage
  'voyage-3-lite': 1024,
  'voyage-3': 1024,
  'voyage-2': 1536,
  
  // Ollama (varies by model)
  'nomic-embed-text': 768,
  'mxbai-embed-large': 1024,
  'all-minilm': 384,
};

/**
 * Check if API key is set in environment
 */
export function getEnvApiKey(envVar: string): string | undefined {
  return process.env[envVar];
}

/**
 * Validate API key presence
 */
export function validateApiKey(apiKey: string | undefined, provider: string): asserts apiKey is string {
  if (!apiKey) {
    throw new EmbeddingError(
      `${provider} API key not found. Set ${getEnvVarForProvider(provider)} environment variable.`,
      'API_KEY_MISSING'
    );
  }
}

/**
 * Get environment variable name for provider
 */
function getEnvVarForProvider(provider: string): string {
  const envVars: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_API_KEY',
    voyage: 'VOYAGE_API_KEY',
    ollama: 'OLLAMA_HOST (optional, defaults to http://localhost:11434)',
  };
  return envVars[provider] || 'API_KEY';
}
