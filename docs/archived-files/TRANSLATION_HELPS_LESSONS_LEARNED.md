# Translation Helps Project - Lessons Learned

This document summarizes all critical lessons learned from the translation-helps project that must be applied to our MCP server implementation.

## 🚨 Critical Implementation Discoveries

### 1. File Path Resolution - The #1 Gotcha

**Problem**: File names are NOT predictable!

- ❌ **Wrong assumption**: `tn_GEN.tsv`, `tq_EXO.tsv`
- ✅ **Reality**: Files use numbered prefixes like `57-TIT.usfm`, `01-GEN.tsv`

**Solution**: ALWAYS use the `ingredients` array from resource metadata

```javascript
// NEVER hardcode file paths!
const filePath = `tn_${bookId.toUpperCase()}.tsv`; // ❌ WRONG

// ALWAYS use ingredients
const ingredient = resourceData.ingredients.find((ing) => ing.identifier === bookId);
const filePath = ingredient?.path || fallbackPath; // ✅ CORRECT
```

**Lesson**: The catalog API knows the truth. Trust the ingredients array!

### 2. Performance - 90% Improvement Is Possible

**Problem**: Initial implementation had 4-9 second load times

- Multiple manifest.yaml requests
- Inefficient API usage
- Race conditions

**Solution**: Direct API usage with proper endpoints

```javascript
// ❌ OLD: Multiple calls + manifest loading
fetchAllLanguages() → search API (1000+ resources) → parse each
Time: 4,000-9,000ms

// ✅ NEW: Direct endpoint
https://git.door43.org/api/v1/catalog/list/languages?stage=prod&subject=Bible
Time: ~500ms (90% improvement)
```

**Key Optimizations**:

- Use specific catalog endpoints, not generic search
- Implement request deduplication
- Multi-level caching with different TTLs
- Parallel loading where safe

### 3. Manifest Elimination Journey

**Discovery**: The team built complex manifest loading, then found it was unnecessary!

- The catalog API already contains ALL needed data
- `ingredients` array has actual file paths
- No need for manifest.yaml files

**Lesson**: Thoroughly validate API responses before building complex solutions

### 4. USFM Text Extraction Complexity

**Problem**: Simple regex doesn't work for USFM

- Verse bridges: `\v 4-5`
- Chapter intros: `1:intro`
- Book intros: `front:intro`
- Complex alignment markers

**Solution**: Unified server-side extraction

```javascript
// Remove ALL these patterns
text = text.replace(/\\zaln-s[^\\]*\\zaln-e\*/g, "");
text = text.replace(/\\w\s+([^|\\]*)\|[^\\]*\\w\*/g, "$1");
// ... many more patterns
```

**Lesson**: Browser-based extraction (`innerText`) is unreliable. Use server-side regex.

### 5. TSV Resource Structure Variations

**Problem**: Each resource type has different TSV columns

**Translation Notes**:

- Columns: `Reference`, `ID`, `Tags`, `Quote`, `Note`, `Occurrence`

**Translation Questions**:

- Columns: `Reference`, `ID`, `Tags`, `Quote`, `Question`, `Response`

**Translation Words**:

- Different format entirely (Markdown files)

**Lesson**: Build type-specific parsers for each resource

### 6. Book Code Mapping Complexity

**Problem**: Multiple book code formats

- API uses: `gen`, `exo`, `tit`
- Files use: `GEN`, `EXO`, `TIT`
- Display needs: `Genesis`, `Exodus`, `Titus`
- Special cases: `1sa`, `2co` (books with numbers)

**Solution**: Comprehensive mapping system with all variations

### 7. Cross-Organization Resource Discovery

**Problem**: Users want resources from multiple organizations

- Bible from unfoldingWord
- Notes from Wycliffe
- Questions from another org

**Solution**: Advanced mode with mixed resource support

- Language-first navigation
- Organization attribution on each resource
- Compatibility warnings

### 8. Error Handling Patterns

**Critical Principle**: Fallback at every level

```javascript
// Hierarchy of fallbacks
try {
  // 1. Try ingredients array
  const ingredient = resourceData.ingredients.find(...);
  if (ingredient) return ingredient.path;

  // 2. Try standard naming
  const standardPath = `${type}_${bookId.toUpperCase()}.tsv`;
  if (await checkExists(standardPath)) return standardPath;

  // 3. Try legacy patterns
  const legacyPath = await tryLegacyPatterns(bookId, type);
  if (legacyPath) return legacyPath;

  // 4. Use stale cache if available
  const cached = getStaleCache(key);
  if (cached) return cached;

  // 5. Clear error message
  throw new Error(`Resource not found: ${type} for ${bookId}`);
} catch (error) {
  // Log for debugging but don't crash
  console.error('Resource fetch failed:', error);
  return null; // Partial results better than no results
}
```

### 9. Caching Strategy Details

**Multi-Level Cache Architecture**:

```javascript
// Different TTLs for different data types
const organizationCache = new Cache(3600000); // 1 hour - rarely changes
const languageCache = new Cache(3600000); // 1 hour - stable
const resourceCache = new Cache(300000); // 5 minutes - may update
const fileCache = new Cache(600000); // 10 minutes - content

// Request deduplication is CRITICAL
const pendingRequests = new Map();
if (pendingRequests.has(key)) {
  return pendingRequests.get(key); // Don't make duplicate requests!
}
```

### 10. API Quirks and Edge Cases

**DCS API Specifics**:

- Some endpoints return 422 if missing `metadataType=rc`
- Empty results return `{"data": []}` not error
- Organization names are case-sensitive
- Language codes must be lowercase

**Resource Availability**:

- Not all books exist in all resources
- Some organizations have partial translations
- Original language resources (Hebrew/Greek) have special handling

### 11. Testing Insights

**What Works**:

- Direct API testing with curl first
- Mock the catalog service, not individual endpoints
- Test with real organizations (unfoldingWord, Wycliffe)
- Always test error paths

**Common Test Failures**:

- Hardcoded expectations about file names
- Assuming all resources exist
- Not handling partial results
- Race conditions in parallel loading

### 12. Deployment Considerations

**Netlify Specifics**:

- Cold starts affect first request (~1-2s)
- Memory persists between invocations (use for cache)
- 10s function timeout (batch operations carefully)
- Environment variables not needed (all public APIs)

**Branch Strategy**:

- `master` → Development
- `staging` → Testing
- `production` → Live site
- Use Netlify's branch deploys for testing

## 📋 Implementation Checklist

Based on these lessons, here's what MUST be implemented:

1. **Ingredients-based file resolution** ← Top priority!
2. **Multi-level caching with request dedup**
3. **Comprehensive error handling with fallbacks**
4. **USFM extraction with verse bridge support**
5. **Resource-specific TSV parsers**
6. **Book code mapping system**
7. **Direct API usage (no manifests!)**
8. **Performance monitoring from day 1**

## 🎯 Success Metrics

Your implementation is correct when:

- ✅ Zero hardcoded file paths
- ✅ All resources load in < 2 seconds
- ✅ Graceful handling of missing resources
- ✅ Clean text extraction for LLMs
- ✅ Works with multiple organizations
- ✅ Handles verse bridges correctly

## 💡 Final Wisdom

"The catalog API knows the truth. Trust the ingredients array!"

This mantra saved the translation-helps team weeks of debugging. The API already provides everything needed - the challenge is discovering and properly using what's already there.
