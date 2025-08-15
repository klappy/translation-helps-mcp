# Testing Requirements - READ THIS FIRST!

## 🚨 CRITICAL: Wrangler is REQUIRED for Tests

**ALL tests MUST run against Wrangler dev server on port 8787**

This is NOT optional. Wrangler is the ONLY way to test:

- KV storage
- R2 storage
- Cache API
- Cloudflare-specific features

## Starting the Test Server

```bash
# The ONLY approved way:
npm run test:server

# Or from project root:
./scripts/start-test-server.sh
```

This will:

1. Build the application
2. Start Wrangler on port 8787
3. Enable KV/R2 bindings

## Running Tests

```bash
# Start server first (in one terminal):
npm run test:server

# Then run tests (in another terminal):
npm test
```

## What NOT to Do

❌ DO NOT use `npm run dev` for tests
❌ DO NOT use `vite dev` for tests  
❌ DO NOT change the port from 8787
❌ DO NOT try to mock KV/R2 - use real bindings!

## Why This Matters

1. **KV/R2 Testing**: Only Wrangler provides real Cloudflare bindings
2. **Consistency**: One port, one method, no confusion
3. **Production Parity**: Test the same environment as production
4. **No Surprises**: Catch KV/R2 issues before deployment

## Troubleshooting

If tests fail with connection errors:

1. Check Wrangler is running: `lsof -i :8787`
2. Restart Wrangler: `npm run test:server`
3. Check for port conflicts
4. Ensure you built first: `cd ui && npm run build:cloudflare`

Remember: **Wrangler or nothing!**
