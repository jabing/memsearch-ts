/**
 * memsearch reset command
 */

import { MemSearch } from 'memsearch-core';
import * as readline from 'readline';

export interface ResetOptions {
  yes?: boolean;
  collection: string;
  milvusUri: string;
}

export async function resetCommand(options: ResetOptions): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve));
  };

  try {
    if (!options.yes) {
      console.warn('⚠️  WARNING: This will delete all indexed data!');
      console.warn('   Collection:', options.collection);
      console.warn('   Milvus URI:', options.milvusUri);
      console.warn('');
      
      const answer = await question('Are you sure? Type "yes" to confirm: ');
      
      if (answer !== 'yes') {
        console.log('❌ Reset cancelled');
        rl.close();
        return;
      }
    }

    const mem = new MemSearch({
      milvus: {
        uri: options.milvusUri,
        collection: options.collection,
      },
    });

    const store = mem.getStore();
    await store.reset();

    console.log('✅ Collection dropped successfully');
    console.log('Run "memsearch index" to re-index your files');

    mem.close();
    rl.close();
  } catch (error) {
    console.error('❌ Reset failed:', (error as Error).message);
    rl.close();
    process.exit(1);
  }
}
