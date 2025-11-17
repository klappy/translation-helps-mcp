# Cache TTL Reference

This document provides a comprehensive reference for cache TTL (Time To Live) values across all cache layers in the Translation Helps MCP system.

## Cache Layer TTLs

### 1. Memory Cache (In-Process)

**TTL: 5 minutes (300 seconds)**

- **Location**: `CloudflareKVCache.memoryCache`
- **Max TTL**: 300,000ms (5 minutes) - hardcoded limit
- **Scope**: Per-request, ephemeral
- **Behavior**:
  - Automatically warmed from KV cache hits
  - Expires on process restart
  - Used for hot data accessed multiple times in the same request

**Code Reference:**

```typescript
// src/functions/kv-cache.ts
expires: Date.now() + Math.min(ttlSeconds * 1000, 300000); // Max 5 min
```

### 2. KV Cache (Cloudflare KV)

**TTL: Varies by data type**

| Data Type        | TTL                | Location                 | Notes                          |
| ---------------- | ------------------ | ------------------------ | ------------------------------ |
| **Catalog Data** | 1 hour (3600s)     | `ZipResourceFetcher2.ts` | Bible resource catalogs        |
| **Default**      | 30 minutes (1800s) | `kv-cache.ts`            | Fallback for unspecified types |

**Code References:**

```typescript
// Catalog data
await this.kvCache.set(catalogCacheKey, JSON.stringify(catalogData), 3600);

// Default
async set(key: string, value: ArrayBuffer | string, ttlSeconds: number = 1800)
```

### 3. R2/Cache API

**TTL: Long-term (7 days default)**

- **Location**: Cloudflare R2 bucket + Cache API
- **Cache-Control**: `public, max-age=604800` (7 days)
- **Scope**: Persistent, distributed storage
- **Behavior**:
  - ZIP files stored in R2 bucket
  - Extracted file content cached in Cache API
  - Long-term persistence for large files

**Code Reference:**

```typescript
// src/functions/r2-storage.ts
headers: {
  "Content-Type": contentTypeForKey(key),
  "Cache-Control": "public, max-age=604800", // 7 days
}
```

### 4. Unified Cache TTLs (Legacy/Alternative System)

The system also has unified cache TTL configurations for different content types:

| Cache Type            | TTL                | Use Case               |
| --------------------- | ------------------ | ---------------------- |
| `apiResponse`         | 10 minutes (600s)  | API endpoint responses |
| `organizations`       | 1 hour (3600s)     | Organization metadata  |
| `languages`           | 1 hour (3600s)     | Language metadata      |
| `resources`           | 5 minutes (300s)   | Resource listings      |
| `fileContent`         | 30 minutes (1800s) | USFM/TSV file content  |
| `metadata`            | 15 minutes (900s)  | Catalog metadata       |
| `deduplication`       | 1 minute (60s)     | Request deduplication  |
| `transformedResponse` | 0 (disabled)       | Processed responses    |

**Code Reference:**

```typescript
// src/functions/unified-cache-v2.ts
const UNIFIED_CACHE_TTLS = {
  apiResponse: 600,
  organizations: 3600,
  languages: 3600,
  resources: 300,
  fileContent: 1800,
  metadata: 900,
  transformedResponse: 0,
  deduplication: 60,
};
```

## Cache Hierarchy & Expiration Flow

```
Request
  ↓
Memory Cache (5 min) → Expires fastest
  ↓ MISS
KV Cache (1 hour for catalogs, 30 min default) → Expires after memory
  ↓ MISS
R2/Cache API (7 days) → Longest persistence
  ↓ MISS
Network (DCS) → Source of truth
```

## Practical Examples

### Example 1: Catalog Data

```
1. First request: Fetch catalog from DCS
   → Store in KV: TTL = 3600s (1 hour)
   → Warm memory: TTL = 300s (5 min)

2. Within 5 minutes: Memory cache HIT
   → Instant response (~1ms)

3. After 5 min, within 1 hour: KV cache HIT
   → Fast response (~50-200ms)
   → Memory cache re-warmed

4. After 1 hour: Cache miss
   → Fetch fresh from DCS
   → Re-populate KV and memory
```

### Example 2: ZIP File Content

```
1. First request: Download ZIP from DCS
   → Store in R2: TTL = 604800s (7 days)
   → Store in Cache API: TTL = 604800s (7 days)

2. Within 7 days: R2/Cache API HIT
   → Fast response (~100-500ms)

3. After 7 days: Cache miss
   → Re-download from DCS
   → Re-populate R2 and Cache API
```

## Cache Invalidation

### Automatic Expiration

- All caches expire automatically based on TTL
- No manual invalidation needed for normal operation

### Force Refresh

- Use `X-Force-Refresh: true` header to bypass all caches
- Forces fresh fetch from network source

### Manual Cleanup

- Invalid/empty cache entries are automatically cleaned up
- Corrupted cache entries are deleted and re-fetched

## TTL Configuration

### Current Implementation

The TTL values are **hardcoded** in the source code:

1. **Memory Cache**: Fixed at 5 minutes (cannot be configured)
2. **KV Cache**:
   - Catalog data: 3600s (hardcoded in `ZipResourceFetcher2.ts`)
   - Default: 1800s (configurable via `set()` parameter)
3. **R2/Cache API**: Fixed at 7 days (604800s)

### Future Configuration Options

To make TTLs configurable, you could:

- Add environment variables for TTL overrides
- Create a configuration file for cache settings
- Implement adaptive TTL based on access patterns

## Summary Table

| Cache Layer      | TTL        | Expires After            | Use Case                 |
| ---------------- | ---------- | ------------------------ | ------------------------ |
| **Memory**       | 5 minutes  | Process restart or 5 min | Hot data in same request |
| **KV (Catalog)** | 1 hour     | 1 hour                   | Resource catalogs        |
| **KV (Default)** | 30 minutes | 30 minutes               | General data             |
| **R2/Cache API** | 7 days     | 7 days                   | Large files (ZIPs)       |

## Notes

- **Memory cache** is always the fastest but shortest-lived
- **KV cache** provides good balance between speed and persistence
- **R2/Cache API** provides long-term storage for large files
- All caches automatically expire - no manual cleanup needed
- Cache misses trigger automatic re-population
