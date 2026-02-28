/**
 * Zod validation example
 */

import { 
  MemSearchConfigSchema, 
  MilvusConfigSchema,
  ChunkingConfigSchema,
  validateConfigWithZod 
} from '../packages/core/src/index.js';

console.log('=== Zod Validation Example ===\n');

// Example 1: Valid minimal config
console.log('1. Valid minimal config:');
const minimalConfig = {
  milvus: { uri: '~/.memsearch/milvus.db' },
};

try {
  const result = validateConfigWithZod(minimalConfig);
  console.log('✓ Valid:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('✗ Invalid:', (error as Error).message);
}

console.log('');

// Example 2: Valid full config
console.log('2. Valid full config:');
const fullConfig = {
  paths: ['./docs', './notes'],
  embedding: {
    provider: 'google',
    model: 'gemini-embedding-001',
    batchSize: 100,
  },
  milvus: {
    uri: 'http://localhost:19530',
    token: 'test-token',
    collection: 'my_collection',
  },
  chunking: {
    maxChunkSize: 2000,
    overlapLines: 3,
  },
};

try {
  const result = validateConfigWithZod(fullConfig);
  console.log('✓ Valid:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('✗ Invalid:', (error as Error).message);
}

console.log('');

// Example 3: Invalid provider
console.log('3. Invalid provider:');
const invalidProvider = {
  milvus: { uri: '~/.memsearch/milvus.db' },
  embedding: { provider: 'invalid-provider' },
};

try {
  const result = validateConfigWithZod(invalidProvider);
  console.log('✓ Valid:', result);
} catch (error) {
  console.log('✗ Invalid:', (error as Error).message);
}

console.log('');

// Example 4: Missing required field
console.log('4. Missing milvus URI:');
const missingUri = {
  milvus: { uri: '' },
};

try {
  const result = validateConfigWithZod(missingUri);
  console.log('✓ Valid:', result);
} catch (error) {
  console.log('✗ Invalid:', (error as Error).message);
}

console.log('');

// Example 5: Validate chunking config
console.log('5. Chunking config validation:');
const chunkingConfig = {
  maxChunkSize: 500,
  overlapLines: 2,
};

try {
  const result = ChunkingConfigSchema.parse(chunkingConfig);
  console.log('✓ Valid chunking config:', result);
} catch (error) {
  console.log('✗ Invalid:', (error as Error).message);
}
