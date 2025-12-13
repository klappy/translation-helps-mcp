# Filter Endpoint Performance Report (v7.20.7)

## Overview

This document outlines performance characteristics for the filter feature across all translation resource endpoints.

## Architecture Summary (v7.20.5+)

All filter operations now use **R2 DIRECT ACCESS** which:

1. Bypasses ZIP extraction and catalog lookups entirely
2. Fetches all resource files in **parallel** directly from R2 storage
3. Applies stemmed regex pattern to all content simultaneously
4. Returns results with statistics (by testament, book, and/or category)

### Stemmed Regex Matching

The filter generates a pattern from the search term:

- `love` → `/\b(love|loves|loved|loving|loveth|lovest)\b/gi`
- `faith` → `/\b(faith|faithful|faithfulness|faithless)\b/gi`

## Performance Comparison: R2 Direct vs Legacy

### Before (v7.20.0-7.20.4): Per-Book Sequential Fetch

| Scope         | Time      | Method                        |
| ------------- | --------- | ----------------------------- |
| Full resource | 15-30s    | Sequential per-book ZIP fetch |
| Testament     | 8-15s     | 39 or 27 sequential fetches   |
| Single book   | 200-500ms | Single ZIP extraction         |

### After (v7.20.5+): R2 Parallel Fetch

| Scope         | Time      | Method                        |
| ------------- | --------- | ----------------------------- |
| Full resource | 1-5s      | Parallel fetch all 66 files   |
| Testament     | 0.5-3s    | Parallel fetch 39 or 27 files |
| Single book   | 100-300ms | Single file fetch             |

**Speed improvement: 5-10x faster for full-resource searches**

## Expected Performance by Endpoint

### Translation Notes (`/fetch-translation-notes`)

| Scope             | R2 Direct | Fallback  | Notes                    |
| ----------------- | --------- | --------- | ------------------------ |
| Full resource     | 1-5s      | 15-30s    | 66 TSV files in parallel |
| Testament (OT/NT) | 0.5-3s    | 8-15s     | 39 or 27 files           |
| Single book       | 100-300ms | 200-500ms | Single file fetch        |

**Searchable fields:** `noteText`, `quote`

### Translation Questions (`/fetch-translation-questions`)

| Scope             | R2 Direct | Fallback  | Notes                    |
| ----------------- | --------- | --------- | ------------------------ |
| Full resource     | 1-5s      | 15-30s    | 66 TSV files in parallel |
| Testament (OT/NT) | 0.5-3s    | 8-15s     | 39 or 27 files           |
| Single book       | 100-300ms | 200-500ms | Single file fetch        |

**Searchable fields:** `question`, `response`

### Translation Word Links (`/fetch-translation-word-links`)

| Scope             | R2 Direct | Fallback | Notes                    |
| ----------------- | --------- | -------- | ------------------------ |
| Full resource     | 1-5s      | 15-30s   | 66 TSV files in parallel |
| Testament (OT/NT) | 0.5-3s    | 8-15s    | 39 or 27 files           |
| Category filter   | 1-5s      | 10-20s   | Post-filter by category  |

**Searchable fields:** `term`, `quote`

### Translation Words (`/fetch-translation-word`)

| Scope            | R2 Direct | Fallback | Notes               |
| ---------------- | --------- | -------- | ------------------- |
| Full resource    | 1-4s      | 10-20s   | ~350 markdown files |
| Category (kt)    | 0.5-2s    | 5-10s    | ~100 key terms      |
| Category (names) | 0.5-2s    | 5-10s    | ~200 proper names   |
| Category (other) | 0.3-1s    | 3-5s     | ~50 other terms     |

**Searchable fields:** `term`, `title`, `definition`, `content`

### Translation Academy (`/fetch-translation-academy`)

| Scope                    | R2 Direct | Fallback | Notes            |
| ------------------------ | --------- | -------- | ---------------- |
| Full resource            | 1-4s      | 10-20s   | ~250 modules     |
| Category (translate)     | 0.5-2s    | 5-10s    | ~150 modules     |
| Category (checking)      | 0.3-1.5s  | 3-6s     | ~50 modules      |
| Category (process/intro) | 0.2-0.5s  | 1-3s     | ~20 modules each |

**Searchable fields:** `moduleId`, `title`, `content`

## R2 Direct Access Architecture

### How It Works (v7.20.7+ - True Parallelism)

