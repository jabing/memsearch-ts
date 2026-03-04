/**
 * MemSearch - High-level API for semantic memory search
 */

import { validateConfig } from './types/config.js';
import type {
  MemSearchConfig,
  SearchResult,
  WatcherCallback,
  Chunk,
  MemoryInput,
  Memory,
  MemorySearchOptions,
  MemorySearchResult,
  MemoryStats,
  RelationInput,
  MemoryRelation,
} from './types/index.js';
import { MemSearchError } from './types/errors.js';
import {
  getEmbeddingProvider,
  type IEmbeddingProvider,
  KNOWN_DIMENSIONS,
} from './embeddings/index.js';
import { createVectorStore, type IVectorStore, type MilvusRecord } from './store/index.js';
import { MemoryGraph } from './graph.js';
import { chunkMarkdown, computeChunkId } from './index.js';
import { scanPaths } from './scanner.js';
import { createLogger, setGlobalLogLevel } from './utils/logger.js';

const logger = createLogger('memsearch');

export class MemSearch {
  private config: Required<MemSearchConfig>;
  private embedder: IEmbeddingProvider | null = null;
  private store: IVectorStore;
  private graph: MemoryGraph;

  constructor(config: MemSearchConfig) {
    this.config = validateConfig(config);

    if (this.config.logLevel) {
      setGlobalLogLevel(this.config.logLevel);
    }

    const vectorStoreOptions: Parameters<typeof createVectorStore>[0] = {};
    const embeddingModel = this.config.embedding.model as string;
    const dimension = KNOWN_DIMENSIONS[embeddingModel];

    if (dimension) {
      vectorStoreOptions.dimension = dimension;
    }

    if (this.config.vectorStore) {
      if (this.config.vectorStore.provider === 'milvus' && this.config.vectorStore.milvus?.uri) {
        vectorStoreOptions.milvus = {
          uri: this.config.vectorStore.milvus.uri,
          token: this.config.vectorStore.milvus.token,
          collection: this.config.vectorStore.milvus.collection || 'memsearch_chunks',
        };
      } else if (this.config.vectorStore.provider === 'lancedb') {
        vectorStoreOptions.lancedb = {
          uri: this.config.vectorStore.lancedb.uri,
          table: this.config.vectorStore.lancedb.table,
        };
      }
    } else if (config.milvus?.uri) {
      vectorStoreOptions.milvus = {
        uri: this.config.milvus.uri as string,
        token: this.config.milvus.token,
        collection: this.config.milvus.collection as string,
      };
    }

    this.store = createVectorStore(vectorStoreOptions);
    this.graph = new MemoryGraph();

    const provider = vectorStoreOptions.milvus?.uri ? 'milvus' : 'lancedb';
    const collection =
      vectorStoreOptions.milvus?.collection ||
      vectorStoreOptions.lancedb?.table ||
      'memsearch_chunks';

    logger.info('MemSearch initialized', {
      embeddingProvider: this.config.embedding.provider,
      vectorStoreProvider: provider,
      collection,
      dimension,
    });
  }

  private async getEmbedder(): Promise<IEmbeddingProvider> {
    if (!this.embedder) {
      this.embedder = await getEmbeddingProvider(this.config.embedding.provider, {
        model: this.config.embedding.model,
        batchSize: this.config.embedding.batchSize,
      });
    }
    return this.embedder;
  }

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

  async indexFile(path: string, force: boolean = false): Promise<number> {
    const embedder = await this.getEmbedder();
    const model = embedder.modelName;

    logger.debug('Indexing file', { path });

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

    const oldIds = await this.store.hashesBySource(path);
    const chunkIds = new Set(
      chunks.map((c) => computeChunkId(c.source, c.startLine, c.endLine, c.contentHash, model))
    );

    const stale = Array.from(oldIds).filter((id) => !chunkIds.has(id));
    if (stale.length > 0) {
      await this.store.deleteByHashes(stale);
      logger.debug('Deleted stale chunks', { count: stale.length });
    }

    if (!force) {
      const existingIds = Array.from(chunkIds).filter((id) => oldIds.has(id));
      if (existingIds.length === chunkIds.size) {
        logger.debug('All chunks exist, skipping', { path });
        return 0;
      }
    }

    return await this.embedAndStore(chunks);
  }

