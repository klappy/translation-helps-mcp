# Translation Helps Complete Guide - The Ultimate Reference

This document consolidates all critical wisdom from the translation-helps project into the definitive guide for MCP implementation.

## 🎯 THE UNIVERSAL TRUTHS

### 1. **INGREDIENTS ARRAY IS SACRED**

The #1 discovery that took WEEKS to figure out:

```javascript
// ❌ NEVER - Files have unpredictable names
const filePath = `tn_${bookId}.tsv`; // WRONG! Could be 01-GEN.tsv

// ✅ ALWAYS - Trust the ingredients
const ingredient = resourceData.ingredients.find(
  (ing) => ing.identifier === bookId,
);
const filePath = ingredient?.path || fallbackPath;
```

### 2. **SIMPLE SCALES, COMPLEX FAILS**

They evolved from complex to simple:

- Started with 246+ lines of manifest code → Deleted it all
- Complex Proskomma implementation → Simple USFM extraction
- Multi-file caching → Direct API calls
- Result: 90% performance improvement

### 3. **NO MANIFESTS - EVER**

```javascript
// ❌ NEVER use manifests
await fetchManifest(); // 3-9 second waste

// ✅ ALWAYS use catalog API
const resources = await catalogAPI.search({
  metadataType: "rc",
  subject: "Bible",
  lang: languageId,
});
```

### 4. **VERSE-LOADING PATTERN**

```javascript
// ❌ DON'T load entire book (420KB)
const bookContent = await fetchBook(bookId);

// ✅ DO load current verse only (10KB)
const verseContent = await fetchVerse(bookId, chapter, verse);
```

### 5. **CROSS-ORGANIZATION SUPPORT**

```javascript
// ❌ WRONG - Hardcoded organization
const url = `https://git.door43.org/unfoldingWord/${lang}_${resource}`;

// ✅ RIGHT - Dynamic organization
const url = `https://git.door43.org/${organization}/${lang}_${resource}`;
```

## 🎯 PERFORMANCE TARGETS

Your implementation MUST achieve:

- **Language loading**: < 1 second (was 4-9 seconds)
- **Resource loading**: < 2 seconds (was 6+ seconds)
- **Zero manifest.yaml requests** in network tab
- **Request deduplication** working (no duplicate API calls)

## 🚨 API QUIRKS & GOTCHAS

### DCS API Specifics

- Some endpoints return **422 if missing `metadataType=rc`**
- Empty results return `{"data": []}` not error
- **Organization names are case-sensitive**
- **Language codes must be lowercase**
- Books array may use different formats than expected

### Resource Availability

- **Not all books exist in all resources**
- Some organizations have partial translations
- Original language resources (Hebrew/Greek) need special handling
- **Always implement graceful fallbacks**

## 📚 COMPLETE PATTERN LIBRARY

### API Integration Patterns

#### DCS Catalog API - THE SOURCE OF TRUTH

```javascript
// Base URL for all catalog operations
const BASE_URL = "https://git.door43.org/api/v1/catalog";

// 1. List organizations
const orgs = await fetch(`${BASE_URL}/list/owners`);
// Response: { data: [{ login: "unfoldingWord", full_name: "unfoldingWord®" }] }

// 2. List languages for org
const langs = await fetch(`${BASE_URL}/list/languages?owner=${org}`);
// Response: { data: [{ lc: "en", ln: "English" }] }

// 3. List resources
const resources = await fetch(
  `${BASE_URL}/list/subjects?owner=${org}&lang=${lang}`,
);
// Response: { data: ["Translation Notes", "Translation Questions"] }

// 4. Search with metadata (THE KEY API)
const results = await fetch(
  `${BASE_URL}/search?metadataType=rc&lang=${lang}&subject=Bible`,
);
// Response includes ingredients array!
```

### USFM Text Extraction - UNIFIED APPROACH

```javascript
// ❌ NEVER - Browser-specific extraction
element.innerText; // Unreliable CSS hiding
getComputedStyle(); // Environment inconsistent

// ✅ ALWAYS - Unified server-side extraction
import { extractVerseText, extractChapterText } from "./usfmTextExtractor";

// Works identically in browser, server, and tests
const verseText = extractVerseText(usfmContent, chapter, verse);
const chapterText = extractChapterText(usfmContent, chapter);

// CRITICAL: Always validate
if (!validateCleanText(verseText)) {
  throw new Error("USFM contamination detected!");
}
```

### Resource-Specific Patterns

#### Translation Notes (TN)

```javascript
// File format: Always TSV with specific columns
const parseTN = (tsvContent) => {
  return parseTSV(tsvContent, {
    columns: [
      "Reference",
      "ID",
      "Tags",
      "SupportReference",
      "Quote",
      "Occurrence",
      "Note",
    ],
  });
};

// Filter by verse
const notes = allNotes.filter(
  (note) => note.Reference === `${chapter}:${verse}`,
);
```

#### Translation Questions (TQ)

```javascript
// File format: TSV with Reference, ID, Tags, Quote, Occurrence, Question, Response
const parseTQ = (tsvContent) => {
  return parseTSV(tsvContent, {
    columns: [
      "Reference",
      "ID",
      "Tags",
      "Quote",
      "Occurrence",
      "Question",
      "Response",
    ],
  });
};
```

#### Translation Words (TW)

```javascript
// ❌ NEVER hardcode article paths
const articlePath = `bible/kt/${word}.md`;

