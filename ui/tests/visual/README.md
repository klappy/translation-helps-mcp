# Visual Testing with Playwright

## Overview

Visual tests ensure that the Translation Helps MCP UI renders correctly across different browsers and viewports. These tests take screenshots and compare them against baseline images to detect visual regressions.

## Running Visual Tests

### Initial Setup

```bash
# Install dependencies
npm install

# Install browsers (if not already installed)
npx playwright install chromium
```

### Running Tests

```bash
# Run visual tests
npm run test:visual

# Update baseline screenshots
npm run test:visual:update

# Open Playwright UI for debugging
npm run test:visual:ui
```

## Test Structure

### API Explorer Tests (`api-explorer.spec.ts`)

- Full page layout
- Endpoint details view
- Response formatting
- Error states
- Responsive design

### Endpoints Tests (`endpoints.spec.ts`)

- Scripture endpoint formats (JSON, Markdown, Text)
- Translation notes formatting
- Languages list display
- Error response formatting

### Homepage Tests (`homepage.spec.ts`)

- Full page layout
- Navigation
- Hero section
- Dark mode (if available)
- Responsive viewports
- Footer

## Best Practices

1. **Consistent Environment**: Visual tests should be run in a consistent environment to avoid false positives.

2. **Update Baselines Carefully**: Only update baseline screenshots when intentional UI changes are made.

3. **Review Changes**: Always review screenshot differences before accepting new baselines.

4. **Viewport Sizes**: Test common viewport sizes:
   - Mobile: 375x667
   - Tablet: 768x1024
   - Desktop: 1280x720

5. **Animations**: Disable animations during tests to ensure consistent screenshots.

## CI/CD Integration

Visual tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run visual tests
  run: |
    npm ci
    npx playwright install chromium
    npm run test:visual
```

## Troubleshooting

### Tests Failing Locally

1. Ensure the dev server is running: `npm run dev`
2. Check that the correct port is configured in `playwright.config.ts`
3. Update snapshots if UI changes are intentional: `npm run test:visual:update`

### Flaky Tests

1. Add explicit waits for dynamic content
2. Disable animations
3. Use stable selectors
4. Run tests with a single worker: `playwright test --workers=1`

### Different Results on CI

1. Ensure the same browser versions are used
2. Use the same OS if possible
3. Consider using Docker for consistent environments

## Adding New Visual Tests

1. Create a new test file in `tests/visual/`
2. Use descriptive test names
3. Take focused screenshots of specific components when possible
4. Add multiple viewport tests for responsive components
5. Document what the test verifies

Example:

```typescript
test('new feature displays correctly', async ({ page }) => {
	await page.goto('/new-feature');
	await page.waitForSelector('.feature-loaded');

	// Take screenshot
	await expect(page).toHaveScreenshot('new-feature.png');

	// Test responsive
	await page.setViewportSize({ width: 375, height: 667 });
	await expect(page).toHaveScreenshot('new-feature-mobile.png');
});
```
