/**
 * LanceDB vector storage layer
 *
 * Implements IVectorStore interface using LanceDB as the backend.
 * LanceDB is an embedded vector database that stores data locally.
 */
import * as lancedb from '@lancedb/lancedb';
import type { Table } from '@lancedb/lancedb';
import type { SearchResult } from '../types/index.js';
import { MemSearchError } from '../types/errors.js';
import { createLogger } from '../utils/logger.js';
import { resolvePath } from '../types/config.js';
import { convertFilter } from './filter-converter.js';
import type { IVectorStore, VectorRecord, SearchOptions, ExtendedSearchResult } from './types.js';

const logger = createLogger('lancedb');

/**
 * Configuration options for LanceDBStore
 */
export interface LanceDBStoreOptions {
  /** Database URI (local path, e.g., '~/.memsearch/lancedb') */
  uri: string;
  /** Table name */
  table: string;
  /** Vector dimension (required for creating new table) */
  dimension?: number;
}

/**
 * Internal record format for LanceDB
 * Maps VectorRecord fields to LanceDB schema
 */
interface LanceDBRecord {
  chunk_hash: string;
  embedding: number[];
  content: string;
  source: string;
  heading: string;
  heading_level: number;
  start_line: number;
  end_line: number;
  // Triple memory fields (optional)
  memory_type: string | null | undefined;
  node_type: string | null | undefined;
  label: string | null | undefined;
  importance: number | null | undefined;
  memory_data: string | null | undefined;
  relations: string | null | undefined;
  created_at: number | null | undefined;
  updated_at: number | null | undefined;
  access_count: number | null | undefined;
}

/**
 * LanceDB implementation of IVectorStore
 *
 * Provides vector storage and search capabilities using LanceDB,
 * an embedded vector database that stores data locally in Lance format.
 */
export class LanceDBStore implements IVectorStore {
  private db: lancedb.Connection | null = null;
  private table: Table | null = null;
  private uri: string;
  private tableName: string;
  private dimension?: number;

  constructor(options: LanceDBStoreOptions) {
    this.uri = resolvePath(options.uri);
    this.tableName = options.table;
    this.dimension = options.dimension;
    logger.info('Initializing LanceDBStore', {
      uri: this.uri,
      table: this.tableName,
    });
  }

  /**
   * Ensure the table exists, creating it if necessary
   */
  async ensureCollection(dimension?: number): Promise<void> {
    try {
      // Use provided dimension or stored dimension
      const dim = dimension ?? this.dimension;

      // Connect to database if not connected
      if (!this.db) {
        this.db = await lancedb.connect(this.uri);
        logger.info('Connected to LanceDB', { uri: this.uri });
      }

      // Check if table exists
      const tableNames = await this.db.tableNames();
      if (tableNames.includes(this.tableName)) {
        this.table = await this.db.openTable(this.tableName);
        logger.info('Table opened', { table: this.tableName });
        return;
      }

      // Need dimension to create new table
      if (!dim) {
        logger.warn('No dimension provided, skipping table creation');
        return;
      }

      // Create table with initial dummy record (LanceDB requires data to create table)
      const dummyRecord: LanceDBRecord = {
        chunk_hash: '__dummy__',
        embedding: new Array(dim).fill(0),
        content: '',
        source: '',
        heading: '',
        heading_level: 0,
        start_line: 0,
        end_line: 0,
        memory_type: '',
        node_type: '',
        label: '',
        importance: 0,
        memory_data: '',
        relations: '',
        created_at: 0,
        updated_at: 0,
        access_count: 0,
      };

      this.table = await this.db.createTable(
        this.tableName,
        [dummyRecord] as unknown as Record<string, unknown>[],
        { mode: 'overwrite' }
      );

      // Remove the dummy record
      await this.table.delete("chunk_hash = '__dummy__'");
      logger.info('Table created', { table: this.tableName, dimension: dim });
    } catch (error) {
      throw new MemSearchError(
        `Failed to ensure collection: ${(error as Error).message}`,
        'LANCEDB_ENSURE_COLLECTION_FAILED',
        error
      );
    }
  }

  /**
   * Close the connection and cleanup resources
   */
  close(): void {
    // LanceDB doesn't have an explicit close method
    // Setting references to null is sufficient for garbage collection
    this.table = null;
    this.db = null;
    logger.info('Connection closed');
  }

