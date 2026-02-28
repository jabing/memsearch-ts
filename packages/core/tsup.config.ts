import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false,  // Use tsc for DTS instead
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['@zilliz/milvus2-sdk-node', 'openai', '@google/generative-ai', 'ollama', 'chokidar', 'zod'],
});
