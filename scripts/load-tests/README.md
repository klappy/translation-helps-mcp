# Load Testing Scripts

This folder contains performance testing and load testing scripts.

## Scripts

- `comprehensive-load-test.js` - Full system load testing
- `cloudflare-only-load-test.js` - Cloudflare-specific load testing
- `cloudflare-vs-netlify-load-test.js` - Platform comparison testing
- `load-test.js` - Basic load testing script
- `performance-analysis.js` - Performance analysis and reporting
- `performance-comparison.js` - Performance comparison utilities
- `local-cache-test.js` - Local caching performance testing

## Usage

Run these scripts to test the performance and scalability of the translation-helps-mcp API.

```bash
node scripts/load-tests/comprehensive-load-test.js
```

Make sure the development server is running before executing any load tests.