  private async embedAndStore(chunks: Chunk[]): Promise<number> {
    if (chunks.length === 0) return 0;

    const embedder = await this.getEmbedder();
    const model = embedder.modelName;
    const contents = chunks.map((c) => c.content);

    logger.debug('Embedding chunks', { count: contents.length });
    const embeddings = await embedder.embed(contents);

    const records: MilvusRecord[] = chunks.map((chunk, i) => ({
      chunk_hash: computeChunkId(
        chunk.source,
        chunk.startLine,
        chunk.endLine,
        chunk.contentHash,
        model
      ),
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

  async search(query: string, options?: { topK?: number }): Promise<SearchResult[]> {
    const embedder = await this.getEmbedder();
    const topK = options?.topK ?? 10;

    logger.debug('Searching', { query, topK });

    const embeddings = await embedder.embed([query]);
    const embedding = embeddings[0];
    if (!embedding) {
      throw new MemSearchError('Failed to generate query embedding');
    }
    const results = await this.store.search(embedding, { topK });

    logger.info('Search completed', { results: results.length });
    return results;
  }

  watch(options?: { onEvent?: WatcherCallback; debounceMs?: number }): FileWatcher {
    logger.info('Starting watcher', { debounceMs: options?.debounceMs });
    return new FileWatcher(
      this.config.paths,
      async (eventType: string, filePath: string) => {
        if (eventType === 'deleted') {
          await this.store.deleteBySource(filePath);
        } else {
          await this.indexFile(filePath);
        }

        options?.onEvent?.(eventType, `Processed ${filePath}`, filePath);
      },
      options?.debounceMs
    );
  }

  async compact(options?: { source?: string; llmProvider?: string }): Promise<string> {
    logger.info('Compacting', { source: options?.source });
    return '';
  }

  close(): void {
    logger.info('Closing MemSearch');
    this.store.close();
  }

  getStore(): IVectorStore {
    return this.store;
  }

  getGraph(): MemoryGraph {
    return this.graph;
  }

  // ============================================================================
  // Triple Memory API
  // ============================================================================

  async addMemory(input: MemoryInput): Promise<string> {
    const embedder = await this.getEmbedder();
    const embeddings = await embedder.embed([input.content]);
    const embedding = embeddings[0]!;

    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    const record: MilvusRecord = {
      chunk_hash: id,
      embedding,
      content: input.content,
      source: input.source || 'memory',
      heading: input.label || '',
      heading_level: 0,
      start_line: 0,
      end_line: 0,
      memory_type: input.type,
      node_type: input.nodeType,
      label: input.label,
      importance: input.importance ?? 0.5,
      memory_data: input.data ? JSON.stringify(input.data) : undefined,
      relations: input.relations ? JSON.stringify(input.relations) : undefined,
      created_at: now,
      updated_at: now,
      access_count: 0,
    };

    await this.store.upsert([record]);

    if (input.relations && input.relations.length > 0) {
      this.graph.addNode(id, { type: input.type, label: input.label });
      for (const rel of input.relations) {
        this.graph.addEdge(id, rel.targetId, {
          type: rel.type,
          weight: rel.weight ?? 0.5,
          confidence: rel.confidence,
        });
      }
    }

    logger.info('Memory added', { id, type: input.type });
    return id;
  }

  async getMemory(id: string): Promise<Memory | null> {
    const results = await this.store.query(`chunk_hash == "${id}"`, 1);
    if (!results.length) return null;
    return this.recordToMemory(results[0]);
  }

  async updateMemory(id: string, updates: Partial<MemoryInput>): Promise<void> {
    const existing = await this.getMemory(id);
    if (!existing) {
      throw new MemSearchError(`Memory not found: ${id}`);
    }

    let embedding: number[] | undefined;
    if (updates.content && updates.content !== existing.content) {
      const embedder = await this.getEmbedder();
      const embeddings = await embedder.embed([updates.content]);
      embedding = embeddings[0]!;
    }

    const record: MilvusRecord = {
      chunk_hash: id,
      embedding: embedding!,
      content: updates.content ?? existing.content,
      source: updates.source ?? existing.source ?? 'memory',
      heading: updates.label ?? (existing as any).label ?? '',
      heading_level: 0,
      start_line: 0,
      end_line: 0,
      memory_type: updates.type ?? existing.memoryType,
      node_type: updates.nodeType ?? (existing as any).nodeType,
      label: updates.label ?? (existing as any).label,
      importance: updates.importance ?? existing.importance,
      memory_data: updates.data ? JSON.stringify(updates.data) : undefined,
      relations: updates.relations ? JSON.stringify(updates.relations) : undefined,
      updated_at: Date.now(),
    };

    await this.store.upsert([record]);
    logger.info('Memory updated', { id });
  }

  async deleteMemory(id: string): Promise<void> {
    await this.store.deleteByHashes([id]);
    this.graph.removeNode(id);
    logger.info('Memory deleted', { id });
  }

  async searchMemory(query: string, options?: MemorySearchOptions): Promise<MemorySearchResult[]> {
    const embedder = await this.getEmbedder();
    const topK = options?.topK ?? 10;

    const embeddings = await embedder.embed([query]);
    const embedding = embeddings[0]!;

    const filters: string[] = [];
    if (options?.memoryType) {
      filters.push(`memory_type == "${options.memoryType}"`);
    }
    if (options?.nodeType) {
      filters.push(`node_type == "${options.nodeType}"`);
    }
    const filter = filters.length > 0 ? filters.join(' and ') : undefined;

    const results = await this.store.searchWithFilter(embedding, filter, topK);

    return results.map((r: any) => ({
      memory: this.recordToMemory(r),
      score: r.score ?? 0,
    }));
  }

  async getStats(): Promise<MemoryStats> {
    const total = await this.store.count();
    return {
      total,
      byType: { semantic: 0, episodic: 0, procedural: 0, chunk: 0 },
      avgImportance: 0,
    };
  }

  async addMemories(inputs: MemoryInput[]): Promise<string[]> {
    const ids: string[] = [];
    for (const input of inputs) {
      ids.push(await this.addMemory(input));
    }
    return ids;
  }

  // ============================================================================
  // Relation API
  // ============================================================================

  async addRelation(fromId: string, relation: RelationInput): Promise<string> {
    const edgeId = this.graph.addEdge(fromId, relation.targetId, {
      type: relation.type,
      weight: relation.weight ?? 0.5,
      confidence: relation.confidence,
    });
    logger.info('Relation added', { fromId, toId: relation.targetId });
    return edgeId;
  }

  async getRelations(id: string): Promise<MemoryRelation[]> {
    const edges = this.graph.getRelations(id);
    return edges.map((e) => ({
      id: e.id,
      type: e.type,
      targetId: e.toId,
      weight: e.weight,
      confidence: e.confidence,
    }));
  }

  async deleteRelation(relationId: string): Promise<void> {
    this.graph.removeEdge(relationId);
    logger.info('Relation deleted', { relationId });
  }

  // ============================================================================
  // Graph Traversal API
  // ============================================================================

  async getNeighbors(id: string, options?: { depth?: number }): Promise<Memory[]> {
    const neighborIds = this.graph.getNeighbors(id, { depth: options?.depth ?? 1 });
    const memories: Memory[] = [];
    for (const nid of neighborIds) {
      const mem = await this.getMemory(nid);
      if (mem) memories.push(mem);
    }
    return memories;
  }

  async findPath(fromId: string, toId: string): Promise<string[] | null> {
    return this.graph.findPath(fromId, toId);
  }

  private recordToMemory(record: any): Memory {
    return {
      id: record.chunk_hash,
      memoryType: record.memory_type || 'chunk',
      content: record.content,
      source: record.source,
      createdAt: record.created_at || Date.now(),
      updatedAt: record.updated_at || Date.now(),
      accessCount: record.access_count || 0,
      importance: record.importance ?? 0.5,
      nodeType: record.node_type,
      label: record.label || '',
      data: record.memory_data ? JSON.parse(record.memory_data) : {},
      relations: record.relations ? JSON.parse(record.relations) : [],
    } as Memory;
  }
}

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
