# memsearch-ts v1.0.0 发布说明

🎉 **memsearch 现在支持 TypeScript/Node.js!**

## 安装

```bash
# 安装核心库
npm install memsearch-core

# 安装 CLI 工具
npm install -g memsearch-cli

# 或者使用 pnpm
pnpm add memsearch-core
pnpm add -g memsearch-cli
```

## 快速开始

### 使用核心库

```typescript
import { MemSearch } from 'memsearch-core';

const mem = new MemSearch({
  paths: ['./memory'],
  embedding: { provider: 'openai' },
  milvus: { uri: '~/.memsearch/milvus.db' },
});

await mem.index();
const results = await mem.search('Redis caching');
```

### 使用 CLI

```bash
# 索引文件
memsearch index ./docs

# 搜索
memsearch search "how to configure Redis"

# 监视变化
memsearch watch ./memory
```

## 主要功能

- 📝 **Markdown-first** - 支持 markdown 文件语义搜索
- ⚡ **Smart dedup** - SHA-256 内容去重
- 🔄 **Live sync** - 文件变动自动索引
- 🔍 **Hybrid search** - 稠密向量 + BM25 混合搜索
- 🧩 **Claude Code 插件** - 自动持久化记忆

## Embedding 支持

- ✅ OpenAI (text-embedding-3-small)
- ✅ Google (gemini-embedding-001)
- ✅ Ollama (本地运行)
- ✅ Voyage AI

## 系统要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (推荐)

## 文档

- [API 文档](./packages/core/API.md)
- [CLI 参考](./packages/cli/API.md)
- [快速开始](./QUICKSTART.md)

## 变更日志

见 [CHANGELOG.md](./CHANGELOG.md)

---

**Happy coding!** 🚀
