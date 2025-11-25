# Cloudflare AI Search Feature Documentation

## Overview

Translation Helps MCP now uses **Cloudflare AI Search** for semantic search capabilities:

1. **AI Search** (`/api/search`) - Semantic search across all indexed resources
2. **Focused Endpoint Filtering** (via `search` parameter) - Simple text filtering within specific resources

## Architecture

### AI Search (Cloudflare)

The main `/api/search` endpoint uses Cloudflare AI Search which:

- Automatically indexes content stored in R2 under `/clean/` prefix
- Provides semantic understanding of queries
- Returns results ranked by relevance
- Filters by language, organization, resource type, and reference

### Clean Content Pipeline

Content is automatically cleaned and indexed when first accessed:

```
Raw Content → Content Cleaners → Clean Text + Metadata → R2 Storage → AI Search Index
```

## Storage Structure

Clean content is stored in R2 with rich metadata:

```
/clean/{language}/{organization}/{resource}/{version}/{book_or_category}/{file}.txt
```

### R2 Metadata Fields

Each file stored includes comprehensive metadata:

| Field              | Description          | Example                       |
| ------------------ | -------------------- | ----------------------------- |
| `language`         | ISO language code    | "en", "es-419"                |
| `organization`     | Content owner        | "unfoldingWord"               |
| `resource`         | Resource type        | "ult", "tn", "tw", "ta", "tq" |
| `version`          | Release version      | "v85", "v86"                  |
| `book`             | 3-letter book code   | "GEN", "JHN", "REV"           |
| `chapter`          | Chapter number       | "3"                           |
| `verse_start`      | Starting verse       | "16"                          |
| `verse_end`        | Ending verse         | "17"                          |
| `article_id`       | Article identifier   | "grace", "figs-metaphor"      |
| `article_category` | Article category     | "kt", "names", "translate"    |
| `title`            | Human-readable title | "Grace", "Metaphor"           |
| `original_path`    | Original file path   | "43-JHN.usfm"                 |
| `processed_at`     | Processing timestamp | ISO 8601 datetime             |

## API Reference

### Main Search Endpoint

**GET/POST** `/api/search`

#### Request Parameters

| Parameter      | Type    | Default         | Description                                            |
| -------------- | ------- | --------------- | ------------------------------------------------------ |
| `query`        | string  | required        | Search query                                           |
| `language`     | string  | "en"            | Filter by language                                     |
| `organization` | string  | "unfoldingWord" | Filter by organization                                 |
| `resource`     | string  | all             | Filter by resource type: "ult", "tn", "tw", "ta", "tq" |
| `reference`    | string  | null            | Filter by scripture reference: "John 3:16"             |
| `articleId`    | string  | null            | Filter by article ID: "grace", "figs-metaphor"         |
| `limit`        | number  | 50              | Maximum results to return                              |
| `includeHelps` | boolean | true            | Include translation helps in results                   |

#### Response Structure

```typescript
interface SearchResponse {
  took_ms: number; // Search latency
  query: string; // Original query
  language: string; // Language filter applied
  organization: string; // Organization filter applied
  resource?: string; // Resource filter applied
  reference?: string; // Reference filter applied
  resourceCount: number; // Number of results
  hits: SearchHit[]; // Search results
  message?: string; // Informational message
  error?: string; // Error message if any
}

interface SearchHit {
  id: string; // Unique identifier
  reference: string; // Formatted reference: "John 3:16" or "Grace (Key Term)"
  preview: string; // Matching snippet with context
  context: string; // Surrounding text for context
  resource: string; // Resource type
  language: string; // Content language
  organization: string; // Content owner
  path: string; // Original file path
  book?: string; // 3-letter book code
  chapter?: number; // Chapter number
  verse?: number; // Verse number
  articleId?: string; // Article identifier
  articleCategory?: string; // Article category
  title?: string; // Human-readable title
  score: number; // Relevance score
  highlights: string[]; // Matched query terms
}
```

### Example Requests

#### Search for "love" in all English resources:

```bash
GET /api/search?query=love&language=en
```

#### Search for "grace" in Translation Words only:

```bash
POST /api/search
Content-Type: application/json

{
  "query": "grace",
  "language": "en",
  "resource": "tw"
}
```

#### Search in John chapter 3:

```bash
GET /api/search?query=born+again&reference=John+3
```

#### Search for a specific article:

```bash
GET /api/search?query=metaphor&articleId=figs-metaphor&resource=ta
```

