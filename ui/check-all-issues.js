import { chromium } from 'playwright';

(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();

	console.log('🔍 COMPREHENSIVE UI AUDIT\n');

	const errors = [];
	const issues = [];

	page.on('console', (msg) => {
		if (msg.type() === 'error') {
			errors.push(msg.text());
		}
	});

	try {
		// Test Homepage
		console.log('📱 Testing Homepage...');
		await page.goto('http://localhost:5173/');
		await page.waitForLoadState('networkidle');

		// Check navigation links
		const navLinks = await page.$$eval('nav a', (links) =>
			links.map((link) => ({
				text: link.textContent.trim(),
				href: link.href,
				visible: link.offsetWidth > 0 && link.offsetHeight > 0
			}))
		);

		console.log('🔗 Navigation Links Found:');
		navLinks.forEach((link) => {
			console.log(`  ${link.visible ? '✅' : '❌'} ${link.text}: ${link.href}`);
			if (!link.visible) {
				issues.push(`Navigation link "${link.text}" is not visible`);
			}
		});

		// Test each navigation link
		for (const link of navLinks) {
			if (link.href.startsWith('http://localhost:5173/')) {
				try {
					const linkPage = await browser.newPage();
					const response = await linkPage.goto(link.href);
					const status = response.status();
					console.log(`  📄 ${link.text}: ${status === 200 ? '✅' : '❌'} Status ${status}`);
					if (status !== 200) {
						issues.push(`Link "${link.text}" returns status ${status}`);
					}
					await linkPage.close();
				} catch (error) {
					console.log(`  📄 ${link.text}: ❌ Failed to load - ${error.message}`);
					issues.push(`Link "${link.text}" failed to load: ${error.message}`);
				}
			}
		}

		// Test API Docs page specifically
		console.log('\n📚 Testing API Docs Page...');
		await page.goto('http://localhost:5173/api-docs');
		await page.waitForLoadState('networkidle');

		// Check for API endpoint tests
		const apiTestButtons = await page.$$eval('button', (buttons) =>
			buttons
				.filter((btn) => btn.textContent.includes('Test') || btn.textContent.includes('Try'))
				.map((btn) => btn.textContent.trim())
		);

		console.log(`🧪 API Test Buttons Found: ${apiTestButtons.length}`);
		apiTestButtons.forEach((btn) => console.log(`  - ${btn}`));

		// Test MCP Tools page
		console.log('\n🔧 Testing MCP Tools Page...');
		await page.goto('http://localhost:5173/mcp-tools');
		await page.waitForLoadState('networkidle');

		// Check for MCP functionality
		const mcpContent = await page.$eval('main', (main) => main.textContent);
		const hasMcpContent = mcpContent.includes('MCP') || mcpContent.includes('tools');
		console.log(`🔧 MCP Content Present: ${hasMcpContent ? '✅' : '❌'}`);

		// Test actual MCP endpoint
		console.log('\n🔌 Testing MCP Endpoint...');
		const mcpResponse = await page.evaluate(async () => {
			try {
				const response = await fetch('/api/mcp', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						method: 'tools/list'
					})
				});
				return { status: response.status, ok: response.ok };
			} catch (error) {
				return { error: error.message };
			}
		});

		console.log(
			`🔌 MCP Endpoint: ${mcpResponse.ok ? '✅' : '❌'} ${mcpResponse.status || mcpResponse.error}`
		);

		// Test key API endpoints
		console.log('\n🧪 Testing Core API Endpoints...');
		const endpoints = [
			{ name: 'Health Check', url: '/api/health' },
			{ name: 'Languages', url: '/api/get-languages' },
			{
				name: 'Translation Questions',
				url: '/api/fetch-translation-questions?reference=John%203:16'
			},
			{ name: 'Scripture', url: '/api/fetch-scripture?reference=John%203:16' },
			{ name: 'Translation Notes', url: '/api/fetch-translation-notes?reference=John%203:16' }
		];

		for (const endpoint of endpoints) {
			try {
				const response = await page.evaluate(async (url) => {
					const res = await fetch(url);
					return { status: res.status, ok: res.ok };
				}, endpoint.url);

				console.log(
					`  📡 ${endpoint.name}: ${response.ok ? '✅' : '❌'} Status ${response.status}`
				);
				if (!response.ok) {
					issues.push(`API endpoint "${endpoint.name}" returns status ${response.status}`);
				}
			} catch (error) {
				console.log(`  📡 ${endpoint.name}: ❌ Error - ${error.message}`);
				issues.push(`API endpoint "${endpoint.name}" failed: ${error.message}`);
			}
		}

		// Test Test page functionality
		console.log('\n🧪 Testing Test Page...');
		await page.goto('http://localhost:5173/test');
		await page.waitForLoadState('networkidle');

		// Look for test forms and buttons
		const testForms = await page.$$('form');
		const testButtons = await page.$$(
			'button[type="submit"], button:has-text("Test"), button:has-text("Submit")'
		);

		console.log(`📝 Test Forms Found: ${testForms.length}`);
		console.log(`🔘 Test Buttons Found: ${testButtons.length}`);

		if (testButtons.length === 0) {
			issues.push('Test page has no test buttons or forms');
		}

		// Check for broken images or resources
		console.log('\n🖼️ Checking for Broken Resources...');
		const failedRequests = [];
		page.on('requestfailed', (request) => {
			failedRequests.push(request.url());
		});

		await page.goto('http://localhost:5173/');
		await page.waitForLoadState('networkidle');

		if (failedRequests.length > 0) {
			console.log('❌ Failed Resource Requests:');
			failedRequests.forEach((url) => {
				console.log(`  - ${url}`);
				issues.push(`Failed to load resource: ${url}`);
			});
		} else {
			console.log('✅ All resources loaded successfully');
		}
	} catch (error) {
		console.error('❌ Test failed:', error.message);
		issues.push(`Test execution failed: ${error.message}`);
	}

	// Final Report
	console.log('\n📊 AUDIT SUMMARY');
	console.log('================');

	if (errors.length > 0) {
		console.log('\n🚨 Console Errors:');
		errors.forEach((error) => console.log(`  ❌ ${error}`));
	}

	if (issues.length > 0) {
		console.log('\n⚠️ Issues Found:');
		issues.forEach((issue) => console.log(`  🔸 ${issue}`));
	}

	if (errors.length === 0 && issues.length === 0) {
		console.log('\n✅ NO ISSUES FOUND - Website appears to be working correctly!');
	} else {
		console.log(`\n🔸 Total Issues: ${issues.length}`);
		console.log(`🚨 Console Errors: ${errors.length}`);
	}

	await browser.close();
})();
