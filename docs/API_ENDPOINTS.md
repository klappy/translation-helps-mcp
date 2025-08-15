# API Endpoints Reference

## Base URL

All endpoints are available at:

```
https://api.translation.helps/api/
```

## Important Changes (December 2024)

⚠️ **Major Update**: All endpoints now use real DCS data. Mock data has been completely removed.

### Removed Endpoints

The following endpoints have been permanently removed:

- `/api/fetch-ult-scripture` - Use `fetch-scripture` with `resource=ult`
- `/api/fetch-ust-scripture` - Use `fetch-scripture` with `resource=ust`
- `/api/fetch-resources` - Use specific endpoints for each resource type
- `/api/resource-recommendations` - AI recommendations removed
- `/api/language-coverage` - Coverage data removed
- `/api/get-words-for-reference` - Use `fetch-translation-words`

## Common Parameters

Most endpoints accept these standard parameters:

| Parameter      | Type   | Required | Description                                                                           |
| -------------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| `reference`    | string | Usually  | Bible reference (e.g., "John 3:16", "Genesis 1:1-5")                                  |
| `language`     | string | Often    | Language code (e.g., "en", "es", "fr")                                                |
| `organization` | string | Often    | Organization name (e.g., "unfoldingWord")                                             |
| `format`       | string | No       | Response format: "json" (default), "md", "markdown", "text", "tsv" (where applicable) |

## Response Format

**ALL endpoints now support markdown format** for LLM consumption via the `format` parameter:

- **JSON** (default) - Structured data for programmatic access
- **Markdown** (`format=md` or `format=markdown`) - Human-readable with rich formatting for LLMs
- **Text** (`format=text`) - Plain text for simple consumption
- **TSV** (`format=tsv`) - Tab-separated values (for TSV-based resources only)

### Success Response (JSON)

```json
{
  "data_field": [...],  // "scripture", "items", etc.
  "metadata": {
    "totalCount": 10,
    "reference": "John 3:16",
    "language": "en",
    "organization": "unfoldingWord",
    "source": "DCS API"  // Always real data now
  }
}
```

### Success Response (Markdown)

```markdown
# Response Title

## Metadata

- **Reference**: John 3:16
- **Language**: en
- **Organization**: unfoldingWord
- **Source**: DCS API

## Content

...formatted content...
```

### Error Response

```json
{
  "error": "Human-readable error message",
  "details": {
    "endpoint": "endpoint-name",
    "path": "/api/endpoint",
    "params": {...},
    "timestamp": "2024-12-20T12:00:00Z"
  },
  "status": 404
}
```

## Scripture Endpoints

### GET /fetch-scripture

Fetches scripture text in multiple translations from DCS.

**Parameters:**

- `reference` (required) - Bible reference
- `language` - Language code (default: "en")
- `organization` - Organization (default: "unfoldingWord")
- `resource` - Comma-separated resources (e.g., "ult,ust,t4t,ueb")
- `format` - Response format: "json", "text", "md", "markdown"

**Response:**

```json
{
  "scripture": [
    {
      "text": "For God so loved the world...",
      "translation": "ULT v86"
    },
    {
      "text": "This is because God loved...",
      "translation": "UST v86"
    }
  ],
  "reference": "John 3:16",
  "language": "en",
  "organization": "unfoldingWord",
  "metadata": {
    "totalCount": 2,
    "resources": ["ULT v86", "UST v86"],
    "license": "CC BY-SA 4.0"
  }
}
```

## Translation Helps Endpoints

### GET /translation-notes

Fetches translation notes from TSV data in DCS.

**Parameters:**

- `reference` (required)
- `language`
- `organization`
- `format` - "json", "md", "markdown", "text", "tsv"

**Response:**

```json
{
  "items": [
    {
      "Reference": "John 3:16",
      "ID": "figs-metaphor",
      "Tags": "keyterm",
      "SupportReference": "rc://*/ta/man/translate/figs-metaphor",
      "Quote": "For God so loved",
      "Occurrence": "1",
      "Note": "This is a metaphor..."
    }
  ],
  "metadata": {...}
}
```

