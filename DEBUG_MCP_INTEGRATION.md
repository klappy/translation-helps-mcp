# Debugging MCP Integration

This guide helps you verify that the MCP server is fetching the correct data and diagnose whether issues are from:

1. **Data Fetching** - MCP server returning wrong/no data
2. **AI Hallucination** - AI ignoring the correct data provided

---

## 🔍 **Quick Test**

Run the CLI with enhanced logging:

```bash
npm run cli:start -- --model llama3.2:1b
```

Then test with a known passage:

```
You: Can you teach me to translate Romans 1:1?
```

---

## 📊 **What You'll See**

### **Part 1: MCP Fetch Details**

```
📖 Fetching data for Romans 1:1...
🔧 MCP Prompt: translation-helps-for-passage
🔧 Parameters: { reference: "Romans 1:1" }
```

This shows:

- **Which passage** was detected
- **Which MCP prompt** is being called
- **What parameters** are being sent

### **Part 2: MCP Response**

```
✅ MCP Response Received:

📖 SCRIPTURE (ULT):
"Paul, a servant of Jesus Christ, called to be an apostle, set apart for the gospel of God"
Length: 87 characters

📝 Notes: 4 items
📚 Words: 6 items
🎓 Academy: 2 articles
❓ Questions: 1 items

🤖 Sending to AI with this data...
```

This shows:

- **Exact scripture text** fetched from Door43
- **How many** notes, words, academy articles, and questions
- Confirms data is being sent to AI

### **Part 3: AI Response**

```
AI: Here's Romans 1:1 from the ULT:
"Paul, a servant of Jesus Christ..."
```

**✅ GOOD**: AI quotes the scripture correctly
**❌ BAD**: AI quotes something different (hallucination)

---

## 🐛 **Full Debug Mode**

To save the complete MCP response to a file:

```bash
DEBUG_MCP=true npm run cli:start -- --model llama3.2:1b
```

This will create files like `.mcp-debug-1699999999999.json` containing the full response from the MCP server.

### Example Debug File:

```json
{
  "scripture": {
    "text": "Paul, a servant of Jesus Christ, called to be an apostle, set apart for the gospel of God",
    "reference": "Romans 1:1"
  },
  "notes": {
    "items": [
      {
        "Reference": "1:1",
        "Quote": "Paul",
        "Note": "Here Paul identifies himself as the author..."
      }
    ]
  },
  "words": [
    {
      "term": "apostle",
      "title": "apostle, apostles, apostleship",
      "content": "# apostle, apostles, apostleship\n\n## Definition..."
    }
  ]
}
```

---

## 🔎 **Diagnosing Issues**

### **Issue 1: AI Quotes Wrong Scripture**

Example:

```
📖 SCRIPTURE (ULT):
"Paul, a servant of Jesus Christ..."    ← CORRECT from MCP

AI: "In the beginning God created..."   ← WRONG from AI
```

**Diagnosis**: ✅ MCP is working, ❌ AI is hallucinating

**Solution**: Use a larger model (7B+)

---

### **Issue 2: No Scripture in MCP Response**

Example:

```
⚠️  No scripture text in response
📝 Notes: 0 items
📚 Words: 0 items
```

**Diagnosis**: ❌ MCP server issue or invalid reference

**Possible Causes**:

1. Invalid book name
2. Invalid chapter/verse
3. MCP server not running
4. Cache empty and offline

**Solution**: Check MCP server logs, verify reference format

---

### **Issue 3: MCP Error**

Example:

```
❌ MCP Error: Connection refused
```

**Diagnosis**: ❌ MCP server not responding

**Solution**:

1. Check MCP server is running
2. Verify `src/index.ts` is accessible
3. Check for TypeScript/build errors

---

## 📝 **Test Cases**

### Test 1: Known Passage (New Testament)

```
You: Show me Romans 1:1
```

**Expected MCP Response**:

- Scripture: "Paul, a servant of Jesus Christ, called to be an apostle, set apart for the gospel of God"
- Notes: Multiple items about Paul, apostle, gospel
- Words: apostle, servant, gospel, etc.

**Expected AI**: Should quote scripture exactly

---

### Test 2: Known Passage (Old Testament)

```
You: Show me Genesis 1:1
```

**Expected MCP Response**:

- Scripture: "In the beginning, God created the heavens and the earth."
- Notes: About "beginning", "created", "heavens", "earth"
- Words: create, heaven, earth, etc.

