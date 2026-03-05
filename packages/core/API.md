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

**Triple Memory APIs:**

##### Memory CRUD

- **addMemory(input)**: `Promise<string>` - Add a new memory (semantic/episodic/procedural)
- **getMemory(id)**: `Promise<Memory | null>` - Retrieve a memory by ID
- **updateMemory(id, updates)**: `Promise<void>` - Update an existing memory
- **deleteMemory(id)**: `Promise<void>` - Delete a memory

##### Memory Search

- **searchMemory(query, options?)**: `Promise<MemorySearchResult[]>` - Search memories with optional type filter
- **getStats()**: `Promise<MemoryStats>` - Get memory statistics
- **addMemories(inputs)**: `Promise<string[]>` - Batch add memories

##### Relations

- **addRelation(fromId, relation)**: `Promise<string>` - Add a relation between memories
- **getRelations(id)**: `Promise<MemoryRelation[]>` - Get all relations for a memory
- **deleteRelation(relationId)**: `Promise<void>` - Delete a relation

##### Graph Traversal

- **getNeighbors(id, options?)**: `Promise<Memory[]>` - Get neighboring memories (BFS)
- **findPath(fromId, toId)**: `Promise<string[] | null>` - Find path between two memories

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

### MemoryType

```typescript
type MemoryType = 'semantic' | 'episodic' | 'procedural' | 'chunk';
```

### Memory

```typescript
interface Memory {
  id: string;
  memoryType: MemoryType;
  content: string;
  source?: string;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  importance: number;
  nodeType?: string;
  label?: string;
  data: Record<string, any>;
  relations: MemoryRelation[];
}
```

### SemanticMemory

```typescript
interface SemanticMemory extends Memory {
  memoryType: 'semantic';
  nodeType?: SemanticNodeType;
}
```

### EpisodicMemory

```typescript
interface EpisodicMemory extends Memory {
  memoryType: 'episodic';
  episodeType?: EpisodeType;
  timestamp?: number;
  duration?: number;
  outcome?: 'success' | 'failure' | 'partial';
}
```

### ProceduralMemory

```typescript
interface ProceduralMemory extends Memory {
  memoryType: 'procedural';
  skillType?: SkillType;
  steps?: string[];
  prerequisites?: string[];
  successRate?: number;
}
```

### MemoryInput

```typescript
interface MemoryInput {
  type: MemoryType;
  content: string;
  source?: string;
  importance?: number;
  nodeType?: string;
  label?: string;
  data?: Record<string, any>;
  episodeType?: string;
  skillType?: string;
}
```

### MemorySearchOptions

```typescript
interface MemorySearchOptions {
  topK?: number;
  memoryType?: MemoryType;
  nodeType?: string;
  minImportance?: number;
  timeDecayWeight?: number; // Default: 0.3 (0-1)
  timeDecayHalfLife?: number; // Default: 604800000 (7 days in ms)
}
```

### MemorySearchResult

```typescript
interface MemorySearchResult {
  memory: Memory;
  score: number; // Semantic similarity (0-1, lower = better)
  timeScore: number; // Time decay score (0-1, higher = more recent)
  combinedScore: number; // Combined score (0-1, higher = better)
}
```

### MemoryStats

```typescript
interface MemoryStats {
  total: number;
  byType: {
    semantic: number;
    episodic: number;
    procedural: number;
    chunk: number;
  };
  avgImportance: number;
}
```

### RelationInput

```typescript
interface RelationInput {
  targetId: string;
  type: RelationType;
  weight?: number;
  confidence?: number;
}
```

### MemoryRelation

```typescript
interface MemoryRelation {
  id: string;
  type: RelationType;
  targetId: string;
  weight: number;
  confidence?: number;
}
```

### SemanticNodeType

```typescript
type SemanticNodeType = 'concept' | 'entity' | 'rule' | 'pattern' | 'api' | 'type';
```

### EpisodeType

```typescript
type EpisodeType = 'task' | 'error' | 'learning' | 'decision' | 'observation' | 'bugfix';
```

### SkillType

```typescript
type SkillType = 'workflow' | 'template' | 'pattern' | 'heuristic';
```

### RelationType

```typescript
type RelationType =
  | 'relates_to'
  | 'derived_from'
  | 'caused'
  | 'follows'
  | 'contains'
  | 'applied'
  | 'links_to'
  | 'next';
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

### calculateTimeScore

```typescript
import { calculateTimeScore } from 'memsearch-core';

// Calculate time decay score for a memory
const timeScore = calculateTimeScore(
  createdAt: number,      // Timestamp (ms since epoch)
  halfLifeMs: number       // Half-life in ms (default: 7 days)
);
// Returns: 0-1 (1 = very recent, 0 = very old)
```

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

## Triple Memory Usage

### Adding Memories

```typescript
const mem = new MemSearch({ ... });

// Add semantic memory (concepts, facts)
const conceptId = await mem.addMemory({
  type: 'semantic',
  content: 'Redis is an in-memory data store',
  label: 'Redis',
  nodeType: 'concept',
  importance: 0.8,
});

// Add episodic memory (events, experiences)
const episodeId = await mem.addMemory({
  type: 'episodic',
  content: 'Fixed production outage by restarting Redis',
  episodeType: 'bugfix',
  importance: 0.9,
  data: { duration: 30, outcome: 'success' },
});

// Add procedural memory (workflows, procedures)
const workflowId = await mem.addMemory({
  type: 'procedural',
  content: 'Database backup procedure',
  skillType: 'workflow',
  data: {
    steps: ['Stop writes', 'Create snapshot', 'Upload to S3', 'Resume writes'],
  },
});
```

### Searching Memories

```typescript
// Search all memories
const results = await mem.searchMemory('database caching', { topK: 5 });

// Filter by type
const concepts = await mem.searchMemory('redis', { memoryType: 'semantic' });
const experiences = await mem.searchMemory('outage', { memoryType: 'episodic' });

// Time decay search (default: 0.3 weight, 7-day half-life)
const recentResults = await mem.searchMemory('recent work', {
  topK: 10,
  timeDecayWeight: 0.5, // Equal weight to semantics and recency
  timeDecayHalfLife: 259200000, // 3 days in ms
});

// Results have timeScore and combinedScore
console.log(recentResults[0].score); // Semantic similarity
console.log(recentResults[0].timeScore); // Time decay score
console.log(recentResults[0].combinedScore); // Weighted combination

// Get statistics
const stats = await mem.getStats();
console.log(`Total: ${stats.total}, Semantic: ${stats.byType.semantic}`);
```

### Managing Relations

```typescript
// Link episode to concept
await mem.addRelation(episodeId, {
  targetId: conceptId,
  type: 'applied',
  weight: 0.9,
});

// Get related memories
const relations = await mem.getRelations(episodeId);
```

### Graph Traversal

```typescript
// Get 1-hop neighbors
const neighbors = await mem.getNeighbors(conceptId, { depth: 1 });

// Get 3-hop neighbors
const extended = await mem.getNeighbors(conceptId, { depth: 3 });

// Find path between memories
const path = await mem.findPath(startId, endId);
if (path) {
  console.log(`Path found: ${path.join(' -> ')}`);
}
```

## Errors

All errors extend `MemSearchError`:

- **ConfigError** - Configuration validation failures
- **MilvusError** - Milvus operation failures
- **EmbeddingError** - Embedding API failures
- **FileSystemError** - File operation failures
- **ChunkingError** - Markdown chunking failures
- **WatcherError** - File watcher failures
