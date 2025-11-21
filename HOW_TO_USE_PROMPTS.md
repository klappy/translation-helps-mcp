# How to Use MCP Prompts - Practical Guide

This guide shows **exactly** how to use the Translation Helps MCP prompts in real AI assistants like Claude Desktop and Cursor.

---

## 📋 Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Using Prompts in Claude Desktop](#using-prompts-in-claude-desktop)
3. [Using Prompts in Cursor](#using-prompts-in-cursor)
4. [How AI Assistants Discover Prompts](#how-ai-assistants-discover-prompts)
5. [Real-World Usage Examples](#real-world-usage-examples)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Setup & Configuration

### **Step 1: Install the MCP Server**

```bash
# Clone the repository
git clone https://github.com/your-org/translation-helps-mcp-2.git
cd translation-helps-mcp-2

# Install dependencies
npm install

# Build the server (if needed)
npm run build
```

### **Step 2: Configure Claude Desktop**

Edit your Claude Desktop MCP configuration file:

**Location:**

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Add this configuration:**

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "npx",
      "args": ["tsx", "C:/path/to/translation-helps-mcp-2/src/index.ts"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important:** Replace `C:/path/to/translation-helps-mcp-2` with your actual path.

### **Step 3: Configure Cursor**

Edit `.cursor/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "translation-helps": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "env": {}
      // Note: 'cwd' is optional - when omitted, defaults to project root
    }
  }
}
```

### **Step 4: Restart the Application**

- **Claude Desktop:** Quit and reopen Claude Desktop
- **Cursor:** Reload the window or restart Cursor

---

## 🎯 Using Prompts in Claude Desktop

### **Method 1: The Prompts Menu (Easiest)**

1. **Open a conversation** in Claude Desktop

2. **Type `/`** (forward slash) in the chat input
   - This opens the prompts/commands menu

3. **Look for your prompts:**

   ```
   📋 translation-helps-for-passage
   📚 get-translation-words-for-passage
   🎓 get-translation-academy-for-passage
   ```

4. **Click on a prompt** (e.g., "translation-helps-for-passage")

5. **Fill in the parameters:**

   ```
   Reference: John 3:16
   Language: en (optional)
   ```

6. **Submit** and watch Claude automatically:
   - Make 6-10 tool calls
   - Chain results together
   - Present organized response

### **Method 2: Natural Language (AI Discovers)**

Just ask naturally! Claude will discover and use prompts automatically:

**Example 1:**

```
You: "I need complete translation help for Matthew 5:13"
```

Claude will:

- Recognize this matches `translation-helps-for-passage`
- Use the prompt template
- Execute the full workflow

**Example 2:**

```
You: "Show me all the key terms in Romans 1:1 with their proper names"
```

Claude will:

- Match to `get-translation-words-for-passage`
- Fetch word links
- Get full articles with titles
- Present clean list

---

## 💻 Using Prompts in Cursor

### **Method 1: Chat Panel with Slash Commands**

1. **Open Cursor chat panel** (Cmd/Ctrl + L)

2. **Type `/prompts`** to see available prompts

3. **Select a prompt** and fill in parameters

4. **AI executes the workflow** automatically

### **Method 2: Natural Conversation**

In Cursor's chat, just describe what you need:

```
You: "Help me understand John 3:16 for translation.
     I need the scripture, notes, questions, and key terms."
```

Cursor's AI will:

1. See the `translation-helps-for-passage` prompt
2. Recognize your request matches it
3. Execute the multi-step workflow
4. Show you everything organized

### **Method 3: Composer Mode**

When working in Composer (Cmd/Ctrl + I):

```
You: "Get translation words for Genesis 1:1"
```

The AI will use prompts to gather comprehensive data before suggesting code changes or documentation updates.

---

## 🤖 How AI Assistants Discover Prompts

### **Discovery Process**

When you chat with Claude/Cursor, the AI:

1. **Lists available prompts** via MCP:

   ```json
   { "method": "prompts/list" }
   ```

2. **Sees your 3 prompts:**
   - `translation-helps-for-passage`
   - `get-translation-words-for-passage`
   - `get-translation-academy-for-passage`

3. **Reads descriptions:**
   - "Get comprehensive translation help for a Bible passage..."
   - "Get all translation word definitions for a passage..."
   - "Get Translation Academy training articles..."

4. **Matches your request** to the best prompt

5. **Gets the prompt template:**

   ```json
   {
     "method": "prompts/get",
     "params": {
       "name": "translation-helps-for-passage",
       "arguments": { "reference": "John 3:16" }
     }
   }
   ```

6. **Receives step-by-step instructions:**

   ```
   Please provide comprehensive translation help for John 3:16:

   1. Use fetch_scripture tool...
   2. Use fetch_translation_questions...
   3. Use fetch_translation_word_links...
   4. For each term, use fetch_translation_word...
   5. Extract TITLES from articles...
   6. Use fetch_translation_notes...
   7. Extract supportReference values...
   8. Use fetch_translation_academy...
   ```

7. **Executes the workflow** step by step

### **Smart Matching**

The AI matches natural language to prompts:

| **User Says**                                      | **AI Uses Prompt**                    |
| -------------------------------------------------- | ------------------------------------- |
| "Help me translate John 3:16"                      | `translation-helps-for-passage`       |
| "Show me key terms in Romans 1"                    | `get-translation-words-for-passage`   |
| "What translation concepts apply to Matthew 5:13?" | `get-translation-academy-for-passage` |
| "I need notes and questions for Genesis 1:1"       | `translation-helps-for-passage`       |
| "List dictionary entries for this verse"           | `get-translation-words-for-passage`   |

---

## 🎬 Real-World Usage Examples

### **Example 1: Complete Translation Help**

**User Request:**

```
I'm translating John 3:16 into Spanish.
Give me everything I need to understand this verse.
```

**What Happens:**

1. AI recognizes this matches `translation-helps-for-passage`
2. AI gets the prompt with `reference: "John 3:16"`, `language: "en"`
3. AI executes workflow:

```
📖 Step 1: Fetching scripture...
✅ Got: "For God so loved the world..."

❓ Step 2: Fetching translation questions...
✅ Got 3 questions about the verse

🔗 Step 3: Fetching word links...
✅ Found 8 key terms

📚 Step 4: Fetching word articles (8 terms)...
✅ Got titles:
   - "God"
   - "Love, Beloved"
   - "Son of God, Son"
   - "World"
   - "Believe, Faith"
   - "Eternal Life"
   - "Perish, Perishing"
   - "Give, Given"

📝 Step 5: Fetching translation notes...
✅ Got 2 notes with guidance

🎓 Step 6: Fetching academy articles...
✅ Found supportReferences:
   - rc://*/ta/man/translate/figs-metaphor
   - rc://*/ta/man/translate/guidelines-sonofgodprinciples
✅ Got article titles:
   - "Metaphor"
   - "Translating Son and Father"
```

4. AI presents organized response:

```markdown
# Translation Help for John 3:16

## Scripture Text (ULT)

For God so loved the world, that he gave his one and only Son,
that whoever believes in him will not perish, but will have eternal life.

## Key Terms (Dictionary Entries)

1. **God** - The supreme creator and ruler
2. **Love, Beloved** - Deep care and affection
3. **Son of God, Son** - Jesus Christ as God's Son
4. **World** - All people on earth
5. **Believe, Faith** - Trust and confidence
6. **Eternal Life** - Life with God forever
7. **Perish, Perishing** - Die spiritually/eternally
8. **Give, Given** - Transfer possession

## Translation Questions

1. Why did God give his Son?
2. What must a person do to have eternal life?
3. What does it mean to "perish"?

## Translation Notes

- "loved the world" - This emphasizes God's love for ALL people
- "one and only Son" - This unique phrase emphasizes Jesus is special

## Related Training Articles

- **Metaphor** - Understanding figurative language
- **Translating Son and Father** - Guidelines for God-family terms

---

You can ask for the full content of any term or training article!
```

---

### **Example 2: Just the Terms**

**User Request:**

```
What are the key biblical terms in Romans 1:1?
Show me their proper names, not technical IDs.
```

**What Happens:**

1. AI uses `get-translation-words-for-passage`
2. Executes simplified workflow
3. Returns:

```markdown
# Translation Words for Romans 1:1

## Key Terms (with dictionary titles)

### Key Terms:

- **Apostle** (term: apostle)
- **Jesus Christ, the Anointed One** (term: jesus)
- **Call, Called** (term: call)
- **Servant, Slave** (term: servant)
- **Gospel, Good News** (term: goodnews)
- **God** (term: god)

### Names:

- **Paul** (term: paul)

---

Ask me for the full definition of any term!
```

---

### **Example 3: Training Articles Only**

**User Request:**

```
I'm reading the translation notes for Matthew 5:13.
What training concepts should I study?
```

**What Happens:**

1. AI uses `get-translation-academy-for-passage`
2. Gets notes → extracts supportReferences → fetches articles
3. Returns:

```markdown
# Translation Academy Articles for Matthew 5:13

Based on the translation notes, you should study:

## Recommended Training

1. **Metaphor** (figs-metaphor)
   - Reference: rc://\*/ta/man/translate/figs-metaphor
   - Jesus uses metaphor when calling disciples "salt of the earth"

2. **Simile** (figs-simile)
   - Reference: rc://\*/ta/man/translate/figs-simile
   - Understanding comparisons using "like" or "as"

3. **You-Singular vs You-Plural** (figs-you)
   - Reference: rc://\*/ta/man/translate/figs-you
   - Important for translating "you" correctly in this context

---

Ask me to fetch the full content of any article!
```

---

## 🔍 Troubleshooting

### **Issue 1: Prompts Not Showing Up**

**Symptoms:** `/` menu doesn't show your prompts

**Solutions:**

1. Check MCP server is running:

   ```bash
   # Test manually
   echo '{"jsonrpc":"2.0","id":1,"method":"prompts/list"}' | npx tsx src/index.ts
   ```

2. Check configuration file location:
   - Claude Desktop: `~/Library/Application Support/Claude/` (macOS)
   - Cursor: `.cursor/mcp.json` in workspace

3. Check server capabilities in response:

   ```json
   { "capabilities": { "tools": {}, "prompts": {} } }
   ```

4. Restart the AI application completely

---

### **Issue 2: AI Not Using Prompts Automatically**

**Symptoms:** AI doesn't chain tools, just shows raw data

**Solutions:**

1. **Be explicit in your request:**

   ```
   ❌ "Get John 3:16"
   ✅ "Give me complete translation help for John 3:16"
   ```

2. **Mention what you need:**

   ```
   ✅ "I need scripture, notes, questions, and key terms for Romans 1:1"
   ```

3. **Manually select the prompt:**
   - Type `/` → select prompt → fill parameters

---

### **Issue 3: Prompt Executes But Results Look Wrong**

**Symptoms:** AI chains tools but output isn't organized

**Solutions:**

1. Check that all 6 tools are working:

   ```bash
   # Test each tool
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx tsx src/index.ts
   ```

2. AI might need guidance:

   ```
   "Use the translation-helps-for-passage prompt to organize everything"
   ```

3. Try again with explicit reference to showing titles:
   ```
   "Show me the dictionary entry TITLES, not the technical term IDs"
   ```

---

### **Issue 4: Slow Response**

**Symptoms:** Prompt takes 30+ seconds

**This is normal!** Prompts chain 6-10 tool calls:

- Each tool call fetches data from DCS
- ZIP files are downloaded and extracted
- Multiple API requests happen

**Expected timing:**

- `translation-helps-for-passage`: 20-40 seconds (6-10 calls)
- `get-translation-words-for-passage`: 10-20 seconds (2-8 calls)
- `get-translation-academy-for-passage`: 5-15 seconds (2-5 calls)

---

## 💡 Pro Tips

### **Tip 1: Start Broad, Then Narrow**

```
1. "Give me translation help for John 3:16"
2. "Tell me more about the 'love' term"
3. "Show me the full Metaphor article"
```

### **Tip 2: Use Language Context**

```
"I'm translating John 3:16 from English to Spanish.
Focus on terms that are hard to translate between these languages."
```

### **Tip 3: Ask for Comparisons**

```
"Get translation words for John 3:16 and Romans 5:8.
Compare how 'love' is used in both verses."
```

### **Tip 4: Reference the Prompt Explicitly**

When AI isn't catching on:

```
"Use the translation-helps-for-passage prompt for Matthew 5:13"
```

---

## 📚 Quick Reference Card

| **When You Want**       | **Use This Prompt**                   | **Say This**                           |
| ----------------------- | ------------------------------------- | -------------------------------------- |
| Everything for a verse  | `translation-helps-for-passage`       | "Complete translation help for [ref]"  |
| Just the terms          | `get-translation-words-for-passage`   | "Key terms in [ref]"                   |
| Training articles       | `get-translation-academy-for-passage` | "Translation concepts for [ref]"       |
| Terms + definitions     | `get-translation-words-for-passage`   | "Show dictionary entries for [ref]"    |
| Understanding metaphors | `get-translation-academy-for-passage` | "What figures of speech are in [ref]?" |

---

## 🎓 Learning More

- [MCP Prompts Guide](./MCP_PROMPTS_GUIDE.md) - Technical documentation
- [MCP Protocol Compliance](./MCP_PROTOCOL_COMPLIANCE.md) - Implementation details
- [UW Translation Resources Guide](./docs/UW_TRANSLATION_RESOURCES_GUIDE.md) - Understanding the data

---

## 🤝 Getting Help

If you have questions or issues:

1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Verify your [Setup & Configuration](#setup--configuration)
3. Test the server manually (see Issue 1 above)
4. Open an issue on GitHub with:
   - Your configuration
   - What you tried
   - What happened vs. what you expected

---

**Happy translating! 🌍📖**
