# Chat Interface SDK Integration

## Overview

The chat interface (`/api/chat-stream`) has been refactored to use the `@translation-helps/mcp-client` SDK instead of making direct HTTP requests to the MCP server.

## What Changed

### Before (Direct HTTP Calls)

The chat API was making direct HTTP requests:

- `fetch(`${baseUrl}/api/mcp-config`)` - to discover endpoints
- `fetch(`${baseUrl}/api/execute-prompt`)` - to execute prompts
- `fetch(`${baseUrl}/api/${endpointName}`)` - to call individual tools

### After (SDK-Based)

The chat API now uses the SDK:

- `listTools(serverUrl)` - to discover available tools
- `listPrompts(serverUrl)` - to discover available prompts
- `getPrompt(name, params, serverUrl)` - to execute prompts
- `callTool(name, params, serverUrl)` - to call individual tools

## Benefits

1. **Consistency**: Uses the same SDK as other clients
2. **Maintainability**: MCP protocol changes only need to be updated in the SDK
3. **Type Safety**: Full TypeScript support from the SDK
4. **Error Handling**: SDK handles MCP protocol errors consistently
5. **Future-Proof**: Easy to add new SDK features (caching, retries, etc.)

## Implementation Details

### MCP Client Utility (`ui/src/lib/mcp/client.ts`)

A thin wrapper around the SDK that:

- Manages a singleton client instance
- Handles connection initialization
- Provides clean async/await interface
- Supports custom server URLs

### Updated Functions

#### `discoverMCPEndpoints()`

- Now uses `listTools()` and `listPrompts()` from SDK
- Falls back to old method if SDK fails (backward compatibility)
- Converts SDK tool format to endpoint format for compatibility

#### `executeMCPCalls()`

- Uses `callTool()` for individual tool calls
- Uses `getPrompt()` for prompt execution
- Maps endpoint names (kebab-case) to tool names (snake_case)
- Maintains same response format for compatibility

## Compatibility

The refactoring maintains **100% backward compatibility**:

- Same response format
- Same error handling
- Same X-ray data structure
- Same streaming behavior
- Fallback to old method if SDK fails

## Testing

The chat interface should work exactly the same as before:

- All existing queries work
- X-ray panel shows same data
- Streaming responses unchanged
- Error messages unchanged

## Future Enhancements

With the SDK in place, we can now easily add:

- Connection pooling
- Automatic retries
- Request caching
- Better error messages
- Performance monitoring

## Migration Notes

When the SDK is published to npm:

1. Change `package.json` dependency from `file:../packages/js-sdk` to `@translation-helps/mcp-client`
2. No code changes needed - the API is identical
