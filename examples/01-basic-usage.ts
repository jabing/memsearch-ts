/**
 * Basic usage example for memsearch-ts
 */

import { MemSearch, validateConfig, tryValidateConfig, Logger } from '../packages/core/src/index.js';

async function basicUsage() {
  console.log('=== memsearch-ts Basic Usage Example ===\n');

  // 1. Create a logger
  const logger = new Logger({ level: 'debug', prefix: '[example]' });
  logger.info('Starting memsearch example...');

  // 2. Validate configuration
  const config = {
    paths: ['./examples/sample-memory'],
    milvus: {
      uri: '~/.memsearch/milvus.db',
      collection: 'example_collection',
    },
    embedding: {
      provider: 'openai' as const,
      model: 'text-embedding-3-small',
    },
  };

  logger.info('Validating configuration...');
  const validationResult = tryValidateConfig(config);
  
  if (!validationResult.success) {
    logger.error('Configuration validation failed:', validationResult.errors);
    return;
  }

  logger.info('Configuration valid:', JSON.stringify(validationResult.config, null, 2));

  // 3. Create MemSearch instance
  logger.info('Creating MemSearch instance...');
  const mem = new MemSearch(config);
  logger.info('MemSearch created successfully');

  // 4. Index files (placeholder - requires API key)
  logger.info('Indexing would happen here (requires OPENAI_API_KEY)');
  // await mem.index();

  // 5. Search (placeholder)
  logger.info('Search would happen here');
  // const results = await mem.search('example query');

  // 6. Cleanup
  mem.close();
  logger.info('Example completed');
}

// Run example
basicUsage().catch(console.error);
