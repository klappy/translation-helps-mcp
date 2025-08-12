# API Endpoints Reference

## Base URL

All v2 endpoints are available at:

```
https://api.translation.helps/api/v2/
```

## Common Parameters

Most endpoints accept these standard parameters:

| Parameter      | Type   | Required | Description                                          |
| -------------- | ------ | -------- | ---------------------------------------------------- |
| `reference`    | string | Usually  | Bible reference (e.g., "John 3:16", "Genesis 1:1-5") |
| `language`     | string | Often    | Language code (e.g., "en", "es", "fr")               |
| `organization` | string | Often    | Organization name (e.g., "unfoldingWord")            |

## Response Format

All endpoints return consistent JSON responses:

### Success Response

```json
{
  "data_field": [...],  // "scripture", "items", etc.
  "metadata": {
    "totalCount": 10,
    "reference": "John 3:16",
    "language": "en",
    "organization": "unfoldingWord"
  }
}
```

### Error Response

```json
{
  "error": "Human-readable error message",
  "endpoint": "endpoint-name",
  "status": 400
}
```

## Scripture Endpoints

### GET /fetch-scripture

Fetches scripture text in multiple translations.

**Parameters:**

- `reference` (required) - Bible reference
- `language` - Language code (default: "en")
- `organization` - Organization (default: "unfoldingWord")
- `resource` - Comma-separated resources (e.g., "ult,ust")
- `format` - Response format: "json", "text", "md"

**Response:**

```json
{
  "scripture": [
    {
      "reference": "John 3:16",
      "text": "For God so loved the world...",
      "resource": "ult",
      "version": "ULT",
      "citation": "John 3:16 (ULT)"
    }
  ],
  "metadata": {...}
}
```

### GET /fetch-ult-scripture

Fetches only ULT (unfoldingWord Literal Text) translation.

**Parameters:** Same as fetch-scripture (minus `resource`)

### GET /fetch-ust-scripture

Fetches only UST (unfoldingWord Simplified Text) translation.

**Parameters:** Same as fetch-scripture (minus `resource`)

## Translation Helps Endpoints

### GET /translation-notes

Fetches translation notes for a reference.

**Parameters:**

- `reference` (required)
- `language`
- `organization`

**Response:**

```json
{
  "items": [
    {
      "id": "tn001",
      "reference": "John 3:16",
      "noteType": "general",
      "text": "This verse contains...",
      "quote": "For God so loved"
    }
  ],
  "metadata": {...}
}
```

### GET /translation-questions

Fetches comprehension questions.

**Parameters:** Same as translation-notes

### GET /fetch-translation-words

Fetches key term definitions.

**Parameters:**

- `reference` (required)
- `language`
- `includeAlignment` - Include word alignment data

### GET /browse-translation-words

Browse all translation words.

**Parameters:**

- `language` (required)
- `category` - Filter by category
- `letter` - Filter by starting letter

### GET /fetch-translation-academy

Fetches translation academy articles.

**Parameters:**

- `reference` (required)
- `language`
- `topic` - Specific topic to fetch

## Discovery Endpoints

### GET /simple-languages

Lists available languages.

**Response:**

```json
{
  "items": [
    {
      "code": "en",
      "name": "English",
      "direction": "ltr",
      "resources": {
        "ult": true,
        "ust": true,
        "tn": true
      }
    }
  ],
  "metadata": {...}
}
```

### GET /get-available-books

Lists available Bible books.

**Parameters:**

- `language` (required)
- `organization`

### GET /list-available-resources

Lists available resource types.

**Parameters:**

- `language`
- `includeMetadata` - Include detailed metadata

### GET /resource-catalog

Browse the full resource catalog.

**Parameters:**

- `metadataType` - Type of metadata (e.g., "rc", "sb")
- `subject` - Filter by subject
- `language` - Filter by language

## Utility Endpoints

### GET /health

Basic health check.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:00:00Z"
}
```

### GET /health-dcs

Checks DCS API connectivity.

### GET /extract-references

Extracts Bible references from text.

**Parameters:**

- `text` (required) - Text to analyze

### GET /get-context

Aggregates all resources for a reference.

**Parameters:**

- `reference` (required)
- `includeEmpty` - Include empty resources

**Response:**

```json
{
  "scripture": [...],
  "translationNotes": [...],
  "translationWords": [...],
  "translationQuestions": [...],
  "translationAcademy": [...],
  "metadata": {...}
}
```

### GET /resource-recommendations

AI-powered resource recommendations.

**Parameters:**

- `reference` (required)
- `userRole` - User's role (e.g., "translator", "reviewer")
- `context` - Additional context

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per IP
- Contact support for higher limits

## Caching

Responses include cache headers:

- `X-Cache-Status` - "hit", "miss", "partial"
- `Cache-Control` - Caching directives

## Examples

### Fetch Scripture

```bash
curl "https://api.translation.helps/api/v2/fetch-scripture?reference=John%203:16&resource=ult,ust"
```

### Get Translation Notes

```bash
curl "https://api.translation.helps/api/v2/translation-notes?reference=Genesis%201:1&language=en"
```

### Browse Languages

```bash
curl "https://api.translation.helps/api/v2/simple-languages"
```

## Migration from v1

## Developer Tools

### API Explorer

Interactive web interface for testing endpoints: `/api-explorer`
See `API_EXPLORER_GUIDE.md` for details.

### Endpoint Generator

Create new endpoints following established patterns:

```bash
npm run create-endpoint
```

## Additional Resources

- `NEXT_PHASE_ROADMAP.md` - Migration guide from v1 endpoints
- `ARCHITECTURE.md` - System architecture overview
- `API_EXPLORER_GUIDE.md` - Visual API testing guide
