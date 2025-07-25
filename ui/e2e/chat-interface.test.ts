/**
 * Chat Interface E2E Tests
 *
 * Tests the AI Bible Assistant chat interface including:
 * - Sacred text constraints (verbatim scripture)
 * - X-ray tool visibility
 * - System prompt transparency
 * - Message handling and UI interactions
 */

import { expect, test } from '@playwright/test';

test.describe('Chat Interface - AI Bible Assistant', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1200, height: 800 });
		await page.goto('/chat');
		await page.waitForLoadState('networkidle');
	});

	test('should load chat interface with welcome message', async ({ page }) => {
		// Check page title and main elements
		await expect(page).toHaveTitle(/AI Bible Assistant/);

		// Verify welcome message is displayed
		const welcomeMessage = page.locator('text=Welcome to the Translation Helps AI Assistant');
		await expect(welcomeMessage).toBeVisible();

		// Check for sacred text constraints in welcome
		await expect(page.locator('text=Scripture is quoted verbatim')).toBeVisible();
		await expect(page.locator('text=translation helps without interpretation')).toBeVisible();
		await expect(page.locator('text=All resources are clearly cited')).toBeVisible();

		// Verify input area is ready
		const input = page.locator('textarea[placeholder*="Ask about a Bible verse"]');
		await expect(input).toBeVisible();
		await expect(input).toBeEnabled();
	});

	test('should handle scripture request with verbatim response', async ({ page }) => {
		// Type a scripture request
		const input = page.locator('textarea[placeholder*="Ask about a Bible verse"]');
		await input.fill('What does John 3:16 say?');

		// Send message (Enter key)
		await input.press('Enter');

		// Wait for response
		await page.waitForSelector('text=For God so loved the world', { timeout: 10000 });

		// Verify scripture is quoted verbatim
		const response = page.locator(
			'text=For God so loved the world that he gave his only begotten Son'
		);
		await expect(response).toBeVisible();

		// Check for citation
		await expect(page.locator('text=[Scripture - John 3:16 ULT]')).toBeVisible();

		// Verify X-ray button appears
		const xrayButton = page.locator('button:has-text("View X-Ray")');
		await expect(xrayButton).toBeVisible();
		await expect(xrayButton).toContainText(/\d+ tools/);
		await expect(xrayButton).toContainText(/\d+ms/);
	});

	test('should show X-ray panel with tool details', async ({ page }) => {
		// Send a message first
		const input = page.locator('textarea[placeholder*="Ask about a Bible verse"]');
		await input.fill('Tell me about the word love in the Bible');
		await input.press('Enter');

		// Wait for response
		await page.waitForSelector('text=agape', { timeout: 10000 });

		// Click X-ray button
		const xrayButton = page.locator('button:has-text("View X-Ray")');
		await xrayButton.click();

		// Verify X-ray panel opens
		const xrayPanel = page.locator('text=X-Ray Analysis');
		await expect(xrayPanel).toBeVisible();

		// Check summary section
		await expect(page.locator('text=Tools Used')).toBeVisible();
		await expect(page.locator('text=Total Time')).toBeVisible();

		// Verify tool calls are listed
		await expect(page.locator('text=get_translation_word').first()).toBeVisible();
		await expect(page.locator('text=fetch_translation_notes').first()).toBeVisible();

		// Check for cache indicators
		const cacheIndicators = page.locator('text=HIT, text=MISS');
		expect(await cacheIndicators.count()).toBeGreaterThan(0);

		// Verify citations section
		await expect(page.locator('text=Translation Words - Love/Agape')).toBeVisible();

		// Close X-ray panel
		const closeButton = page
			.locator('.fixed >> button:has([aria-label*="close"], [aria-label*="Close"], svg)')
			.first();
		await closeButton.click();
		await expect(xrayPanel).not.toBeVisible();
	});

	test('should enforce sacred text constraints', async ({ page }) => {
		// Ask about system constraints
		const input = page.locator('textarea[placeholder*="Ask about a Bible verse"]');
		await input.fill('What are your system constraints?');
		await input.press('Enter');

		// Wait for response about constraints
		await page.waitForSelector('text=sacred text constraints', { timeout: 10000 });

		// Verify constraint explanations
		await expect(page.locator('text=quote scripture VERBATIM')).toBeVisible();
		await expect(page.locator('text=NO interpretation')).toBeVisible();
		await expect(page.locator('text=Citation Requirements')).toBeVisible();
		await expect(page.locator('text=Full Transparency')).toBeVisible();

		// Check that get_system_prompt tool was mentioned
		await expect(page.locator('text=get_system_prompt tool')).toBeVisible();
	});

	test('should handle errors gracefully', async ({ page }) => {
		// Intercept API calls to simulate error
		await page.route('/api/chat', (route) => {
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ error: 'Test error' })
			});
		});

		// Send a message
		const input = page.locator('textarea[placeholder*="Ask about a Bible verse"]');
		await input.fill('Test message');
		await input.press('Enter');

		// Verify error message appears
		await expect(page.locator('text=Sorry, I encountered an error')).toBeVisible({
			timeout: 10000
		});

		// Input should be re-enabled
		await expect(input).toBeEnabled();
	});

	test('should toggle X-ray visibility globally', async ({ page }) => {
		// Find the global X-ray toggle button
		const globalXrayToggle = page.locator('button[title="Toggle X-Ray view"]');
		await expect(globalXrayToggle).toBeVisible();

		// Click to enable X-ray
		await globalXrayToggle.click();

		// The button should show active state
		await expect(globalXrayToggle).toHaveClass(/bg-blue-600/);

		// Click again to disable
		await globalXrayToggle.click();
		await expect(globalXrayToggle).not.toHaveClass(/bg-blue-600/);
	});

	test('should maintain chat history', async ({ page }) => {
		// Send first message
		const input = page.locator('textarea[placeholder*="Ask about a Bible verse"]');
		await input.fill('What is Genesis 1:1?');
		await input.press('Enter');

		// Wait for first response (Genesis 1:1 response)
		await page.waitForSelector('.mb-6.flex.items-start', { timeout: 10000 });
		const responses = page.locator('.mb-6.flex.items-start');
		await expect(responses).toHaveCount(2); // 1 user + 1 assistant

		// Send second message
		await input.fill('What about John 1:1?');
		await input.press('Enter');

		// Wait for second response (John 1:1)
		await page.waitForTimeout(2000); // Give time for response
		const messagesAfter = page.locator('.mb-6.flex.items-start');
		await expect(messagesAfter).toHaveCount(4); // 2 user + 2 assistant

		// Verify both conversations are visible
		const messages = page.locator('.mb-6.flex.items-start');
		expect(await messages.count()).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant

		// Check timestamps are displayed
		const timestamps = page.locator('.mt-2.text-xs.text-gray-500');
		expect(await timestamps.count()).toBeGreaterThanOrEqual(4);
	});

	test('should support keyboard navigation', async ({ page }) => {
		const input = page.locator('textarea[placeholder*="Ask about a Bible verse"]');

		// Test Shift+Enter for new line
		await input.fill('Line 1');
		await input.press('Shift+Enter');
		await input.type('Line 2');

		const value = await input.inputValue();
		expect(value).toContain('Line 1\nLine 2');

		// Clear and test Enter to send
		await input.clear();
		await input.fill('Test message');
		await input.press('Enter');

		// Input should be cleared after sending
		await expect(input).toHaveValue('');
	});

	test('should show loading state during API call', async ({ page }) => {
		// Slow down the response
		await page.route('/api/chat', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			route.continue();
		});

		// Send a message
		const input = page.locator('textarea[placeholder*="Ask about a Bible verse"]');
		await input.fill('Test loading');
		await input.press('Enter');

		// Check loading indicators
		await expect(input).toBeDisabled();

		// Look for loading animation (three bouncing dots)
		const loadingDots = page.locator('.inline-flex.gap-1 >> .animate-bounce');
		await expect(loadingDots).toHaveCount(3);

		// Send button should show loading state
		const sendButton = page.locator('button:has(.animate-bounce)');
		await expect(sendButton).toBeVisible();
	});

	test.describe('Mobile Responsiveness', () => {
		test.beforeEach(async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
		});

		test('should work on mobile devices', async ({ page }) => {
			await page.goto('/chat');

			// Verify layout adapts
			const chatContainer = page.locator('.flex.h-full.flex-col');
			await expect(chatContainer).toBeVisible();

			// Input should be accessible
			const input = page.locator('textarea[placeholder*="Ask about a Bible verse"]');
			await expect(input).toBeVisible();

			// Send a message
			await input.fill('Mobile test');
			await input.press('Enter');

			// Should receive response
			await page.waitForSelector('text=help you explore Bible passages', { timeout: 10000 });

			// X-ray panel should be full width on mobile
			const xrayButton = page.locator('button:has-text("View X-Ray")').first();
			if (await xrayButton.isVisible()) {
				await xrayButton.click();
				const xrayPanel = page.locator('.fixed.bottom-0.right-0');
				await expect(xrayPanel).toBeVisible();
			}
		});
	});
});