### GET /translation-questions

Fetches comprehension questions from TSV data.

**Parameters:** Same as translation-notes

### GET /fetch-translation-words

Fetches translation word articles (key terms) from markdown files.

**Parameters:**

- `reference` (required)
- `language`
- `organization`
- `format` - "json", "md", "markdown", "text"

**Response:**

```json
{
  "items": [
    {
      "term": "faith",
      "definition": "Trust or confidence in someone...",
      "category": "kt",
      "content": "# faith\n\n## Definition\n\n..."
    }
  ],
  "metadata": {...}
}
```

### GET /fetch-translation-word-links ✨ NEW

Fetches links between Bible text and translation word entries from TSV data.

**Parameters:**

- `reference` (required)
- `language`
- `organization`
- `format` - "json", "md", "markdown", "text", "tsv"

**Response:**

```json
{
  "items": [
    {
      "id": "twl1",
      "reference": "John 3:16",
      "occurrence": 1,
      "quote": "world",
      "word": "kt/world",
      "rcLink": "rc://*/tw/dict/bible/kt/world"
    }
  ],
  "metadata": {...}
}
```

### GET /get-translation-word

Fetches a specific translation word article.

**Parameters:**

- `word` (required) - Word ID (e.g., "kt/faith")
- `language`
- `organization`
- `format` - "json", "md", "markdown", "text"

### GET /browse-translation-words ⚠️

Browse all translation words (requires ZIP scanning - **not fully implemented**).

**Parameters:**

- `language` (required)
- `organization`
- `category` - Filter by category: "all", "kt", "names", "other"
- `format` - "json", "md", "markdown"

**Note**: Currently returns an error as ZIP content scanning is not yet implemented.

### GET /fetch-translation-academy

Fetches a specific translation academy module.

**Parameters:**

- `moduleId` (required) - Module ID (e.g., "figs-metaphor")
- `language`
- `organization`
- `format` - "json", "md", "markdown"

**Response:**

```json
{
  "module": {
    "id": "figs-metaphor",
    "title": "Metaphor",
    "category": "translate",
    "content": "# Metaphor\n\n## Description\n\n...",
    "supportReference": "rc://*/ta/man/translate/figs-metaphor"
  },
  "metadata": {...}
}
```

### GET /browse-translation-academy

Browse all translation academy modules from TOC.

**Parameters:**

- `language` (required)
- `organization`
- `category` - Filter: "all", "translate", "checking", "process", "audio", "gateway"
- `format` - "json", "md", "markdown"

**Response:**

```json
{
  "items": [
    {
      "id": "figs-metaphor",
      "title": "Metaphor",
      "category": "translate",
      "path": "translate/figs-metaphor",
      "categoryName": "Translation",
      "supportReference": "rc://*/ta/man/translate/figs-metaphor"
    }
  ],
  "metadata": {
    "totalModules": 45,
    "categories": [
      { "id": "all", "name": "All Modules", "count": 45 },
      { "id": "translate", "name": "Translation", "count": 30 }
    ]
  }
}
```

## Discovery Endpoints

### GET /simple-languages

Lists available languages from DCS catalog.

**Parameters:**

- `resource` - Filter by resource type
- `includeMetadata` - Include resource availability
- `includeStats` - Include coverage statistics
- `format` - "json", "md", "markdown"

**Response:**

```json
{
  "items": [
    {
      "code": "en",
      "name": "English",
      "direction": "ltr",
      "resources": ["ult", "ust", "tn", "tw", "tq", "ta"]
    }
  ],
  "metadata": {...}
}
```

### GET /get-available-books

Lists available Bible books from DCS.

**Parameters:**

- `language` (required)
- `organization`
- `resource` - Filter by resource type
- `testament` - Filter by testament: "ot", "nt"
- `includeChapters` - Include chapter counts
- `includeCoverage` - Include coverage data
- `format` - "json", "md", "markdown"

### GET /list-available-resources

Lists available resource types from DCS catalog.

