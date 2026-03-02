# 三元记忆支持 - 工作计划

## TL;DR

> **目标**: 为 memsearch-core 添加三元记忆（语义/情景/程序）支持
>
> **架构**: Milvus（向量存储）+ 内存图结构（关系查询）
>
> **兼容性**: 100% 向后兼容，现有 API 不变

**Deliverables**:

- 新增 12 个三元记忆 API 方法
- 扩展 Milvus Collection Schema（9 个新字段）
- 内存图引擎（关系存储 + 图遍历）
- 完整 TypeScript 类型定义
- 数据迁移脚本

**Estimated Effort**: Medium-Large (5-6 天)
**Parallel Execution**: YES - 6 waves
**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

---

## Context

### Original Request

基于 `docs/TRIPLE_MEMORY_PLAN.md` 的设计方案，实现三元记忆支持：

- **语义记忆**: 概念、实体、规则、模式、API、类型
- **情景记忆**: 任务执行、错误恢复、学习、决策
- **程序记忆**: 工作流、模板、模式、启发式

### Key Decisions

| 决策项     | 选择                     | 理由               |
| ---------- | ------------------------ | ------------------ |
| 向量存储   | **保留 Milvus**          | 100% 向后兼容      |
| 图存储     | **内存图结构**           | 最小依赖，自主控制 |
| Collection | **新 Collection + 迁移** | Schema 变更需要    |
| 测试策略   | **TDD**                  | RED-GREEN-REFACTOR |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                memsearch-core v2                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MilvusStore (向量存储)          MemoryGraph (内存图)        │
│  ┌─────────────────────┐       ┌─────────────────────┐     │
│  │ • embedding 搜索    │       │ • 邻接表结构         │     │
│  │ • memory_type 过滤  │       │ • BFS/DFS 遍历      │     │
│  │ • 混合检索 (RRF)    │       │ • 路径查找           │     │
│  │ • JSON 持久化关系   │◄─────►│ • 社区发现 (预留)    │     │
│  └─────────────────────┘       └─────────────────────┘     │
│                                                             │
│  MemSearch API                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 现有: index(), search(), watch() - 不变              │   │
│  │ 新增: addMemory, searchMemory, addRelation...       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Work Objectives

### Core Objective

实现完整的三元记忆系统，支持语义/情景/程序三种记忆类型的 CRUD、语义搜索、关系管理和图遍历。

### Concrete Deliverables

- `packages/core/src/types/memory.ts` - 三元记忆类型定义
- `packages/core/src/store.ts` - 扩展 Schema 和 CRUD
- `packages/core/src/graph.ts` - 内存图引擎
- `packages/core/src/memsearch.ts` - 新增 12 个 API 方法
- `packages/core/src/migration.ts` - 数据迁移脚本
- `packages/core/src/types/memory.test.ts` - 类型测试
- `packages/core/src/graph.test.ts` - 图引擎测试
- `packages/core/src/memsearch.memory.test.ts` - API 集成测试

### Definition of Done

- [ ] 所有 12 个新 API 方法可用且经过测试
- [ ] 现有 `index()` 和 `search()` 功能不受影响
- [ ] 内存图支持 1-3 跳邻居查询和路径查找
- [ ] 数据迁移脚本可正确迁移现有数据
- [ ] 测试覆盖率 ≥ 80%

### Must Have

- 三种记忆类型的完整 CRUD
- 按类型过滤的语义搜索
- 关系的增删查
- BFS 路径查找（深度 1-3）

### Must NOT Have (Guardrails)

- ❌ 不修改现有 `index()` 和 `search()` 的签名和行为
- ❌ 不引入 Neo4j 或其他图数据库依赖
- ❌ 不破坏现有 markdown chunk 的索引和搜索
- ❌ 不在核心路径添加阻塞式 I/O

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (vitest)
- **Automated tests**: TDD (RED-GREEN-REFACTOR)
- **Framework**: vitest

### QA Policy

