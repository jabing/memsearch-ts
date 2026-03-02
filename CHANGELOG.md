# Changelog

All notable changes to memsearch-ts will be documented in this file.

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
- **Integration Tests** - 14 new tests for end-to-end workflows

### Changed

- Extended MilvusRecord with 9 new fields for memory metadata
- Total tests: 102 (was 88)

### Documentation

- Extended API.md with triple memory documentation (+271 lines)
- Added usage examples for all three memory types

### Backward Compatibility

- All existing APIs unchanged
- No breaking changes
- 100% backward compatible

## [1.0.0] - 2026-02-28

### Added

- **Core Library** (`memsearch-core`)
  - MemSearch main class with index/search/watch/compact methods
  - MilvusStore wrapper with full CRUD operations
  - 4 Embedding providers: OpenAI, Google, Ollama, Voyage
  - Markdown chunker with heading-based splitting
  - File scanner for markdown file discovery
  - Zod schema validation for configuration
  - Comprehensive error handling system
  - Logger utility with level filtering

- **CLI Tool** (`memsearch-cli`)
  - `memsearch index` - Index markdown files
  - `memsearch search` - Semantic search with JSON output
  - `memsearch watch` - File watcher with debounce
  - `memsearch config` - Configuration management (init/set/get/list)
  - `memsearch stats` - Index statistics
  - `memsearch reset` - Drop indexed data

- **Claude Code Plugin**
  - 4 hooks: SessionStart, UserPromptSubmit, Stop, SessionEnd
  - memory-recall skill (context: fork)
  - Automatic session summarization
  - Persistent memory in .memsearch/memory/

- **Documentation**
  - API reference for core library
  - CLI command reference
  - Migration plan
  - Quick start guide

### Technical Details

- **Total code**: ~3000 lines TypeScript
- **Test coverage**: Unit tests for core modules
- **Build output**: ESM + CJS dual format
- **TypeScript**: Strict mode with full type definitions

### Known Limitations

- Local embedding (sentence-transformers) not supported
- Browser runtime not supported
- compact() method is placeholder (TODO)

---

**Initial release** 🎉
