import { test } from '@playwright/test';

test.describe('Live Demo Validation for Customers', () => {
	test('API docs page loads and resource recommendations work', async ({ page }) => {
		console.log('🔍 Testing API docs page...');

		// Navigate to API docs
		await page.goto('/api-docs');
		await page.waitForLoadState('networkidle');

		// Take screenshot for visual confirmation
		await page.screenshot({ path: 'demo-screenshots/api-docs-page.png', fullPage: true });

		// Look for resource recommendations section
		const hasResourceRecommendations = await page
			.locator('text=Resource Recommendations')
			.isVisible();
		console.log('✅ Resource Recommendations found:', hasResourceRecommendations);

		// Test the actual API
		console.log('🧪 Testing resource recommendations API...');
		const response = await page.request.get(
			'/api/resource-recommendations?book=Romans&chapter=9&userRole=translator'
		);
		console.log('📊 API Response Status:', response.status());

		if (response.ok()) {
			const data = await response.json();
			console.log('✅ API Response Success:', JSON.stringify(data, null, 2));
		} else {
			console.log('❌ API Response Error:', response.status(), await response.text());
		}
	});

	test('MCP tools page loads and tools are accessible', async ({ page }) => {
		console.log('🔍 Testing MCP tools page...');

		// Navigate to MCP tools
		await page.goto('/mcp-tools');
		await page.waitForLoadState('networkidle');

		// Take screenshot for visual confirmation
		await page.screenshot({ path: 'demo-screenshots/mcp-tools-page.png', fullPage: true });

		// Look for tool cards
		const toolCards = page.locator('[data-testid*="tool"]');
		const toolCount = await toolCards.count();
		console.log('✅ Tool cards found:', toolCount);

		// Check for resource recommendations tool specifically
		const hasResourceRecTool = await page.locator('text=Resource Recommendations').isVisible();
		console.log('✅ Resource Recommendations tool found:', hasResourceRecTool);
	});

	test('Test page loads and endpoint cards work', async ({ page }) => {
		console.log('🔍 Testing main test page...');

		// Navigate to test page
		await page.goto('/test');
		await page.waitForTimeout(5000); // Give it time to load

		// Take screenshot for visual confirmation
		await page.screenshot({ path: 'demo-screenshots/test-page.png', fullPage: true });

		// Look for endpoint cards
		const endpointCards = page.locator('[data-testid="endpoint-card"]');
		const cardCount = await endpointCards.count();
		console.log('✅ Endpoint cards found:', cardCount);

		if (cardCount > 0) {
			// Test the first endpoint card
			const firstCard = endpointCards.first();
			await firstCard.screenshot({ path: 'demo-screenshots/first-endpoint-card.png' });
			console.log('✅ First endpoint card screenshot captured');
		}
	});

	test('Resource recommendations API with correct parameters', async ({ page }) => {
		console.log('🧪 Testing resource recommendations with correct parameters...');

		// Test the API directly with correct parameters
		const testCases = [
			{ book: 'Romans', chapter: '9', userRole: 'translator' },
			{ book: 'Genesis', chapter: '1', userRole: 'checker' },
			{ book: 'John', chapter: '3', userRole: 'consultant' }
		];

		for (const testCase of testCases) {
			const url = `/api/resource-recommendations?book=${testCase.book}&chapter=${testCase.chapter}&userRole=${testCase.userRole}`;
			console.log(`📡 Testing: ${url}`);

			const response = await page.request.get(url);
			console.log(
				`📊 Status: ${response.status()} for ${testCase.book} ${testCase.chapter} (${testCase.userRole})`
			);

			if (response.ok()) {
				const data = await response.json();
				console.log(`✅ Success: Got ${JSON.stringify(data).length} bytes of data`);
			} else {
				console.log(`❌ Error: ${await response.text()}`);
			}
		}
	});

	test('Main API endpoints health check', async ({ page }) => {
		console.log('🏥 Testing main API endpoints health...');

		const endpoints = [
			'/api/get-languages',
			'/api/list-available-resources',
			'/api/fetch-scripture?reference=John 3:16',
			'/api/resource-recommendations?book=Romans&chapter=9&userRole=translator'
		];

		for (const endpoint of endpoints) {
			console.log(`📡 Testing: ${endpoint}`);
			const response = await page.request.get(endpoint);
			console.log(`📊 ${endpoint}: ${response.status()}`);

			if (!response.ok()) {
				console.log(`❌ Error: ${await response.text()}`);
			}
		}
	});
});
