import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use our standardized test config
    globalSetup: "./tests/global-setup.ts",

    // Set environment variables for ALL tests
    env: {
      // Force Wrangler port
      TEST_BASE_URL: "http://localhost:8787",
      // Disable any other ports
      BASE_URL: undefined,
      API_BASE_URL: undefined,
      TEST_URL: undefined,
    },

    // Test timeouts
    testTimeout: 30000,
    hookTimeout: 30000,

    // Reporter options
    reporters: ["default"],

    // Coverage settings
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", "tests/**", "**/*.test.ts", "**/*.spec.ts"],
    },
  },
});
