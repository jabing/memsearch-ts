/**
 * memsearch-ts - Core Library
 * 
 * Semantic memory search for markdown knowledge bases
 */

// Main class
export { MemSearch } from './memsearch.js';

// Types
export type {
  Chunk,
  ScannedFile,
  EmbeddingProvider,
  SearchResult,
  MemSearchConfig,
  WatcherCallback,
} from './types/index.js';

// Chunk utilities
export {
  computeChunkId,
  computeContentHash,
  sha256Sync,
} from './types/chunk.js';

// Configuration
export {
  DEFAULT_CONFIG,
  DEFAULT_MODELS,
  resolvePath,
  validateConfig,
  tryValidateConfig,
} from './types/config.js';

// Error classes
export {
  MemSearchError,
  ConfigError,
  ConfigErrorCodes,
  MilvusError,
  MilvusErrorCodes,
  EmbeddingError,
  EmbeddingErrorCodes,
  FileSystemError,
  FileSystemErrorCodes,
  ChunkingError,
  ChunkingErrorCodes,
  WatcherError,
  WatcherErrorCodes,
  withErrorContext,
  withErrorContextAsync,
} from './types/errors.js';

// Zod schemas
export {
  MemSearchConfigSchema,
  MilvusConfigSchema,
  ChunkingConfigSchema,
  EmbeddingProviderSchema,
  validateConfigWithZod,
} from './types/validation.js';

// Embedding providers
export {
  getEmbeddingProvider,
  getAvailableProviders,
  isProviderAvailable,
  OpenAIEmbedding,
  GoogleEmbedding,
  OllamaEmbedding,
  VoyageEmbedding,
  DEFAULT_MODELS_MAP,
  DEFAULT_BATCH_SIZES,
  KNOWN_DIMENSIONS,
} from './embeddings/index.js';
export type {
  IEmbeddingProvider,
  ProviderOptions,
  ProviderType,
} from './embeddings/index.js';

// Utilities
export { Logger, defaultLogger, createLogger } from './utils/index.js';
export type { LogLevel, LoggerOptions } from './utils/index.js';

// Chunker
export { chunkMarkdown } from './chunker.js';
export type { ChunkOptions } from './chunker.js';

// Scanner
export { scanPaths } from './scanner.js';
