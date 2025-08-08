# ZIP Caching + Configuration System Integration Architecture

## Executive Summary

This document outlines the architecture for integrating the ZIP-based caching system with the existing configuration-based endpoint system, preserving the DRY/KISS principles while adding high-performance caching capabilities.

## Current State

### Configuration System (Working)

- **RouteGenerator** creates handlers from endpoint configurations
- **EndpointRegistry** manages all endpoint definitions
- **Platform Adapters** ensure cross-platform compatibility
- Supports `dcs-api`, `computed`, and `hybrid` data sources
- Clean, declarative endpoint definitions

### ZIP Caching System (Built but Disconnected)

- **ZipResourceFetcher2** downloads entire resource repos as ZIP files
- **KV Cache** provides persistent storage in Cloudflare
- **Memory Cache** provides fast in-memory access
- 90% reduction in network calls
- Currently only used in test endpoints

## Proposed Architecture

### 1. Extended Data Source Types

```typescript
type DataSourceType =
  | "dcs-api" // Direct API calls (current)
  | "computed" // Custom logic (current, not implemented)
  | "hybrid" // Mix of both (current)
  | "zip-cached" // NEW: ZIP-based with caching
  | "zip-direct"; // NEW: ZIP without caching (for testing)
```

### 2. Enhanced DataSourceConfig

```typescript
interface DataSourceConfig {
  type: DataSourceType;

  // Existing fields
  dcsEndpoint?: string;
  transformation?: TransformationType;
  cacheTtl?: number;

  // NEW fields for ZIP support
  zipConfig?: {
    // Which ZIP fetcher method to use
    fetchMethod: "getScripture" | "getTSVData" | "getUSFMContent" | "getMarkdownContent";

    // Resource type for ZIP downloads
    resourceType: "ult" | "ust" | "tn" | "tq" | "tw" | "ta" | "twl";

    // Whether to use ingredients from manifest.yaml
    useIngredients?: boolean;

    // Custom ZIP cache TTL (defaults to 24 hours)
    zipCacheTtl?: number;

    // Whether to warm cache on startup
    warmCache?: boolean;
  };
}
```

### 3. Updated RouteGenerator Implementation

```typescript
class RouteGenerator {
  private zipFetcher?: ZipResourceFetcher2;

  private async fetchData(
    config: EndpointConfig,
    params: ParsedParams,
    traceId: string
  ): Promise<unknown> {
    switch (config.dataSource.type) {
      case "dcs-api":
        return this.fetchFromDCS(config.dataSource, params, traceId);

      case "zip-cached":
      case "zip-direct":
        return this.fetchFromZIP(config.dataSource, params, traceId);

      case "computed":
        return this.computeData(config, params, null);

      case "hybrid":
        // Can mix ZIP and DCS as needed
        const baseData = config.dataSource.zipConfig
          ? await this.fetchFromZIP(config.dataSource, params, traceId)
          : await this.fetchFromDCS(config.dataSource, params, traceId);
        return this.computeData(config, params, baseData);

      default:
        throw new Error(`Unsupported data source type: ${config.dataSource.type}`);
    }
  }

  private async fetchFromZIP(
    dataSource: DataSourceConfig,
    params: ParsedParams,
    traceId: string
  ): Promise<unknown> {
    // Lazy initialize ZIP fetcher
    if (!this.zipFetcher) {
      this.zipFetcher = new ZipResourceFetcher2(new EdgeXRayTracer(traceId, "route-generator"));
    }

    const { zipConfig } = dataSource;
    if (!zipConfig) {
      throw new Error("ZIP config required for zip-cached data source");
    }

    // Call appropriate ZIP fetcher method based on configuration
    switch (zipConfig.fetchMethod) {
      case "getScripture":
        return this.zipFetcher.getScripture(
          params.parsedReference,
          params.language,
          params.organization,
          params.resource || zipConfig.resourceType
        );

      case "getTSVData":
        return this.zipFetcher.getTSVData(
          params.language,
          params.organization,
          zipConfig.resourceType,
          params.book,
          params.chapter
        );

      case "getMarkdownContent":
        return this.zipFetcher.getMarkdownContent(
          params.language,
          params.organization,
          zipConfig.resourceType,
          params.path
        );

      // Add other methods as needed
    }
  }
}
```

### 4. Updated Endpoint Configurations

