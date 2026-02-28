# memsearch-cli

> CLI tool for memsearch-ts - Semantic memory search

[![npm version](https://badge.fury.io/js/memsearch-cli.svg)](https://www.npmjs.com/package/memsearch-cli)
[![License](https://img.shields.io/github/license/jabing/memsearch-ts.svg)](LICENSE)

## Installation

```bash
npm install -g memsearch-cli
```

## Commands

### index

Index markdown files for semantic search.

```bash
memsearch index [paths...] [options]

# Options:
#   -p, --provider <provider>    Embedding provider (default: "openai")
#   -m, --model <model>          Embedding model
#   -f, --force                  Force re-indexing
#   -c, --collection <name>      Milvus collection name
#   --milvus-uri <uri>           Milvus URI

# Examples:
memsearch index ./docs
memsearch index ./memory -p google
memsearch index --force
```

### search

Semantic search over indexed chunks.

```bash
memsearch search <query> [options]

# Options:
#   -k, --top-k <number>    Number of results (default: 10)
#   -j, --json              Output as JSON
#   -c, --collection <name> Milvus collection name

# Examples:
memsearch search "Redis caching"
memsearch search "auth flow" -k 20
memsearch search "API design" --json
```

### watch

Watch directories for file changes and auto-index.

```bash
memsearch watch [paths...] [options]

# Options:
#   -d, --debounce <ms>     Debounce milliseconds (default: 1500)
#   -c, --collection <name> Milvus collection name

# Example:
memsearch watch ./memory
```

### config

Configuration management.

```bash
memsearch config <action> [key] [value] [options]

# Actions: init, set, get, list
# Examples:
memsearch config init
memsearch config set embedding.provider google
memsearch config get embedding.model
memsearch config list
```

### stats

Show index statistics.

```bash
memsearch stats [options]

# Example:
memsearch stats
# Output:
# Collection: memsearch_chunks
# Total chunks: 1234
# Indexed files: 56
```

### reset

Drop all indexed data (with confirmation).

```bash
memsearch reset [options]

# Options:
#   -y, --yes           Skip confirmation
#   -c, --collection    Milvus collection name

# Example:
memsearch reset --yes
```

## License

[MIT](./LICENSE)

## Repository

https://github.com/jabing/memsearch-ts