  /**
   * Reset the store by dropping the table
   */
  async reset(): Promise<void> {
    try {
      if (!this.db) {
        this.db = await lancedb.connect(this.uri);
      }

      const tableNames = await this.db.tableNames();
      if (tableNames.includes(this.tableName)) {
        await this.db.dropTable(this.tableName);
        logger.info('Table dropped', { table: this.tableName });
      }

      this.table = null;
    } catch (error) {
      throw new MemSearchError(
        `Failed to reset store: ${(error as Error).message}`,
        'LANCEDB_RESET_FAILED',
        error
      );
    }
  }

  /**
   * Insert or update records in the store
   */
  async upsert(records: VectorRecord[]): Promise<number> {
    if (!records.length) return 0;

    try {
      if (!this.table) {
        throw new MemSearchError(
          'Table not initialized. Call ensureCollection() first.',
          'LANCEDB_TABLE_NOT_INITIALIZED'
        );
      }

      // Convert VectorRecord to LanceDBRecord
      const lancedbRecords: LanceDBRecord[] = records.map((r) => ({
        chunk_hash: r.chunk_hash,
        embedding: r.embedding,
        content: r.content,
        source: r.source,
        heading: r.heading,
        heading_level: r.heading_level,
        start_line: r.start_line,
        end_line: r.end_line,
        memory_type: r.memory_type,
        node_type: r.node_type,
        label: r.label,
        importance: r.importance,
        memory_data: r.memory_data,
        relations: r.relations,
        created_at: r.created_at,
        updated_at: r.updated_at,
        access_count: r.access_count,
      }));

      // Use mergeInsert for upsert behavior (update if exists, insert if not)
      // LanceDB mergeInsert requires a key field - we use chunk_hash
      await this.table
        .mergeInsert('chunk_hash')
        .whenMatchedUpdateAll()
        .whenNotMatchedInsertAll()
        .execute(lancedbRecords as unknown as Record<string, unknown>[]);

      logger.info('Upsert completed', { count: records.length });
      return records.length;
    } catch (error) {
      throw new MemSearchError(
        `Upsert failed: ${(error as Error).message}`,
        'LANCEDB_UPSERT_FAILED',
        error
      );
    }
  }

  /**
   * Delete records matching a filter expression
   */
  async delete(filter: string): Promise<void> {
    try {
      if (!this.table) {
        throw new MemSearchError(
          'Table not initialized. Call ensureCollection() first.',
          'LANCEDB_TABLE_NOT_INITIALIZED'
        );
      }

      // Convert Milvus filter syntax to LanceDB syntax
      const lancedbFilter = convertFilter(filter);
      await this.table.delete(lancedbFilter);
      logger.info('Deleted by filter', { filter: lancedbFilter });
    } catch (error) {
      throw new MemSearchError(
        `Delete failed: ${(error as Error).message}`,
        'LANCEDB_DELETE_FAILED',
        error
      );
    }
  }

  /**
   * Delete records by their IDs (chunk hashes)
   */
  async deleteByIds(ids: string[]): Promise<void> {
    if (!ids.length) return;

    try {
      if (!this.table) {
        throw new MemSearchError(
          'Table not initialized. Call ensureCollection() first.',
          'LANCEDB_TABLE_NOT_INITIALIZED'
        );
      }

      const filter = `chunk_hash IN (${ids.map((id) => `'${id}'`).join(', ')})`;
      await this.table.delete(filter);
      logger.info('Deleted by IDs', { count: ids.length });
    } catch (error) {
      throw new MemSearchError(
        `Delete by IDs failed: ${(error as Error).message}`,
        'LANCEDB_DELETE_FAILED',
        error
      );
    }
  }

  /**
   * Search for similar vectors
   */
  async search(vector: number[], options?: SearchOptions): Promise<SearchResult[]> {
    try {
      if (!this.table) {
        throw new MemSearchError(
          'Table not initialized. Call ensureCollection() first.',
          'LANCEDB_TABLE_NOT_INITIALIZED'
        );
      }

      const topK = options?.topK ?? 10;

      // Build vector search query
      let query = this.table.vectorSearch(vector).limit(topK);

      // Apply filter if provided
      if (options?.filter) {
        query = query.where(convertFilter(options.filter)) as typeof query;
      }

      const results = await query.toArray();

      // Map to SearchResult format
      return results.map((r: LanceDBRecord & { _distance?: number }) => ({
        content: r.content,
        source: r.source,
        heading: r.heading,
        score: r._distance ?? 0,
        startLine: r.start_line,
        endLine: r.end_line,
      }));
    } catch (error) {
      throw new MemSearchError(
        `Search failed: ${(error as Error).message}`,
        'LANCEDB_SEARCH_FAILED',
        error
      );
    }
  }

