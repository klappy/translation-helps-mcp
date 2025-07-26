# MCP Response Adapter Documentation

## Overview
The MCPResponseAdapter provides a robust solution for handling various response formats from MCP (Model Context Protocol) tools, preventing brittle failures in the chat system due to data shape changes.

## Problem Statement
The chat system was failing when MCP tools returned data in unexpected formats. For example:
- Translation notes returning empty numbered lists
- Different tools using different response structures
- Missing or undefined fields causing crashes

## Solution Architecture

### Core Principles
1. **Multiple Fallback Strategies**: Try various extraction methods before failing
2. **Format Agnostic**: Handle arrays, objects, strings, and numbered items
3. **Graceful Degradation**: Always return meaningful content or error messages
4. **Type Safety**: Strong TypeScript interfaces for predictable behavior

### Key Components

#### 1. Response Extraction
```typescript
static extractText(response: MCPResponse, defaultText: string = ''): string
```
Extracts text content using multiple strategies:
- Standard MCP content array format
- Direct text fields
- Content as string
- Numbered object properties
- Common field names (message, data, result, etc.)

#### 2. Format-Specific Methods
- `formatTranslationNotes()`: Handles translation notes with automatic numbering
- `formatTranslationQuestions()`: Formats questions appropriately
- `formatScripture()`: Adds verse numbers when missing
- `formatTranslationWord()`: Extracts definitions and examples

#### 3. Error Handling
- `extractError()`: Safely extracts error messages from various formats
- `isSuccessResponse()`: Determines if a response contains valid content

## Usage Example

```typescript
import { MCPResponseAdapter } from '$lib/adapters/MCPResponseAdapter';

// In the chat endpoint
const result = await toolResponse.json();
const notesText = MCPResponseAdapter.formatTranslationNotes(result, reference);
```

## Response Format Examples

### Standard MCP Format
```json
{
  "content": [
    {
      "type": "text",
      "text": "**1.** First note\n\n**2.** Second note"
    }
  ]
}
```

### Numbered Object Format
```json
{
  "content": {
    "1": "First item",
    "2": "Second item",
    "3": "Third item"
  }
}
```

### Direct Text Format
```json
{
  "text": "Direct text content"
}
```

### Structured Data Array
```json
{
  "data": [
    { "note": "First translation note" },
    { "note": "Second translation note" }
  ]
}
```

## Benefits

1. **Resilience**: Chat system continues working even when MCP tools change response formats
2. **Consistency**: Users always see properly formatted content
3. **Maintainability**: Single point of adaptation for all MCP responses
4. **Testability**: Comprehensive test suite ensures reliability

## Testing

The adapter includes extensive unit tests covering:
- Various response formats
- Error conditions
- Edge cases
- Format-specific requirements

Run tests with:
```bash
cd ui && npx vitest run src/lib/adapters/MCPResponseAdapter.test.ts
```

## Future Enhancements

1. **Response Validation**: Add schema validation for known response types
2. **Performance Monitoring**: Track which extraction strategies are most used
3. **Format Migration**: Help tools migrate to standardized formats
4. **Caching**: Cache extraction patterns for frequently used tools

## Best Practices

1. **Always Use the Adapter**: Never directly access `response.content[0].text`
2. **Provide Context**: Pass reference/context to format methods for better error messages
3. **Test New Tools**: Add tests when integrating new MCP tools
4. **Monitor Failures**: Log when fallback strategies are used

## Migration Guide

### Before (Brittle)
```typescript
const notesText = result.content?.[0]?.text || 'No translation notes found';
```

### After (Robust)
```typescript
const notesText = MCPResponseAdapter.formatTranslationNotes(result, reference);
```

This adapter pattern ensures the chat system remains functional regardless of how MCP tools evolve their response formats.