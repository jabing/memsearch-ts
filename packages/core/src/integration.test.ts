/**
 * Integration tests for triple memory API
 * Tests complete workflow: addMemory → searchMemory → addRelation → getNeighbors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MilvusClient
const mockRecords: Map<string, any> = new Map();
let mockEmbeddings: number[][] = [];

vi.mock('@zilliz/milvus2-sdk-node', () => ({
  MilvusClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    hasCollection: vi.fn().mockResolvedValue({ value: true }),
    createCollection: vi.fn().mockResolvedValue(undefined),
    loadCollection: vi.fn().mockResolvedValue(undefined),
    describeCollection: vi.fn().mockResolvedValue({ schema: { fields: [] } }),
    createIndex: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn().mockImplementation((data: any) => {
      const records = data.data || [];
      records.forEach((r: any) => {
        mockRecords.set(r.chunk_hash, { ...r, score: 0.9 });
      });
      return { insert_cnt: records.length };
    }),
    upsert: vi.fn().mockImplementation((data: any) => {
      const records = data.data || [];
      records.forEach((r: any) => {
        mockRecords.set(r.chunk_hash, { ...r, score: 0.9 });
      });
      return { upsert_cnt: records.length };
    }),
    query: vi.fn().mockImplementation((params: any) => {
      const filter = params?.filter;
      // Handle count query
      if (params?.output_fields?.includes('count(*)')) {
        return { data: [{ 'count(*)': mockRecords.size }] };
      }
      // Handle source listing
      if (params?.output_fields && !filter) {
        return { data: Array.from(mockRecords.values()) };
      }
      // Simple query parser for chunk_hash == "id"
      if (filter && typeof filter === 'string') {
        const match = filter.match(/chunk_hash == "([^"]+)"/);
        if (match) {
          const record = mockRecords.get(match[1]);
          return { data: record ? [record] : [] };
        }
      }
      return { data: Array.from(mockRecords.values()) };
    }),
    search: vi.fn().mockImplementation((data: any) => {
      // Return records sorted by mock score with entity wrapper
      let records = Array.from(mockRecords.values()).filter((r) => r.embedding);
      
      // Handle memory_type filter
      if (data?.filter && typeof data.filter === 'string') {
        const typeMatch = data.filter.match(/memory_type == "([^"]+)"/);
        if (typeMatch) {
          records = records.filter((r) => r.memory_type === typeMatch[1]);
        }
      }
      
      const results = records.map((r) => ({ 
        entity: r,
        score: 0.85 + Math.random() * 0.1 
      }));
      return { results };
    }),
    delete: vi.fn().mockImplementation((params: any) => {
      const filter = params?.filter;
      if (filter && typeof filter === 'string') {
        const match = filter.match(/chunk_hash in \[([^\]]+)\]/);
        if (match) {
          const ids = match[1].split(',').map((s: string) => s.trim().replace(/"/g, ''));
          ids.forEach((id: string) => mockRecords.delete(id));
        }
      }
      return { delete_cnt: 1 };
    }),
    getCollectionStatistics: vi.fn().mockResolvedValue({ data: [{ count: mockRecords.size }] }),
  })),
}));

// Mock embedding provider
vi.mock('./embeddings/index.js', () => ({
  getEmbeddingProvider: vi.fn().mockResolvedValue({
    embed: vi.fn().mockImplementation((texts: string[]) => {
      // Return mock embeddings based on input
      return Promise.resolve(
        texts.map(
          (_, i) =>
            mockEmbeddings[i] ||
            Array(1536)
              .fill(0)
              .map(() => Math.random())
        )
      );
    }),
    modelName: 'text-embedding-3-small',
  }),
}));

describe('Triple Memory Integration', () => {
  beforeEach(() => {
    mockRecords.clear();
    mockEmbeddings = [];
  });

  describe('Memory CRUD Workflow', () => {
    it('should add and retrieve a semantic memory', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Add memory
      const id = await mem.addMemory({
        type: 'semantic',
        content: 'Redis is an in-memory data store',
        label: 'Redis',
        importance: 0.8,
        nodeType: 'concept',
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      // Retrieve memory
      const memory = await mem.getMemory(id);
      expect(memory).toBeDefined();
      expect(memory?.content).toBe('Redis is an in-memory data store');
      expect(memory?.memoryType).toBe('semantic');
      expect(memory?.label).toBe('Redis');
    });

    it('should update a memory', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Add memory
      const id = await mem.addMemory({
        type: 'semantic',
        content: 'Original content',
        label: 'Test',
        importance: 0.5,
      });

      // Update memory
      await mem.updateMemory(id, {
        content: 'Updated content',
        importance: 0.9,
      });

      // Verify update
      const updated = await mem.getMemory(id);
      expect(updated?.content).toBe('Updated content');
      expect(updated?.importance).toBe(0.9);
    });

    it('should delete a memory', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Add memory
      const id = await mem.addMemory({
        type: 'semantic',
        content: 'To be deleted',
        label: 'Temporary',
      });

      // Delete memory
      await mem.deleteMemory(id);

      // Verify deletion
      const deleted = await mem.getMemory(id);
      expect(deleted).toBeNull();
    });
  });

  describe('Memory Search', () => {
    it('should search memories by semantic similarity', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Add multiple memories
      await mem.addMemory({
        type: 'semantic',
        content: 'PostgreSQL is a relational database',
        label: 'PostgreSQL',
        nodeType: 'concept',
      });
      await mem.addMemory({
        type: 'semantic',
        content: 'MongoDB is a document database',
        label: 'MongoDB',
        nodeType: 'concept',
      });

      // Search
      const results = await mem.searchMemory('database', { topK: 2 });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('memory');
      expect(results[0]).toHaveProperty('score');
    });

    it('should filter search by memory type', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Add different memory types
      await mem.addMemory({
        type: 'semantic',
        content: 'API endpoint definition',
      });
      await mem.addMemory({
        type: 'episodic',
        content: 'Fixed API bug yesterday',
        episodeType: 'bugfix',
      });

      // Search with type filter
      const semanticResults = await mem.searchMemory('API', { memoryType: 'semantic' });
      const episodicResults = await mem.searchMemory('API', { memoryType: 'episodic' });

      // All results should match their type filter
      semanticResults.forEach((r) => {
        expect(r.memory.memoryType).toBe('semantic');
      });
      episodicResults.forEach((r) => {
        expect(r.memory.memoryType).toBe('episodic');
      });
    });
  });

  describe('Relation Management', () => {
    it('should add and retrieve relations', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Add two memories
      const id1 = await mem.addMemory({
        type: 'semantic',
        content: 'Redis caching layer',
        label: 'Redis',
      });
      const id2 = await mem.addMemory({
        type: 'semantic',
        content: 'Database for persistence',
        label: 'PostgreSQL',
      });

      // Add relation
      const relId = await mem.addRelation(id1, {
        targetId: id2,
        type: 'relates_to',
        weight: 0.8,
      });

      expect(relId).toBeDefined();

      // Retrieve relations
      const relations = await mem.getRelations(id1);
      expect(relations.length).toBeGreaterThan(0);
      expect(relations[0].targetId).toBe(id2);
      expect(relations[0].type).toBe('relates_to');
    });

    it('should delete a relation', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Add memories and relation
      const id1 = await mem.addMemory({ type: 'semantic', content: 'Node A' });
      const id2 = await mem.addMemory({ type: 'semantic', content: 'Node B' });
      const relId = await mem.addRelation(id1, {
        targetId: id2,
        type: 'relates_to',
      });

      // Delete relation
      await mem.deleteRelation(relId);

      // Verify deletion
      const relations = await mem.getRelations(id1);
      expect(relations.find((r) => r.id === relId)).toBeUndefined();
    });
  });

  describe('Graph Traversal', () => {
    it('should get neighbors within specified depth', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Create a small graph: A → B → C
      const idA = await mem.addMemory({ type: 'semantic', content: 'Node A' });
      const idB = await mem.addMemory({ type: 'semantic', content: 'Node B' });
      const idC = await mem.addMemory({ type: 'semantic', content: 'Node C' });

      await mem.addRelation(idA, { targetId: idB, type: 'links_to' });
      await mem.addRelation(idB, { targetId: idC, type: 'links_to' });

      // Get 1-hop neighbors
      const neighbors1 = await mem.getNeighbors(idA, { depth: 1 });
      expect(neighbors1.length).toBe(1);
      expect(neighbors1[0].content).toBe('Node B');

      // Get 2-hop neighbors
      const neighbors2 = await mem.getNeighbors(idA, { depth: 2 });
      expect(neighbors2.length).toBe(2);
    });

    it('should find path between nodes', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Create a chain: A → B → C → D
      const ids = await mem.addMemories([
        { type: 'semantic', content: 'Node A' },
        { type: 'semantic', content: 'Node B' },
        { type: 'semantic', content: 'Node C' },
        { type: 'semantic', content: 'Node D' },
      ]);

      await mem.addRelation(ids[0], { targetId: ids[1], type: 'next' });
      await mem.addRelation(ids[1], { targetId: ids[2], type: 'next' });
      await mem.addRelation(ids[2], { targetId: ids[3], type: 'next' });

      // Find path A → D
      const path = await mem.findPath(ids[0], ids[3]);
      expect(path).not.toBeNull();
      expect(path).toHaveLength(4);
      expect(path).toEqual(ids);

      // Find path A → C
      const path2 = await mem.findPath(ids[0], ids[2]);
      expect(path2).toHaveLength(3);
    });

    it('should return null for unreachable nodes', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Create two disconnected nodes
      const idA = await mem.addMemory({ type: 'semantic', content: 'Isolated A' });
      const idB = await mem.addMemory({ type: 'semantic', content: 'Isolated B' });

      // No path exists
      const path = await mem.findPath(idA, idB);
      expect(path).toBeNull();
    });
  });

  describe('Cross-Type Interaction', () => {
    it('should handle episodic memory with semantic references', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Add semantic knowledge
      const conceptId = await mem.addMemory({
        type: 'semantic',
        content: 'Use connection pooling for database connections',
        label: 'Connection Pooling',
        nodeType: 'pattern',
      });

      // Add episodic memory about using this pattern
      const episodeId = await mem.addMemory({
        type: 'episodic',
        content: 'Applied connection pooling to fix timeout issues',
        episodeType: 'bugfix',
        data: { issue: 'connection timeouts', resolution: 'added pool' },
      });

      // Link episode to concept
      await mem.addRelation(episodeId, {
        targetId: conceptId,
        type: 'applied',
        weight: 0.9,
      });

      // Verify linkage
      const neighbors = await mem.getNeighbors(episodeId);
      expect(neighbors.some((n) => n.label === 'Connection Pooling')).toBe(true);
    });

    it('should support procedural memory with steps', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Add a procedural memory
      const procId = await mem.addMemory({
        type: 'procedural',
        content: 'Deploy to production',
        skillType: 'workflow',
        data: {
          steps: [
            'Run tests',
            'Build Docker image',
            'Push to registry',
            'Update Kubernetes deployment',
          ],
        },
      });

      // Verify retrieval
      const retrieved = await mem.getMemory(procId);
      expect(retrieved?.memoryType).toBe('procedural');
      expect(retrieved?.data.steps).toHaveLength(4);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency between graph and store on delete', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Create nodes and relations
      const idA = await mem.addMemory({ type: 'semantic', content: 'A' });
      const idB = await mem.addMemory({ type: 'semantic', content: 'B' });
      await mem.addRelation(idA, { targetId: idB, type: 'links' });

      // Delete source node
      await mem.deleteMemory(idA);

      // Verify node is gone from both store and graph
      const memory = await mem.getMemory(idA);
      expect(memory).toBeNull();

      // Neighbors should return empty (node removed from graph)
      const neighbors = await mem.getNeighbors(idA);
      expect(neighbors).toHaveLength(0);
    });

    it('should get stats', async () => {
      const { MemSearch } = await import('./memsearch.js');
      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test.db', collection: 'test_col' },
      });

      // Add some memories
      await mem.addMemory({ type: 'semantic', content: 'Knowledge 1' });
      await mem.addMemory({ type: 'episodic', content: 'Event 1' });

      // Get stats
      const stats = await mem.getStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('avgImportance');
      expect(stats.total).toBeGreaterThan(0);
    });
  });
});
