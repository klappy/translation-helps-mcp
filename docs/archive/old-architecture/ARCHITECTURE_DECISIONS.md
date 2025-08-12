# Architecture Decisions and Lessons Learned

## Overview

This document captures critical architectural decisions made during the development of the Translation Helps MCP system, particularly focusing on the chat interface and LLM integration. These decisions were made after experiencing various issues and are meant to prevent similar problems in the future.

## Core Principles

### 1. MCP-Only Data (No Pre-trained Knowledge)

**Decision**: The LLM must ONLY use data from MCP tool responses, never its pre-trained knowledge.

**Why**:

- Ensures data integrity and verifiability
- Prevents hallucinations or incorrect biblical interpretations
- All information can be traced back to unfoldingWord resources
- Users can trust that responses are from authoritative sources

**Implementation**:

- System prompt explicitly forbids using pre-trained knowledge
- Clear instructions to report when data is not available
- No gap-filling with "common knowledge"

### 2. Dynamic Tool Discovery Over Hardcoding

**Decision**: Use MCP's `tools/list` method to dynamically discover available tools.

**Why**:

- Prevents brittle hardcoded tool definitions
- Allows tools to evolve without updating the chat interface
- Reduces synchronization errors between layers

**Implementation**:

```typescript
const tools = await discoverMCPTools(url, fetch);
// Pass discovered tools to OpenAI for function calling
```

### 3. LLM-Driven Formatting (Not Programmatic)

**Decision**: Let the LLM format responses naturally instead of using extensive programmatic formatting functions.

**Why**:

- Previous attempts with 100+ lines of formatting code were fragile
- LLM can adapt to different data shapes naturally
- Reduces maintenance burden
- More flexible and conversational output

**What NOT to do**:

```typescript
// ❌ DON'T: Create elaborate formatting functions
function formatTranslationNotes(data) {
  // 50+ lines of brittle formatting logic
}
```

**What to do**:

```typescript
// ✅ DO: Let the LLM format based on guidelines
const SYSTEM_PROMPT = `Format responses naturally with proper citations...`;
```

### 4. Proper Citation and Attribution

**Decision**: Every piece of information must be properly cited with its source.

**Format**:

- Scripture: `(John 3:16 ULT)`
- Translation Notes: `Translation Notes for [reference]`
- Translation Words: `Translation Word: [word]`
- Study Questions: `Study Questions for [reference]`
- Translation Academy: `Translation Academy: [article]`

### 5. Edge Runtime Compatibility

**Decision**: All server-side routes must be edge-runtime compatible.

**Requirements**:

- Export `const config = { runtime: 'edge' }`
- No Node.js-specific APIs
- No `window` or `document` access
- Use `platform.env` for environment variables in Cloudflare

### 6. Smart RC Link Handling

**Decision**: RC links should generate intelligent prompts when clicked.

**Implementation**:

- Parse link type and generate appropriate prompt
- Word links: "Define the biblical term X and explain its significance"
- TA articles: "Show me the Translation Academy article about X"
- Bible links: Direct scripture references

### 7. X-Ray Debugging Features

**Decision**: Maintain comprehensive debugging visibility.

**Features**:

- Track all tool calls with timing
- Show cache hit/miss status
- Display full execution timeline
- Include all parameters and responses

## Anti-Patterns to Avoid

### 1. Hardcoding Field Names

**Problem**: Hardcoding specific field names leads to brittle code.

```typescript
// ❌ AVOID
const notes = data.verseNotes || data.notes || data.Notes;
```

**Solution**: Let the LLM handle varying data structures.

### 2. Over-Engineering Responses

**Problem**: Creating complex formatting functions for every data type.

**Solution**: Provide formatting guidelines to the LLM and let it handle presentation.

### 3. Mixing Concerns

**Problem**: Having the chat endpoint handle both tool selection AND formatting.

**Solution**: Use OpenAI's function calling for tool selection, let the LLM format.

### 4. Ignoring SSR/CSR Boundaries

**Problem**: Using browser APIs during server-side rendering.

```typescript
// ❌ Will crash during SSR
document.addEventListener("click", handler);
```

**Solution**: Always check `if (browser)` before using browser APIs.

### 5. Incomplete Error Handling

**Problem**: Generic error messages that don't help debugging.

**Solution**: Detailed error messages with context:

```typescript
throw new Error(
  `Failed to fetch translation notes: ${response.status} - ${errorData.error}`,
);
```

## Testing Checklist

Before deploying any changes:

1. **Build Test**: `npm run build:cloudflare --prefix ui`
2. **SSR Safety**: No browser APIs in server code
3. **Edge Compatibility**: No Node.js-specific imports
4. **Error Messages**: Clear, actionable error responses
5. **Citations**: All data properly attributed
6. **MCP-Only**: No pre-trained knowledge leaking through

## Environment Configuration

### Cloudflare Pages Secrets

```bash
# Add OpenAI API key as a secret (not in wrangler.toml)
npx wrangler pages secret put OPENAI_API_KEY
```

### Required Environment Variables

- `OPENAI_API_KEY`: For LLM integration (as a secret, not in code)

## Common Issues and Solutions

### Issue: "Tool endpoint failed: 400"

**Cause**: Missing required parameters or invalid format
**Solution**:

- Check parameter validation in endpoint
- Add detailed logging
- Ensure defaults are applied

### Issue: Build fails with "Cannot resolve import"

**Cause**: Using Node.js-specific packages in edge runtime
**Solution**: Remove or replace with edge-compatible alternatives

### Issue: 500 error on page refresh

**Cause**: Browser APIs used during SSR
**Solution**: Wrap in `if (browser)` or disable SSR for that route

### Issue: Empty responses or missing data

**Cause**: Hardcoded field extraction failing
**Solution**: Let LLM handle data extraction dynamically

## Future Considerations

1. **Caching Strategy**: Implement proper cache headers for MCP responses
2. **Rate Limiting**: Add rate limiting for OpenAI API calls
3. **Monitoring**: Add telemetry for tool usage patterns
4. **Fallbacks**: Graceful degradation when OpenAI is unavailable

## Conclusion

The key lesson learned is to **leverage the LLM's capabilities** rather than trying to program around them. By providing clear guidelines and constraints in the system prompt, we can achieve flexible, maintainable, and accurate responses while ensuring data integrity through MCP-only sourcing.
