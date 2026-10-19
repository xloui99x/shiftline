/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Served from https://<user>.github.io/shiftline/ on GitHub Pages.
  base: process.env.GITHUB_PAGES === 'true' ? '/shiftline/' : '/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
