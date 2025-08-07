# ZIP-Based Resource Architecture

## The Problem We're Solving

Current approach is like going to the grocery store 50 times:

1. Fetch catalog → Network call
2. Parse ingredients → Complex logic
3. Fetch each file individually → More network calls
4. Handle errors for each file → Complexity
5. Cache each file separately → Cache fragmentation

## The ZIP Solution

One trip to the store, buy everything:

1. Download entire repository as ZIP → One network call
2. Cache the ZIP → One cache entry
3. Extract files as needed → Fast local operation
4. Offline-ready → Works without internet

## Implementation Plan

### Phase 1: Core ZIP Infrastructure

```typescript
// 1. Install edge-compatible ZIP library
npm install fflate

// 2. Create ZIP cache wrapper
class ZipCache {
  async getOrDownload(repo: string): Promise<Uint8Array>
  async extractFile(zipData: Uint8Array, path: string): Promise<string>
}

// 3. Update unified cache to handle binary data
// Cache ZIPs for 30 days (they rarely change)
```

### Phase 2: Resource Mappings

```typescript
// Simple resource discovery - no more catalog searches!
const RESOURCE_MAP = {
  bible: {
    ult: { repo: "en_ult", type: "usfm" },
    ust: { repo: "en_ust", type: "usfm" },
    ueb: { repo: "en_ueb", type: "usfm" },
    t4t: { repo: "en_t4t", type: "usfm" },
  },
  helps: {
    tn: { repo: "en_tn", type: "tsv" },
    tq: { repo: "en_tq", type: "tsv" },
    tw: { repo: "en_tw", type: "markdown" },
    twl: { repo: "en_twl", type: "tsv" },
    ta: { repo: "en_ta", type: "markdown" },
  },
};
```

### Phase 3: Simplified ResourceAggregator

```typescript
class SimpleResourceAggregator {
  private zipFetcher: ZipResourceFetcher;

  async getScripture(reference: ParsedReference, options: ResourceOptions) {
    const results = [];

    // Get all requested Bible translations
    for (const [key, resource] of Object.entries(RESOURCE_MAP.bible)) {
      if (options.version && options.version !== key) continue;

      const zipResource = {
        organization: options.organization,
        repository: resource.repo,
        language: options.language,
        resourceType: "bible",
      };

      const scripture = await this.zipFetcher.getScripture(
        reference,
        zipResource,
      );
      if (scripture) results.push(scripture);
    }

    return results;
  }

  async getTranslationNotes(
    reference: ParsedReference,
    options: ResourceOptions,
  ) {
    // One ZIP download gets ALL translation notes!
    return this.zipFetcher.getTSVData(reference, {
      organization: options.organization,
      repository: RESOURCE_MAP.helps.tn.repo,
      language: options.language,
      resourceType: "tn",
    });
  }
}
```

### Phase 4: File Path Resolution

```typescript
// Book to file mapping (reuse existing logic)
const BOOK_FILES = {
  Genesis: { number: "01", code: "GEN" },
  Exodus: { number: "02", code: "EXO" },
  // ...
  John: { number: "44", code: "JHN" },
  // ...
};

function getUSFMPath(book: string): string {
  const info = BOOK_FILES[book];
  return `${info.number}-${info.code}.usfm`;
}

function getTSVPath(book: string, type: string): string {
  const info = BOOK_FILES[book];
  // Pattern: en_tn_44-JHN.tsv
  return `en_${type}_${info.number}-${info.code}.tsv`;
}
```

### Phase 5: Caching Strategy

```
Cache Key Structure:
- ZIP files: `zip:{org}/{repo}:{branch}` → 30 days
- Extracted data: `extract:{org}/{repo}:{file}:{hash}` → 7 days

Example:
- `zip:unfoldingWord/en_ult:master` → Entire ULT ZIP
- `extract:unfoldingWord/en_ult:44-JHN.usfm:abc123` → Cached extraction
```

### Phase 6: Progressive Enhancement

1. **Start Simple**: Basic ZIP download and extraction
2. **Add Streaming**: Stream large ZIPs for better memory usage
3. **Add Prefetching**: Download related resources in background
4. **Add Compression**: Further compress cached data
5. **Add Versioning**: Support different branches/tags

## Benefits

### Performance

- **Before**: 50+ network calls for full context
- **After**: 4-5 ZIP downloads (cached for weeks)

### Reliability

- **Before**: Any network hiccup breaks everything
- **After**: Download once, work offline

### Simplicity

- **Before**: Complex ingredient parsing, catalog searches
- **After**: Direct file paths, simple extraction

### Caching

- **Before**: Hundreds of small cache entries
- **After**: Few large ZIP caches

## Migration Path

1. **Phase 1**: Implement ZipResourceFetcher alongside existing code
2. **Phase 2**: Update one endpoint (fetch-scripture) to use ZIPs
3. **Phase 3**: Measure performance improvement
4. **Phase 4**: Migrate remaining endpoints
5. **Phase 5**: Remove old ResourceAggregator code

## Code Example

```typescript
// Old way (complex)
const catalog = await searchCatalog(lang, org, type);
const resource = catalog.find((r) => r.name === "en_ult");
const ingredient = resource.ingredients.find((i) => i.identifier === "jhn");
const file = await fetch(ingredient.path);

// New way (simple)
const zip = await zipCache.getOrDownload("unfoldingWord/en_ult");
const file = await zipCache.extractFile(zip, "44-JHN.usfm");
```

## Edge Runtime Compatibility

Using `fflate` because it:

- Works in edge runtime (pure JS)
- Supports streaming
- Small bundle size
- Fast decompression

## Estimated Impact

- **Network calls**: 90% reduction
- **Cache efficiency**: 10x improvement
- **Offline capability**: 100% after initial download
- **Code complexity**: 50% reduction
- **Error handling**: Much simpler
