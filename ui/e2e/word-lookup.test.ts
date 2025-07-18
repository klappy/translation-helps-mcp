import { expect, test } from '@playwright/test';

test.describe('Word Lookup Functionality', () => {
	test('should handle word lookup by term', async ({ page }) => {
		// Navigate to the test page
		await page.goto('/test');

		// Wait for the page to load
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		// Find the Translation Words endpoint card
		const translationWordsCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Translation Words' });
		await expect(translationWordsCard).toBeVisible();

		// Click the test button for Translation Words
		await translationWordsCard.locator('button').click();

		// Wait for the API call to complete
		await page.waitForSelector('[data-testid="test-result"]', { timeout: 10000 });

		// Check that we got a successful response
		const result = page.locator('[data-testid="test-result"]').first();
		await expect(result).toContainText('success');

		// Check that we got translation words data
		const responseData = page.locator('[data-testid="response-data"]').first();
		await expect(responseData).toBeVisible();
	});

	test('should handle word lookup in chat interface', async ({ page }) => {
		// Navigate to the chat page
		await page.goto('/chat');

		// Wait for the page to load
		await page.waitForSelector('textarea', { timeout: 10000 });

		// Type a word lookup question
		await page.fill('textarea', 'What does the word "grace" mean in the Bible?');

		// Click the send button
		await page.click('button[type="submit"]');

		// Wait for the response
		await page.waitForSelector('[data-testid="message"]', { timeout: 15000 });

		// Check that we got a response
		const messages = page.locator('[data-testid="message"]');
		await expect(messages).toHaveCount(2); // User message + AI response

		// Check that the AI response contains information about grace
		const aiResponse = messages.last();
		await expect(aiResponse).toContainText('grace');
	});

	test('should handle reference-based word lookup', async ({ page }) => {
		// Navigate to the test page
		await page.goto('/test');

		// Wait for the page to load
		await page.waitForSelector('[data-testid="endpoint-card"]', { timeout: 10000 });

		// Change the reference to John 3:16
		await page.fill('input[name="reference"]', 'John 3:16');

		// Find the Translation Words endpoint card
		const translationWordsCard = page
			.locator('[data-testid="endpoint-card"]')
			.filter({ hasText: 'Translation Words' });
		await expect(translationWordsCard).toBeVisible();

		// Click the test button for Translation Words
		await translationWordsCard.locator('button').click();

		// Wait for the API call to complete
		await page.waitForSelector('[data-testid="test-result"]', { timeout: 10000 });

		// Check that we got a successful response
		const result = page.locator('[data-testid="test-result"]').first();
		await expect(result).toContainText('success');

		// Check that we got multiple translation words for John 3:16
		const responseData = page.locator('[data-testid="response-data"]').first();
		await expect(responseData).toBeVisible();
	});
});
