# Enhanced Caching Strategy Implementation Guide

This guide shows how to implement the enhanced caching strategy across your Netlify functions for optimal performance and reliability.

## Overview

The enhanced caching approach provides:

- **App version-aware cache keys** (prevents stale data across deployments)
- **Netlify Blobs storage** with memory cache fallback
- **24-hour maximum TTL cap** for safety while preserving original cache times
- **Proper HTTP cache headers** for browser/CDN caching
- **Graceful cache bypass** for debugging and fresh data
- **Automatic orphan key prevention** through versioning

## Key Features

### TTL Limits (Original Values + 24hr Cap)

```typescript
const CACHE_TTLS = {
  organizations: 1 hour        // original value
  languages: 1 hour           // original value
  resources: 5 minutes        // original value
  fileContent: 10 minutes     // original value
  metadata: 30 minutes        // original value
  deduplication: 1 minute     // original value
  transformedResponse: 10 minutes // new type for processed responses
}
// All capped at maximum 24 hours for safety
```

### Cache Key Versioning

All cache keys include app version: `v3.4.0:languages:all`

This ensures cache invalidation on deployments without manual intervention.

## Implementation Pattern

### 1. Import Required Functions

```typescript
import {
  corsHeaders,
  errorResponse,
  withConservativeCache,
  buildDCSCacheKey,
} from "./_shared/utils";
```

### 2. Create Request Object

```typescript
const request = new Request(`${event.headers.host}${event.path}`, {
  method: event.httpMethod,
  headers: event.headers as Record<string, string>,
});
```

### 3. Build Cache Key

For DCS resources:

```typescript
const cacheKey = buildDCSCacheKey("languages", "all", {});
// or with params:
const cacheKey = buildDCSCacheKey("notes", "en", { book: "gen", chapter: "1" });
```

For transformed responses:

```typescript
const cacheKey = buildTransformedCacheKey("processReferences", { text, language });
```

### 4. Use Conservative Caching

```typescript
const cacheResult = await withConservativeCache(
  request,
  cacheKey,
  async () => {
    // Your data fetching logic here
    return await fetchData();
  },
  {
    cacheType: "languages", // Choose appropriate type
    bypassCache: false, // Optional: force bypass
  }
);
```

### 5. Return Response with Cache Headers

```typescript
return {
  statusCode: 200,
  headers: {
    ...corsHeaders,
    ...cacheResult.cacheHeaders, // Includes proper Cache-Control, X-Cache-* headers
  },
  body: JSON.stringify({
    ...cacheResult.data,
    cached: cacheResult.cached,
    metadata: {
      responseTime: Date.now() - startTime,
      cacheInfo: cacheResult.cacheInfo,
    },
  }),
};
```

## Cache Headers Explained

The system automatically sets appropriate headers:

### Cache Hit

```
Cache-Control: public, max-age=1800
X-Cache-Status: HIT
X-Cache-Type: netlify-blobs
X-Cache-Version: 3.4.0
X-Cache-Expires: 2024-01-15T10:30:00.000Z
```

### Cache Miss

```
Cache-Control: public, max-age=1800
X-Cache-Status: MISS
X-Cache-Type: netlify-blobs
X-Cache-Version: 3.4.0
X-Cache-Expires: 2024-01-15T10:30:00.000Z
```

### Cache Bypass

```
Cache-Control: no-cache, no-store, must-revalidate
X-Cache-Status: BYPASSED
```

## Cache Bypass Options

### Via Headers

```bash
# Force bypass cache
curl -H "Cache-Control: no-cache" /api/get-languages
curl -H "X-Bypass-Cache: true" /api/get-languages
```

### Via Code

```typescript
const cacheResult = await withConservativeCache(request, cacheKey, fetcher, { bypassCache: true });
```

## Migration Checklist

To migrate an existing function:

- [ ] Import `withConservativeCache` and `buildDCSCacheKey`
- [ ] Create Request object from event
- [ ] Replace manual cache logic with `withConservativeCache`
- [ ] Use appropriate cache key builder
- [ ] Update response headers to include `cacheResult.cacheHeaders`
- [ ] Update response body to include cache metadata
- [ ] Test with cache bypass headers

## Example: Complete Function

```typescript
import { Handler } from "@netlify/functions";
import {
  corsHeaders,
  errorResponse,
  withConservativeCache,
  buildDCSCacheKey,
} from "./_shared/utils";

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }

  const startTime = Date.now();
  const request = new Request(`${event.headers.host}${event.path}`, {
    method: event.httpMethod,
    headers: event.headers as Record<string, string>,
  });

  try {
    const cacheKey = buildDCSCacheKey("your-resource", "en", {});

    const cacheResult = await withConservativeCache(
      request,
      cacheKey,
      async () => {
        // Your data fetching logic
        return await fetchYourData();
      },
      { cacheType: "resources" }
    );

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        ...cacheResult.cacheHeaders,
      },
      body: JSON.stringify({
        ...cacheResult.data,
        cached: cacheResult.cached,
        metadata: {
          responseTime: Date.now() - startTime,
          cacheInfo: cacheResult.cacheInfo,
        },
      }),
    };
  } catch (error) {
    return errorResponse(500, "Internal error", "INTERNAL_ERROR");
  }
};
```

## Monitoring

The system provides detailed cache metrics:

```typescript
console.log("METRIC", {
  function: "your-function",
  duration: responseTime,
  cached: cacheResult.cached,
  cacheVersion: cacheResult.cacheInfo?.version,
  implementsEnhancedCaching: true,
});
```

## Benefits

1. **Version Safety**: Cache automatically invalidates on deployments
2. **Netlify Blobs Storage**: Persistent caching across function invocations
3. **Original Performance**: Preserves your existing cache times with 24hr safety cap
4. **Graceful Degradation**: Falls back to memory cache if Netlify Blobs fails
5. **Debug Friendly**: Easy cache bypass for debugging
6. **HTTP Standard**: Proper Cache-Control headers for browser/CDN caching
7. **Orphan Prevention**: Versioned keys prevent accumulated cache debris

This pattern enhances your existing caching with safety nets and better observability.
