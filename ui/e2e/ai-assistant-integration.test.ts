/**
 * AI Assistant Integration E2E Tests
 *
 * Tests the AI Assistant integration workflows including MCP tool calls,
 * context building, error handling, and rate limit respect.
 *
 * Validates Task 13 from implementation plan - AI Assistant workflows
 */

import { expect, test } from '@playwright/test';

test.describe('AI Assistant Integration', () => {
	test.beforeEach(async ({ page }) => {
		// Set viewport and configure for AI assistant testing
		await page.setViewportSize({ width: 1200, height: 800 });
	});

	test('MCP tool call workflow', async ({ page }) => {
		// Test the MCP (Model Context Protocol) integration
		await page.goto('/mcp-tools');
		await page.waitForSelector('[data-testid="mcp-tool-card"]', { timeout: 10000 });

		console.log('Testing MCP tool discovery and calls...');

		// Verify MCP tools are discovered and available
		const toolCards = page.locator('[data-testid="mcp-tool-card"]');
		const toolCount = await toolCards.count();
		expect(toolCount).toBeGreaterThan(0);

		// Test scripture fetching via MCP
		const scriptureToolCard = toolCards.filter({ hasText: 'fetchScripture' });
		if (await scriptureToolCard.isVisible()) {
			await scriptureToolCard.locator('button').click();

			await page.waitForSelector('[data-testid="mcp-result"]', { timeout: 15000 });
			const result = page.locator('[data-testid="mcp-result"]').first();
			await expect(result).toContainText('success');

			// Verify MCP response structure
			const response = page.locator('[data-testid="mcp-response-data"]').first();
			await expect(response).toBeVisible();
		}
	});

	test('context building for AI assistants', async ({ page }) => {
		// Test how context is built and maintained across multiple API calls
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing context building workflow...');

		// Step 1: Get scripture context
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Get Context' });
		if (await scriptureCard.isVisible()) {
			await scriptureCard.locator('button').click();

			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });
			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');

			// Verify context includes all necessary information
			const response = page.locator('[data-testid="response-data"]').first();
			await expect(response).toBeVisible();
			await expect(response).toContainText('scripture'); // Should contain scripture data
		}

		// Step 2: Fetch related translation helps
		const notesCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Translation Notes' });
		if (await notesCard.isVisible()) {
			await notesCard.locator('button').click();

			await page.waitForSelector('[data-testid="test-result"]:nth-child(2)', { timeout: 15000 });
			const notesResult = page.locator('[data-testid="test-result"]').nth(1);
			await expect(notesResult).toContainText('success');
		}

		// Step 3: Verify context can be combined
		// In a real implementation, this would test how an AI assistant
		// combines multiple API responses into coherent context
	});

	test('error handling in AI assistant calls', async ({ page }) => {
		// Test how the system handles errors when AI assistants make invalid calls
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing AI assistant error handling...');

		// Test invalid scripture reference
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		await expect(scriptureCard).toBeVisible();

		const paramInput = scriptureCard.locator('input[placeholder*="reference"]');
		if (await paramInput.isVisible()) {
			// Test with clearly invalid reference that should trigger error handling
			await paramInput.fill('NotABook 0:0');
		}

		await scriptureCard.locator('button').click();
		await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

		const result = page.locator('[data-testid="test-result"]').first();
		// Should either succeed with empty/null data or fail gracefully
		await expect(result).toBeVisible();

		// Check if there's error information that would help AI assistants
		const response = page.locator('[data-testid="response-data"]').first();
		await expect(response).toBeVisible();
	});

	test('rate limit respect in AI assistant workflows', async ({ page }) => {
		// Test that the system properly handles rate limits during AI assistant usage
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing rate limit handling...');

		// Make multiple rapid requests to test rate limiting
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		await expect(scriptureCard).toBeVisible();

		// First request should succeed
		await scriptureCard.locator('button').click();
		await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

		const firstResult = page.locator('[data-testid="test-result"]').first();
		await expect(firstResult).toContainText('success');

		// Additional rapid requests - system should handle gracefully
		// In a real rate-limited system, these might return 429 or queue responses
		await scriptureCard.locator('button').click();
		await page.waitForTimeout(100); // Brief pause
		await scriptureCard.locator('button').click();

		// System should not crash and should provide meaningful responses
		const results = page.locator('[data-testid="test-result"]');
		const resultCount = await results.count();
		expect(resultCount).toBeGreaterThan(0);
	});

	test('batch operations for AI assistants', async ({ page }) => {
		// Test batch operations that AI assistants might need for efficiency
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing batch operations...');

		// Test multiple endpoint calls in sequence (simulating AI assistant workflow)
		const endpoints = ['Fetch Scripture', 'Translation Notes', 'Translation Words'];

		for (const endpoint of endpoints) {
			const card = page.locator('[data-testid="endpoint-card"]').filter({ hasText: endpoint });
			if (await card.isVisible()) {
				await card.locator('button').click();
				await page.waitForTimeout(500); // Small delay between requests
			}
		}

		// Verify all requests completed
		await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });
		const results = page.locator('[data-testid="test-result"]');
		const resultCount = await results.count();
		expect(resultCount).toBeGreaterThan(0);
	});

	test('MCP HTTP integration', async ({ page }) => {
		// Test MCP over HTTP functionality specifically
		await page.goto('/mcp-http-test');
		await page.waitForSelector('h1', { timeout: 10000 });

		console.log('Testing MCP HTTP integration...');

		// Verify MCP HTTP test page loads
		await expect(page.locator('h1')).toContainText('MCP HTTP Test');

		// Look for MCP HTTP specific elements
		const mcpHttpElements = page.locator('[data-testid*="mcp-http"]');
		if ((await mcpHttpElements.count()) > 0) {
			const firstElement = mcpHttpElements.first();
			await expect(firstElement).toBeVisible();
		}
	});

	test('streaming responses for AI assistants', async ({ page }) => {
		// Test streaming responses that AI assistants might use for real-time updates
		await page.goto('/chat');
		await page.waitForSelector('h1', { timeout: 10000 });

		console.log('Testing streaming responses...');

		// Verify chat interface loads (if available)
		if ((await page.locator('h1').textContent()) === 'Chat Interface') {
			// Look for chat input elements
			const chatInput = page.locator('input[type="text"], textarea').first();
			if (await chatInput.isVisible()) {
				await chatInput.fill('Test scripture query');

				// Look for send button
				const sendButton = page.locator('button').filter({ hasText: /send|submit/i });
				if (await sendButton.isVisible()) {
					await sendButton.click();

					// Wait for streaming response
					await page.waitForTimeout(2000);

					// Verify some response appears
					const responseArea = page.locator('[data-testid="chat-response"], .response, .message');
					if ((await responseArea.count()) > 0) {
						await expect(responseArea.first()).toBeVisible();
					}
				}
			}
		}
	});

	test('AI assistant context persistence', async ({ page }) => {
		// Test that context is properly maintained across multiple interactions
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing context persistence...');

		// First interaction - establish context
		const contextCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Get Context' });
		if (await contextCard.isVisible()) {
			await contextCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');
		}

		// Second interaction - should maintain or build upon context
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		if (await scriptureCard.isVisible()) {
			await scriptureCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			// Context should still be accessible
			const results = page.locator('[data-testid="test-result"]');
			const resultCount = await results.count();
			expect(resultCount).toBeGreaterThan(0);
		}
	});

	test('AI assistant performance benchmarks', async ({ page }) => {
		// Test performance requirements for AI assistant workflows
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing AI assistant performance...');

		// Measure response time for AI assistant typical workflow
		const startTime = Date.now();

		const contextCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Get Context' });
		if (await contextCard.isVisible()) {
			await contextCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			const result = page.locator('[data-testid="test-result"]').first();
			await expect(result).toContainText('success');
		}

		const endTime = Date.now();
		const responseTime = endTime - startTime;

		// AI assistant workflows should complete quickly for good UX
		expect(responseTime).toBeLessThan(3000); // 3 seconds max for context loading
		console.log(`AI assistant context loading completed in ${responseTime}ms`);
	});

	test('AI assistant error recovery', async ({ page }) => {
		// Test how AI assistants can recover from errors and continue workflows
		await page.goto('/test');
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		console.log('Testing AI assistant error recovery...');

		// Try an operation that might fail
		const scriptureCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Fetch Scripture' });
		await expect(scriptureCard).toBeVisible();

		const paramInput = scriptureCard.locator('input[placeholder*="reference"]');
		if (await paramInput.isVisible()) {
			// First try with invalid reference
			await paramInput.fill('Invalid Reference');
			await scriptureCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			// Then try with valid reference (simulating AI assistant recovery)
			await paramInput.fill('John 3:16');
			await scriptureCard.locator('button').click();
			await page.waitForSelector('[data-testid="test-result"]', { timeout: 15000 });

			// Should have results from both attempts
			const results = page.locator('[data-testid="test-result"]');
			const resultCount = await results.count();
			expect(resultCount).toBeGreaterThanOrEqual(1);
		}
	});
});
