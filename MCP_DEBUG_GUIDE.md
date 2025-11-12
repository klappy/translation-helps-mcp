# MCP Server Debugging Guide

## 🐛 Debug Your MCP Server Connection with Cursor

This guide helps you debug why Cursor might not be connecting to the Translation Helps MCP server.

---

## ✅ Quick Verification

The MCP server **works correctly** - we've verified:

- ✅ Server starts successfully
- ✅ Responds to JSON-RPC requests
- ✅ All 6 tools registered (fetch_scripture, fetch_translation_notes, etc.)
- ✅ Node.js v22.20.0 and tsx v4.20.3 working

---

## 🔍 Debugging Steps

### Step 1: Check MCP Configuration

Your `.cursor/mcp.json` now has **two** server configurations:

1. **`translation-helps`** (Debug Mode) - Logs all communication to `mcp-debug.log`
2. **`translation-helps-direct`** (Direct Mode) - Runs server directly without logging

### Step 2: Restart Cursor

**IMPORTANT:** Cursor only loads MCP configurations on startup.

1. **Completely close Cursor** (not just the window)
2. **Reopen Cursor**
3. Wait for all extensions to load (~10-30 seconds)

### Step 3: Check MCP Server Status in Cursor

1. Open Developer Tools: `Help → Toggle Developer Tools`
2. Check Console tab for MCP-related messages
3. Look for errors like:
   - `Failed to start MCP server`
   - `MCP server exited with code X`
   - Connection timeout errors

### Step 4: Test in Cursor Chat

Try using the MCP server in Cursor's chat:

```
@translation-helps Use fetch_scripture tool for Genesis 1:1
```

Or try the prompt:

```
/translation-helps/translation-helps-for-passage
```

### Step 5: Check Debug Log

If Cursor is connecting but something's wrong, check the debug log:

```bash
cat mcp-debug.log
```

Or on Windows:

```cmd
type mcp-debug.log
```

This will show:

- When Cursor connects to the server
- What requests Cursor sends
- What responses the server returns
- Any errors that occur

---

## 🧪 Manual Testing

### Test the Server Standalone

Run the test script to verify the server works:

```bash
node test-mcp-connection.mjs
```

Expected output:

```
🧪 Testing MCP Server Connection...
📨 Sending ListTools request...
[INFO] Translation Helps MCP Server running on stdio
📦 Server Output: {"result":{"tools":[...]}}
✅ Test complete!
```

### Test the Debug Wrapper

```bash
node debug-mcp-server.mjs
```

This starts the server in debug mode. Check `mcp-debug.log` for logging.

---

## 🔧 Common Issues & Fixes

### Issue 1: "Server not found" or "No MCP servers available"

**Solution:** Restart Cursor completely (see Step 2)

### Issue 2: "Permission denied" or "EACCES"

**Solution:** Make sure you have permissions to run Node.js scripts:

```bash
chmod +x debug-mcp-server.mjs test-mcp-connection.mjs
```

### Issue 3: "Module not found" errors

**Solution:** Install dependencies:

```bash
npm install
```

### Issue 4: Server starts but tools don't work

**Solution:**

1. Check `mcp-debug.log` for request/response details
2. Verify the tool name matches exactly (e.g., `fetch_scripture` not `fetchScripture`)
3. Ensure required parameters are provided

### Issue 5: Cursor shows old/cached tools

**Solution:**

1. Close Cursor completely
2. Clear Cursor's cache (if option available)
3. Restart Cursor

---

## 📊 Expected Behavior

### When Working Correctly:

1. **In Cursor Chat:**

   ```
   @translation-helps
   ```

   Should show autocomplete with available tools

2. **Using a Tool:**

   ```
   @translation-helps Use fetch_scripture for Genesis 1:1
   ```

   Should return the scripture text

3. **Using a Prompt:**
   ```
   /translation-helps/translation-helps-for-passage
   Genesis 1:1-3 in English
   ```
   Should return comprehensive translation help

### In Debug Log (`mcp-debug.log`):

```
[2025-01-12T10:30:00.000Z] 🚀 Starting MCP server with debugging...
[2025-01-12T10:30:00.100Z] Server spawned with PID: 12345
[2025-01-12T10:30:01.000Z] ✅ Debug wrapper ready, waiting for requests...
[2025-01-12T10:30:05.000Z] 📥 RECEIVED FROM CURSOR: {"jsonrpc":"2.0","method":"tools/list",...}
[2025-01-12T10:30:05.100Z] 📤 SERVER OUTPUT: {"result":{"tools":[...]},...}
```

---

## 🚀 After Successful Connection

Once Cursor connects successfully:

1. Switch back to direct mode for better performance:
   - Change `.cursor/mcp.json` to use `translation-helps-direct`
   - Or just use the working configuration

2. Test all 6 tools:
   - `fetch_scripture`
   - `fetch_translation_notes`
   - `fetch_translation_questions`
   - `fetch_translation_word_links`
   - `fetch_translation_word`
   - `fetch_translation_academy`

3. Test all 3 prompts:
   - `translation-helps-for-passage`
   - `get-translation-words-for-passage`
   - `get-translation-academy-for-passage`

---

## 📞 Still Having Issues?

If the server works standalone but not in Cursor:

1. **Check Cursor's MCP documentation** - The MCP protocol might have updated
2. **Verify Cursor version** - Ensure you're on a version that supports MCP
3. **Try the direct configuration** - Use `translation-helps-direct` in `.cursor/mcp.json`
4. **Check for conflicts** - Ensure no other MCP servers are using the same name

---

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Server works standalone (`node test-mcp-connection.mjs`)
- [ ] `.cursor/mcp.json` configured correctly
- [ ] Cursor completely restarted
- [ ] Can see `@translation-helps` in Cursor chat
- [ ] Tools work when called
- [ ] Prompts work when invoked

---

**MCP Server Version:** 7.2.0  
**Node.js Required:** >=18.0.0  
**Current Node.js:** v22.20.0 ✅
