# 改进计划：memsearch-core 三元记忆支持

## 决策摘要

| 决策项      | 选择                                   |
| ----------- | -------------------------------------- |
| 改进位置    | **memsearch-core**                     |
| Schema 设计 | **统一 Collection** (memory_type 区分) |
| 关系存储    | JSON 字段 + 可选图谱 Collection        |

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                memsearch-core v2 (改进后)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MemSearch API                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 现有 API:                                            │   │
│  │ • index(paths) → 索引 markdown 文件                │   │
│  │ • search(query, topK) → 语义搜索                   │   │
│  │ • watch(paths) → 文件监听                          │   │
│  │ • close() → 关闭连接                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🆕 新增 API:                                         │   │
│  │ • addMemory(input) → 添加三元记忆                   │   │
│  │ • getMemory(id) → 获取记忆                         │   │
│  │ • updateMemory(id, updates) → 更新记忆             │   │
│  │ • deleteMemory(id) → 删除记忆                      │   │
│  │ • searchMemory(query, options) → 按类型搜索        │   │
│  │ • addRelation(fromId, relation) → 添加关系         │   │
│  │ • getRelations(id) → 获取关系                      │   │
│  │ • findPath(fromId, toId) → 查找路径               │   │
│  │ • getNeighbors(id, depth) → 获取邻居              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  MilvusStore (统一 Collection)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 基础字段:                                            │   │
│  │ • id (PK) • embedding • sparse_vector • content    │   │
│  │ • source • created_at • updated_at                 │   │
│  │                                                     │   │
│  │ 三元记忆字段:                                        │   │
│  │ • memory_type (semantic/episodic/procedural)       │   │
│  │ • node_type • label • importance                   │   │
│  │ • memory_data (JSON) • relations (JSON)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  jclaw 直接使用扩展后的 API                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 数据模型

### 2.1 统一 Collection Schema

```typescript
// 统一 Schema - 支持所有记忆类型
const MEMORY_SCHEMA = {
  // === 基础字段 (所有类型通用) ===
  id: {
    type: 'VARCHAR',
    max_length: 64,
    primary_key: true,
  },
  embedding: {
    type: 'FLOAT_VECTOR',
    dim: 1536, // OpenAI text-embedding-3-small
  },
  sparse_vector: {
    type: 'SPARSE_FLOAT_VECTOR', // BM25
  },
  content: {
    type: 'VARCHAR',
    max_length: 65535,
    enable_analyzer: true,
  },
  source: {
    type: 'VARCHAR',
    max_length: 1024,
  },
  created_at: {
    type: 'INT64',
  },
  updated_at: {
    type: 'INT64',
  },
  access_count: {
    type: 'INT64',
  },

  // === 三元记忆字段 ===
  memory_type: {
    type: 'VARCHAR',
    max_length: 16, // 'semantic' | 'episodic' | 'procedural' | 'chunk'
  },
  importance: {
    type: 'FLOAT',
  },

  // 语义记忆
  node_type: {
    type: 'VARCHAR',
    max_length: 32,
  },
  label: {
    type: 'VARCHAR',
    max_length: 256,
  },

  // JSON 字段 (存储类型特定数据)
  memory_data: {
    type: 'VARCHAR',
    max_length: 65535,
  },
  relations: {
    type: 'VARCHAR',
    max_length: 65535,
  },
};

// 索引
const INDEXES = [
  { field_name: 'embedding', index_type: 'FLAT', metric_type: 'COSINE' },
  {
    field_name: 'sparse_vector',
    index_type: 'SPARSE_INVERTED_INDEX',
    metric_type: 'BM25',
  },
];
```

### 2.2 TypeScript 类型定义

