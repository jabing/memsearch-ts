# 版本升级计划 - v1.1.0

## TL;DR

> **目标**: 将 memsearch-core 从 v1.0.5 升级到 v1.1.0
>
> **原因**: 新增 Triple Memory 功能（12个新API），向后兼容
>
> **类型**: MINOR 版本升级

## 背景

根据语义化版本控制 (SemVer):

- MAJOR: 不兼容的API变更
- MINOR: 向后兼容的功能新增 ← 本次
- PATCH: 向后兼容的bug修复

## 任务清单

- [ ] 1. 更新 packages/core/package.json 版本号
- [ ] 2. 更新 packages/cli/package.json 版本号（如有依赖）
- [ ] 3. 创建/更新 CHANGELOG.md
- [ ] 4. 更新 README.md 版本徽章
- [ ] 5. Git commit 和 tag

---

## TODOs

- [ ] 1. 更新 core package.json 版本号

  **What to do**:
  - 编辑 `packages/core/package.json`
  - 将 `"version": "1.0.5"` 改为 `"version": "1.1.0"`

  **File**: `packages/core/package.json`

  **Change**:

  ```diff
  - "version": "1.0.5",
  + "version": "1.1.0",
  ```

  **Commit**: NO (grouped)

- [ ] 2. 创建 CHANGELOG.md

  **What to do**:
  - 在项目根目录创建 `CHANGELOG.md`
  - 添加 v1.1.0 的变更记录

  **Content**:

  ```markdown
  # Changelog

  All notable changes to this project will be documented in this file.

  The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
  and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

  ## [1.1.0] - 2026-03-02

  ### Added

  - **Triple Memory Support** - Semantic, Episodic, and Procedural memory types
  - **12 New API Methods**:
    - Memory CRUD: `addMemory()`, `getMemory()`, `updateMemory()`, `deleteMemory()`
    - Memory Search: `searchMemory()`, `getStats()`, `addMemories()`
    - Relations: `addRelation()`, `getRelations()`, `deleteRelation()`
    - Graph Traversal: `getNeighbors()`, `findPath()`
  - **In-memory Graph Engine** - BFS traversal with 1-3 hop neighbors
  - **Collection Migration Utilities** - Schema migration for existing data
  - **14 New Type Definitions** - Memory, MemoryInput, MemoryRelation, etc.

  ### Changed

  - Extended MilvusRecord with 9 new fields for memory metadata

  ### Tests

  - Added 14 new tests (integration tests for triple memory)
  - Total tests: 102 (was 88)

  ### Documentation

  - Extended API.md with triple memory documentation (+271 lines)
  - Added usage examples for all three memory types

  ### Backward Compatibility

  - ✅ All existing APIs unchanged
  - ✅ No breaking changes
  - ✅ 100% backward compatible

  ## [1.0.5] - 2025-02-28

  ### Added

  - Initial release
  - Semantic search for markdown knowledge bases
  - Milvus vector database integration
  - Multiple embedding providers (OpenAI, Google, Ollama, Voyage)
  - File watcher for live indexing
  - Hybrid search (dense + BM25 + RRF)
  ```

  **Commit**: NO (grouped)

- [ ] 3. Git commit 版本升级

  **What to do**:
  - 提交版本变更
  - 创建 git tag

  **Commands**:

  ```bash
  git add packages/core/package.json CHANGELOG.md
  git commit -m "chore(release): bump version to 1.1.0"
  git tag -a v1.1.0 -m "Release v1.1.0 - Triple Memory Support"
  ```

  **Commit**: YES
  - Message: `chore(release): bump version to 1.1.0`
  - Tag: `v1.1.0`

---

## 验证清单

发布前确认:

- [ ] 所有测试通过 (102/102)
- [ ] TypeScript 编译通过
- [ ] 版本号已更新
- [ ] CHANGELOG 已创建
- [ ] Git tag 已创建

## 发布后操作

如果需要发布到 npm:

```bash
cd packages/core
pnpm build
npm publish
```

推送到远程:

```bash
git push origin main --tags
```

---

## 成功标准

- [ ] package.json 版本为 1.1.0
- [ ] CHANGELOG.md 存在且内容完整
- [ ] Git tag v1.1.0 已创建
- [ ] 所有测试通过
