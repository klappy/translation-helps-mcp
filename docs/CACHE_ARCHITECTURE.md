# Cache Architecture

This document describes the caching system in the Translation Helps MCP project.

## Critical Rule: NEVER Cache Responses

**API responses, transformed data, and computed results are NEVER cached.**

Only the following are cached:

- External API calls (DCS catalog, etc.)
- ZIP file downloads
- Extracted files from ZIPs

See [CRITICAL_NEVER_CACHE_RESPONSES.md](./CRITICAL_NEVER_CACHE_RESPONSES.md) for the full policy.

## Overview

The cache system uses a simple, memory-based architecture with optional KV persistence in Cloudflare environments. The design prioritizes simplicity and correctness over complex features.

## Active Implementation

The active cache is located in `src/functions/cache.ts`. It is a singleton `CacheManager` class.

### Key Features

- **Version-aware keys**: All cache keys are prefixed with the app version to auto-invalidate on deploy.
- **TTL-based expiry**: Each cache type has a defined TTL.
- **Request deduplication**: Prevents duplicate in-flight requests for the same resource.
- **Hard block on response caching**: The `set` method refuses to cache `transformedResponse` types.

## Cache Types and TTLs

| Cache Type            | TTL (seconds) | Description                                 |
| --------------------- | ------------- | ------------------------------------------- |
| `organizations`       | 3600 (1 hr)   | Org metadata from DCS                       |
| `languages`           | 3600 (1 hr)   | Language list from DCS                      |
| `resources`           | 300 (5 min)   | Resource list (may change with new content) |
| `fileContent`         | 1800 (30 min) | Raw USFM/TSV/MD files from ZIPs             |
| `metadata`            | 900 (15 min)  | Catalog metadata                            |
| `deduplication`       | 60 (1 min)    | Short-lived deduplication marker            |
| `transformedResponse` | **BLOCKED**   | **Never cached. Hard-coded guard clause.**  |

## Key Generation

Cache keys are versioned and typed:

```
v{version}:{type}:{key}

Examples:
- v7.5.10:fileContent:en_ult_01-GEN.usfm
- v7.5.10:organizations:unfoldingWord
```

## How It Works

### Read Flow

```
1. Application calls cache.get(key, cacheType)
2. CacheManager checks in-memory Map
3. If found and not expired, return value
4. If not found or expired, return null
```

### Write Flow

```
1. Application calls cache.set(key, value, cacheType)
2. Guard clause checks if cacheType is 'transformedResponse' -> REJECT
3. Calculate TTL based on cacheType
4. Store in in-memory Map with expiry timestamp
```

## Cloudflare KV Integration

In production (Cloudflare Pages), a separate KV cache layer (`src/functions/kv-cache.ts`) is used for:

- ZIP file storage
- Extracted file content

This is initialized via `initializeKVCache()` when the KV binding is available.

## Best Practices

1. **Only cache data sources**: Raw API responses, raw file content.
2. **Never cache computed results**: Parsed, transformed, or aggregated data.
3. **Use the URL as the key**: For external fetches, the URL is the canonical key.
4. **Let the cache manager handle TTLs**: Don't override unless you have a specific reason.

## Files

- `src/functions/cache.ts` - Main memory cache manager (active)
- `src/functions/kv-cache.ts` - Cloudflare KV integration
- `src/functions/unified-cache.ts` - Legacy unified cache (provides bypass utilities)
