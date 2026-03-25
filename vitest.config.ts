import { defineConfig } from 'vitest/config'
import path from 'path'
import { VitestReporter } from 'tdd-guard-vitest'

export default defineConfig({
  test: {
    environment: 'jsdom',
    reporters: ['default', new VitestReporter(path.resolve(__dirname))],
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
