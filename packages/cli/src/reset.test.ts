import { describe, it, expect, vi } from 'vitest';
import { resetCommand } from './commands/reset.js';
import { MemSearch } from 'memsearch-core';

vi.mock('memsearch-core');

describe('resetCommand', () => {
  it('should reset with confirmation', async () => {
    const mockReset = vi.fn().mockResolvedValue(undefined);
    vi.mocked(MemSearch).mockImplementation(
      () =>
        ({
          getStore: () => ({
            reset: mockReset,
          }),
          close: vi.fn(),
        }) as unknown as MemSearch
    );

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const consoleSpy = vi.spyOn(console, 'log');

    await resetCommand({
      yes: false,
      collection: 'memsearch_chunks',
      milvusUri: '~/.memsearch/milvus.db',
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalled();
  });

  it('should reset without confirmation if --yes flag', async () => {
    const mockReset = vi.fn().mockResolvedValue(undefined);
    vi.mocked(MemSearch).mockImplementation(
      () =>
        ({
          getStore: () => ({
            reset: mockReset,
          }),
          close: vi.fn(),
        }) as unknown as MemSearch
    );

    const consoleSpy = vi.spyOn(console, 'log');
    await resetCommand({
      yes: true,
      collection: 'memsearch_chunks',
      milvusUri: '~/.memsearch/milvus.db',
    });

    expect(mockReset).toHaveBeenCalled();
  });
});
