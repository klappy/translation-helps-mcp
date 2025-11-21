# Remote MCP Server Status

## Current State

### ✅ What We Have

1. **HTTP Endpoint**: `https://translation-helps-mcp.pages.dev/api/mcp`
   - ✅ `initialize` - Returns server info and capabilities
   - ✅ `tools/list` - Lists all available tools
   - ✅ `tools/call` - Executes tool calls
   - ✅ `ping` - Health check endpoint

2. **Tools Exposed** (via standard MCP protocol):
   - `fetch_scripture`
   - `fetch_translation_notes`
   - `fetch_translation_questions`
   - `fetch_translation_word_links`
   - `fetch_translation_word`
   - `fetch_translation_academy`
   - `get_system_prompt`
   - `get_languages`
   - `fetch_resources`
   - `search_resources`

3. **Prompts Available** (but via custom endpoints):
   - `translation-helps-for-passage`
   - `get-translation-words-for-passage`
   - `get-translation-academy-for-passage`
   - Available via `/api/mcp-config` (custom format)
   - Executable via `/api/execute-prompt` (custom endpoint)

## ❌ What's Missing for Full Remote MCP Server Compliance

According to the [MCP Remote Server Documentation](https://modelcontextprotocol.io/docs/develop/connect-remote-servers), remote servers should support:

### 1. **Standard MCP Prompt Methods** (CRITICAL)

**Missing:**

- `prompts/list` - List available prompts via standard MCP protocol
- `prompts/get` - Get prompt template via standard MCP protocol

**Current Workaround:**

- Prompts are exposed via `/api/mcp-config` (custom endpoint)
- Prompts are executed via `/api/execute-prompt` (custom endpoint)

**Impact:**

- Clients like Claude Desktop expect `prompts/list` and `prompts/get` methods
- Custom endpoints won't work with standard MCP clients

### 2. **Resources Support** (OPTIONAL)

**Missing:**

- `resources/list` - List available resources
- `resources/read` - Read resource content

**Status:**

- Not currently implemented
- May not be needed if tools are sufficient

### 3. **Authentication** (RECOMMENDED)

**Missing:**

- OAuth support
- API key authentication
- Token-based authentication

**Current Status:**

- No authentication required (public API)
- May need authentication for production use

### 4. **Server-Sent Events (SSE)** (OPTIONAL)

**Missing:**

- Streaming responses via SSE
- Real-time updates

**Status:**

- Not required for basic functionality
- Could enhance user experience

## Implementation Plan

### Phase 1: Add Standard Prompt Methods (HIGH PRIORITY)

Add to `ui/src/routes/api/mcp/+server.ts`:

```typescript
case 'prompts/list':
  return json({
    prompts: [
      {
        name: 'translation-helps-for-passage',
        description: 'Get comprehensive translation help for a Bible passage',
        arguments: [
          {
            name: 'reference',
            description: 'Bible reference (e.g., "John 3:16")',
            required: true
          },
          {
            name: 'language',
            description: 'Language code (default: "en")',
            required: false
          }
        ]
      },
      // ... other prompts
    ]
  });

case 'prompts/get': {
  const { name, arguments: args } = body.params;
  // Return prompt template matching src/index.ts format
  // This should return the same structure as the stdio server
}
```

### Phase 2: Add Authentication (MEDIUM PRIORITY)

1. Add API key authentication
2. Support OAuth for third-party clients
3. Add rate limiting

### Phase 3: Add Resources Support (LOW PRIORITY)

If needed, implement:

- `resources/list`
- `resources/read`

## Testing Remote Connection

### Using Claude Desktop

1. Add to Claude Desktop config (`~/.config/claude-desktop/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "translation-helps": {
      "url": "https://translation-helps-mcp.pages.dev/api/mcp",
      "transport": "http"
    }
  }
}
```

### Using Custom Connector (Claude Web)

1. Navigate to Claude Settings → Connectors
2. Click "Add custom connector"
3. Enter URL: `https://translation-helps-mcp.pages.dev/api/mcp`
4. Complete authentication (if implemented)

## Current Workaround

For now, developers can:

1. Use the HTTP endpoint directly: `POST https://translation-helps-mcp.pages.dev/api/mcp`
2. Use custom endpoints for prompts: `/api/mcp-config` and `/api/execute-prompt`
3. Use standard MCP tools: `tools/list` and `tools/call`

## Next Steps

1. ✅ **COMPLETED**: Added `prompts/list` and `prompts/get` to `/api/mcp` endpoint
2. ✅ **COMPLETED**: Updated `initialize` to include `prompts: {}` in capabilities
3. ⏳ **SKIPPED**: Authentication support (server remains open and free as requested)
4. ⏳ **LATER**: Consider resources support if needed

## References

- [MCP Remote Server Documentation](https://modelcontextprotocol.io/docs/develop/connect-remote-servers)
- [MCP Protocol Specification](https://modelcontextprotocol.io/docs/specification)
- Current HTTP Endpoint: `ui/src/routes/api/mcp/+server.ts`
- Stdio Server (reference): `src/index.ts`
