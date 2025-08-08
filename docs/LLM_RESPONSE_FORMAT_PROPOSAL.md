# LLM-First Response Format Proposal

## Problem Statement

Currently, all API responses are JSON-formatted, even when the content is primarily text. This creates unnecessary complexity for LLM consumption and mixes metadata with content.

## Proposed Solution

### 1. Content-First Responses

When `format=text` or `format=md`:

- Return the actual content as the response body
- Move all metadata to response headers

### 2. Header Structure

```
X-Resource: UST
X-Language: en
X-Organization: unfoldingWord
X-Cache-Status: hit
X-Response-Time: 23
X-Trace-Id: fetch-scripture_1754600055567_w2wvu3jgy
X-Xray-Trace: base64encoded(json)
```

### 3. Format Options

#### `format=text` (LLM-optimized)

- Plain text response
- No JSON wrapper
- Metadata in headers
- Example:
  ```
  For God so loved the world, that he gave his One and Only Son,
  so that everyone believing in him would not perish but would
  have eternal life. -John 3:16 (ULT v86, unfoldingWord)
  ```

#### `format=md` (Markdown)

- Markdown-formatted response
- Includes citations inline
- Metadata in headers
- Example:

  ```markdown
  ## John 3:16 (ULT)

  For God so loved the world, that he gave his One and Only Son,
  so that everyone believing in him would not perish but would
  have eternal life.

  ---

  _Source: unfoldingWord Literal Text (ULT) v86_
  ```

#### `format=json` (Current default)

- Full JSON response
- Backward compatible
- Includes xrayTrace in body
- Current behavior unchanged

### 4. Implementation Notes

1. **Content Negotiation**
   - Use `Accept` header as primary format selector
   - Fall back to `format` query parameter
   - Default to JSON for backward compatibility

2. **X-Ray Trace in Headers**
   - For non-JSON formats, encode xrayTrace as base64
   - Include decoding instructions in API docs
   - Keep raw JSON in header for debugging

3. **Multi-Resource Responses**
   - For endpoints returning multiple resources (like all 4 Bibles)
   - Use markdown with clear separators
   - Or return multipart responses

### 5. Benefits

1. **LLM-Friendly**: Direct text consumption without parsing
2. **Cleaner Separation**: Content vs metadata
3. **Smaller Payloads**: No JSON overhead for text
4. **Better Caching**: Headers don't affect content hash
5. **Progressive Enhancement**: Start simple, add complexity as needed

### 6. Example Implementation

```typescript
// In RouteGenerator.ts
private formatResponse(
  data: any,
  format: string,
  metadata: any
): { body: string; headers: Record<string, string> } {

  if (format === 'text' || format === 'md') {
    // Extract primary content
    const content = this.extractContent(data, format);

    // Build headers from metadata
    const headers = {
      'Content-Type': format === 'md' ? 'text/markdown' : 'text/plain',
      'X-Cache-Status': metadata.cached ? 'hit' : 'miss',
      'X-Response-Time': String(metadata.responseTime),
      'X-Trace-Id': metadata.traceId,
      // Encode complex data
      'X-Xray-Trace': Buffer.from(
        JSON.stringify(metadata.xrayTrace)
      ).toString('base64')
    };

    return { body: content, headers };
  }

  // Default JSON response
  return {
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  };
}
```

### 7. Discoverability for LLMs

#### Option 1: Response Headers Always Include Format Options

```
X-Available-Formats: json,text,md
X-Recommended-Format-LLM: text
```

#### Option 2: Error Response Hints

When an LLM makes a request without format specified:

```json
{
  "data": {...},
  "_hint": "For LLM-optimized responses, add ?format=text or ?format=md to your request"
}
```

#### Option 3: API Documentation in Every Response

Include a `_links` section in JSON responses:

```json
{
  "data": {...},
  "_links": {
    "text": "/api/fetch-scripture?reference=John+3:16&format=text",
    "markdown": "/api/fetch-scripture?reference=John+3:16&format=md",
    "documentation": "/api/docs#formats"
  }
}
```

#### Option 4: Smart Content Negotiation

Detect LLM user agents or API keys:

- If User-Agent contains "Claude", "GPT", "LLM", etc.
- If API key is tagged as LLM usage
- Automatically serve text/md format

### 8. Migration Path

1. **Phase 1**: Add format support with discovery hints
2. **Phase 2**: Document LLM-friendly formats prominently
3. **Phase 3**: Monitor usage patterns
4. **Phase 4**: Consider smart defaults based on client type