每个任务必须包含 agent-executed QA scenarios。

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - 可并行):
├── Task 1: 类型定义 (types/memory.ts) [quick]
├── Task 2: Schema 扩展 (store.ts) [quick]
├── Task 3: 内存图引擎 (graph.ts) [deep]
└── Task 4: 迁移脚本 (migration.ts) [quick]

Wave 2 (Core CRUD - 依赖 Wave 1):
├── Task 5: addMemory + 测试 [quick]
├── Task 6: getMemory + 测试 [quick]
├── Task 7: updateMemory + 测试 [quick]
└── Task 8: deleteMemory + 测试 [quick]

Wave 3 (Search - 依赖 Wave 2):
├── Task 9: searchMemory + 测试 [unspecified-high]
├── Task 10: getStats + 测试 [quick]
└── Task 11: addMemories 批量 + 测试 [quick]

Wave 4 (Graph Relations - 依赖 Wave 1,3):
├── Task 12: addRelation + 测试 [quick]
├── Task 13: getRelations + 测试 [quick]
├── Task 14: deleteRelation + 测试 [quick]
└── Task 15: 图持久化集成 [unspecified-high]

Wave 5 (Graph Traversal - 依赖 Wave 4):
├── Task 16: getNeighbors (BFS) + 测试 [deep]
├── Task 17: findPath + 测试 [deep]
└── Task 18: 高级图分析接口 (预留) [quick]

Wave 6 (Integration & Polish):
├── Task 19: API 导出和文档 [quick]
├── Task 20: 集成测试 [deep]
└── Task 21: 迁移验证测试 [unspecified-high]

