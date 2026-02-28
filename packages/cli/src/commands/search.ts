/**
 * memsearch search command
 */

import { MemSearch } from 'memsearch-core';
import { createLogger } from 'memsearch-core/utils';

const logger = createLogger('cli:search');

export interface SearchOptions {
  topK: string;
  json?: boolean;
  collection: string;
  milvusUri: string;
}

export async function searchCommand(query: string, options: SearchOptions): Promise<void> {
  logger.info('Starting search command', { query, options });

  try {
    const mem = new MemSearch({
      milvus: {
        uri: options.milvusUri,
        collection: options.collection,
      },
    });

    const results = await mem.search(query, { topK: parseInt(options.topK) });

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(`\n📊 Found ${results.length} results:\n`);
      
      results.forEach((result, i) => {
        console.log(`${i + 1}. [${result.score.toFixed(4)}] ${result.heading || 'Untitled'}`);
        console.log(`   Source: ${result.source}:${result.startLine}-${result.endLine}`);
        console.log(`   ${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}\n`);
      });
    }

    mem.close();
  } catch (error) {
    console.error('❌ Search failed:', (error as Error).message);
    process.exit(1);
  }
}
