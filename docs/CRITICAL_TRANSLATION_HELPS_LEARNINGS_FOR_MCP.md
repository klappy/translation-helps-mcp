# Critical Translation Helps Learnings for MCP Server

This document distills ALL critical lessons from the translation-helps project that MUST be applied to our MCP server implementation. These are hard-won discoveries that took weeks to figure out - ignore them at your peril!

## 🔥 THE GOLDEN RULES (NEVER VIOLATE)

### 1. **TRUST THE INGREDIENTS ARRAY**

```javascript
// ❌ NEVER DO THIS - File names are NOT predictable!
const filePath = `tn_${bookId.toUpperCase()}.tsv`; // WRONG!

// ✅ ALWAYS DO THIS - Use the ingredients array
const ingredient = resourceData.ingredients.find((ing) => ing.identifier === bookId);
const filePath = ingredient?.path || fallbackPath;
```

**Why**: Files use unpredictable prefixes like `57-TIT.usfm`, not `TIT.usfm`

### 2. **NO MANIFEST.YAML FILES - EVER**

The catalog API already contains EVERYTHING you need:

- `books` array - which books are available
- `ingredients` array - actual file paths with correct prefixes
- `title`, `version` - resource metadata

**Manifest loading added 3-9 seconds of load time for NO benefit!**

### 3. **USE DIRECT API ENDPOINTS**

```javascript
// ❌ WRONG - Generic search endpoint (4-9 seconds)
/api/v1/catalog/search?limit=1000

// ✅ RIGHT - Specific language endpoint (500ms)
/api/v1/catalog/list/languages?stage=prod&subject=Bible
```

## 📋 IMPLEMENTATION CHECKLIST

### File Path Resolution (CRITICAL!)

- [ ] NEVER hardcode file paths
- [ ] ALWAYS use ingredients array from resource metadata
- [ ] Implement fallback patterns for edge cases
- [ ] Test with real organizations (not assumptions)

### API Usage Patterns

- [ ] Use specific catalog endpoints, not generic search
- [ ] Implement request deduplication (prevent duplicate calls)
- [ ] Multi-level caching with different TTLs:
  - Organizations: 1 hour
  - Languages: 1 hour
  - Resources: 5 minutes
  - File content: 10 minutes

### USFM Text Extraction

- [ ] Handle verse bridges: `\v 4-5`
- [ ] Handle chapter intros: `1:intro`
- [ ] Handle book intros: `front:intro`
- [ ] Remove ALL alignment markers server-side
- [ ] Use comprehensive regex patterns (see below)

### TSV Resource Variations

- [ ] Translation Notes: `Reference`, `ID`, `Tags`, `Quote`, `Note`, `Occurrence`
- [ ] Translation Questions: `Reference`, `ID`, `Tags`, `Quote`, `Question`, `Response`
- [ ] Translation Words: Different format (Markdown files)
- [ ] Build type-specific parsers for each

### Cross-Organization Support

- [ ] Pass organization context through entire stack
- [ ] Clear organization context on language change
- [ ] Use effective organization for all API calls
- [ ] Handle mixed organization resources

## 🎯 PERFORMANCE TARGETS

Your implementation MUST achieve:

- Language loading: < 1 second (was 4-9 seconds)
- Resource loading: < 2 seconds (was 6+ seconds)
- Zero manifest.yaml requests in network tab
- Request deduplication working (no duplicate API calls)

## 🚨 API QUIRKS & GOTCHAS

### DCS API Specifics

- Some endpoints return 422 if missing `metadataType=rc`
- Empty results return `{"data": []}` not error
- Organization names are case-sensitive
- Language codes must be lowercase
- Books array may use different formats than expected

### Resource Availability

- Not all books exist in all resources
- Some organizations have partial translations
- Original language resources (Hebrew/Greek) need special handling
- Always implement graceful fallbacks

## 💡 CRITICAL CODE PATTERNS

