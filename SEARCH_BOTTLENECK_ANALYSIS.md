# Search Performance Bottleneck Analysis

## Executive Summary

Current search performance: **8-9 seconds** (target: 2.5 seconds)  
Required improvement: **70%**

## Key Findings

### 🔴 Critical Issue: Search Worker Doesn't Use Caching

The search worker (`/api/internal/search-resource`) fetches ZIPs directly from DCS every time, bypassing the entire R2/KV cache infrastructure that other endpoints use successfully.

**Evidence:**

- Regular scripture endpoint: 60-200ms (uses cache)
- Search worker for same data: 8-9 seconds (no cache)

### Performance Breakdown by Resource

| Resource       | Size   | Fetch Time | Index Time | Total | Status     |
| -------------- | ------ | ---------- | ---------- | ----- | ---------- |
| en_tw (words)  | 960KB  | 1.3s       | 0.1s       | 1.5s  | ✅ Success |
| en_tn (notes)  | 8.3MB  | 4.8s       | 3.5s       | 9.0s  | ✅ Slow    |
| en_ult (Bible) | ~15MB+ | >5s        | -          | -     | ❌ Timeout |
| en_ust (Bible) | ~15MB+ | >5s        | -          | -     | ❌ Timeout |

### Bottleneck Distribution

```
Total Time (9s) =
  ├── Catalog Discovery: 0.2s (2%)
  ├── Fan-out overhead: 0.1s (1%)
  └── Per-Resource (parallel): 8.7s (97%)
      ├── ZIP Fetch: 4.8s (55%) 🔴 MAIN BOTTLENECK
      ├── Indexing: 3.5s (40%) 🟡 SECONDARY ISSUE
      └── Search/Other: 0.4s (5%)
```

## Root Causes

### 1. No ZIP Caching in Search Worker (55% of time)

**Current Code** (`ui/src/routes/api/internal/search-resource/+server.ts`):

```javascript
async function fetchZip(zipUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(zipUrl, {  // Direct fetch every time!
    headers: { 'User-Agent': '...' },
    signal: AbortSignal.timeout(5000)
  });
  // ...
}
```

**What Should Happen** (like in `ZipResourceFetcher2`):

- Check R2 cache first
- Return cached ZIP if available (100-500ms)
- Only fetch from DCS on cache miss

### 2. Inefficient Indexing (40% of time)

**Issue**: Indexing 71 TSV files takes 3.5 seconds

**Probable Causes**:

- Synchronous processing of large TSV files
- MiniSearch indexing all content at once
- No incremental/streaming indexing

### 3. Aggressive Timeouts

- Worker timeout: 5 seconds (too short for uncached large ZIPs)
- Orchestrator timeout: 15 seconds per resource
- Result: Bible resources always timeout on first fetch

## Why Other Endpoints Are Fast

The regular endpoints use `ZipResourceFetcher2` which:

1. **Uses R2 Cache**:

   ```javascript
   // Check R2 first
   const cached = await r2Storage.get(r2Key);
   if (cached) return cached;
   ```

2. **Caches at Multiple Levels**:
   - R2 (7 days)
   - KV (1 hour)
   - Memory (5 minutes)

3. **Result**: 60-200ms response times

## Solutions (Prioritized)

### Priority 1: Add R2 Caching to Search Worker ⚡

**Impact**: 55% reduction (4.8s → 0.5s)

**Implementation**:

1. Import R2Storage in search-resource worker
2. Check R2 before fetching from DCS
3. Cache downloaded ZIPs in R2

**Estimated Work**: 2-3 hours

### Priority 2: Optimize Indexing 🚀

**Impact**: 40% reduction (3.5s → 1s)

**Options**:

1. Limit indexed content (first N files)
2. Use streaming/chunked indexing
3. Pre-process and cache indexed data

**Estimated Work**: 4-6 hours

### Priority 3: Adjust Timeouts 🕐

**Impact**: Prevent failures

**Changes**:

- Increase worker timeout: 5s → 10s (for uncached)
- Reduce after caching works: 10s → 3s

**Estimated Work**: 15 minutes

## Performance Projections

### With R2 Caching Only

- Current: 8-9s
- Projected: 3-4s
- Still missing target by 0.5-1.5s

### With R2 Caching + Indexing Optimization

- Current: 8-9s
- Projected: 1.5-2.5s ✅
- **Meets target!**

### Detailed Projection

```
Optimized Flow:
  Catalog Discovery: 150ms (cached)
  Fan-out: 50ms
  Per-Resource (parallel):
    ├── R2 ZIP fetch: 200-500ms (was 4.8s)
    ├── Unzip: 100ms
    ├── Smart indexing: 500-1000ms (was 3.5s)
    └── Search: 100ms
  Total per resource: 1-2s
  Merge results: 50ms
────────────────────────
Total: 1.5-2.5s ✅
```

## Test Results Summary

### Current Performance Tests

```
Average Total Time: 8.23s
Average Server Time: 8.22s
Missing target by: 5.72s (69.6% improvement needed)

Resource Success Rates:
- en_tw (960KB): 100% success, 1.5s avg
- en_tn (8.3MB): 100% success, 9s avg
- en_ult/ust (15MB+): 0% success (timeouts)
```

### Cache Test Results

```
Regular endpoint (uses cache): 60-174ms
Search endpoint (no cache): 8000-9000ms
Difference: 130x slower!
```

## Recommendations

### Immediate Actions (This Week)

1. **Implement R2 caching in search worker** - Biggest bang for buck
2. **Increase timeouts temporarily** - Stop the failures
3. **Add metrics/logging** - Track cache hit rates

### Next Sprint

1. **Optimize indexing algorithm** - Get to target performance
2. **Implement streaming results** - Return results as they arrive
3. **Add result caching** - Cache search results for common queries

### Long Term

1. **Pre-index common resources** - Index at build time
2. **Use vector search** - Better quality results
3. **Add search analytics** - Understand usage patterns

## Conclusion

The search feature has good architecture but lacks the caching layer that makes other endpoints fast. Adding R2 caching to the search worker would immediately cut response time by 55%. Combined with indexing optimization, we can meet the 2.5s target.

**Current State**: 🔴 Failing (8-9s, 50% failures)  
**With R2 Cache**: 🟡 Better (3-4s, no failures)  
**With Full Optimization**: ✅ Target Met (<2.5s)

---

_Analysis Date: November 25, 2025_  
_Analyzer: Nate Bargatze (somehow a performance engineer now)_
