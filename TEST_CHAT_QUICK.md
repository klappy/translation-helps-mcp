# Quick Test Guide - Chat with SDK

## 🚀 Quick Start (3 Steps)

### Step 1: Build the SDK

```bash
cd packages/js-sdk
npm run build
```

### Step 2: Start the Dev Server

```bash
cd ../../ui
npm run dev
```

### Step 3: Test in Browser

1. Open `http://localhost:5173/chat`
2. Try: `"Show me John 3:16"`
3. Check browser console (F12) for SDK logs

## ✅ What to Look For

### In Browser Console:

- ✅ No errors
- ✅ Messages appear in chat
- ✅ X-Ray panel works (eye icon)

### In Server Logs:

- ✅ `"Discovered MCP resources via SDK"`
- ✅ `"Executing MCP tool via SDK"` or `"Executing MCP prompt via SDK"`

## 🧪 Test Queries

Try these to verify different features:

1. **Scripture**: `"Show me John 3:16"`
2. **Notes**: `"What do translation notes say about Titus 1?"`
3. **Words**: `"Define 'grace' from Translation Words"`
4. **Comprehensive**: `"Give me all translation helps for Romans 12:2"`

## 🐛 Troubleshooting

**If chat doesn't work:**

1. Check SDK is built: `ls packages/js-sdk/dist/`
2. Check SDK is installed: `cd ui && npm list @translation-helps/mcp-client`
3. Restart dev server
4. Check server logs for errors

**If you see "Failed to discover MCP resources":**

- System will auto-fallback to old method
- Chat should still work
- Check server URL is correct

## 📊 Success Indicators

✅ Chat responds to queries
✅ X-Ray panel shows tool calls
✅ No console errors
✅ Server logs show "via SDK" messages

For detailed testing, see `ui/TESTING_CHAT_SDK.md`
