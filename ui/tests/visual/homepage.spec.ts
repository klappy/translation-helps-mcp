import { test, expect } from '@playwright/test';

test.describe('Homepage Visual Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should display homepage with correct layout', async ({ page }) => {
		// Wait for the main content to load
		await page.waitForSelector('h1', { timeout: 10000 });

		// Take a full page screenshot
		await expect(page).toHaveScreenshot('homepage-full.png', {
			fullPage: true,
			animations: 'disabled'
		});
	});

	test('should display navigation correctly', async ({ page }) => {
		// Screenshot just the navigation
		const nav = page.locator('nav');
		await expect(nav).toHaveScreenshot('navigation.png');
	});

	test('should display hero section correctly', async ({ page }) => {
		// Look for main heading or hero section
		const hero = page.locator('main').first();
		await expect(hero).toHaveScreenshot('hero-section.png');
	});

	test('should handle dark mode if available', async ({ page }) => {
		// Check if there's a dark mode toggle
		const darkModeToggle = page.locator(
			'[aria-label*="theme"], [aria-label*="dark"], button:has-text("Dark")'
		);

		if ((await darkModeToggle.count()) > 0) {
			await darkModeToggle.first().click();
			await page.waitForTimeout(500); // Wait for transition

			await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
				fullPage: true,
				animations: 'disabled'
			});
		}
	});

	test('should be responsive', async ({ page }) => {
		const viewports = [
			{ width: 375, height: 667, name: 'mobile' },
			{ width: 768, height: 1024, name: 'tablet' },
			{ width: 1920, height: 1080, name: 'desktop' }
		];

		for (const viewport of viewports) {
			await page.setViewportSize({ width: viewport.width, height: viewport.height });
			await page.waitForTimeout(500); // Wait for responsive adjustments

			await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, {
				fullPage: true,
				animations: 'disabled'
			});
		}
	});

	test('should display footer correctly', async ({ page }) => {
		// Scroll to footer
		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
		await page.waitForTimeout(500);

		const footer = page.locator('footer');
		if ((await footer.count()) > 0) {
			await expect(footer).toHaveScreenshot('footer.png');
		}
	});
});
