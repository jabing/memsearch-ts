/** Milvus vector storage layer */
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';
import type { SearchResult } from './types/index.js';
import { MilvusError, MilvusErrorCodes } from './types/errors.js';
import { createLogger } from './utils/logger.js';
import { resolvePath } from './types/config.js';

const logger = createLogger('store');

export interface MilvusStoreOptions { uri: string; token?: string; collection: string; dimension?: number; }
export interface MilvusRecord { chunk_hash: string; embedding: number[]; content: string; source: string; heading: string; heading_level: number; start_line: number; end_line: number; }

export class MilvusStore {
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

  async ensureCollection(): Promise<void> {
    try {
      const has = await this.client.hasCollection({ collection_name: this.collection });
      if (has.value) { logger.info('Collection exists'); return; }
      if (!this.dimension) { logger.warn('No dimension, skipping'); return; }
      
      await this.client.createCollection({
        collection_name: this.collection,
        schema: [
          { name: 'chunk_hash', data_type: DataType.VarChar, is_primary_key: true, max_length: 64 },
          { name: 'embedding', data_type: DataType.FloatVector, dim: this.dimension },
          { name: 'content', data_type: DataType.VarChar, max_length: 65535, enable_analyzer: true },
          { name: 'sparse_vector', data_type: DataType.SparseFloatVector },
          { name: 'source', data_type: DataType.VarChar, max_length: 1024 },
          { name: 'heading', data_type: DataType.VarChar, max_length: 1024 },
          { name: 'heading_level', data_type: DataType.Int64 },
          { name: 'start_line', data_type: DataType.Int64 },
          { name: 'end_line', data_type: DataType.Int64 },
        ] as any,
        index_params: [
          { field_name: 'embedding', index_type: 'FLAT', metric_type: 'COSINE' },
          { field_name: 'sparse_vector', index_type: 'SPARSE_INVERTED_INDEX', metric_type: 'BM25' },
        ] as any,
      } as any);
      logger.info('Collection created');
    } catch (error) {
      throw new MilvusError(`Failed to ensure collection: ${(error as Error).message}`, 'CONNECTION_FAILED', error);
    }
  }

  async upsert(records: MilvusRecord[]): Promise<number> {
    if (!records.length) return 0;
    try {
      const result = await this.client.insert({ collection_name: this.collection, data: records as any });
      logger.info('Upsert completed', { count: result.insert_cnt });
      return Number(result.insert_cnt) || records.length;
    } catch (error) {
      throw new MilvusError(`Upsert failed: ${(error as Error).message}`, 'UPSERT_FAILED', error);
    }
  }

  async search(vector: number[], _queryText?: string, topK = 10): Promise<SearchResult[]> {
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

  async query(filterExpr: string, limit = 1000): Promise<any[]> {
    try {
      const result = await this.client.query({ collection_name: this.collection, filter: filterExpr, limit } as any);
      return result.data || [];
    } catch (error) {
      throw new MilvusError(`Query failed: ${(error as Error).message}`, 'QUERY_FAILED', error);
    }
  }

  async deleteBySource(source: string): Promise<void> {
    try {
      await this.client.delete({ collection_name: this.collection, filter: `source == "${source}"` } as any);
      logger.info('Deleted by source', { source });
    } catch (error) {
      throw new MilvusError(`Delete failed: ${(error as Error).message}`, 'DELETE_FAILED', error);
    }
  }

  async deleteByHashes(hashes: string[]): Promise<void> {
    if (!hashes.length) return;
    try {
      const filter = `chunk_hash in [${hashes.map(h => `"${h}"`).join(',')}]`;
      await this.client.delete({ collection_name: this.collection, filter } as any);
      logger.info('Deleted by hashes', { count: hashes.length });
    } catch (error) {
      throw new MilvusError(`Delete failed: ${(error as Error).message}`, 'DELETE_FAILED', error);
    }
  }

  async indexedSources(): Promise<Set<string>> {
    try {
      const result = await this.client.query({ collection_name: this.collection, output_fields: ['source'], limit: 10000 } as any);
      const sources = new Set<string>();
      (result.data || []).forEach((r: any) => sources.add(r.source));
      return sources;
    } catch { return new Set(); }
  }

  async hashesBySource(source: string): Promise<Set<string>> {
    try {
      const result = await this.client.query({ collection_name: this.collection, filter: `source == "${source}"`, output_fields: ['chunk_hash'] } as any);
      const hashes = new Set<string>();
      (result.data || []).forEach((r: any) => hashes.add(r.chunk_hash));
      return hashes;
    } catch { return new Set(); }
  }

  async count(): Promise<number> {
    try {
      const result = await this.client.query({ collection_name: this.collection, output_fields: ['count(*)'] } as any);
      return Number(result.data?.[0]?.['count(*)'] ?? 0);
    } catch { return 0; }
  }

  close(): void { logger.info('Connection closed'); }

  async reset(): Promise<void> {
    try {
      await this.client.dropCollection({ collection_name: this.collection } as any);
      logger.info('Collection dropped');
    } catch (error) {
      throw new MilvusError(`Reset failed: ${(error as Error).message}`, 'CONNECTION_FAILED', error);
    }
  }
}

/** RRF (Reciprocal Rank Fusion) - Combine dense and sparse results */
export function combineResultsByRRF(dense: SearchResult[], sparse: SearchResult[], k = 60): SearchResult[] {
  const scoreMap = new Map<string, { result: SearchResult; score: number }>();
  dense.forEach((r, i) => scoreMap.set(`${r.source}:${r.startLine}`, { result: r, score: 1 / (k + i + 1) }));
  sparse.forEach((r, i) => {
    const key = `${r.source}:${r.startLine}`;
    const existing = scoreMap.get(key);
    if (existing) existing.score += 1 / (k + i + 1);
    else scoreMap.set(key, { result: r, score: 1 / (k + i + 1) });
  });
  return Array.from(scoreMap.values()).sort((a, b) => b.score - a.score).map(x => x.result);
}
