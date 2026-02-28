import { describe, it, expect, vi } from 'vitest';
import { configCommand } from './commands/config.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('fs');
vi.mock('path');

describe('configCommand', () => {
  it('should init default config', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(resolve).mockReturnValue('/test/.memsearch.toml');

    const consoleSpy = vi.spyOn(console, 'log');
    await configCommand('init', undefined, undefined, { file: '.memsearch.toml' });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅'));
  });

  it('should warn if config exists', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(resolve).mockReturnValue('/test/.memsearch.toml');

    const consoleSpy = vi.spyOn(console, 'log');
    await configCommand('init', undefined, undefined, { file: '.memsearch.toml' });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️'));
  });
});