### Example Response

```json
{
  "took_ms": 89,
  "query": "love",
  "language": "en",
  "organization": "unfoldingWord",
  "resourceCount": 15,
  "hits": [
    {
      "id": "clean/en/unfoldingWord/en_tw/v85/bible/kt/love.md.txt",
      "reference": "Love (Key Term)",
      "preview": "...God's love is unconditional. This means it is not based on the merit of the person being loved...",
      "context": "Love is caring for and serving others. God's love is unconditional. This means it is not based on the merit of the person being loved. God loves all people, including those who do wrong.",
      "resource": "tw",
      "language": "en",
      "organization": "unfoldingWord",
      "path": "bible/kt/love.md",
      "articleId": "love",
      "articleCategory": "kt",
      "title": "Love",
      "score": 0.95,
      "highlights": ["love"]
    },
    {
      "id": "clean/en/unfoldingWord/en_ult/v85/43-JHN.usfm.txt",
      "reference": "John 3:16",
      "preview": "...For God so loved the world, that he gave his only Son...",
      "context": "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
      "resource": "ult",
      "language": "en",
      "organization": "unfoldingWord",
      "path": "43-JHN.usfm",
      "book": "JHN",
      "chapter": 3,
      "verse": 16,
      "score": 0.89,
      "highlights": ["love"]
    }
  ]
}
```

## Focused Endpoint Search

Individual resource endpoints still support text filtering via the `search` parameter:

- `/api/fetch-scripture?reference=John 3&search=believe`
- `/api/fetch-translation-notes?reference=John 3:16&search=faith`
- `/api/fetch-translation-word?term=grace&search=undeserved`
- `/api/fetch-translation-academy?moduleId=figs-metaphor&search=comparison`
- `/api/fetch-translation-questions?reference=John 3&search=born`

This uses simple in-memory text matching (not AI Search) and is useful for filtering already-fetched content.

## Content Cleaning

### Bible (USFM)

- Removes alignment markers (`\zaln-s`, `\zaln-e`)
- Extracts word content from `\w word|data\w*` patterns
- Preserves verse markers as numbers
- Removes all other USFM markers
- Result: Clean text ~30x smaller than raw USFM

### Translation Notes (TSV)

- Extracts all columns from TSV rows
- Joins non-empty cells with spaces
- Creates searchable text entries per row

### Translation Words/Academy (Markdown)

- Removes code blocks
- Strips link syntax, keeps text
- Removes bold/italic markers
- Preserves readable content

## Metadata Extraction

### Scripture Files

Metadata is extracted from:

- **File path**: `43-JHN.usfm` → book: "JHN"
- **Content**: `\c 3\n\v 16` → chapter: 3, verse: 16

### Translation Words

Metadata is extracted from:

- **File path**: `bible/kt/grace.md` → articleId: "grace", category: "kt"
- **Content**: `# Grace\n...` → title: "Grace"

### Translation Academy

Metadata is extracted from:

- **File path**: `translate/figs-metaphor/01.md` → articleId: "figs-metaphor", category: "translate"
- **Content**: `# Metaphor\n...` → title: "Metaphor"

## Local Development

AI Search is not available in local development. When running locally:

1. The search endpoint returns an informational message
2. Use resource-specific endpoints which work locally
3. Deploy to production to test AI Search functionality

## Troubleshooting

### "AI Search not available"

This is expected in local development. Deploy to production to use AI Search.

### No search results

1. Content may not be indexed yet - access resources once to trigger cleaning
2. Check filter parameters - narrow filters may exclude results
3. Verify AI Search index is active in Cloudflare dashboard

### Search results missing metadata

1. Content was indexed before metadata enhancement
2. Access the resource again to re-trigger cleaning
3. Check R2 for the `/clean/` prefix structure

## Configuration

### wrangler.toml

```toml
[ai]
binding = "AI"
```

### AI Search Index

Created in Cloudflare dashboard:

- Name: `translation-helps-search`
- Source: R2 bucket
- File types: `.txt`, `.md`, `.json`

### Duplicate Prevention

AI Search indexes all matching files in R2, not just the `/clean/` prefix. To prevent duplicates from raw content files, the search endpoint applies post-filtering:

1. Only results with paths starting with `clean/` are returned
2. Debug logs track how many duplicates are filtered out
3. The `total_hits` field shows the count after filtering

This ensures clean, processed content is always returned regardless of what AI Search indexes.
