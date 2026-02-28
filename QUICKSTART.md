# Quick Start Guide

Welcome to **memsearch-ts**! This guide will help you get started with the project.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (recommended) or npm/yarn
- **Git** for version control

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/memsearch/memsearch-ts.git
cd memsearch-ts
```

### 2. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### 3. Project Structure

```
memsearch-ts/
├── packages/
│   ├── core/          # Core library (npm: memsearch-ts)
│   └── cli/           # CLI tool
├── ccplugin/           # Claude Code plugin
├── docs/              # Documentation
├── examples/          # Example code
├── tests/             # E2E tests
├── MIGRATION_PLAN.md  # Detailed implementation plan
└── README.md          # Project overview
```

### 4. Development Commands

```bash
# Run tests
pnpm test

# Build all packages
pnpm build

# Lint code
pnpm lint

# Format code
pnpm format

# Clean build artifacts
pnpm clean
```

## 📖 Usage Examples

### Basic Usage (Core Library)

```typescript
import { MemSearch } from 'memsearch-ts';

// Initialize memsearch
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

// Index markdown files
await mem.index();

// Semantic search
const results = await mem.search('Redis caching', { topK: 5 });
console.log(results);

// Clean up
mem.close();
```

### CLI Usage

```bash
# Initialize configuration
memsearch config init

# Index markdown files
memsearch index ./memory/

# Semantic search
memsearch search "how to configure Redis caching"

# Watch for changes
memsearch watch ./memory/

# Show statistics
memsearch stats
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm --filter memsearch-core test -- chunker.test.ts
```

## 🏗️ Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter memsearch-core build
```

## 📚 Documentation

- [README](./README.md) — Project overview and features
- [Migration Plan](./MIGRATION_PLAN.md) — Detailed implementation roadmap
- [API Docs](https://memsearch-ts.dev) — Full API reference (Coming soon)
- [Contributing](./CONTRIBUTING.md) — Contribution guidelines (Coming soon)

## 🤝 Contributing

We welcome contributions! Please see the [Migration Plan](./MIGRATION_PLAN.md) for the current development roadmap.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Submit a pull request

## 🐛 Troubleshooting

### pnpm install fails

```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Tests fail

```bash
# Ensure all dependencies are installed
pnpm install

# Run tests in verbose mode
pnpm test --reporter=verbose
```

### Build fails

```bash
# Clear build artifacts
pnpm clean

# Reinstall and rebuild
pnpm install
pnpm build
```

## 📞 Getting Help

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/memsearch/memsearch-ts/issues)
- **GitHub Discussions**: [Ask questions and discuss](https://github.com/memsearch/memsearch-ts/discussions)
- **Discord**: [Join our Discord community](https://discord.gg/FG6hMJStWu)

## 🎯 Next Steps

- Read the [Migration Plan](./MIGRATION_PLAN.md) to understand the implementation roadmap
- Explore [examples](./examples/) directory for sample code
- Check out [docs](./docs/) for in-depth documentation

---

**Happy coding! 🎉**
