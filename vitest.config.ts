import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: ['src/env.d.ts', 'src/**/*.d.ts', 'node_modules/'],
    },
  },
  resolve: {
    alias: {
      '@components': resolve(__dirname, './src/components'),
      '@styles': resolve(__dirname, './src/styles'),
    },
  },
});
