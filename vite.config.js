import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(import.meta.dirname, 'frontend'),
  base: './',
  build: { outDir: resolve(import.meta.dirname, 'frontend/dist'), emptyOutDir: true },
});
