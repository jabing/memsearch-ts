import { describe, it, expect, vi } from 'vitest';
import { statsCommand } from './commands/stats.js';
import { MemSearch } from 'memsearch-core';

vi.mock('memsearch-core');

describe('statsCommand', () => {
  it('should display statistics', async () => {
    const mockCount = vi.fn().mockResolvedValue(100);
    vi.mocked(MemSearch).mockImplementation(
      () =>
        ({
          getStore: () => ({
            count: mockCount,
          }),
          close: vi.fn(),
        }) as unknown as MemSearch
    );

    const consoleSpy = vi.spyOn(console, 'log');
    await statsCommand({
      collection: 'memsearch_chunks',
      milvusUri: '~/.memsearch/milvus.db',
    });

    expect(mockCount).toHaveBeenCalled();
  });
});
