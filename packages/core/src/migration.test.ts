import { describe, it, expect, vi } from 'vitest';

// Mock MilvusClient
vi.mock('@zilliz/milvus2-sdk-node', () => ({
  MilvusClient: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({
      data: [
        {
          chunk_hash: 'test-hash-1',
          embedding: [0.1, 0.2, 0.3],
          content: 'Test content',
          source: 'test.md',
          heading: 'Test',
          heading_level: 1,
          start_line: 1,
          end_line: 5,
        },
      ],
    }),
    insert: vi.fn().mockResolvedValue({ insert_cnt: 1 }),
  })),
}));

describe('Migration', () => {
  it('should export migrateCollection function', async () => {
    const { migrateCollection } = await import('./migration.js');
    expect(migrateCollection).toBeDefined();
    expect(typeof migrateCollection).toBe('function');
  });

  it('should export verifyMigration function', async () => {
    const { verifyMigration } = await import('./migration.js');
    expect(verifyMigration).toBeDefined();
    expect(typeof verifyMigration).toBe('function');
  });

  it('should migrate with default options', async () => {
    const { migrateCollection } = await import('./migration.js');
    const result = await migrateCollection('old_col', 'new_col', 'localhost:19530');

    expect(result.migrated).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should call progress callback', async () => {
    const { migrateCollection } = await import('./migration.js');
    const onProgress = vi.fn();

    await migrateCollection('old_col', 'new_col', 'localhost:19530', {
      onProgress,
      batchSize: 1,
    });

    expect(onProgress).toHaveBeenCalled();
  });

  it('should return empty result for no data', async () => {
    // Override mock for this test
    const { MilvusClient } = await import('@zilliz/milvus2-sdk-node');
    vi.mocked(MilvusClient).mockImplementationOnce(
      () =>
        ({
          query: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn(),
        }) as any
    );

    const { migrateCollection } = await import('./migration.js');
    const result = await migrateCollection('old_col', 'new_col', 'localhost:19530');

    expect(result.migrated).toBe(0);
  });
});
