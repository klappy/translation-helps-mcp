/**
 * Navigation Regression E2E Tests
 *
 * Tests to ensure navigation works correctly after refactoring:
 * - All valid pages are accessible
 * - Removed pages return 404
 * - Links are updated correctly
 * - Mobile navigation works
 */

import { expect, test } from '@playwright/test';

test.describe('Navigation Regression Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1200, height: 800 });
	});

	test('should navigate to all valid pages', async ({ page }) => {
		const validPages = [
			{ path: '/', title: /Translation Helps MCP/ },
			{ path: '/chat', title: /AI Bible Assistant/ },
			{ path: '/mcp-tools', title: /MCP Tools/ },
			{ path: '/performance', title: /Performance/ },
			{ path: '/rag-manifesto', title: /RAG Manifesto/ },
			{ path: '/whitepaper', title: /Whitepaper/ },
			{ path: '/changelog', title: /Changelog/ }
		];

		for (const { path, title } of validPages) {
			await page.goto(path);
			await expect(page).toHaveTitle(title);
			// Page should not show 404
			await expect(page.locator('text=404')).not.toBeVisible();
			await expect(page.locator('text=Not found')).not.toBeVisible();
		}
	});

	test('should return 404 for removed pages', async ({ page }) => {
		const removedPages = [
			'/test',
			'/api-docs',
			'/developer-portal',
			'/sverdle',
			'/mcp-http-test'
		];

		for (const path of removedPages) {
			const response = await page.goto(path);
			// Should return 404 status
			expect(response?.status()).toBe(404);
		}
	});

	test('should have updated navigation links', async ({ page }) => {
		await page.goto('/');
		
		// Check main navigation doesn't have deprecated links
		const nav = page.locator('nav').first();
		await expect(nav.locator('text=API Docs')).not.toBeVisible();
		await expect(nav.locator('text=Developer Portal')).not.toBeVisible();
		await expect(nav.locator('text=Test')).not.toBeVisible();
		
		// Verify correct links are present
		await expect(nav.locator('text=Home')).toBeVisible();
		await expect(nav.locator('text=Chat')).toBeVisible();
		await expect(nav.locator('text=MCP Tools')).toBeVisible();
		await expect(nav.locator('text=Performance')).toBeVisible();
		await expect(nav.locator('text=RAG Manifesto')).toBeVisible();
	});

	test('should have updated home page buttons', async ({ page }) => {
		await page.goto('/');
		
		// Check that the CTA buttons point to correct pages
		const mcpToolsButton = page.locator('a:has-text("Try MCP Tools")');
		await expect(mcpToolsButton).toBeVisible();
		await expect(mcpToolsButton).toHaveAttribute('href', '/mcp-tools');
		
		const chatButton = page.locator('a:has-text("AI Bible Assistant")');
		await expect(chatButton).toBeVisible();
		await expect(chatButton).toHaveAttribute('href', '/chat');
	});

	test('should have clean footer links', async ({ page }) => {
		await page.goto('/');
		
		// Scroll to footer
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		
		// Check footer doesn't have test links
		const footer = page.locator('footer');
		const testLinks = footer.locator('a[href="/test"]');
		await expect(testLinks).toHaveCount(0);
		
		// Verify valid footer links
		const validFooterLinks = [
			'/chat',
			'/mcp-tools',
			'/performance',
			'/rag-manifesto'
		];
		
		for (const link of validFooterLinks) {
			const footerLink = footer.locator(`a[href="${link}"]`).first();
			await expect(footerLink).toBeVisible();
		}
	});

	test('should navigate correctly from performance page', async ({ page }) => {
		await page.goto('/performance');
		
		// Find the CTA button that was updated
		const ctaButton = page.locator('a[href="/mcp-tools"]');
		await expect(ctaButton).toBeVisible();
		await expect(ctaButton).toHaveAttribute('href', '/mcp-tools');
		
		// Click and verify navigation
		await ctaButton.click();
		await expect(page).toHaveURL('/mcp-tools');
		await expect(page).toHaveTitle(/MCP Tools/);
	});

	test('should handle direct tool links', async ({ page }) => {
		// Test that old test page links redirect properly
		await page.goto('/');
		
		// All internal links should be valid
		const links = await page.locator('a[href^="/"]').all();
		
		for (const link of links) {
			const href = await link.getAttribute('href');
			if (href && !href.includes('#')) {
				// Check that deprecated paths are not linked
				expect(href).not.toMatch(/\/(test|api-docs|developer-portal|sverdle|mcp-http-test)/);
			}
		}
	});

	test.describe('Mobile Navigation', () => {
		test.beforeEach(async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
		});

		test('should update mobile menu correctly', async ({ page }) => {
			await page.goto('/');
			
			// Open mobile menu
			const menuButton = page.locator('button[aria-label*="menu" i], button:has-text("Menu")').first();
			await menuButton.click();
			
			// Wait for menu to open
			await page.waitForSelector('[role="navigation"].translate-x-0, nav:visible', { timeout: 5000 });
			
			const mobileMenu = page.locator('[role="navigation"], nav').filter({ hasText: 'MCP Tools' });
			
			// Check deprecated links are gone
			await expect(mobileMenu.locator('text=Test')).not.toBeVisible();
			await expect(mobileMenu.locator('text=API Docs')).not.toBeVisible();
			
			// Verify MCP Tools link exists and works
			const mcpLink = mobileMenu.locator('a[href="/mcp-tools"]');
			await expect(mcpLink).toBeVisible();
			await mcpLink.click();
			
			await expect(page).toHaveURL('/mcp-tools');
		});

		test('should close mobile menu after navigation', async ({ page }) => {
			await page.goto('/');
			
			// Open menu
			const menuButton = page.locator('button[aria-label*="menu" i], button:has-text("Menu")').first();
			await menuButton.click();
			
			// Click a link
			const chatLink = page.locator('nav a[href="/chat"]').first();
			await chatLink.click();
			
			// Menu should close automatically
			await expect(page.locator('.translate-x-0')).not.toBeVisible();
			
			// Should be on chat page
			await expect(page).toHaveURL('/chat');
		});
	});

	test('should preserve query parameters during navigation', async ({ page }) => {
		// Test that navigation preserves important query params
		await page.goto('/?ref=github');
		
		// Click on a navigation link
		await page.locator('nav a[href="/chat"]').first().click();
		
		// Should navigate to chat (query params not preserved for different pages)
		await expect(page).toHaveURL('/chat');
		
		// Go back
		await page.goBack();
		
		// Original query should be preserved
		await expect(page).toHaveURL('/?ref=github');
	});

	test('should handle navigation errors gracefully', async ({ page }) => {
		// Intercept navigation to simulate error
		await page.route('**/mcp-tools', route => {
			route.abort('failed');
		});
		
		await page.goto('/');
		
		// Try to navigate
		const navLink = page.locator('nav a[href="/mcp-tools"]').first();
		await navLink.click();
		
		// Should stay on current page
		await expect(page).toHaveURL('/');
		
		// No error page should be shown
		await expect(page.locator('text=500')).not.toBeVisible();
	});
});