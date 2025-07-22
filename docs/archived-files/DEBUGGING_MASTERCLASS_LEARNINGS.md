# Debugging Masterclass: TWL/TW Pipeline Fixes

**Date**: July 17, 2025  
**Context**: Translation-helps-mcp project - fixing 0 word links and 0 translation words  
**Result**: ✅ Fixed! Now getting 11 word links and 10 translation words

## 🏆 KEY BREAKTHROUGH: Modular Testing Strategy

### THE PROBLEM WITH MONOLITHIC DEBUGGING

- Trying to debug the entire pipeline at once was a disaster
- Server caching masked code changes
- Complex dependency chains hid the actual failure point
- Error messages were vague and unhelpful

### THE SOLUTION: Test Each Step Individually

Instead of debugging the whole system, break it into discrete, testable steps:

```javascript
// Step 1: DCS Catalog Check
curl "https://git.door43.org/api/v1/catalog/search?lang=en&owner=unfoldingword" | jq '.data[] | select(.name | contains("twl"))'

// Step 2: Resource Ingredients
curl "..." | jq '.data[] | select(.name == "en_twl") | .ingredients[] | select(.identifier == "tit")'

// Step 3: File Download
curl "https://git.door43.org/unfoldingword/en_twl/raw/branch/master/twl_TIT.tsv" | head -5

// Step 4: Reference Filtering
curl "..." | grep "^1:1" | wc -l

// Step 5: RC Link Extraction
curl "..." | grep "^1:1" | cut -f6

// Step 6: Word Article Fetch
curl "https://git.door43.org/unfoldingword/en_tw/raw/branch/master/bible/names/paul.md"
```

**EVERY STEP WORKED PERFECTLY IN ISOLATION!** This immediately told us the problem was in code integration, not external APIs.

## 🐛 ROOT CAUSE IDENTIFIED

### The Smoking Gun

The code was finding `en_obs-twl` (Open Bible Stories Translation Word Links) instead of `en_twl` (Bible Translation Word Links).

**Why this failed:**

- OBS repository only has `twl_OBS.tsv` for Open Bible Stories
- Bible repository has `twl_TIT.tsv`, `twl_GEN.tsv`, etc. for Bible books
- Code tried to fetch `twl_TIT.tsv` from OBS repo → 404 error
- Result: 0 word links, 0 translation words

### The Fix

```typescript
case "links":
  matches =
    (name.endsWith("_twl") ||
    subject.includes("translation word links") ||
    subject.includes("translation words links") ||
    subject.includes("tsv translation word links") ||
    subject.includes("tsv translation words links")) &&
    !subject.includes("obs"); // 🎯 EXCLUDE OBS resources!
```

**Key insight**: Resource matching logic must distinguish between Bible and OBS resources.

## 📊 BEFORE vs AFTER

### Before Fix

```json
{
  "resourcesFound": {
    "scripture": true,
    "notes": 4,
    "questions": 1,
    "words": 0, // ❌ FAILED
    "links": 0 // ❌ FAILED
  }
}
```

### After Fix

```json
{
  "resourcesFound": {
    "scripture": true,
    "notes": 4,
    "questions": 1,
    "words": 10, // ✅ SUCCESS!
    "links": 11 // ✅ SUCCESS!
  }
}
```

## 🔍 DETAILED PIPELINE ANALYSIS

### TWL (Translation Word Links) Process

