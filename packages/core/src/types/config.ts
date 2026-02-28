
import type { MemSearchConfig } from './index.js';
import { validateConfigWithZod } from './validation.js';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<MemSearchConfig> = {
  paths: [],
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    batchSize: 0,
  },
  milvus: {
    uri: '~/.memsearch/milvus.db',
    token: '',
    collection: 'memsearch_chunks',
  },
  chunking: {
    maxChunkSize: 1500,
    overlapLines: 2,
  },
};

/**
 * Default models for each embedding provider
 */
export const DEFAULT_MODELS: Record<string, string> = {
  openai: 'text-embedding-3-small',
  google: 'gemini-embedding-001',
  voyage: 'voyage-3-lite',
  ollama: 'nomic-embed-text',
};

/**
 * Resolve tilde in path to home directory
 */
export function resolvePath(path: string): string {
  if (path.startsWith('~')) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    return path.replace('~', home);
  }
  return path;
}

/**
 * Validate and merge configuration using Zod
 */
export function validateConfig(config: MemSearchConfig): Required<MemSearchConfig> {
  const validated = validateConfigWithZod(config);
  
  // Merge with defaults
  return {
    paths: validated.paths,
    embedding: {
      provider: validated.embedding.provider,
      model: validated.embedding.model ?? DEFAULT_MODELS[validated.embedding.provider],
      batchSize: validated.embedding.batchSize,
    },
    milvus: {
      uri: resolvePath(validated.milvus.uri),
      token: validated.milvus.token,
      collection: validated.milvus.collection,
    },
    chunking: {
      maxChunkSize: validated.chunking.maxChunkSize,
      overlapLines: validated.chunking.overlapLines,
    },
  };
}

/**
 * Safe configuration validation that returns errors
 */
export function tryValidateConfig(
  config: unknown
): { success: true; config: Required<MemSearchConfig> } | { success: false; errors: string[] } {
  try {
    const validated = validateConfigWithZod(config);
    const resolved: Required<MemSearchConfig> = {
      paths: validated.paths,
      embedding: {
        provider: validated.embedding.provider,
        model: validated.embedding.model ?? DEFAULT_MODELS[validated.embedding.provider],
        batchSize: validated.embedding.batchSize,
      },
      milvus: {
        uri: resolvePath(validated.milvus.uri),
        token: validated.milvus.token,
        collection: validated.milvus.collection,
      },
      chunking: {
        maxChunkSize: validated.chunking.maxChunkSize,
        overlapLines: validated.chunking.overlapLines,
      },
    };
    return { success: true, config: resolved };
  } catch (error) {
    const errors = error instanceof Error ? [error.message] : ['Unknown validation error'];
    return { success: false, errors };
  }
}
