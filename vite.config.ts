/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  root: '.',
  publicDir: 'public',
  base: process.env.BASE_PATH ?? '/',
  build: {
    outDir: 'dist',
    target: 'es2022',
    rollupOptions: {
      input: ['index.html', 'balance.html'],
    },
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
        'src/application/handlers*.ts',
        'src/application/version.ts',
        'src/application/changelog.ts',
        'src/favicon-gen.ts',
      ],
      thresholds: {
        statements: 76,
        branches: 76,
        functions: 76,
        lines: 76,
      },
    },
  },
});
