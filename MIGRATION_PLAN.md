# memsearch-ts 重构计划

> 将 memsearch (Python) 迁移到 TypeScript/Node.js 生态系统的详细计划

**项目名称**：memsearch-ts  
**GitHub仓库**：https://github.com/memsearch/memsearch-ts  
**npm包名**：memsearch-ts  
**开始日期**：2026-02-28  
**预计完成**：2026-04-15 (7周)

---

## 📋 目录

1. [项目概述](#项目概述)
2. [技术架构设计](#技术架构设计)
3. [详细迁移路径](#详细迁移路径)
4. [模块分解与时间线](#模块分解与时间线)
5. [风险评估与缓解](#风险评估与缓解)
6. [测试策略](#测试策略)
7. [部署与发布](#部署与发布)
8. [团队分工](#团队分工)
9. [质量保证](#质量保证)
10. [持续改进](#持续改进)

---

## 项目概述

### 1.1 目标

将 memsearch (Python ~2621行) 迁移到 TypeScript，提供：

✅ **完整的TypeScript类型安全**  
✅ **Node.js生态集成**  
✅ **与Python版本功能对等** (除了local embedding)  
✅ **Claude Code插件支持**  
✅ **npm包发布**  
✅ **完整的测试覆盖** (>80%)

### 1.2 非目标

❌ 保持100% API兼容性（会有TypeScript风格的改进）  
❌ 支持local embedding (sentence-transformers) → 可选功能  
❌ Python版本维护（并行开发）  
❌ 浏览器运行时支持（Node.js 18+ 专注）

### 1.3 成功指标

| 指标 | 目标 | 测量方法 |
|------|------|---------|
| 代码覆盖率 | ≥80% | vitest --coverage |
| 类型安全率 | 100% | tsc --noEmit |
| 性能对比 | ±20% | 基准测试 |
| 文档完整度 | 100% | API文档 + README |
| 插件兼容性 | ✅ | Claude Code测试 |
| npm发布 | ✅ | npmjs.com |

---

## 技术架构设计

### 2.1 技术栈

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层                               │
├─────────────────────────────────────────────────────────────┤
│  TypeScript 5.0+  (strict mode)                       │
├─────────────────────────────────────────────────────────────┤
│  核心依赖                                            │
│  - @zilliz/milvus2-sdk-node@2.5+  (Milvus客户端)      │
│  - chokidar@4.0+              (文件监视)               │
│  - openai@4.0+                (OpenAI embedding)        │
│  - @google/generative-ai@0.17+ (Google embedding)       │
│  - ollama@0.5+                (Ollama embedding)       │
│  - zod@3.0+                   (运行时验证)            │
├─────────────────────────────────────────────────────────────┤
│  开发工具                                            │
│  - oclif@4.0+                (CLI框架)                │
│  - vitest@1.0+                (测试)                  │
│  - tsup@8.0+                 (打包)                  │
│  - eslint + prettier           (代码质量)               │
├─────────────────────────────────────────────────────────────┤
│  运行时                                              │
│  Node.js 18+                                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Monorepo结构

```
memsearch-ts/
├── packages/
│   ├── core/                      # 核心库
│   │   ├── src/
│   │   │   ├── MemSearch.ts       # 主类
│   │   │   ├── store.ts          # Milvus封装
│   │   │   ├── chunker.ts        # Markdown分块
│   │   │   ├── scanner.ts        # 文件扫描
│   │   │   ├── watcher.ts        # 文件监视
│   │   │   ├── config.ts         # 配置管理
│   │   │   ├── compact.ts        # LLM压缩
│   │   │   ├── transcript.ts     # 转录解析
│   │   │   ├── embeddings/        # Embedding providers
│   │   │   │   ├── index.ts
│   │   │   │   ├── openai.ts
│   │   │   │   ├── google.ts
│   │   │   │   ├── voyage.ts
│   │   │   │   ├── ollama.ts
│   │   │   │   └── types.ts
│   │   │   └── utils/
│   │   │       ├── crypto.ts     # SHA-256等
│   │   │       ├── logger.ts
│   │   │       └── errors.ts
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   │
│   └── cli/                       # CLI工具
│       ├── src/
│       │   ├── commands/
│       │   │   ├── index.ts        # index命令
│       │   │   ├── search.ts       # search命令
│       │   │   ├── watch.ts        # watch命令
│       │   │   ├── config.ts       # config命令
│       │   │   ├── expand.ts       # expand命令
│       │   │   ├── transcript.ts  # transcript命令
│       │   │   ├── stats.ts       # stats命令
│       │   │   └── reset.ts       # reset命令
│       │   └── index.ts
│       ├── test/
│       ├── package.json
│       └── tsconfig.json
│
├── ccplugin/                      # Claude Code插件
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── hooks/
│   │   ├── common.ts
│   │   ├── session-start.ts
│   │   ├── user-prompt-submit.ts
│   │   ├── stop.ts
│   │   ├── session-end.ts
│   │   └── parse-transcript.ts
│   ├── scripts/
│   │   └── derive-collection.ts
│   └── skills/
│       └── memory-recall/
│           └── SKILL.md
│
├── examples/                     # 示例代码
├── docs/                         # 文档
├── scripts/                      # 构建脚本
├── tests/                        # E2E测试
├── .github/                      # GitHub Actions
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── test.yml
├── package.json                  # Monorepo根配置
├── pnpm-workspace.yaml
├── turbo.json                   # Turborepo配置
├── tsconfig.json                # 根TypeScript配置
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── README.md
├── CHANGELOG.md
├── LICENSE
└── MIGRATION_PLAN.md            # 本文档
```

### 2.3 包职责划分

| 包 | 职责 | 依赖 | 发布 |
|---|------|------|------|
| **core** | 核心库，所有业务逻辑 | @zilliz/milvus2-sdk-node, openai等 | ✅ |
| **cli** | 命令行工具 | core | ✅ |
| **ccplugin** | Claude Code插件 | cli (通过npm link) | ✅ (独立) |

---


---

## 详细迁移路径

### 阶段0：准备与验证 (Week 0, 3天)

#### 任务清单

- [ ] **0.1 技术验证POC** (2天)
  - [ ] 创建Milvus JS SDK最小验证
  - [ ] 测试embedding providers HTTP API
  - [ ] 验证文件监视 (chokidar)
  - [ ] 性能基准测试（vs Python）
  - [ ] 产出：POC报告

- [ ] **0.2 项目初始化** (1天)
  - [ ] 初始化monorepo (pnpm workspace)
  - [ ] 配置TypeScript (strict mode)
  - [ ] 配置ESLint + Prettier
  - [ ] 配置GitHub Actions CI
  - [ ] 配置Vitest + Coverage
  - [ ] 创建README基础结构

#### 验收标准

- [ ] POC验证所有核心依赖可用
- [ ] CI/CD流水线运行通过
- [ ] 团队成员都能运行`pnpm install`和`pnpm test`

---

### 阶段1：核心基础设施 (Week 1, 5天)

#### 任务清单

- [ ] **1.1 类型系统设计** (1天)
  - [ ] 定义核心类型 (Chunk, EmbeddingProvider, Config等)
  - [ ] 创建Zod验证schema
  - [ ] 定义错误类型层次结构

- [ ] **1.2 配置系统** (1天)
  ```typescript
  // config.ts
  export interface MemSearchConfig {
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
    chunking: {
      maxChunkSize: number;
      overlapLines: number;
    };
  }
  ```
  - [ ] 实现配置加载器 (TOML/JSON/YAML)
  - [ ] 配置优先级链 (defaults → ~/.memsearch/config.json → .memsearch.json → CLI)
  - [ ] 配置验证 (Zod schema)

- [ ] **1.3 工具函数** (1天)
  ```typescript
  // utils/crypto.ts
  export function sha256(text: string): string;
  export function computeChunkId(source: string, start: number, end: number, hash: string, model: string): string;
  
  // utils/logger.ts
  export class Logger { ... }
  
  // utils/errors.ts
  export class MemSearchError extends Error { ... }
  export class ConfigError extends MemSearchError { ... }
  export class MilvusError extends MemSearchError { ... }
  ```

- [ ] **1.4 Markdown分块器** (1天)
  ```typescript
  // chunker.ts
  export interface Chunk {
    content: string;
    source: string;
    heading: string;
    headingLevel: number;
    startLine: number;
    endLine: number;
    contentHash: string;
  }
  
  export function chunkMarkdown(text: string, options: ChunkOptions): Chunk[];
  export function computeChunkId(...args): string;
  ```
  - [ ] 正则表达式匹配标题
  - [ ] 按标题分块
  - [ ] 段落分割 (超过maxChunkSize)
  - [ ] 重叠行处理

- [ ] **1.5 文件扫描器** (0.5天)
  ```typescript
  // scanner.ts
  export interface ScannedFile {
    path: string;
    mtime: number;
    size: number;
  }
  
  export async function scanPaths(paths: string[]): Promise<ScannedFile[]>;
  ```

- [ ] **1.6 单元测试** (0.5天)
  - [ ] 配置系统测试
  - [ ] 分块器测试 (edge cases)
  - [ ] 扫描器测试
  - [ ] 工具函数测试

#### 验收标准

- [ ] 所有类型定义完整
- [ ] 配置系统支持多源合并和验证
- [ ] 分块器通过所有Python测试用例
- [ ] 测试覆盖率 ≥85%
- [ ] 通过CI/CD

---

### 阶段2：Embedding Providers (Week 1-2, 3天)

#### 任务清单

- [ ] **2.1 EmbeddingProvider协议** (0.5天)
  ```typescript
  // embeddings/types.ts
  export interface EmbeddingProvider {
    readonly modelName: string;
    readonly dimension: number;
    embed(texts: string[]): Promise<number[][]>;
  }
  ```

- [ ] **2.2 OpenAI Embedding** (0.5天)
  ```typescript
  // embeddings/openai.ts
  export class OpenAIEmbedding implements EmbeddingProvider {
    constructor(options: { model?: string; batchSize?: number });
    embed(texts: string[]): Promise<number[][]>;
  }
  ```

- [ ] **2.3 Google Embedding** (0.5天)
  ```typescript
  // embeddings/google.ts
  export class GoogleEmbedding implements EmbeddingProvider {
    // 使用 @google/generative-ai
  }
  ```

- [ ] **2.4 Ollama Embedding** (0.5天)
  ```typescript
  // embeddings/ollama.ts
  export class OllamaEmbedding implements EmbeddingProvider {
    // 使用 ollama npm包
  }
  ```

- [ ] **2.5 Voyage Embedding** (0.5天)
  ```typescript
  // embeddings/voyage.ts
  export class VoyageEmbedding implements EmbeddingProvider {
    // 使用HTTP API调用
  }
  ```

- [ ] **2.6 Provider工厂** (0.5天)
  ```typescript
  // embeddings/index.ts
  export function getProvider(
    name: string,
    options?: { model?: string; batchSize?: number }
  ): EmbeddingProvider;
  
  export const DEFAULT_MODELS: Record<string, string> = {
    openai: 'text-embedding-3-small',
    google: 'gemini-embedding-001',
    voyage: 'voyage-3-lite',
    ollama: 'nomic-embed-text',
  };
  ```

- [ ] **2.7 批处理逻辑** (0.5天)
  - [ ] 自动分批 (chunkSize)
  - [ ] 并发控制 (限制并发请求数)
  - [ ] 错误重试 (exponential backoff)

#### 验收标准

- [ ] 所有provider实现EmbeddingProvider接口
- [ ] 批处理通过性能测试 (≥100 texts/sec)
- [ ] 错误处理健壮
- [ ] 测试覆盖率 ≥90%

---

### 阶段3：Milvus存储层 (Week 2, 5天)

#### 任务清单

- [ ] **3.1 MilvusClient封装** (2天)
  ```typescript
  // store.ts
  export class MilvusStore {
    constructor(options: {
      uri: string;
      token?: string;
      collection: string;
      dimension?: number;
    });
    
    // 集合管理
    private async ensureCollection(): Promise<void>;
    private checkDimension(): Promise<void>;
    
    // CRUD
    upsert(records: Record<string, unknown>[]): number;
    deleteBySource(source: string): void;
    deleteByHashes(hashes: string[]): void;
    
    // 查询
    search(
      vector: number[],
      queryText?: string,
      topK?: number
    ): SearchResult[];
    
    query(filterExpr: string, limit?: number): ChunkRecord[];
    
    // 元数据
    indexedSources(): Set<string>;
    hashesBySource(source: string): Set<string>;
    
    // 清理
    close(): void;
    reset(): void;
  }
  ```
  - [ ] Collection schema定义 (dense + BM25 + RRF)
  - [ ] Index配置 (FLAT + SPARSE_INVERTED_INDEX)
  - [ ] Filter表达式转义
  - [ ] 维度检查

- [ ] **3.2 RRF重排序** (1天)
  ```typescript
  // store.ts - RRF算法
  export function combineResultsByRRF(
    denseResults: SearchResult[],
    sparseResults: SearchResult[],
    k: number = 60
  ): SearchResult[];
  ```
  - [ ] Dense search (cosine)
  - [ ] Sparse search (BM25)
  - [ ] RRF合并
  - [ ] 分数归一化

- [ ] **3.3 连接管理** (0.5天)
  - [ ] 连接池
  - [ ] 重连逻辑
  - [ ] 错误处理

- [ ] **3.4 集成测试** (1天)
  - [ ] 使用Docker Milvus测试
  - [ ] 测试Milvus Lite (本地文件)
  - [ ] 测试Zilliz Cloud (mock或真实)
  - [ ] 边界条件测试

- [ ] **3.5 性能优化** (0.5天)
  - [ ] 批量upsert优化
  - [ ] 批量查询优化
  - [ ] 缓存策略 (indexedSources, hashesBySource)

#### 验收标准

- [ ] 与Python版本的API对等
- [ ] 性能不低于Python版本的80%
- [ ] 支持Milvus Lite, Server, Zilliz Cloud
- [ ] 测试覆盖率 ≥85%
- [ ] 通过所有Python测试用例

---

### 阶段4：MemSearch主类 (Week 3, 3天)

#### 任务清单

- [ ] **4.1 MemSearch类骨架** (1天)
  ```typescript
  // MemSearch.ts
  export class MemSearch {
    constructor(config: MemSearchConfig);
    
    // Indexing
    async index(options?: { force?: boolean }): Promise<number>;
    async indexFile(path: string): Promise<number>;
    
    // Search
    async search(query: string, options?: { topK?: number }): Promise<SearchResult[]>;
    
    // Compact
    async compact(options?: {
      source?: string;
      llmProvider?: string;
      llmModel?: string;
      promptTemplate?: string;
      outputDir?: string;
    }): Promise<string>;
    
    // Watch
    watch(options?: {
      onEvent?: (eventType: string, summary: string, filePath: string) => void;
      debounceMs?: number;
    }): FileWatcher;
    
    // Utilities
    get store(): MilvusStore;
    close(): void;
  }
  ```

- [ ] **4.2 Index逻辑** (1天)
  - [ ] 文件扫描
  - [ ] 分块处理
  - [ ] 去重 (chunkHash)
  - [ ] 批量embedding
  - [ ] Milvus upsert
  - [ ] 清理stale chunks

- [ ] **4.3 Search逻辑** (0.5天)
  - [ ] Query embedding
  - [ ] Milvus search
  - [ ] 结果过滤和排序

- [ ] **4.4 Compact逻辑** (0.5天)
  - [ ] Milvus query chunks
  - [ ] LLM总结
  - [ ] 写入markdown文件
  - [ ] Index更新

#### 验收标准

- [ ] 通过所有Python核心测试
- [ ] API文档完整
- [ ] TypeScript类型严格

---

### 阶段5：文件监视 (Week 3, 2天)

#### 任务清单

- [ ] **5.1 FileWatcher类** (1天)
  ```typescript
  // watcher.ts
  export class FileWatcher {
    constructor(
      paths: string[],
      onChange: (eventType: string, filePath: Path) => void,
      options?: { debounceMs?: number }
    );
    
    start(): void;
    stop(): void;
  }
  ```
  - [ ] chokidar集成
  - [ ] 事件去抖 (debounce)
  - [ ] 单例模式 (PID file)

- [ ] **5.2 事件处理** (0.5天)
  - [ ] created: 触发indexFile
  - [ ] modified: 触发indexFile
  - [ ] deleted: 触发deleteBySource

- [ ] **5.3 测试** (0.5天)
  - [ ] 单元测试
  - [ ] E2E测试 (真实文件变更)

#### 验收标准

- [ ] 与Python watcher行为一致
- [ ] 内存泄漏测试通过
- [ ] 性能测试通过

---

### 阶段6：CLI工具 (Week 3-4, 3天)

#### 任务清单

- [ ] **6.1
Oclif初始化** (0.5天)
  ```bash
  npx oclif generate cli memsearch-cli
  ```

- [ ] **6.2 命令实现** (2天)
  ```typescript
  // commands/index.ts
  export default class IndexCommand extends Command {
    static description = 'Index markdown files';
    async run(): Promise<void> { ... }
  }
  
  // commands/search.ts
  // commands/watch.ts
  // commands/config.ts
  // commands/expand.ts
  // commands/transcript.ts
  // commands/stats.ts
  // commands/reset.ts
  ```
  - [ ] index: 批量index, --force, --provider
  - [ ] search: --top-k, --json-output
  - [ ] watch: --debounce-ms, 守护进程
  - [ ] config: init, set, list, --resolved
  - [ ] expand: 显示完整markdown section
  - [ ] transcript: JSONL解析
  - [ ] stats: 集合统计
  - [ ] reset: 清空集合

- [ ] **6.3 配置向导** (0.5天)
  - [ ] `memsearch config init` 交互式配置
  - [ ] 环境变量检测
  - [ ] 验证API keys

#### 验收标准

- [ ] 所有命令与Python CLI对等
- [ ] 帮助文档完整
- [ ] 交互式测试通过

---

### 阶段7：Claude Code插件 (Week 4-5, 5天)

#### 任务清单

- [ ] **7.1 插件架构** (0.5天)
  - [ ] Node.js执行环境验证
  - [ ] Claude Code hooks API理解
  - [ ] Bash脚本 → Node.js转换策略

- [ ] **7.2 Common模块** (1天)
  ```typescript
  // hooks/common.ts
  export function parseInput(): HookInput;
  export function detectMemsearch(): string;
  export function deriveCollection(projectDir: string): string;
  export function runMemsearch(args: string[]): Promise<string>;
  export function startWatch(paths: string[]): void;
  export function stopWatch(): void;
  ```
  - [ ] PATH配置
  - [ ] memsearch检测
  - [ ] Collection名称推导
  - [ ] JSON解析 (jq fallback → 原生JSON.parse)

- [ ] **7.3 SessionStart Hook** (1天)
  ```typescript
  // hooks/session-start.ts
  export async function sessionStart(input: HookInput): Promise<HookOutput> {
    // 1. 检查API key
    // 2. 启动watch进程
    // 3. 写session heading
    // 4. 注入cold-start context (recent memories)
    // 5. 返回systemMessage状态
  }
  ```
  - [ ] 配置读取和验证
  - [ ] Watch进程启动 (PID file单例)
  - [ ] 读取最近2个daily log (30行)
  - [ ] 输出additionalContext + systemMessage

- [ ] **7.4 UserPromptSubmit Hook** (0.5天)
  ```typescript
  // hooks/user-prompt-submit.ts
  export async function userPromptSubmit(input: HookInput): Promise<HookOutput> {
    // 返回systemMessage: "[memsearch] Memory available"
  }
  ```
  - [ ] 长度检查 (< 10 chars跳过)
  - [ ] 轻量级hint

- [ ] **7.5 Stop Hook** (1天)
  ```typescript
  // hooks/stop.ts
  export async function stop(input: HookInput): Promise<HookOutput> {
    // 1. Parse transcript
    // 2. Call claude -p --model haiku
    // 3. Append to daily .md
    // 4. Run memsearch index
  }
  ```
  - [ ] 递归防护 (stop_hook_active)
  - [ ] Transcript解析
  - [ ] Haiku总结 (异步调用claude)
  - [ ] 追加到memory/YYYY-MM-DD.md

- [ ] **7.6 SessionEnd Hook** (0.5天)
  ```typescript
  // hooks/session-end.ts
  export async function sessionEnd(input: HookInput): Promise<HookOutput> {
    // Stop watch process
  }
  ```

- [ ] **7.7 Parse Transcript** (0.5天)
  ```typescript
  // hooks/parse-transcript.ts
  export async function parseTranscript(
    jsonlPath: string,
    options?: { maxLines?: number; maxContentLength?: number }
  ): Promise<ParsedTranscript>;
  ```
  - [ ] JSONL读取
  - [ ] 内容截断 (500 chars)
  - [ ] Tool call summary提取
  - [ ] 过滤file-history-snapshot

#### 验收标准

- [ ] 所有hooks与Python版本行为一致
- [ ] Claude Code测试通过
- [ ] Memory-recall skill正常工作

---

### 阶段8：测试与文档 (Week 5-6, 5天)

#### 任务清单

- [ ] **8.1 单元测试** (1.5天)
  - [ ] core包: 目标覆盖率85%+
  - [ ] cli包: 目标覆盖率80%+
  - [ ] Mock策略 (Milvus mock server)

- [ ] **8.2 集成测试** (1.5天)
  ```typescript
  // tests/integration/
  // test-indexing.e2e.ts
  describe('End-to-end indexing', () => {
    it('should index markdown files and search', async () => {
      const mem = new MemSearch({ paths: ['./fixtures/docs'] });
      await mem.index();
      const results = await mem.search('Redis caching');
      expect(results).toHaveLength.greaterThan(0);
      mem.close();
    });
  });
  ```
  - [ ] 完整workflow测试 (index → search → watch)
  - [ ] Milvus Lite测试
  - [ ] 所有embedding providers测试

- [ ] **8.3 性能测试** (0.5天)
  - [ ] Benchmark vs Python版本
  - [ ] 内存泄漏检测
  - [ ] 并发测试

- [ ] **8.4 文档编写** (1.5天)
  - [ ] README.md (快速开始)
  - [ ] API文档 (TypeDoc)
  - [ ] CLI参考文档
  - [ ] 迁移指南 (Python → TypeScript)
  - [ ] 贡献指南

#### 验收标准

- [ ] 测试覆盖率 ≥80%
- [ ] 所有文档发布
- [ ] 性能基准报告

---

### 阶段9：发布准备 (Week 6-7, 5天)

#### 任务清单

- [ ] **9.1 打包配置** (0.5天)
  ```typescript
  // packages/core/tsup.config.ts
  import { defineConfig } from 'tsup';
  
  export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['@zilliz/milvus2-sdk-node', 'openai', ...],
  });
  ```

- [ ] **9.2 package.json配置** (0.5天)
  ```json
  {
    "name": "memsearch-ts",
    "version": "1.0.0",
    "main": "./dist/index.js",
    "module": "./dist/index.mjs",
    "types": "./dist/index.d.ts",
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.mjs",
        "require": "./dist/index.js"
      }
    },
    "files": ["dist", "README.md", "LICENSE"],
    "publishConfig": {
      "access": "public"
    }
  }
  ```

- [ ] **9.3 CI/CD完善** (1天)
  ```yaml
  # .github/workflows/ci.yml
  name: CI
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v2
        - run: pnpm install
        - run: pnpm test --coverage
        - uses: codecov/codecov-action@v3
  
  # .github/workflows/release.yml
  name: Release
  on:
    release:
      types: [published]
  jobs:
    publish-npm:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v2
        - run: pnpm build
        - run: pnpm publish
  ```

- [ ] **9.4 CHANGELOG维护** (0.5天)
  ```markdown
  # Changelog
  
  ## [1.0.0] - 2026-04-15
  
  ### Added
  - Initial TypeScript/Node.js release
  - Full feature parity with Python memsearch
  - Claude Code plugin support
  - OpenAI, Google, Ollama, Voyage embedding providers
  
  ### Changed
  - N/A
  
  ### Deprecated
  - Local embedding (sentence-transformers) - use Ollama or external service
  ```

- [ ] **9.5 Beta测试** (2天)
  - [ ] 内部用户测试
  - [ ] Bug修复
  - [ ] 性能调优
  - [ ] 文档修正

#### 验收标准

- [ ] npm发布流程验证
- [ ] Beta用户无重大bug
- [ ] 文档完整准确

---

### 阶段10：正式发布 (Week 7, 2天)

#### 任务清单

- [ ] **10.1 最终检查** (0.5天)
  - [ ] 代码审查通过
  - [ ] 安全扫描 (npm audit)
  - [ ] License检查
  - [ ] README最终审查

- [ ] **10.2 GitHub Release** (0.5天)
  ```bash
  # 1. 创建Git tag
  git tag -a v1.0.0 -m "Release v1.0.0"
  git push origin v1.0.0
  
  # 2. GitHub Release draft
  gh release create v1.0.0 --notes-file RELEASE_NOTES.md
  ```

- [ ] **10.3 npm发布** (0.5天)
  ```bash
  pnpm publish --access public
  ```

- [ ] **10.4 宣发** (0.5天)
  - [ ] Twitter发布
  - [ ] GitHub Discussions公告
  - [ ] 原memsearch issue通知
  - [ ] Claude Code marketplace提交

#### 验收标准

- [ ] npmjs.com/package/memsearch-ts在线
- [ ] GitHub release发布
- [ ] 社区公告完成

---


## 模块分解与时间线

### 甘特图 (Weeks 1-7)

```
Week 0: ████████ 准备与验证
Week 1: ██████████████ 核心基础设施
Week 2: ████████████████████ Embedding + Milvus
Week 3: ██████████████ MemSearch + Watcher
Week 4: ████████████ CLI
Week 5: ████████████████ Claude插件
Week 6: ██████████████ 测试与文档
Week 7: ████████ 发布准备 + 正式发布
```

### 关键里程碑

| 里程碑 | 日期 | 交付物 |
|--------|------|--------|
| **M1: POC验证** | 2026-03-03 | POC报告 |
| **M2: Alpha发布** | 2026-03-17 | 可用的core包 |
| **M3: Beta发布** | 2026-03-31 | 完整CLI + 插件 |
| **M4: RC发布** | 2026-04-07 | 测试完成 |
| **M5: v1.0正式发布** | 2026-04-15 | npm包 + GitHub Release |

---

## 风险评估与缓解

### 10.1 技术风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|-------|------|---------|
| **R1: Milvus JS SDK API差异** | 中 | 高 | 详细对比pymilvus，必要时使用RESTful API |
| **R2: 本地Embedding不可用** | 高 | 中 | 文档明确说明，推荐Ollama替代 |
| **R3: Claude Code环境不支持Node.js** | 中 | 高 | Week 0.1进行POC验证，准备Bash fallback |
| **R4: 性能不如Python** | 中 | 中 | Week 0.1进行基准测试，优化热点路径 |
| **R5: TypeScript类型定义不全** | 低 | 中 | 严格的strict模式，100%类型覆盖 |

### 10.2 项目风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|-------|------|---------|
| **R6: 时间延期** | 中 | 高 | 设立buffer time，优先MVP功能 |
| **R7: 团队成员不足** | 中 | 中 | 外部代码审查，减少依赖 |
| **R8: 文档不完整** | 低 | 中 | 并行开发，早期开始文档 |
| **R9: npm包名冲突** | 低 | 高 | 尽早注册memsearch-ts |

### 10.3 应急计划

**Plan B**: 如果Milvus JS SDK不可用
- 方案1: 使用Milvus RESTful API (纯HTTP)
- 方案2: 通过child_process调用Python pymilvus
- 方案3: 更换向量数据库 (Weaviate, Qdrant)

**Plan C**: 如果Claude Code不支持Node.js插件
- 方案1: 保持Bash脚本，调用Node.js CLI工具
- 方案2: 提供独立的CLI工具
- 方案3: 开发MCP server版本

---

## 测试策略

### 11.1 测试金字塔

```
         /\
        /E2E\         10%  (integration tests)
       /------\
      /        \
     /单元测试\       70%  (unit tests)
    /----------\
   /            \
  /集成测试        \      20%  (integration tests)
 /----------------\
```

### 11.2 测试类型

| 类型 | 工具 | 覆盖率目标 | 运行频率 |
|------|------|----------|---------|
| **单元测试** | vitest | ≥85% | 每次commit |
| **集成测试** | vitest + testcontainers | ≥80% | 每次PR |
| **E2E测试** | playwright/vitest | ≥90% | 每次release |
| **性能测试** | benchmark | N/A | 每周 |
| **类型检查** | tsc | 100% | 每次commit |
| **Linting** | eslint | 100% | 每次commit |

### 11.3 Mock策略

```typescript
// test/mocks/milvus-client.mock.ts
import { vi } from 'vitest';

export const mockMilvusClient = {
  createCollection: vi.fn(),
  insert: vi.fn(),
  search: vi.fn().mockResolvedValue([
    { id: '1', distance: 0.1, score: 0.9 },
  ]),
  // ...
};
```

### 11.4 Testcontainers (Docker)

```typescript
// test/integration/milvus.test.ts
import { GenericContainer } from 'testcontainers';

describe('Milvus Integration', () => {
  let milvus: GenericContainer;
  
  beforeAll(async () => {
    milvus = await new GenericContainer('milvusdb/milvus:v2.5.0')
      .withExposedPorts(19530)
      .start();
  });
  
  afterAll(async () => {
    await milvus.stop();
  });
  
  it('should connect and create collection', async () => {
    const uri = `http://${milvus.getHost()}:${milvus.getMappedPort(19530)}`;
    const store = new MilvusStore({ uri, collection: 'test' });
    // ...
  });
});
```

---

## 部署与发布

### 12.1 发布流程

```mermaid
graph LR
    A[Commit] --> B[CI: test + lint]
    B --> C[PR Review]
    C --> D[Merge to main]
    D --> E[Create Release Branch]
    E --> F[Update CHANGELOG]
    F --> G[Git Tag]
    G --> H[GitHub Release Draft]
    H --> I[pnpm publish]
    I --> J[Announce]
```

### 12.2 版本策略

**语义化版本 (SemVer)**：
- `1.0.0`: 初始发布
- `1.0.1`: Bug修复
- `1.1.0`: 新功能 (向后兼容)
- `2.0.0`: 破坏性变更

### 12.3 环境配置

```bash
# .npmrc
@memsearch:registry=https://registry.npmjs.org/
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

---

## 团队分工

### 13.1 角色与职责

| 角色 | 人员 | 职责 | 时间投入 |
|------|------|------|---------|
| **项目负责** | TBD | 总体规划、风险管理、协调 | 100% |
| **核心开发** | TBD | Core包开发 (store, chunker, watcher) | 100% |
| **Embedding开发** | TBD | Embedding providers | 50% |
| **CLI开发** | TBD | CLI工具 | 50% |
| **插件开发** | TBD | Claude Code插件 | 50% |
| **测试工程师** | TBD | 测试用例编写、QA | 60% |
| **技术文档** | TBD | API文档、迁移指南 | 30% |
| **DevOps** | TBD | CI/CD、npm发布 | 20% |

### 13.2 沟通计划

- **每日站会** (15分钟): 同步进度、blockers
- **每周复盘** (1小时): 回顾成果、调整计划
- **代码审查**: 所有PR必须至少1人review
- **文档同步**: 每个模块完成时更新文档

---

## 质量保证

### 14.1 Code Review Checklist

- [ ] TypeScript类型正确
- [ ] 测试覆盖率达标
- [ ] 错误处理完整
- [ ] 文档更新
- [ ] 性能无明显退化
- [ ] 安全扫描通过 (npm audit)

### 14.2 持续集成

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test --coverage
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
```

### 14.3 性能基准

```typescript
// benchmarks/index.ts
import { Bench } from 'tinybench';

const bench = new Bench({ time: 1000 });

bench
  .add('embedding - 100 texts', async () => {
    await provider.embed([...Array(100).fill('test')]);
  })
  .add('index - 1000 chunks', async () => {
    await mem.index({ paths: ['./fixtures/1000chunks'] });
  })
  .run();

console.table(bench.table());
```

---

## 持续改进

### 15.1 反馈收集

- GitHub Issues
- npm包讨论区
- Claude Code plugin reviews
- 内部用户反馈

### 15.2 后续计划

**v1.1** (2026-05):
- Voyage AI embeddings
- 更好的错误消息
- 性能优化

**v1.2** (2026-06):
- 浏览器支持 (WASM Milvus)
- 本地embedding (@xenova/transformers.js)
- Streaming embeddings

**v2.0** (2026-Q3):
- 多租户支持
- 分布式索引
- Real-time sync

---

## 附录

### A. 参考资料

- Milvus Node.js SDK: https://www.npmjs.com/package/@zilliz/milvus2-sdk-node
- Milvus RESTful API: https://milvus.io/api-reference/restful/
- Oclif CLI框架: https://oclif.io/
- Vitest测试框架: https://vitest.dev/
- TypeScript Docs: https://www.typescriptlang.org/

### B. 依赖清单

```json
{
  "dependencies": {
    "@zilliz/milvus2-sdk-node": "^2.5.8",
    "chokidar": "^4.0.0",
    "openai": "^4.0.0",
    "@google/generative-ai": "^0.17.0",
    "ollama": "^0.5.0",
    "zod": "^3.0.0",
    "commander": "^12.0.0",
    "toml": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "oclif": "^4.0.0",
    "tsup": "^8.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0"
  }
}
```

### C. 配置示例

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### D. 快速开始示例

```typescript
// 安装
npm install memsearch-ts

// 基本使用
import { MemSearch } from 'memsearch-ts';

const mem = new MemSearch({
  paths: ['./memory'],
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small'
  },
  milvus: {
    uri: '~/.memsearch/milvus.db',
    collection: 'memsearch_chunks'
  }
});

// 索引
await mem.index();

// 搜索
const results = await mem.search('Redis caching', { topK: 5 });
console.log(results);

// 清理
mem.close();
```

---

**文档版本**：1.0  
**最后更新**：202
