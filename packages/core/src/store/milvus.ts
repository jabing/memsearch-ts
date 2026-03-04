/**
 * Milvus vector storage layer
 *
 * Implements IVectorStore interface for Milvus vector database.
 */

import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';
import type { SearchResult } from '../types/index.js';
import { MilvusError } from '../types/errors.js';
import { createLogger } from '../utils/logger.js';
import { resolvePath } from '../types/config.js';
import type { IVectorStore, VectorRecord, SearchOptions, ExtendedSearchResult } from './types.js';

const logger = createLogger('store');

/**
 * Options for MilvusStore initialization
 */
export interface MilvusStoreOptions {
  uri: string;
  token?: string;
  collection: string;
  dimension?: number;
}

/**
 * A record in the Milvus vector store
 * @deprecated Use VectorRecord from './types.js' instead
 */
export type MilvusRecord = VectorRecord;

/**
 * Milvus implementation of IVectorStore
 *
 * Provides vector storage and search capabilities using Milvus database.
 * Supports both semantic search and triple memory functionality.
 */
export class MilvusStore implements IVectorStore {
  private client: MilvusClient;
  private collection: string;
  private dimension?: number;

  constructor(options: MilvusStoreOptions) {
    const uri = resolvePath(options.uri);
    logger.info('Initializing MilvusStore', { uri, collection: options.collection });
    this.client = new MilvusClient({ address: uri, token: options.token });
    this.collection = options.collection;
    this.dimension = options.dimension;
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  async ensureCollection(dimension?: number): Promise<void> {
    // Use provided dimension or fall back to instance dimension
    const dim = dimension ?? this.dimension;

    try {
      const has = await this.client.hasCollection({ collection_name: this.collection });
      if (has.value) {
        logger.info('Collection exists');
        return;
      }
      if (!dim) {
        logger.warn('No dimension, skipping collection creation');
        return;
      }

      await this.client.createCollection({
        collection_name: this.collection,
        schema: [
          { name: 'chunk_hash', data_type: DataType.VarChar, is_primary_key: true, max_length: 64 },
          { name: 'embedding', data_type: DataType.FloatVector, dim },
          {
            name: 'content',
            data_type: DataType.VarChar,
            max_length: 65535,
            enable_analyzer: true,
          },
          { name: 'sparse_vector', data_type: DataType.SparseFloatVector },
          { name: 'source', data_type: DataType.VarChar, max_length: 1024 },
          { name: 'heading', data_type: DataType.VarChar, max_length: 1024 },
          { name: 'heading_level', data_type: DataType.Int64 },
          { name: 'start_line', data_type: DataType.Int64 },
          { name: 'end_line', data_type: DataType.Int64 },
          // === Triple memory fields ===
          { name: 'memory_type', data_type: DataType.VarChar, max_length: 16 },
          { name: 'node_type', data_type: DataType.VarChar, max_length: 32 },
          { name: 'label', data_type: DataType.VarChar, max_length: 256 },
          { name: 'importance', data_type: DataType.Float },
          { name: 'memory_data', data_type: DataType.VarChar, max_length: 65535 },
          { name: 'relations', data_type: DataType.VarChar, max_length: 65535 },
          { name: 'created_at', data_type: DataType.Int64 },
          { name: 'updated_at', data_type: DataType.Int64 },
          { name: 'access_count', data_type: DataType.Int64 },
        ] as any,
        index_params: [
          { field_name: 'embedding', index_type: 'FLAT', metric_type: 'COSINE' },
          { field_name: 'sparse_vector', index_type: 'SPARSE_INVERTED_INDEX', metric_type: 'BM25' },
        ] as any,
      } as any);
      logger.info('Collection created');
    } catch (error) {
      throw new MilvusError(
        `Failed to ensure collection: ${(error as Error).message}`,
        'CONNECTION_FAILED',
        error
      );
    }
  }

  close(): void {
    logger.info('Connection closed');
  }

  async reset(): Promise<void> {
    try {
      await this.client.dropCollection({ collection_name: this.collection } as any);
      logger.info('Collection dropped');
    } catch (error) {
      throw new MilvusError(
        `Reset failed: ${(error as Error).message}`,
        'CONNECTION_FAILED',
        error
      );
    }
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async upsert(records: VectorRecord[]): Promise<number> {
    if (!records.length) return 0;
    try {
      const result = await this.client.insert({
        collection_name: this.collection,
        data: records as any,
      });
      logger.info('Upsert completed', { count: result.insert_cnt });
      return Number(result.insert_cnt) || records.length;
    } catch (error) {
      throw new MilvusError(`Upsert failed: ${(error as Error).message}`, 'UPSERT_FAILED', error);
    }
  }

  async delete(filter: string): Promise<void> {
    try {
      await this.client.delete({
        collection_name: this.collection,
        filter,
      } as any);
      logger.info('Deleted by filter', { filter });
    } catch (error) {
      throw new MilvusError(`Delete failed: ${(error as Error).message}`, 'DELETE_FAILED', error);
    }
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (!ids.length) return;
    try {
      const filter = `chunk_hash in [${ids.map((id) => `"${id}"`).join(',')}]`;
      await this.client.delete({ collection_name: this.collection, filter } as any);
      logger.info('Deleted by IDs', { count: ids.length });
    } catch (error) {
      throw new MilvusError(`Delete failed: ${(error as Error).message}`, 'DELETE_FAILED', error);
    }
  }

  // ============================================================================
  // Search Operations
  // ============================================================================

  async search(vector: number[], options?: SearchOptions): Promise<SearchResult[]> {
    const topK = options?.topK ?? 10;

    try {
      const result = await this.client.search({
        collection_name: this.collection,
        data: [vector],
        limit: topK,
        output_fields: ['content', 'source', 'heading', 'heading_level', 'start_line', 'end_line'],
      } as any);

      return (result.results || []).map((r: any) => ({
        content: r.entity.content,
        source: r.entity.source,
        heading: r.entity.heading,
        score: r.score,
        startLine: Number(r.entity.start_line),
        endLine: Number(r.entity.end_line),
      }));
    } catch (error) {
      throw new MilvusError(`Search failed: ${(error as Error).message}`, 'SEARCH_FAILED', error);
    }
  }

  async searchWithFilter(
    vector: number[],
    filter?: string,
    topK = 10
  ): Promise<ExtendedSearchResult[]> {
    try {
      const result = await this.client.search({
        collection_name: this.collection,
        data: [vector],
        limit: topK,
        filter,
        output_fields: [
          'chunk_hash',
          'content',
          'source',
          'heading',
          'memory_type',
          'node_type',
          'label',
          'importance',
          'memory_data',
          'relations',
          'created_at',
          'updated_at',
          'access_count',
        ],
      } as any);

      return (result.results || []).map((r: any) => ({
        chunk_hash: r.entity.chunk_hash,
        content: r.entity.content,
        source: r.entity.source,
        heading: r.entity.heading,
        memory_type: r.entity.memory_type,
        node_type: r.entity.node_type,
        label: r.entity.label,
        importance: r.entity.importance,
        memory_data: r.entity.memory_data,
        relations: r.entity.relations,
        created_at: r.entity.created_at,
        updated_at: r.entity.updated_at,
        access_count: r.entity.access_count,
        score: r.score,
        startLine: 0,
        endLine: 0,
      }));
    } catch (error) {
      throw new MilvusError(
        `Search with filter failed: ${(error as Error).message}`,
        'SEARCH_FAILED',
        error
      );
    }
  }

  async query(filter: string, limit = 1000): Promise<VectorRecord[]> {
    try {
      const result = await this.client.query({
        collection_name: this.collection,
        filter,
        limit,
      } as any);
      return (result.data || []) as VectorRecord[];
    } catch (error) {
      throw new MilvusError(`Query failed: ${(error as Error).message}`, 'QUERY_FAILED', error);
    }
  }

  // ============================================================================
  // Utility Operations
  // ============================================================================

  async count(): Promise<number> {
    try {
      const result = await this.client.query({
        collection_name: this.collection,
        output_fields: ['count(*)'],
      } as any);
      return Number(result.data?.[0]?.['count(*)'] ?? 0);
    } catch {
      return 0;
    }
  }

  async getSources(): Promise<Set<string>> {
    try {
      const result = await this.client.query({
        collection_name: this.collection,
        output_fields: ['source'],
        limit: 10000,
      } as any);
      const sources = new Set<string>();
      (result.data || []).forEach((r: any) => sources.add(r.source));
      return sources;
    } catch {
      return new Set();
    }
  }

  async getIdsBySource(source: string): Promise<Set<string>> {
    try {
      const result = await this.client.query({
        collection_name: this.collection,
        filter: `source == "${source}"`,
        output_fields: ['chunk_hash'],
      } as any);
      const ids = new Set<string>();
      (result.data || []).forEach((r: any) => ids.add(r.chunk_hash));
      return ids;
    } catch {
      return new Set();
    }
  }

  // ============================================================================
  // Backward Compatibility Methods
  // ============================================================================

  /**
   * Delete records by source path
   * @deprecated Use delete() with filter expression instead
   */
  async deleteBySource(source: string): Promise<void> {
    return this.delete(`source == "${source}"`);
  }

  /**
   * Delete records by chunk hashes
   * @deprecated Use deleteByIds() instead
   */
  async deleteByHashes(hashes: string[]): Promise<void> {
    return this.deleteByIds(hashes);
  }

  /**
   * Get all indexed sources
   * @deprecated Use getSources() instead
   */
  async indexedSources(): Promise<Set<string>> {
    return this.getSources();
  }

  /**
   * Get hashes by source
   * @deprecated Use getIdsBySource() instead
   */
  async hashesBySource(source: string): Promise<Set<string>> {
    return this.getIdsBySource(source);
  }
}

/**
 * RRF (Reciprocal Rank Fusion) - Combine dense and sparse results
 */
export function combineResultsByRRF(
  dense: SearchResult[],
  sparse: SearchResult[],
  k = 60
): SearchResult[] {
  const scoreMap = new Map<string, { result: SearchResult; score: number }>();
  dense.forEach((r, i) =>
    scoreMap.set(`${r.source}:${r.startLine}`, { result: r, score: 1 / (k + i + 1) })
  );
  sparse.forEach((r, i) => {
    const key = `${r.source}:${r.startLine}`;
    const existing = scoreMap.get(key);
    if (existing) existing.score += 1 / (k + i + 1);
    else scoreMap.set(key, { result: r, score: 1 / (k + i + 1) });
  });
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map((x) => x.result);
}
