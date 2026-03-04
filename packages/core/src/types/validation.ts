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
 * LanceDB configuration schema
 */
export const LanceDBConfigSchema = z.object({
  uri: z.string().min(1, 'LanceDB URI is required'),
  table: z.string().optional().default('memsearch_chunks'),
});

/**
 * Milvus configuration schema (kept for backward compatibility)
 */
export const MilvusConfigSchema = z.object({
  uri: z.string().min(1, 'Milvus URI is required').optional(),
  token: z.string().optional().default(''),
  collection: z.string().min(1, 'Collection name is required').default('memsearch_chunks'),
});

/**
 * Vector store configuration schema - supports multiple backends
 */
export const VectorStoreConfigSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('lancedb'),
    lancedb: LanceDBConfigSchema,
  }),
  z.object({
    provider: z.literal('milvus'),
    milvus: MilvusConfigSchema,
  }),
]);

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
  vectorStore: VectorStoreConfigSchema.optional(),
  milvus: MilvusConfigSchema.optional(),
  chunking: ChunkingConfigSchema.optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional(),
});

/**
 * Default values merged with schema
 */
export const MemSearchConfigWithDefaultsSchema = MemSearchConfigSchema.transform((data) => ({
  paths: data.paths ?? [],
  embedding: {
    provider: data.embedding?.provider ?? ('openai' as const),
    model: data.embedding?.model,
    batchSize: data.embedding?.batchSize ?? 0,
  },
  vectorStore: data.vectorStore,
  milvus: {
    uri: data.milvus?.uri ?? '~/.memsearch/milvus.db',
    token: data.milvus?.token ?? '',
    collection: data.milvus?.collection ?? 'memsearch_chunks',
  },
  chunking: {
    maxChunkSize: data.chunking?.maxChunkSize ?? 1500,
    overlapLines: data.chunking?.overlapLines ?? 2,
  },
  logLevel: data.logLevel ?? 'warn',
}));

/**
 * Validate and parse configuration
 */
export function validateConfigWithZod(
  config: unknown
): z.infer<typeof MemSearchConfigWithDefaultsSchema> {
  const result = MemSearchConfigWithDefaultsSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Configuration validation failed: ${errors}`);
  }

  return result.data;
}

/**
 * Validate embedding provider specifically
 */
export function validateEmbeddingProvider(
  provider: string
): asserts provider is 'openai' | 'google' | 'ollama' | 'voyage' {
  const validProviders = ['openai', 'google', 'ollama', 'voyage'] as const;
  if (!validProviders.includes(provider as any)) {
    throw new Error(`Invalid embedding provider: ${provider}. Valid: ${validProviders.join(', ')}`);
  }
}
