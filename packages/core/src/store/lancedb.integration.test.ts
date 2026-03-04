import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LanceDBStore, LanceDBStoreOptions } from './lancedb.js';
import { MemSearchError } from '../types/errors.js';
import type { VectorRecord } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

vi.mock('../utils/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../types/config.js', () => ({
  resolvePath: (p: string) => p,
}));

describe('LanceDB Integration Tests', () => {
  let store: LanceDBStore;
  let tempDir: string;
  const dimension = 8;
  const collectionName = 'integration_test_table';

  function createTestRecord(overrides: Partial<VectorRecord> = {}): VectorRecord {
    return {
      chunk_hash: `hash_${Math.random().toString(36).slice(2)}`,
      embedding: Array(dimension)
        .fill(0)
        .map(() => Math.random()),
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
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lancedb-integration-'));

    const options: LanceDBStoreOptions = {
      uri: tempDir,
      table: collectionName,
      dimension,
    };

    store = new LanceDBStore(options);
    await store.ensureCollection(dimension);
  });

  afterEach(async () => {
    store.close();

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('Complete Workflow', () => {
    it('should complete full CRUD workflow', async () => {
      let count = await store.count();
      expect(count).toBe(0);

      const records: VectorRecord[] = [
        createTestRecord({
          chunk_hash: 'workflow_1',
          content: 'Redis is an in-memory data store',
          source: 'redis.md',
          heading: 'Redis Overview',
          embedding: [0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
        createTestRecord({
          chunk_hash: 'workflow_2',
          content: 'PostgreSQL is a relational database',
          source: 'postgres.md',
          heading: 'PostgreSQL Overview',
          embedding: [0.1, 0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
        createTestRecord({
          chunk_hash: 'workflow_3',
          content: 'MongoDB is a document database',
          source: 'mongodb.md',
          heading: 'MongoDB Overview',
          embedding: [0.1, 0.1, 0.9, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
      ];

      const insertCount = await store.upsert(records);
      expect(insertCount).toBe(3);

      count = await store.count();
      expect(count).toBe(3);

      const searchVector = [0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
      const searchResults = await store.search(searchVector, { topK: 2 });
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].content).toBeDefined();
      expect(searchResults[0].score).toBeDefined();

      const filteredResults = await store.search(searchVector, {
        topK: 10,
        filter: 'source == "redis.md"',
      });
      expect(filteredResults.every((r) => r.source === 'redis.md')).toBe(true);

      const queryResults = await store.query('source == "postgres.md"');
      expect(queryResults.length).toBe(1);
      expect(queryResults[0].content).toContain('PostgreSQL');

      await store.delete('source == "redis.md"');
      count = await store.count();
      expect(count).toBe(2);

      const afterDelete = await store.query('chunk_hash == "workflow_1"');
      expect(afterDelete.length).toBe(0);
    });
  });

  describe('Collection Management', () => {
    it('should create collection with specified dimension', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'new-db'),
        table: 'new_collection',
        dimension: 16,
      });

      await newStore.ensureCollection(16);

      const count = await newStore.count();
      expect(count).toBe(0);

      newStore.close();
    });

    it('should reopen existing collection', async () => {
      const record = createTestRecord({ chunk_hash: 'persistent_hash' });
      await store.upsert([record]);

      const newStore = new LanceDBStore({
        uri: tempDir,
        table: collectionName,
      });

      await newStore.ensureCollection();

      const count = await newStore.count();
      expect(count).toBe(1);

      const results = await newStore.query('chunk_hash == "persistent_hash"');
      expect(results.length).toBe(1);

      newStore.close();
    });
  });

  describe('Upsert Operations', () => {
    it('should insert new records', async () => {
      const records: VectorRecord[] = [
        createTestRecord({ chunk_hash: 'insert_1', content: 'Content 1' }),
        createTestRecord({ chunk_hash: 'insert_2', content: 'Content 2' }),
        createTestRecord({ chunk_hash: 'insert_3', content: 'Content 3' }),
      ];

      const count = await store.upsert(records);
      expect(count).toBe(3);

      const total = await store.count();
      expect(total).toBe(3);
    });

    it('should update existing records (upsert behavior)', async () => {
      const record = createTestRecord({
        chunk_hash: 'upsert_test',
        content: 'Original content',
      });
      await store.upsert([record]);

      const updatedRecord = createTestRecord({
        chunk_hash: 'upsert_test',
        content: 'Updated content',
      });
      await store.upsert([updatedRecord]);

      const count = await store.count();
      expect(count).toBe(1);

      const results = await store.query('chunk_hash == "upsert_test"');
      expect(results[0].content).toBe('Updated content');
    });

    it('should handle batch upsert', async () => {
      const records: VectorRecord[] = Array.from({ length: 100 }, (_, i) =>
        createTestRecord({
          chunk_hash: `batch_${i}`,
          content: `Batch content ${i}`,
        })
      );

      const count = await store.upsert(records);
      expect(count).toBe(100);

      const total = await store.count();
      expect(total).toBe(100);
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      const records: VectorRecord[] = [
        createTestRecord({
          chunk_hash: 'search_1',
          content: 'Redis caching strategies',
          source: 'cache.md',
          heading: 'Redis Cache',
          embedding: [0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
        createTestRecord({
          chunk_hash: 'search_2',
          content: 'Database connection pooling',
          source: 'database.md',
          heading: 'Connection Pool',
          embedding: [0.1, 0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
        createTestRecord({
          chunk_hash: 'search_3',
          content: 'API rate limiting',
          source: 'api.md',
          heading: 'Rate Limiting',
          embedding: [0.1, 0.1, 0.9, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
      ];
      await store.upsert(records);
    });

    it('should return search results sorted by relevance', async () => {
      const vector = [0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
      const results = await store.search(vector);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('source');
      expect(results[0]).toHaveProperty('heading');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('startLine');
      expect(results[0]).toHaveProperty('endLine');
    });

    it('should respect topK parameter', async () => {
      const vector = [0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
      const results = await store.search(vector, { topK: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should apply filter expression correctly', async () => {
      const vector = [0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
      const results = await store.search(vector, {
        topK: 10,
        filter: 'source == "cache.md"',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.source === 'cache.md')).toBe(true);
    });

    it('should handle empty results gracefully', async () => {
      const vector = [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9];
      const results = await store.search(vector, {
        filter: 'source == "nonexistent.md"',
      });

      expect(results).toEqual([]);
    });
  });

  describe('Search with Filter', () => {
    beforeEach(async () => {
      const records: VectorRecord[] = [
        createTestRecord({
          chunk_hash: 'sf_1',
          content: 'Semantic memory content',
          memory_type: 'semantic',
          node_type: 'concept',
          label: 'Redis',
          importance: 0.8,
          embedding: [0.8, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
        createTestRecord({
          chunk_hash: 'sf_2',
          content: 'Episodic memory content',
          memory_type: 'episodic',
          node_type: 'event',
          label: 'Bugfix',
          importance: 0.9,
          embedding: [0.2, 0.8, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
        createTestRecord({
          chunk_hash: 'sf_3',
          content: 'Procedural memory content',
          memory_type: 'procedural',
          node_type: 'skill',
          label: 'Deployment',
          importance: 0.7,
          embedding: [0.1, 0.1, 0.8, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
      ];
      await store.upsert(records);
    });

    it('should return extended search results with all fields', async () => {
      const vector = [0.8, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
      const results = await store.searchWithFilter(vector);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('chunk_hash');
      expect(results[0]).toHaveProperty('memory_type');
      expect(results[0]).toHaveProperty('node_type');
      expect(results[0]).toHaveProperty('label');
      expect(results[0]).toHaveProperty('importance');
      expect(results[0]).toHaveProperty('score');
    });

    it('should filter by memory_type', async () => {
      const vector = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
      const results = await store.searchWithFilter(vector, 'memory_type == "semantic"', 10);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.memory_type === 'semantic')).toBe(true);
    });

    it('should filter by node_type', async () => {
      const vector = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
      const results = await store.searchWithFilter(vector, 'node_type == "event"', 10);

      expect(results.length).toBe(1);
      expect(results[0].node_type).toBe('event');
    });

    it('should filter by importance threshold', async () => {
      const vector = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
      const results = await store.searchWithFilter(vector, 'importance > 0.75', 10);

      expect(results.length).toBe(2);
      expect(results.every((r) => (r.importance ?? 0) > 0.75)).toBe(true);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      const records: VectorRecord[] = [
        createTestRecord({
          chunk_hash: 'query_1',
          source: 'file1.md',
          content: 'Content 1',
          memory_type: 'semantic',
        }),
        createTestRecord({
          chunk_hash: 'query_2',
          source: 'file2.md',
          content: 'Content 2',
          memory_type: 'episodic',
        }),
        createTestRecord({
          chunk_hash: 'query_3',
          source: 'file1.md',
          content: 'Content 3',
          memory_type: 'semantic',
        }),
        createTestRecord({
          chunk_hash: 'query_4',
          source: 'file3.md',
          content: 'Content 4',
          memory_type: 'procedural',
        }),
      ];
      await store.upsert(records);
    });

    it('should query by simple filter', async () => {
      const results = await store.query('source == "file1.md"');

      expect(results.length).toBe(2);
      expect(results.every((r) => r.source === 'file1.md')).toBe(true);
    });

    it('should query by memory_type', async () => {
      const results = await store.query('memory_type == "semantic"');

      expect(results.length).toBe(2);
      expect(results.every((r) => r.memory_type === 'semantic')).toBe(true);
    });

    it('should query with limit', async () => {
      const results = await store.query('source == "file1.md"', 1);

      expect(results.length).toBe(1);
    });

    it('should return empty array for no matches', async () => {
      const results = await store.query('source == "nonexistent.md"');

      expect(results).toEqual([]);
    });

    it('should return records with all fields', async () => {
      const results = await store.query('chunk_hash == "query_1"');

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
  });

  describe('Delete Operations', () => {
    beforeEach(async () => {
      const records: VectorRecord[] = [
        createTestRecord({ chunk_hash: 'del_1', source: 'delete_test.md' }),
        createTestRecord({ chunk_hash: 'del_2', source: 'keep.md' }),
        createTestRecord({ chunk_hash: 'del_3', source: 'delete_test.md' }),
        createTestRecord({ chunk_hash: 'del_4', source: 'keep.md' }),
      ];
      await store.upsert(records);
    });

    it('should delete records by filter', async () => {
      await store.delete('source == "delete_test.md"');

      const count = await store.count();
      expect(count).toBe(2);

      const results = await store.query('source == "delete_test.md"');
      expect(results).toEqual([]);
    });

    it('should delete records by IDs', async () => {
      await store.deleteByIds(['del_1', 'del_3']);

      const count = await store.count();
      expect(count).toBe(2);

      const remaining = await store.query("chunk_hash IN ('del_2', 'del_4')");
      expect(remaining.length).toBe(2);
    });

    it('should handle empty delete gracefully', async () => {
      const countBefore = await store.count();
      await store.deleteByIds([]);
      const countAfter = await store.count();

      expect(countAfter).toBe(countBefore);
    });

    it('should delete by source', async () => {
      await store.deleteBySource('keep.md');

      const count = await store.count();
      expect(count).toBe(2);

      const sources = await store.getSources();
      expect(sources.has('keep.md')).toBe(false);
    });

    it('should delete by hashes', async () => {
      await store.deleteByHashes(['del_1', 'del_2']);

      const count = await store.count();
      expect(count).toBe(2);
    });
  });

  describe('Count and Statistics', () => {
    it('should return 0 for empty store', async () => {
      const count = await store.count();
      expect(count).toBe(0);
    });

    it('should return accurate count after inserts', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'cnt_1' }),
        createTestRecord({ chunk_hash: 'cnt_2' }),
        createTestRecord({ chunk_hash: 'cnt_3' }),
      ]);

      const count = await store.count();
      expect(count).toBe(3);
    });

    it('should update count after deletes', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'cnt_1' }),
        createTestRecord({ chunk_hash: 'cnt_2' }),
        createTestRecord({ chunk_hash: 'cnt_3' }),
      ]);

      await store.delete('chunk_hash == "cnt_2"');

      const count = await store.count();
      expect(count).toBe(2);
    });
  });

  describe('Source Management', () => {
    it('should return unique sources', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'src_1', source: 'file1.md' }),
        createTestRecord({ chunk_hash: 'src_2', source: 'file2.md' }),
        createTestRecord({ chunk_hash: 'src_3', source: 'file1.md' }),
      ]);

      const sources = await store.getSources();

      expect(sources).toBeInstanceOf(Set);
      expect(sources.size).toBe(2);
      expect(sources.has('file1.md')).toBe(true);
      expect(sources.has('file2.md')).toBe(true);
    });

    it('should return hashes by source', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'hash_1', source: 'test.md' }),
        createTestRecord({ chunk_hash: 'hash_2', source: 'test.md' }),
        createTestRecord({ chunk_hash: 'hash_3', source: 'other.md' }),
      ]);

      const hashes = await store.getIdsBySource('test.md');

      expect(hashes.size).toBe(2);
      expect(hashes.has('hash_1')).toBe(true);
      expect(hashes.has('hash_2')).toBe(true);
      expect(hashes.has('hash_3')).toBe(false);
    });

    it('should return empty set for non-existent source', async () => {
      const hashes = await store.getIdsBySource('nonexistent.md');
      expect(hashes.size).toBe(0);
    });
  });

  describe('Triple Memory Fields', () => {
    it('should store and retrieve all triple memory fields', async () => {
      const record: VectorRecord = {
        chunk_hash: 'triple_full',
        embedding: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        content: 'Complete triple memory record',
        source: 'memory.md',
        heading: 'Memory Test',
        heading_level: 2,
        start_line: 10,
        end_line: 20,
        memory_type: 'episodic',
        node_type: 'event',
        label: 'Production Incident',
        importance: 0.95,
        memory_data: JSON.stringify({ severity: 'high', duration: '2h' }),
        relations: JSON.stringify([{ target: 'redis_concept', type: 'related' }]),
        created_at: Date.now(),
        updated_at: Date.now(),
        access_count: 10,
      };

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

    it('should search by triple memory filters', async () => {
      await store.upsert([
        createTestRecord({
          chunk_hash: 'tm_1',
          memory_type: 'semantic',
          importance: 0.9,
          embedding: [0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
        createTestRecord({
          chunk_hash: 'tm_2',
          memory_type: 'episodic',
          importance: 0.5,
          embedding: [0.1, 0.9, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
        createTestRecord({
          chunk_hash: 'tm_3',
          memory_type: 'semantic',
          importance: 0.7,
          embedding: [0.1, 0.1, 0.9, 0.1, 0.1, 0.1, 0.1, 0.1],
        }),
      ]);

      const semanticResults = await store.searchWithFilter(
        [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        'memory_type == "semantic"',
        10
      );
      expect(semanticResults.length).toBe(2);
      expect(semanticResults.every((r) => r.memory_type === 'semantic')).toBe(true);

      const importantResults = await store.query('importance > 0.6');
      expect(importantResults.length).toBe(2);
      expect(importantResults.every((r) => (r.importance ?? 0) > 0.6)).toBe(true);
    });
  });

  describe('Reset and Cleanup', () => {
    it('should drop and recreate table', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'reset_1' }),
        createTestRecord({ chunk_hash: 'reset_2' }),
      ]);

      await store.reset();

      await store.ensureCollection(dimension);
      const count = await store.count();
      expect(count).toBe(0);
    });

    it('should handle close gracefully', () => {
      expect(() => store.close()).not.toThrow();
      expect(() => store.close()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw MemSearchError on invalid operations', async () => {
      const newStore = new LanceDBStore({
        uri: path.join(tempDir, 'uninit-db'),
        table: 'uninit_table',
      });

      await expect(newStore.upsert([createTestRecord()])).rejects.toThrow(MemSearchError);

      newStore.close();
    });
  });

  describe('Behavior Consistency', () => {
    it('should handle empty arrays consistently', async () => {
      expect(await store.upsert([])).toBe(0);

      await expect(store.deleteByIds([])).resolves.not.toThrow();

      expect(await store.query('source == "nonexistent.md"')).toEqual([]);
    });

    it('should return consistent result formats', async () => {
      await store.upsert([
        createTestRecord({
          chunk_hash: 'format_1',
          content: 'Test content',
          source: 'test.md',
          heading: 'Test',
        }),
      ]);

      const searchResults = await store.search([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
      expect(searchResults[0]).toMatchObject({
        content: expect.any(String),
        source: expect.any(String),
        heading: expect.any(String),
        score: expect.any(Number),
        startLine: expect.any(Number),
        endLine: expect.any(Number),
      });

      const extendedResults = await store.searchWithFilter([
        0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
      ]);
      expect(extendedResults[0]).toHaveProperty('chunk_hash');
      expect(extendedResults[0]).toHaveProperty('memory_type');
      expect(extendedResults[0]).toHaveProperty('importance');

      const queryResults = await store.query('chunk_hash == "format_1"');
      expect(queryResults[0]).toHaveProperty('embedding');
      expect(queryResults[0]).toHaveProperty('heading_level');
      expect(queryResults[0]).toHaveProperty('start_line');
      expect(queryResults[0]).toHaveProperty('end_line');
    });

    it('should handle filter expressions consistently', async () => {
      await store.upsert([
        createTestRecord({ chunk_hash: 'filter_1', source: 'test.md', memory_type: 'semantic' }),
        createTestRecord({ chunk_hash: 'filter_2', source: 'test.md', memory_type: 'episodic' }),
        createTestRecord({ chunk_hash: 'filter_3', source: 'other.md', memory_type: 'semantic' }),
      ]);

      const eqResults = await store.query('source == "test.md"');
      expect(eqResults.length).toBe(2);

      const andResults = await store.query('source == "test.md" AND memory_type == "semantic"');
      expect(andResults.length).toBe(1);
      expect(andResults[0].memory_type).toBe('semantic');
    });
  });
});
