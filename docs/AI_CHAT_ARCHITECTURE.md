# AI Chat Architecture Documentation

This document describes the architecture and key decisions for the Translation Helps MCP AI Chat implementation.

## Overview

The AI Chat system provides an intelligent Bible study assistant that uses OpenAI GPT-4o-mini to answer questions while strictly adhering to Translation Helps MCP data sources.

## Architecture Components

### 1. `/api/chat-stream` - AI-Powered Chat Endpoint

**Purpose**: Provides intelligent, contextual responses using LLM + MCP data

**Key Features**:

- Uses OpenAI GPT-4o-mini for natural language understanding and generation
- Dynamically discovers available endpoints via `/api/mcp-config` (self-discoverable)
- LLM intelligently decides which MCP endpoints to call based on user query
- LLM chooses optimal response format (md/text/json) for each endpoint
- Enforces strict citation and quotation rules

**Data Flow**:

1. User sends natural language query
2. System discovers available MCP endpoints dynamically
3. LLM analyzes query and determines relevant endpoints to call
4. System executes MCP calls with LLM-chosen parameters and formats
5. LLM generates response using ONLY the MCP data
6. Response includes proper citations and exact quotes

### 2. `/api/experimental/query-router` - Pattern Matching Router

**Purpose**: Simple, deterministic pattern-based routing for quick lookups

**Key Features**:

- No AI required - uses regex patterns
- Fast, predictable responses
- Good for simple, direct queries
- Experimental feature for specific use cases

## Critical Design Decisions

### 1. Self-Discovery Over Hardcoding

**Decision**: The AI chat MUST discover endpoints dynamically via `/api/mcp-config`

**Rationale**:

- Maintains the self-discoverable nature of MCP
- Automatically adapts when new endpoints are added
- No code changes needed for new functionality
- True to the MCP philosophy

**Implementation**:

```javascript
// GOOD: Dynamic discovery
const endpoints = await discoverMCPEndpoints(baseUrl);

// BAD: Hardcoded endpoints
const MCP_ENDPOINTS = [...]; // NEVER DO THIS
```

### 2. LLM-Driven Endpoint Selection

**Decision**: Let the LLM decide which endpoints to call

**Rationale**:

- Leverages AI's understanding of natural language
- Can handle complex, multi-faceted queries
- More flexible than pattern matching
- Can combine multiple data sources intelligently

### 3. Format Selection by LLM

**Decision**: Let the LLM choose the response format (md/text/json)

**Rationale**:

- Markdown is better for human-readable quotes
- JSON is better for structured data processing
- LLM knows which format suits its response needs
- Reduces unnecessary parsing/reformatting

**Guidelines Given to LLM**:

- "md" (Markdown) for human-readable content to quote
- "text" for simple plain text needs
- "json" only if structured data processing is needed
- Default to "md" format when available

### 4. Strict Content Rules

**Decision**: Enforce strict rules via system prompt and documentation

**Key Rules**:

1. Scripture must be quoted word-for-word - NO paraphrasing
2. Every quote must include proper citation [Resource - Reference]
3. Only use MCP data - NO external knowledge or web searches
4. May reword translation notes but must cite sources

**Enforcement**:

- System prompt explicitly states these rules
- Documentation in `AI_CHAT_RULES.md`
- Response validation could be added

## Error Handling

### API Key Configuration

- Check for `OPENAI_API_KEY` at startup
- Return clear error message if not configured
- Support both `VITE_OPENAI_API_KEY` and `process.env.OPENAI_API_KEY`

### Endpoint Discovery Failures

- Fallback gracefully if `/api/mcp-config` fails
- Log errors for debugging
- Return user-friendly error messages

### LLM Call Failures

- Handle OpenAI API errors gracefully
- Log detailed error information
- Provide fallback responses when possible

## Configuration

### Environment Variables

```bash
# Required for AI chat functionality
OPENAI_API_KEY=sk-...

# Optional - defaults shown
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.3
OPENAI_MAX_TOKENS=1000
```

### Model Selection

- Default: `gpt-4o-mini` for cost efficiency
- Temperature: 0.3 for factual, consistent responses
- Max tokens: 1000 for reasonable response length

## Testing Strategy

### Unit Tests

- Test endpoint discovery logic
- Test LLM prompt generation
- Test response formatting
- Test citation extraction

### Integration Tests

- Test full chat flow with mock OpenAI responses
- Test error handling scenarios
- Test format selection logic
- Verify citation compliance

### Manual Testing Checklist

- [ ] Verify scripture queries return exact quotes
- [ ] Verify all quotes include citations
- [ ] Test with unavailable data (should say "not available")
- [ ] Test complex multi-resource queries
- [ ] Verify no external knowledge is used
- [ ] Test with different response formats

## Monitoring and Debugging

### Logging

- Log all LLM decisions (which endpoints, which formats)
- Log MCP call performance
- Log any parsing errors
- Log OpenAI API usage

### X-Ray Tracing

- Include in response when `enableXRay: true`
- Show all MCP calls made
- Show timing information
- Show LLM decision process

## Future Enhancements

### Potential Improvements

1. Response caching for common queries
2. **Streaming responses for better UX** - Cloudflare Workers support streaming via TransformStream
3. Multi-language support
4. Context window management for long conversations
5. Fine-tuning on Bible study conversations
6. Automatic citation validation
7. Response quality metrics

#### Streaming Implementation (Future Enhancement)

Cloudflare Workers support streaming responses using the Streams API. This would allow real-time display of AI responses as they're generated:

```javascript
// Example streaming implementation
export default {
  async fetch(request, env, ctx) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const textEncoder = new TextEncoder();

    // Process streaming response in background
    ctx.waitUntil(
      (async () => {
        const stream = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [...],
          stream: true,
        });

        for await (const part of stream) {
          const content = part.choices[0]?.delta?.content || "";
          await writer.write(textEncoder.encode(content));
        }
        writer.close();
      })()
    );

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
    });
  }
};
```

Benefits:

- Immediate visual feedback
- Reduced perceived latency
- Better user engagement
- Natural conversation flow

### Anti-Patterns to Avoid

- ❌ Hardcoding endpoint lists
- ❌ Allowing paraphrased scripture
- ❌ Missing citations
- ❌ Using external knowledge
- ❌ Forcing JSON format for all calls
- ❌ Ignoring self-discovery capabilities

## Migration Notes

### From Pattern-Matching Chat

The previous `/api/chat` endpoint has been moved to `/api/experimental/query-router`. Update any direct API calls:

```javascript
// Old
fetch('/api/chat', ...)

// New AI-powered
fetch('/api/chat-stream', ...)

// Pattern-matching (if needed)
fetch('/api/experimental/query-router', ...)
```

## Security Considerations

1. **API Key Protection**: Never expose OpenAI API key to client
2. **Input Validation**: Sanitize user queries before processing
3. **Rate Limiting**: Implement to prevent abuse
4. **Response Validation**: Ensure no injection attacks via MCP data
5. **Citation Verification**: Could add automated checks

## Performance Considerations

1. **Endpoint Discovery**: Cache `/api/mcp-config` results
2. **Parallel MCP Calls**: Execute independent calls simultaneously
3. **Response Streaming**: Consider implementing for better perceived performance
4. **Token Optimization**: Monitor and optimize prompt sizes

---

Last Updated: [Current Date]
Version: 1.0
