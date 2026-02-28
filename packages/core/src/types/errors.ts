/** Error handling for memsearch-ts */

export class MemSearchError extends Error {
  public readonly code?: string;
  public readonly cause?: unknown;
  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = 'MemSearchError';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const ConfigErrorCodes = {
  INVALID_PROVIDER: 'CONFIG_INVALID_PROVIDER',
  MISSING_API_KEY: 'CONFIG_MISSING_API_KEY',
  INVALID_PATH: 'CONFIG_INVALID_PATH',
  INVALID_MILVUS_URI: 'CONFIG_INVALID_MILVUS_URI',
  VALIDATION_FAILED: 'CONFIG_VALIDATION_FAILED',
} as const;

export class ConfigError extends MemSearchError {
  constructor(message: string, code: string = ConfigErrorCodes.VALIDATION_FAILED, cause?: unknown) {
    super(message, code, cause);
    this.name = 'ConfigError';
  }
}

export const MilvusErrorCodes = {
  CONNECTION_FAILED: 'MILVUS_CONNECTION_FAILED',
  COLLECTION_NOT_FOUND: 'MILVUS_COLLECTION_NOT_FOUND',
  INDEX_FAILED: 'MILVUS_INDEX_FAILED',
  SEARCH_FAILED: 'MILVUS_SEARCH_FAILED',
  UPSERT_FAILED: 'MILVUS_UPSERT_FAILED',
  DIMENSION_MISMATCH: 'MILVUS_DIMENSION_MISMATCH',
  DELETE_FAILED: 'MILVUS_DELETE_FAILED',
  QUERY_FAILED: 'MILVUS_QUERY_FAILED',
} as const;

export type MilvusErrorCode = typeof MilvusErrorCodes[keyof typeof MilvusErrorCodes];

export class MilvusError extends MemSearchError {
  constructor(message: string, code: string = MilvusErrorCodes.CONNECTION_FAILED, cause?: unknown) {
    super(message, code, cause);
    this.name = 'MilvusError';
  }
}

export const EmbeddingErrorCodes = {
  API_KEY_MISSING: 'EMBEDDING_API_KEY_MISSING',
  API_ERROR: 'EMBEDDING_API_ERROR',
  RATE_LIMIT: 'EMBEDDING_RATE_LIMIT',
  MODEL_NOT_FOUND: 'EMBEDDING_MODEL_NOT_FOUND',
  DIMENSION_ERROR: 'EMBEDDING_DIMENSION_ERROR',
  BATCH_FAILED: 'EMBEDDING_BATCH_FAILED',
} as const;

export type EmbeddingErrorCode = typeof EmbeddingErrorCodes[keyof typeof EmbeddingErrorCodes];

export class EmbeddingError extends MemSearchError {
  constructor(message: string, code: string = EmbeddingErrorCodes.API_ERROR, cause?: unknown) {
    super(message, code, cause);
    this.name = 'EmbeddingError';
  }
}

export const FileSystemErrorCodes = {
  FILE_NOT_FOUND: 'FS_FILE_NOT_FOUND',
  PERMISSION_DENIED: 'FS_PERMISSION_DENIED',
  INVALID_PATH: 'FS_INVALID_PATH',
  READ_FAILED: 'FS_READ_FAILED',
  WRITE_FAILED: 'FS_WRITE_FAILED',
} as const;

export class FileSystemError extends MemSearchError {
  constructor(message: string, code: string = FileSystemErrorCodes.READ_FAILED, cause?: unknown) {
    super(message, code, cause);
    this.name = 'FileSystemError';
  }
}

export const ChunkingErrorCodes = {
  INVALID_MARKDOWN: 'CHUNKING_INVALID_MARKDOWN',
  CHUNK_TOO_LARGE: 'CHUNKING_CHUNK_TOO_LARGE',
  ENCODING_ERROR: 'CHUNKING_ENCODING_ERROR',
} as const;

export class ChunkingError extends MemSearchError {
  constructor(message: string, code: string = ChunkingErrorCodes.INVALID_MARKDOWN, cause?: unknown) {
    super(message, code, cause);
    this.name = 'ChunkingError';
  }
}

export const WatcherErrorCodes = {
  WATCH_FAILED: 'WATCHER_WATCH_FAILED',
  DEBOUNCE_ERROR: 'WATCHER_DEBOUNCE_ERROR',
  EVENT_ERROR: 'WATCHER_EVENT_ERROR',
} as const;

export class WatcherError extends MemSearchError {
  constructor(message: string, code: string = WatcherErrorCodes.WATCH_FAILED, cause?: unknown) {
    super(message, code, cause);
    this.name = 'WatcherError';
  }
}

/**
 * Wrap a function with error context
 * Adds context information to errors for better debugging
 */
export function withErrorContext<T>(
  fn: () => T,
  context: Record<string, unknown>
): T {
  try {
    return fn();
  } catch (error) {
    const err = error as Error;
    throw new MemSearchError(
      `${err.message} (context: ${JSON.stringify(context)})`,
      undefined,
      error
    );
  }
}

/**
 * Wrap an async function with error context
 * Adds context information to errors for better debugging
 */
export async function withErrorContextAsync<T>(
  fn: () => Promise<T>,
  context: Record<string, unknown>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const err = error as Error;
    throw new MemSearchError(
      `${err.message} (context: ${JSON.stringify(context)})`,
      undefined,
      error
    );
  }
}
