# Cache Architecture

This document describes the caching system used in the Translation Helps MCP project.

## Critical Rule: NEVER Cache Responses

**Response caching is strictly prohibited.** See [CRITICAL_NEVER_CACHE_RESPONSES.md](./CRITICAL_NEVER_CACHE_RESPONSES.md) for the full policy.

Only the following may be cached:

- External API calls (DCS catalog, etc.)
- ZIP file downloads
- Extracted files from ZIPs

## Overview

The caching system uses a simple, memory-based architecture with two implementations:

1. **Simple Cache** (`src/functions/cache.ts`) - Used by service functions
2. **Unified Cache** (`src/functions/unified-cache.ts`) - Used by platform adapters with bypass support

Both implementations enforce the "no response caching" policy at the code level.

## Cache Types

| Type                  | TTL        | Description                | Status      |
| --------------------- | ---------- | -------------------------- | ----------- |
| `organizations`       | 1 hour     | Organization metadata      | Allowed     |
| `languages`           | 1 hour     | Language metadata          | Allowed     |
| `resources`           | 5 minutes  | Resource listings          | Allowed     |
| `fileContent`         | 30 minutes | USFM files, ZIP contents   | Allowed     |
| `metadata`            | 15 minutes | Catalog metadata           | Allowed     |
| `deduplication`       | 1 minute   | Request deduplication      | Allowed     |
| `transformedResponse` | **BANNED** | Processed/transformed data | **BLOCKED** |
| `apiResponse`         | **BANNED** | HTTP response bodies       | **BLOCKED** |

## Implementation Details

### Simple Cache (`src/functions/cache.ts`)

A memory-only cache manager used by service functions:

```typescript
import { cache } from "./cache.js";

// Allowed: caching file content
await cache.setFileContent(key, content);

// Blocked: attempting to cache responses (silently ignored)
await cache.setTransformedResponse(key, data); // No-op
```

Key features:

- Version-aware keys (`v{version}:{type}:{key}`)
- TTL enforcement with 24-hour maximum cap
- Request deduplication to prevent duplicate fetches
- Banned types are blocked in the `set()` method

### Unified Cache (`src/functions/unified-cache.ts`)

An enhanced cache with bypass support, used by platform adapters:

```typescript
import { unifiedCache, shouldBypassCache } from "./unified-cache.js";

// Check if cache should be bypassed
const bypass = shouldBypassCache({ headers, queryParams });

// Get with cache info for headers
const result = await unifiedCache.get(key, "fileContent", bypassOptions);
```

Key features:

- Cache bypass via headers (`X-Cache-Bypass`, `X-Force-Refresh`)
- Cache bypass via query params (`nocache`, `bypass`, `fresh`, `_cache`)
- Statistics tracking (hits, misses, bypasses)
- HTTP cache header generation

## Cache Bypass

Users can force fresh data using:

**Query Parameters:**

- `?nocache=true`
- `?bypass=true`
- `?fresh=true`
- `?_cache=false`

**Headers:**

- `X-Cache-Bypass: true`
- `X-Force-Refresh: true`
- `Cache-Control: no-store`

## Key Generation

Cache keys are versioned to prevent stale data across deployments:

```
v{version}:{type}:{key}

Examples:
- v7.5.10:fileContent:en_ult_01-GEN.usfm
- v7.5.10:organizations:unfoldingWord
- v7.5.10:metadata:catalog_en
```

## KV Cache (Cloudflare)

For Cloudflare deployments, a KV-backed cache is available via `src/functions/kv-cache.ts`. This provides persistent caching across requests.

The KV cache follows the same rules:

- Keys are the exact URL being fetched
- Only allowed types may be cached
- Response caching is blocked

## Best Practices

1. **Always use the correct cache type** - Don't use `fileContent` for non-file data
2. **Never cache responses** - If you're tempted, read CRITICAL_NEVER_CACHE_RESPONSES.md
3. **Use version-aware keys** - The cache managers handle this automatically
4. **Respect bypass requests** - Users may need fresh data for debugging
5. **Keep TTLs reasonable** - Shorter is safer than longer

## Debugging

Check cache statistics:

```typescript
const stats = cache.getStats();
console.log(stats);
// {
//   memorySize: 42,
//   pendingRequests: 0,
//   cacheTTLs: { ... },
//   appVersion: "7.5.10",
//   status: "MEMORY_CACHE_ONLY"
// }
```

Force cache bypass in development:

```bash
curl -H "X-Cache-Bypass: true" https://api.example.com/endpoint
```