**Expected AI**: Should quote scripture exactly

---

### Test 3: Different Verse Format

```
You: Teach me John 3:16
```

**Expected MCP Response**:

- Scripture: "For God so loved the world, that he gave his one and only Son..."
- Notes: Multiple items
- Words: love, world, son, believe, etc.

**Expected AI**: Should quote scripture exactly

---

### Test 4: Invalid Reference

```
You: Show me Romans 50:99
```

**Expected MCP Response**:

- ⚠️ No scripture text (chapter/verse doesn't exist)
- Empty or minimal data

**Expected AI**: Should say "I don't have that information"

---

## 🔧 **Troubleshooting Steps**

### Step 1: Verify MCP Connection

Look for this at startup:

```
✅ Connected to MCP server
```

If not, MCP server isn't starting. Check:

- `src/index.ts` exists
- No TypeScript errors
- Node.js is installed

### Step 2: Check Reference Detection

Look for this when you mention a passage:

```
📖 Fetching data for Romans 1:1...
```

If you don't see this, the regex isn't detecting the reference. Supported formats:

- ✅ "Romans 1:1"
- ✅ "John 3:16"
- ✅ "Genesis 1:1-3"
- ❌ "Rom 1:1" (abbreviations not yet supported)

### Step 3: Verify Data Fetch

Look for:

```
📖 SCRIPTURE (ULT):
"[actual text]"
```

If you see this, the MCP server IS working correctly.

### Step 4: Compare AI Output

Compare what the MCP returned vs what the AI said:

**MCP Said**: "Paul, a servant of Jesus Christ..."
**AI Said**: "In the beginning God created..."

If different → AI hallucination (model too small)
If same → Working correctly!

---

## 📤 **Reporting Issues**

If you find a bug, please include:

1. **Your query**: What you typed
2. **MCP logs**: Copy the full MCP fetch output
3. **AI response**: What the AI said
4. **Model used**: e.g., llama3.2:1b
5. **Debug file**: Attach `.mcp-debug-*.json` if available

Example report:

```
Query: "Show me Romans 1:1"

MCP Logs:
📖 SCRIPTURE (ULT):
"Paul, a servant of Jesus Christ..."

AI Response:
"In the beginning God created..."

Model: llama3.2:1b

Issue: AI is quoting Genesis instead of Romans despite MCP
providing correct data. Model hallucinating.
```

---

## 🎯 **Expected Behavior**

### ✅ Working Correctly

```bash
You: Show me Romans 1:1

📖 Fetching data for Romans 1:1...
🔧 MCP Prompt: translation-helps-for-passage
🔧 Parameters: { reference: "Romans 1:1" }

✅ MCP Response Received:

📖 SCRIPTURE (ULT):
"Paul, a servant of Jesus Christ, called to be an apostle, set apart for the gospel of God"
Length: 87 characters

📝 Notes: 4 items
📚 Words: 6 items
🎓 Academy: 2 articles
❓ Questions: 1 items

🤖 Sending to AI with this data...

AI: Here's Romans 1:1 from the ULT:
"Paul, a servant of Jesus Christ, called to be an apostle, set apart for the gospel of God"
[Uses correct data]
```

### ❌ Hallucination (Model Too Small)

```bash
You: Show me Romans 1:1

[Same MCP logs showing correct data]

AI: Here's Romans 1:1:
"In the beginning God created the world..."
[Ignores provided data, makes up content]
```

**Root Cause**: Model (1B) too small to follow instructions

**Solution**: Use 7B+ model

---

## 💡 **Tips**

1. **Always check the MCP logs first** - If MCP fetched correct data, it's not a fetch problem
2. **Compare scripture exactly** - Even small differences indicate hallucination
3. **Try with OpenAI** - If OpenAI quotes correctly, your MCP server works fine
4. **Save debug files** - Use `DEBUG_MCP=true` to capture full responses
5. **Test multiple passages** - One passage might be cached incorrectly

---

## 🚀 **Quick Verification Script**

Test all major components at once:

```bash
# Enable debug mode
export DEBUG_MCP=true

# Start CLI
npm run cli:start -- --model llama3.2:1b

# Run these tests:
You: Show me Romans 1:1
You: Show me John 3:16
You: Show me Genesis 1:1

# Check debug files created
ls -lt .mcp-debug-*.json
```

---

**Summary**: The new logging helps you definitively answer: "Is the MCP server fetching correct data?" If yes, and AI still wrong → model too small. If no → MCP server bug.