Wave FINAL (Verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Integration QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: T1 → T5 → T9 → T12 → T16 → T20 → F1-F4
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task  | Blocked By | Blocks     |
| ----- | ---------- | ---------- |
| 1-4   | —          | 5-8, 12-15 |
| 5-8   | 1, 2       | 9-11       |
| 9-11  | 5-8        | 20         |
| 12-14 | 1, 3       | 15-18      |
| 15    | 12-14      | 16-18      |
| 16-17 | 15         | 20         |
| 18    | 15         | 20         |
| 19    | 1, 9       | —          |
| 20    | 9, 17      | 21         |
| 21    | 20         | —          |

### Agent Dispatch Summary

- **Wave 1**: **4** agents — T1→quick, T2→quick, T3→deep, T4→quick
- **Wave 2**: **4** agents — T5-T8→quick
- **Wave 3**: **3** agents — T9→unspecified-high, T10-T11→quick
- **Wave 4**: **4** agents — T12-T14→quick, T15→unspecified-high
- **Wave 5**: **3** agents — T16-T17→deep, T18→quick
- **Wave 6**: **3** agents — T19→quick, T20→deep, T21→unspecified-high
- **FINAL**: **4** agents — F1→oracle, F2-F4→unspecified-high/deep

---

## TODOs
- [ ] 1. 类型定义 (types/memory.ts)

  **What to do**:
  - 创建 `packages/core/src/types/memory.ts`
  - 实现 `MemoryType`, `BaseMemory`, `SemanticMemory`, `EpisodicMemory`, `ProceduralMemory` 接口
  - 实现 `MemoryRelation`, `RelationType` 类型
  - 实现 `MemoryInput`, `MemorySearchOptions` 等输入输出类型
  - 在 `types/index.ts` 中导出新类型
  - 创建 `types/memory.test.ts` 验证类型约束

  **Must NOT do**:
  - 不要修改现有 `Chunk`, `SearchResult` 类型

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯类型定义，无复杂逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5-8, 12-14
  - **Blocked By**: None

  **References**:
  - `docs/TRIPLE_MEMORY_PLAN.md:64-291` - 完整类型定义规范
  - `packages/core/src/types/index.ts` - 现有类型导出模式
  - `packages/core/src/types/chunk.ts` - 类型定义风格参考

  **Acceptance Criteria**:
  - [ ] `types/memory.ts` 包含所有 15+ 类型定义
  - [ ] TypeScript 编译通过 (`tsc --noEmit`)
  - [ ] 测试文件 `types/memory.test.ts` 通过

  **QA Scenarios**:
  ```
  Scenario: 类型定义编译通过
    Tool: Bash
    Steps:
      1. cd packages/core && pnpm typecheck
    Expected Result: No TypeScript errors
    Evidence: .sisyphus/evidence/task-01-typecheck.txt

  Scenario: 测试通过
    Tool: Bash
    Steps:
      1. cd packages/core && pnpm test types/memory.test.ts
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-01-test.txt
  ```

  **Commit**: YES
  - Message: `feat(types): add triple memory type definitions`
  - Files: `packages/core/src/types/memory.ts, packages/core/src/types/index.ts, packages/core/src/types/memory.test.ts`

- [ ] 2. Schema 扩展 (store.ts)

  **What to do**:
  - 扩展 `MilvusRecord` 接口添加新字段
  - 修改 `ensureCollection()` 添加新字段到 Schema
  - 创建 `ensureMemoryCollection()` 方法（可选，用于新 Collection）
  - 添加 `memory_type` 等新字段到 `createCollection` schema
  - 更新 `upsert()` 支持新字段
  - 创建 `store.test.ts` 中的 Schema 测试

  **Must NOT do**:
  - 不要删除现有字段
  - 不要修改现有 `search()` 方法的返回格式

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 扩展现有代码，模式已建立
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 5-8
  - **Blocked By**: None

  **References**:
  - `docs/TRIPLE_MEMORY_PLAN.md:63-138` - Schema 定义规范
  - `packages/core/src/store.ts:26-54` - 现有 `ensureCollection()` 实现
  - `packages/core/src/store.ts:10-11` - 现有 `MilvusRecord` 接口

  **Acceptance Criteria**:
  - [ ] `MilvusRecord` 包含 9 个新字段
  - [ ] `ensureCollection()` 创建包含新字段的 Collection
  - [ ] 测试验证 Schema 创建成功

  **QA Scenarios**:
  ```
  Scenario: Schema 扩展测试通过
    Tool: Bash
    Steps:
      1. cd packages/core && pnpm test store.test.ts
    Expected Result: Schema tests pass
    Evidence: .sisyphus/evidence/task-02-schema-test.txt
  ```

  **Commit**: YES
  - Message: `feat(store): extend schema for triple memory`
  - Files: `packages/core/src/store.ts, packages/core/src/store.test.ts`

- [ ] 3. 内存图引擎 (graph.ts)

  **What to do**:
  - 创建 `packages/core/src/graph.ts`
  - 实现 `MemoryGraph` 类，使用邻接表结构
  - 实现 `addNode(id, data)`, `removeNode(id)` 方法
  - 实现 `addEdge(fromId, toId, relation)`, `removeEdge(edgeId)` 方法
  - 实现 `getNeighbors(id, options)` - BFS 遍历
  - 实现 `findPath(fromId, toId, options)` - 最短路径
  - 实现 `getRelations(id, options)` - 获取关系
  - 实现 `loadFromJson(json)` 和 `toJson()` - 序列化
  - 创建 `graph.test.ts` 完整测试

  **Must NOT do**:
  - 不要引入外部图库依赖
  - 不要在图操作中做网络请求

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 复杂算法实现，需要仔细设计
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 12-18
  - **Blocked By**: None

  **References**:
  - `docs/TRIPLE_MEMORY_PLAN.md:267-291` - 关系类型定义
  - `docs/TRIPLE_MEMORY_PLAN.md:36-39` - 图谱 API 设计
  - BFS 算法标准实现

  **Acceptance Criteria**:
  - [ ] `MemoryGraph` 类实现完整
  - [ ] `getNeighbors()` 支持 depth=1-3
  - [ ] `findPath()` 返回最短路径
  - [ ] 测试覆盖率 ≥ 90%

  **QA Scenarios**:
  ```
  Scenario: 图遍历测试
    Tool: Bash
    Steps:
      1. cd packages/core && pnpm test graph.test.ts
    Expected Result: All graph tests pass (neighbors, path, relations)
    Evidence: .sisyphus/evidence/task-03-graph-test.txt

  Scenario: 性能基准
    Tool: Bash
    Steps:
      1. 创建 1000 节点图
      2. 测试 3 跳邻居查询 < 100ms
    Expected Result: Performance acceptable
    Evidence: .sisyphus/evidence/task-03-perf.txt
  ```

  **Commit**: YES
  - Message: `feat(graph): add in-memory graph engine`
  - Files: `packages/core/src/graph.ts, packages/core/src/graph.test.ts`

- [ ] 4. 迁移脚本 (migration.ts)

  **What to do**:
  - 创建 `packages/core/src/migration.ts`
  - 实现 `migrateCollection(oldName, newName)` 函数
  - 读取旧 Collection 数据，转换为新 Schema
  - 批量写入新 Collection
  - 实现进度回调和错误处理
  - 创建 `migration.test.ts` 测试

  **Must NOT do**:
  - 不要删除旧 Collection 数据
  - 不要在生产环境自动执行迁移

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 数据转换逻辑，模式简单
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 21
  - **Blocked By**: Task 2

  **References**:
  - `packages/core/src/store.ts:88-95` - `query()` 方法
  - `packages/core/src/store.ts:56-65` - `upsert()` 方法

  **Acceptance Criteria**:
  - [ ] 迁移脚本可正确转换数据
  - [ ] 现有数据 `memory_type` 默认为 `'chunk'`
  - [ ] 测试验证数据完整性

  **QA Scenarios**:
  ```
  Scenario: 迁移测试
    Tool: Bash
    Steps:
      1. cd packages/core && pnpm test migration.test.ts
    Expected Result: Migration preserves all data
    Evidence: .sisyphus/evidence/task-04-migration-test.txt
  ```

  **Commit**: YES
  - Message: `feat(migration): add collection migration script`
  - Files: `packages/core/src/migration.ts, packages/core/src/migration.test.ts`



- [ ] 5. addMemory + 测试

  **What to do**:
  - 在 `memsearch.ts` 中实现 `addMemory(input: MemoryInput)` 方法
  - 生成 embedding（调用 embedder）
  - 生成唯一 ID
  - 写入 Milvus（包含新字段）
  - 如有 relations，写入内存图
  - 返回新记忆 ID
  - 创建 TDD 测试

  **Must NOT do**:
  - 不要修改现有 `index()` 方法

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: Tasks 9-11
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `docs/TRIPLE_MEMORY_PLAN.md:300-320` - addMemory API 设计
  - `packages/core/src/memsearch.ts:129-153` - embedAndStore 模式

  **Acceptance Criteria**:
  - [ ] `addMemory()` 返回有效 ID
  - [ ] 数据正确写入 Milvus
  - [ ] TDD 测试通过

  **QA Scenarios**:
  ```
  Scenario: 添加语义记忆
    Tool: Bash
    Steps:
      1. pnpm test memsearch.memory.test.ts -t "addMemory semantic"
    Expected Result: Memory created with correct type
    Evidence: .sisyphus/evidence/task-05-add-semantic.txt
  ```

  **Commit**: YES (groups with T5-T8)
  - Message: `feat(api): add memory CRUD methods`

- [ ] 6. getMemory + 测试

  **What to do**:
  - 实现 `getMemory(id: string)` 方法
  - 从 Milvus 查询记录
  - 解析 JSON 字段（memory_data, relations）
  - 返回正确的 Memory 类型
  - TDD 测试

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 2, Blocks: T9-11, Blocked By: T1, T2

  **Commit**: YES (groups with T5-T8)

- [ ] 7. updateMemory + 测试

  **What to do**:
  - 实现 `updateMemory(id: string, updates)` 方法
  - 支持 content, importance, memory_data 更新
  - 如更新 content，重新生成 embedding
  - 更新 updated_at 时间戳
  - TDD 测试

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 2, Blocks: T9-11, Blocked By: T1, T2

  **Commit**: YES (groups with T5-T8)

- [ ] 8. deleteMemory + 测试

  **What to do**:
  - 实现 `deleteMemory(id: string)` 方法
  - 从 Milvus 删除记录
  - 从内存图删除相关节点和边
  - TDD 测试

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 2, Blocks: T9-11, Blocked By: T1, T2

  **Commit**: YES (groups with T5-T8)

- [ ] 9. searchMemory + 测试

  **What to do**:
  - 实现 `searchMemory(query, options)` 方法
  - 支持 `memoryType` 过滤
  - 支持 `nodeType` 过滤（语义记忆）
  - 支持自定义 `filter` 表达式
  - 支持 `includeRelations` 选项
  - 返回 `MemorySearchResult[]`
  - TDD 测试

  **Must NOT do**:
  - 不要修改现有 `search()` 方法

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11)
  - **Blocks**: Task 20
  - **Blocked By**: Tasks 5-8

  **References**:
  - `docs/TRIPLE_MEMORY_PLAN.md:338-342` - searchMemory API
  - `docs/TRIPLE_MEMORY_PLAN.md:405-419` - search options
  - `packages/core/src/memsearch.ts:158-173` - 现有 search 模式

  **Acceptance Criteria**:
  - [ ] 按类型过滤正确工作
  - [ ] 混合搜索 (dense + sparse) 保留
  - [ ] TDD 测试覆盖各种过滤组合

  **QA Scenarios**:
  ```
  Scenario: 按类型搜索
    Tool: Bash
    Steps:
      1. pnpm test memsearch.memory.test.ts -t "searchMemory by type"
    Expected Result: Only memories of specified type returned
    Evidence: .sisyphus/evidence/task-09-search-type.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add searchMemory with type filtering`

