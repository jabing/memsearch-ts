/**
 * Error handling example
 */

import {
  ConfigError,
  ConfigErrorCodes,
  EmbeddingError,
  EmbeddingErrorCodes,
  MilvusError,
  withErrorContext,
  withErrorContextAsync,
  Logger,
} from '../packages/core/src/index.js';

console.log('=== Error Handling Example ===\n');

const logger = new Logger({ level: 'info', prefix: '[error-example]' });

// Example 1: Create typed errors
console.log('1. Creating typed errors:');

const configError = new ConfigError(
  'Invalid API key',
  ConfigErrorCodes.MISSING_API_KEY
);
console.log('ConfigError:', configError.toJSON());

const embeddingError = new EmbeddingError(
  'Rate limit exceeded',
  EmbeddingErrorCodes.RATE_LIMIT
);
console.log('EmbeddingError:', embeddingError.toJSON());

const milvusError = new MilvusError(
  'Connection timeout',
  MilvusErrorCodes.CONNECTION_FAILED
);
console.log('MilvusError:', milvusError.toJSON());

console.log('');

// Example 2: Using error context wrappers
console.log('2. Error context wrappers:');

// Sync version
try {
  withErrorContext(
    () => {
      throw new Error('Original error');
    },
    'Configuration failed',
    ConfigError,
    ConfigErrorCodes.VALIDATION_FAILED
  );
} catch (error) {
  if (error instanceof ConfigError) {
    console.log('Caught ConfigError with context:', error.toJSON());
  }
}

// Async version
async function testAsyncError() {
  try {
    await withErrorContextAsync(
      async () => {
        await new Promise((_, reject) => setTimeout(() => reject(new Error('Async error')), 10));
      },
      'Embedding failed',
      EmbeddingError,
      EmbeddingErrorCodes.API_ERROR
    );
  } catch (error) {
    if (error instanceof EmbeddingError) {
      console.log('Caught EmbeddingError with context:', error.toJSON());
    }
  }
}

testAsyncError().then(() => {
  console.log('\n✓ Error handling examples completed');
});