**Parameters:**

- `language`
- `organization`
- `includeMetadata` - Include detailed metadata
- `format` - "json", "md", "markdown", "text"

### GET /resource-catalog

Browse the full DCS resource catalog.

**Parameters:**

- `metadataType` - Type of metadata (e.g., "rc", "sb")
- `subject` - Filter by subject
- `language` - Filter by language
- `stage` - Filter by stage: "prod", "preprod", "draft"
- `includeMetadata` - Include full metadata
- `format` - "json", "md", "markdown", "text"

## Utility Endpoints

### GET /health

Basic health check.

**Response:**

```json
{
  "status": "healthy",
  "version": "6.6.3",
  "timestamp": "2024-12-20T12:00:00Z",
  "deployment": {
    "environment": "production",
    "platform": "cloudflare-pages"
  }
}
```

### GET /health-dcs

Checks DCS API connectivity with real test.

**Response:**

```json
{
  "status": "healthy",
  "dcsStatus": {
    "reachable": true,
    "responseTime": 234,
    "lastChecked": "2024-12-20T12:00:00Z"
  },
  "version": "6.6.3"
}
```

### GET /extract-references

Extracts Bible references from text.

**Parameters:**

- `text` (required) - Text to analyze
- `format` - "json", "md", "markdown", "text"

**Response:**

```json
{
  "references": [
    {
      "reference": "John 3:16",
      "position": { "start": 10, "end": 19 }
    }
  ],
  "metadata": {
    "totalReferences": 1
  }
}
```

### GET /get-context

Aggregates all resources for a reference (currently limited implementation).

**Parameters:**

- `reference` (required)
- `language`
- `organization`
- `includeEmpty` - Include empty resources (default: true)
- `format` - "json", "md", "markdown"

**Response:**

```json
{
  "reference": "John 3:16",
  "scripture": null,
  "translationNotes": [...],
  "translationWords": [],
  "translationQuestions": [],
  "translationAcademy": [],
  "crossReferences": [],
  "metadata": {
    "resourcesFound": {
      "notes": 2,
      "words": 0,
      "questions": 0
    }
  }
}
```

## Caching & Performance

All responses use real-time data from DCS with intelligent caching:

- **KV Cache**: Catalog metadata (1 hour TTL)
- **R2 Storage**: ZIP file caching
- **Cache API**: Extracted file caching

Response headers:

- `X-Cache-Status` - "hit", "miss", "partial"
- `X-Response-Time` - Processing time in milliseconds
- `X-XRay-Trace` - Base64 encoded trace data for debugging

## Rate Limiting

- No hard rate limits currently enforced
- Please be respectful of DCS upstream services
- Contact support for high-volume use cases

## Examples

### Fetch Scripture with Multiple Translations

```bash
curl "https://api.translation.helps/api/fetch-scripture?reference=John%203:16&resource=ult,ust"
```

### Get Translation Notes in Markdown

```bash
curl "https://api.translation.helps/api/translation-notes?reference=Genesis%201:1&format=md"
```

### Fetch Translation Word Links

```bash
curl "https://api.translation.helps/api/fetch-translation-word-links?reference=Titus%201:1"
```

### Browse Translation Academy Modules

```bash
curl "https://api.translation.helps/api/browse-translation-academy?language=en&category=translate"
```

## Testing with Wrangler

For development and testing with KV/R2 bindings:

```bash
cd ui && npx wrangler pages dev .svelte-kit/cloudflare --port 8787
```

See `tests/TESTING_REQUIREMENTS.md` for details.

## Migration Guide

See `MIGRATION_GUIDE.md` for migrating from:

- Mock data endpoints to real data endpoints
- Removed endpoints to their replacements
- Old response formats to new standardized formats

## Additional Resources

- `ARCHITECTURE.md` - System architecture overview
- `API_EXPLORER_GUIDE.md` - Interactive API testing guide
- `MIGRATION_GUIDE.md` - Detailed migration instructions
- `tests/TESTING_REQUIREMENTS.md` - Testing with Wrangler
