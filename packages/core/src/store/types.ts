/**
 * Vector store type definitions for memsearch-ts
 *
 * This module defines the core interfaces and types for vector store implementations.
 */

import type { SearchResult } from '../types/index.js';

/**
 * A record to be stored in the vector database
 */
export interface VectorRecord {
  /** Unique identifier (hash of content) */
  chunk_hash: string;
  /** Vector embedding */
  embedding: number[];
  /** Text content */
  content: string;
  /** Source file path */
  source: string;
  /** Heading text */
  heading: string;
  /** Heading level (1-6) */
  heading_level: number;
  /** Start line number in source */
  start_line: number;
  /** End line number in source */
  end_line: number;

  // === Triple memory fields (optional) ===
  /** Memory type: semantic, episodic, procedural */
  memory_type?: string;
  /** Node type: concept, event, skill, etc. */
  node_type?: string;
  /** Label for the memory */
  label?: string;
  /** Importance score (0-1) */
  importance?: number;
  /** Additional memory data (JSON) */
  memory_data?: string;
  /** Relations to other memories (JSON) */
  relations?: string;
  /** Creation timestamp */
  created_at?: number;
  /** Last update timestamp */
  updated_at?: number;
  /** Access count for relevance tracking */
  access_count?: number;
}

/**
 * Options for vector search operations
 */
export interface SearchOptions {
  /** Number of results to return */
  topK?: number;
  /** Optional filter expression */
  filter?: string;
  /** Optional query text for hybrid search */
  queryText?: string;
}

/**
 * Extended search result with all fields
 */
export interface ExtendedSearchResult extends SearchResult {
  /** Unique identifier */
  chunk_hash?: string;
  /** Memory type */
  memory_type?: string;
  /** Node type */
  node_type?: string;
  /** Label */
  label?: string;
  /** Importance score */
  importance?: number;
  /** Memory data */
  memory_data?: string;
  /** Relations */
  relations?: string;
  /** Creation timestamp */
  created_at?: number;
  /** Update timestamp */
  updated_at?: number;
  /** Access count */
  access_count?: number;
}

/**
 * Interface for vector store implementations
 *
 * Defines the core operations for a vector database that supports
 * semantic search and triple memory functionality.
 */
export interface IVectorStore {
  // === Lifecycle ===

  /**
   * Ensure the collection exists, creating it if necessary
   * @param dimension - Vector dimension (required for creation)
   */
  ensureCollection(dimension?: number): Promise<void>;

  /**
   * Close the connection and cleanup resources
   */
  close(): void;

  /**
   * Reset the store by dropping the collection
   */
  reset(): Promise<void>;

  // === CRUD Operations ===

  /**
   * Insert or update records in the store
   * @param records - Records to upsert
   * @returns Number of records inserted/updated
   */
  upsert(records: VectorRecord[]): Promise<number>;

  /**
   * Delete records matching a filter expression
   * @param filter - Filter expression
   */
  delete(filter: string): Promise<void>;

  /**
   * Delete records by their IDs (chunk hashes)
   * @param ids - Array of chunk hashes to delete
   */
  deleteByIds(ids: string[]): Promise<void>;

  // === Search Operations ===

  /**
   * Search for similar vectors
   * @param vector - Query vector
   * @param options - Search options
   * @returns Array of search results
   */
  search(vector: number[], options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Search with filter expression
   * @param vector - Query vector
   * @param filter - Filter expression
   * @param topK - Number of results
   * @returns Array of extended search results
   */
  searchWithFilter(
    vector: number[],
    filter?: string,
    topK?: number
  ): Promise<ExtendedSearchResult[]>;

  /**
   * Query records by filter expression
   * @param filter - Filter expression
   * @param limit - Maximum results to return
   * @returns Array of records
   */
  query(filter: string, limit?: number): Promise<VectorRecord[]>;

  // === Utility Operations ===

  /**
   * Get total count of records in the store
   * @returns Total count
   */
  count(): Promise<number>;

  /**
   * Get all unique sources in the store
   * @returns Set of source paths
   */
  getSources(): Promise<Set<string>>;

  /**
   * Get all record IDs for a given source
   * @param source - Source path
   * @returns Set of chunk hashes
   */
  getIdsBySource(source: string): Promise<Set<string>>;

  // === Backward Compatibility Methods ===

  /**
   * Delete records by source path
   * @deprecated Use delete() with filter expression instead
   */
  deleteBySource(source: string): Promise<void>;

  /**
   * Delete records by chunk hashes
   * @deprecated Use deleteByIds() instead
   */
  deleteByHashes(hashes: string[]): Promise<void>;

  /**
   * Get all indexed sources
   * @deprecated Use getSources() instead
   */
  indexedSources(): Promise<Set<string>>;

  /**
   * Get hashes by source
   * @deprecated Use getIdsBySource() instead
   */
  hashesBySource(source: string): Promise<Set<string>>;
}
