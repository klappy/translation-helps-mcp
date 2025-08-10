import { test, expect, chromium } from '@playwright/test';

test.describe('Chat Tool Integration', () => {
	test('should use real MCP tools to fetch scripture', async () => {
		// Launch browser with ignore HTTPS errors
		const browser = await chromium.launch({
			headless: false,
			args: ['--ignore-certificate-errors']
		});
		const context = await browser.newContext({
			ignoreHTTPSErrors: true
		});
		const page = await context.newPage();

		// Go to the chat page on the deployed site
		await page.goto('https://emergency-investor-demo.translation-helps-mcp.pages.dev/chat');

		// Wait for chat interface to load
		await page.waitForSelector('textarea[placeholder*="Type your message"]', { timeout: 30000 });

		// Type a scripture request
		await page.fill('textarea[placeholder*="Type your message"]', 'Show me Titus 1:1');

		// Submit the message
		await page.keyboard.press('Enter');

		// Wait for response
		await page.waitForTimeout(5000); // Give time for API calls

		// Check that we got a response with scripture
		const responseText = await page.textContent('.message-bubble:last-child');
		console.log('Response:', responseText);

		// Verify scripture content
		expect(responseText).toContain('Titus 1:1');
		expect(responseText).toContain('ULT'); // Should mention the version

		// Click X-Ray button to see tool usage
		await page.click('button:has-text("View X-Ray")');
		await page.waitForTimeout(1000);

		// Verify tool was called
		const xrayContent = await page.textContent('.xray-panel');
		console.log('X-Ray Content:', xrayContent);

		expect(xrayContent).toContain('fetch_scripture');
		expect(xrayContent).toContain('Titus 1:1');

		// Take screenshot for evidence
		await page.screenshot({ path: 'chat-tools-working.png', fullPage: true });

		console.log('✅ Chat is using real MCP tools!');
	});

	test('should show actual translation notes', async ({ page }) => {
		await page.goto('https://emergency-investor-demo.translation-helps-mcp.pages.dev/chat');

		await page.waitForSelector('textarea[placeholder*="Type your message"]', { timeout: 30000 });

		// Ask for translation notes
		await page.fill('textarea[placeholder*="Type your message"]', 'What notes are in Titus 1:1?');
		await page.keyboard.press('Enter');

		// Wait for response
		await page.waitForTimeout(5000);

		const responseText = await page.textContent('.message-bubble:last-child');
		console.log('Notes Response:', responseText);

		// Should contain translation notes
		expect(responseText).toContain('Translation Notes');

		// Click X-Ray
		await page.click('button:has-text("View X-Ray")');
		await page.waitForTimeout(1000);

		const xrayContent = await page.textContent('.xray-panel');
		expect(xrayContent).toContain('fetch_translation_notes');

		await page.screenshot({ path: 'chat-notes-working.png', fullPage: true });

		console.log('✅ Translation notes are working!');
	});
});
