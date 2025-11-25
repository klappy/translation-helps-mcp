# fetch-scripture Endpoint Performance Analysis

## Summary

| Scenario                      | Performance       | Status       |
| ----------------------------- | ----------------- | ------------ |
| Single verse (John 3:16)      | **25-138ms**      | ✅ Excellent |
| Full chapter (John 3)         | **50ms**          | ✅ Excellent |
| Full book (John)              | **88ms**          | ✅ Excellent |
| Search within chapter         | **376ms**         | ✅ Good      |
| Search entire book            | **156ms**         | ✅ Good      |
| **Search ALL books (no ref)** | **16-40 seconds** | ❌ Problem   |

## Root Cause Analysis

### The Problem: "Search All Books" Mode

When searching without a reference (e.g., `?search=baptism`), the endpoint:

1. Iterates through ALL 66 books (49 succeed, 17 fail)
2. For each book:
   - Fetches from cache (~20-40ms) ✅
   - Parses USFM into individual verses 🐌
   - Creates a NEW MiniSearch index 🐌
   - Indexes ALL verses of that book 🐌
   - Searches the index ✅
   - **Discards the index** ❌

### Why It's Slow

#### Large Books Are CPU Intensive

| Book     | Verses | Parse + Index Time |
| -------- | ------ | ------------------ |
| Psalms   | 2,461  | ~500-800ms         |
| Isaiah   | 1,292  | ~300-500ms         |
| Jeremiah | 1,364  | ~300-500ms         |
| Genesis  | 1,533  | ~300-500ms         |
| Ezekiel  | 1,273  | ~300-500ms         |

#### Batch Processing Overhead

```
Batch 1-3: Cold cache + large OT books = 7-15 seconds
Batch 4: Major prophets = 3-24 seconds (variable)
Batch 5-7: Small books + warm cache = 40-250ms
```

### Why Regular Operations Are Fast

For normal operations (single verse, chapter, book):

- Only ONE book is fetched
- Parsing is minimal or not needed
- No MiniSearch indexing required
- Direct text extraction from cache

## Comparison with /api/search Endpoint

| Feature             | fetch-scripture             | /api/search                 |
| ------------------- | --------------------------- | --------------------------- |
| Cache integration   | ✅ Uses ZipResourceFetcher2 | ✅ Uses ZipResourceFetcher2 |
| Index caching       | ❌ Ephemeral per-request    | ✅ 5-minute memory cache    |
| Parallel processing | 10 books at a time          | 4 resources in parallel     |
| Performance (warm)  | 16-20 seconds               | **1.7-2.5 seconds**         |

## Recommendations

### Option 1: Use /api/search for Broad Discovery (Recommended)

- The `/api/search` endpoint already handles this use case
- Has index caching, priority book limits, optimized processing
- **Already meets 2.5s target**

### Option 2: Add Index Caching to fetch-scripture

Similar to what we did for `/api/search`:

```typescript
// Cache key per book
const indexCacheKey = `${book}:${resource}:${language}`;

// Check cache before building index
if (INDEX_CACHE.has(indexCacheKey)) {
  miniSearch = MiniSearch.loadJSON(cached.index, options);
} else {
  // Build and cache
  miniSearch = new MiniSearch(options);
  miniSearch.addAll(documents);
  INDEX_CACHE.set(indexCacheKey, { index: miniSearch.toJSON(), ... });
}
```

### Option 3: Limit Broad Search Scope

- Only search priority books when no reference provided
- Use the same PRIORITY_BOOKS list from search endpoint
- Would reduce from 49 books to 15-18 books

### Option 4: Redirect to /api/search

When `search` param is present without `reference`:

```typescript
if (search && !reference) {
  // Redirect or internally call /api/search
  return redirectToSearchEndpoint(search, language, organization);
}
```

## Conclusion

The fetch-scripture endpoint is **well-optimized for its primary use case** (fetching specific scripture references). The slow "search all books" scenario is an edge case that's better served by the `/api/search` endpoint, which we've already optimized.

**Recommendation**: Document that broad discovery searches should use `/api/search`, and keep fetch-scripture focused on its strength: fast, precise scripture retrieval.

---

_Analysis Date: November 25, 2025_
_Analyzed by: Nate Bargatze (apparently a performance engineer now)_
