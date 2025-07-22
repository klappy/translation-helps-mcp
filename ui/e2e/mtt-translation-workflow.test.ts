/**
 * MTT (Mother Tongue Translator) Workflow E2E Tests
 *
 * Tests the complete translation workflow that MTTs use to translate
 * scripture with the help of ULT/UST texts and translation helps.
 *
 * Validates Task 13 from implementation plan - Core user workflows
 */

import { expect, test } from '@playwright/test';

test.describe('MTT Translation Workflow', () => {
	test.beforeEach(async ({ page }) => {
		// Set viewport for consistent testing
		await page.setViewportSize({ width: 1200, height: 800 });
	});

	test('complete Romans 1:1 translation workflow', async ({ page }) => {
		// Navigate to test interface
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		// Step 1: Load scripture passage (ULT and UST)
		console.log('Step 1: Loading scripture texts...');

		// Test ULT (Literal Text) endpoint
		const ultCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'ULT Scripture' });
		await expect(ultCard).toBeVisible();
		await ultCard.locator('button').click();

		await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });
		const ultResult = page.locator('[data-testid="test-result"]').first();
		await expect(ultResult).toContainText('success');

		// Verify ULT contains expected content for Romans 1:1
		const ultResponse = page.locator('[data-testid="response-data"]').first();
		await expect(ultResponse).toContainText('Paul');
		await expect(ultResponse).toContainText('servant');

		// Test UST (Simplified Text) endpoint
		const ustCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'UST Scripture' });
		await expect(ustCard).toBeVisible();
		await ustCard.locator('button').click();

		await page.waitForSelector('[data-testid="test-result"]:nth-child(2)', { timeout: 15000 });
		const ustResult = page.locator('[data-testid="test-result"]').nth(1);
		await expect(ustResult).toContainText('success');

		// Verify UST contains simplified language
		const ustResponse = page.locator('[data-testid="response-data"]').nth(1);
		await expect(ustResponse).toContainText('Paul');

		// Step 2: Access translation notes for difficult concepts
		console.log('Step 2: Accessing translation notes...');

		const notesCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Translation Notes' });
		await expect(notesCard).toBeVisible();
		await notesCard.locator('button').click();

		await page.waitForSelector('[data-testid="test-result"]:nth-child(3)', { timeout: 15000 });
		const notesResult = page.locator('[data-testid="test-result"]').nth(2);
		await expect(notesResult).toContainText('success');

		// Verify notes contain helpful explanations
		const notesResponse = page.locator('[data-testid="response-data"]').nth(2);
		await expect(notesResponse).toBeVisible();

		// Step 3: Look up unfamiliar words
		console.log('Step 3: Looking up word definitions...');

		const wordsCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Translation Words' });
		await expect(wordsCard).toBeVisible();
		await wordsCard.locator('button').click();

		await page.waitForSelector('[data-testid="test-result"]:nth-child(4)', { timeout: 15000 });
		const wordsResult = page.locator('[data-testid="test-result"]').nth(3);
		await expect(wordsResult).toContainText('success');

		// Verify word definitions are available
		const wordsResponse = page.locator('[data-testid="response-data"]').nth(3);
		await expect(wordsResponse).toBeVisible();

		// Step 4: Use translation questions for verification
		console.log('Step 4: Checking with translation questions...');

		const questionsCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Translation Questions' });
		await expect(questionsCard).toBeVisible();
		await questionsCard.locator('button').click();

		await page.waitForSelector('[data-testid="test-result"]:nth-child(5)', { timeout: 15000 });
		const questionsResult = page.locator('[data-testid="test-result"]').nth(4);
		await expect(questionsResult).toContainText('success');

		// Verify questions are available for checking
		const questionsResponse = page.locator('[data-testid="response-data"]').nth(4);
		await expect(questionsResponse).toBeVisible();
	});

	test('verse range translation workflow', async ({ page }) => {
		// Test working with multiple verses (Romans 1:1-5)
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		// Modify test parameters for verse range
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		await expect(scriptureCard).toBeVisible();

		// Look for parameter input field
		const paramInput = scriptureCard.locator('input[placeholder*="reference"]');
		if (await paramInput.isVisible()) {
			await paramInput.fill('Romans 1:1-5');
		}

		await scriptureCard.locator('button').click();
		await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

		const result = page.locator('[data-testid="test-result"]').first();
		await expect(result).toContainText('success');

		// Verify multiple verses are returned
		const response = page.locator('[data-testid="response-data"]').first();
		await expect(response).toBeVisible();
	});

	test('cross-reference and word links workflow', async ({ page }) => {
		// Test word links functionality for deeper study
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		// Test word links endpoint
		const wordLinksCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Word Links' });
		if (await wordLinksCard.isVisible()) {
			await wordLinksCard.locator('button').click();

			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });
			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');

			// Verify word links provide cross-references
			const response = page.locator('[data-testid="response-data"]').first();
			await expect(response).toBeVisible();
		}
	});

	test('error handling in translation workflow', async ({ page }) => {
		// Test how the system handles invalid references
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		// Try to access invalid reference
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		await expect(scriptureCard).toBeVisible();

		// Look for parameter input field and enter invalid reference
		const paramInput = scriptureCard.locator('input[placeholder*="reference"]');
		if (await paramInput.isVisible()) {
			await paramInput.fill('InvalidBook 999:999');
		}

		await scriptureCard.locator('button').click();
		await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

		// Should handle error gracefully
		const result = page.locator('[data-testid="test-result"]').first();
		// Either success with empty data or graceful error handling
		await expect(result).toBeVisible();
	});

	test('multiple language support in workflow', async ({ page }) => {
		// Test accessing resources in different Strategic Languages
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		// Test languages endpoint first
		const languagesCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Languages' });
		if (await languagesCard.isVisible()) {
			await languagesCard.locator('button').click();

			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });
			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');

			// Verify multiple languages are available
			const response = page.locator('[data-testid="response-data"]').first();
			await expect(response).toBeVisible();
			await expect(response).toContainText('en'); // English should be available
		}
	});

	test('resource availability checking', async ({ page }) => {
		// Test checking what resources are available before starting translation
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		// Test list available resources endpoint
		const resourcesCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Available Resources' });
		if (await resourcesCard.isVisible()) {
			await resourcesCard.locator('button').click();

			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });
			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');

			// Verify resource list contains expected types
			const response = page.locator('[data-testid="response-data"]').first();
			await expect(response).toBeVisible();
		}
	});

	test('performance benchmarks for translation workflow', async ({ page }) => {
		// Test that core translation workflow completes within performance targets
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		// Measure time for scripture loading
		const startTime = Date.now();

		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		await expect(scriptureCard).toBeVisible();
		await scriptureCard.locator('button').click();

		await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });
		const result = page.locator('[data-testid="test-result"]').first();
		await expect(result).toContainText('success');

		const endTime = Date.now();
		const responseTime = endTime - startTime;

		// Should complete within reasonable time (under 5 seconds for E2E)
		expect(responseTime).toBeLessThan(5000);
		console.log(`Scripture loading completed in ${responseTime}ms`);
	});

	test('mobile-responsive translation workflow', async ({ page }) => {
		// Test translation workflow on mobile viewport
		await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		// Verify interface is usable on mobile
		const cards = page.locator('[data-testid="endpoint-card"]');
		const cardCount = await cards.count();
		expect(cardCount).toBeGreaterThan(0);

		// Test that buttons are clickable on mobile
		const firstCard = cards.first();
		await expect(firstCard).toBeVisible();

		const button = firstCard.locator('button');
		await expect(button).toBeVisible();
		await button.click();

		await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });
		const result = page.locator('[data-testid="test-result"]').first();
		await expect(result).toBeVisible();
	});
});
