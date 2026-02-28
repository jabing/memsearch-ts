/**
 * memsearch index command
 */

import { MemSearch } from 'memsearch-core';
import { createLogger } from 'memsearch-core/utils';

const logger = createLogger('cli:index');

export interface IndexOptions {
  provider: string;
  model?: string;
  force?: boolean;
  collection: string;
  milvusUri: string;
}

export async function indexCommand(paths: string[], options: IndexOptions): Promise<void> {
  logger.info('Starting index command', { paths, options });

  try {
    const mem = new MemSearch({
      paths: paths.length > 0 ? paths : undefined,
      embedding: {
        provider: options.provider as any,
        model: options.model,
      },
      milvus: {
        uri: options.milvusUri,
        collection: options.collection,
      },
    });

    const count = await mem.index({ force: options.force });
    
    console.log(`✅ Indexed ${count} chunks`);
    
    mem.close();
  } catch (error) {
    console.error('❌ Index failed:', (error as Error).message);
    process.exit(1);
  }
}