- [ ] 10. getStats + 测试

  **What to do**:
  - 实现 `getStats()` 方法
  - 返回 `MemoryStats` (total, byType, avgImportance)
  - 使用 Milvus aggregation 查询
  - TDD 测试

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 3, Blocked By: T5-8

  **Commit**: YES

- [ ] 11. addMemories 批量 + 测试

  **What to do**:
  - 实现 `addMemories(inputs: MemoryInput[])` 方法
  - 批量生成 embedding
  - 批量写入 Milvus
  - 返回 ID 数组
  - TDD 测试

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 3, Blocked By: T5-8

  **Commit**: YES

- [ ] 12. addRelation + 测试

  **What to do**:
  - 实现 `addRelation(fromId, relation: RelationInput)` 方法
  - 写入内存图
  - 同步到 Milvus relations JSON 字段
  - 返回关系 ID
  - TDD 测试

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4 (with T13-15), Blocked By: T1, T3

  **References**:
  - `docs/TRIPLE_MEMORY_PLAN.md:345-349` - addRelation API

  **Commit**: YES (groups with T12-15)

- [ ] 13. getRelations + 测试

  **What to do**:
  - 实现 `getRelations(id, options)` 方法
  - 从内存图查询
  - 支持 `direction` 过滤 (outgoing/incoming/both)
  - 支持 `relationTypes` 过滤
  - TDD 测试

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4, Blocked By: T1, T3

  **Commit**: YES (groups with T12-15)

