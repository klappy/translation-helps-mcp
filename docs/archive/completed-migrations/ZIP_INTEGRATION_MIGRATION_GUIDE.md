# ZIP Integration Migration Guide

## Step-by-Step Guide to Integrate ZIP Caching with Configuration System

### Prerequisites

- Working configuration-based endpoint system ✅
- ZIP caching system (ZipResourceFetcher2) built ✅
- KV cache configured for Cloudflare ✅

### Phase 1: Core Integration (Day 1-2)

#### Step 1: Extend Type Definitions

```typescript
// src/config/EndpointConfig.ts
export type DataSourceType =
  | "dcs-api" // Existing
  | "computed" // Existing
  | "hybrid" // Existing
  | "zip-cached" // NEW
  | "zip-direct"; // NEW

export interface ZipConfig {
  fetchMethod:
    | "getScripture"
    | "getTSVData"
    | "getUSFMContent"
    | "getMarkdownContent";
  resourceType: "ult" | "ust" | "tn" | "tq" | "tw" | "ta" | "twl";
  useIngredients?: boolean;
  zipCacheTtl?: number;
  warmCache?: boolean;
}

export interface DataSourceConfig {
  type: DataSourceType;
  dcsEndpoint?: string;
  transformation?: TransformationType;
  cacheTtl?: number;
  zipConfig?: ZipConfig; // NEW
}
```

#### Step 2: Update RouteGenerator

1. Import ZIP dependencies:

```typescript
// src/config/RouteGenerator.ts
import { ZipResourceFetcher2 } from "../services/ZipResourceFetcher2.js";
import { EdgeXRayTracer } from "../functions/edge-xray.js";
import { initializeKVCache } from "../functions/kv-cache.js";
```

2. Add ZIP fetcher property:

```typescript
export class RouteGenerator {
  private dcsClient: DCSApiClient;
  private zipFetcher?: ZipResourceFetcher2; // NEW
  // ...
}
```

3. Update fetchData method:

```typescript
private async fetchData(
  config: EndpointConfig,
  params: ParsedParams,
  traceId: string
): Promise<unknown> {
  switch (config.dataSource.type) {
    case 'dcs-api':
      return this.fetchFromDCS(config.dataSource, params, traceId);

    case 'zip-cached':
    case 'zip-direct':
      return this.fetchFromZIP(config.dataSource, params, traceId);

    case 'computed':
      return this.computeData(config, params, null);

    case 'hybrid':
      const baseData = config.dataSource.zipConfig
        ? await this.fetchFromZIP(config.dataSource, params, traceId)
        : await this.fetchFromDCS(config.dataSource, params, traceId);
      return this.computeData(config, params, baseData);

    default:
      throw new Error(`Unsupported data source type: ${config.dataSource.type}`);
  }
}
```

4. Implement fetchFromZIP:

```typescript
private async fetchFromZIP(
  dataSource: DataSourceConfig,
  params: ParsedParams,
  traceId: string
): Promise<unknown> {
  // See RouteGeneratorWithZIP.ts for full implementation
}
```

### Phase 2: Migrate First Endpoint (Day 3)

#### Step 3: Update fetch-scripture Configuration

```typescript
// src/config/endpoints/ScriptureEndpoints.ts
export const FETCH_SCRIPTURE_CONFIG: EndpointConfig = {
  name: "fetch-scripture",
  // ... existing config ...

  dataSource: {
    type: "zip-cached", // Changed from "computed"
    cacheTtl: 3600,
    zipConfig: {
      fetchMethod: "getScripture",
      resourceType: "ult",
      warmCache: true,
      zipCacheTtl: 86400,
    },
  },

  // ... rest of config
};
```

#### Step 4: Test the Integration

```bash
# Test direct API (old way)
curl "http://localhost:8174/api/fetch-scripture?reference=John+3:16"

# Monitor logs for ZIP fetching
# First request: Downloads ZIP
# Subsequent requests: Uses cache
```

### Phase 3: Migrate TSV-Based Endpoints (Day 4-5)

#### Step 5: Update Translation Questions

```typescript
// src/config/endpoints/TranslationHelpsEndpoints.ts
export const FETCH_TRANSLATION_QUESTIONS_CONFIG: EndpointConfig = {
  // ... existing config ...

  dataSource: {
    type: "zip-cached",
    cacheTtl: 7200,
    zipConfig: {
      fetchMethod: "getTSVData",
      resourceType: "tq",
      useIngredients: true, // Important!
      zipCacheTtl: 86400,
    },
    transformation: "tsv-parse", // Still needed
  },
};
```

