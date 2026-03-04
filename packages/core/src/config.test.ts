import { describe, it, expect } from 'vitest';
import { tryValidateConfig } from './types/config.js';

describe('tryValidateConfig', () => {
  it('should return errors for invalid config', () => {
    const result = tryValidateConfig({
      embedding: { provider: 'invalid_provider' as any },
    });
    expect(result.success).toBe(false);
  });
});
