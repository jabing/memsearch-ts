import { describe, it, expect } from 'vitest';
import { scanPaths } from './scanner.js';

describe('scanPaths', () => {
  it('should scan existing directories', async () => {
    const files = await scanPaths(['.']);
    expect(Array.isArray(files)).toBe(true);
  });

  it('should throw for non-existent paths', async () => {
    await expect(scanPaths(['/nonexistent/path/xyz123'])).rejects.toThrow();
  });

  it('should return empty array for empty dirs', async () => {
    const tmpDir = await import('fs/promises').then(fs => fs.mkdtemp('/tmp/memsearch-test-'));
    const files = await scanPaths([tmpDir]);
    expect(files.length).toBe(0);
  });
});