- [ ] 14. deleteRelation + 测试

  **What to do**:
  - 实现 `deleteRelation(relationId)` 方法
  - 从内存图删除
  - 同步到 Milvus
  - TDD 测试

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 4, Blocked By: T1, T3

  **Commit**: YES (groups with T12-15)

- [ ] 15. 图持久化集成

  **What to do**:
  - 实现 MemSearch 初始化时加载关系到内存图
  - 实现关闭时保存关系到 Milvus
  - 实现定期自动保存（可选）
  - 集成测试

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 4, Blocked By: T12-14

  **Commit**: YES (groups with T12-15)

- [ ] 16. getNeighbors (BFS) + 测试

  **What to do**:
  - 实现 `getNeighbors(id, options)` 方法
  - 调用 MemoryGraph.getNeighbors()
  - 支持 `depth` 1-3
  - 支持 `relationTypes` 过滤
  - 返回 `Memory[]`
  - TDD 测试

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 5 (with T17-18), Blocked By: T15

  **References**:
  - `docs/TRIPLE_MEMORY_PLAN.md:373-374` - getNeighbors API

  **Commit**: YES (groups with T16-18)

- [ ] 17. findPath + 测试

  **What to do**:
  - 实现 `findPath(fromId, toId, options)` 方法
  - 调用 MemoryGraph.findPath()
  - 支持 `maxDepth` 限制
  - 支持 `relationTypes` 过滤
  - 返回节点 ID 数组或 null
  - TDD 测试

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 5, Blocked By: T15

  **Commit**: YES (groups with T16-18)