  /**
   * Search with filter expression
   */
  async searchWithFilter(
    vector: number[],
    filter?: string,
    topK = 10
  ): Promise<ExtendedSearchResult[]> {
    try {
      if (!this.table) {
        throw new MemSearchError(
          'Table not initialized. Call ensureCollection() first.',
          'LANCEDB_TABLE_NOT_INITIALIZED'
        );
      }

      // Build vector search query
      let query = this.table.vectorSearch(vector).limit(topK);

      // Apply filter if provided
      if (filter) {
        query = query.where(convertFilter(filter)) as typeof query;
      }

      const results = await query.toArray();

      // Map to ExtendedSearchResult format
      return results.map(
        (r: LanceDBRecord & { _distance?: number }) =>
          ({
            chunk_hash: r.chunk_hash,
            content: r.content,
            source: r.source,
            heading: r.heading,
            memory_type: r.memory_type,
            node_type: r.node_type,
            label: r.label,
            importance: r.importance,
            memory_data: r.memory_data,
            relations: r.relations,
            created_at: r.created_at,
            updated_at: r.updated_at,
            access_count: r.access_count,
            score: r._distance ?? 0,
          }) as ExtendedSearchResult
      );
    } catch (error) {
      throw new MemSearchError(
        `Search with filter failed: ${(error as Error).message}`,
        'LANCEDB_SEARCH_FAILED',
        error
      );
    }
  }

  /**
   * Query records by filter expression
   */
  async query(filter: string, limit = 1000): Promise<VectorRecord[]> {
    try {
      if (!this.table) {
        throw new MemSearchError(
          'Table not initialized. Call ensureCollection() first.',
          'LANCEDB_TABLE_NOT_INITIALIZED'
        );
      }

      const results = await this.table.query().where(convertFilter(filter)).limit(limit).toArray();

      // Map to VectorRecord format (convert null to undefined)
      return results.map((r: LanceDBRecord) => ({
        chunk_hash: r.chunk_hash,
        embedding: r.embedding,
        content: r.content,
        source: r.source,
        heading: r.heading,
        heading_level: r.heading_level,
        start_line: r.start_line,
        end_line: r.end_line,
        memory_type: r.memory_type ?? undefined,
        node_type: r.node_type ?? undefined,
        label: r.label ?? undefined,
        importance: r.importance ?? undefined,
        memory_data: r.memory_data ?? undefined,
        relations: r.relations ?? undefined,
        created_at: r.created_at ?? undefined,
        updated_at: r.updated_at ?? undefined,
        access_count: r.access_count ?? undefined,
      }));
    } catch (error) {
      throw new MemSearchError(
        `Query failed: ${(error as Error).message}`,
        'LANCEDB_QUERY_FAILED',
        error
      );
    }
  }

  /**
   * Get total count of records in the store
   */
  async count(): Promise<number> {
    try {
      if (!this.table) {
        return 0;
      }
      return await this.table.countRows();
    } catch {
      return 0;
    }
  }

  /**
   * Get all unique sources in the store
   */
  async getSources(): Promise<Set<string>> {
    try {
      if (!this.table) {
        return new Set();
      }

      const results = await this.table.query().select(['source']).limit(10000).toArray();

      const sources = new Set<string>();
      for (const r of results) {
        sources.add(r.source);
      }
      return sources;
    } catch {
      return new Set();
    }
  }

  /**
   * Get all record IDs for a given source
   */
  async getIdsBySource(source: string): Promise<Set<string>> {
    try {
      if (!this.table) {
        return new Set();
      }

      const results = await this.table
        .query()
        .where(`source = '${source}'`)
        .select(['chunk_hash'])
        .limit(10000)
        .toArray();

      const ids = new Set<string>();
      for (const r of results) {
        ids.add(r.chunk_hash);
      }
      return ids;
    } catch {
      return new Set();
    }
  }

  async deleteBySource(source: string): Promise<void> {
    return this.delete(`source = '${source}'`);
  }

  async deleteByHashes(hashes: string[]): Promise<void> {
    return this.deleteByIds(hashes);
  }

  async indexedSources(): Promise<Set<string>> {
    return this.getSources();
  }

  async hashesBySource(source: string): Promise<Set<string>> {
    return this.getIdsBySource(source);
  }
}
