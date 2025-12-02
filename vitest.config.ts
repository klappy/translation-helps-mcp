import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use our standardized test config
    globalSetup: "./tests/global-setup.ts",

    // Exclude tests that should run with different test runners
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      // Playwright E2E tests - run separately with `npx playwright test`
      "**/ui/e2e/**",
      // Experimental tests with broken imports - archived
      "**/src/experimental/tests/**",
      // Browser-mode tests - require vitest browser mode
      "**/page.svelte.test.ts",
      // Archived tests documenting known issues - not part of CI
      "**/tests/archive/**",
      // UI tests with SvelteKit-specific imports that dont resolve in Vitest
      "**/ui/tests/**",
    ],

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
