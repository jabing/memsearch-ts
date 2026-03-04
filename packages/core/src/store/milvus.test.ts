/**
 * Unit tests for MilvusStore
 *
 * Tests all public methods with mocked MilvusClient
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MilvusStore, MilvusStoreOptions, MilvusRecord } from './index.js';
import { MilvusError } from '../types/errors.js';

// Mock data store for testing
let mockRecords: Map<string, any> = new Map();

// Mock MilvusClient
const mockClient = {
  hasCollection: vi.fn(),
  createCollection: vi.fn(),
  insert: vi.fn(),
  search: vi.fn(),
  query: vi.fn(),
  delete: vi.fn(),
  dropCollection: vi.fn(),
};

vi.mock('@zilliz/milvus2-sdk-node', () => ({
  MilvusClient: vi.fn().mockImplementation(() => mockClient),
  DataType: {
    VarChar: 'VarChar',
    FloatVector: 'FloatVector',
    SparseFloatVector: 'SparseFloatVector',
    Int64: 'Int64',
    Float: 'Float',
  },
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock resolvePath
vi.mock('../types/config.js', () => ({
  resolvePath: (path: string) => path,
}));

describe('MilvusStore', () => {
  let store: MilvusStore;
  const defaultOptions: MilvusStoreOptions = {
    uri: 'http://localhost:19530',
    collection: 'test_collection',
    dimension: 128,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRecords.clear();

    // Reset mock implementations
    mockClient.hasCollection.mockResolvedValue({ value: false });
    mockClient.createCollection.mockResolvedValue(undefined);
    mockClient.insert.mockImplementation((params: any) => {
      const records = params.data || [];
      records.forEach((r: any) => mockRecords.set(r.chunk_hash, r));
      return Promise.resolve({ insert_cnt: records.length });
    });
    mockClient.search.mockImplementation((params: any) => {
      const results = Array.from(mockRecords.values()).map((r: any) => ({
        entity: {
          content: r.content,
          source: r.source,
          heading: r.heading,
          heading_level: r.heading_level,
          start_line: r.start_line,
          end_line: r.end_line,
          chunk_hash: r.chunk_hash,
          memory_type: r.memory_type,
          node_type: r.node_type,
          label: r.label,
          importance: r.importance,
          memory_data: r.memory_data,
          relations: r.relations,
          created_at: r.created_at,
          updated_at: r.updated_at,
          access_count: r.access_count,
        },
        score: 0.9,
      }));
      return Promise.resolve({ results });
    });
    mockClient.query.mockImplementation((params: any) => {
      // Handle count query
      if (params?.output_fields?.includes('count(*)')) {
        return Promise.resolve({ data: [{ 'count(*)': mockRecords.size }] });
      }
      // Handle source listing
      if (params?.output_fields?.includes('source') && !params?.filter) {
        return Promise.resolve({ data: Array.from(mockRecords.values()) });
      }
      // Handle chunk_hash query
      if (params?.filter && params?.output_fields?.includes('chunk_hash')) {
        return Promise.resolve({ data: Array.from(mockRecords.values()) });
      }
      return Promise.resolve({ data: Array.from(mockRecords.values()) });
    });
    mockClient.delete.mockResolvedValue({ delete_cnt: 1 });
    mockClient.dropCollection.mockResolvedValue(undefined);

    store = new MilvusStore(defaultOptions);
  });

  afterEach(() => {
    vi.resetModules();
  });

  // ===========================================
  // Constructor Tests
  // ===========================================
  describe('constructor', () => {
    it('should create store with required options', () => {
      const store = new MilvusStore({
        uri: 'http://localhost:19530',
        collection: 'my_collection',
      });
      expect(store).toBeInstanceOf(MilvusStore);
    });

    it('should create store with optional dimension', () => {
      const store = new MilvusStore({
        uri: 'http://localhost:19530',
        collection: 'my_collection',
        dimension: 256,
      });
      expect(store).toBeInstanceOf(MilvusStore);
    });

    it('should create store with token option', () => {
      const store = new MilvusStore({
        uri: 'http://localhost:19530',
        collection: 'my_collection',
        token: 'my-token',
      });
      expect(store).toBeInstanceOf(MilvusStore);
    });
  });

  // ===========================================
  // ensureCollection Tests
  // ===========================================
  describe('ensureCollection', () => {
    it('should not create collection if it already exists', async () => {
      mockClient.hasCollection.mockResolvedValue({ value: true });

      await store.ensureCollection();

      expect(mockClient.hasCollection).toHaveBeenCalledWith({
        collection_name: 'test_collection',
      });
      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });

    it('should create collection when it does not exist and dimension is provided', async () => {
      mockClient.hasCollection.mockResolvedValue({ value: false });

      await store.ensureCollection();

      expect(mockClient.hasCollection).toHaveBeenCalledWith({
        collection_name: 'test_collection',
      });
      expect(mockClient.createCollection).toHaveBeenCalled();

      const createParams = mockClient.createCollection.mock.calls[0][0];
      expect(createParams.collection_name).toBe('test_collection');
      expect(createParams.schema).toBeDefined();
      expect(createParams.index_params).toBeDefined();
    });

    it('should not create collection when dimension is not provided', async () => {
      const storeWithoutDimension = new MilvusStore({
        uri: 'http://localhost:19530',
        collection: 'test_collection',
      });
      mockClient.hasCollection.mockResolvedValue({ value: false });

      await storeWithoutDimension.ensureCollection();

      expect(mockClient.hasCollection).toHaveBeenCalled();
      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });

    it('should throw MilvusError on hasCollection failure', async () => {
      mockClient.hasCollection.mockRejectedValue(new Error('Connection failed'));

      await expect(store.ensureCollection()).rejects.toThrow(MilvusError);
      await expect(store.ensureCollection()).rejects.toMatchObject({
        code: 'CONNECTION_FAILED',
      });
    });

    it('should throw MilvusError on createCollection failure', async () => {
      mockClient.hasCollection.mockResolvedValue({ value: false });
      mockClient.createCollection.mockRejectedValue(new Error('Create failed'));

      await expect(store.ensureCollection()).rejects.toThrow(MilvusError);
      await expect(store.ensureCollection()).rejects.toMatchObject({
        code: 'CONNECTION_FAILED',
      });
    });
  });

  // ===========================================
  // upsert Tests
  // ===========================================
  describe('upsert', () => {
    it('should return 0 for empty records array', async () => {
      const result = await store.upsert([]);
      expect(result).toBe(0);
      expect(mockClient.insert).not.toHaveBeenCalled();
    });

    it('should insert records and return count', async () => {
      const records: MilvusRecord[] = [
        {
          chunk_hash: 'hash1',
          embedding: [0.1, 0.2, 0.3],
          content: 'Test content 1',
          source: 'test.md',
          heading: 'Test Heading',
          heading_level: 1,
          start_line: 1,
          end_line: 5,
        },
        {
          chunk_hash: 'hash2',
          embedding: [0.4, 0.5, 0.6],
          content: 'Test content 2',
          source: 'test.md',
          heading: 'Test Heading',
          heading_level: 1,
          start_line: 6,
          end_line: 10,
        },
      ];

      const result = await store.upsert(records);

      expect(result).toBe(2);
      expect(mockClient.insert).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        data: records,
      });
    });

    it('should handle triple memory fields', async () => {
      const record: MilvusRecord = {
        chunk_hash: 'hash1',
        embedding: [0.1, 0.2],
        content: 'Memory content',
        source: 'memory.md',
        heading: 'Memory',
        heading_level: 1,
        start_line: 1,
        end_line: 5,
        memory_type: 'semantic',
        node_type: 'concept',
        label: 'Redis',
        importance: 0.8,
        memory_data: '{"key": "value"}',
        relations: '[]',
        created_at: 1000,
        updated_at: 2000,
        access_count: 5,
      };

      const result = await store.upsert([record]);

      expect(result).toBe(1);
    });

    it('should throw MilvusError on insert failure', async () => {
      mockClient.insert.mockRejectedValue(new Error('Insert failed'));

      const records: MilvusRecord[] = [
        {
          chunk_hash: 'hash1',
          embedding: [0.1],
          content: 'Test',
          source: 'test.md',
          heading: 'Test',
          heading_level: 1,
          start_line: 1,
          end_line: 1,
        },
      ];

      await expect(store.upsert(records)).rejects.toThrow(MilvusError);
      await expect(store.upsert(records)).rejects.toMatchObject({
        code: 'UPSERT_FAILED',
      });
    });
  });

  // ===========================================
  // search Tests
  // ===========================================
  describe('search', () => {
    beforeEach(() => {
      // Add some test records
      mockRecords.set('hash1', {
        chunk_hash: 'hash1',
        content: 'Redis caching content',
        source: 'cache.md',
        heading: 'Redis Cache',
        heading_level: 1,
        start_line: 1,
        end_line: 10,
      });
      mockRecords.set('hash2', {
        chunk_hash: 'hash2',
        content: 'Database content',
        source: 'db.md',
        heading: 'Database',
        heading_level: 1,
        start_line: 1,
        end_line: 10,
      });
    });

    it('should return search results', async () => {
      const vector = [0.1, 0.2, 0.3];
      const results = await store.search(vector);

      expect(mockClient.search).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        data: [vector],
        limit: 10,
        output_fields: ['content', 'source', 'heading', 'heading_level', 'start_line', 'end_line'],
      });
      expect(results.length).toBe(2);
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('source');
      expect(results[0]).toHaveProperty('heading');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('startLine');
      expect(results[0]).toHaveProperty('endLine');
    });

    it('should accept custom topK', async () => {
      const vector = [0.1, 0.2, 0.3];
      await store.search(vector, { topK: 5 });

      expect(mockClient.search).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
    });

    it('should handle empty results', async () => {
      mockRecords.clear();
      mockClient.search.mockResolvedValue({ results: [] });

      const results = await store.search([0.1, 0.2]);

      expect(results).toEqual([]);
    });

    it('should handle null results', async () => {
      mockClient.search.mockResolvedValue({ results: null });

      const results = await store.search([0.1, 0.2]);

      expect(results).toEqual([]);
    });

    it('should throw MilvusError on search failure', async () => {
      mockClient.search.mockRejectedValue(new Error('Search failed'));

      await expect(store.search([0.1, 0.2])).rejects.toThrow(MilvusError);
      await expect(store.search([0.1, 0.2])).rejects.toMatchObject({
        code: 'SEARCH_FAILED',
      });
    });
  });

  // ===========================================
  // searchWithFilter Tests
  // ===========================================
  describe('searchWithFilter', () => {
    beforeEach(() => {
      mockRecords.set('hash1', {
        chunk_hash: 'hash1',
        content: 'Semantic memory',
        source: 'memory.md',
        heading: 'Memory',
        memory_type: 'semantic',
        node_type: 'concept',
        label: 'Redis',
        importance: 0.8,
      });
    });

    it('should return extended search results with all fields', async () => {
      const vector = [0.1, 0.2, 0.3];
      const results = await store.searchWithFilter(vector);

      expect(mockClient.search).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        data: [vector],
        limit: 10,
        filter: undefined,
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
      });
      expect(results.length).toBe(1);
      expect(results[0]).toHaveProperty('chunk_hash');
      expect(results[0]).toHaveProperty('memory_type');
      expect(results[0]).toHaveProperty('node_type');
      expect(results[0]).toHaveProperty('label');
      expect(results[0]).toHaveProperty('importance');
      expect(results[0]).toHaveProperty('score');
    });

    it('should apply filter expression', async () => {
      const vector = [0.1, 0.2, 0.3];
      const filter = 'memory_type == "semantic"';

      await store.searchWithFilter(vector, filter, 5);

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          filter,
          limit: 5,
        })
      );
    });

    it('should throw MilvusError on search failure', async () => {
      mockClient.search.mockRejectedValue(new Error('Search failed'));

      await expect(store.searchWithFilter([0.1])).rejects.toThrow(MilvusError);
      await expect(store.searchWithFilter([0.1])).rejects.toMatchObject({
        code: 'SEARCH_FAILED',
      });
    });
  });

  // ===========================================
  // query Tests
  // ===========================================
  describe('query', () => {
    beforeEach(() => {
      mockRecords.set('hash1', {
        chunk_hash: 'hash1',
        content: 'Content 1',
        source: 'file1.md',
      });
      mockRecords.set('hash2', {
        chunk_hash: 'hash2',
        content: 'Content 2',
        source: 'file2.md',
      });
    });

    it('should query records with filter', async () => {
      const filter = 'source == "file1.md"';
      const results = await store.query(filter);

      expect(mockClient.query).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        filter,
        limit: 1000,
      });
      expect(results.length).toBe(2);
    });

    it('should accept custom limit', async () => {
      await store.query('source == "test.md"', 100);

      expect(mockClient.query).toHaveBeenCalledWith(expect.objectContaining({ limit: 100 }));
    });

    it('should return empty array on no results', async () => {
      mockClient.query.mockResolvedValue({ data: null });

      const results = await store.query('source == "nonexistent.md"');

      expect(results).toEqual([]);
    });

    it('should throw MilvusError on query failure', async () => {
      mockClient.query.mockRejectedValue(new Error('Query failed'));

      await expect(store.query('invalid filter')).rejects.toThrow(MilvusError);
      await expect(store.query('invalid filter')).rejects.toMatchObject({
        code: 'QUERY_FAILED',
      });
    });
  });

  // ===========================================
  // deleteBySource Tests
  // ===========================================
  describe('deleteBySource', () => {
    it('should delete records by source', async () => {
      await store.deleteBySource('test.md');

      expect(mockClient.delete).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        filter: 'source == "test.md"',
      });
    });

    it('should throw MilvusError on delete failure', async () => {
      mockClient.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(store.deleteBySource('test.md')).rejects.toThrow(MilvusError);
      await expect(store.deleteBySource('test.md')).rejects.toMatchObject({
        code: 'DELETE_FAILED',
      });
    });
  });

  // ===========================================
  // deleteByHashes Tests
  // ===========================================
  describe('deleteByHashes', () => {
    it('should return immediately for empty hashes array', async () => {
      await store.deleteByHashes([]);

      expect(mockClient.delete).not.toHaveBeenCalled();
    });

    it('should delete records by hashes', async () => {
      await store.deleteByHashes(['hash1', 'hash2', 'hash3']);

      expect(mockClient.delete).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        filter: 'chunk_hash in ["hash1","hash2","hash3"]',
      });
    });

    it('should handle single hash', async () => {
      await store.deleteByHashes(['single_hash']);

      expect(mockClient.delete).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        filter: 'chunk_hash in ["single_hash"]',
      });
    });

    it('should throw MilvusError on delete failure', async () => {
      mockClient.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(store.deleteByHashes(['hash1'])).rejects.toThrow(MilvusError);
      await expect(store.deleteByHashes(['hash1'])).rejects.toMatchObject({
        code: 'DELETE_FAILED',
      });
    });
  });

  // ===========================================
  // count Tests
  // ===========================================
  describe('count', () => {
    it('should return count of records', async () => {
      mockRecords.set('hash1', {});
      mockRecords.set('hash2', {});

      const result = await store.count();

      expect(mockClient.query).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        output_fields: ['count(*)'],
      });
      expect(result).toBe(2);
    });

    it('should return 0 for empty collection', async () => {
      mockClient.query.mockResolvedValue({ data: [{ 'count(*)': 0 }] });

      const result = await store.count();

      expect(result).toBe(0);
    });

    it('should return 0 on query error', async () => {
      mockClient.query.mockRejectedValue(new Error('Query failed'));

      const result = await store.count();

      expect(result).toBe(0);
    });

    it('should handle null data response', async () => {
      mockClient.query.mockResolvedValue({ data: null });

      const result = await store.count();

      expect(result).toBe(0);
    });

    it('should handle missing count field', async () => {
      mockClient.query.mockResolvedValue({ data: [{}] });

      const result = await store.count();

      expect(result).toBe(0);
    });
  });

  // ===========================================
  // indexedSources Tests
  // ===========================================
  describe('indexedSources', () => {
    it('should return set of unique sources', async () => {
      mockRecords.set('hash1', { source: 'file1.md' });
      mockRecords.set('hash2', { source: 'file2.md' });
      mockRecords.set('hash3', { source: 'file1.md' }); // duplicate

      const sources = await store.indexedSources();

      expect(mockClient.query).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        output_fields: ['source'],
        limit: 10000,
      });
      expect(sources).toBeInstanceOf(Set);
      expect(sources.size).toBe(2);
      expect(sources.has('file1.md')).toBe(true);
      expect(sources.has('file2.md')).toBe(true);
    });

    it('should return empty set on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Query failed'));

      const sources = await store.indexedSources();

      expect(sources).toBeInstanceOf(Set);
      expect(sources.size).toBe(0);
    });

    it('should handle null data response', async () => {
      mockClient.query.mockResolvedValue({ data: null });

      const sources = await store.indexedSources();

      expect(sources).toBeInstanceOf(Set);
      expect(sources.size).toBe(0);
    });
  });

  // ===========================================
  // hashesBySource Tests
  // ===========================================
  describe('hashesBySource', () => {
    it('should return set of hashes for source', async () => {
      mockRecords.set('hash1', { chunk_hash: 'hash1', source: 'test.md' });
      mockRecords.set('hash2', { chunk_hash: 'hash2', source: 'test.md' });

      const hashes = await store.hashesBySource('test.md');

      expect(mockClient.query).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        filter: 'source == "test.md"',
        output_fields: ['chunk_hash'],
      });
      expect(hashes).toBeInstanceOf(Set);
      expect(hashes.size).toBe(2);
      expect(hashes.has('hash1')).toBe(true);
      expect(hashes.has('hash2')).toBe(true);
    });

    it('should return empty set on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Query failed'));

      const hashes = await store.hashesBySource('test.md');

      expect(hashes).toBeInstanceOf(Set);
      expect(hashes.size).toBe(0);
    });

    it('should handle null data response', async () => {
      mockClient.query.mockResolvedValue({ data: null });

      const hashes = await store.hashesBySource('test.md');

      expect(hashes).toBeInstanceOf(Set);
      expect(hashes.size).toBe(0);
    });
  });

  // ===========================================
  // close Tests
  // ===========================================
  describe('close', () => {
    it('should call close without error', () => {
      expect(() => store.close()).not.toThrow();
    });
  });

  // ===========================================
  // reset Tests
  // ===========================================
  describe('reset', () => {
    it('should drop the collection', async () => {
      await store.reset();

      expect(mockClient.dropCollection).toHaveBeenCalledWith({
        collection_name: 'test_collection',
      });
    });

    it('should throw MilvusError on drop failure', async () => {
      mockClient.dropCollection.mockRejectedValue(new Error('Drop failed'));

      await expect(store.reset()).rejects.toThrow(MilvusError);
      await expect(store.reset()).rejects.toMatchObject({
        code: 'CONNECTION_FAILED',
      });
    });
  });
});
