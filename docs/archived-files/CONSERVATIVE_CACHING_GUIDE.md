# Enhanced Caching Implementation Guide

## Overview

This guide documents the implementation of an enhanced multi-level caching system for the Translation Helps MCP API, featuring version-aware cache keys, Netlify Blobs support, and comprehensive HTTP cache headers.

## Key Features

### Version-Aware Cache Keys

All cache keys include app version: `v3.5.0:languages:all`

This ensures automatic cache invalidation when the app is deployed with a new version, preventing stale data issues.

### Multi-Level Caching Architecture

1. **Netlify Blobs** (Primary) - Persistent storage across function invocations
2. **Memory Cache** (Fallback) - Fast in-memory storage within function scope
3. **Netlify Edge CDN** - Global content delivery network caching
4. **Browser Cache** - Client-side caching with proper headers

### Cache TTL Management

- **Languages**: 1 hour (3600 seconds)
- **Resources**: 5 minutes (300 seconds)
- **File Content**: 10 minutes (600 seconds)
- **Maximum TTL**: 24 hours (86400 seconds) - Safety cap

## Implementation Details

### Cache Key Structure

```
v{version}:{type}:{endpoint}:{params}
```

Examples:

- `v3.5.0:languages:all`
- `v3.5.0:dcs:fetch-scripture:reference:John+3:16:language:en`
- `v3.5.0:transformed:get-context:reference:Titus+1:1`

### HTTP Cache Headers

Responses include comprehensive cache headers:

```
Cache-Control: public, max-age=3600, s-maxage=3600
X-Cache-Status: hit
X-Cache-Type: memory
X-Cache-Version: 3.5.0
X-Cache-Expires: 2025-01-20T21:30:00.000Z
X-Cache-TTL: 3600
```

### Cache Bypass Options

Clients can bypass cache using:

- `Cache-Control: no-cache` header
- `X-Bypass-Cache: true` header

## Usage Examples

### Basic Caching

```typescript
import { withConservativeCache } from "./_shared/utils";

const result = await withConservativeCache(
  () => fetchLanguages(),
  "languages:all",
  3600 // 1 hour TTL
);
```

### With Response Transformation

```typescript
const result = await withConservativeCache(
  () => fetchScripture(reference),
  `scripture:${reference}`,
  600, // 10 minutes TTL
  (data) => transformScriptureResponse(data)
);
```

## Migration Checklist

- [x] Update all functions to use `withConservativeCache` helper
- [x] Implement version-aware cache keys
- [x] Add comprehensive HTTP cache headers
- [x] Test cache bypass functionality
- [x] Verify Netlify Blobs integration
- [x] Update documentation and examples

## Benefits

1. **Performance**: Up to 100% API call reduction within TTL windows
2. **Cost Efficiency**: Reduced external API calls and function executions
3. **Reliability**: Graceful fallback from Blobs to memory cache
4. **Freshness**: Automatic cache invalidation on deployments
5. **Transparency**: Detailed cache headers for debugging
6. **Flexibility**: Cache bypass options for development/testing

## Monitoring

Cache performance can be monitored via:

- `X-Cache-Status` headers
- `X-Cache-Type` headers
- `X-Cache-TTL` headers
- Function logs with cache hit/miss indicators
