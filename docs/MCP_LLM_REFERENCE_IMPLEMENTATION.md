# MCP + LLM Reference Implementation Guide

## Overview

This document describes the reference implementation for integrating MCP (Model Context Protocol) with Large Language Models (LLMs) like OpenAI's GPT-4o-mini. This implementation demonstrates best practices for creating a natural, conversational interface to MCP tools while maintaining data integrity.

## Architecture

```
User Input → LLM → MCP Tool Selection → Tool Execution → LLM Formatting → User Response
     ↑                                                                           ↓
     └───────────────────────── Conversation Loop ──────────────────────────────┘
```

## Key Components

### 1. Dynamic Tool Discovery

Instead of hardcoding tool definitions, discover them dynamically:

```typescript
async function discoverMCPTools(baseUrl: URL): Promise<any[]> {
  const mcpUrl = new URL("/api/mcp", baseUrl);
  const response = await fetch(mcpUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method: "tools/list" }),
  });

  const data = await response.json();
  return data.tools || getDefaultTools();
}
```

### 2. System Prompt Design

The system prompt is crucial for constraining the LLM's behavior:

```typescript
const SYSTEM_PROMPT = `You are a helpful Bible study assistant with access to MCP tools.

CRITICAL RULES:
**MOST IMPORTANT: USE ONLY MCP DATA**
- You MUST ONLY use information from MCP tool responses
- DO NOT use any pre-trained knowledge
- DO NOT interpret beyond what tools provide
- If tools return no data, say so clearly`;
```

### 3. OpenAI Function Calling Integration

Let the LLM decide which tools to use:

```typescript
const openAIResponse = await fetch(OPENAI_API_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages,
    tools: tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    })),
    tool_choice: "auto", // Let LLM decide
  }),
});
```

### 4. Tool Execution

Execute the tools the LLM requests:

```typescript
async function executeToolCalls(
  toolCalls: any[],
  baseUrl: URL,
): Promise<any[]> {
  return Promise.all(
    toolCalls.map(async (toolCall) => {
      const { name, arguments: args } = toolCall.function;

      const mcpUrl = new URL("/api/mcp", baseUrl);
      const response = await fetch(mcpUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "tools/call",
          params: { name, arguments: args },
        }),
      });

      const result = await response.json();
      return {
        tool_call_id: toolCall.id,
        content: result.content?.[0]?.text || JSON.stringify(result),
      };
    }),
  );
}
```

### 5. Final Response Generation

Send tool results back to the LLM for natural formatting:

```typescript
if (assistantMessage.tool_calls) {
  const toolResults = await executeToolCalls(assistantMessage.tool_calls, url);

  // Get final formatted response
  const finalResponse = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        ...messages,
        assistantMessage,
        ...toolResults.map((result) => ({
          role: "tool",
          tool_call_id: result.tool_call_id,
          content: JSON.stringify(result.content),
        })),
      ],
    }),
  });

  const finalAIResponse = await finalResponse.json();
  return finalAIResponse.choices[0].message.content;
}
```

## Best Practices

### 1. Let the LLM Handle Formatting

**DON'T** create elaborate formatting functions:

```typescript
// ❌ BAD: Brittle and hard to maintain
function formatTranslationNotes(data) {
  if (data.notes) {
    return data.notes.map((note) => `- ${note.text}`).join("\n");
  } else if (data.verseNotes) {
    // More brittle logic...
  }
}
```

**DO** provide formatting guidelines in the system prompt:

```typescript
// ✅ GOOD: Flexible and maintainable
const SYSTEM_PROMPT = `Format translation notes as a numbered list...`;
```

### 2. Handle Errors Gracefully

Always provide clear error messages:

```typescript
catch (error) {
  return json({
    content: [{
      type: 'text',
      text: `Error fetching ${toolName}: ${error.message}`
    }]
  });
}
```

### 3. Maintain Transparency with X-Ray

Track all tool usage for debugging:

```typescript
const xrayData = {
  tools: [],
  timeline: [],
  totalTime: 0,
  citations: [],
};

// Add to xrayData during execution
xrayData.tools.push({
  name: toolName,
  params: args,
  duration: Date.now() - startTime,
  response: responsePreview,
});
```

### 4. Smart Link Handling

Convert resource links to actionable prompts:

```typescript
function handleRCLinkClick(href: string) {
  if (href.includes("rc://words/")) {
    const word = extractWordFromLink(href);
    return `Define the biblical term "${word}" and explain its significance`;
  }
  // Handle other link types...
}
```

## Configuration

### Environment Variables

```bash
# Cloudflare Pages secret (not in code!)
OPENAI_API_KEY=sk-...
```

### Edge Runtime Configuration

```typescript
// Required for Cloudflare Pages
export const config = {
  runtime: "edge",
};
```

## Testing Your Implementation

### 1. Basic Functionality

- Ask for a Bible verse: "Show me John 3:16"
- Request translation notes: "Notes for Titus 1:1"
- Define a word: "What does agape mean?"

### 2. Error Handling

- Invalid reference: "Show me John 99:99"
- Unavailable resource: "Notes for a non-existent book"
- Network failures: Disconnect and test

### 3. Edge Cases

- Multiple tools in one request
- Long responses requiring truncation
- Special characters in references

### 4. Performance

- Check X-ray timing data
- Monitor cache hit rates
- Measure total response time

## Common Pitfalls to Avoid

1. **Hardcoding tool definitions** - Use dynamic discovery
2. **Complex formatting logic** - Let the LLM format
3. **Ignoring edge runtime limits** - No Node.js APIs
4. **Exposing API keys** - Use environment secrets
5. **Allowing pre-trained knowledge** - Enforce MCP-only data

## Example Implementation

See `/ui/src/routes/api/chat/+server.ts` for the complete reference implementation that:

- Discovers MCP tools dynamically
- Uses OpenAI function calling
- Handles errors gracefully
- Provides X-ray debugging
- Formats responses naturally
- Maintains data integrity

## Conclusion

This reference implementation demonstrates how to create a powerful, flexible interface to MCP tools using LLMs while maintaining strict data integrity. The key is to leverage the LLM's natural language capabilities while constraining it to only use verified MCP data.
