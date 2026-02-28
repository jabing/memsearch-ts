# memsearch-ts

> **Semantic memory search for markdown knowledge bases** — TypeScript/Node.js port of memsearch

[![npm version](https://badge.fury.io/js/memsearch-core.svg)](https://www.npmjs.com/package/memsearch-core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/github/license/jabing/memsearch-ts.svg)](LICENSE)
[![Build Status](https://github.com/jabing/memsearch-ts/workflows/CI/badge.svg)](https://github.com/jabing/memsearch-ts/actions)

📝 **Markdown-first** · ⚡ **Smart dedup** · 🔍 **Hybrid search** · 🧩 **Claude Code plugin**

A TypeScript/Node.js semantic memory search engine for markdown knowledge bases, built on Milvus vector database.

---

## ✨ Features

- 📝 **Markdown-first** — Your memories are just `.md` files, human-readable and git-friendly
- ⚡ **Smart dedup** — SHA-256 content hashing prevents duplicate embeddings
- 🔄 **Live sync** — File watcher auto-indexes changes (chokidar-based)
- 🔍 **Hybrid search** — Dense vector + BM25 sparse + RRF reranking
- 🧩 **Claude Code plugin** — Automatic persistent memory for Claude Code sessions
- 🎯 **Type-safe** — Full TypeScript support with strict mode
- 🌐 **Multiple embeddings** — OpenAI, Google, Ollama, Voyage
- 🗄️ **Flexible backends** — Milvus Lite, Server, Zilliz Cloud

---

## 🚀 Quick Start

### Installation

```bash
# Install core library
npm install memsearch-core

# Install CLI tool
npm install -g memsearch-cli
```

### Basic Usage

```typescript
import { MemSearch } from 'memsearch-core';

const mem = new MemSearch({
  paths: ['./memory'],
  embedding: { provider: 'openai', model: 'text-embedding-3-small' },
  milvus: { uri: '~/.memsearch/milvus.db', collection: 'memsearch_chunks' },
});

// Index markdown files
await mem.index();

// Semantic search
const results = await mem.search('Redis caching', { topK: 5 });
console.log(results[0].content, results[0].score);

// Cleanup
mem.close();
```

### CLI Usage

```bash
# Index markdown files
memsearch index ./memory/

# Semantic search
memsearch search "how to configure Redis caching"

# Watch for changes
memsearch watch ./memory/

# Show statistics
memsearch stats
```

---

## 📚 Documentation

- [API Reference](./packages/core/API.md) — Core library API
- [CLI Reference](./packages/cli/API.md) — Command-line interface
- [Quick Start](./QUICKSTART.md) — Getting started guide
- [Contributing](./CONTRIBUTING.md) — Contribution guidelines

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         memsearch-ts                   │
├─────────────────────────────────────────┤
│  Core Library (memsearch-core)         │
│  - MemSearch class                    │
│  - MilvusStore (vector DB)            │
│  - Chunker, Scanner, Watcher          │
│  - Embedding providers                │
├─────────────────────────────────────────┤
│  CLI Tool (memsearch-cli)              │
│  - index, search, watch, config...    │
├─────────────────────────────────────────┤
│  Claude Code Plugin (ccplugin)         │
│  - 4 lifecycle hooks                  │
│  - memory-recall skill               │
└─────────────────────────────────────────┘
```

---

## 🔌 Embedding Providers

| Provider | Install | Default Model | Env Variable |
|----------|---------|---------------|--------------|
| OpenAI | Included | `text-embedding-3-small` | `OPENAI_API_KEY` |
| Google | Optional | `gemini-embedding-001` | `GOOGLE_API_KEY` |
| Voyage | Optional | `voyage-3-lite` | `VOYAGE_API_KEY` |
| Ollama | Optional | `nomic-embed-text` | — (local) |

---

## 🗄️ Milvus Backend

| Mode | `milvus_uri` | Best for |
|------|-------------|----------|
| **Milvus Lite** | `~/.memsearch/milvus.db` | Personal use, dev |
| **Milvus Server** | `http://localhost:19530` | Multi-agent, team |
| **Zilliz Cloud** | `https://*.zillizcloud.com` | Production |

---

## 🛠️ Development

```bash
# Clone repository
git clone https://github.com/jabing/memsearch-ts.git
cd memsearch-ts

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

---

## 📦 Project Structure

```
memsearch-ts/
├── packages/
│   ├── core/          # Core library (memsearch-core)
│   └── cli/           # CLI tool (memsearch-cli)
├── ccplugin/          # Claude Code plugin
├── docs/              # Documentation
├── examples/          # Example code
└── tests/             # E2E tests
```

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## 📄 License

[MIT](./LICENSE) — see LICENSE file for details.

---

## 🔗 Links

- [memsearch (Python)](https://github.com/zilliztech/memsearch) — Original Python implementation
- [Milvus](https://milvus.io/) — Vector database
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — AI coding assistant

---

**Status**: ✅ v1.0.0 Released

