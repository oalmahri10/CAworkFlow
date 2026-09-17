import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      DATABASE_URL: "file:./test.db",
      DOCUMENTS_ROOT: "./var/test-documents",
      SESSION_SECRET: "test-secret-not-for-production-use-000000",
    },
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