// ✅ ALWAYS parse from rc:// links
const rcLink = "rc://en/tw/dict/bible/kt/faith";
const article = await fetchTWArticle(rcLink);
```

#### Translation Word Links (TWL)

```javascript
// TWL provides rc:// links for words in verses
const links = twlData.filter(
  (link) => link.Reference === `${chapter}:${verse}`,
);
// Each link has: Reference, TWLink (rc:// URI)
```

### Caching Strategy

```javascript
// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCached = (key) => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};
```

### Error Handling Patterns

```javascript
// Always provide fallbacks
const fetchWithFallback = async (url, fallbackData) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return fallbackData;
    }
    return await response.json();
  } catch (error) {
    console.error(`Network error fetching ${url}:`, error);
    return fallbackData;
  }
};

// Graceful degradation
const loadResource = async (resourceId) => {
  const cached = getCached(resourceId);
  if (cached) return cached;

  try {
    const data = await fetchResource(resourceId);
    setCached(resourceId, data);
    return data;
  } catch (error) {
    console.warn(`Failed to load ${resourceId}, using empty fallback`);
    return { items: [] };
  }
};
```

## 🧪 TESTING INSIGHTS

### What Works

- **Direct API testing with curl first** - Validate endpoints before code
- **Mock the catalog service, not individual endpoints** - Test at the right level
- **Test with real organizations** (unfoldingWord, Wycliffe) - Don't just use mock data
- **Always test error paths** - Network failures, missing resources

### Common Test Failures

- ~~**Hardcoded expectations about file names**~~ - ✅ **Fixed in v4.4.3** - Now uses dynamic catalog discovery
- **Assuming all resources exist** - Some books missing in some languages
- **Not handling partial results** - API may return incomplete data
- **Race conditions in parallel loading** - Use proper Promise handling

> **v4.4.3 Update**: The system now uses the catalog API and ingredients pattern to dynamically discover resource files, eliminating hardcoded file name assumptions that previously caused test failures.

## 🚀 DEPLOYMENT CONSIDERATIONS

### Platform Specifics

- **Cold starts affect first request** (~1-2s) - Expect initial latency
- **Memory persists between invocations** - Use for cache optimization
- **10s function timeout** - Batch operations carefully
- **Environment variables not needed** - All APIs are public

### Branch Strategy

- `master` → Development
- `staging` → Testing
- `production` → Live site
- Use platform branch deploys for testing

## 🔗 RC LINKS SPECIFICATION

### URI Structure

```
rc://<language>/<resource>/<version>/<path>
```

### Components

- **language**: ISO 639-1 code (`en`, `es`) or `*` for current context
- **resource**: Resource ID (`ult`, `tn`, `tw`, `ta`, `tq`, `twl`)
- **version**: Version ID (`master`, `latest`, or specific)
- **path**: Resource-specific path

### Supported Namespaces

```javascript
// Scripture
rc://en/ult/gen/01/01          // Genesis 1:1
rc://*/ult/mat/05/03-12        // Dynamic language

// Translation Notes
rc://en/tn/help/gen/01/01      // Notes for Genesis 1:1

// Translation Words
rc://en/tw/dict/bible/kt/create    // Key term
rc://en/tw/dict/bible/names/paul   // Person name
rc://*/tw/dict/bible/kt/faith      // Dynamic language

// Translation Academy
rc://en/ta/man/translate/translate-names
rc://*/ta/man/translate/figs-metaphor

// Translation Questions
rc://en/tq/gen/01              // Questions for Genesis 1

// Translation Word List
rc://en/twl/gen                // TWL for Genesis
```

## 🚨 CRITICAL WARNINGS

### Things That Will Break Everything

1. **Using manifests** - Adds 3-9 seconds of latency
2. **Hardcoding file paths** - Files have unpredictable names
3. **Loading entire books** - 420KB vs 10KB for single verse
4. **Browser-specific code** - Breaks in tests and server
5. **Ignoring ingredients array** - The source of truth
6. **Working on wrong branch** - Always use feature branches
7. **Missing error boundaries** - Graceful degradation required

### Common Pitfalls

1. **Forgetting to encode URLs**: Always use `encodeURIComponent()`
2. **Not handling 404s**: Resources might not exist for all books
3. **Assuming file patterns**: Always check ingredients array
4. **Sequential loading**: Use Promise.all() for parallel fetching
5. **Skipping git workflow**: Process discipline matters
6. **Complex lifecycles**: Use simple verse-loading pattern

## 📋 IMPLEMENTATION CHECKLIST

When implementing any feature:

- [ ] Git status verified (feature branch)
- [ ] Check ingredients array for file paths
- [ ] Use catalog API, not manifests
- [ ] Load only needed data (verse, not book)
- [ ] Handle cross-organization resources
- [ ] Implement proper caching
- [ ] Add error handling with fallbacks
- [ ] Test in all environments
- [ ] Validate output (no USFM contamination)
- [ ] Load resources in parallel
- [ ] Meet performance targets (< 1s languages, < 2s resources)
- [ ] Handle API quirks (422 errors, case sensitivity)
- [ ] Test with real organizations and error conditions
- [ ] Follow deployment best practices

## 🎓 KEY LESSONS

1. **Simple always wins** - They deleted 246 lines of complex code
2. **Trust the API** - Catalog API has everything you need
3. **Cache aggressively** - 90% performance improvement possible
4. **Fail gracefully** - Always have fallbacks
5. **Test everything** - Especially environment consistency
6. **Document discoveries** - Save weeks of debugging for others
7. **Performance matters** - Specific targets must be met
8. **API quirks exist** - Know the edge cases

---

**Remember**: Every pattern here was discovered through weeks of debugging. Don't repeat history - follow these patterns exactly!
