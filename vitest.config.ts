import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/lib/test/setup.ts"],
    env: {
      NODE_ENV: "test",
    },
    // Serialize test files: integration tests share a single test DB
    // (Supabase project amfgmckgntsrovdrmojy). Parallel files would race
    // on inserts/migrations. Per-test fresh user_id provides isolation,
    // not parallel workers.
    threads: false,
  } as any,
});