1. **Resource Discovery**: Find `en_twl` resource in DCS catalog
2. **Ingredients Check**: Verify `twl_TIT.tsv` exists in resource ingredients
3. **File Download**: Fetch `https://git.door43.org/unfoldingword/en_twl/raw/branch/master/twl_TIT.tsv`
4. **TSV Parsing**: Parse tab-separated values with headers: `Reference	ID	Tags	OrigWords	Occurrence	TWLink`
5. **Reference Filtering**: Filter rows where Reference column matches "1:1"
6. **RC Link Extraction**: Extract TWLink column values (rc:// URIs)

**Example TWL Entry:**

```
Reference: "1:1"
TWLink: "rc://*/tw/dict/bible/names/paul"
```

### TW (Translation Words) Process

1. **Get TWL Links**: First run TWL process to get RC links
2. **RC URI Conversion**: Convert `rc://*/tw/dict/bible/names/paul` → `https://git.door43.org/unfoldingWord/en_tw/raw/branch/master/bible/names/paul.md`
3. **Article Fetch**: Download markdown article from DCS
4. **Content Parsing**: Extract title, subtitle, and content from markdown

**Example TW Article:**

```markdown
# Paul, Saul

## Definition:

Paul was a leader of the early Christian church...
```

## 🎯 CRITICAL SUCCESS FACTORS

### 1. External Testing First

- Always test external APIs manually before debugging code
- Use curl/jq to verify data availability and structure
- Confirms if the problem is "us" or "them"

### 2. Dependency Chain Isolation

- Break complex processes into discrete, testable steps
- Each step should be verifiable independently
- Don't move to next step until current step is proven

### 3. Cache Awareness

- Modern development has multiple cache layers (browser, CDN, server, code, etc.)
- Cache invalidation is one of the two hard problems in computer science
- Use cache-busting parameters: `?nocache=${timestamp}`
- Restart servers aggressively when code changes aren't reflected

### 4. Resource Type Disambiguation

- DCS has multiple resource types with similar names
- Bible resources vs OBS resources require different handling
- Always verify you're getting the intended resource type

## 🧪 TESTING PATTERNS ESTABLISHED

### Direct API Testing Script

```javascript
// test-twl-direct.cjs - bypass all caching and server complexity
const https = require("https");

async function testPipeline() {
  // Test each step in isolation
  const catalog = await fetchCatalog();
  const resource = findTWLResource(catalog);
  const ingredients = getIngredients(resource);
  const file = await downloadFile(ingredients.path);
  const parsed = parseTSV(file);
  const filtered = filterByReference(parsed, "1:1");
  const rcLinks = extractRCLinks(filtered);
  const articles = await fetchTWArticles(rcLinks);

  console.log(`✅ Pipeline complete: ${articles.length} articles`);
}
```

### Modular Debugging Approach

1. **Test external dependencies** (DCS APIs, file availability)
2. **Test data parsing** (TSV structure, column headers)
3. **Test filtering logic** (reference matching, data extraction)
4. **Test integration** (how pieces fit together)
5. **Test final output** (response structure, data completeness)

## 🚀 PERFORMANCE INSIGHTS

### Original Implementation Issues

- Fetching 11 TW articles sequentially = slow
- No timeout handling = functions timing out
- No error resilience = one failure breaks everything

### Optimizations Applied

- Parallel article fetching with `Promise.all()`
- Timeout handling for external requests
- Graceful degradation when some articles fail
- Caching at multiple levels

## 📚 KNOWLEDGE CRYSTALLIZED

### About DCS API Structure

- Resources are organized by language/organization
- Each resource has ingredients (file list)
- Files follow predictable naming: `{type}_{BOOK}.tsv`
- Multiple resource types for same content (Bible vs OBS)

### About TWL/TW Relationship

- TWL provides the "index" of word links for each verse
- TW provides the actual article content
- **TW depends on TWL** - you can't fetch TW directly
- This is a two-step process, not parallel processes

### About USFM vs Clean Text

- Raw USFM has alignment markers: `\w Paul|x-occurrence="1"\w*`
- Clean text removes markers: `Paul`
- Cleaning must handle complex nested structures
- Different cleaning for different use cases

## 🎓 DEBUGGING PRINCIPLES LEARNED

1. **Modular Testing Beats Monolithic Debugging**
2. **External APIs First, Code Logic Second**
3. **Cache Invalidation Is Your Enemy**
4. **Resource Type Disambiguation Matters**
5. **Dependency Chains Must Be Tested Step-by-Step**
6. **Parallel Processing Requires Error Handling**
7. **Debug Logging Must Actually Appear (watch for caching!)**

## 🏁 FINAL RESULT

✅ **11 Translation Word Links** for Titus 1:1  
✅ **10 Translation Words** with full article content  
✅ **Modular, testable codebase** following ../translation-helps patterns  
✅ **Comprehensive debugging methodology** for future issues

**Time to fix**: ~3 hours of debugging  
**Key insight**: The bug was in a 3-line resource matching filter  
**Lesson**: Sometimes the smallest changes have the biggest impact!
