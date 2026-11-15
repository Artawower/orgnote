import { defineConfig } from 'tsup';

const BANNER = `#!/usr/bin/env node
import { createRequire as __piCreateRequire } from 'module';
const require = __piCreateRequire(import.meta.url);`;

export default defineConfig({
  entry: ['src/index.ts'],
  bundle: true,
  clean: true,
  format: ['esm'],
  noExternal: [/.*/],
  outDir: 'dist',
  platform: 'node',
  splitting: false,
  target: 'node22',
  esbuildOptions(options) {
    options.banner = { js: BANNER };
  },
});
