/**
 * Core type definitions for memsearch-ts
 */

/** A single chunk extracted from a markdown document */
export interface Chunk {
  content: string;
  source: string;
  heading: string;
  headingLevel: number;
  startLine: number;
  endLine: number;
  contentHash: string;
}

/** Scanned file information */
export interface ScannedFile {
  path: string;
  mtime: number;
  size: number;
}

/** Embedding provider interface */
export interface EmbeddingProvider {
  readonly modelName: string;
  readonly dimension: number;
  embed(texts: string[]): Promise<number[][]>;
}

/** Search result */
export interface SearchResult {
  content: string;
  source: string;
  heading: string;
  score: number;
  startLine: number;
  endLine: number;
}

/** Configuration interfaces */
export interface MemSearchConfig {
  paths?: string[];
  embedding?: {
    provider: 'openai' | 'google' | 'ollama' | 'voyage';
    model?: string;
    batchSize?: number;
  };
  milvus: {
    uri: string;
    token?: string;
    collection: string;
  };
  chunking?: {
    maxChunkSize?: number;
    overlapLines?: number;
  };
}

/** File watcher event callback */
export type WatcherCallback = (
  eventType: string,
  summary: string,
  filePath: string
) => void;

// Re-export all types and utilities
export * from './chunk.js';
export * from './config.js';
export * from './errors.js';
export * from './validation.js';
