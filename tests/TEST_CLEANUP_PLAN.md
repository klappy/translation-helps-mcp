# Test Cleanup Plan

## Principles for New Tests (80/20 Rule)

1. **Simple** - Easy to read and understand
2. **Fast** - Run in seconds, not minutes
3. **Focused** - Test one thing well
4. **Practical** - Test real scenarios, not edge cases
5. **Maintainable** - Easy to update when things change

## Tests to Keep (Follow New Patterns)

### Core Tests ✅
- `contracts/` - Contract tests for v2 endpoints
- `smoke.test.ts` - Basic health checks
- `middleware/` - Validator tests
- `test-utils.ts` - Shared utilities

### Keep with Updates
- `DCSApiClient.test.ts` - Core client tests (simplify)
- `regression.test.ts` - Prevent known issues

## Tests to Archive (Old Patterns)

### Complex/Over-engineered
- `chaos/` - Entire directory (too complex for 80/20)
- `performance-monitor.test.ts` - Over-monitoring
- `performance-benchmarks.test.ts` - Too detailed
- `cache-performance-validation.test.ts` - Too specific
- `smart-cache.test.ts` - Old caching patterns

### Old Endpoint Tests
- `endpoint-parity.test.ts` - Testing old vs new
- `endpoint-diagnostic.ts` - Old debugging
- `endpoint-status-check.js` - Old monitoring
- `comprehensive-endpoint-validation.test.ts` - Old patterns
- `endpoint-source-data-validation.test.ts` - Old validation
- `new-endpoints.test.ts` - Misleading name

### TSV Specific (Too Complex)
- All `tsv-*.test.ts` files
- All `TSV_*.md` documentation
- `twl-integration.test.ts` - Related to TSV

### Old Patterns
- `scripture-comprehensive.test.ts` - Old scripture tests
- `scripture-parameters.test.ts` - Old parameter tests
- `language-coverage.test.ts` - Old coverage tests
- `resource-detector.test.ts` - Old detection
- `resource-recommender.test.ts` - Old recommendations
- `real-data-validation.test.ts` - Old validation
- `dcs-validation.test.ts` - Old DCS tests
- `terminology-compliance.test.ts` - Old terminology
- `terminology-unit.test.ts` - Old unit tests
- `user-agent.test.ts` - Too specific

### Load Tests (Keep Separate)
- `load/` - Keep but note it's for special testing only

## New Test Structure

```
tests/
├── contracts/          # API contract tests
├── unit/              # Simple unit tests
│   ├── validators/    # Validator tests
│   ├── services/      # Service tests
│   └── utils/         # Utility tests
├── integration/       # Integration tests
│   ├── endpoints/     # Endpoint tests
│   └── workflows/     # User workflow tests
├── archive/           # Old tests for reference
└── test-utils.ts      # Shared utilities
```

## Migration Steps

1. Create new directory structure
2. Move tests to archive
3. Update remaining tests to follow new patterns
4. Simplify complex tests
5. Remove redundant tests

## Success Criteria

- All tests run in < 30 seconds
- Tests are self-documenting
- No complex setup/teardown
- Focus on user scenarios
- Easy to add new tests