### Ingredients-Based File Resolution

```javascript
async function getResourceFile(resourceData, bookId, resourceType) {
  // 1. Try ingredients array first
  const ingredient = resourceData.ingredients?.find((ing) => ing.identifier === bookId);
  if (ingredient?.path) {
    return ingredient.path.replace("./", "");
  }

  // 2. Try standard naming pattern
  const standardPath = `${resourceType}_${bookId.toUpperCase()}.tsv`;
  if (await checkExists(standardPath)) {
    return standardPath;
  }

  // 3. Try numbered prefix patterns
  const bookNumber = getBookNumber(bookId); // e.g., '57' for Titus
  const numberedPath = `${bookNumber}-${bookId.toUpperCase()}.${ext}`;
  if (await checkExists(numberedPath)) {
    return numberedPath;
  }

  // 4. Return null for graceful handling
  return null;
}
```

### Request Deduplication

```javascript
const pendingRequests = new Map();

async function fetchWithDedup(key, fetcher) {
  // Check if request already in flight
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Create new request
  const promise = fetcher();
  pendingRequests.set(key, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(key);
  }
}
```

### USFM Text Extraction

```javascript
function extractCleanText(usfmText) {
  let text = usfmText;

  // Remove all these patterns IN ORDER
  text = text.replace(/\\zaln-s[^\\]*\\zaln-e\*/g, "");
  text = text.replace(/\\w\s+([^|\\]*)\|[^\\]*\\w\*/g, "$1");
  text = text.replace(/\\k-s[^\\]*\\k-e\*/g, "");
  text = text.replace(/\\\+?[\w\d]+\*?\s*/g, "");
  text = text.replace(/\\[\w\d]+\s*/g, "");

  // Handle verse bridges
  text = text.replace(/(\d+)-(\d+)/g, (match, start, end) => {
    // Expand verse range: "4-5" becomes "4, 5"
    const verses = [];
    for (let i = parseInt(start); i <= parseInt(end); i++) {
      verses.push(i);
    }
    return verses.join(", ");
  });

  return text.trim();
}
```

### Error Handling Hierarchy

```javascript
try {
  // 1. Primary method
  const result = await primaryMethod();
  if (result) return result;

  // 2. Fallback method
  const fallback = await fallbackMethod();
  if (fallback) return fallback;

  // 3. Check stale cache
  const cached = getStaleCache(key);
  if (cached) {
    console.warn("Using stale cache for:", key);
    return cached;
  }

  // 4. Return partial results
  return { partial: true, data: null, error: "Resource not found" };
} catch (error) {
  // Log but don't crash
  console.error("Resource fetch failed:", error);
  return { partial: true, data: null, error: error.message };
}
```

## 🎪 THE BIG PICTURE

The translation-helps team spent WEEKS discovering these patterns:

1. **File paths are unpredictable** - Always use ingredients
2. **Manifests are unnecessary** - Catalog API has everything
3. **Performance matters** - 90% improvement is possible
4. **Organizations are complex** - Handle cross-org properly
5. **Errors are inevitable** - Graceful fallbacks everywhere
6. **Caching is critical** - Multi-level with deduplication
7. **USFM is messy** - Comprehensive regex required
8. **TSV formats vary** - Type-specific parsers needed

## ✅ SUCCESS CRITERIA

Your MCP server is correct when:

- Zero hardcoded file paths
- All resources load in < 2 seconds
- Graceful handling of missing resources
- Clean text extraction for LLMs
- Works with multiple organizations
- Handles verse bridges correctly
- No manifest.yaml requests
- Request deduplication working

## 🚀 NEXT STEPS

1. Review our current implementation against this checklist
2. Fix file path resolution to use ingredients
3. Remove any manifest loading code
4. Implement proper caching with deduplication
5. Add comprehensive error handling
6. Test with real organizations (not just unfoldingWord)

Remember: **"The catalog API knows the truth. Trust the ingredients array!"**
