# Cache System & Status Communication

This document explains how the cache system works and how cache status is communicated from the server to the client.

## Cache Architecture

### Multi-Tier Cache System

The system uses a **3-tier cache hierarchy** with automatic fallback:

```
Request → Memory Cache → KV Cache → R2/Cache API → Network (DCS)
```

#### 1. **Memory Cache** (Fastest - ~1ms)

- **Location**: In-process memory (CloudflareKVCache)
- **TTL**: 5 minutes
- **Scope**: Per-request, ephemeral
- **Use Case**: Hot data accessed multiple times in the same request

#### 2. **KV Cache** (Fast - ~50-200ms)

- **Location**: Cloudflare KV namespace
- **TTL**: Configurable (default: 1 hour for catalogs, 30 min for files)
- **Scope**: Persistent across requests, distributed
- **Use Case**: Frequently accessed data that needs persistence

#### 3. **R2/Cache API** (Medium - ~100-500ms)

- **Location**: Cloudflare R2 bucket or Cache API
- **TTL**: Long-term storage
- **Scope**: Persistent, distributed
- **Use Case**: Large files (ZIPs, extracted content)

#### 4. **Network** (Slowest - ~500-2000ms)

- **Location**: Door43 Content Service (DCS)
- **TTL**: N/A (source of truth)
- **Scope**: External API
- **Use Case**: Fresh data when cache misses

### Cache Flow Example

```
1. Request for "John 3:16" scripture
   ↓
2. Check Memory Cache → MISS
   ↓
3. Check KV Cache → HIT (catalog data found)
   ↓
4. Warm Memory Cache with KV data
   ↓
5. Check R2 for extracted file content → MISS
   ↓
6. Fetch from DCS → SUCCESS
   ↓
7. Store in R2, KV, and Memory Cache
   ↓
8. Return data to client
```

## Cache Status Tracking

### X-Ray Tracer Integration

Every cache operation is tracked in the **EdgeXRayTracer**:

```typescript
// Internal cache hits are recorded with special URLs
this.tracer.addApiCall({
  url: `internal://memory/catalog/en/unfoldingWord/Bible,Aligned Bible`,
  duration: 1, // < 5ms = memory cache
  status: 200,
  size: json.length,
  cached: true, // ← This marks it as a cache hit
});

this.tracer.addApiCall({
  url: `internal://kv/catalog/en/unfoldingWord/Bible,Aligned Bible`,
  duration: 150, // > 5ms = KV cache
  status: 200,
  size: json.length,
  cached: true,
});

// External API calls (network) are marked as misses
this.tracer.addApiCall({
  url: `https://git.door43.org/api/v1/catalog/search?...`,
  duration: 1200,
  status: 200,
  size: 50000,
  cached: false, // ← Network fetch = cache miss
});
```

### Cache Status Calculation

The cache status is calculated from the X-Ray trace by analyzing **internal cache calls only**:

```typescript
// In simpleEndpoint.ts
const apiCalls = traceData.apiCalls || [];
const internalCalls = apiCalls.filter((call: any) =>
  call.url?.startsWith("internal://"),
);

const internalHits = internalCalls.filter((call: any) => call.cached).length;
const internalMisses = internalCalls.filter(
  (call: any) => call.cached === false,
).length;

let cacheStatus = "miss";
if (internalHits > 0 && internalMisses === 0) {
  cacheStatus = "hit"; // All internal caches hit
} else if (internalHits > 0 && internalMisses > 0) {
  cacheStatus = "partial"; // Some hits, some misses
} else if (internalHits === 0 && totalInternal > 0) {
  cacheStatus = "miss"; // All internal caches missed
}
```

**Why only internal calls?**

- External API calls (to DCS) are always misses by definition
- We want to know if **our caching** worked, not if the upstream API was fast
- This gives accurate cache performance metrics

## Communication Flow

### Server → Client Communication

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Server (SvelteKit Endpoint)                               │
│    - Processes request through cache layers                 │
│    - Tracks all operations in EdgeXRayTracer                │
│    - Calculates cache status from internal calls            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Response Headers                                          │
│    X-Cache-Status: hit|miss|partial                          │
│    X-XRay-Trace: <base64-encoded-json>                       │
│    X-Response-Time: 150ms                                    │
│    X-Trace-Id: zip-1234567890                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SDK (TranslationHelpsClient)                             │
│    - Captures response headers                               │
│    - Decodes X-XRay-Trace header                            │
│    - Extracts cacheStatus, responseTime, traceId            │
│    - Attaches to response.metadata                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Client (mcp-tools page)                                   │
│    - Receives mcpResponse.metadata                           │
│    - Extracts cacheStatus and xrayTrace                     │
│    - Passes to PerformanceMetrics component                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. UI Display (PerformanceMetrics.svelte)                   │
│    - Shows cache status (HIT/MISS/PARTIAL)                  │
│    - Displays cache hit rate                                │
│    - Shows detailed API call trace                          │
└─────────────────────────────────────────────────────────────┘
```

### Code Flow

#### 1. Server Side (simpleEndpoint.ts)

