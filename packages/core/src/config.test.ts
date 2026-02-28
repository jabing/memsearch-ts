import { describe, it, expect } from 'vitest';
import { tryValidateConfig } from './types/config.js';

describe('tryValidateConfig', () => {
  it('should return errors for invalid config', () => {
    const result = tryValidateConfig({ invalid: 'config' });
    expect(result.success).toBe(false);
  });
});
