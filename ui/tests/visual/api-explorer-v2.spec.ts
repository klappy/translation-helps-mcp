import { expect, test } from '@playwright/test';

test.describe('API Explorer v2', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/api-explorer-v2');
		await page.waitForLoadState('networkidle');
	});

	test('should load and display API endpoints', async ({ page }) => {
		// Check page title
		await expect(page).toHaveTitle(/API Explorer/);

		// Check header
		await expect(page.locator('h1:has-text("API Explorer v2")')).toBeVisible();

		// Check health status indicators
		await expect(page.locator('text=API Health:')).toBeVisible();
		await expect(page.locator('text=DCS Health:')).toBeVisible();

		// Wait for endpoints to load
		await page.waitForSelector('button:has-text("Scripture Resources")', { timeout: 10000 });

		// Take screenshot of initial state
		await page.screenshot({
			path: 'ui/tests/screenshots/api-explorer-v2-initial.png',
			fullPage: true
		});
	});

	test('should switch between categories', async ({ page }) => {
		// Click on Translation Helps
		await page.click('button:has-text("Translation Helps")');
		await expect(page.locator('button:has-text("Translation Helps")')).toHaveClass(
			/border-blue-500/
		);

		// Check that endpoints are displayed
		await expect(page.locator('text=Translation Notes')).toBeVisible();

		// Click on Discovery & Browse
		await page.click('button:has-text("Discovery & Browse")');
		await expect(page.locator('button:has-text("Discovery & Browse")')).toHaveClass(
			/border-blue-500/
		);

		// Click on Utilities & Health
		await page.click('button:has-text("Utilities & Health")');
		await expect(page.locator('button:has-text("Utilities & Health")')).toHaveClass(
			/border-blue-500/
		);

		// Take screenshot of categories
		await page.screenshot({
			path: 'ui/tests/screenshots/api-explorer-v2-categories.png',
			fullPage: true
		});
	});

	test('should select and test an endpoint', async ({ page }) => {
		// Click on Fetch Scripture endpoint
		await page.click('button:has-text("Fetch Scripture")');

		// Wait for endpoint details to load
		await expect(page.locator('h2:has-text("Fetch Scripture")')).toBeVisible();
		await expect(page.locator('text=Test Endpoint')).toBeVisible();

		// Check for ApiTester component
		await expect(page.locator('text=Parameters')).toBeVisible();

		// Fill in test parameters
		await page.fill('input[name="reference"]', 'John 3:16');
		await page.fill('input[name="language"]', 'en');
		await page.fill('input[name="organization"]', 'unfoldingWord');

		// Take screenshot before testing
		await page.screenshot({
			path: 'ui/tests/screenshots/api-explorer-v2-endpoint-form.png'
		});

		// Click Execute button
		await page.click('button:has-text("Execute")');

		// Wait for response
		await page.waitForSelector('text=Response', { timeout: 10000 });

		// Check for performance metrics
		await expect(page.locator('text=X-Ray Trace Information')).toBeVisible();
		await expect(page.locator('text=Response Time')).toBeVisible();
		await expect(page.locator('text=Cache Status')).toBeVisible();

		// Take screenshot with results
		await page.screenshot({
			path: 'ui/tests/screenshots/api-explorer-v2-results.png',
			fullPage: true
		});
	});

	test('should display X-ray tracing information', async ({ page }) => {
		// Test an endpoint
		await page.click('button:has-text("Fetch Scripture")');
		await page.fill('input[name="reference"]', 'John 3:16');
		await page.click('button:has-text("Execute")');

		// Wait for performance metrics
		await page.waitForSelector('text=X-Ray Trace Information');

		// Check for trace headers
		await expect(page.locator('text=Trace ID')).toBeVisible();
		await expect(page.locator('text=Cache Hit Rate')).toBeVisible();

		// Take screenshot of performance metrics
		await page.screenshot({
			path: 'ui/tests/screenshots/api-explorer-v2-xray-trace.png'
		});
	});

	test('should show health status updates', async ({ page }) => {
		// Wait for initial health check
		await page.waitForSelector('text=Healthy', { timeout: 10000 });

		// Click refresh
		await page.click('button:has-text("Refresh")');

		// Wait for checking state
		await expect(page.locator('text=Checking...')).toBeVisible();

		// Wait for results
		await page.waitForSelector('text=Healthy', { timeout: 10000 });

		// Take screenshot of health status
		await page.screenshot({
			path: 'ui/tests/screenshots/api-explorer-v2-health-status.png'
		});
	});

	test('should handle format parameters', async ({ page }) => {
		// Select Translation Notes endpoint
		await page.click('button:has-text("Translation Notes")');

		// Fill parameters
		await page.fill('input[name="reference"]', 'John 3:16');

		// Select markdown format
		await page.selectOption('select[name="format"]', 'md');

		// Execute
		await page.click('button:has-text("Execute")');

		// Wait for response
		await page.waitForSelector('text=Response');

		// Check that response is in markdown format
		await expect(page.locator('pre').first()).toContainText('###');

		// Take screenshot
		await page.screenshot({
			path: 'ui/tests/screenshots/api-explorer-v2-format-markdown.png'
		});
	});

	test('should copy example URL', async ({ page }) => {
		// Select an endpoint
		await page.click('button:has-text("Fetch Scripture")');

		// Click copy example
		await page.click('button:has-text("Copy Example")');

		// Check for copied feedback
		await expect(page.locator('text=Copied!')).toBeVisible();

		// Take screenshot
		await page.screenshot({
			path: 'ui/tests/screenshots/api-explorer-v2-copy-example.png'
		});
	});

	test('should be responsive on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		// Check that layout adapts
		await expect(page.locator('h1:has-text("API Explorer v2")')).toBeVisible();

		// Take mobile screenshot
		await page.screenshot({
			path: 'ui/tests/screenshots/api-explorer-v2-mobile.png',
			fullPage: true
		});
	});
});

// Visual regression tests
test.describe('API Explorer v2 Visual Regression', () => {
	test('compare initial load state', async ({ page }) => {
		await page.goto('/api-explorer-v2');
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000); // Wait for animations

		await expect(page).toHaveScreenshot('api-explorer-v2-initial.png', {
			fullPage: true,
			animations: 'disabled'
		});
	});

	test('compare endpoint details view', async ({ page }) => {
		await page.goto('/api-explorer-v2');
		await page.waitForLoadState('networkidle');

		// Select an endpoint
		await page.click('button:has-text("Fetch Scripture")');
		await page.waitForTimeout(500);

		await expect(page).toHaveScreenshot('api-explorer-v2-endpoint-details.png', {
			fullPage: true,
			animations: 'disabled'
		});
	});

	test('compare performance metrics display', async ({ page }) => {
		await page.goto('/api-explorer-v2');
		await page.waitForLoadState('networkidle');

		// Execute a test
		await page.click('button:has-text("Fetch Scripture")');
		await page.fill('input[name="reference"]', 'John 3:16');
		await page.click('button:has-text("Execute")');
		await page.waitForSelector('text=X-Ray Trace Information');
		await page.waitForTimeout(500);

		// Capture just the performance metrics section
		const metricsSection = await page.locator('text=X-Ray Trace Information').locator('..');
		await expect(metricsSection).toHaveScreenshot('api-explorer-v2-metrics.png', {
			animations: 'disabled'
		});
	});
});
