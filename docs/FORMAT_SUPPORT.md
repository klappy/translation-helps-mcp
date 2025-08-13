# Format Support in Translation Helps MCP

## Overview

All v2 endpoints now support multiple response formats optimized for different consumption scenarios:

- **JSON** (default) - Structured data for programmatic access
- **Markdown** - Human-readable format with rich formatting
- **Text** - Plain text format for simple consumption

## Usage

Add the `format` parameter to any v2 endpoint:

```bash
# JSON (default)
GET /api/v2/fetch-scripture?reference=John%203:16&format=json

# Markdown
GET /api/v2/fetch-scripture?reference=John%203:16&format=md

# Plain Text
GET /api/v2/fetch-scripture?reference=John%203:16&format=text
```

## Response Headers

The Content-Type header is automatically set based on the format:

- JSON: `application/json`
- Markdown: `text/markdown; charset=utf-8`
- Text: `text/plain; charset=utf-8`

## Format Examples

### Scripture Endpoint

**JSON Response:**

```json
{
  "scripture": [
    {
      "reference": "John 3:16",
      "text": "For God loved the world...",
      "resource": "ult",
      "language": "en"
    }
  ],
  "metadata": { ... }
}
```

**Markdown Response:**

```markdown
# John 3:16

## Metadata

- **Language**: en
- **Organization**: unfoldingWord
- **Resources**: ult, ust

## Scripture Text

### John 3:16

**ULT**: For God loved the world...
```

**Text Response:**

```
John 3:16
=========

John 3:16: For God loved the world...
(ULT)

---
Language: en
Organization: unfoldingWord
```

### Translation Helps Endpoints

**Markdown Response (Translation Notes):**

```markdown
# Translation Helps

**Reference**: John 3:16

## 1. Note (general)

God's love for the world is the motivation...

**Support Reference**: rc://\*/ta/man/translate/figs-explicit

## 2. Note (key-term)

The word "world" here refers to all people.
```

**Text Response (Translation Questions):**

```
TRANSLATION QUESTIONS
====================

Reference: John 3:16

1. What motivated God to give his Son?
----------------------------------------
God's love for the world motivated him to give his Son.

2. What happens to those who believe?
----------------------------------------
They will not perish but have eternal life.
```

### List Endpoints

**Markdown Response (Languages):**

```markdown
# Available Languages

## Summary

- **Total Count**: 45
- **Filtered By**: {"resource": "ult"}

## Items

| code | name    | direction | resources                         |
| ---- | ------- | --------- | --------------------------------- |
| en   | English | ltr       | ["ult","ust","tn","tw","tq","ta"] |
| es   | Español | ltr       | ["ult","ust","tn","tw"]           |
```

## Enabling Format Support

To enable format support on a v2 endpoint:

```typescript
export const GET = createSimpleEndpoint({
  name: 'my-endpoint',
  params: [...],

  // Enable all formats
  supportsFormats: true,

  // Or specify allowed formats
  supportsFormats: ['json', 'md'],

  fetch: myFetchFunction
});
```

## LLM Optimization

The text and markdown formats are optimized for LLM consumption:

1. **Clear Structure**: Headers and sections are clearly delineated
2. **Minimal Noise**: No JSON syntax or unnecessary metadata
3. **Context Preservation**: All important data is included but formatted for readability
4. **Consistent Patterns**: Similar data types use similar formatting across endpoints

## Implementation Details

The format support is implemented through:

1. **responseFormatter.ts** - Core formatting logic with specialized formatters for different data types
2. **simpleEndpoint.ts** - Automatic format parameter handling and response transformation
3. **Content negotiation** - Proper Content-Type headers based on format

## Best Practices

1. **Default to JSON** for programmatic access
2. **Use Markdown** for documentation or human review
3. **Use Text** for simple logging or command-line tools
4. **Include metadata** flag controls whether auxiliary information is included
