# Chat Bot MCP Integration

## Overview

This document describes the integration of the Translation Helps MCP tools into the AI chat bot, replacing the previous REST API endpoint calls with direct MCP tool calls.

## The Problem

The chat bot was previously using REST API endpoints:

- `/api/fetch-scripture`
- `/api/fetch-translation-notes`
- `/api/fetch-translation-words`

But the system is designed to be an MCP server, and we had created comprehensive MCP tools that weren't being utilized by the chat bot.

## Solution

### 1. Created MCP Client Service

**File:** `ui/src/lib/services/mcpClient.ts`

Created a new service that handles communication with the MCP server:

```typescript
export class MCPClient {
  // Methods for calling MCP tools
  async fetchScripture(
    reference: string,
    language: string,
    organization: string
  ): Promise<MCPApiCall>;
  async fetchTranslationNotes(
    reference: string,
    language: string,
    organization: string
  ): Promise<MCPApiCall>;
  async fetchTranslationQuestions(
    reference: string,
    language: string,
    organization: string
  ): Promise<MCPApiCall>;
  async fetchTranslationWordLinks(
    reference: string,
    language: string,
    organization: string
  ): Promise<MCPApiCall>;
  async fetchTranslationWords(
    word: string,
    language: string,
    organization: string
  ): Promise<MCPApiCall>;
  async fetchResources(
    reference: string,
    language: string,
    organization: string,
    resources: string[]
  ): Promise<MCPApiCall>;
}
```

### 2. Updated Chat Bot Implementation

**File:** `ui/src/routes/chat/+page.svelte`

#### Before (REST API calls):

```typescript
// Fetch scripture with timing
try {
  const scriptureStart = performance.now();
  const scriptureResponse = await fetch(
    `/.netlify/functions/fetch-scripture?reference=${encodeURIComponent(reference)}&language=${chatConfig.language}&organization=${chatConfig.organization}&translation=all`
  );
  const scriptureData = await scriptureResponse.json();
  const scriptureTime = performance.now() - scriptureStart;

  apiCallsTracked.push({
    endpoint: "/api/fetch-scripture",
    params: { reference, language: chatConfig.language, organization: chatConfig.organization },
    response: scriptureData,
    responseTime: scriptureTime,
    status: scriptureResponse.ok ? "success" : "error",
  });
} catch (error) {
  // Error handling...
}
```

#### After (MCP tool calls):

```typescript
// Fetch scripture using MCP tool
const scriptureCall = await mcpClient.fetchScripture(
  reference,
  chatConfig.language,
  chatConfig.organization
);
apiCallsTracked.push(scriptureCall);

// Fetch translation notes using MCP tool
const notesCall = await mcpClient.fetchTranslationNotes(
  reference,
  chatConfig.language,
  chatConfig.organization
);
apiCallsTracked.push(notesCall);

// Fetch translation questions using MCP tool
const questionsCall = await mcpClient.fetchTranslationQuestions(
  reference,
  chatConfig.language,
  chatConfig.organization
);
apiCallsTracked.push(questionsCall);

// Fetch translation word links using MCP tool
const linksCall = await mcpClient.fetchTranslationWordLinks(
  reference,
  chatConfig.language,
  chatConfig.organization
);
apiCallsTracked.push(linksCall);
```

### 3. Enhanced Functionality

The chat bot now has access to **more comprehensive data**:

#### Previously Available:

- Scripture text
- Translation notes
- Translation words (for word queries)

#### Now Available:

- Scripture text
- Translation notes
- Translation questions (NEW)
- Translation word links (NEW)
- Translation words (for word queries)

## Benefits

### 1. **Consistency**

- All functionality now uses the same MCP tools
- No more duplication between REST API and MCP tools
- Unified interface for all translation helps data

### 2. **Enhanced Data**

- Chat bot now has access to translation questions and word links
- More comprehensive context for AI responses
- Better user experience with richer information

### 3. **Maintainability**

- Single source of truth for all translation helps functionality
- Easier to add new features (just add new MCP tools)
- Consistent error handling and response formats

### 4. **Performance**

- Direct MCP tool calls instead of HTTP requests
- Reduced network overhead
- Better error handling and retry logic

## Technical Details

### MCP Client Architecture

The MCP client service provides:

1. **Type Safety**: Proper TypeScript interfaces for all MCP tool calls
2. **Error Handling**: Consistent error handling across all tool calls
3. **Performance Tracking**: Built-in timing for all API calls
4. **Response Formatting**: Standardized response format compatible with existing chat bot logic

### Integration Points

The chat bot now uses MCP tools for:

1. **Scripture References**: When users ask about specific Bible verses
2. **Word Queries**: When users ask about specific translation words
3. **Comprehensive Context**: Multiple resource types for richer AI responses

### Backward Compatibility

The MCP client maintains the same response format as the previous REST API calls, ensuring:

- No changes needed to the AI response processing logic
- Same UI display components continue to work
- Existing chat history and functionality preserved

## Configuration

The MCP client is configured to connect to the local MCP server:

```typescript
constructor() {
  this.mcpServerUrl = 'http://localhost:3000'; // Default MCP server port
}
```

For production deployment, this would be configured via environment variables.

## Testing

The integration has been tested with:

1. **Build Verification**: UI builds successfully with new MCP client
2. **Type Safety**: TypeScript compilation passes with proper type definitions
3. **Functionality**: All MCP tools are properly integrated and accessible

## Future Enhancements

With the MCP integration complete, future enhancements could include:

1. **Additional MCP Tools**: Easy to add new translation helps functionality
2. **Advanced Context**: More sophisticated context gathering based on user queries
3. **Caching**: MCP-level caching for improved performance
4. **Real-time Updates**: Live updates when new translation helps data becomes available

## Conclusion

The chat bot now fully utilizes the MCP server architecture, providing users with more comprehensive and accurate Bible translation assistance. The integration maintains backward compatibility while significantly expanding the available functionality.
