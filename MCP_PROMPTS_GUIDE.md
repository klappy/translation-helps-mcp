# MCP Prompts Guide

## Overview

The Translation Helps MCP server now includes **3 guided prompts** that help AI assistants chain multiple tool calls together to provide comprehensive translation support. These prompts provide step-by-step instructions for common workflows.

## Available Prompts

### 1. `translation-helps-for-passage`

**Description:** Get comprehensive translation help for a Bible passage, including scripture text, questions, word definitions (with titles), notes, and related academy articles.

**Arguments:**

- `reference` (required): Bible reference (e.g., "John 3:16", "Genesis 1:1-3")
- `language` (optional): Language code (default: "en")

**What it does:**

1. Fetches the scripture text using `fetch_scripture`
2. Gets translation questions using `fetch_translation_questions`
3. Gets translation word links using `fetch_translation_word_links`
4. For each term, fetches the full article using `fetch_translation_word` and extracts the **title** (not the technical term ID)
5. Gets translation notes using `fetch_translation_notes`
6. Extracts `supportReference` fields from notes and fetches Translation Academy articles using `fetch_translation_academy`
7. Presents everything in an organized, translator-friendly format

**Example usage in Claude/Cursor:**

```
User selects prompt: "translation-helps-for-passage"
Enters: reference: "John 3:16", language: "en"
AI automatically chains 6+ tool calls to gather all information
```

---

### 2. `get-translation-words-for-passage`

**Description:** Get all translation word definitions for a passage, showing dictionary entry titles instead of technical term IDs.

**Arguments:**

- `reference` (required): Bible reference (e.g., "John 3:16")
- `language` (optional): Language code (default: "en")

**What it does:**

1. Gets translation word links using `fetch_translation_word_links`
2. For each term, fetches the full article using `fetch_translation_word`
3. Extracts the **title** from each article (e.g., "Love, Beloved" instead of "love")
4. Presents dictionary entry titles in a clear, human-readable list

**Example usage:**

```
User asks: "Show me the key terms in Romans 1:1"
User selects prompt: "get-translation-words-for-passage"
Enters: reference: "Romans 1:1"
AI shows: "Apostle", "Jesus Christ", "Gospel", etc. (titles, not IDs)
```

---

### 3. `get-translation-academy-for-passage`

**Description:** Get Translation Academy training articles referenced in the translation notes for a passage.

**Arguments:**

- `reference` (required): Bible reference (e.g., "John 3:16")
- `language` (optional): Language code (default: "en")

**What it does:**

1. Gets translation notes using `fetch_translation_notes`
2. Extracts all `supportReference` values (RC links or moduleIds)
3. For each reference, fetches the Translation Academy article using `fetch_translation_academy`
4. Extracts and presents the **titles** of relevant training articles

**Example usage:**

```
User asks: "What translation concepts apply to Matthew 5:13?"
User selects prompt: "get-translation-academy-for-passage"
Enters: reference: "Matthew 5:13"
AI shows: "Metaphor", "Exaggeration", "Simile" (TA article titles)
```

---

## How to Use Prompts

> 📖 **For detailed, practical instructions, see [HOW_TO_USE_PROMPTS.md](./HOW_TO_USE_PROMPTS.md)**  
> This includes setup, real examples, troubleshooting, and tips for Claude Desktop and Cursor.

### Quick Start

### In Claude Desktop / Cursor

1. Start a conversation with Claude
2. Type `/` or look for the prompts menu
3. Select one of the 3 prompts
4. Fill in the required `reference` argument
5. Optionally specify `language`
6. Claude will automatically execute the multi-step workflow

### Via MCP Protocol

**List available prompts:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list"
}
```

**Get a specific prompt:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "prompts/get",
  "params": {
    "name": "translation-helps-for-passage",
    "arguments": {
      "reference": "John 3:16",
      "language": "en"
    }
  }
}
```

The response will include a `messages` array with instructions that guide the AI through the workflow.

---

## Benefits of Prompts

### For Users:

- **One-click workflows**: Complex multi-step processes become simple
- **Consistent results**: Same workflow every time
- **Guided experience**: Users know what to ask for

### For AI Assistants:

- **Clear instructions**: Step-by-step guidance for tool chaining
- **Best practices**: Encourages correct usage patterns
- **User-friendly output**: Focuses on showing titles, not IDs

### For Translators:

- **Time-saving**: Get everything needed in one comprehensive response
- **Better UX**: See "Love, Beloved" instead of technical term "love"
- **Learning path**: Discover related training materials automatically

---

## Implementation Details

### Server Configuration

Prompts are defined in `src/index.ts`:

```typescript
const prompts = [
  {
    name: "translation-helps-for-passage",
    description: "Get comprehensive translation help...",
    arguments: [
      { name: "reference", required: true },
      { name: "language", required: false },
    ],
  },
  // ... more prompts
];
```

### Server Capabilities

The server declares prompt support:

```typescript
const server = new Server(
  {
    name: "translation-helps-mcp",
    version: getVersion(),
  },
  {
    capabilities: {
      tools: {},
      prompts: {}, // ← Prompts enabled
    },
  },
);
```

### Request Handlers

Two handlers are implemented:

1. `ListPromptsRequestSchema` - Returns list of available prompts
2. `GetPromptRequestSchema` - Returns the instructions for a specific prompt

---

## Testing

Run the test script to verify prompts work:

```bash
node test-prompts.mjs
```

This will:

1. List all available prompts
2. Test each prompt with sample arguments
3. Verify the response structure

---

## Next Steps

### Potential Enhancements:

1. **Add more prompts** for specific workflows:
   - `compare-term-across-passages` - Compare how a term is used in multiple verses
   - `study-translation-concept` - Deep dive into a TA concept with examples
   - `check-translation-consistency` - Verify terminology consistency

2. **Add prompt parameters:**
   - `includeFullArticles: boolean` - Optionally fetch full content vs. just titles
   - `maxWords: number` - Limit number of word articles to fetch
   - `difficulty: string` - Filter TA articles by difficulty level

3. **UI Integration:**
   - Add prompt selector to `/mcp-tools` page
   - Show example prompts on landing page
   - Document prompts in API reference

---

## Related Documentation

- [MCP Protocol Compliance](./MCP_PROTOCOL_COMPLIANCE.md) - Server implementation details
- [UW Translation Resources Guide](./docs/UW_TRANSLATION_RESOURCES_GUIDE.md) - Understanding the data
- [MCP Documentation](https://modelcontextprotocol.io/docs/learn/server-concepts#prompts) - Official MCP prompts spec

---

## Questions?

For questions or suggestions about prompts, please open an issue or discussion in the repository.
