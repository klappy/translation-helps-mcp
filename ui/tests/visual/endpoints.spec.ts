import { test, expect } from '@playwright/test';

test.describe('API Endpoints Visual Tests', () => {
	const baseApiUrl = '/api/v2';

	test('scripture endpoint returns properly formatted responses', async ({ page }) => {
		// Test JSON format
		const jsonResponse = await page.goto(
			`${baseApiUrl}/fetch-scripture?reference=John%203:16&format=json`
		);
		expect(jsonResponse?.status()).toBe(200);

		// Verify JSON structure visually
		await page.goto(`/api-explorer`);
		await page.evaluate(
			(response) => {
				// Display JSON in a formatted way
				const pre = document.createElement('pre');
				pre.style.padding = '20px';
				pre.style.backgroundColor = '#f5f5f5';
				pre.textContent = JSON.stringify(response, null, 2);
				document.body.innerHTML = '';
				document.body.appendChild(pre);
			},
			await jsonResponse?.json()
		);

		await expect(page).toHaveScreenshot('scripture-json-response.png');

		// Test Markdown format
		const mdResponse = await page.goto(
			`${baseApiUrl}/fetch-scripture?reference=John%203:16&format=md`
		);
		expect(mdResponse?.status()).toBe(200);

		// Display markdown response
		await page.evaluate(
			(text) => {
				const div = document.createElement('div');
				div.style.padding = '20px';
				div.style.fontFamily = 'system-ui, -apple-system, sans-serif';
				div.innerHTML = `<pre style="white-space: pre-wrap;">${text}</pre>`;
				document.body.innerHTML = '';
				document.body.appendChild(div);
			},
			await mdResponse?.text()
		);

		await expect(page).toHaveScreenshot('scripture-markdown-response.png');

		// Test Text format
		const textResponse = await page.goto(
			`${baseApiUrl}/fetch-scripture?reference=John%203:16&format=text`
		);
		expect(textResponse?.status()).toBe(200);

		// Display text response
		await page.evaluate(
			(text) => {
				const pre = document.createElement('pre');
				pre.style.padding = '20px';
				pre.style.fontFamily = 'monospace';
				pre.style.whiteSpace = 'pre-wrap';
				pre.textContent = text;
				document.body.innerHTML = '';
				document.body.appendChild(pre);
			},
			await textResponse?.text()
		);

		await expect(page).toHaveScreenshot('scripture-text-response.png');
	});

	test('translation notes display correctly', async ({ page }) => {
		const response = await page.goto(
			`${baseApiUrl}/translation-notes?reference=John%203:16&format=md`
		);
		expect(response?.status()).toBe(200);

		// Display the markdown content
		await page.evaluate(
			(text) => {
				const div = document.createElement('div');
				div.style.padding = '20px';
				div.style.fontFamily = 'system-ui, -apple-system, sans-serif';
				div.style.lineHeight = '1.6';
				// Simple markdown to HTML conversion for visual test
				const html = text
					.replace(/^# (.+)$/gm, '<h1>$1</h1>')
					.replace(/^## (.+)$/gm, '<h2>$1</h2>')
					.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
					.replace(/\n\n/g, '</p><p>')
					.replace(/^/, '<p>')
					.replace(/$/, '</p>');
				div.innerHTML = html;
				document.body.innerHTML = '';
				document.body.appendChild(div);
			},
			await response?.text()
		);

		await expect(page).toHaveScreenshot('translation-notes-formatted.png');
	});

	test('languages endpoint displays list correctly', async ({ page }) => {
		const response = await page.goto(`${baseApiUrl}/simple-languages?includeMetadata=true`);
		expect(response?.status()).toBe(200);

		const data = await response?.json();

		// Create a visual table of languages
		await page.evaluate((languages) => {
			const table = document.createElement('table');
			table.style.width = '100%';
			table.style.borderCollapse = 'collapse';
			table.style.fontFamily = 'system-ui, -apple-system, sans-serif';

			// Header
			const header = table.createTHead();
			const headerRow = header.insertRow();
			['Code', 'Name', 'Direction', 'Resources'].forEach((text) => {
				const th = document.createElement('th');
				th.textContent = text;
				th.style.padding = '10px';
				th.style.borderBottom = '2px solid #ddd';
				th.style.textAlign = 'left';
				headerRow.appendChild(th);
			});

			// Body
			const tbody = table.createTBody();
			languages.items.slice(0, 10).forEach((lang: any) => {
				const row = tbody.insertRow();
				[lang.code, lang.name, lang.direction, lang.resources?.join(', ') || 'N/A'].forEach(
					(text) => {
						const cell = row.insertCell();
						cell.textContent = text;
						cell.style.padding = '8px';
						cell.style.borderBottom = '1px solid #eee';
					}
				);
			});

			document.body.innerHTML = '';
			document.body.style.padding = '20px';
			document.body.appendChild(table);
		}, data);

		await expect(page).toHaveScreenshot('languages-table.png');
	});

	test('error responses display correctly', async ({ page }) => {
		// Test missing parameter error
		const response = await page.goto(`${baseApiUrl}/fetch-scripture`);
		expect(response?.status()).toBe(400);

		const error = await response?.json();

		// Display error in a styled format
		await page.evaluate((errorData) => {
			const div = document.createElement('div');
			div.style.padding = '20px';
			div.style.backgroundColor = '#fee';
			div.style.border = '1px solid #fcc';
			div.style.borderRadius = '4px';
			div.style.fontFamily = 'system-ui, -apple-system, sans-serif';

			div.innerHTML = `
				<h2 style="color: #c00; margin-top: 0;">API Error</h2>
				<p><strong>Status:</strong> ${errorData.status}</p>
				<p><strong>Message:</strong> ${errorData.error}</p>
				<p><strong>Endpoint:</strong> ${errorData.endpoint}</p>
				${errorData.details ? `<p><strong>Details:</strong> ${JSON.stringify(errorData.details)}</p>` : ''}
			`;

			document.body.innerHTML = '';
			document.body.appendChild(div);
		}, error);

		await expect(page).toHaveScreenshot('error-response-formatted.png');
	});
});
