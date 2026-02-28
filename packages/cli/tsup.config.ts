import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['memsearch-core'],
  minify: false,
  keepNames: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  shims: true,
});
