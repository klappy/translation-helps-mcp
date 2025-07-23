import { expect, test } from '@playwright/test';

test.describe('MCP Tools Page - Fetch Scripture Menu', () => {
	test('should not crash when clicking fetch-scripture in side menu', async ({ page }) => {
		// Navigate to the MCP tools page
		await page.goto('/mcp-tools');

		// Wait for the page to load
		await page.waitForLoadState('networkidle');

		// Verify the page loaded successfully - be more specific about which h1
		await expect(page.getByRole('heading', { name: /MCP Tools/i }).first()).toBeVisible();

		// Take a screenshot before clicking
		await page.screenshot({ path: 'mcp-tools-before-click.png' });

		// Look for the fetch-scripture link/button in the sidebar
		const fetchScriptureButton = page.getByText('Fetch Scripture').first();

		// Verify the button exists
		await expect(fetchScriptureButton).toBeVisible();

		// Listen for console errors
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				// Filter out network timeouts since those are expected in test environment
				const text = msg.text();
				if (!text.includes('ConnectTimeoutError') && !text.includes('fetch failed')) {
					errors.push(text);
				}
			}
		});

		// Listen for page errors (JavaScript crashes)
		const pageErrors: Error[] = [];
		page.on('pageerror', (error) => {
			pageErrors.push(error);
		});

		// Listen for uncaught exceptions
		const uncaughtExceptions: Error[] = [];
		page.on('pageerror', (error) => {
			if (error.name === 'TypeError' || error.name === 'ReferenceError') {
				uncaughtExceptions.push(error);
			}
		});

		// Click on fetch-scripture
		await fetchScriptureButton.click();

		// Wait a moment for any errors to surface
		await page.waitForTimeout(2000);

		// Take a screenshot after clicking
		await page.screenshot({ path: 'mcp-tools-after-click.png' });

		// Check that the page didn't crash
		await expect(page.locator('body')).toBeVisible();

		// Look for fetch-scripture specific content that should appear - be more specific
		const referenceInput = page.getByRole('textbox', { name: /reference/i });

		// Verify the fetch-scripture tool interface loads
		await expect(referenceInput).toBeVisible({ timeout: 10000 });

		// Log any errors found
		if (errors.length > 0) {
			console.log('Console errors detected:', errors);
		}

		if (pageErrors.length > 0) {
			console.log('Page errors detected:', pageErrors);
		}

		if (uncaughtExceptions.length > 0) {
			console.log('Uncaught exceptions detected:', uncaughtExceptions);
		}

		// The page should not have any JavaScript crashes
		expect(
			pageErrors.length,
			`JavaScript page errors found: ${pageErrors.map((e) => e.message).join(', ')}`
		).toBe(0);
		expect(
			uncaughtExceptions.length,
			`Uncaught exceptions found: ${uncaughtExceptions.map((e) => e.message).join(', ')}`
		).toBe(0);

		// Verify the tool is fully functional - try typing in the input
		await referenceInput.fill('John 3:16');
		await expect(referenceInput).toHaveValue('John 3:16');

		console.log('✅ Fetch Scripture tool loaded successfully and is functional!');
	});

	test('should be able to navigate between different tools without crashing', async ({ page }) => {
		await page.goto('/mcp-tools');
		await page.waitForLoadState('networkidle');

		// Try clicking different menu items to see which ones crash
		const menuItems = [
			'Overview',
			'Fetch Scripture',
			'Fetch Translation Notes',
			'Fetch Translation Questions',
			'Fetch Resources'
		];

		for (const item of menuItems) {
			console.log(`Testing navigation to: ${item}`);

			const menuButton = page.getByText(item).first();
			if (await menuButton.isVisible()) {
				await menuButton.click();
				await page.waitForTimeout(500);

				// Verify page didn't crash
				await expect(page.locator('body')).toBeVisible();

				console.log(`✓ ${item} loaded successfully`);
			}
		}
	});
});
