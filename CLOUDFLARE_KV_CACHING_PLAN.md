# Cloudflare KV Caching Implementation Plan

Based on our performance testing results, implementing Cloudflare KV will address the main weakness in our current setup: memory-only caching that doesn't persist across cold starts.

## 🎯 Current State Analysis

### Performance Test Results (July 2025)

- **Strengths**: 6x higher throughput (38 RPS vs 6 RPS), excellent cached response times (30-40ms)
- **Weakness**: Variable performance due to cold starts and memory-only cache
- **Cost**: Virtually free within 100k requests/day limit

### Key Findings

- Cache HITs: Lightning fast (30-40ms)
- Cache MISSEs: Variable (up to 2.2s for health check, 400ms+ for some endpoints)
- Memory cache works but doesn't survive cold starts
- Need persistent cache for consistent performance

## 🔧 Implementation Plan

### Phase 1: KV Store Setup & Basic Integration

#### 1.1 Cloudflare KV Configuration

```bash
# Create KV namespace
npx wrangler kv:namespace create "TRANSLATION_CACHE"
npx wrangler kv:namespace create "TRANSLATION_CACHE" --preview

# Add to wrangler.toml
[[kv_namespaces]]
binding = "TRANSLATION_CACHE"
id = "your-namespace-id"
preview_id = "your-preview-namespace-id"
```

#### 1.2 Update Cache Service

Create `src/functions/caches/cloudflare-kv-cache.ts`:

```typescript
export class CloudflareKVCache {
  constructor(private kv: KVNamespace) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.kv.get(key);
    } catch (error) {
      console.warn("KV get failed:", error);
      return null;
    }
  }

  async set(key: string, value: string, ttl: number = 86400): Promise<void> {
    try {
      // KV TTL is in seconds, we use 24 hours default
      await this.kv.put(key, value, { expirationTtl: ttl });
    } catch (error) {
      console.warn("KV set failed:", error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.warn("KV delete failed:", error);
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
}
```

#### 1.3 Multi-Level Cache Strategy

Update `src/functions/cache.ts` for hybrid approach:

```typescript
import { CloudflareKVCache } from "./caches/cloudflare-kv-cache";
import { MemoryCache } from "./caches/memory-cache";

export class HybridCache {
  private memoryCache = new MemoryCache();
  private kvCache?: CloudflareKVCache;

  constructor(kv?: KVNamespace) {
    if (kv) {
      this.kvCache = new CloudflareKVCache(kv);
    }
  }

  async get(key: string): Promise<string | null> {
    // L1: Check memory cache first (fastest)
    let value = await this.memoryCache.get(key);
    if (value) {
      console.log(`Cache HIT (Memory): ${key}`);
      return value;
    }

    // L2: Check KV cache (persistent)
    if (this.kvCache) {
      value = await this.kvCache.get(key);
      if (value) {
        console.log(`Cache HIT (KV): ${key}`);
        // Populate memory cache for future requests
        await this.memoryCache.set(key, value, 3600); // 1 hour in memory
        return value;
      }
    }

    console.log(`Cache MISS: ${key}`);
    return null;
  }

  async set(key: string, value: string, ttl: number = 86400): Promise<void> {
    // Set in both caches
    await this.memoryCache.set(key, value, Math.min(ttl, 3600)); // Max 1 hour in memory

    if (this.kvCache) {
      await this.kvCache.set(key, value, ttl); // Longer TTL in KV
    }
  }
}
```

### Phase 2: Cache Key Strategy & Optimization

#### 2.1 Smart Cache Keys

```typescript
export function generateCacheKey(
  endpoint: string,
  params: Record<string, string>,
  version: string = process.env.APP_VERSION || "dev"
): string {
  // Include app version for automatic invalidation on deployments
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return `v${version}:${endpoint}:${btoa(sortedParams)}`;
}
```

#### 2.2 Endpoint-Specific TTL

```typescript
const CACHE_STRATEGIES = {
  "/api/health": { ttl: 300, priority: "low" }, // 5 minutes
  "/api/get-languages": { ttl: 86400, priority: "high" }, // 24 hours
  "/api/fetch-scripture": { ttl: 604800, priority: "high" }, // 7 days
  "/api/fetch-translation-notes": { ttl: 604800, priority: "high" }, // 7 days
  "/api/fetch-translation-words": { ttl: 604800, priority: "medium" }, // 7 days
  "/api/fetch-translation-word-links": { ttl: 604800, priority: "medium" }, // 7 days
};
```

### Phase 3: Advanced Features

#### 3.1 Cache Warming

```typescript
export async function warmCriticalCache(kv: KVNamespace) {
  const criticalEndpoints = [
    "/api/get-languages?organization=unfoldingWord",
    "/api/fetch-scripture?reference=John+3:16&language=en&organization=unfoldingWord&translation=all",
  ];

  for (const endpoint of criticalEndpoints) {
    // Pre-populate cache during deployment
    await fetchAndCache(endpoint, kv);
  }
}
```

#### 3.2 Cache Analytics

