# Catalog Caching Strategy

## Decision: Subject-Specific Cache Keys

We use subject-specific catalog cache keys rather than broad organizational caches to optimize performance across all endpoint types.

## Background

The DCS catalog API supports filtering by subject (e.g., "Bible", "Translation Notes", "Translation Words"). Previously, some endpoints fetched all resources from an organization and filtered client-side, while others used proper subject filtering.

## Strategy

### Cache Key Format

```
catalog:{language}:{organization}:prod:rc:{subject}
```

Examples:

- `catalog:en:unfoldingWord:prod:rc:Bible,Aligned Bible`
- `catalog:en:unfoldingWord:prod:rc:TSV Translation Notes`
- `catalog:en:unfoldingWord:prod:rc:Translation Words`

### Performance Goals

- **Target**: Sub-2s cold calls across all endpoint types
- **Method**: Subject-specific API filtering with dedicated caching per resource type

### Subject Mappings

| Endpoint Type           | Subject Filter                |
| ----------------------- | ----------------------------- |
| Scripture               | `Bible,Aligned Bible`         |
| Translation Notes       | `TSV Translation Notes`       |
| Translation Questions   | `TSV Translation Questions`   |
| Translation Words Links | `TSV Translation Words Links` |
| Translation Words       | `Translation Words`           |
| Translation Academy     | `Translation Academy`         |

## Implementation

### API Calls

All catalog requests now include proper subject filtering:

```typescript
params.set("subject", "Bible,Aligned Bible");
```

### Cache Keys

Cache keys include the subject for specificity:

```typescript
const catalogCacheKey = `catalog:${language}:${organization}:prod:rc:${subject}`;
```

### No Client-Side Filtering

We rely on API-side subject filtering and avoid post-processing that could miss resources due to capitalization inconsistencies.

## Trade-offs

### Chosen Approach: Subject-Specific Caching

- ✅ Fast subsequent calls (sub-2s for each endpoint type)
- ✅ Consistent performance across all resource types
- ✅ No capitalization issues with client-side filtering
- ❌ Multiple cache entries per organization (one per subject type)

### Alternative Considered: Shared Organizational Cache

- ✅ Single cache entry per organization
- ✅ Cross-endpoint cache reuse
- ❌ Slower initial calls (2s+) for broad catalog fetches
- ❌ Potential client-side filtering issues

## Rationale

The subject-specific approach was chosen because:

1. **Performance Priority**: Sub-2s response times are critical for user experience
2. **Consistency**: Every endpoint type gets optimized performance, not just the first one called
3. **Reliability**: API-side filtering avoids client-side capitalization issues
4. **Cache Efficiency**: While we have more cache entries, each is smaller and more targeted

## Files Updated

- `src/services/ZipResourceFetcher2.ts` - Scripture, TSV, and markdown content methods
- `src/functions/handlers/get-context-catalog.ts` - Multi-resource context endpoint
- `src/config/functionalDataFetchers.ts` - Organization tracking for proper attribution

## Monitoring

Track cache performance using the X-Ray traces:

- Cache hit rates per subject type
- Response times for cold vs. warm calls
- Total catalog request volume

## Future Considerations

If cache memory becomes a concern, consider:

1. Implementing cache TTL cleanup
2. LRU eviction policies
3. Monitoring cache size vs. performance trade-offs

However, the current approach prioritizes performance over memory optimization.