```typescript
// Example: Migrating fetch-scripture to use ZIP caching
export const FETCH_SCRIPTURE_CONFIG: EndpointConfig = {
  name: "fetch-scripture",
  path: "/fetch-scripture",
  title: "Fetch Scripture",
  description: "Retrieve scripture text with ZIP-based caching",
  category: "core",
  responseShape: SCRIPTURE_SHAPE,
  params: SCRIPTURE_PARAMS,

  dataSource: {
    type: "zip-cached", // Changed from "computed"
    cacheTtl: 3600,
    zipConfig: {
      fetchMethod: "getScripture",
      resourceType: "ult", // default, can be overridden by params
      warmCache: true, // Pre-download popular resources
      zipCacheTtl: 86400, // Cache ZIPs for 24 hours
    },
  },

  enabled: true,
  tags: ["scripture", "bible", "text", "core", "zip-cached"],
  // ... examples remain the same
};

// Example: Translation Questions using ingredients
export const FETCH_TRANSLATION_QUESTIONS_CONFIG: EndpointConfig = {
  name: "fetch-translation-questions",
  // ... other config ...

  dataSource: {
    type: "zip-cached",
    cacheTtl: 7200,
    zipConfig: {
      fetchMethod: "getTSVData",
      resourceType: "tq",
      useIngredients: true, // Use manifest.yaml to find TSV files
      zipCacheTtl: 86400,
    },
  },
  // ...
};
```

### 5. Migration Strategy

#### Phase 1: Foundation (Immediate)

1. Implement `fetchFromZIP` method in RouteGenerator
2. Add ZIP configuration types to EndpointConfig
3. Create helper utilities for ZIP integration

#### Phase 2: Migration (Gradual)

1. Start with `fetch-scripture` - most straightforward
2. Move to translation helps that use TSV data (tN, tQ, tWL)
3. Handle special cases (tA directory browsing, tW markdown)
4. Update experimental endpoints

#### Phase 3: Optimization

1. Implement cache warming for popular resources
2. Add metrics to compare ZIP vs direct API performance
3. Create admin endpoint to manage ZIP cache
4. Add automatic ZIP refresh based on manifest changes

### 6. Benefits of This Architecture

1. **Preserves DRY/KISS**: Configuration-based system remains intact
2. **Opt-in Migration**: Endpoints can gradually move to ZIP caching
3. **Backward Compatible**: Direct API calls still work
4. **Performance Boost**: 90% reduction in API calls
5. **Flexible**: Can mix ZIP and API calls in hybrid mode
6. **Testable**: Can use `zip-direct` for testing without cache
7. **Maintainable**: All logic centralized in RouteGenerator

### 7. Example Implementation Timeline

**Week 1:**

- Implement core ZIP integration in RouteGenerator
- Update type definitions
- Create first ZIP-cached endpoint (fetch-scripture)

**Week 2:**

- Migrate TSV-based endpoints (tN, tQ, tWL)
- Add performance monitoring
- Test cache warming

**Week 3:**

- Handle complex endpoints (tA, tW)
- Add admin tools
- Complete documentation

### 8. Code Examples

#### Before (Direct API):

```typescript
// Every request hits DCS API
GET /api/fetch-scripture?reference=John+3:16
→ RouteGenerator → DCS API → Parse USFM → Return
  (300-500ms per request)
```

#### After (ZIP Cached):

```typescript
// First request downloads ZIP, subsequent use cache
GET /api/fetch-scripture?reference=John+3:16
→ RouteGenerator → ZIP Cache → Extract file → Return
  (First: 2-3s, Subsequent: 10-50ms)
```

### 9. Monitoring & Metrics

Add tracking for:

- Cache hit rates per endpoint
- Response time comparisons (ZIP vs API)
- ZIP download frequency
- Cache storage usage
- Error rates by data source type

### 10. Future Enhancements

1. **Smart Caching**: Pre-download based on usage patterns
2. **Delta Updates**: Only download changed files
3. **Edge Deployment**: Push ZIPs to edge locations
4. **Offline Mode**: Full offline capability with pre-cached ZIPs
5. **AI Integration**: Use patterns to predict needed resources

## Conclusion

This architecture preserves the elegance of the configuration-based system while adding the performance benefits of ZIP caching. It's a true "best of both worlds" solution that maintains code quality while dramatically improving performance.
