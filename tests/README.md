# Test Suite

Simple, focused tests following the 80/20 rule.

## Philosophy

We test the 20% of scenarios that cover 80% of real-world usage. No complex edge cases, no over-engineering, just practical tests that ensure our API works for users.

## Structure

```
tests/
├── contracts/          # API contract tests (locked behavior)
├── unit/              # Simple unit tests
│   ├── validators/    # Input validation tests
│   ├── services/      # Service logic tests
│   └── utils/         # Utility function tests
├── integration/       # User workflow tests
│   ├── endpoints/     # Endpoint integration tests
│   └── workflows/     # Multi-step user scenarios
├── load/             # Performance tests (run separately)
├── archive/          # Old tests (for reference only)
└── test-utils.ts     # Shared test utilities
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:contracts      # Contract tests
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:smoke         # Quick health checks

# Update snapshots
npm run test:contracts:update
```

## Writing New Tests

### DO ✅

- Test real user scenarios
- Keep tests under 50 lines
- Use descriptive test names
- Test happy paths first
- Mock external services

### DON'T ❌

- Test implementation details
- Create complex test fixtures
- Test every edge case
- Write tests for tests
- Over-mock internals

## Example Test

```typescript
import { describe, it, expect } from "vitest";
import { makeRequest } from "../test-utils";

describe("Scripture Endpoint", () => {
  it("returns scripture for valid reference", async () => {
    const response = await makeRequest("/api/fetch-scripture", {
      reference: "John 3:16",
    });

    expect(response.status).toBe(200);
    expect(response.data.scripture).toBeDefined();
    expect(response.data.scripture[0].text).toContain("God so loved");
  });
});
```

## Test Data

Use the common test data from `test-utils.ts`:

- Valid/invalid references
- Valid/invalid languages
- Valid/invalid organizations

## Performance

All tests should run in < 30 seconds total. If a test takes longer than 1 second, it's probably too complex.

## Maintenance

When updating code:

1. Run tests to ensure nothing breaks
2. Update tests if behavior changes
3. Add tests for new features
4. Remove tests for removed features

Remember: Tests should help, not hinder. Keep them simple!
