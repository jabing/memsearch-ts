/**
 * memsearch watch command
 */

import { MemSearch } from 'memsearch-core';
import { createLogger } from 'memsearch-core/dist/utils/index.js';
import type { MemSearchConfig } from 'memsearch-core';

const logger = createLogger('cli:watch');

export interface WatchOptions {
  debounce: string;
  collection: string;
  milvusUri: string;
}

export async function watchCommand(paths: string[], options: WatchOptions): Promise<void> {
  logger.info('Starting watch command', { paths, options });

  try {
    const mem = new MemSearch({
      paths: paths.length > 0 ? paths : undefined,
      milvus: {
        uri: options.milvusUri,
        collection: options.collection,
      },
    });

    const watcher = mem.watch({
      debounceMs: parseInt(options.debounce),
      onEvent: (eventType: string, summary: string, filePath: string) => {
        const icon = eventType === 'created' ? '📄' : eventType === 'modified' ? '✏️' : '🗑️';
        console.log(`${icon} ${eventType}: ${filePath}`);
      },
    });

    // Access config through type-safe manner
    const config = (mem as unknown as { config: MemSearchConfig }).config;
    console.log(`✅ Watching for changes... (Ctrl+C to stop)`);
    console.log(`   Paths: ${config.paths?.join(', ') || 'none'}`);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping watcher...');
      watcher.stop();
      mem.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Watch failed:', (error as Error).message);
    process.exit(1);
  }
}
