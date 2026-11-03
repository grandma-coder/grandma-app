import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Our app tests only — exclude generated orchestration-skill internals
    // (they use their own node:test runner, not vitest) and deps.
    include: ["{app,lib,server,components,jobs,db}/**/*.{test,spec}.{ts,tsx}"],
    exclude: [".claude/**", "node_modules/**", ".next/**"],
  },
  resolve: {
    alias: {
      // `server-only` throws if imported outside an RSC context; stub it in tests.
      "server-only": new URL("./test/stubs/server-only.ts", import.meta.url).pathname,
      "@": new URL("./", import.meta.url).pathname,
    },
  },
})
