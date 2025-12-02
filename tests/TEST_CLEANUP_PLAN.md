# Test Cleanup Plan

## Current Status: CLEANED UP ✅

**Last Updated:** December 2024

All tests now pass. The test suite has been cleaned up and organized.

## Principles for Tests (80/20 Rule)

1. **Simple** - Easy to read and understand
2. **Fast** - Run in seconds, not minutes
3. **Focused** - Test one thing well
4. **Practical** - Test real scenarios, not edge cases
5. **Maintainable** - Easy to update when things change

## Active Tests (Running in CI)

### Core Tests ✅

- `smoke.test.ts` - Basic health checks and endpoint verification
- `search-service.test.ts` - Search filtering logic
- `search-enhanced-endpoints.test.ts` - Search parameter integration
- `metadata-extractors.test.ts` - Metadata extraction utilities
- `example-wrangler.test.ts` - Example tests using Wrangler
- `integration/endpoints/health.test.ts` - Health endpoint integration
- `ui/src/lib/adapters/MCPResponseAdapter.test.ts` - UI adapter tests
- `ui/src/demo.spec.ts` - UI demo tests

### Shared Utilities

- `test-config.ts` - Test configuration and helpers
- `test-utils.ts` - Shared test utilities
- `global-setup.ts` - Vitest global setup (checks Wrangler server)

## Excluded from Vitest (Run Separately)

### Playwright E2E Tests (`ui/e2e/`)

Run with: `npx playwright test`

- `mtt-translation-workflow.test.ts` - MTT workflow tests
- `navigation-regression.test.ts` - Navigation tests

### Archived Tests (`tests/archive/`)

Reference only - documenting known issues:

- `tsv-actual-issues.test.ts` - TSV field mapping issues
- `tsv-field-validation.test.ts` - TSV validation
- `chaos/` - Chaos testing framework

### Experimental Tests (`src/experimental/tests/`)

Have broken imports - need fixing if experimental features are activated.

### UI Tests with SvelteKit Imports (`ui/tests/`)

Require SvelteKit context - run in UI test environment.

## Test Configuration

See `vitest.config.ts` for exclusion patterns:

- Playwright E2E tests excluded (use Playwright runner)
- Browser-mode tests excluded (require vitest browser mode)
- Archive tests excluded (documentation only)
- UI tests with SvelteKit imports excluded (context issues)

## Running Tests

```bash
# Run all Vitest tests
npm test

# Run Playwright E2E tests
cd ui && npx playwright test

# Run specific test file
npx vitest tests/smoke.test.ts
```

## Success Criteria ✅

- All tests run in < 30 seconds ✅
- Tests are self-documenting ✅
- No complex setup/teardown ✅
- Focus on user scenarios ✅
- Easy to add new tests ✅
