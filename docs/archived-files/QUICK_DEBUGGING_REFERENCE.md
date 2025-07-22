# Quick Debugging Reference - Translation Helps MCP

## 🚨 FIRST PRINCIPLES: MODULAR TESTING

When debugging complex pipelines like TWL/TW:

### 1. DON'T debug the whole system at once!

### 2. Test each step individually with curl/jq

### 3. Only move to code debugging after external APIs are proven

## 🔧 QUICK DIAGNOSTIC COMMANDS

### Check if DCS has the resource:

```bash
curl "https://git.door43.org/api/v1/catalog/search?lang=en&owner=unfoldingword" | jq '.data[] | select(.name | contains("twl"))'
```

### Check if resource has the book:

```bash
curl "https://git.door43.org/api/v1/catalog/search?lang=en&owner=unfoldingword&name=en_twl" | jq '.data[0].ingredients[] | select(.identifier == "tit")'
```

### Check if file downloads:

```bash
curl "https://git.door43.org/unfoldingword/en_twl/raw/branch/master/twl_TIT.tsv" | head -5
```

### Check if reference exists in file:

```bash
curl "https://git.door43.org/unfoldingword/en_twl/raw/branch/master/twl_TIT.tsv" | grep "^1:1" | wc -l
```

### Check if RC links are extractable:

```bash
curl "https://git.door43.org/unfoldingword/en_twl/raw/branch/master/twl_TIT.tsv" | grep "^1:1" | cut -f6
```

### Check if TW article downloads:

```bash
curl "https://git.door43.org/unfoldingword/en_tw/raw/branch/master/bible/names/paul.md" | head -5
```

## 💡 COMMON ISSUES & QUICK FIXES

### ❌ Getting 0 word links/words

**Most Likely Cause**: Resource type confusion (Bible vs OBS)

**Quick Check**: Look for "obs" in resource names/subjects

```bash
curl "http://localhost:8888/.netlify/functions/fetch-resources?reference=Titus%201:1&resourceTypes=wordLinks" | grep -i obs
```

**Fix**: Add OBS exclusion to resource matching:

```typescript
!subject.includes("obs"); // EXCLUDE OBS resources
```

### ❌ Debug output not showing

**Most Likely Cause**: Server caching old code

**Nuclear Option**:

```bash
pkill -9 node && rm -rf dist && npm run build && netlify dev
```

### ❌ Function timing out

**Most Likely Cause**: Sequential API calls instead of parallel

**Fix**: Use `Promise.all()` for independent operations

```typescript
const results = await Promise.all([
  fetchTWArticle(link1),
  fetchTWArticle(link2),
  fetchTWArticle(link3),
]);
```

## 🎯 RESOURCE TYPE PATTERNS

### Bible Resources (What we want):

- `en_twl` (Bible Translation Word Links)
- `en_tw` (Bible Translation Words)
- `en_tn` (Bible Translation Notes)
- `en_tq` (Bible Translation Questions)

### OBS Resources (What to exclude):

- `en_obs-twl` (OBS Translation Word Links)
- `en_obs-tn` (OBS Translation Notes)
- `en_obs-tq` (OBS Translation Questions)

## 🚀 PERFORMANCE GOTCHAS

### Cache Layers to Consider:

1. Browser cache
2. CDN cache
3. Netlify function cache
4. Application memory cache
5. Code module cache

### Cache Busting Strategy:

```bash
# Add timestamp to force fresh request
curl "...&nocache=$(date +%s)"
```

## 🧪 TESTING PATTERNS

### Create Independent Test Script:

```javascript
// test-pipeline.cjs
const https = require("https");

async function testStep(stepName, testFn) {
  console.log(`=== ${stepName} ===`);
  try {
    const result = await testFn();
    console.log(`✅ ${stepName}: SUCCESS`, result);
    return result;
  } catch (error) {
    console.log(`❌ ${stepName}: FAILED`, error.message);
    throw error;
  }
}

// Test each step independently
testStep("DCS Catalog", () => fetchCatalog());
testStep("Resource Ingredients", () => getIngredients());
testStep("File Download", () => downloadFile());
// etc...
```

## 🔍 LOG ANALYSIS TIPS

### Look for these success indicators:

- `✅ FOUND MATCH:` in TWL parsing
- `Successfully fetched TW articles: X`
- `resourcesFound: {...}`
- `Response with status 200`

### Look for these failure indicators:

- `DCS Response success: false`
- `Got TWL links: 0`
- `Error fetching TW article`
- `Task timed out after X seconds`

## 🏆 SUCCESS METRICS

### For Titus 1:1, expect:

- **Scripture**: 1 clean text passage
- **Translation Notes**: 4 notes
- **Translation Questions**: 1 question
- **Translation Word Links**: 11 links
- **Translation Words**: 10 articles

### Total aggregated resources: 27

## 📚 REMEMBER: DEPENDENCIES MATTER!

- **TW depends on TWL** (can't fetch TW without TWL links)
- **Test TWL first**, then TW
- **Scripture is independent** (can test alone)
- **Notes/Questions are independent** (can test alone)
