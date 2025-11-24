# Hybrid Search Feature Documentation

## Overview

Translation Helps MCP now supports **two complementary search approaches**:

1. **Broad Discovery Search** (`/api/search`) - Search across all resources
2. **Focused Endpoint Search** (via `search` parameter) - Search within specific resources/references

Both approaches use the same MiniSearch library with BM25 ranking but serve different use cases.

## When to Use Each Approach

### Use Broad Discovery Search (`/api/search`)

**Best for**: Finding relevant content across all resources without knowing where it might be.

**Examples**:

- "Find everything about 'baptism'"
- "Search for 'covenant' across all translations and helps"
- "Discover all mentions of 'Holy Spirit' in available resources"

**Request**:

```bash
GET /api/search?query=baptism&language=en&owner=unfoldingWord
```

**Response**:

```json
{
  "took_ms": 1234,
  "query": "baptism",
  "language": "en",
  "owner": "unfoldingWord",
  "resourceCount": 4,
  "hits": [
    {
      "id": "en_tw:en_tw/bible/kt/baptize.md",
      "score": 22.08,
      "path": "en_tw/bible/kt/baptize.md",
      "resource": "en_tw",
      "type": "words",
      "preview": "# baptize, baptism ## Definition: The word baptize refers to..."
    }
  ]
}
```

### Use Focused Endpoint Search (search parameter)

**Best for**: Filtering results within a specific reference or resource.

**Examples**:

- "Find 'grace' in John chapter 1"
- "Show translation notes about 'born again' in John 3"
- "Get verses containing 'believe' in John 3:16-18"

**Requests**:

```bash
# Search scripture in a specific reference
GET /api/fetch-scripture?reference=John 1&search=grace

# Search translation notes
GET /api/fetch-translation-notes?reference=John 3:16&search=born

# Search translation questions
GET /api/fetch-translation-questions?reference=John 3&search=believe

# Validate translation word relevance
GET /api/fetch-translation-word?term=grace&search=undeserved

# Check translation academy relevance
GET /api/fetch-translation-academy?moduleId=figs-metaphor&search=metaphor
```

**Response** (with search applied):

```json
{
  "scripture": [
    {
      "text": "In the beginning was the Word...",
      "translation": "unfoldingWord® Literal Text",
      "searchScore": 15.2,
      "matchedTerms": ["word"]
    }
  ],
  "reference": "John 1:1-5",
  "metadata": {
    "totalCount": 1,
    "searchQuery": "word",
    "searchApplied": true,
    "totalMatches": 1
  }
}
```

## Search Parameter Behavior

### All Resource Endpoints Now Support `search`

The following endpoints now accept an optional `search` parameter:

- `/api/fetch-scripture`
- `/api/fetch-translation-notes`
- `/api/fetch-translation-questions`
- `/api/fetch-translation-word`
- `/api/fetch-translation-academy`

### Validation Rules

- **Minimum length**: 2 characters
- **Maximum length**: 100 characters
- **Allowed characters**: Unicode, spaces, common punctuation
- **Forbidden**: Control characters

### Search Behavior by Endpoint

#### Scripture (`/api/fetch-scripture`)

- Searches within verse text
- Returns verses ranked by relevance
- Includes `searchScore` and `matchedTerms` in results
- Preserves all requested translations

#### Translation Notes (`/api/fetch-translation-notes`)

- Searches within note content and quotes
- Boosts matches in quotes over explanatory text
- Returns notes ranked by relevance
- Includes context notes in search scope

#### Translation Questions (`/api/fetch-translation-questions`)

- Searches both questions and answers
- Higher boost for question matches
- Returns Q&A pairs ranked by relevance

#### Translation Words (`/api/fetch-translation-word`)

- Validates word article contains search query
- Returns 404 if no match found
- Includes searchScore in metadata
- Less fuzzy matching for terminology precision

#### Translation Academy (`/api/fetch-translation-academy`)

- Validates academy module contains search query
- Returns 404 if no match found
- Searches module title and content
- Includes searchScore in metadata

## Technical Implementation

### Ephemeral In-Memory Indexing

**IMPORTANT**: Search indexes are NOT cached or persisted!

