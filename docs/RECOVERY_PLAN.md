# Recovery Plan for Scripture Formatting

## What Was Working

### 1. Beautiful Markdown Formatting
- Single verses with blockquotes
- Verse ranges with numbered verses (e.g., "16. For God so loved...")
- Full chapters with proper spacing
- Cross-chapter ranges with chapter:verse notation
- Proper citations with resource versions

### 2. ZIP-based Caching System
- Downloads entire resource ZIPs once
- Caches in Cloudflare KV for 24 hours
- Memory cache for immediate responses
- 90% reduction in API calls
- X-Ray tracing showing cache hits/misses

### 3. Response Formatter
- Automatic format detection (JSON/text/markdown)
- Smart LLM client detection
- Headers with metadata for non-JSON formats
- Version extraction from ZIP URLs

## What Broke

1. **RouteGenerator Integration**: The computeData method was modified to use a functional data fetcher that doesn't preserve the formatting
2. **Response Formatting**: The ResponseFormatter is too generic and doesn't handle scripture-specific formatting rules
3. **ZIP Fetcher**: The extractVerseFromUSFM only returns plain text, no verse numbers or formatting
4. **Multiple Resources**: Lost the ability to return all translations (ULT, UST) when no specific version requested

## Recovery Steps

### Step 1: Fix extractVerseFromUSFM
Add methods to ZipResourceFetcher2:
- `extractVerseRangeWithNumbers()`
- `extractChapterWithNumbers()`
- `extractFormattedScripture()` - main method that handles all cases

### Step 2: Update getScripture Response
Change return type to include:
```typescript
{
  text: string;
  translation: string;
  citation: {
    resource: string;
    organization: string;
    language: string;
    version: string;
  };
}
```

### Step 3: Fix ResponseFormatter
Add scripture-specific formatting logic:
- Detect verse ranges vs single verses
- Apply proper markdown formatting rules
- Handle multiple resources correctly

### Step 4: Update RouteGenerator
In computeData for fetch-scripture:
- Use ZIP fetcher directly
- Apply formatting based on format parameter
- Preserve all metadata and traces

## Key Code to Restore

### Verse Number Formatting
```typescript
// For verse ranges
if (hasMultipleVerses) {
  // Format: "16. For God so loved..."
  text = text.replace(/^(\d+)\s+/gm, '$1. ');
}
```

### Markdown Citation Format
```markdown
> Single verse text

— **John 3:16 (UST)** · unfoldingWord v86
```

### Multiple Resources Structure
```json
{
  "scripture": {
    "reference": "John 3:16",
    "language": "en"
  },
  "resources": [
    {
      "text": "...",
      "translation": "ULT",
      "resource": "ult",
      "citation": {...}
    },
    {
      "text": "...",
      "translation": "UST",
      "resource": "ust",
      "citation": {...}
    }
  ]
}
```