```typescript
// === 基础类型 ===

type MemoryType = 'semantic' | 'episodic' | 'procedural' | 'chunk';

interface BaseMemory {
  id: string;
  memoryType: MemoryType;
  content: string;
  embedding?: number[];
  source?: string;
  createdAt: number;
  updatedAt: number;
  accessCount: number;
  importance: number;
}

// === 语义记忆 ===

type SemanticNodeType =
  | 'concept'
  | 'entity'
  | 'rule'
  | 'pattern'
  | 'api'
  | 'type';

interface SemanticMemory extends BaseMemory {
  memoryType: 'semantic';
  nodeType: SemanticNodeType;
  label: string;
  data: {
    properties?: Record<string, unknown>;
    source?: {
      type: 'documentation' | 'code' | 'conversation' | 'learning';
      uri?: string;
      line?: number;
    };
  };
  relations: MemoryRelation[];
}

// === 情景记忆 ===

type EpisodeType =
  | 'task_execution'
  | 'error_recovery'
  | 'learning'
  | 'decision'
  | 'exploration';

interface EpisodicMemory extends BaseMemory {
  memoryType: 'episodic';
  data: {
    episodeType: EpisodeType;
    timestamp: number;
    duration?: number;
    context: {
      task?: { id: string; prompt: string };
      environment?: { cwd?: string; files?: string[] };
    };
    actions: Array<{
      action: string;
      actionType: string;
      success: boolean;
      timestamp: number;
    }>;
    outcome: {
      status: 'success' | 'failure' | 'partial' | 'cancelled';
      summary: string;
      metrics?: Record<string, number>;
    };
    lessons: Array<{
      type: 'success_pattern' | 'failure_pattern' | 'best_practice';
      description: string;
    }>;
  };
  relations: {
    relatedEpisodes: string[];
    involvedConcepts: string[];
    usedSkills: string[];
  };
}

// === 程序记忆 ===

type SkillType = 'workflow' | 'template' | 'pattern' | 'heuristic' | 'macro';

interface ProceduralMemory extends BaseMemory {
  memoryType: 'procedural';
  label: string; // 技能名称
  data: {
    skillType: SkillType;
    description: string;
    triggers: Array<{
      type: 'keyword' | 'context' | 'event';
      condition: string;
      priority: number;
    }>;
    steps: Array<{
      order: number;
      action: string;
      actionType: string;
      parameters?: Record<string, unknown>;
    }>;
    stats: {
      totalExecutions: number;
      successCount: number;
      successRate: number;
      avgDuration: number;
      lastExecuted?: number;
    };
    evolution: {
      version: number;
      generation: number;
      parentSkill?: string;
      fitnessScore: number;
    };
    dependencies: {
      requiredSkills: string[];
      requiredConcepts: string[];
    };
  };
}

// === 关系 ===

type RelationType =
  | 'is_a'
  | 'has_part'
  | 'instance_of'
  | 'depends_on'
  | 'uses'
  | 'implements'
  | 'related_to'
  | 'similar_to'
  | 'causes'
  | 'prevents'
  | 'precedes'
  | 'follows';

interface MemoryRelation {
  id: string;
  type: RelationType;
  targetId: string;
  weight: number;
  confidence?: number;
  inferred?: boolean;
}
```

---

## 3. API 设计

### 3.1 新增方法

