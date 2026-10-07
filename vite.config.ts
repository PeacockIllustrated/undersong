import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    // hybrid branch (ADR-H001): Holloway & Co. at the root, Undersong kept at undersong.html
    rollupOptions: { input: { main: 'index.html', undersong: 'undersong.html' } },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
