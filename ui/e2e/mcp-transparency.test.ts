/**
 * MCP Transparency E2E Tests
 *
 * Tests the get_system_prompt tool and transparency features including:
 * - System prompt visibility
 * - Sacred text constraints documentation
 * - Implementation details toggle
 * - MCP Tools integration
 */

import { expect, test } from '@playwright/test';

test.describe('MCP Transparency Features', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1200, height: 800 });
	});

	test('should display get_system_prompt tool in MCP Tools', async ({ page }) => {
		await page.goto('/mcp-tools');
		await page.waitForLoadState('networkidle');
		
		// Look for the transparency tool
		const systemPromptTool = page.locator('text=Get System Prompt').first();
		await expect(systemPromptTool).toBeVisible();
		
		// Verify it's in the core category
		const toolCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Get System Prompt' });
		await expect(toolCard).toBeVisible();
		
		// Click on the tool
		await toolCard.click();
		
		// Verify tool details are shown
		await expect(page.locator('text=full transparency about AI behavior')).toBeVisible();
		await expect(page.locator('text=sacred text handling')).toBeVisible();
		
		// Check parameter description
		await expect(page.locator('text=includeImplementationDetails')).toBeVisible();
		await expect(page.locator('text=Include implementation details and validation functions')).toBeVisible();
	});

	test('should execute get_system_prompt tool successfully', async ({ page }) => {
		await page.goto('/mcp-tools');
		await page.waitForLoadState('networkidle');
		
		// Find and click the tool
		const toolCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Get System Prompt' });
		await toolCard.click();
		
		// Wait for the tool panel to be visible
		await page.waitForSelector('text=Parameters');
		
		// Find the test button
		const testButton = page.locator('button:has-text("Test Endpoint")');
		await expect(testButton).toBeVisible();
		await testButton.click();
		
		// Wait for response
		await page.waitForSelector('[data-testid="api-response"], pre:has-text("systemPrompt")', { timeout: 10000 });
		
		// Verify response contains expected elements
		const response = page.locator('[data-testid="api-response"], pre').first();
		const responseText = await response.textContent();
		
		// Check for sacred text constraints
		expect(responseText).toContain('VERBATIM');
		expect(responseText).toContain('NO interpretation');
		expect(responseText).toContain('REQUIRED');
		expect(responseText).toContain('citations');
		
		// Verify constraints object
		expect(responseText).toContain('scriptureHandling');
		expect(responseText).toContain('interpretation');
		expect(responseText).toContain('transparency');
	});

	test('should toggle implementation details parameter', async ({ page }) => {
		await page.goto('/mcp-tools');
		await page.waitForLoadState('networkidle');
		
		// Navigate to the tool
		const toolCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Get System Prompt' });
		await toolCard.click();
		
		// Find the parameter checkbox
		const paramToggle = page.locator('input[type="checkbox"][name="includeImplementationDetails"]');
		await expect(paramToggle).toBeVisible();
		
		// Should be unchecked by default
		await expect(paramToggle).not.toBeChecked();
		
		// Toggle it on
		await paramToggle.click();
		await expect(paramToggle).toBeChecked();
		
		// Test with implementation details
		const testButton = page.locator('button:has-text("Test Endpoint")');
		await testButton.click();
		
		// Wait for response with implementation details
		await page.waitForSelector('text=implementationDetails', { timeout: 10000 });
		
		// Verify additional details are present
		const response = page.locator('[data-testid="api-response"], pre').first();
		const responseText = await response.textContent();
		
		expect(responseText).toContain('validationFunctions');
		expect(responseText).toContain('validateScriptureQuote');
		expect(responseText).toContain('extractCitations');
		expect(responseText).toContain('checkForInterpretation');
		expect(responseText).toContain('enforcementMechanisms');
	});

	test('should show system prompt info in chat when asked', async ({ page }) => {
		await page.goto('/chat');
		await page.waitForLoadState('networkidle');
		
		// Ask about transparency
		const input = page.locator('textarea[placeholder*="Ask about a Bible verse"]');
		await input.fill('Can you show me your system prompt?');
		await input.press('Enter');
		
		// Wait for response mentioning get_system_prompt
		await page.waitForSelector('text=get_system_prompt', { timeout: 10000 });
		
		// Verify transparency is explained
		await expect(page.locator('text=Full Transparency')).toBeVisible();
		await expect(page.locator('text=see my complete constraints')).toBeVisible();
	});

	test('should validate sacred text constraints are documented', async ({ page }) => {
		await page.goto('/mcp-tools');
		
		// Execute get_system_prompt
		const toolCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Get System Prompt' });
		await toolCard.click();
		
		const testButton = page.locator('button:has-text("Test Endpoint")');
		await testButton.click();
		
		// Wait for response
		await page.waitForSelector('[data-testid="api-response"], pre', { timeout: 10000 });
		
		// Extract and verify the system prompt content
		const response = page.locator('[data-testid="api-response"], pre').first();
		const responseText = await response.textContent();
		
		// Critical rules that must be present
		const criticalRules = [
			'SCRIPTURE QUOTATION',
			'Quote scripture VERBATIM',
			'character for character',
			'NEVER paraphrase',
			'NO INTERPRETATION',
			'NEVER offer theological interpretation',
			'RESOURCE CITATION',
			'ALWAYS cite the specific resource',
			'TRANSPARENCY'
		];
		
		for (const rule of criticalRules) {
			expect(responseText).toContain(rule);
		}
	});

	test('should integrate with performance metrics', async ({ page }) => {
		await page.goto('/mcp-tools');
		
		// Execute the tool
		const toolCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Get System Prompt' });
		await toolCard.click();
		
		const testButton = page.locator('button:has-text("Test Endpoint")');
		await testButton.click();
		
		// Wait for performance metrics
		await page.waitForSelector('text=Performance Metrics', { timeout: 10000 });
		
		// Verify metrics are displayed
		await expect(page.locator('text=Response Time')).toBeVisible();
		await expect(page.locator('text=Cache Status')).toBeVisible();
		
		// Response time should be reasonable (under 1000ms for this simple tool)
		const responseTime = page.locator('text=/\\d+ms/').first();
		const timeText = await responseTime.textContent();
		const time = parseInt(timeText?.match(/\\d+/)?.[0] || '0');
		expect(time).toBeLessThan(1000);
	});

	test('should be accessible via direct API', async ({ page }) => {
		// Test the raw MCP endpoint
		const response = await page.request.post('/api/mcp', {
			data: {
				method: 'tools/call',
				params: {
					name: 'get_system_prompt',
					arguments: {
						includeImplementationDetails: true
					}
				}
			}
		});
		
		expect(response.ok()).toBeTruthy();
		const data = await response.json();
		
		// Verify response structure
		expect(data).toHaveProperty('content');
		expect(data.content[0]).toHaveProperty('type', 'text');
		
		// Parse the text content
		const content = JSON.parse(data.content[0].text);
		expect(content).toHaveProperty('systemPrompt');
		expect(content).toHaveProperty('constraints');
		expect(content).toHaveProperty('implementationDetails');
		expect(content).toHaveProperty('version');
		expect(content).toHaveProperty('lastUpdated');
	});

	test.describe('Mobile Transparency', () => {
		test.beforeEach(async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
		});

		test('should work on mobile devices', async ({ page }) => {
			await page.goto('/mcp-tools');
			
			// Tool should be accessible on mobile
			const toolCard = page.locator('text=Get System Prompt').first();
			await expect(toolCard).toBeVisible();
			
			// Click should work
			await toolCard.click();
			
			// Details should expand
			await expect(page.locator('text=full transparency')).toBeVisible();
			
			// Test button should be reachable
			const testButton = page.locator('button:has-text("Test Endpoint")');
			await expect(testButton).toBeVisible();
		});
	});
});