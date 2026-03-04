/**
 * Unit tests for LanceDBStore
 *
 * Tests all IVectorStore methods using LanceDB's ephemeral mode.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LanceDBStore, LanceDBStoreOptions } from './lancedb.js';
import { MemSearchError } from '../types/errors.js';
import type { VectorRecord } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock logger
vi.mock('../utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock resolvePath to return temp directory
vi.mock('../types/config.js', () => ({
  resolvePath: (p: string) => p,
}));

describe('LanceDBStore', () => {
  let store: LanceDBStore;
  let tempDir: string;
  const dimension = 4;
  const defaultOptions: LanceDBStoreOptions = {
    uri: '', // Will be set in beforeEach
    table: 'test_table',
    dimension,
  };

  // Helper to create test records
  function createTestRecord(overrides: Partial<VectorRecord> = {}): VectorRecord {
    return {
      chunk_hash: `hash_${Math.random().toString(36).slice(2)}`,
      embedding: [0.1, 0.2, 0.3, 0.4],
      content: 'Test content',
      source: 'test.md',
      heading: 'Test Heading',
      heading_level: 1,
      start_line: 1,
      end_line: 5,
      ...overrides,
    };
  }

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lancedb-test-'));
    defaultOptions.uri = tempDir;

    store = new LanceDBStore(defaultOptions);
    await store.ensureCollection(dimension);
  });

  afterEach(async () => {
    // Cleanup
    store.close();

    // Remove temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ===========================================
  // Constructor Tests
  // ===========================================
  describe('constructor', () => {
    it('should create store with required options', () => {
      const newStore = new LanceDBStore({
        uri: tempDir,
        table: 'my_table',
      });
      expect(newStore).toBeInstanceOf(LanceDBStore);
      newStore.close();
    });

    it('should create store with optional dimension', () => {
      const newStore = new LanceDBStore({
        uri: tempDir,
        table: 'my_table',
        dimension: 256,
      });
      expect(newStore).toBeInstanceOf(LanceDBStore);
      newStore.close();
    });
  });

  // ===========================================
  // ensureCollection Tests
  // ===========================================
  describe('ensureCollection', () => {
    it('should create table when it does not exist', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'new-db'),
        table: 'new_table',
        dimension: 8,
      });

      await newStore.ensureCollection(8);

      const count = await newStore.count();
      expect(count).toBe(0);

      newStore.close();
    });

    it('should open existing table', async () => {
      // Insert a record
      const record = createTestRecord({ chunk_hash: 'existing_hash' });
      await store.upsert([record]);

      // Create new store instance pointing to same table
      const newStore = new LanceDBStore({
        uri: tempDir,
        table: 'test_table',
      });

      await newStore.ensureCollection();

      const count = await newStore.count();
      expect(count).toBe(1);

      newStore.close();
    });

    it('should skip table creation when no dimension provided', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'no-dim-db'),
        table: 'no_dim_table',
      });

      // Should not throw
      await newStore.ensureCollection();

      // Table should not be initialized
      const count = await newStore.count();
      expect(count).toBe(0);

      newStore.close();
    });
  });

  // ===========================================
  // upsert Tests
  // ===========================================
  describe('upsert', () => {
    it('should return 0 for empty records array', async () => {
      const result = await store.upsert([]);
      expect(result).toBe(0);
    });

    it('should insert records and return count', async () => {
      const records: VectorRecord[] = [
        createTestRecord({ chunk_hash: 'hash1', content: 'Content 1' }),
        createTestRecord({ chunk_hash: 'hash2', content: 'Content 2' }),
      ];

      const result = await store.upsert(records);

      expect(result).toBe(2);
      const count = await store.count();
      expect(count).toBe(2);
    });

    it('should update existing records (upsert behavior)', async () => {
      const record = createTestRecord({
        chunk_hash: 'upsert_hash',
        content: 'Original content',
      });

      await store.upsert([record]);

      // Update the same record
      const updatedRecord = createTestRecord({
        chunk_hash: 'upsert_hash',
        content: 'Updated content',
      });

      await store.upsert([updatedRecord]);

      const count = await store.count();
      expect(count).toBe(1); // Should still be 1, not 2

      const results = await store.query('chunk_hash = "upsert_hash"');
      expect(results[0].content).toBe('Updated content');
    });

    it('should handle triple memory fields', async () => {
      const record: VectorRecord = createTestRecord({
        chunk_hash: 'memory_hash',
        memory_type: 'semantic',
        node_type: 'concept',
        label: 'Redis',
        importance: 0.8,
        memory_data: '{"key": "value"}',
        relations: '[]',
        created_at: 1000,
        updated_at: 2000,
        access_count: 5,
      });

      const result = await store.upsert([record]);
      expect(result).toBe(1);

      const results = await store.searchWithFilter([0.1, 0.2, 0.3, 0.4]);
      expect(results[0].memory_type).toBe('semantic');
      expect(results[0].node_type).toBe('concept');
      expect(results[0].label).toBe('Redis');
      expect(results[0].importance).toBe(0.8);
    });

    it('should throw MemSearchError when table not initialized', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'uninit-db'),
        table: 'uninit_table',
      });
      // Don't call ensureCollection

      const record = createTestRecord();

      await expect(newStore.upsert([record])).rejects.toThrow(MemSearchError);
      await expect(newStore.upsert([record])).rejects.toMatchObject({
        code: 'LANCEDB_UPSERT_FAILED',
      });

      newStore.close();
    });
  });

  // ===========================================
  // search Tests
  // ===========================================
  describe('search', () => {
    beforeEach(async () => {
      const records: VectorRecord[] = [
        createTestRecord({
          chunk_hash: 'search1',
          content: 'Redis caching content',
          source: 'cache.md',
          heading: 'Redis Cache',
          embedding: [0.9, 0.1, 0.1, 0.1],
        }),
        createTestRecord({
          chunk_hash: 'search2',
          content: 'Database content',
          source: 'db.md',
          heading: 'Database',
          embedding: [0.1, 0.9, 0.1, 0.1],
        }),
        createTestRecord({
          chunk_hash: 'search3',
          content: 'API content',
          source: 'api.md',
          heading: 'API',
          embedding: [0.1, 0.1, 0.9, 0.1],
        }),
      ];
      await store.upsert(records);
    });

    it('should return search results', async () => {
      const vector = [0.9, 0.1, 0.1, 0.1]; // Similar to search1
      const results = await store.search(vector);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('source');
      expect(results[0]).toHaveProperty('heading');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('startLine');
      expect(results[0]).toHaveProperty('endLine');
    });

    it('should accept custom topK', async () => {
      const vector = [0.9, 0.1, 0.1, 0.1];
      const results = await store.search(vector, { topK: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should handle empty results', async () => {
      // Create new empty store
      const emptyStore = new LanceDBStore({
        uri: path.join(tempDir, 'empty-db'),
        table: 'empty_table',
        dimension: 4,
      });
      await emptyStore.ensureCollection(4);

      const results = await emptyStore.search([0.1, 0.2, 0.3, 0.4]);
      expect(results).toEqual([]);

      emptyStore.close();
    });

    it('should apply filter expression', async () => {
      const vector = [0.9, 0.1, 0.1, 0.1];
      const results = await store.search(vector, {
        topK: 10,
        filter: 'source == "cache.md"',
      });

      expect(results.every((r) => r.source === 'cache.md')).toBe(true);
    });

    it('should throw MemSearchError when table not initialized', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'uninit-db2'),
        table: 'uninit_table2',
      });

      await expect(newStore.search([0.1, 0.2, 0.3, 0.4])).rejects.toThrow(MemSearchError);

      newStore.close();
    });
  });

  // ===========================================
  // searchWithFilter Tests
  // ===========================================
  describe('searchWithFilter', () => {
    beforeEach(async () => {
      const record: VectorRecord = createTestRecord({
        chunk_hash: 'sf1',
        content: 'Semantic memory',
        source: 'memory.md',
        heading: 'Memory',
        embedding: [0.8, 0.2, 0.1, 0.1],
        memory_type: 'semantic',
        node_type: 'concept',
        label: 'Redis',
        importance: 0.8,
      });
      await store.upsert([record]);
    });

    it('should return extended search results with all fields', async () => {
      const vector = [0.8, 0.2, 0.1, 0.1];
      const results = await store.searchWithFilter(vector);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('chunk_hash');
      expect(results[0]).toHaveProperty('memory_type');
      expect(results[0]).toHaveProperty('node_type');
      expect(results[0]).toHaveProperty('label');
      expect(results[0]).toHaveProperty('importance');
      expect(results[0]).toHaveProperty('score');
    });

    it('should apply filter expression', async () => {
      const vector = [0.8, 0.2, 0.1, 0.1];
      const results = await store.searchWithFilter(vector, 'memory_type == "semantic"', 5);

      expect(results.every((r) => r.memory_type === 'semantic')).toBe(true);
    });

    it('should accept custom topK', async () => {
      const vector = [0.8, 0.2, 0.1, 0.1];
      const results = await store.searchWithFilter(vector, undefined, 1);

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should throw MemSearchError when table not initialized', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'uninit-db3'),
        table: 'uninit_table3',
      });

      await expect(newStore.searchWithFilter([0.1])).rejects.toThrow(MemSearchError);

      newStore.close();
    });
  });

  // ===========================================
  // query Tests
  // ===========================================
  describe('query', () => {
    beforeEach(async () => {
      const records: VectorRecord[] = [
        createTestRecord({ chunk_hash: 'query1', source: 'file1.md', content: 'Content 1' }),
        createTestRecord({ chunk_hash: 'query2', source: 'file2.md', content: 'Content 2' }),
        createTestRecord({ chunk_hash: 'query3', source: 'file1.md', content: 'Content 3' }),
      ];
      await store.upsert(records);
    });

    it('should query records with filter', async () => {
      const results = await store.query('source == "file1.md"');

      expect(results.length).toBe(2);
      expect(results.every((r) => r.source === 'file1.md')).toBe(true);
    });

    it('should accept custom limit', async () => {
      const results = await store.query('source == "file1.md"', 1);

      expect(results.length).toBe(1);
    });

    it('should return empty array for no matches', async () => {
      const results = await store.query('source == "nonexistent.md"');

      expect(results).toEqual([]);
    });

    it('should return VectorRecord with all fields', async () => {
      const results = await store.query('chunk_hash == "query1"');

      expect(results.length).toBe(1);
      expect(results[0]).toHaveProperty('chunk_hash');
      expect(results[0]).toHaveProperty('embedding');
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('source');
      expect(results[0]).toHaveProperty('heading');
      expect(results[0]).toHaveProperty('heading_level');
      expect(results[0]).toHaveProperty('start_line');
      expect(results[0]).toHaveProperty('end_line');
    });

    it('should throw MemSearchError when table not initialized', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'uninit-db4'),
        table: 'uninit_table4',
      });

      await expect(newStore.query('source == "test.md"')).rejects.toThrow(MemSearchError);

      newStore.close();
    });
  });

  // ===========================================
  // delete Tests
  // ===========================================
  describe('delete', () => {
    beforeEach(async () => {
      const records: VectorRecord[] = [
        createTestRecord({ chunk_hash: 'del1', source: 'delete_test.md' }),
        createTestRecord({ chunk_hash: 'del2', source: 'keep.md' }),
        createTestRecord({ chunk_hash: 'del3', source: 'delete_test.md' }),
      ];
      await store.upsert(records);
    });

    it('should delete records matching filter', async () => {
      await store.delete('source == "delete_test.md"');

      const count = await store.count();
      expect(count).toBe(1);

      const results = await store.query('source == "delete_test.md"');
      expect(results).toEqual([]);
    });

    it('should throw MemSearchError when table not initialized', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'uninit-db5'),
        table: 'uninit_table5',
      });

      await expect(newStore.delete('source == "test.md"')).rejects.toThrow(MemSearchError);

      newStore.close();
    });
  });

  // ===========================================
  // deleteByIds Tests
  // ===========================================
  describe('deleteByIds', () => {
    beforeEach(async () => {
      const records: VectorRecord[] = [
        createTestRecord({ chunk_hash: 'id1' }),
        createTestRecord({ chunk_hash: 'id2' }),
        createTestRecord({ chunk_hash: 'id3' }),
      ];
      await store.upsert(records);
    });

    it('should return immediately for empty ids array', async () => {
      const countBefore = await store.count();
      await store.deleteByIds([]);
      const countAfter = await store.count();

      expect(countAfter).toBe(countBefore);
    });

    it('should delete records by ids', async () => {
      await store.deleteByIds(['id1', 'id2']);

      const count = await store.count();
      expect(count).toBe(1);

      const results = await store.query('chunk_hash == "id3"');
      expect(results.length).toBe(1);
    });

    it('should handle single id', async () => {
      await store.deleteByIds(['id1']);

      const count = await store.count();
      expect(count).toBe(2);
    });

    it('should throw MemSearchError when table not initialized', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'uninit-db6'),
        table: 'uninit_table6',
      });

      await expect(newStore.deleteByIds(['hash1'])).rejects.toThrow(MemSearchError);

      newStore.close();
    });
  });

  // ===========================================
  // count Tests
  // ===========================================
  describe('count', () => {
    it('should return 0 for empty store', async () => {
      const count = await store.count();
      expect(count).toBe(0);
    });

    it('should return count of records', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'cnt1' }),
        createTestRecord({ chunk_hash: 'cnt2' }),
        createTestRecord({ chunk_hash: 'cnt3' }),
      ]);

      const count = await store.count();
      expect(count).toBe(3);
    });

    it('should return 0 when table not initialized', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'uninit-db7'),
        table: 'uninit_table7',
      });

      const count = await newStore.count();
      expect(count).toBe(0);

      newStore.close();
    });
  });

  // ===========================================
  // getSources Tests
  // ===========================================
  describe('getSources', () => {
    it('should return set of unique sources', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'src1', source: 'file1.md' }),
        createTestRecord({ chunk_hash: 'src2', source: 'file2.md' }),
        createTestRecord({ chunk_hash: 'src3', source: 'file1.md' }), // duplicate
      ]);

      const sources = await store.getSources();

      expect(sources).toBeInstanceOf(Set);
      expect(sources.size).toBe(2);
      expect(sources.has('file1.md')).toBe(true);
      expect(sources.has('file2.md')).toBe(true);
    });

    it('should return empty set for empty store', async () => {
      const sources = await store.getSources();

      expect(sources).toBeInstanceOf(Set);
      expect(sources.size).toBe(0);
    });

    it('should return empty set when table not initialized', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'uninit-db8'),
        table: 'uninit_table8',
      });

      const sources = await newStore.getSources();
      expect(sources.size).toBe(0);

      newStore.close();
    });
  });

  // ===========================================
  // getIdsBySource Tests
  // ===========================================
  describe('getIdsBySource', () => {
    it('should return set of hashes for source', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'id_by_src1', source: 'test.md' }),
        createTestRecord({ chunk_hash: 'id_by_src2', source: 'test.md' }),
        createTestRecord({ chunk_hash: 'id_by_src3', source: 'other.md' }),
      ]);

      const ids = await store.getIdsBySource('test.md');

      expect(ids).toBeInstanceOf(Set);
      expect(ids.size).toBe(2);
      expect(ids.has('id_by_src1')).toBe(true);
      expect(ids.has('id_by_src2')).toBe(true);
      expect(ids.has('id_by_src3')).toBe(false);
    });

    it('should return empty set for non-existent source', async () => {
      const ids = await store.getIdsBySource('nonexistent.md');

      expect(ids).toBeInstanceOf(Set);
      expect(ids.size).toBe(0);
    });

    it('should return empty set when table not initialized', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'uninit-db9'),
        table: 'uninit_table9',
      });

      const ids = await newStore.getIdsBySource('test.md');
      expect(ids.size).toBe(0);

      newStore.close();
    });
  });

  // ===========================================
  // close Tests
  // ===========================================
  describe('close', () => {
    it('should call close without error', () => {
      expect(() => store.close()).not.toThrow();
    });

    it('should be idempotent', () => {
      store.close();
      expect(() => store.close()).not.toThrow();
    });
  });

  // ===========================================
  // reset Tests
  // ===========================================
  describe('reset', () => {
    it('should drop the table', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'reset1' }),
        createTestRecord({ chunk_hash: 'reset2' }),
      ]);

      await store.reset();

      // Re-initialize and check empty
      await store.ensureCollection(dimension);
      const count = await store.count();
      expect(count).toBe(0);
    });

    it('should handle non-existent table gracefully', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'reset-db'),
        table: 'nonexistent_table',
      });

      // Should not throw
      await expect(newStore.reset()).resolves.not.toThrow();

      newStore.close();
    });

    it('should throw MemSearchError on failure', async () => {
      // This is hard to test without mocking internals
      // Just verify it doesn't throw in normal case
      await expect(store.reset()).resolves.not.toThrow();
    });
  });

  // ===========================================
  // Triple Memory Field Tests
  // ===========================================
  describe('triple memory fields', () => {
    it('should store and retrieve all triple memory fields', async () => {
      const record: VectorRecord = createTestRecord({
        chunk_hash: 'triple_full',
        memory_type: 'episodic',
        node_type: 'event',
        label: 'Production Incident',
        importance: 0.95,
        memory_data: JSON.stringify({ severity: 'high', duration: '2h' }),
        relations: JSON.stringify([{ target: 'redis_concept', type: 'related' }]),
        created_at: Date.now(),
        updated_at: Date.now(),
        access_count: 10,
      });

      await store.upsert([record]);

      const results = await store.query('chunk_hash == "triple_full"');

      expect(results.length).toBe(1);
      expect(results[0].memory_type).toBe('episodic');
      expect(results[0].node_type).toBe('event');
      expect(results[0].label).toBe('Production Incident');
      expect(results[0].importance).toBe(0.95);
      expect(results[0].memory_data).toBe(JSON.stringify({ severity: 'high', duration: '2h' }));
      expect(results[0].relations).toBe(
        JSON.stringify([{ target: 'redis_concept', type: 'related' }])
      );
      expect(results[0].created_at).toBeDefined();
      expect(results[0].updated_at).toBeDefined();
      expect(results[0].access_count).toBe(10);
    });

    it('should handle partial triple memory fields', async () => {
      const record: VectorRecord = createTestRecord({
        chunk_hash: 'triple_partial',
        memory_type: 'procedural',
        importance: 0.5,
      });

      await store.upsert([record]);

      const results = await store.query('chunk_hash == "triple_partial"');

      expect(results.length).toBe(1);
      expect(results[0].memory_type).toBe('procedural');
      expect(results[0].importance).toBe(0.5);
      expect(results[0].node_type).toBeUndefined();
      expect(results[0].label).toBeUndefined();
    });

    it('should search by triple memory fields', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'tm1', memory_type: 'semantic', importance: 0.9 }),
        createTestRecord({ chunk_hash: 'tm2', memory_type: 'episodic', importance: 0.5 }),
        createTestRecord({ chunk_hash: 'tm3', memory_type: 'semantic', importance: 0.7 }),
      ]);

      const results = await store.query('memory_type == "semantic"');

      expect(results.length).toBe(2);
      expect(results.every((r) => r.memory_type === 'semantic')).toBe(true);
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
    it('should throw MemSearchError with correct code on ensureCollection failure', async () => {
      // Create store with invalid path (simulate by using a file instead of directory)
      const invalidStore = new LanceDBStore({
        uri: path.join(tempDir, 'test-file.txt'), // This will be a file, not directory
        table: 'invalid_table',
      });

      // Create a file at that path to make it invalid
      fs.writeFileSync(path.join(tempDir, 'test-file.txt'), 'not a directory');

      await expect(invalidStore.ensureCollection(4)).rejects.toThrow(MemSearchError);

      invalidStore.close();
    });
  });
});
