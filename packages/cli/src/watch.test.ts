import { describe, it, expect, vi } from 'vitest';
import { watchCommand } from './commands/watch.js';
import { MemSearch } from 'memsearch-core';

vi.mock('memsearch-core');

describe('watchCommand', () => {
  it('should start watcher', async () => {
    const mockWatch = vi.fn().mockReturnValue({
      stop: vi.fn(),
    });
    vi.mocked(MemSearch).mockImplementation(
      () =>
        ({
          watch: mockWatch,
          close: vi.fn(),
        }) as unknown as MemSearch
    );

    const consoleSpy = vi.spyOn(console, 'log');
    await watchCommand(['./test'], {
      debounce: '1500',
      collection: 'memsearch_chunks',
      milvusUri: '~/.memsearch/milvus.db',
    });

    expect(mockWatch).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅'));
  });
});
