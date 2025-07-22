# Translation Helps MCP - Debugging Guide

Essential debugging patterns and quick fixes for the Translation Helps MCP server.

## 🚨 **DEBUGGING FIRST PRINCIPLES**

### The Golden Rule: Test Modularly

**DON'T** debug the entire pipeline at once. **DO** test each step individually.

```bash
# Step 1: Check DCS has the resource
curl "https://git.door43.org/api/v1/catalog/search?lang=en&owner=unfoldingWord" | jq '.data[] | select(.name | contains("twl"))'

# Step 2: Check resource has the book
curl "https://git.door43.org/api/v1/catalog/search?lang=en&owner=unfoldingWord&name=en_twl" | jq '.data[0].ingredients[] | select(.identifier == "tit")'

# Step 3: Check file downloads
curl "https://git.door43.org/unfoldingWord/en_twl/raw/branch/master/twl_TIT.tsv" | head -5

# Step 4: Check reference exists
curl "https://git.door43.org/unfoldingWord/en_twl/raw/branch/master/twl_TIT.tsv" | grep "^1:1" | wc -l
```

**If external APIs work, the problem is in code integration.**

## 🔧 **QUICK DIAGNOSTIC COMMANDS**

### Health Check

```bash
curl http://localhost:5173/api/health | jq .
```

### Test Core Endpoints

```bash
# Languages
curl "http://localhost:5173/api/get-languages?organization=unfoldingWord" | jq .

# Scripture
curl "http://localhost:5173/api/fetch-scripture?reference=John%203:16&language=en&organization=unfoldingWord" | jq .

# Resources (comprehensive)
curl "http://localhost:5173/api/fetch-resources?reference=John%203:16&language=en&organization=unfoldingWord" | jq .
```

### DCS Direct Testing

```bash
# Check if organization exists
curl "https://git.door43.org/api/v1/catalog/list/owners" | jq '.data[] | select(.login == "unfoldingWord")'

# Check available languages
curl "https://git.door43.org/api/v1/catalog/list/languages?owner=unfoldingWord" | jq '.data[]'

# Check specific resource
curl "https://git.door43.org/api/v1/catalog/search?metadataType=rc&lang=en&owner=unfoldingWord&subject=Bible" | jq '.data[] | select(.name | contains("ult"))'
```

### Cache Debugging

```bash
# Check cache status
curl "http://localhost:5173/api/health" | jq .cache

# Force cache bypass
curl "http://localhost:5173/api/fetch-scripture?reference=John%203:16&language=en&organization=unfoldingWord&bypassCache=true"
```

## 🐛 **COMMON ISSUES & FIXES**

### Issue 1: "No translation resources found"

**Symptoms:** 0 results for translation words/notes
**Root Cause:** Wrong resource name filtering
**Fix:** Check resource naming patterns

```bash
# Debug resource discovery
curl "https://git.door43.org/api/v1/catalog/search?lang=en&owner=unfoldingWord" | jq '.data[] | .name' | grep tw
```

**Common Fix:** Update resource name filters:

```typescript
// ❌ Wrong - too specific
name.endsWith("_twl")(
  // ✅ Right - includes variants
  name.endsWith("_twl") || name.includes("twl")
) && !name.includes("obs");
```

### Issue 2: File Not Found (404)

**Symptoms:** API returns empty results, 404 in logs
**Root Cause:** Incorrect file path construction
**Fix:** Always use ingredients array

```typescript
// ❌ Wrong - hardcoded paths
const filePath = `tn_${bookId}.tsv`;

// ✅ Right - use ingredients
const ingredient = resourceData.ingredients.find((ing) => ing.identifier === bookId);
const filePath = ingredient?.path || fallbackPath;
```

### Issue 3: USFM Contamination

**Symptoms:** Raw USFM markup in scripture text
**Root Cause:** Incomplete text extraction
**Fix:** Use proper USFM cleaning

