# memsearch-core

> Semantic memory search core library for TypeScript/Node.js

[![npm version](https://badge.fury.io/js/memsearch-core.svg)](https://www.npmjs.com/package/memsearch-core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/github/license/jabing/memsearch-ts.svg)](LICENSE)

## Installation

```bash
npm install memsearch-core
```

## Quick Start

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

## Features

- 📝 **Markdown-first** — Your memories are just `.md` files
- ⚡ **Smart dedup** — SHA-256 content hashing prevents duplicates
- 🔄 **Live sync** — File watcher auto-indexes changes
- 🔍 **Hybrid search** — Dense vector + BM25 + RRF reranking
- 🎯 **Type-safe** — Full TypeScript support

## Embedding Providers

| Provider | Model | Env Variable |
|----------|-------|--------------|
| OpenAI | `text-embedding-3-small` | `OPENAI_API_KEY` |
| Google | `gemini-embedding-001` | `GOOGLE_API_KEY` |
| Voyage | `voyage-3-lite` | `VOYAGE_API_KEY` |
| Ollama | `nomic-embed-text` | — (local) |

## API Reference

See [API.md](./API.md) for full documentation.

## License

[MIT](./LICENSE)

## Repository

https://github.com/jabing/memsearch-ts