Every search request follows this pattern:

```typescript
async function handleRequest(params) {
  // 1. Fetch fresh data from source (ZIP/API)
  const data = await fetcher.fetchResource(...);

  // 2. Create temporary in-memory search index
  const searchService = new SearchService(); // NEW instance per request

  // 3. Index the data IN MEMORY ONLY
  await searchService.indexDocuments(data);

  // 4. Search the temporary index
  const results = await searchService.search(params.search);

  // 5. Return results
  return results;

  // 6. Request ends, searchService is garbage collected
  // NOTHING IS CACHED OR STORED
}
```

### Resource-Specific Configurations

Each resource type has optimized search settings:

```typescript
const RESOURCE_CONFIGS = {
  scripture: {
    fuzzy: 0.2,
    boost: { content: 3 },
    contextLength: 200,
  },
  notes: {
    fuzzy: 0.2,
    boost: { content: 2 },
    contextLength: 150,
  },
  questions: {
    fuzzy: 0.2,
    boost: { content: 2.5 },
    contextLength: 150,
  },
  words: {
    fuzzy: 0.15, // Less fuzzy for terminology
    boost: { content: 3 },
    contextLength: 200,
  },
  academy: {
    fuzzy: 0.2,
    boost: { content: 2 },
    contextLength: 180,
  },
};
```

### Performance Characteristics

- **No overhead when search not used**: Endpoints behave identically without search parameter
- **Typical search latency**: 50-200ms for in-memory indexing and searching
- **Memory usage**: Proportional to content size, garbage collected after request
- **CPU usage**: Concentrated during indexing phase, minimal during search

## MCP Tool Integration

### Updated Tool Schemas

All MCP tools now include optional `search` parameter:

```typescript
{
  name: 'fetch_scripture',
  inputSchema: {
    properties: {
      reference: { type: 'string' },
      language: { type: 'string', default: 'en' },
      organization: { type: 'string', default: 'unfoldingWord' },
      search: { type: 'string', description: 'Optional: Filter scripture by search query' }
    }
  }
}
```

### Backward Compatibility

- All existing MCP tool calls work unchanged
- Search parameter is completely optional
- Responses maintain the same structure, with additional metadata when search is applied

## Examples

### Example 1: Focused Search in Scripture

**Without search** (gets all verses):

```bash
curl "https://api.example.com/api/fetch-scripture?reference=John 3:16-21"
```

**With search** (filters to relevant verses):

```bash
curl "https://api.example.com/api/fetch-scripture?reference=John 3:16-21&search=believe"
```

### Example 2: Finding Relevant Translation Notes

```bash
curl "https://api.example.com/api/fetch-translation-notes?reference=John 3&search=born again"
```

Returns only notes that mention "born again" within John 3.

### Example 3: Validating Word Article Relevance

```bash
curl "https://api.example.com/api/fetch-translation-word?term=grace&search=undeserved favor"
```

Returns the grace article only if it contains "undeserved favor", otherwise 404.

## Best Practices

1. **Use focused search for reference-specific queries**: When you know the reference, use endpoint search
2. **Use broad search for discovery**: When you don't know where content might be, use `/api/search`
3. **Keep search queries focused**: 2-5 words typically work best
4. **Combine with reference**: Endpoint search is most powerful when combined with specific references
5. **Handle 404s gracefully**: Search may return no results if query doesn't match

## Troubleshooting

### Search returns no results

- Verify search query meets minimum length (2 chars)
- Try broader search terms
- Check if content actually contains the search terms
- For translation words/academy, a 404 means no match found (expected behavior)

### Search is slow

- Large references (whole books) take longer to index
- Consider narrowing the reference scope
- Check network latency for ZIP downloads
- Typical search should complete in < 2 seconds

### Search scores seem off

- BM25 scoring is relative to the corpus
- Smaller result sets have different score distributions
- Score magnitude varies by resource type
- Focus on ranking order, not absolute values

## Future Enhancements

Potential improvements (not currently implemented):

- Cross-reference search linking
- Search result highlighting in previews
- Persistent index caching (with proper invalidation)
- Synonym expansion
- Multi-lingual search support
- Search analytics and query logging
