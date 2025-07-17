# MCP Data Fetching Patterns for Translation Helps

This document describes the data fetching patterns used in the MCP Translation Helps server, based on proven patterns from the translation-helps project. These patterns enable efficient fetching of organizations, languages, resources, and clean text extraction for LLM consumption.

## Table of Contents

1. [DCS Catalog API Integration](#dcs-catalog-api-integration)
2. [Resource Fetching Patterns](#resource-fetching-patterns)
3. [USFM Text Extraction for LLMs](#usfm-text-extraction-for-llms)
4. [Caching and Performance](#caching-and-performance)
5. [Error Handling and Fallbacks](#error-handling-and-fallbacks)

## DCS Catalog API Integration

### Base URLs

```javascript
const BASE_CATALOG_URL = "https://git.door43.org/api/v1/catalog/list";
const CATALOG_SEARCH_URL = "https://git.door43.org/api/v1/catalog/search";
```

### 1. Fetching Organizations

Organizations are content publishers on DCS (Door43 Content Service).

**Endpoint:** `GET /owners`

```javascript
async function fetchOrganizations() {
  const response = await fetch(`${BASE_CATALOG_URL}/owners`);
  const apiResponse = await response.json();

  return apiResponse.data
    .filter((org) => org && org.login)
    .map((org) => ({
      id: org.id,
      login: org.login, // Use this for API calls
      displayName: org.full_name, // Use this for UI display
      avatarUrl: org.avatar_url,
      languages: org.repo_languages || [],
    }))
    .sort((a, b) => a.login.localeCompare(b.login));
}
```

### 2. Fetching Languages

Languages are fetched per organization.

**Endpoint:** `GET /languages?owner={owner}`

```javascript
async function fetchLanguages(organization) {
  const response = await fetch(`${BASE_CATALOG_URL}/languages?owner=${organization}`);
  const apiResponse = await response.json();

  return apiResponse.data
    .filter((lang) => lang && lang.lc) // lc = language code
    .map((lang) => ({
      code: lang.lc, // e.g., "en", "es", "fr"
      name: lang.ln, // e.g., "English", "Spanish", "French"
      direction: lang.ld, // "ltr" or "rtl"
      gateway: lang.gw, // Boolean: is this a gateway language?
      region: lang.lr, // e.g., "Americas", "Asia", "Europe"
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
```

### 3. Fetching Resources

Resources include Bibles, translation notes, questions, words, etc.

**Endpoint:** `GET /?owner={owner}&lang={lang}`

```javascript
async function fetchResources(organization, languageCode) {
  const response = await fetch(`${BASE_CATALOG_URL}/?owner=${organization}&lang=${languageCode}`);
  const apiResponse = await response.json();

  return apiResponse.data.map((resource) => ({
    id: resource.id,
    name: resource.name,
    title: resource.title,
    subject: resource.subject, // "Bible", "Translation Notes", etc.
    type: resource.metadata_type, // "rc" (Resource Container)
    version: resource.metadata_version,
    ingredients: resource.ingredients, // CRITICAL: Contains file paths
    owner: resource.owner,
    checksumUrl: resource.checksum_url,
    downloadUrl: resource.downloadable_url,
  }));
}
```

## Resource Fetching Patterns

### Critical Rule: Use Ingredients for File Paths

**NEVER hardcode file naming patterns!** Always use the `ingredients` array from resource metadata.

❌ **Wrong:**

```javascript
const filePath = `tn_${bookId.toUpperCase()}.tsv`;
const filePath = `tq_${bookId.toUpperCase()}.tsv`;
```

✅ **Correct:**

```javascript
const ingredient = resourceData.ingredients.find((ing) => ing.identifier === bookId);
const filePath = ingredient ? ingredient.path : null;
```

### Resource File URL Pattern

```javascript
function buildResourceUrl(organization, languageCode, resourceId, filePath) {
  return `https://git.door43.org/${organization}/${languageCode}_${resourceId}/raw/branch/master/${filePath}`;
}

// Example URL:
// https://git.door43.org/unfoldingWord/en_tn/raw/branch/master/01-GEN.tsv
```

### Fetching Resource Content

```javascript
async function fetchResourceFile(organization, languageCode, resourceId, filePath) {
  const url = buildResourceUrl(organization, languageCode, resourceId, filePath);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${resourceId} file:`, error);
    throw error;
  }
}
```

## USFM Text Extraction for LLMs

### The Challenge

USFM (Unified Standard Format Markers) contains alignment data, markup, and annotations that confuse LLMs and cause misquotes. We need clean, readable text.

### Solution: Unified Server-Side Extraction

```javascript
/**
 * Extract clean text from USFM for LLM consumption
 * Removes all alignment data, markup, and hidden elements
 */
function extractCleanText(usfmContent, chapter, verse) {
  // 1. Parse USFM to semantic HTML
  const html = parseUSFMToHTML(usfmContent);

  // 2. Apply unified extraction rules
  let cleanHtml = html;

  // Remove hidden USFM elements
  cleanHtml = cleanHtml.replace(/<marker[^>]*>.*?<\/marker>/gs, "");
  cleanHtml = cleanHtml.replace(/<attributes[^>]*>.*?<\/attributes>/gs, "");
  cleanHtml = cleanHtml.replace(/<number[^>]*>.*?<\/number>/gs, "");
  cleanHtml = cleanHtml.replace(/<zaln[^>]*>/g, "").replace(/<\/zaln>/g, "");
  cleanHtml = cleanHtml.replace(/<word[^>]*>/g, "").replace(/<\/word>/g, "");
  cleanHtml = cleanHtml.replace(/<content[^>]*>/g, "").replace(/<\/content>/g, "");
  cleanHtml = cleanHtml.replace(/<[^>]*>/g, " ");

  // Clean whitespace
  const text = cleanHtml.replace(/\s+/g, " ").trim();

  // Extract specific verse if requested
  if (chapter && verse) {
    return extractVerseText(text, chapter, verse);
  }

  return text;
}

/**
 * Extract text for a specific verse
 */
function extractVerseText(usfmText, chapter, verse) {
  // Find chapter
  const chapterPattern = new RegExp(`\\\\c\\s+${chapter}\\b`);
  const chapterSplit = usfmText.split(chapterPattern);

  if (chapterSplit.length < 2) {
    throw new Error(`Chapter ${chapter} not found`);
  }

  let chapterContent = chapterSplit[1];

  // Limit to next chapter
  const nextChapterMatch = chapterContent.match(/\\c\s+\d+/);
  if (nextChapterMatch) {
    chapterContent = chapterContent.substring(0, nextChapterMatch.index);
  }

  // Find verse
  const versePattern = new RegExp(`\\\\v\\s+${verse}\\b`);
  const verseSplit = chapterContent.split(versePattern);

  if (verseSplit.length < 2) {
    throw new Error(`Verse ${verse} not found`);
  }

  let verseContent = verseSplit[1];

  // Limit to next verse
  const nextVerseMatch = verseContent.match(/\\v\s+\d+/);
  if (nextVerseMatch) {
    verseContent = verseContent.substring(0, nextVerseMatch.index);
  }

  // Clean and return
  return `${verse} ${verseContent.trim()}`;
}
```

### Key Points for LLM Text Preparation

1. **Remove all alignment data** - zaln markers contain Greek/Hebrew alignment that confuses LLMs
2. **Preserve punctuation** - Critical for accurate quotation
3. **Simple verse numbering** - Format as "1 In the beginning..." not complex markup
4. **Consistent whitespace** - Single spaces between words, trimmed content
5. **No hidden markers** - Remove all USFM markup that wouldn't be visible to readers

## Caching and Performance

### Multi-Level Cache Strategy

```javascript
class ResourceCache {
  constructor(ttl = 300000) {
    // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}

// Different cache instances for different data types
const organizationCache = new ResourceCache(3600000); // 1 hour
const languageCache = new ResourceCache(3600000); // 1 hour
const resourceCache = new ResourceCache(300000); // 5 minutes
const fileCache = new ResourceCache(600000); // 10 minutes
```

### Request Deduplication

Prevent duplicate simultaneous requests:

```javascript
const pendingRequests = new Map();

async function fetchWithDedup(url, cacheKey) {
  // Check cache first
  const cached = resourceCache.get(cacheKey);
  if (cached) return cached;

  // Check pending requests
  if (pendingRequests.has(cacheKey)) {
    return await pendingRequests.get(cacheKey);
  }

  // Create new request
  const promise = fetch(url)
    .then((res) => res.json())
    .then((data) => {
      resourceCache.set(cacheKey, data);
      pendingRequests.delete(cacheKey);
      return data;
    })
    .catch((error) => {
      pendingRequests.delete(cacheKey);
      throw error;
    });

  pendingRequests.set(cacheKey, promise);
  return promise;
}
```

## Error Handling and Fallbacks

### Graceful Degradation

```javascript
async function fetchWithFallback(primary, fallback) {
  try {
    return await primary();
  } catch (error) {
    console.warn("Primary fetch failed, trying fallback:", error);
    try {
      return await fallback();
    } catch (fallbackError) {
      console.error("Both primary and fallback failed:", fallbackError);
      throw new Error("Resource unavailable");
    }
  }
}
```

### Resource Availability Check

```javascript
async function isResourceAvailable(organization, languageCode, resourceId, bookId) {
  try {
    const resources = await fetchResources(organization, languageCode);
    const resource = resources.find((r) => r.id.includes(resourceId));

    if (!resource) return false;

    // Check if book is in ingredients
    return resource.ingredients.some((ing) => ing.identifier === bookId);
  } catch {
    return false;
  }
}
```

## Best Practices Summary

1. **Always use the DCS Catalog API** as the source of truth
2. **Never hardcode file paths** - use ingredients array
3. **Cache aggressively** but respect TTLs
4. **Deduplicate requests** to prevent API hammering
5. **Extract text uniformly** across all environments
6. **Handle errors gracefully** with meaningful fallbacks
7. **Validate resource availability** before fetching
8. **Clean USFM thoroughly** for LLM consumption

## MCP Tool Integration

When implementing MCP tools, follow these patterns:

```javascript
// Tool: fetch-resources
async function fetchResourcesTool({ organization, language, reference }) {
  // 1. Validate inputs
  if (!organization || !language) {
    throw new Error("Organization and language required");
  }

  // 2. Parse reference (e.g., "Genesis 1:1")
  const { book, chapter, verse } = parseReference(reference);

  // 3. Fetch with caching
  const cacheKey = `${organization}-${language}-resources`;
  const resources = await fetchWithDedup(
    `${BASE_CATALOG_URL}/?owner=${organization}&lang=${language}`,
    cacheKey
  );

  // 4. Filter and aggregate
  const aggregated = await aggregateResourcesForReference(resources, book, chapter, verse);

  // 5. Extract clean text for LLM
  aggregated.scripture = extractCleanText(aggregated.scriptureContent, chapter, verse);

  return aggregated;
}
```

This approach ensures reliable, performant, and LLM-friendly resource fetching.
