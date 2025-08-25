# Catalog Caching Strategy

## Decision: URL-only cache keys (authoritative)

All KV and R2 keys MUST be the exact fetched URL string. No synthetic keys, no subject-derived keys. This ensures correctness, eliminates staleness from key drift, and keeps behavior antifragile and DRY. [[memory:6894460]]

## Background

The DCS catalog API supports filtering by subject (e.g., "Bible", "Translation Notes", "Translation Words"). Previously, some endpoints fetched all resources from an organization and filtered client-side, while others used proper subject filtering.

## Strategy

### Cache Key Format

- KV key = full request URL (string)
- R2 key = derived from full request URL via `r2KeyFromUrl(url)`

Examples (KV keys are the literal URLs):

- `https://git.door43.org/api/v1/catalog3/search?owner=unfoldingWord&lang=en&metadataType=rc&subject=Bible%2CAligned%20Bible`
- `https://git.door43.org/api/v1/catalog3/search?owner=unfoldingWord&lang=en&metadataType=rc&subject=Translation%20Words`

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

Cache keys are the exact request URL:

```typescript
const catalogUrl = new URL("https://git.door43.org/api/v1/catalog3/search");
catalogUrl.searchParams.set("owner", organization);
catalogUrl.searchParams.set("lang", language);
catalogUrl.searchParams.set("metadataType", "rc");
catalogUrl.searchParams.set("subject", subject);

const catalogCacheKey = catalogUrl.toString(); // KV key is the URL
```

### No Client-Side Filtering

We rely on API-side subject filtering and avoid post-processing that could miss resources due to capitalization inconsistencies.

## Trade-offs

### Chosen Approach: URL-only keys

- ✅ Correctness: keys change automatically when URLs change
- ✅ Simplicity: one rule for all caches (KV + R2)
- ✅ Antifragile: code changes don’t require manual invalidation
- ✅ DRY: no duplicate key builders or formats

## Rationale

URL-only keys are chosen because:

1. **Reliability**: Prevents stale data from synthetic key drift
2. **Consistency**: Keys align 1:1 with requests
3. **Simplicity**: No special cases per resource type
4. **Safety**: Changing query params or selection logic produces a new key automatically

## Implementation Touchpoints

- `src/services/ZipResourceFetcher2.ts` – Uses `catalogUrl.toString()` for KV keys and `r2KeyFromUrl(url)` for R2
- Any future callers must pass the exact URL as the cache key

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
