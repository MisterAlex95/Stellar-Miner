/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: process.env.BASE_PATH ?? '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
        'src/application/version.ts',
        'src/application/changelog.ts',
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
