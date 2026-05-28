import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Mock server-only so it's a no-op in Vitest (Node env, not Next.js RSC).
      // The package throws in non-server contexts; tests run fine without the guard.
      "server-only": path.resolve(__dirname, "src/lib/test/server-only-mock.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Set SKIP_INTEGRATION_TESTS=true in CI when Supabase DB is not reachable.
    // Integration tests (repositories/**) require a live DB; unit tests do not.
    exclude: process.env.SKIP_INTEGRATION_TESTS === "true"
      ? ["**/node_modules/**", "src/lib/repositories/**/*.test.ts"]
      : ["**/node_modules/**"],
    setupFiles: ["src/lib/test/setup.ts"],
    env: {
      NODE_ENV: "test",
    },
    // Serialize test files: integration tests share a single test DB
    // (Supabase project amfgmckgntsrovdrmojy). Parallel files would race
    // on inserts/migrations. Per-test fresh user_id provides isolation,
    // not parallel workers.
    fileParallelism: false,
    testTimeout: 30000,
  },
});
