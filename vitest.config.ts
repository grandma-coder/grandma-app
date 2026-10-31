import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['{lib,messages,components}/**/*.test.{ts,tsx}'] },
  resolve: {
    alias: {
      '@': new URL('./', import.meta.url).pathname,
      'server-only': new URL('./test/server-only-stub.ts', import.meta.url).pathname,
    },
  },
})
