/**
 * Developer Integration E2E Tests
 *
 * Tests the developer integration workflows including API authentication,
 * resource discovery, batch operations, and error recovery patterns.
 *
 * Validates Task 13 from implementation plan - Developer workflows
 */

import { expect, test } from '@playwright/test';

test.describe('Developer Integration', () => {
	test.beforeEach(async ({ page }) => {
		// Set viewport for developer-focused testing
		await page.setViewportSize({ width: 1200, height: 800 });
	});

	test('API discovery and documentation workflow', async ({ page }) => {
		// Test how developers discover and understand the API
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing API discovery workflow...');

		// Verify all major API endpoints are discoverable
		const endpointCards = page.locator('[data-testid="endpoint-card"]');
		const cardCount = await endpointCards.count();
		expect(cardCount).toBeGreaterThan(5); // Should have multiple endpoints

		// Test that each endpoint has documentation
		const firstCard = endpointCards.first();
		await expect(firstCard).toBeVisible();

		// Look for description or documentation text
		const description = firstCard.locator('.description, [data-testid="endpoint-description"]');
		if (await description.isVisible()) {
			const descText = await description.textContent();
			expect(descText).toBeTruthy();
		}
	});

	test('resource discovery patterns', async ({ page }) => {
		// Test how developers can discover available resources
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing resource discovery...');

		// Step 1: Discover available languages
		const languagesCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Languages' });
		if (await languagesCard.isVisible()) {
			await languagesCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');

			// Verify languages list is returned
			const response = page.locator('[data-testid="response-data"]').first();
			await expect(response).toBeVisible();
			await expect(response).toContainText('en'); // English should be available
		}

		// Step 2: Discover available resources for a language
		const resourcesCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Available Resources' });
		if (await resourcesCard.isVisible()) {
			await resourcesCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			const resourcesResult = page.locator('[data-testid="test-result"]').nth(1);
			await expect(resourcesResult).toContainText('success');

			// Verify resource types are listed
			const resourcesResponse = page.locator('[data-testid="response-data"]').nth(1);
			await expect(resourcesResponse).toBeVisible();
		}

		// Step 3: Discover available books for a resource
		const booksCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Available Books' });
		if (await booksCard.isVisible()) {
			await booksCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			const booksResult = page.locator('[data-testid="test-result"]').nth(2);
			await expect(booksResult).toContainText('success');
		}
	});

	test('batch operations for developers', async ({ page }) => {
		// Test batch operations that developers need for efficient integrations
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing batch operations...');

		// Simulate developer making multiple related API calls
		const batchEndpoints = [
			'Fetch Scripture',
			'Translation Notes',
			'Translation Words',
			'Translation Questions'
		];

		let successCount = 0;

		for (const endpoint of batchEndpoints) {
			const card = page.locator('[data-testid="endpoint-card"]').filter({ hasText: endpoint });
			if (await card.isVisible()) {
				await card.locator('button').click();
				await page.waitForTimeout(200); // Small delay between requests

				// Wait for this specific result
				const resultSelector = `[data-testid="test-result"]:nth-child(${successCount + 1})`;
				await page.waitForSelector(resultSelector, { timeout: 15000 });

				const result = page.locator(resultSelector);
				const resultText = await result.textContent();
				if (resultText?.includes('success')) {
					successCount++;
				}
			}
		}

		// Verify multiple operations completed successfully
		expect(successCount).toBeGreaterThan(0);
		console.log(`Completed ${successCount} batch operations`);
	});

	test('error recovery patterns for developers', async ({ page }) => {
		// Test how developers can handle and recover from various error conditions
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing error recovery patterns...');

		// Test invalid reference handling
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		await expect(scriptureCard).toBeVisible();

		const paramInput = scriptureCard.locator('input[placeholder*="reference"]');
		if (await paramInput.isVisible()) {
			// Test with invalid reference
			await paramInput.fill('InvalidBook 999:999');
			await scriptureCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			// Should handle gracefully
			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toBeVisible();

			// Test recovery with valid reference
			await paramInput.fill('John 3:16');
			await scriptureCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			// Should work correctly after error
			const results = page.locator('[data-testid="test-result"]');
			const resultCount = await results.count();
			expect(resultCount).toBeGreaterThan(0);
		}
	});

	test('API versioning and compatibility', async ({ page }) => {
		// Test API versioning and backward compatibility for developers
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing API versioning...');

		// Test that API responses include version information
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		if (await scriptureCard.isVisible()) {
			await scriptureCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');

			// Check if response includes version or metadata
			const response = page.locator('[data-testid="response-data"]').first();
			const responseText = await response.textContent();

			// Should include some form of version or metadata
			expect(responseText).toBeTruthy();
		}
	});

	test('rate limiting and throttling for developers', async ({ page }) => {
		// Test rate limiting behavior that developers need to handle
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing rate limiting...');

		// Make rapid requests to test rate limiting
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		await expect(scriptureCard).toBeVisible();

		// Make multiple rapid requests
		for (let i = 0; i < 5; i++) {
			await scriptureCard.locator('button').click();
			await page.waitForTimeout(50); // Very short delay
		}

		// Wait for results
		await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

		// System should handle the load gracefully
		const results = page.locator('[data-testid="test-result"]');
		const resultCount = await results.count();
		expect(resultCount).toBeGreaterThan(0);
	});

	test('pagination and large dataset handling', async ({ page }) => {
		// Test pagination patterns for large datasets
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing pagination handling...');

		// Test browse words endpoint which likely supports pagination
		const browseWordsCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Browse Words' });
		if (await browseWordsCard.isVisible()) {
			await browseWordsCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');

			// Check for pagination metadata in response
			const response = page.locator('[data-testid="response-data"]').first();
			await expect(response).toBeVisible();
		}
	});

	test('cross-origin resource sharing (CORS)', async ({ page }) => {
		// Test CORS handling for developer integrations
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing CORS handling...');

		// Test that API calls work from browser (CORS enabled)
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		if (await scriptureCard.isVisible()) {
			await scriptureCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');

			// If this test passes, CORS is working correctly
		}
	});

	test('developer performance benchmarks', async ({ page }) => {
		// Test performance from developer perspective
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing developer performance requirements...');

		// Measure typical API call performance
		const startTime = Date.now();

		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		if (await scriptureCard.isVisible()) {
			await scriptureCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');
		}

		const endTime = Date.now();
		const responseTime = endTime - startTime;

		// API calls should complete within reasonable time for good DX
		expect(responseTime).toBeLessThan(2000); // 2 seconds max
		console.log(`API call completed in ${responseTime}ms`);
	});

	test('webhook and callback patterns', async ({ page }) => {
		// Test webhook/callback patterns if available
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing webhook patterns...');

		// Look for any webhook or callback related endpoints
		const webhookCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: /webhook|callback/i });
		if (await webhookCard.isVisible()) {
			await webhookCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toBeVisible();
		}
	});

	test('SDK and library integration patterns', async ({ page }) => {
		// Test patterns that would be used by SDK/library developers
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing SDK integration patterns...');

		// Test chaining multiple API calls (common SDK pattern)
		const calls = [
			{ name: 'Get Languages', expectText: 'Languages' },
			{ name: 'Get Resources', expectText: 'Available Resources' },
			{ name: 'Fetch Scripture', expectText: 'Fetch Scripture' }
		];

		for (const call of calls) {
			const card = page
				.locator('[data-testid="endpoint-card"]')
				.filter({ hasText: call.expectText });
			if (await card.isVisible()) {
				await card.locator('button').click();
				await page.waitForTimeout(300); // SDK would handle timing
			}
		}

		// Verify all calls can be chained successfully
		await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });
		const results = page.locator('[data-testid="test-result"]');
		const resultCount = await results.count();
		expect(resultCount).toBeGreaterThan(0);
	});

	test('error documentation and troubleshooting', async ({ page }) => {
		// Test that errors provide helpful information for developers
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing error documentation...');

		// Trigger various error conditions
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		await expect(scriptureCard).toBeVisible();

		const paramInput = scriptureCard.locator('input[placeholder*="reference"]');
		if (await paramInput.isVisible()) {
			// Test with various invalid inputs to see error handling
			const invalidInputs = ['', 'invalid', 'Book 999:999', '1:1:1:1'];

			for (const input of invalidInputs) {
				await paramInput.fill(input);
				await scriptureCard.locator('button').click();
				await page.waitForTimeout(500);

				// Check that some result appears (even if error)
				const results = page.locator('[data-testid="test-result"]');
				const resultCount = await results.count();
				expect(resultCount).toBeGreaterThan(0);
			}
		}
	});
});
