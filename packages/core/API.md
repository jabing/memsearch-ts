# memsearch-core API Reference

## Classes

### MemSearch

Main class for semantic memory search.

```typescript
import { MemSearch } from 'memsearch-core';

const mem = new MemSearch({
  paths?: string[];
  embedding?: { provider: 'openai' | 'google' | 'ollama' | 'voyage'; model?: string; batchSize?: number; };
  milvus: { uri: string; token?: string; collection: string; };
  chunking?: { maxChunkSize?: number; overlapLines?: number; };
});
```

#### Methods

- **index(options?)**: `Promise<number>` - Index markdown files
- **indexFile(path, force?)**: `Promise<number>` - Index single file
- **search(query, options?)**: `Promise<SearchResult[]>` - Semantic search
- **watch(options?)**: `FileWatcher` - Watch for file changes
- **compact(options?)**: `Promise<string>` - Compact chunks (TODO)
- **close()**: `void` - Release resources
- **getStore()**: `MilvusStore` - Get store instance

### MilvusStore

Milvus vector database wrapper.

```typescript
import { MilvusStore } from 'memsearch-core';

const store = new MilvusStore({
  uri: string;
  token?: string;
  collection: string;
  dimension?: number;
});
```

#### Methods

- **ensureCollection()**: `Promise<void>` - Create collection if needed
- **upsert(records)**: `Promise<number>` - Insert/update records
- **search(vector, topK?)**: `Promise<SearchResult[]>` - Vector search
- **query(filter, limit?)**: `Promise<any[]>` - Filter query
- **deleteBySource(source)**: `Promise<void>` - Delete by source
- **deleteByHashes(hashes)**: `Promise<void>` - Delete by hashes
- **count()**: `Promise<number>` - Count chunks
- **close()**: `void` - Close connection
- **reset()**: `Promise<void>` - Drop collection

## Types

### SearchResult

```typescript
interface SearchResult {
  content: string;
  source: string;
  heading: string;
  score: number;
  startLine: number;
  endLine: number;
}
```

### Chunk

```typescript
interface Chunk {
  content: string;
  source: string;
  heading: string;
  headingLevel: number;
  startLine: number;
  endLine: number;
  contentHash: string;
}
```

## Embedding Providers

### OpenAI

```typescript
import { OpenAIEmbedding } from 'memsearch-core';

const embedder = new OpenAIEmbedding({
  model?: string;  // default: 'text-embedding-3-small'
  batchSize?: number;  // default: 2048
});

const embeddings = await embedder.embed(['text1', 'text2']);
```

### Google

```typescript
import { GoogleEmbedding } from 'memsearch-core';

const embedder = new GoogleEmbedding({
  model?: string;  // default: 'gemini-embedding-001'
  batchSize?: number;  // default: 100
});
```

### Ollama

```typescript
import { OllamaEmbedding } from 'memsearch-core';

const embedder = new OllamaEmbedding({
  model?: string;  // default: 'nomic-embed-text'
  batchSize?: number;  // default: 512
});
```

### Voyage

```typescript
import { VoyageEmbedding } from 'memsearch-core';

const embedder = new VoyageEmbedding({
  model?: string;  // default: 'voyage-3-lite'
  batchSize?: number;  // default: 512
});
```

## Utilities

### chunkMarkdown

```typescript
import { chunkMarkdown } from 'memsearch-core';

const chunks = chunkMarkdown('# Title\n\nContent', {
  source: 'file.md',
  maxChunkSize?: number;
  overlapLines?: number;
});
```

### scanPaths

```typescript
import { scanPaths } from 'memsearch-core';

const files = await scanPaths(['./docs', './memory']);
```

### getEmbeddingProvider

```typescript
import { getEmbeddingProvider } from 'memsearch-core';

const provider = await getEmbeddingProvider('openai', {
  model?: string;
  batchSize?: number;
});
```

## Errors

All errors extend `MemSearchError`:

- **ConfigError** - Configuration validation failures
- **MilvusError** - Milvus operation failures
- **EmbeddingError** - Embedding API failures
- **FileSystemError** - File operation failures
- **ChunkingError** - Markdown chunking failures
- **WatcherError** - File watcher failures
