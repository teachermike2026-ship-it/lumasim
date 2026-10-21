import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Playwright specs live in tests/e2e and are executed by Playwright.
    include: ["tests/unit/**/*.test.ts"],
    restoreMocks: true,
  },
});
