/**
 * Vector store module
 *
 * Factory function and exports for vector store implementations.
 */

import type { IVectorStore } from './types.js';
import { MilvusStore } from './milvus.js';
import { LanceDBStore } from './lancedb.js';
import type { MilvusStoreOptions } from './milvus.js';
import type { LanceDBStoreOptions } from './lancedb.js';

// Re-export implementations
export { MilvusStore, combineResultsByRRF } from './milvus.js';
export { LanceDBStore } from './lancedb.js';

// Re-export types
export type { MilvusStoreOptions, MilvusRecord } from './milvus.js';
export type { LanceDBStoreOptions } from './lancedb.js';
export type { IVectorStore, VectorRecord, SearchOptions, ExtendedSearchResult } from './types.js';

/**
 * Configuration options for creating a vector store
 */
export interface VectorStoreOptions {
  /** Milvus-specific options */
  milvus?: MilvusStoreOptions;
  /** LanceDB-specific options */
  lancedb?: Partial<LanceDBStoreOptions>;
  /** Collection name (used by both backends) */
  collection?: string;
  /** Vector dimension (used by both backends) */
  dimension?: number;
}

/**
 * Create a vector store instance based on configuration
 *
 * @param options - Configuration options
 * @returns Vector store instance
 *
 * @example
 * ```typescript
 * // Default: LanceDB with zero configuration
 * const store = createVectorStore();
 *
 * // LanceDB with custom URI
 * const store = createVectorStore({
 *   lancedb: { uri: './my-lancedb' },
 *   collection: 'my_collection',
 * });
 *
 * // Milvus backend
 * const store = createVectorStore({
 *   milvus: { uri: '~/.memsearch/milvus.db' },
 *   collection: 'my_collection',
 * });
 * ```
 */
export function createVectorStore(options: VectorStoreOptions = {}): IVectorStore {
  // Use Milvus if uri is provided
  if (options?.milvus?.uri) {
    return new MilvusStore({
      uri: options.milvus.uri,
      token: options.milvus.token,
      collection: options.collection || options.milvus.collection || 'memsearch_chunks',
      dimension: options.dimension,
    });
  }

  // Default to LanceDB
  return new LanceDBStore({
    uri: options?.lancedb?.uri || '~/.memsearch/lancedb',
    table: options.collection || options.lancedb?.table || 'memsearch_chunks',
    dimension: options.dimension,
  });
}
