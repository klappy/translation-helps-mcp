# 🧪 Testing After Fixes - Step by Step

## ✅ **What We Fixed**

### Fix #1: MCP Client Connection

- **Problem**: Passing `ChildProcess` to `StdioClientTransport`
- **Solution**: Pass `command` and `args` instead
- **Status**: ✅ FIXED - MCP client connects successfully

### Fix #2: MCP Tool Calls

- **Problem**: Calling `prompts/get` which only returns templates, not data
- **Solution**: Call actual MCP tools (`fetch_scripture`, `fetch_translation_notes`, etc.)
- **Status**: ✅ FIXED - Tools are being called

### Fix #3: Scripture Cache Method

- **Problem**: Using wrong cache (`unified-cache` doesn't have `getFileContent`)
- **Solution**: Use `./cache` module which has the correct methods
- **Status**: ✅ FIXED - Correct cache imported

### Fix #4: Scripture Download Method

- **Problem**: Using disabled `getRawFileContent()` method
- **Solution**: Use `proxyFetch()` + cache pattern (same as TN/TQ)
- **Status**: ✅ FIXED - Should download from Door43 now

---

## 🧪 **Test Plan**

### Step 1: Test Basic MCP Communication

```bash
node test-simple-mcp.mjs
```

**Expected Output:**

```
✅ Connected
✅ Got 6 tools:
  - fetch_scripture
  - fetch_translation_notes
  - fetch_translation_questions
  - fetch_translation_word_links
  - fetch_translation_word
  - fetch_translation_academy
✅ MCP Server basic communication works!
```

**Status**: ✅ This test PASSES

---

### Step 2: Test Scripture Fetching (Isolation)

```bash
node test-scripture-only.mjs
```

**Expected Output (if working):**

```
✅ Connected
📖 Fetching Romans 1:1...

[INFO] Cache miss for scripture file, downloading...
[INFO] Downloaded USFM data {"length":50234}
[INFO] Cached scripture file {"length":50234}

✅ SUCCESS!

Scripture text:
"Paul, a servant of Jesus Christ, called to be an apostle, set apart for the gospel of God"

Length: 87 characters
```

**Current Status**: ⏸️ **TIMES OUT** (Need to diagnose)

**Possible Issues:**

1. Script service still using old code (not rebuilt)
2. Download is very slow (USFM files are large ~50KB+)
3. Network issue connecting to Door43
4. Parsing is stuck

---

### Step 3: Test Full CLI (With AI)

```bash
npm run cli:start -- --model llama3.2:1b

You: Show me Romans 1:1
```

**Expected Output (if working):**

```
📖 Fetching data for Romans 1:1...
🔧 MCP Prompt: translation-helps-for-passage
🔧 Parameters: { reference: "Romans 1:1" }

[INFO] Cache miss for scripture file, downloading...
[INFO] Downloaded USFM data

✅ MCP Response Received:

📖 SCRIPTURE (ULT):
"Paul, a servant of Jesus Christ, called to be an apostle, set apart for the gospel of God"
Length: 87 characters

📝 Notes: 5 items
📚 Words: 6 items
🎓 Academy: 2 articles

🤖 Sending to AI with this data...

AI: Here's Romans 1:1 from the ULT:
"Paul, a servant of Jesus Christ, called to be an apostle, set apart for the gospel of God"

[Explains using real notes and terms]
```

**Current Status**: ⏸️ Waiting for Step 2 to pass

---

## 🔍 **Debugging the Timeout**

The scripture fetch is hanging. Here's how to diagnose:

### Option 1: Check if it's a download issue

Try manually downloading a USFM file:

```bash
curl "https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/45-ROM.usfm" -o test-rom.usfm
```

**If this is slow or fails**: Network/Door43 issue
**If this is fast**: Something else is hanging

### Option 2: Add more logging

Edit `src/functions/scripture-service.ts` line 213 to add console.log:

```typescript
if (!usfmData) {
  console.log("About to download from:", fileUrl);  // ADD THIS
  logger.info(`Cache miss for scripture file, downloading...`);
  const fileResponse = await proxyFetch(fileUrl);
  console.log("Download complete, status:", fileResponse.ok);  // ADD THIS
```

Then rebuild and test.

### Option 3: Test with a different passage

Some verses might have issues. Try:

```bash
# In the test script, change "Romans 1:1" to "John 3:16"
```

---

## 📊 **Test Results So Far**

| Test                 | Status     | Notes                     |
| -------------------- | ---------- | ------------------------- |
| MCP Connection       | ✅ PASS    | Connects successfully     |
| List Tools           | ✅ PASS    | Shows 6 tools             |
| Call Scripture Tool  | ⏸️ TIMEOUT | Hangs after 30 seconds    |
| Translation Notes    | ⏸️ PENDING | Not tested yet            |
| Full CLI Integration | ⏸️ PENDING | Waiting for tools to work |

---

## 🎯 **Next Actions**

1. **Diagnose the timeout**:
   - Test manual download with curl
   - Add more logging to scripture service
   - Check for infinite loops

2. **Once scripture works**:
   - Test other tools (notes, questions, words)
   - Verify they all return correct data
   - Test caching works

3. **Then test with AI**:
   - Run full CLI
   - Verify AI gets real data
   - Check if larger model needed

---

## 💡 **Quick Wins to Try**

### Test Notes Service Directly

Notes service already worked in your earlier logs. Test it:

```bash
# Create a simple test
node -e "
import('
@modelcontextprotocol/sdk/client/index.js').then(({ Client }) => {
  import('@modelcontextprotocol/sdk/client/stdio.js').then(({ StdioClientTransport }) => {
    const t = new StdioClientTransport({ command: 'npx', args: ['tsx', 'src/index.ts'] });
    const c = new Client({ name: 't', version: '1' }, { capabilities: {} });
    c.connect(t).then(() => {
      c.callTool('fetch_translation_notes', { reference: 'Romans 1:1', language: 'en' }).then(r => {
        console.log('Notes:', JSON.parse(r.content[0].text).items.length, 'items');
        process.exit(0);
      });
    });
  });
});
"
```

If notes work but scripture doesn't, we know the issue is specific to scripture service.

---

**Current Priority**: Diagnose why scripture fetch times out while notes fetch works fine.