```typescript
// Calculate cache status from X-Ray trace
const apiCalls = traceData.apiCalls || [];
const internalCalls = apiCalls.filter((call) =>
  call.url?.startsWith("internal://"),
);
const internalHits = internalCalls.filter((call) => call.cached).length;

let cacheStatus = "miss";
if (internalHits > 0 && internalMisses === 0) {
  cacheStatus = "hit";
} else if (internalHits > 0 && internalMisses > 0) {
  cacheStatus = "partial";
}

// Set response headers
headers["X-Cache-Status"] = cacheStatus;
headers["X-XRay-Trace"] = btoa(JSON.stringify(fullTrace));
```

#### 2. SDK Side (client.ts)

```typescript
// Capture headers when enableMetrics is true
if (this.enableMetrics) {
  const cacheStatus = response.headers.get("X-Cache-Status");
  if (cacheStatus) {
    metadata.cacheStatus = cacheStatus.toLowerCase();
  }

  const xrayHeader = response.headers.get("X-XRay-Trace");
  if (xrayHeader) {
    metadata.xrayTrace = JSON.parse(atob(xrayHeader));
  }

  // Attach to response
  data.metadata = metadata;
}
```

#### 3. Client Side (mcp-tools/+page.svelte)

```typescript
// Extract metadata from SDK response
const responseWithDiagnostics = {
  ...responseData,
  metadata: {
    cacheStatus: mcpResponse.metadata?.cacheStatus,
    xrayTrace: mcpResponse.metadata?.xrayTrace,
    responseTime: mcpResponse.metadata?.responseTime,
    traceId: mcpResponse.metadata?.traceId,
  },
};

// Pass to handler
handleApiResponse(endpoint, responseWithDiagnostics);
```

#### 4. UI Component (PerformanceMetrics.svelte)

```svelte
<!-- Cache Status Box -->
<div class="text-2xl font-bold {getCacheColor(data.cacheStatus)}">
  {getCacheStatus(data.cacheStatus, data.cached)}
</div>

<!-- Cache Hit Rate -->
{#if data.cacheStats}
  <div class="text-2xl font-bold text-blue-400">
    {formatPercentage(data.cacheStats.hitRate)}
  </div>
  <div class="text-xs text-gray-500">
    {data.cacheStats.hits} hits, {data.cacheStats.misses} misses
  </div>
{/if}
```

## Cache Status Values

### Possible Values

- **`hit`** (Green)
  - All internal cache calls were hits
  - Data served from memory, KV, or R2
  - No network requests to DCS

- **`partial`** (Yellow)
  - Some internal cache calls hit, some missed
  - Mixed cache performance
  - Some data from cache, some from network

- **`miss`** (Orange/Red)
  - All internal cache calls missed
  - Data fetched from network (DCS)
  - Cache will be populated for next request

- **`bypass`** (Purple)
  - Cache was explicitly bypassed
  - Force refresh requested
  - Fresh data from network

### Cache Stats Structure

```typescript
{
  hits: 3,        // Number of cache hits
  misses: 1,      // Number of cache misses
  total: 4,       // Total cache operations
  hitRate: 0.75   // Hit rate (hits / total)
}
```

## Best Practices

### For Developers

1. **Enable Metrics for Development**

   ```typescript
   const client = new TranslationHelpsClient({
     enableMetrics: true, // Only in dev/debugging
   });
   ```

2. **Check Cache Status in UI**

   ```typescript
   if (response.metadata?.cacheStatus === "hit") {
     console.log("✅ Served from cache");
   }
   ```

3. **Monitor Cache Performance**
   - Check `cacheStats.hitRate` to see cache effectiveness
   - Look for patterns in cache misses
   - Adjust TTLs if hit rate is low

### For Users

1. **First Request**: Always a cache miss (populating cache)
2. **Subsequent Requests**: Should show cache hits
3. **After TTL Expiry**: Cache miss, then re-population
4. **Force Refresh**: Use `X-Force-Refresh: true` header to bypass cache

## Troubleshooting

### Cache Always Shows "MISS"

**Possible Causes:**

- Cache entries expired (check TTL)
- Invalid cache entries (now auto-cleaned)
- Cache key mismatch
- KV namespace not configured

**Solution:**

- Check server logs for cache operations
- Verify KV namespace is bound
- Check X-Ray trace for internal cache calls

### Cache Shows "PARTIAL"

**This is Normal:**

- Some data cached, some not
- Different cache layers for different resources
- Expected behavior for mixed workloads

### Cache Status Not Appearing

**Check:**

1. SDK has `enableMetrics: true`
2. Server returns `X-Cache-Status` header
3. Client extracts `mcpResponse.metadata.cacheStatus`
4. PerformanceMetrics component receives data

## Summary

The cache system provides:

- **Multi-tier caching** for optimal performance
- **Transparent status** via HTTP headers
- **Detailed metrics** via X-Ray traces
- **Client visibility** through SDK metadata
- **UI feedback** in mcp-tools page

Cache status flows: **Server → Headers → SDK → Client → UI**
