import { describe, it, expect } from 'vitest';
import { validateConfig, tryValidateConfig, resolvePath } from './config.js';

describe('validateConfig', () => {
  it('should accept minimal config with defaults', () => {
    const config = { milvus: { uri: '~/.memsearch/milvus.db' } };
    const result = validateConfig(config);
    expect(result.embedding.provider).toBe('openai');
    expect(result.milvus.collection).toBe('memsearch_chunks');
  });

  it('should resolve tilde paths', () => {
    const config = { milvus: { uri: '~/.memsearch/milvus.db' } };
    const result = validateConfig(config);
    expect(result.milvus.uri.startsWith('~')).toBe(false);
  });
});

describe('tryValidateConfig', () => {
  it('should return success for valid config', () => {
    const result = tryValidateConfig({ milvus: { uri: 'test' } });
    expect(result.success).toBe(true);
  });

  it('should return errors for invalid config', () => {
    const result = tryValidateConfig({ invalid: 'config' });
    expect(result.success).toBe(false);
  });
});

describe('resolvePath', () => {
  it('should resolve tilde to home directory', () => {
    const result = resolvePath('~/test');
    expect(result.startsWith('~')).toBe(false);
  });

  it('should return unchanged for non-tilde paths', () => {
    const result = resolvePath('/absolute/path');
    expect(result).toBe('/absolute/path');
  });
});
