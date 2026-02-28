/**
 * MemSearch - High-level API for semantic memory search
 */

import { validateConfig, resolvePath, DEFAULT_MODELS } from './types/config.js';
import type { MemSearchConfig, SearchResult, WatcherCallback, Chunk } from './types/index.js';
import { MemSearchError } from './types/errors.js';
import { getEmbeddingProvider, type IEmbeddingProvider } from './embeddings/index.js';
import { MilvusStore, type MilvusRecord } from './store.js';
import { chunkMarkdown, computeChunkId, computeContentHash } from './index.js';
import { scanPaths } from './scanner.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('memsearch');

export class MemSearch {
  private config: Required<MemSearchConfig>;
  private embedder: IEmbeddingProvider | null = null;
  private store: MilvusStore;

  constructor(config: MemSearchConfig) {
    this.config = validateConfig(config);
    this.store = new MilvusStore({
      uri: this.config.milvus.uri,
      token: this.config.milvus.token,
      collection: this.config.milvus.collection,
    });
    logger.info('MemSearch initialized', { 
      provider: this.config.embedding.provider,
      collection: this.config.milvus.collection 
    });
  }

  /**
   * Get embedder (lazy initialization)
   */
  private async getEmbedder(): Promise<IEmbeddingProvider> {
    if (!this.embedder) {
      this.embedder = await getEmbeddingProvider(this.config.embedding.provider, {
        model: this.config.embedding.model,
        batchSize: this.config.embedding.batchSize,
      });
    }
    return this.embedder;
  }

  /**
   * Scan paths and index all markdown files
   */
  async index(options?: { force?: boolean }): Promise<number> {
    logger.info('Starting index', { paths: this.config.paths, force: options?.force });

    const files = await scanPaths(this.config.paths);
    let total = 0;
    const activeSources = new Set<string>();

    for (const file of files) {
      activeSources.add(file.path);
      const n = await this.indexFile(file.path, options?.force);
      total += n;
    }

    // Clean up stale chunks
    const storeSources = await this.store.indexedSources();
    for (const source of storeSources) {
      if (!activeSources.has(source)) {
        await this.store.deleteBySource(source);
        logger.info('Removed stale chunks', { source });
      }
    }

    logger.info('Index completed', { total, files: files.length });
    return total;
  }

  /**
   * Index a single file
   */
  async indexFile(path: string, force: boolean = false): Promise<number> {
    const embedder = await this.getEmbedder();
    const model = embedder.modelName;

    logger.debug('Indexing file', { path });

    // Read file content using standard Node.js fs/promises
    const fs = await import('fs/promises');
    const content = await fs.readFile(path, 'utf-8');

    const chunks = chunkMarkdown(content, {
      source: path,
      maxChunkSize: this.config.chunking.maxChunkSize,
      overlapLines: this.config.chunking.overlapLines,
    });

    if (chunks.length === 0) {
      logger.debug('No chunks to index', { path });
      return 0;
    }

    // Get existing hashes
    const oldIds = await this.store.hashesBySource(path);
    const chunkIds = new Set(
      chunks.map(c => computeChunkId(c.source, c.startLine, c.endLine, c.contentHash, model))
    );

    // Delete stale chunks
    const stale = Array.from(oldIds).filter(id => !chunkIds.has(id));
    if (stale.length > 0) {
      await this.store.deleteByHashes(stale);
      logger.debug('Deleted stale chunks', { count: stale.length });
    }

    if (!force) {
      // Skip existing chunks
      const existingIds = Array.from(chunkIds).filter(id => oldIds.has(id));
      if (existingIds.length === chunkIds.size) {
        logger.debug('All chunks exist, skipping', { path });
        return 0;
      }
    }

    // Embed and upsert
    return await this.embedAndStore(chunks);
  }

  /**
   * Embed chunks and store
   */
  private async embedAndStore(chunks: Chunk[]): Promise<number> {
    if (chunks.length === 0) return 0;

    const embedder = await this.getEmbedder();
    const model = embedder.modelName;
    const contents = chunks.map(c => c.content);

    logger.debug('Embedding chunks', { count: contents.length });
    const embeddings = await embedder.embed(contents);

    const records: MilvusRecord[] = chunks.map((chunk, i) => ({
      chunk_hash: computeChunkId(chunk.source, chunk.startLine, chunk.endLine, chunk.contentHash, model),
      embedding: embeddings[i]!,
      content: chunk.content,
      source: chunk.source,
      heading: chunk.heading,
      heading_level: chunk.headingLevel,
      start_line: chunk.startLine,
      end_line: chunk.endLine,
    }));

    const count = await this.store.upsert(records);
    logger.info('Embed and store completed', { count });
    return count;
  }

  /**
   * Semantic search
   */
  async search(query: string, options?: { topK?: number }): Promise<SearchResult[]> {
    const embedder = await this.getEmbedder();
    const topK = options?.topK ?? 10;

    logger.debug('Searching', { query, topK });

    const embeddings = await embedder.embed([query]);
    const embedding = embeddings[0];
    if (!embedding) {
      throw new MemSearchError('Failed to generate query embedding');
    }
    const results = await this.store.search(embedding, query, topK);

    logger.info('Search completed', { results: results.length });
    return results;
  }

  /**
   * Watch for file changes
   */
  watch(options?: { onEvent?: WatcherCallback; debounceMs?: number }): FileWatcher {
    logger.info('Starting watcher', { debounceMs: options?.debounceMs });
    return new FileWatcher(this.config.paths, async (eventType: string, filePath: string) => {
      if (eventType === 'deleted') {
        await this.store.deleteBySource(filePath);
      } else {
        await this.indexFile(filePath);
      }
      
      options?.onEvent?.(eventType, `Processed ${filePath}`, filePath);
    }, options?.debounceMs);
  }

  /**
   * Compact chunks into summary
   */
  async compact(options?: { source?: string; llmProvider?: string }): Promise<string> {
    logger.info('Compacting', { source: options?.source });
    // TODO: Implement compact logic with LLM
    return '';
  }

  /**
   * Release resources
   */
  close(): void {
    logger.info('Closing MemSearch');
    this.store.close();
  }

  /**
   * Get store instance
   */
  getStore(): MilvusStore {
    return this.store;
  }
}

/**
 * Simple file watcher
 */
class FileWatcher {
  private watcher: any = null;

  constructor(
    private paths: string[],
    private onChange: (eventType: string, filePath: string) => Promise<void>,
    private debounceMs: number = 1500
  ) {}

  async start(): Promise<void> {
    try {
      const chokidar = await import('chokidar');
      this.watcher = chokidar.default.watch(this.paths, {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: this.debounceMs },
      });

      this.watcher
        .on('add', (path: string) => this.handleChange('created', path))
        .on('change', (path: string) => this.handleChange('modified', path))
        .on('unlink', (path: string) => this.handleChange('deleted', path));

      console.log('[memsearch:watcher] Started');
    } catch (error) {
      console.warn('[memsearch:watcher] Chokidar not available, watch disabled');
    }
  }

  private async handleChange(eventType: string, path: string) {
    console.log(`[memsearch:watcher] ${eventType}: ${path}`);
    await this.onChange(eventType, path);
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[memsearch:watcher] Stopped');
    }
  }
}