```typescript
// ✅ Clean USFM properly
const cleanText = extractVerseText(usfmContent, chapter, verse)
  .replace(/\\[a-z]+\*/g, "") // Remove USFM markers
  .replace(/\s+/g, " ") // Normalize whitespace
  .trim();
```

### Issue 4: Slow Performance

**Symptoms:** >5s response times
**Root Causes & Fixes:**

1. **Missing Cache:** Implement 5-minute TTL caching
2. **Sequential Loading:** Use `Promise.all()` for parallel requests
3. **Large Payloads:** Load verse-specific data, not entire books
4. **Cold Starts:** Expect 1-2s initial latency on serverless

### Issue 5: CORS Errors

**Symptoms:** Browser requests fail
**Fix:** Ensure CORS headers on all responses:

```typescript
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
```

## 🔍 **DEBUGGING METHODOLOGY**

### 1. Reproduce Locally

```bash
npm run dev
# Test the exact failing scenario
```

### 2. Check Logs

```bash
# Enable debug logging
NODE_ENV=development npm run dev

# Check for specific errors
tail -f logs/*.log | grep ERROR
```

### 3. Isolate Components

```bash
# Test individual services
node -e "const service = require('./src/functions/scripture-service'); service.fetchScripture({...}).then(console.log)"
```

### 4. Compare with Working Examples

```bash
# Test with known working reference
curl "http://localhost:5173/api/fetch-scripture?reference=Genesis%201:1&language=en&organization=unfoldingWord"
```

## 🚀 **DEBUGGING BREAKTHROUGH PATTERNS**

### The TWL/TW Pipeline Fix (Epic Win)

**Problem:** 0 translation words, 0 word links
**Solution:** Modular testing revealed wrong resource selection

```typescript
// Root cause: Code selected wrong TWL resource
const wrongResource = data.find((r) => r.name.includes("obs-twl")); // OBS only
const rightResource = data.find((r) => r.name.endsWith("_twl") && !r.name.includes("obs")); // Bible
```

**Result:** 0 → 11 word links, 0 → 10 translation words ✅

### The Ingredients Array Discovery

**Problem:** Unpredictable file names causing 404s
**Solution:** Always use the ingredients array as source of truth

```typescript
// This pattern solves 90% of file path issues
const getResourceFile = (resourceData, bookId) => {
  const ingredient = resourceData.ingredients?.find((ing) => ing.identifier === bookId);
  return ingredient?.path?.replace("./", "") || `fallback_${bookId}.tsv`;
};
```

### The Performance Optimization Pattern

**Before:** 6+ second response times
**After:** <2 second response times

**Key Changes:**

1. Implemented request deduplication
2. Added 5-minute caching
3. Parallel resource loading
4. Verse-specific data fetching

## 📋 **DEBUG CHECKLIST**

When debugging issues:

- [ ] **Test external APIs first** (DCS catalog, resource files)
- [ ] **Check ingredients array** for correct file paths
- [ ] **Verify organization/language** case sensitivity
- [ ] **Test with known working references** (Genesis 1:1, John 3:16)
- [ ] **Check network logs** for 404s, timeouts
- [ ] **Validate USFM cleaning** for text contamination
- [ ] **Monitor performance** with browser dev tools
- [ ] **Test cache behavior** with bypass flags
- [ ] **Verify CORS headers** for browser requests
- [ ] **Check error boundaries** for graceful fallbacks

## 🎯 **SUCCESS METRICS**

You've successfully debugged when:

- **Response times:** <2s for resources, <1s for languages
- **Success rate:** >95% for valid references
- **Cache hit rate:** >80% for repeated requests
- **Error handling:** Graceful fallbacks for missing resources
- **Text quality:** Clean scripture without USFM markup

---

**Remember:** Most issues are either wrong resource selection or incorrect file path construction. Start with modular testing to isolate the problem quickly!
