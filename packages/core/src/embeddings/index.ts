/**
 * Embedding providers - factory and exports
 */

import type { IEmbeddingProvider, ProviderOptions, ProviderType } from './types.js';
import { EmbeddingError, EmbeddingErrorCodes } from '../types/errors.js';
import { createLogger } from '../utils/logger.js';

// Re-export providers
export { OpenAIEmbedding } from './openai.js';
export { GoogleEmbedding } from './google.js';
export { OllamaEmbedding } from './ollama.js';
export { VoyageEmbedding } from './voyage.js';

// Re-export types
export type { IEmbeddingProvider, ProviderOptions, ProviderType } from './types.js';
export {
  DEFAULT_BATCH_SIZES,
  KNOWN_DIMENSIONS,
  getEnvApiKey,
  validateApiKey,
} from './types.js';

const logger = createLogger('embeddings');

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS_MAP: Record<ProviderType, string> = {
  openai: 'text-embedding-3-small',
  google: 'gemini-embedding-001',
  voyage: 'voyage-3-lite',
  ollama: 'nomic-embed-text',
};

/**
 * Get embedding provider by name (lazy loading to avoid circular deps)
 */
export async function getEmbeddingProvider(
  name: ProviderType | string,
  options: ProviderOptions = {}
): Promise<IEmbeddingProvider> {
  const providerName = name as ProviderType;
  
  let ProviderClass: new (options: ProviderOptions) => IEmbeddingProvider;
  
  switch (providerName) {
    case 'openai':
      ProviderClass = (await import('./openai.js')).OpenAIEmbedding;
      break;
    case 'google':
      ProviderClass = (await import('./google.js')).GoogleEmbedding;
      break;
    case 'ollama':
      ProviderClass = (await import('./ollama.js')).OllamaEmbedding;
      break;
    case 'voyage':
      ProviderClass = (await import('./voyage.js')).VoyageEmbedding;
      break;
    default:
      const validProviders = ['openai', 'google', 'ollama', 'voyage'].join(', ');
      throw new EmbeddingError(
        `Unknown embedding provider: ${name}. Valid: ${validProviders}`,
        EmbeddingErrorCodes.MODEL_NOT_FOUND
      );
  }

  // Set default model if not provided
  if (!options.model) {
    options.model = DEFAULT_MODELS_MAP[providerName];
  }

  logger.info('Creating embedding provider', { provider: providerName, model: options.model });

  return new ProviderClass(options);
}

/**
 * Get available providers
 */
export function getAvailableProviders(): ProviderType[] {
  return ['openai', 'google', 'ollama', 'voyage'];
}

/**
 * Check if provider is available (API key set, etc.)
 */
export async function isProviderAvailable(name: ProviderType): Promise<boolean> {
  try {
    const provider = await getEmbeddingProvider(name);
    return provider.dimension > 0;
  } catch {
    return false;
  }
}
