# memsearch-cli Command Reference

## Commands

### memsearch index

Index markdown files for semantic search.

```bash
memsearch index [paths...] [options]
```

**Options:**
- `-p, --provider <provider>` - Embedding provider (default: "openai")
- `-m, --model <model>` - Embedding model
- `-f, --force` - Force re-indexing
- `-c, --collection <collection>` - Milvus collection (default: "memsearch_chunks")
- `--milvus-uri <uri>` - Milvus URI (default: "~/.memsearch/milvus.db")

**Examples:**
```bash
memsearch index ./docs
memsearch index ./memory -p google
memsearch index --force
```

### memsearch search

Semantic search over indexed chunks.

```bash
memsearch search <query> [options]
```

**Options:**
- `-k, --top-k <number>` - Number of results (default: "10")
- `-j, --json` - Output as JSON
- `-c, --collection` - Milvus collection

**Examples:**
```bash
memsearch search "Redis caching"
memsearch search "auth flow" -k 20
memsearch search "API design" --json
```

### memsearch watch

Watch directories for file changes and auto-index.

```bash
memsearch watch [paths...] [options]
```

**Options:**
- `-d, --debounce <ms>` - Debounce milliseconds (default: "1500")
- `-c, --collection` - Milvus collection

**Examples:**
```bash
memsearch watch
memsearch watch ./memory ./docs
memsearch watch --debounce 3000
```

### memsearch config

Configuration management.

```bash
memsearch config <action> [key] [value] [options]
```

**Actions:**
- `init` - Initialize config file
- `set <key> <value>` - Set config value
- `get <key>` - Get config value
- `list` - List all config values

**Options:**
- `-f, --file <file>` - Config file path (default: ".memsearch.toml")
- `--resolved` - Show resolved config with defaults

**Examples:**
```bash
memsearch config init
memsearch config set embedding.provider google
memsearch config get embedding.model
memsearch config list --resolved
```

### memsearch stats

Show index statistics.

```bash
memsearch stats [options]
```

**Options:**
- `-c, --collection` - Milvus collection
- `--milvus-uri` - Milvus URI

**Examples:**
```bash
memsearch stats
memsearch stats -c my_collection
```

### memsearch reset

Drop all indexed data (with confirmation).

```bash
memsearch reset [options]
```

**Options:**
- `-y, --yes` - Skip confirmation
- `-c, --collection` - Milvus collection
- `--milvus-uri` - Milvus URI

**Examples:**
```bash
memsearch reset
memsearch reset --yes
```