1. **R2 Bucket Access**: Endpoints access `event.platform.env.ZIP_FILES` directly
2. **List Operation**: Single list call to find all relevant files
3. **Parallel Fetch + Parse + Filter**: Each promise does ALL work:
   ```javascript
   const fetchPromises = files.map(async (file) => {
     const obj = await r2Bucket.get(file);     // I/O - async
     const text = await obj.text();             // I/O - async
     const rows = parseTSV(text);               // CPU - runs while other fetches in flight
     const matches = filterRows(rows, pattern); // CPU - interleaved with I/O
     return matches;
   });
   const results = await Promise.all(fetchPromises);
   ```
4. **Aggregation**: Simple concatenation of already-processed results
5. **Statistics**: Computed from aggregated matches

### Why This Matters

JavaScript is single-threaded, but I/O operations are non-blocking. The optimal pattern:

- **Before (v7.20.5-7.20.6)**: Fetch all → wait → parse all → filter all
  - All I/O completes first, then CPU blocks the event loop
  
- **After (v7.20.7)**: Fetch+parse+filter per file in same promise
  - When file 1's fetch completes, parse it while files 2-66 are still downloading
  - Event loop switches between I/O callbacks and CPU work
  - True interleaving of I/O and CPU operations

### File Structures in R2

| Resource   | R2 Path Pattern                                            | File Format |
| ---------- | ---------------------------------------------------------- | ----------- |
| Notes      | `by-url/.../en_tn/archive/v86.zip/files/tn_GEN.tsv`        | TSV         |
| Questions  | `by-url/.../en_tq/archive/v86.zip/files/tq_GEN.tsv`        | TSV         |
| Word Links | `by-url/.../en_twl/archive/v86.zip/files/twl_GEN.tsv`      | TSV         |
| Words      | `by-url/.../en_tw/archive/v86.zip/files/bible/kt/love.md`  | Markdown    |
| Academy    | `by-url/.../en_ta/archive/v86.zip/files/translate/*/01.md` | Markdown    |

### Fallback Behavior

When R2 is not available (local development without wrangler), endpoints fall back to:

- Sequential per-book/per-item fetching via `UnifiedResourceFetcher`
- ZIP extraction for each resource
- Slower but functionally identical results

The response includes `fetchMethod` to indicate which path was used:

- `r2-direct` - Fast parallel R2 access
- `per-book-fallback` / `per-word-fallback` / `per-module-fallback` - Slower fallback

## Performance Optimization Features

1. **Parallel R2 Fetching**: All files fetched simultaneously via `Promise.all()`
2. **Direct File Access**: No ZIP extraction or catalog lookups
3. **Stemmed Matching**: Pre-compiled regex for each search term
4. **Testament Filtering**: Only fetch 39 OT or 27 NT files when scoped
5. **Category Filtering**: Words/Academy can limit to specific categories

## Bottlenecks (Now Minimal)

1. **Network Latency**: R2 fetch still requires network calls (but parallelized)
2. **Large Result Sets**: High-frequency terms may return 1000+ matches
3. **Fallback Mode**: Without R2 access, performance degrades to legacy behavior

## Recommendations

For optimal performance:

1. **Use scoped searches**: `testament=ot` or `testament=nt` reduces file count
2. **Use category filters**: For words (`category=kt`) and academy (`category=translate`)
3. **Be specific**: More specific search terms yield faster, more relevant results
4. **Deploy to Cloudflare**: R2 direct access requires Cloudflare Pages deployment

## Testing Commands

```bash
# Fast - full resource with R2 direct access
curl "https://api.translation.helps/api/fetch-translation-notes?filter=love"

# Scoped - NT only
curl "https://api.translation.helps/api/fetch-translation-notes?filter=faith&testament=nt"

# Category-scoped word search
curl "https://api.translation.helps/api/fetch-translation-word?filter=grace&category=kt"

# Category-scoped academy search
curl "https://api.translation.helps/api/fetch-translation-academy?filter=metaphor&category=translate"

# Check fetch method in response
curl -s "https://api.translation.helps/api/fetch-translation-notes?filter=love" | jq '.searchScope.fetchMethod'
```

## Version History

- **v7.20.7**: True parallelism - interleaved I/O and CPU in same promise block
- **v7.20.6**: R2 direct access for Words, Academy, Questions, Word Links filters
- **v7.20.5**: R2 direct access for Notes filter (initial implementation)
- **v7.20.0**: Initial release of filter feature (per-book sequential fetch)
