import { describe, it, expect, vi } from 'vitest';
import { searchCommand } from './commands/search.js';
import { MemSearch } from 'memsearch-core';

vi.mock('memsearch-core');

describe('searchCommand', () => {
  it('should search and display results', async () => {
    const mockSearch = vi.fn().mockResolvedValue([
      {
        content: 'test content',
        source: 'test.md',
        heading: 'Test',
        score: 0.95,
        startLine: 1,
        endLine: 10,
      },
    ]);
    vi.mocked(MemSearch).mockImplementation(
      () =>
        ({
          search: mockSearch,
          close: vi.fn(),
        }) as unknown as MemSearch
    );

    const consoleSpy = vi.spyOn(console, 'log');
    await searchCommand('test query', {
      topK: '10',
      collection: 'memsearch_chunks',
      milvusUri: '~/.memsearch/milvus.db',
    });

    expect(mockSearch).toHaveBeenCalledWith('test query', { topK: 10 });
  });
});
