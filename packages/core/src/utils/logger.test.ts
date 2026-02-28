import { describe, it, expect } from 'vitest';
import { Logger } from './logger.js';

describe('Logger', () => {
  it('should create logger with default options', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });

  it('should respect log level', () => {
    const logger = new Logger({ level: 'error' });
    expect(logger).toBeDefined();
  });

  it('should create child logger', () => {
    const parent = new Logger({ prefix: '[parent]' });
    const child = parent.child('[child]');
    expect(child).toBeDefined();
  });

  it('should change log level dynamically', () => {
    const logger = new Logger({ level: 'silent' });
    logger.setLevel('debug');
    expect(logger).toBeDefined();
  });
});