```typescript
// memsearch.ts

export class MemSearch {
  // === 现有方法 (保持不变) ===
  async index(options?: { force?: boolean }): Promise<number>;
  async indexFile(path: string, force?: boolean): Promise<number>;
  async search(
    query: string,
    options?: { topK?: number }
  ): Promise<SearchResult[]>;
  watch(options?: WatchOptions): FileWatcher;
  close(): void;

  // === 🆕 新增: 三元记忆 API ===

  /**
   * 添加记忆
   */
  async addMemory(input: MemoryInput): Promise<string>;

  /**
   * 获取记忆
   */
  async getMemory(id: string): Promise<Memory | null>;

  /**
   * 更新记忆
   */
  async updateMemory(id: string, updates: Partial<MemoryInput>): Promise<void>;

  /**
   * 删除记忆
   */
  async deleteMemory(id: string): Promise<void>;

  /**
   * 按类型搜索记忆
   */
  async searchMemory(
    query: string,
    options?: MemorySearchOptions
  ): Promise<MemorySearchResult[]>;

  /**
   * 添加关系
   */
  async addRelation(fromId: string, relation: RelationInput): Promise<string>;

  /**
   * 获取节点的所有关系
   */
  async getRelations(
    id: string,
    options?: RelationQueryOptions
  ): Promise<MemoryRelation[]>;

  /**
   * 删除关系
   */
  async deleteRelation(relationId: string): Promise<void>;

  /**
   * 查找两个节点之间的路径
   */
  async findPath(
    fromId: string,
    toId: string,
    options?: PathOptions
  ): Promise<string[]>;

  /**
   * 获取邻居节点
   */
  async getNeighbors(id: string, options?: NeighborOptions): Promise<Memory[]>;

  /**
   * 批量添加记忆
   */
  async addMemories(inputs: MemoryInput[]): Promise<string[]>;

  /**
   * 获取统计信息
   */
  async getStats(): Promise<MemoryStats>;
}

// === 输入/输出类型 ===

interface MemoryInput {
  type: 'semantic' | 'episodic' | 'procedural';
  content: string;
  label?: string;
  nodeType?: SemanticNodeType; // semantic only
  data?: Record<string, unknown>;
  relations?: RelationInput[];
  importance?: number;
  source?: string;
}

interface RelationInput {
  type: RelationType;
  targetId: string;
  weight?: number;
  confidence?: number;
}

interface MemorySearchOptions {
  topK?: number;
  memoryType?: 'semantic' | 'episodic' | 'procedural';
  nodeType?: SemanticNodeType;
  filter?: string; // Milvus filter expression
  includeRelations?: boolean;
}

interface MemorySearchResult {
  memory: Memory;
  score: number;
  path?: Memory[]; // 如果查询涉及图谱遍历
}

interface PathOptions {
  maxDepth?: number;
  relationTypes?: RelationType[];
}

interface NeighborOptions {
  depth?: number;
  relationTypes?: RelationType[];
  direction?: 'outgoing' | 'incoming' | 'both';
}

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

### 3.2 使用示例

```typescript
import { MemSearch } from 'memsearch-core';

const mem = new MemSearch({
  paths: ['./memory'],
  embedding: { provider: 'openai', model: 'text-embedding-3-small' },
  milvus: { uri: '~/.jclaw/milvus.db', collection: 'jclaw_memory' },
});

await mem.index();

// === 语义记忆 ===

const authId = await mem.addMemory({
  type: 'semantic',
  content: 'JWT 是一种用于身份验证的令牌标准...',
  label: 'JWT Authentication',
  nodeType: 'concept',
  data: {
    properties: { category: 'security' },
  },
  relations: [
    { type: 'is_a', targetId: 'concept:authentication', weight: 0.9 },
    { type: 'uses', targetId: 'concept:token', weight: 0.8 },
  ],
  importance: 0.8,
});

// === 情景记忆 ===

const episodeId = await mem.addMemory({
  type: 'episodic',
  content: '修复了用户登录超时的问题',
  data: {
    episodeType: 'task_execution',
    timestamp: Date.now(),
    context: {
      task: { id: 'task-001', prompt: '修复登录超时' },
      environment: { files: ['src/auth/login.ts'] },
    },
    actions: [
      { action: 'Read login.ts', actionType: 'read', success: true },
      { action: 'Increase timeout', actionType: 'write', success: true },
    ],
    outcome: {
      status: 'success',
      summary: '将超时从 30s 增加到 60s',
    },
    lessons: [{ type: 'best_practice', description: '超时应根据网络调整' }],
  },
  relations: {
    involvedConcepts: [authId],
    usedSkills: [],
  },
});

// === 程序记忆 ===