```typescript
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  avgResponseTime: number;
  lastUpdated: string;
}

export async function updateCacheMetrics(kv: KVNamespace, isHit: boolean, responseTime: number) {
  const metricsKey = "cache:metrics:daily";
  const existing = await kv.get(metricsKey);
  const metrics: CacheMetrics = existing
    ? JSON.parse(existing)
    : {
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgResponseTime: 0,
        lastUpdated: new Date().toISOString(),
      };

  if (isHit) {
    metrics.hits++;
  } else {
    metrics.misses++;
  }

  metrics.hitRate = (metrics.hits / (metrics.hits + metrics.misses)) * 100;
  metrics.avgResponseTime = (metrics.avgResponseTime + responseTime) / 2;
  metrics.lastUpdated = new Date().toISOString();

  await kv.put(metricsKey, JSON.stringify(metrics), { expirationTtl: 86400 });
}
```

### Phase 4: Integration with Existing Code

#### 4.1 Update API Routes

Example for `ui/src/routes/api/fetch-scripture/+server.ts`:

```typescript
import { HybridCache } from "$lib/functions/cache";
import { generateCacheKey, CACHE_STRATEGIES } from "$lib/functions/cache-utils";

export async function GET({ url, platform }) {
  const cache = new HybridCache(platform?.env?.TRANSLATION_CACHE);
  const params = Object.fromEntries(url.searchParams);
  const cacheKey = generateCacheKey("/api/fetch-scripture", params);

  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "HIT",
        "X-Cache-Key": cacheKey,
      },
    });
  }

  // Fetch fresh data
  const startTime = Date.now();
  const data = await fetchScripture(params);
  const responseTime = Date.now() - startTime;

  // Cache the result
  const strategy = CACHE_STRATEGIES["/api/fetch-scripture"];
  await cache.set(cacheKey, JSON.stringify(data), strategy.ttl);

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "X-Cache": "MISS",
      "X-Cache-Key": cacheKey,
      "X-Response-Time": `${responseTime}ms`,
    },
  });
}
```

#### 4.2 Platform Environment Detection

```typescript
export function createCache(request: Request, env?: any): HybridCache {
  // Cloudflare Workers environment
  if (env?.TRANSLATION_CACHE) {
    return new HybridCache(env.TRANSLATION_CACHE);
  }

  // Fallback to memory-only cache
  console.warn("KV cache not available, using memory-only cache");
  return new HybridCache();
}
```

## 📊 Expected Performance Improvements

### Before KV Implementation

- Cache HITs: 30-40ms (memory only, lost on cold start)
- Cache MISSEs: 400-2000ms (full API calls)
- Cold start penalty: Severe (no persistent cache)

### After KV Implementation

- Cache HITs (Memory): 30-40ms (same as before)
- Cache HITs (KV): 50-80ms (slight overhead but persistent)
- Cache MISSEs: 400-2000ms (same, but rare due to persistence)
- Cold start penalty: Minimal (KV cache survives)

### Target Metrics

- **Overall average response time**: ~60ms (down from current 200-400ms)
- **Cache hit rate**: 95%+ (up from current variable rate)
- **Cold start impact**: <10% of requests affected
- **Consistency**: Predictable performance across all requests

## 🚀 Deployment Strategy

### Testing Phase

1. Deploy to staging environment with KV enabled
2. Run comprehensive load tests comparing before/after
3. Monitor cache hit rates and response times
4. Validate cache invalidation works properly

### Production Rollout

1. **Blue-Green Deployment**: Keep Netlify as fallback
2. **Gradual Traffic**: Route 10% → 50% → 100% to Cloudflare
3. **Monitoring**: Real-time cache metrics and performance alerts
4. **Rollback Plan**: Quick switch back to Netlify if issues arise

### Post-Deployment

1. **Performance Analysis**: Compare with baseline metrics
2. **Cost Monitoring**: Track KV usage and costs
3. **Cache Optimization**: Fine-tune TTLs based on usage patterns
4. **Documentation Update**: Update performance page with new metrics

## 💰 Cost Analysis

### Cloudflare KV Pricing

- **Reads**: $0.50 per million (first 10M free per month)
- **Writes**: $5.00 per million (first 1M free per month)
- **Storage**: $0.50 per GB per month

### Estimated Usage & Costs

- **Daily requests**: ~10k (well within free tier)
- **Cache writes**: ~1k/day (new/updated content)
- **Cache reads**: ~9k/day (cache hits)
- **Storage**: <100MB (biblical text data)

**Monthly cost**: $0 (within free tier limits)

## ⚠️ Considerations & Limitations

### KV Limitations

- **Eventual consistency**: ~60 seconds global propagation
- **Value size limit**: 25MB per key
- **List operations**: Limited to 1000 keys per request

### Mitigation Strategies

- **Fallback logic**: Always degrade gracefully to API calls
- **Chunking**: Split large responses if needed
- **Error handling**: Robust error recovery and logging

### Monitoring

- **Cache hit rates** by endpoint
- **Response time percentiles**
- **KV operation errors**
- **Memory vs KV cache performance**

## 🎯 Success Metrics

1. **Average response time**: <100ms (target: 60ms)
2. **95th percentile**: <200ms
3. **Cache hit rate**: >90%
4. **Cold start impact**: <5% of requests
5. **Cost efficiency**: Maintain $0 monthly KV costs

This implementation will transform our variable performance into consistently fast responses, addressing the main weakness identified in our performance testing while maintaining the cost advantages of Cloudflare Workers.
