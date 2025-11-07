import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '.nuxt/',
        '.output/',
        'public/',
        'docs/',
        '*.config.ts',
        '*.config.js',
        'utils/generateData.ts',
        'utils/evalHarness.ts'
      ],
      include: [
        'server/**/*.ts',
        'utils/**/*.ts',
        'composables/**/*.ts',
        'components/**/*.vue',
        'pages/**/*.vue'
      ]
    }
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
      '@': resolve(__dirname, '.'),
    },
  },
})

