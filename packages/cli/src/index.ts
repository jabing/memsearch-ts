#!/usr/bin/env node

/**
 * memsearch CLI
 * 
 * Semantic memory search for markdown knowledge bases
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to read version from package.json
let version = '0.0.0-dev';
try {
  const pkgPath = join(__dirname, '../../package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  version = pkg.version;
} catch {
  // Ignore error, use default version
}

const program = new Command();

program
  .name('memsearch')
  .version(version)
  .description('Semantic memory search for markdown knowledge bases');

// Index command
program
  .command('index [paths...]')
  .description('Index markdown files')
  .option('-p, --provider <provider>', 'Embedding provider', 'openai')
  .option('-m, --model <model>', 'Embedding model')
  .option('-f, --force', 'Force re-index')
  .option('-c, --collection <collection>', 'Milvus collection name', 'memsearch_chunks')
  .option('--milvus-uri <uri>', 'Milvus URI', '~/.memsearch/milvus.db')
  .action(async (paths, options) => {
    const { indexCommand } = await import('./commands/index.js');
    await indexCommand(paths, options);
  });

// Search command
program
  .command('search <query>')
  .description('Semantic search')
  .option('-k, --top-k <number>', 'Number of results', '10')
  .option('-j, --json', 'Output as JSON')
  .option('-c, --collection <collection>', 'Milvus collection name', 'memsearch_chunks')
  .option('--milvus-uri <uri>', 'Milvus URI', '~/.memsearch/milvus.db')
  .action(async (query, options) => {
    const { searchCommand } = await import('./commands/search.js');
    await searchCommand(query, options);
  });

// Watch command
program
  .command('watch [paths...]')
  .description('Watch for file changes')
  .option('-d, --debounce <ms>', 'Debounce milliseconds', '1500')
  .option('-c, --collection <collection>', 'Milvus collection name', 'memsearch_chunks')
  .option('--milvus-uri <uri>', 'Milvus URI', '~/.memsearch/milvus.db')
  .action(async (paths, options) => {
    const { watchCommand } = await import('./commands/watch.js');
    await watchCommand(paths, options);
  });

// Config command
program
  .command('config <action>')
  .description('Configuration management')
  .argument('[key]', 'Config key')
  .argument('[value]', 'Config value')
  .option('-f, --file <file>', 'Config file path', '.memsearch.toml')
  .option('--resolved', 'Show resolved config')
  .action(async (action, key, value, options) => {
    const { configCommand } = await import('./commands/config.js');
    await configCommand(action, key, value, options);
  });

// Stats command
program
  .command('stats')
  .description('Show index statistics')
  .option('-c, --collection <collection>', 'Milvus collection name', 'memsearch_chunks')
  .option('--milvus-uri <uri>', 'Milvus URI', '~/.memsearch/milvus.db')
  .action(async (options) => {
    const { statsCommand } = await import('./commands/stats.js');
    await statsCommand(options);
  });

// Reset command
program
  .command('reset')
  .description('Drop all indexed data')
  .option('-y, --yes', 'Skip confirmation')
  .option('-c, --collection <collection>', 'Milvus collection name', 'memsearch_chunks')
  .option('--milvus-uri <uri>', 'Milvus URI', '~/.memsearch/milvus.db')
  .action(async (options) => {
    const { resetCommand } = await import('./commands/reset.js');
    await resetCommand(options);
  });

program.parse();
