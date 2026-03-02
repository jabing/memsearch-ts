# Triple Memory API Documentation Plan

## Goal

Add comprehensive API documentation for the new triple memory features to `packages/core/API.md`.

## What to Add

### 1. Update MemSearch Methods Section

After line 28 in `packages/core/API.md`, add:

```markdown
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
```

### 2. Add New Types Section

After the existing `Chunk` interface (around line 84), add:

````markdown
### MemoryType

```typescript
type MemoryType = 'semantic' | 'episodic' | 'procedural' | 'chunk';
```
````

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
  nodeType?: SemanticNodeType; // 'concept' | 'entity' | 'rule' | 'pattern' | 'api' | 'type'
}
```

### EpisodicMemory

```typescript
interface EpisodicMemory extends Memory {
  memoryType: 'episodic';
  episodeType?: EpisodeType; // 'task' | 'error' | 'learning' | 'decision' | 'observation'
  timestamp?: number;
  duration?: number;
  outcome?: 'success' | 'failure' | 'partial';
}
```

### ProceduralMemory

```typescript
interface ProceduralMemory extends Memory {
  memoryType: 'procedural';
  skillType?: SkillType; // 'workflow' | 'template' | 'pattern' | 'heuristic'
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
  importance?: number; // 0-1, default 0.5
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
  topK?: number; // default 10
  memoryType?: MemoryType;
  nodeType?: string;
  minImportance?: number;
}
```

### MemorySearchResult

```typescript
interface MemorySearchResult {
  memory: Memory;
  score: number;
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
  type: RelationType; // 'relates_to' | 'derived_from' | 'caused' | 'follows' | 'contains' | etc.
  weight?: number; // 0-1
  confidence?: number; // 0-1
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

````

### 3. Add Usage Examples

Add a new section at the end:

```markdown
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
````

### Searching Memories

```typescript
// Search all memories
const results = await mem.searchMemory('database caching', { topK: 5 });

// Filter by type
const concepts = await mem.searchMemory('redis', { memoryType: 'semantic' });
const experiences = await mem.searchMemory('outage', { memoryType: 'episodic' });

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

// Get 3-hop neighbors (concept -> related concepts)
const extended = await mem.getNeighbors(conceptId, { depth: 3 });

// Find path between two memories
const path = await mem.findPath(startId, endId);
if (path) {
  console.log(`Path found: ${path.join(' -> ')}`);
}
```

```

## Files to Modify

- `packages/core/API.md` - Add documentation sections

## Verification

- Markdown renders correctly
- All type references are accurate
- Examples are valid TypeScript

## Commit Message

```

docs(api): add triple memory API documentation

```

```