#### Step 6: Fix "USES_INGREDIENTS" Issue

The RouteGenerator needs to handle the special "USES_INGREDIENTS" case:

```typescript
private async fetchFromZIP(
  dataSource: DataSourceConfig,
  params: ParsedParams,
  traceId: string
): Promise<unknown> {
  const { zipConfig } = dataSource;

  // For endpoints that use ingredients
  if (zipConfig.useIngredients) {
    // Let ZipResourceFetcher2 handle ingredient lookup
    // Don't construct DCS URLs here
  }

  // ... rest of implementation
}
```

### Phase 4: Performance Monitoring (Day 6)

#### Step 7: Add Metrics

```typescript
// src/functions/performance-monitor.ts
export interface ZipMetrics {
  cacheHits: number;
  cacheMisses: number;
  zipDownloads: number;
  avgResponseTime: number;
  dataSourceType: 'zip' | 'api' | 'hybrid';
}

// Track in RouteGenerator
private async fetchFromZIP(
  dataSource: DataSourceConfig,
  params: ParsedParams,
  traceId: string
): Promise<unknown> {
  const startTime = Date.now();
  const metrics: ZipMetrics = { /* ... */ };

  try {
    // ... fetch logic ...
  } finally {
    metrics.avgResponseTime = Date.now() - startTime;
    await this.trackMetrics(metrics);
  }
}
```

### Phase 5: Admin Tools (Day 7)

#### Step 8: Create Cache Management Endpoint

```typescript
// src/config/endpoints/AdminEndpoints.ts
export const ZIP_CACHE_ADMIN_CONFIG: EndpointConfig = {
  name: "zip-cache-admin",
  path: "/admin/zip-cache",
  title: "ZIP Cache Administration",
  description: "Manage ZIP cache: view stats, clear cache, warm cache",
  category: "admin",

  params: {
    action: {
      type: "string",
      required: true,
      options: ["stats", "clear", "warm", "list"],
    },
  },

  dataSource: {
    type: "computed",
    cacheTtl: 0, // No caching for admin endpoints
  },

  enabled: true,
  tags: ["admin", "cache", "zip"],
};
```

### Testing Checklist

#### For Each Migrated Endpoint:

- [ ] **Performance Test**

  ```bash
  # First request (ZIP download)
  time curl "http://localhost:8174/api/fetch-scripture?reference=John+3:16"

  # Second request (cached)
  time curl "http://localhost:8174/api/fetch-scripture?reference=John+3:16"
  ```

- [ ] **Verify Output Format**
  - Response structure matches original
  - All fields present
  - Transformations applied correctly

- [ ] **Error Handling**
  - Invalid references handled
  - Network failures graceful
  - Cache misses recover

- [ ] **Cache Behavior**
  - KV cache persists across restarts
  - Memory cache fast for hot data
  - TTLs respected

### Rollback Plan

If issues arise, endpoints can be quickly reverted:

```typescript
// Just change the data source type back
dataSource: {
  type: "dcs-api", // Revert from "zip-cached"
  // ... original config
}
```

### Success Metrics

Track these metrics to validate the migration:

1. **Response Time**: 90% reduction expected
2. **Cache Hit Rate**: >95% after warm-up
3. **Error Rate**: Should remain <0.1%
4. **Data Freshness**: ZIP refresh within 24h
5. **Storage Usage**: Monitor KV usage

### Common Issues & Solutions

#### Issue: "Computed data source not yet implemented"

**Solution**: Ensure RouteGenerator has fetchFromZIP implemented

#### Issue: "USES_INGREDIENTS" in URL

**Solution**: Check zipConfig.useIngredients is set properly

#### Issue: First request timeout

**Solution**: Increase timeout for ZIP downloads, implement progress tracking

#### Issue: Cache not persisting

**Solution**: Verify KV namespace is initialized in platform.env

### Next Steps

After successful migration:

1. **Enable cache warming** for popular resources
2. **Implement delta updates** for changed files only
3. **Add predictive caching** based on usage patterns
4. **Create performance dashboard** for monitoring
5. **Document patterns** for future endpoints

### Conclusion

This migration preserves the elegant configuration system while adding powerful ZIP caching. Each endpoint can be migrated independently with instant rollback capability.
