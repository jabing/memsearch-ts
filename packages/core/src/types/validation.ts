/**
 * Zod schema validation for configuration and types
 */

import { z } from 'zod';

/**
 * Embedding provider schema
 */
export const EmbeddingProviderSchema = z.object({
  provider: z.enum(['openai', 'google', 'ollama', 'voyage']),
  model: z.string().optional(),
  batchSize: z.number().int().min(0).optional(),
});

/**
 * Milvus configuration schema
 */
export const MilvusConfigSchema = z.object({
  uri: z.string().min(1, 'Milvus URI is required'),
  token: z.string().optional().default(''),
  collection: z.string().min(1, 'Collection name is required').default('memsearch_chunks'),
});

/**
 * Chunking configuration schema
 */
export const ChunkingConfigSchema = z.object({
  maxChunkSize: z.number().int().min(100).max(10000).default(1500),
  overlapLines: z.number().int().min(0).max(10).default(2),
});

/**
 * Main MemSearch configuration schema
 */
export const MemSearchConfigSchema = z.object({
  paths: z.array(z.string()).optional().default([]),
  embedding: EmbeddingProviderSchema.optional(),
  milvus: MilvusConfigSchema,
  chunking: ChunkingConfigSchema.optional(),
});

/**
 * Default values merged with schema
 */
export const MemSearchConfigWithDefaultsSchema = MemSearchConfigSchema.transform((data) => ({
  paths: data.paths ?? [],
  embedding: {
    provider: data.embedding?.provider ?? 'openai' as const,
    model: data.embedding?.model,
    batchSize: data.embedding?.batchSize ?? 0,
  },
  milvus: {
    uri: data.milvus.uri,
    token: data.milvus.token ?? '',
    collection: data.milvus.collection ?? 'memsearch_chunks',
  },
  chunking: {
    maxChunkSize: data.chunking?.maxChunkSize ?? 1500,
    overlapLines: data.chunking?.overlapLines ?? 2,
  },
}));

/**
 * Validate and parse configuration
 */
export function validateConfigWithZod(config: unknown): z.infer<typeof MemSearchConfigWithDefaultsSchema> {
  const result = MemSearchConfigWithDefaultsSchema.safeParse(config);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Configuration validation failed: ${errors}`);
  }
  
  return result.data;
}

/**
 * Validate embedding provider specifically
 */
export function validateEmbeddingProvider(provider: string): asserts provider is 'openai' | 'google' | 'ollama' | 'voyage' {
  const validProviders = ['openai', 'google', 'ollama', 'voyage'] as const;
  if (!validProviders.includes(provider as any)) {
    throw new Error(
      `Invalid embedding provider: ${provider}. Valid: ${validProviders.join(', ')}`
    );
  }
}
