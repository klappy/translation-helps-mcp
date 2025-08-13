import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for visual testing of Translation Helps MCP
 */
export default defineConfig({
	testDir: './tests/visual',

	// Run tests in parallel
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Limit workers to ensure consistent screenshots
	workers: process.env.CI ? 1 : 2,

	// Reporter to use
	reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

	// Shared settings for all projects
	use: {
		// Base URL for tests
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8174',

		// Collect trace when retrying the failed test
		trace: 'on-first-retry',

		// Screenshots
		screenshot: {
			mode: 'only-on-failure',
			fullPage: true
		},

		// Viewport for consistent visual tests
		viewport: { width: 1280, height: 720 }
	},

	// Configure projects for major browsers
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}

		// Only test on Chrome for now to keep it simple
		// Uncomment to test on other browsers
		// {
		//   name: 'firefox',
		//   use: { ...devices['Desktop Firefox'] }
		// },
		// {
		//   name: 'webkit',
		//   use: { ...devices['Desktop Safari'] }
		// }
	],

	// Run your local dev server before starting the tests
	webServer: {
		command: 'npm run dev',
		port: 8174,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000
	}
});
