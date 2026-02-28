/**
 * memsearch stats command
 */

import { MemSearch } from 'memsearch-core';

export interface StatsOptions {
  collection: string;
  milvusUri: string;
}

export async function statsCommand(options: StatsOptions): Promise<void> {
  try {
    const mem = new MemSearch({
      milvus: {
        uri: options.milvusUri,
        collection: options.collection,
      },
    });

    const store = mem.getStore();
    const count = await store.count();
    const sources = await store.indexedSources();

    console.log('📊 memsearch statistics\n');
    console.log(`Collection: ${options.collection}`);
    console.log(`Milvus URI: ${options.milvusUri}`);
    console.log('');
    console.log(`Total chunks: ${count}`);
    console.log(`Indexed files: ${sources.size}`);
    
    if (sources.size > 0) {
      console.log('\nIndexed sources:');
      Array.from(sources).slice(0, 10).forEach(source => {
        console.log(`  - ${source}`);
      });
      if (sources.size > 10) {
        console.log(`  ... and ${sources.size - 10} more`);
      }
    }

    mem.close();
  } catch (error) {
    console.error('❌ Stats failed:', (error as Error).message);
    process.exit(1);
  }
}
