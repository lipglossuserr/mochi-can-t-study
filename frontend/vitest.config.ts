import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vitest configuration. Intentionally separate from vite.config.ts so
 * the Tailwind CSS plugin (which has no value in a test environment) is
 * not loaded, keeping test startup fast.
 *
 * Path alias (@) mirrors vite.config.ts so test files can import project
 * modules the same way the app does.
 *
 * Environment:
 *  - Pure-TS engine modules (CharacterStateMachine, BehavioralMemory,
 *    RoutineFamiliarity) → 'node' — no DOM overhead needed.
 *  - React component tests → override per-file with:
 *      // @vitest-environment jsdom
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
