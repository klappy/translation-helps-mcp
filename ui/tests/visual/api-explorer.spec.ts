import { test, expect } from '@playwright/test';

test.describe('API Explorer Visual Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/api-explorer');
	});

	test('should display API Explorer with correct layout', async ({ page }) => {
		// Wait for the page to load
		await page.waitForSelector('.api-explorer-page');

		// Take a screenshot of the entire page
		await expect(page).toHaveScreenshot('api-explorer-full.png');
	});

	test('should show endpoint details when clicked', async ({ page }) => {
		// Click on the first endpoint
		await page.click('.api-endpoint-btn:first-child');

		// Wait for details to appear
		await page.waitForSelector('.api-endpoint-details');

		// Take a screenshot of the endpoint details
		await expect(page.locator('.api-endpoint-details')).toHaveScreenshot(
			'api-explorer-endpoint-details.png'
		);
	});

	test('should display proper formatting for different response formats', async ({ page }) => {
		// Navigate to scripture endpoint
		await page.click('text=Fetch Scripture');

		// Wait for details
		await page.waitForSelector('.api-endpoint-details');

		// Fill in parameters
		await page.fill('input[placeholder*="reference"]', 'John 3:16');

		// Execute request
		await page.click('.api-execute-btn');

		// Wait for response
		await page.waitForSelector('.api-response', { timeout: 10000 });

		// Take screenshot of JSON response
		await expect(page.locator('.api-response')).toHaveScreenshot('api-response-json.png');
	});

	test('should display error states correctly', async ({ page }) => {
		// Click on an endpoint
		await page.click('text=Fetch Scripture');

		// Wait for details
		await page.waitForSelector('.api-endpoint-details');

		// Execute without required params to trigger error
		await page.click('.api-execute-btn');

		// Wait for error response
		await page.waitForSelector('.api-error', { timeout: 10000 });

		// Take screenshot of error state
		await expect(page.locator('.api-response')).toHaveScreenshot('api-response-error.png');
	});

	test('should have responsive sidebar', async ({ page }) => {
		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		// Take screenshot of mobile view
		await expect(page).toHaveScreenshot('api-explorer-mobile.png');

		// Test tablet viewport
		await page.setViewportSize({ width: 768, height: 1024 });

		// Take screenshot of tablet view
		await expect(page).toHaveScreenshot('api-explorer-tablet.png');
	});
});
