import { expect, test } from '@playwright/test';

test.describe('Mobile Menu E2E Tests', () => {
	test('complete mobile menu user journey', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		// Start at the home page
		await page.goto('/');

		// Verify we're on the home page
		await expect(page).toHaveTitle(/Translation Helps MCP/);

		// Verify the mobile menu button is visible
		const menuButton = page.locator('button[aria-label="Toggle mobile menu"]');
		await expect(menuButton).toBeVisible();

		// Verify the desktop navigation is hidden
		const desktopNav = page.locator('nav div.hidden.md\\:flex');
		await expect(desktopNav).toBeHidden();

		// Open the mobile menu
		await menuButton.click();

		// Verify the mobile menu is visible
		const mobileMenu = page.locator('[data-testid="mobile-menu"]');
		await expect(mobileMenu).toBeVisible();

		// Verify the hamburger icon changed to X
		await expect(menuButton).toContainText(''); // The X icon

		// Navigate to the MCP Tools page via mobile menu
		const mcpLink = mobileMenu.locator('a[href="/mcp-tools"]');
		await expect(mcpLink).toBeVisible();
		await mcpLink.click();

		// Verify we navigated to the MCP Tools page
		await expect(page).toHaveURL('/mcp-tools');

		// Verify the mobile menu closed after navigation
		await expect(mobileMenu).not.toBeVisible();

		// Open the menu again from the MCP Tools page
		await menuButton.click();
		await expect(mobileMenu).toBeVisible();

		// Navigate to the API page
		const apiLink = mobileMenu.locator('a[href="/api"]');
		await apiLink.click();

		// Verify we navigated to the API page
		await expect(page).toHaveURL('/api');
		await expect(mobileMenu).not.toBeVisible();

		// Test the GitHub external link
		await menuButton.click();
		await expect(mobileMenu).toBeVisible();

		// Verify GitHub link is present and has correct attributes
		const githubLink = mobileMenu.locator('a:has-text("GitHub")');
		await expect(githubLink).toBeVisible();
		await expect(githubLink).toHaveAttribute('target', '_blank');
		await expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');

		// Close the menu by clicking the hamburger again
		await menuButton.click();
		await expect(mobileMenu).not.toBeVisible();

		// Verify the hamburger icon changed back to menu
		await expect(menuButton).toContainText(''); // The menu icon
	});

	test('mobile menu responsiveness - switching to desktop', async ({ page }) => {
		// Start with mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Open mobile menu
		const menuButton = page.locator('button[aria-label="Toggle mobile menu"]');
		await menuButton.click();

		const mobileMenu = page.locator('[data-testid="mobile-menu"]');
		await expect(mobileMenu).toBeVisible();

		// Switch to desktop viewport
		await page.setViewportSize({ width: 1200, height: 800 });

		// Wait for responsive changes
		await page.waitForTimeout(100);

		// Verify mobile menu button is hidden on desktop
		await expect(menuButton).toBeHidden();

		// Verify desktop navigation is visible
		const desktopNav = page.locator('nav div.hidden.md\\:flex');
		await expect(desktopNav).toBeVisible();

		// Verify mobile menu is no longer visible due to md:hidden class
		await expect(mobileMenu).toBeHidden();
	});

	test('mobile menu keyboard accessibility', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Focus the mobile menu button directly
		const menuButton = page.locator('button[aria-label="Toggle mobile menu"]');
		await menuButton.focus();
		await expect(menuButton).toBeFocused();

		// Open menu with Enter key
		await page.keyboard.press('Enter');

		const mobileMenu = page.locator('[data-testid="mobile-menu"]');
		await expect(mobileMenu).toBeVisible();

		// Navigate through menu items with Tab
		await page.keyboard.press('Tab');

		// Verify first menu item (Home) is focused
		const homeLink = mobileMenu.locator('a[href="/"]');
		await expect(homeLink).toBeFocused();

		// Navigate to next item with Tab
		await page.keyboard.press('Tab');
		const testLink = mobileMenu.locator('a[href="/test"]');
		await expect(testLink).toBeFocused();

		// Activate link with Enter
		await page.keyboard.press('Enter');

		// Verify navigation worked
		await expect(page).toHaveURL('/test');
		await expect(mobileMenu).not.toBeVisible();
	});
});
