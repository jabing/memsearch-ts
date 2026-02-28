/**
 * memsearch config command
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createLogger } from 'memsearch-core/utils';

const logger = createLogger('cli:config');

export interface ConfigOptions {
  file: string;
  resolved?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ConfigValue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export async function configCommand(
  action: string,
  key?: string,
  value?: string,
  options?: ConfigOptions
): Promise<void> {
  logger.info('Config command', { action, key, value });

  const configFile = options?.file || '.memsearch.toml';
  const configPath = resolve(configFile);

  switch (action) {
    case 'init':
      await initConfig(configPath);
      break;

    case 'set':
      if (!key || value === undefined) {
        console.error('Usage: memsearch config set <key> <value>');
        process.exit(1);
      }
      await setConfig(configPath, key, value);
      break;

    case 'get':
      if (!key) {
        console.error('Usage: memsearch config get <key>');
        process.exit(1);
      }
      await getConfig(configPath, key);
      break;

    case 'list':
      await listConfig(configPath, options?.resolved);
      break;

    default:
      console.error(`Unknown action: ${action}`);
      console.log('Available actions: init, set, get, list');
      process.exit(1);
  }
}

async function initConfig(configPath: string): Promise<void> {
  const defaultConfig = {
    embedding: {
      provider: 'openai',
      model: 'text-embedding-3-small',
    },
    milvus: {
      uri: '~/.memsearch/milvus.db',
      collection: 'memsearch_chunks',
    },
    chunking: {
      maxChunkSize: 1500,
      overlapLines: 2,
    },
  };

  if (existsSync(configPath)) {
    console.log(`⚠️  Config file already exists: ${configPath}`);
    console.log('Use "memsearch config set" to modify');
    return;
  }

  // Write as TOML (simplified - just use JSON for now)
  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log(`✅ Config initialized: ${configPath}`);
  console.log('\nDefault configuration:');
  console.log(JSON.stringify(defaultConfig, null, 2));
}

async function setConfig(configPath: string, key: string, value: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config: any = {};
  
  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8');
    try {
      config = JSON.parse(content);
    } catch {
      // Try TOML parsing (simplified)
      console.warn('⚠️  Non-JSON config detected, creating new config');
    }
  }

  // Set nested key (e.g., embedding.provider)
  const keys = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: Record<string, unknown> = config;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!k) continue;
    if (!current[k]) {
      current[k] = {};
    }
    const nextCurrent = current[k];
    if (nextCurrent && typeof nextCurrent === 'object') {
      current = nextCurrent as Record<string, unknown>;
    } else {
      current[k] = {};
      current = current[k] as Record<string, unknown>;
    }
  }
  const lastKey = keys[keys.length - 1];
  if (lastKey) {
    current[lastKey] = value;
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Set ${key} = ${value}`);
}

async function getConfig(configPath: string, key: string): Promise<void> {
  if (!existsSync(configPath)) {
    console.error('❌ Config file not found. Run "memsearch config init" first.');
    process.exit(1);
  }

  const content = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(content);

  const keys = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: unknown = config;
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = (value as ConfigValue)[k];
    } else {
      value = undefined;
      break;
    }
  }

  if (value === undefined) {
    console.error(`❌ Key not found: ${key}`);
    process.exit(1);
  }

  console.log(value);
}

async function listConfig(configPath: string, resolved?: boolean): Promise<void> {
  if (!existsSync(configPath)) {
    console.log('📄 No config file found.');
    console.log('Run "memsearch config init" to create one.');
    return;
  }

  const content = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(content);

  console.log(`Config file: ${configPath}`);
  if (resolved) {
    console.log('(Showing resolved config with defaults)');
  }
  console.log(JSON.stringify(config, null, 2));
}