- [ ] 18. 高级图分析接口 (预留)

  **What to do**:
  - 设计 `GraphAnalysis` 接口（社区发现、影响力分析等）
  - 在 MemoryGraph 中预留扩展点
  - 添加 placeholder 方法
  - 文档说明未来扩展方向

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 5, Blocked By: T15

  **Commit**: YES (groups with T16-18)

- [ ] 19. API 导出和文档

  **What to do**:
  - 更新 `packages/core/src/index.ts` 导出新 API
  - 更新 `packages/core/API.md` 文档
  - 添加使用示例

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 6 (with T20-21), Blocked By: T1, T9

  **Commit**: YES

- [ ] 20. 集成测试

  **What to do**:
  - 创建 `packages/core/src/integration.test.ts`
  - 测试完整工作流：addMemory → searchMemory → addRelation → getNeighbors
  - 测试跨类型交互
  - 测试数据一致性

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 6, Blocked By: T9, T17

  **Commit**: YES

- [ ] 21. 迁移验证测试

  **What to do**:
  - 创建端到端迁移测试
  - 验证现有 markdown 数据兼容性
  - 验证新旧 Collection 共存

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 6, Blocked By: T20

  **Commit**: YES

---


---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `pnpm test`. Review all changed files for: `as any`, `@ts-ignore`, empty catches, console.log in prod, unused imports.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Integration QA** — `unspecified-high`
  Execute integration test scenarios. Verify addMemory → searchMemory → addRelation → getNeighbors flow works end-to-end.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(types): add triple memory types` — types/memory.ts, types/index.ts
- **Wave 1**: `feat(store): extend schema for triple memory` — store.ts
- **Wave 1**: `feat(graph): add in-memory graph engine` — graph.ts
- **Wave 1**: `feat(migration): add collection migration script` — migration.ts
- **Wave 2**: `feat(api): add memory CRUD methods` — memsearch.ts (T5-T8)
- **Wave 3**: `feat(api): add searchMemory with type filtering` — memsearch.ts (T9-T11)
- **Wave 4**: `feat(api): add relation methods` — memsearch.ts, graph.ts (T12-T15)
- **Wave 5**: `feat(api): add graph traversal methods` — memsearch.ts (T16-T18)
- **Wave 6**: `docs: update API documentation` — API.md, index.ts (T19-T21)

---

## Success Criteria

### Verification Commands
```bash
# Type check
cd packages/core && pnpm typecheck

# All tests pass
cd packages/core && pnpm test

# Integration test
cd packages/core && pnpm test integration.test.ts

# Build
cd packages/core && pnpm build
```

### Final Checklist
- [ ] All 12 new API methods working
- [ ] Existing `index()` and `search()` unaffected
- [ ] Memory graph supports 1-3 hop traversal
- [ ] Migration script tested
- [ ] Test coverage ≥ 80%
- [ ] No TypeScript errors
- [ ] No breaking changes

---

## Compatibility Guarantee

| 现有功能 | 状态 | 验证方式 |
|---------|------|--------|
| `mem.index()` | ✅ 不变 | 集成测试 |
| `mem.search()` | ✅ 不变 | 集成测试 |
| `mem.watch()` | ✅ 不变 | 集成测试 |
| 现有 Collection | ✅ 兼容 | 迁移测试 |
| 现有数据 | ✅ 自动标记为 chunk | 迁移测试 |

