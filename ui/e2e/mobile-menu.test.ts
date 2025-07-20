import { expect, test } from '@playwright/test';

test.describe('Mobile Menu', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('hamburger menu button is visible on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		
		// The mobile menu button should be visible
		const menuButton = page.locator('button[aria-label="Toggle mobile menu"]');
		await expect(menuButton).toBeVisible();
		
		// The desktop navigation should be hidden
		const desktopNav = page.locator('nav div.hidden.md\\:flex');
		await expect(desktopNav).toBeHidden();
	});

	test('hamburger menu opens and closes correctly', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		
		const menuButton = page.locator('button[aria-label="Toggle mobile menu"]');
		const mobileMenu = page.locator('nav div.absolute.top-full');
		
		// Initially, mobile menu should not be visible
		await expect(mobileMenu).not.toBeVisible();
		
		// Click hamburger menu to open
		await menuButton.click();
		
		// Mobile menu should now be visible
		await expect(mobileMenu).toBeVisible();
		
		// Menu button should show X icon when open
		const closeIcon = page.locator('button[aria-label="Toggle mobile menu"] svg').nth(0);
		await expect(closeIcon).toBeVisible();
		
		// Click again to close
		await menuButton.click();
		
		// Mobile menu should be hidden again
		await expect(mobileMenu).not.toBeVisible();
	});

	test('mobile menu contains all navigation items', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		
		const menuButton = page.locator('button[aria-label="Toggle mobile menu"]');
		await menuButton.click();
		
		const mobileMenu = page.locator('nav div.absolute.top-full');
		await expect(mobileMenu).toBeVisible();
		
		// Check that all navigation items are present
		const expectedItems = ['Home', 'Test', 'Chat', 'API', 'MCP Tools', 'Performance'];
		
		for (const item of expectedItems) {
			const menuItem = mobileMenu.locator(`a:has-text("${item}")`);
			await expect(menuItem).toBeVisible();
		}
		
		// Check GitHub link is present
		const githubLink = mobileMenu.locator('a:has-text("GitHub")');
		await expect(githubLink).toBeVisible();
	});

	test('mobile menu navigation works correctly', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		
		const menuButton = page.locator('button[aria-label="Toggle mobile menu"]');
		await menuButton.click();
		
		const mobileMenu = page.locator('nav div.absolute.top-full');
		await expect(mobileMenu).toBeVisible();
		
		// Click on Test page
		const testLink = mobileMenu.locator('a[href="/test"]');
		await testLink.click();
		
		// Should navigate to test page
		await expect(page).toHaveURL('/test');
		
		// Mobile menu should close after navigation
		await expect(mobileMenu).not.toBeVisible();
	});

	test('mobile menu is not visible on desktop', async ({ page }) => {
		// Set desktop viewport
		await page.setViewportSize({ width: 1200, height: 800 });
		
		// Mobile menu button should be hidden on desktop
		const menuButton = page.locator('button[aria-label="Toggle mobile menu"]');
		await expect(menuButton).toBeHidden();
		
		// Desktop navigation should be visible
		const desktopNav = page.locator('nav div.hidden.md\\:flex');
		await expect(desktopNav).toBeVisible();
	});
});