# KV Cache Debugging Guide

## Current Status

As of v6.2.1, we're experiencing issues with KV cache persistence in production. This document outlines the debugging steps and findings.

## Issue Summary

1. **Production**: KV namespace appears empty despite logs showing cache hits/stores
2. **Local Dev**:
   - Using `npm run dev` (Vite) provides limited KV support
   - Preview namespace has some keys but not all expected ones

## Diagnostic Endpoint

Use `/api/kv-status` to check KV health:

```bash
# Local
curl http://localhost:8174/api/kv-status | jq .

# Production
curl https://translation-helps-mcp.pages.dev/api/kv-status | jq .
```

This endpoint shows:

- Platform environment details
- KV initialization status
- Read/write/list test results
- Current cache statistics

## Local Development with KV

### Option 1: Vite Dev (Current)

```bash
cd ui && npm run dev
```

- Uses memory cache primarily
- KV may work partially
- Fast hot-reload

### Option 2: Wrangler Pages Dev (Full KV)

```bash
# Build first
cd ui && npm run build

# Run with wrangler
cd .. && npx wrangler pages dev ui/.svelte-kit/cloudflare \
  --port 8174 \
  --kv TRANSLATION_HELPS_CACHE \
  --compatibility-date 2024-09-23
```

- Full KV emulation
- Slower reload
- More production-like

## KV Operations

### List Keys

```bash
# Preview (local dev)
npx wrangler kv key list --binding TRANSLATION_HELPS_CACHE --preview

# Production
npx wrangler kv key list --binding TRANSLATION_HELPS_CACHE
```

### Get Specific Key

```bash
# Preview
npx wrangler kv key get "catalog:en:unfoldingWord:prod:rc:Bible,Aligned Bible" \
  --binding TRANSLATION_HELPS_CACHE --preview

# Production
npx wrangler kv key get "catalog:en:unfoldingWord:prod:rc:Bible,Aligned Bible" \
  --binding TRANSLATION_HELPS_CACHE
```

### Clear KV

```bash
# Clear all keys in preview
npx wrangler kv key list --binding TRANSLATION_HELPS_CACHE --preview | \
  jq -r '.[].name' | \
  xargs -I {} npx wrangler kv key delete {} --binding TRANSLATION_HELPS_CACHE --preview
```

## Known Issues

1. **Singleton Pattern**: The KV cache uses a singleton pattern which may not work correctly in Cloudflare's isolated request environment
2. **Initialization Timing**: KV must be initialized on each request in edge runtime
3. **Type Safety**: Platform typing differs between local and production

## Next Steps

1. Test KV status endpoint in production
2. Add request-scoped KV initialization
3. Consider removing singleton pattern
4. Add KV operation metrics/logging
