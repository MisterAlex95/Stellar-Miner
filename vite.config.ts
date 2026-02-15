/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: process.env.BASE_PATH ?? '/',
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/index.ts',
        'src/main.ts',
        'src/game.ts',
        'src/domain/services/ISaveLoadService.ts',
        'src/presentation/**',
        'src/application/handlers.ts',
      ],
      thresholds: {
        statements: 95,
        branches: 80,
        functions: 85,
        lines: 95,
      },
    },
  },
});
