# Contributing to memsearch-ts

Thank you for your interest in contributing! This guide helps you get started.

## Development Setup

```bash
# Clone repository
git clone https://github.com/memsearch/memsearch-ts.git
cd memsearch-ts

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build
```

## Project Structure

```
memsearch-ts/
├── packages/
│   ├── core/          # Core library
│   └── cli/           # CLI tool
├── ccplugin/          # Claude Code plugin
├── docs/              # Documentation
└── tests/             # E2E tests
```

## Code Style

- TypeScript strict mode
- ESLint + Prettier
- 100 character line width
- Single quotes

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Submit a pull request

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm --filter memsearch-core test -- chunker.test.ts
```

## Documentation

- Update API docs in `packages/*/API.md`
- Add examples for new features
- Update README if needed

## Questions?

Open an issue or join our Discord: https://discord.gg/FG6hMJStWu
