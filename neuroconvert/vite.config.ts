import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `SINGLE_FILE=1 vite build` inlines all JS/CSS into one portable index.html
// that works when opened straight from disk (file://) with no server.
const singleFile = process.env.SINGLE_FILE === '1';

export default defineConfig({
  base: './',
  plugins: singleFile ? [viteSingleFile()] : [],
  define: {
    __SINGLE_FILE__: JSON.stringify(singleFile),
  },
  build: { target: 'es2022', sourcemap: false },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