const skillId = await mem.addMemory({
  type: 'procedural',
  content: '认证问题调试工作流',
  label: 'debug-auth',
  data: {
    skillType: 'workflow',
    description: '用于调试认证问题的系统化流程',
    triggers: [
      { type: 'keyword', condition: '认证|auth|login', priority: 0.8 },
    ],
    steps: [
      { order: 1, action: 'Check token', actionType: 'query' },
      { order: 2, action: 'Verify session', actionType: 'query' },
    ],
    stats: {
      totalExecutions: 0,
      successCount: 0,
      successRate: 0,
      avgDuration: 0,
    },
    evolution: { version: 1, generation: 1, fitnessScore: 0.5 },
    dependencies: {
      requiredConcepts: [authId],
    },
  },
});

// === 搜索 ===

// 按类型搜索
const semanticResults = await mem.searchMemory('用户认证', {
  memoryType: 'semantic',
  nodeType: 'concept',
  topK: 5,
});

// 综合搜索 (所有类型)
const allResults = await mem.searchMemory('登录问题', {
  topK: 10,
});

// === 图谱操作 ===

// 添加关系
await mem.addRelation(authId, {
  type: 'uses',
  targetId: 'concept:encryption',
  weight: 0.7,
});

// 获取关系
const relations = await mem.getRelations(authId);

// 查找路径
const path = await mem.findPath('concept:jwt', 'concept:https');

// 获取邻居
const neighbors = await mem.getNeighbors(authId, { depth: 2 });
```

---

## 4. 实现计划

### Phase 1: Schema 扩展 (1 天)

**文件**: `store.ts`

- [ ] 扩展 Collection Schema 添加新字段
- [ ] 添加 `ensureMemoryCollection()` 方法
- [ ] 更新 `upsert()` 支持新字段
- [ ] 更新 `search()` 返回新字段

### Phase 2: 基础 CRUD (1 天)

**文件**: `memsearch.ts`

- [ ] 实现 `addMemory()` 方法
- [ ] 实现 `getMemory()` 方法
- [ ] 实现 `updateMemory()` 方法
- [ ] 实现 `deleteMemory()` 方法
- [ ] 实现 `addMemories()` 批量方法

### Phase 3: 搜索增强 (1 天)

**文件**: `memsearch.ts`, `store.ts`

- [ ] 实现 `searchMemory()` 按类型搜索
- [ ] 添加 memory_type 过滤支持
- [ ] 添加 node_type 过滤支持
- [ ] 实现自定义 filter 表达式

### Phase 4: 关系和图谱 (2 天)

**文件**: `memsearch.ts`, `store.ts`

- [ ] 实现 `addRelation()` 方法
- [ ] 实现 `getRelations()` 方法
- [ ] 实现 `deleteRelation()` 方法
- [ ] 实现 `findPath()` 路径查找 (BFS)
- [ ] 实现 `getNeighbors()` 邻居查询

### Phase 5: 类型和工具 (1 天)

**文件**: `types/memory.ts`

- [ ] 添加完整 TypeScript 类型定义
- [ ] 添加 JSON 序列化/反序列化工具
- [ ] 添加验证函数

### Phase 6: 测试和文档 (1 天)

- [ ] 单元测试
- [ ] 集成测试
- [ ] API 文档更新
- [ ] README 更新

---

## 5. 文件变更清单

```
memsearch-ts/
├── packages/core/
│   ├── src/
│   │   ├── memsearch.ts        # 📝 扩展 API
│   │   ├── store.ts            # 📝 扩展 Schema
│   │   ├── types/
│   │   │   ├── memory.ts       # 🆕 三元记忆类型
│   │   │   └── index.ts        # 📝 导出新类型
│   │   └── utils/
│   │       └── graph.ts        # 🆕 图谱工具函数
│   │
│   └── package.json            # 📝 版本升级
│
└── docs/
    └── TRIPLE_MEMORY.md        # 🆕 三元记忆文档
```

---

## 6. 向后兼容

- 现有 `index()` 和 `search()` 方法保持不变
- 新字段默认值为 null，不影响现有数据
- `memory_type` 默认为 'chunk'，与现有数据兼容

---

## 7. 下一步

1. 确认设计方案
2. 创建工作计划文件
3. 开始 Phase 1 实现
