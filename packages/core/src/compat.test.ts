import { describe, it, expect, vi, beforeEach } from 'vitest';

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
      if (params?.output_fields?.includes('count(*)')) {
        return { data: [{ 'count(*)': mockRecords.size }] };
      }
      if (params?.output_fields && !filter) {
        return { data: Array.from(mockRecords.values()) };
      }
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
      let records = Array.from(mockRecords.values()).filter((r) => r.embedding);
      if (data?.filter && typeof data.filter === 'string') {
        const typeMatch = data.filter.match(/memory_type == "([^"]+)"/);
        if (typeMatch) {
          records = records.filter((r) => r.memory_type === typeMatch[1]);
        }
      }
      const results = records.map((r) => ({
        entity: r,
        score: 0.85 + Math.random() * 0.1,
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

vi.mock('@lancedb/lancedb', () => ({
  default: {
    connect: vi.fn().mockImplementation(() => ({
      openTable: vi.fn().mockImplementation((name: string) => ({
        search: vi.fn().mockImplementation((query: any) => ({
          limit: vi.fn().mockImplementation((n: number) => {
            const results = Array.from(mockRecords.values())
              .slice(0, n)
              .map((r) => ({
                ...r.entity,
                score: 0.85 + Math.random() * 0.1,
              }));
            return Promise.resolve(results);
          }),
        })),
        add: vi.fn().mockImplementation((records: any[]) => {
          records.forEach((r) => {
            mockRecords.set(r.chunk_hash, { ...r, score: 0.9 });
          });
          return Promise.resolve({});
        }),
        delete: vi.fn().mockImplementation((filter: string) => {
          const match = filter.match(/chunk_hash in \(([^)]+)\)/);
          if (match) {
            const ids = match[1].split(',').map((s: string) => s.trim().replace(/'/g, ''));
            ids.forEach((id: string) => mockRecords.delete(id));
          }
          return Promise.resolve({});
        }),
        countRows: vi.fn().mockImplementation(() => {
          return Promise.resolve(mockRecords.size);
        }),
      })),
      createTable: vi.fn().mockImplementation((name: string, data: any[]) => ({
        add: vi.fn().mockImplementation((records: any[]) => {
          records.forEach((r) => {
            mockRecords.set(r.chunk_hash, { ...r, score: 0.9 });
          });
          return Promise.resolve({});
        }),
      })),
    })),
  },
  connect: vi.fn().mockImplementation(() => ({
    openTable: vi.fn().mockImplementation((name: string) => ({
      search: vi.fn().mockImplementation((query: any) => ({
        limit: vi.fn().mockImplementation((n: number) => {
          const results = Array.from(mockRecords.values())
            .slice(0, n)
            .map((r) => ({
              ...r.entity,
              score: 0.85 + Math.random() * 0.1,
            }));
          return Promise.resolve(results);
        }),
      })),
      add: vi.fn().mockImplementation((records: any[]) => {
        records.forEach((r) => {
          mockRecords.set(r.chunk_hash, { ...r, score: 0.9 });
        });
        return Promise.resolve({});
      }),
      delete: vi.fn().mockImplementation((filter: string) => {
        const match = filter.match(/chunk_hash in \(([^)]+)\)/);
        if (match) {
          const ids = match[1].split(',').map((s: string) => s.trim().replace(/"/g, ''));
          ids.forEach((id: string) => mockRecords.delete(id));
        }
        return Promise.resolve({});
      }),
      countRows: vi.fn().mockImplementation(() => {
        return Promise.resolve(mockRecords.size);
      }),
    })),
    createTable: vi.fn().mockImplementation((name: string, data: any[]) => ({
      add: vi.fn().mockImplementation((records: any[]) => {
        records.forEach((r) => {
          mockRecords.set(r.chunk_hash, { ...r, score: 0.9 });
        });
        return Promise.resolve({});
      }),
    })),
  })),
}));

vi.mock('./embeddings/index.js', () => ({
  getEmbeddingProvider: vi.fn().mockResolvedValue({
    embed: vi.fn().mockImplementation((texts: string[]) => {
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
  KNOWN_DIMENSIONS: {
    'text-embedding-3-small': 1536,
  },
}));

describe('Backward Compatibility Tests', () => {
  beforeEach(() => {
    mockRecords.clear();
    mockEmbeddings = [];
  });

  describe('Old Milvus Config (Deprecated but Working)', () => {
    it('should initialize with old milvus config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: {
          uri: 'test.db',
          collection: 'test_collection',
        },
      });

      expect(mem).toBeDefined();
    });

    it('should upsert and search with old milvus config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: {
          uri: 'test.db',
          collection: 'test_collection',
        },
      });

      const id = await mem.addMemory({
        type: 'semantic',
        content: 'Redis is an in-memory data store',
        label: 'Redis',
        importance: 0.8,
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');

      const results = await mem.searchMemory('database');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('memory');
      expect(results[0]).toHaveProperty('score');
    });

    it('should handle multiple memories with old milvus config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: {
          uri: 'test.db',
          collection: 'test_collection',
        },
      });

      const id1 = await mem.addMemory({
        type: 'semantic',
        content: 'PostgreSQL is a relational database',
        label: 'PostgreSQL',
      });

      const id2 = await mem.addMemory({
        type: 'semantic',
        content: 'MongoDB is a document database',
        label: 'MongoDB',
      });

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();

      const mem1 = await mem.getMemory(id1);
      const mem2 = await mem.getMemory(id2);

      expect(mem1?.content).toBe('PostgreSQL is a relational database');
      expect(mem2?.content).toBe('MongoDB is a document database');
    });
  });

  describe('New VectorStore Config with LanceDB', () => {
    it('should initialize with new vectorStore config for LanceDB', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        vectorStore: {
          provider: 'lancedb',
          lancedb: {
            uri: './test-lancedb',
            table: 'test_table',
          },
        },
      });

      expect(mem).toBeDefined();
    });

    it('should upsert and search with LanceDB config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        vectorStore: {
          provider: 'lancedb',
          lancedb: {
            uri: './test-lancedb',
            table: 'test_table',
          },
        },
      });

      const id = await mem.addMemory({
        type: 'semantic',
        content: 'LanceDB is a vector database',
        label: 'LanceDB',
        importance: 0.7,
      });

      expect(id).toBeDefined();

      const results = await mem.searchMemory('vector database');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('memory');
    });

    it('should handle memory operations with LanceDB config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        vectorStore: {
          provider: 'lancedb',
          lancedb: {
            uri: './test-lancedb',
            table: 'test_table',
          },
        },
      });

      const id = await mem.addMemory({
        type: 'episodic',
        content: 'Learned about LanceDB today',
        data: {
          episodeType: 'learning',
          timestamp: Date.now(),
          context: {},
          actions: [],
          outcome: { status: 'success', summary: 'test' },
          lessons: [],
        },
      });

      await mem.updateMemory(id, {
        content: 'Learned about LanceDB and vector databases',
        importance: 0.8,
      });

      const updated = await mem.getMemory(id);
      expect(updated?.content).toBe('Learned about LanceDB and vector databases');
      expect(updated?.importance).toBe(0.8);
    });
  });

  describe('New VectorStore Config with Milvus', () => {
    it('should initialize with new vectorStore config for Milvus', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        vectorStore: {
          provider: 'milvus',
          milvus: {
            uri: 'test-milvus.db',
            collection: 'test_collection',
          },
        },
      });

      expect(mem).toBeDefined();
    });

    it('should upsert and search with Milvus vectorStore config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        vectorStore: {
          provider: 'milvus',
          milvus: {
            uri: 'test-milvus.db',
            collection: 'test_collection',
          },
        },
      });

      const id = await mem.addMemory({
        type: 'semantic',
        content: 'Milvus is a vector database by Zilliz',
        label: 'Milvus',
        importance: 0.9,
      });

      expect(id).toBeDefined();

      const results = await mem.searchMemory('vector database');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle memory types with Milvus vectorStore config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        vectorStore: {
          provider: 'milvus',
          milvus: {
            uri: 'test-milvus.db',
            collection: 'test_collection',
          },
        },
      });

      const semanticId = await mem.addMemory({
        type: 'semantic',
        content: 'Semantic memory for facts',
        label: 'Knowledge',
      });

      const episodicId = await mem.addMemory({
        type: 'episodic',
        content: 'Episodic memory for events',
        data: {
          episodeType: 'learning',
          timestamp: Date.now(),
          context: {},
          actions: [],
          outcome: { status: 'success', summary: 'test' },
          lessons: [],
        },
      });

      const proceduralId = await mem.addMemory({
        type: 'procedural',
        content: 'Procedural memory for skills',
        label: 'Skill',
        data: {
          skillType: 'workflow',
          description: 'test',
          triggers: [],
          steps: [],
          stats: { totalExecutions: 0, successCount: 0, successRate: 0, avgDuration: 0 },
          evolution: { version: 1, generation: 1, fitnessScore: 0 },
          dependencies: { requiredSkills: [], requiredConcepts: [] },
        },
      });

      const semantic = await mem.getMemory(semanticId);
      const episodic = await mem.getMemory(episodicId);
      const procedural = await mem.getMemory(proceduralId);

      expect(semantic?.memoryType).toBe('semantic');
      expect(episodic?.memoryType).toBe('episodic');
      expect(procedural?.memoryType).toBe('procedural');
    });
  });

  describe('Default Config (No VectorStore, No Milvus)', () => {
    it('should initialize with default LanceDB config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
      });

      expect(mem).toBeDefined();
    });

    it('should upsert and search with default config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
      });

      const id = await mem.addMemory({
        type: 'semantic',
        content: 'Default configuration uses LanceDB',
        label: 'Default',
        importance: 0.5,
      });

      expect(id).toBeDefined();

      const results = await mem.searchMemory('default');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle all operations with default config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
      });

      const id = await mem.addMemory({
        type: 'semantic',
        content: 'Test content for default config',
        label: 'Test',
      });

      await mem.updateMemory(id, {
        content: 'Updated test content',
        importance: 0.7,
      });

      const searchResults = await mem.searchMemory('test');
      expect(searchResults.length).toBeGreaterThan(0);

      await mem.deleteMemory(id);

      const deleted = await mem.getMemory(id);
      expect(deleted).toBeNull();
    });
  });

  describe('Config Migration Scenarios', () => {
    it('should prioritize vectorStore over deprecated milvus config', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        vectorStore: {
          provider: 'lancedb',
          lancedb: {
            uri: './priority-test',
            table: 'priority_table',
          },
        },
        milvus: {
          uri: 'ignored.db',
          collection: 'ignored_collection',
        },
      });

      expect(mem).toBeDefined();

      const id = await mem.addMemory({
        type: 'semantic',
        content: 'VectorStore takes priority',
        label: 'Priority',
      });

      expect(id).toBeDefined();
    });

    it('should handle empty config with defaults', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
      });

      expect(mem).toBeDefined();

      const id = await mem.addMemory({
        type: 'semantic',
        content: 'Minimal config test',
        label: 'Minimal',
      });

      expect(id).toBeDefined();
    });

    it('should support Zilliz Cloud config via new vectorStore', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const mem = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        vectorStore: {
          provider: 'milvus',
          milvus: {
            uri: 'https://example.zillizcloud.com',
            token: 'test-token',
            collection: 'cloud_collection',
          },
        },
      });

      expect(mem).toBeDefined();

      const id = await mem.addMemory({
        type: 'semantic',
        content: 'Zilliz Cloud test',
        label: 'Cloud',
      });

      expect(id).toBeDefined();
    });
  });

  describe('Cross-Config Consistency', () => {
    it('should produce consistent memory structure across configs', async () => {
      const { MemSearch } = await import('./memsearch.js');

      const memOld = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        milvus: { uri: 'test1.db', collection: 'test' },
      });

      const memNew = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
        vectorStore: {
          provider: 'milvus',
          milvus: { uri: 'test2.db', collection: 'test' },
        },
      });

      const memDefault = new MemSearch({
        paths: ['./test'],
        embedding: { provider: 'openai' },
      });

      const content = {
        type: 'semantic' as const,
        content: 'Consistency test',
        label: 'Test',
        importance: 0.5,
      };

      const idOld = await memOld.addMemory(content);
      const idNew = await memNew.addMemory(content);
      const idDefault = await memDefault.addMemory(content);

      expect(idOld).toBeDefined();
      expect(idNew).toBeDefined();
      expect(idDefault).toBeDefined();

      const memOldResult = await memOld.getMemory(idOld);
      const memNewResult = await memNew.getMemory(idNew);
      const memDefaultResult = await memDefault.getMemory(idDefault);

      expect(memOldResult?.memoryType).toBe('semantic');
      expect(memNewResult?.memoryType).toBe('semantic');
      expect(memDefaultResult?.memoryType).toBe('semantic');
    });
  });
});
