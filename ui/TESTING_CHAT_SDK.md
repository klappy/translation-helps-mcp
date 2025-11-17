# Testing the Chat Interface with SDK

## Quick Test

### 1. Start the Development Server

```bash
cd ui
npm run dev
```

The server will start on `http://localhost:5173` (or another port if 5173 is busy).

### 2. Open the Chat Interface

Navigate to: `http://localhost:5173/chat`

### 3. Test Basic Functionality

Try these queries to verify the SDK is working:

**Simple Scripture Query:**

```
Show me John 3:16
```

**Translation Notes:**

```
What do the translation notes say about Titus 1?
```

**Translation Words:**

```
Define 'grace' from Translation Words
```

**Comprehensive Query:**

```
What translation helps are available for Romans 12:2?
```

### 4. Verify SDK is Being Used

Check the browser console (F12) and server logs for:

- ✅ Messages like "Discovered MCP resources via SDK"
- ✅ Messages like "Executing MCP tool via SDK"
- ✅ Messages like "Executing MCP prompt via SDK"

### 5. Check X-Ray Panel

Click the eye icon to open the X-Ray panel and verify:

- Tool calls are being made
- Response times are shown
- Data is being returned correctly

## Detailed Testing

### Test 1: Tool Discovery

**Expected Behavior:**

- Chat should discover tools automatically
- No errors in console about missing endpoints
- Tools list should be populated

**Check Logs:**

```bash
# Look for this in server logs:
"Discovered MCP resources via SDK" { endpoints: X, prompts: Y }
```

### Test 2: Tool Execution

**Test Query:**

```
Show me John 3:16 in ULT
```

**Expected Behavior:**

- Should call `fetch_scripture` tool via SDK
- Should return scripture text
- Should display in chat interface

**Check Logs:**

```bash
# Look for:
"Executing MCP tool via SDK" { tool: "fetch_scripture", params: {...} }
```

### Test 3: Prompt Execution

**Test Query:**

```
Give me all translation helps for Romans 12:2
```

**Expected Behavior:**

- Should call `translation-helps-for-passage` prompt via SDK
- Should return comprehensive data
- Should display formatted response

**Check Logs:**

```bash
# Look for:
"Executing MCP prompt via SDK" { prompt: "translation-helps-for-passage", params: {...} }
```

### Test 4: Error Handling

**Test Query:**

```
Show me invalid-reference-999:999
```

**Expected Behavior:**

- Should handle error gracefully
- Should show user-friendly error message
- Should not crash the application

**Check Logs:**

```bash
# Look for error handling:
"MCP tool call failed via SDK" { tool: "...", error: "..." }
```

## Debugging

### Enable Debug Logging

The SDK uses the edge logger. Check server console for detailed logs.

### Common Issues

**Issue: "Failed to discover MCP resources via SDK"**

**Solution:**

- Check that MCP server is running
- Verify server URL is correct
- Check network connectivity
- System will fallback to old method automatically

**Issue: "SDK client not connecting"**

**Solution:**

- Verify SDK is installed: `npm list @translation-helps/mcp-client`
- Check that `packages/js-sdk` is built: `cd packages/js-sdk && npm run build`
- Restart dev server

**Issue: "Tool not found"**

**Solution:**

- Check tool name mapping (kebab-case → snake_case)
- Verify tool exists in MCP server
- Check server logs for actual error

### Verify SDK Installation

```bash
cd ui
npm list @translation-helps/mcp-client
```

Should show:

```
@translation-helps/mcp-client@1.0.0
```

### Check SDK Build

```bash
cd packages/js-sdk
npm run build
ls dist/
```

Should show compiled files.

## Automated Testing

### Run Type Check

```bash
cd ui
npm run check
```

### Run Linter

```bash
cd ui
npm run lint
```

## Performance Testing

### Monitor Response Times

1. Open browser DevTools → Network tab
2. Send a query
3. Check response times in X-Ray panel
4. Compare with previous (non-SDK) version

**Expected:**

- Similar or better performance
- No significant latency increase
- Proper error handling

## Integration Test Checklist

- [ ] Chat interface loads
- [ ] Can send messages
- [ ] Receives responses
- [ ] X-Ray panel works
- [ ] Tool calls execute via SDK
- [ ] Prompts execute via SDK
- [ ] Error handling works
- [ ] Streaming responses work
- [ ] No console errors
- [ ] Server logs show SDK usage

## Next Steps

Once testing passes:

1. Test in production build: `npm run build`
2. Test on Cloudflare Pages
3. Monitor for any edge cases
4. Update documentation if needed
