# Load Tests

This directory contains performance and load testing scripts for the Translation Helps MCP server.

## Active Tests

**Essential load tests for current performance monitoring:**

- `comprehensive-load-test.js` - Complete load test covering all endpoints
- `cloudflare-only-load-test.js` - Cloudflare Workers specific testing
- `load-test.js` - Basic load testing suite
- `local-cache-test.js` - Local caching performance tests

## Archived Tests

**Historical comparison tests (see `archived/` folder):**

- `cloudflare-vs-netlify-load-test.js` - Platform comparison (historical)
- `performance-comparison.js` - Performance benchmarking (historical)
- `performance-analysis.js` - Analysis tools (historical)

## Usage

Run comprehensive load tests:

```bash
node scripts/load-tests/comprehensive-load-test.js
```

Test current Cloudflare deployment:

```bash
node scripts/load-tests/cloudflare-only-load-test.js
```

## Notes

- Tests target both local development and production endpoints
- Cloudflare tests focus on edge performance and caching
- Historical tests are preserved for reference but not actively maintained
