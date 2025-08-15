# Migration Guide: From Mock Data to Real Data

This guide helps you migrate from the old mock-data endpoints to the new real-data implementation.

## Overview of Changes

### 🚨 Breaking Changes

1. **All mock data removed** - Every endpoint now fetches real data from DCS
2. **Several endpoints removed** - Redundant or mock-only endpoints have been deleted
3. **Response format changes** - Some response structures have been updated
4. **Error behavior changes** - No more mock fallbacks on errors

### ✅ Improvements

1. **Real data everywhere** - All responses contain actual translation resources
2. **Consistent format support** - Every endpoint supports JSON, Markdown, and Text formats
3. **Better error messages** - Clear errors instead of silent mock fallbacks
4. **Unified architecture** - All endpoints use the same patterns and utilities

## Removed Endpoints

### `/api/fetch-ult-scripture` → Use `/api/fetch-scripture`

**Old:**

```bash
GET /api/fetch-ult-scripture?reference=John%203:16
```

**New:**

```bash
GET /api/fetch-scripture?reference=John%203:16&resource=ult
```

### `/api/fetch-ust-scripture` → Use `/api/fetch-scripture`

**Old:**

```bash
GET /api/fetch-ust-scripture?reference=John%203:16
```

**New:**

```bash
GET /api/fetch-scripture?reference=John%203:16&resource=ust
```

### `/api/fetch-resources` → Use specific endpoints

This generic endpoint has been removed. Use specific endpoints for each resource type:

- Scripture: `/api/fetch-scripture`
- Notes: `/api/translation-notes`
- Questions: `/api/translation-questions`
- Words: `/api/fetch-translation-words`
- Word Links: `/api/fetch-translation-word-links`
- Academy: `/api/fetch-translation-academy`

### `/api/resource-recommendations` → Removed

AI-powered recommendations have been removed. Build your own recommendation logic using the available endpoints.

### `/api/language-coverage` → Removed

Coverage statistics have been removed. Use `/api/get-available-books` with `includeCoverage=true` for book-level coverage.

### `/api/get-words-for-reference` → Use `/api/fetch-translation-words`

**Old:**

```bash
GET /api/get-words-for-reference?reference=John%203:16
```

**New:**

```bash
GET /api/fetch-translation-words?reference=John%203:16
```

## Response Format Changes

### Scripture Endpoints

**Old Response:**

```json
{
  "data": {
    "reference": "John 3:16",
    "text": "For God so loved...",
    "version": "ULT"
  }
}
```

**New Response:**

```json
{
  "scripture": [
    {
      "text": "For God so loved the world...",
      "translation": "ULT v86"
    }
  ],
  "reference": "John 3:16",
  "language": "en",
  "organization": "unfoldingWord",
  "metadata": {
    "totalCount": 1,
    "resources": ["ULT v86"],
    "license": "CC BY-SA 4.0"
  }
}
```

### Translation Notes

**Old Response:**

```json
{
  "data": [
    {
      "id": "tn001",
      "noteType": "general",
      "text": "This verse..."
    }
  ]
}
```

**New Response:**

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

### Translation Word Links (New Endpoint)

The old endpoints returned mock or incomplete data. The new endpoint returns real TSV data:

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

## Error Handling Changes

### Old Behavior

```json
// Real data fails → Returns mock data
{
  "data": [...mock data...],
  "source": "mock"
}
```

### New Behavior

```json
// Real data fails → Returns actual error
{
  "error": "Failed to fetch scripture from DCS",
  "details": {
    "endpoint": "fetch-scripture-v2",
    "path": "/api/fetch-scripture",
    "params": {...},
    "timestamp": "2024-12-20T12:00:00Z"
  },
  "status": 404
}
```

## Format Parameter

All endpoints now support multiple formats:

```bash
# JSON (default)
GET /api/endpoint

# Markdown (for LLMs)
GET /api/endpoint?format=md
GET /api/endpoint?format=markdown

# Plain text
GET /api/endpoint?format=text

# TSV (for TSV-based resources only)
GET /api/endpoint?format=tsv
```

## Migration Checklist

- [ ] Update all calls to removed endpoints
- [ ] Update response parsing for new formats
- [ ] Add error handling for real failures (no mock fallbacks)
- [ ] Test with the new Wrangler-based setup
- [ ] Update any hardcoded mock data expectations
- [ ] Add format parameter for LLM consumption if needed

## Testing Your Migration

1. **Start Wrangler** (required for KV/R2):

   ```bash
   cd ui && npx wrangler pages dev .svelte-kit/cloudflare --port 8787
   ```

2. **Test each endpoint**:

   ```bash
   # Test scripture
   curl http://localhost:8787/api/fetch-scripture?reference=John%203:16

   # Test with markdown format
   curl http://localhost:8787/api/fetch-scripture?reference=John%203:16&format=md
   ```

3. **Verify error handling**:
   ```bash
   # Test with invalid reference
   curl http://localhost:8787/api/fetch-scripture?reference=NotABook%2099:99
   ```

## Common Issues

### Issue: "No mock fallback" errors

**Cause**: The endpoint is trying to fall back to mock data that no longer exists.

**Solution**: Ensure you're handling errors properly and not expecting mock data.

### Issue: Missing endpoints return 404

**Cause**: The endpoint has been removed.

**Solution**: Use the replacement endpoint as documented above.

### Issue: Different response structure

**Cause**: Response formats have been standardized.

**Solution**: Update your parsing logic to use the new structure.

### Issue: TSV data looks different

**Cause**: Real TSV data has different fields than mocked data.

**Solution**: Use the actual TSV column names (Reference, ID, Tags, etc.).

## Need Help?

- Check the updated `API_ENDPOINTS.md` for complete endpoint documentation
- Review the example responses for each endpoint
- Test with the API Explorer at `/api-explorer`
- File an issue if you find any problems
