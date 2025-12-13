# Filter Endpoint Performance Report (v7.20.0)

## Overview

This document outlines expected performance characteristics for the new filter feature across all translation resource endpoints.

## Architecture Summary

All filter operations use **stemmed regex matching** which:

1. Generates a pattern from the search term (e.g., "love" → `/\b(love|loves|loved|loving|loveth|lovest)\b/gi`)
2. Applies the pattern to searchable fields in each resource
3. Computes statistics (by testament, book, and/or category)
4. Returns results in JSON or markdown with YAML frontmatter

## Expected Performance by Endpoint

### Translation Notes (`/fetch-translation-notes`)

| Scope             | Expected Time | Notes                        |
| ----------------- | ------------- | ---------------------------- |
| Single reference  | 50-200ms      | Cache hit + single TSV parse |
| Single book       | 200-500ms     | ~50 chapters of TSV parsing  |
| Testament (OT/NT) | 2-8s          | 39 or 27 books               |
| Full resource     | 5-15s         | All 66 books                 |

**Searchable fields:** `noteText`, `quote`

### Translation Questions (`/fetch-translation-questions`)

| Scope             | Expected Time | Notes                        |
| ----------------- | ------------- | ---------------------------- |
| Single reference  | 50-200ms      | Cache hit + single TSV parse |
| Single book       | 200-500ms     | ~50 chapters                 |
| Testament (OT/NT) | 2-8s          | 39 or 27 books               |
| Full resource     | 5-15s         | All 66 books                 |

**Searchable fields:** `question`, `response`

### Translation Word Links (`/fetch-translation-word-links`)

| Scope                            | Expected Time | Notes                        |
| -------------------------------- | ------------- | ---------------------------- |
| Single reference                 | 50-200ms      | Cache hit + single TSV parse |
| Category filter (kt/names/other) | 3-10s         | Subset of all books          |
| Testament (OT/NT)                | 2-8s          | 39 or 27 books               |
| Full resource                    | 5-15s         | All 66 books                 |

**Searchable fields:** `term`, `quote`

### Translation Words (`/fetch-translation-word`)

| Scope            | Expected Time | Notes                      |
| ---------------- | ------------- | -------------------------- |
| Single word      | 100-300ms     | Single markdown file fetch |
| Category (kt)    | 2-5s          | ~100 key terms             |
| Category (names) | 3-8s          | ~200 proper names          |
| Category (other) | 1-3s          | ~50 other terms            |
| Full resource    | 5-15s         | All ~350 words             |

**Searchable fields:** `term`, `title`, `definition`, `content`

### Translation Academy (`/fetch-translation-academy`)

| Scope                    | Expected Time | Notes                |
| ------------------------ | ------------- | -------------------- |
| Single module            | 100-300ms     | Single markdown file |
| Category (translate)     | 3-8s          | ~150 modules         |
| Category (checking)      | 2-5s          | ~50 modules          |
| Category (process/intro) | 1-2s          | ~20 modules each     |
| Full resource            | 5-12s         | All ~250 modules     |

**Searchable fields:** `moduleId`, `title`, `content`

## Performance Optimization Features

1. **Batch Processing**: All endpoints fetch resources in batches of 5-10 concurrent requests
2. **ZIP Caching**: Resources are cached as ZIP files in R2/KV storage
3. **Stemmed Matching**: Regex is pre-compiled for each search term
4. **Early Termination**: Testament filters only process relevant books (39 OT or 27 NT)
5. **Category Filters**: Word/Academy filters can limit to specific categories

## Bottlenecks

1. **Cold Cache**: First request for a ZIP file requires download from DCS
2. **Full Resource Scans**: Searching all 66 books or all words/modules is inherently slow
3. **Large Result Sets**: High-frequency terms (e.g., "God", "Jesus", "lord") may return 1000+ matches

## Recommendations

For optimal performance:

1. **Use scoped searches**: Prefer `testament=ot` or `testament=nt` over full scans
2. **Use category filters**: For words (`category=kt`) and academy (`category=translate`)
3. **Be specific**: More specific search terms yield faster, more relevant results
4. **Cache warmup**: Initial requests are slower due to ZIP downloads

## Testing Commands

Run these locally with `npm run dev` to verify performance:

```bash
# Fast - single reference
curl "http://localhost:5173/api/fetch-translation-notes?reference=JHN%203:16&filter=believe"

# Medium - NT only
curl "http://localhost:5173/api/fetch-translation-notes?filter=faith&testament=nt"

# Slower - full resource
curl "http://localhost:5173/api/fetch-translation-notes?filter=metaphor"

# Category-scoped word search
curl "http://localhost:5173/api/fetch-translation-word?filter=love&category=kt"

# Category-scoped academy search
curl "http://localhost:5173/api/fetch-translation-academy?filter=metaphor&category=translate"
```

## Version History

- **v7.20.0**: Initial release of filter feature across all resource endpoints
