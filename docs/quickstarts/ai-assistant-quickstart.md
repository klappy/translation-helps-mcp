# Integrate with Your AI Assistant

## What You'll Build

Connect your AI assistant (Claude, GPT, etc.) to Translation Tools using the Model Context Protocol (MCP), enabling natural language queries about biblical texts, word definitions, and translation resources.

## Prerequisites

- AI assistant that supports MCP (Claude Desktop, Cursor, or custom implementation)
- Basic understanding of MCP servers
- Node.js 18+ (for running MCP server)

## Step 1: Understanding MCP Integration

The Translation Tools MCP server provides your AI assistant with direct access to:

- Scripture text retrieval (ULT/UST)
- Translation notes and questions
- Word definitions and etymology
- Cross-reference discovery
- Language coverage information

Your AI can now answer questions like:

- "What does the word 'righteousness' mean in Romans 3:21?"
- "Show me John 3:16 in both literal and simplified translations"
- "What translation notes are available for Matthew 5:3-12?"
- "Find all verses that mention 'grace' in Ephesians"

## Step 2: MCP Server Setup

### Installation

```bash
# Clone the translation tools repository
git clone https://github.com/translation-tools/translation-helps-mcp.git
cd translation-helps-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration for Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "translation-tools": {
      "command": "node",
      "args": ["/path/to/translation-helps-mcp/build/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key-here",
        "OPENAI_API_KEY": "your-openai-key-here",
        "CACHE_TTL": "3600"
      }
    }
  }
}
```

### Configuration for Cursor

Add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "translation-tools": {
      "command": "node",
      "args": ["./build/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key-here",
        "OPENAI_API_KEY": "your-openai-key-here"
      }
    }
  }
}
```

## Step 3: Available MCP Tools

Your AI assistant will have access to these tools:

### Scripture Tools

```typescript
// Fetch scripture with alignment data
fetchScripture({
  reference: "John 3:16",
  includeAlignment: true,
  format: "json",
});

// Fetch ULT scripture specifically
fetchUltScripture({
  reference: "Romans 1:1-7",
  language: "en",
});

// Fetch UST scripture specifically
fetchUstScripture({
  reference: "Psalm 23",
  language: "en",
});
```

### Translation Help Tools

```typescript
// Get translation notes
fetchTranslationNotes({
  reference: "Matthew 5:3",
  language: "en",
});

// Get translation questions
fetchTranslationQuestions({
  reference: "Genesis 1:1",
  language: "en",
});

// Get word definition
getTranslationWord({
  word: "righteousness",
  language: "en",
});

// Browse words with search
browseTranslationWords({
  query: "grace",
  limit: 10,
});
```

### Discovery Tools

```typescript
// Extract references from text
extractReferences({
  text: "Paul mentions faith in Romans 3:21 and grace in Ephesians 2:8",
});

// Get available languages
getLanguages();

// Get available books
getAvailableBooks({
  language: "en",
});

// Check language coverage
getLanguageCoverage({
  language: "es-419",
});
```

### Context Tools

```typescript
// Get contextual information
getContext({
  reference: "Romans 3:21-26",
  includeNotes: true,
  includeQuestions: true,
  includeWords: true,
});

// Get words for specific reference
getWordsForReference({
  reference: "John 1:1",
  language: "en",
});
```

## Step 4: Example AI Conversations

### Basic Scripture Lookup

```
User: "Show me John 3:16 in both ULT and UST"

AI: I'll fetch both the literal (ULT) and simplified (UST) translations for you.

[Uses fetchScripture tool with reference="John 3:16"]

**John 3:16**

**ULT (Literal Translation):**
For God so loved the world that he gave his only Son, so that everyone who believes in him would not perish but have eternal life.

**UST (Simplified Translation):**
God loved the people in the world so much that he gave his only Son. He did this so that everyone who trusts in his Son will not die forever but will live forever with God.

The ULT maintains the word order and structure closer to the original Greek, while the UST clarifies the meaning for easier understanding.
```

### Word Study

```
User: "What does 'righteousness' mean in biblical context?"

AI: Let me look up the biblical definition of "righteousness" for you.

[Uses getTranslationWord tool with word="righteousness"]

**Righteousness** in biblical context refers to:

**Definition:** The state of being in right relationship with God; conformity to God's moral law and character.

**Translation Notes:**
- Often translates the Greek word "dikaiosyne"
- Can refer to both legal standing before God (justification) and ethical behavior
- Sometimes paired with "justice" as they share the same root concept

**Key Usage:**
- Romans 3:21-22: God's righteousness revealed through faith
- Matthew 5:6: Blessed are those who hunger for righteousness
- 2 Corinthians 5:21: Christ became our righteousness

Would you like me to show specific verses where this word appears?
```

### Contextual Study

```
User: "Help me understand the Beatitudes - what cultural background should I know?"

AI: I'll gather comprehensive information about the Beatitudes for you.

[Uses getContext tool with reference="Matthew 5:3-12"]

**The Beatitudes (Matthew 5:3-12) - Cultural Context**

**Translation Notes provide this background:**
- Jesus spoke to a largely Jewish audience familiar with Hebrew wisdom literature
- "Blessed" (makarios) means "divinely favored" or "truly happy"
- The structure follows Hebrew poetic patterns with repetition and parallelism

**Key Cultural Points:**
1. **"Poor in spirit"** - Reflects Hebrew "anawim" (the humble/afflicted)
2. **"Meek"** - Not weakness but controlled strength, like Moses
3. **"Persecuted for righteousness"** - Expected experience for God's people

**Translation Questions help clarify:**
- Q: What does it mean to be "poor in spirit"?
- A: To recognize one's spiritual need and dependence on God

Would you like me to explore any specific beatitude in more detail?
```

## Step 5: Advanced Integration Patterns

### Custom MCP Client

If you're building your own AI assistant:

```typescript
// mcp-client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

class TranslationToolsClient {
  private client: Client;

  async initialize() {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["./build/index.js"],
    });

    this.client = new Client(
      {
        name: "translation-ai-assistant",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    await this.client.connect(transport);
  }

  async fetchScripture(reference: string) {
    const result = await this.client.callTool({
      name: "fetchScripture",
      arguments: { reference },
    });
    return result.content;
  }

  async studyWord(word: string) {
    const [definition, verses] = await Promise.all([
      this.client.callTool({
        name: "getTranslationWord",
        arguments: { word },
      }),
      this.client.callTool({
        name: "browseTranslationWords",
        arguments: { query: word, limit: 5 },
      }),
    ]);

    return { definition: definition.content, verses: verses.content };
  }
}
```

### LangChain Integration

```typescript
// langchain-translation-tools.ts
import { Tool } from "langchain/tools";

export class ScriptureLookupTool extends Tool {
  name = "scripture_lookup";
  description = "Look up Bible verses in ULT/UST translations";

  async _call(reference: string): Promise<string> {
    // Use MCP client to fetch scripture
    const result = await translationClient.fetchScripture(reference);
    return JSON.stringify(result);
  }
}

export class WordStudyTool extends Tool {
  name = "word_study";
  description = "Get biblical word definitions and usage";

  async _call(word: string): Promise<string> {
    const result = await translationClient.studyWord(word);
    return JSON.stringify(result);
  }
}

// Usage in LangChain agent
const tools = [
  new ScriptureLookupTool(),
  new WordStudyTool(),
  // ... other tools
];

const agent = createReactAgent(llm, tools, prompt);
```

### OpenAI Assistant Integration

```typescript
// openai-assistant.ts
import OpenAI from "openai";

const openai = new OpenAI();

// Create assistant with translation tools
const assistant = await openai.beta.assistants.create({
  name: "Biblical Studies Assistant",
  instructions: `You are a biblical studies assistant with access to comprehensive translation resources. 

  You can:
  - Look up scripture in multiple translations
  - Explain biblical words and concepts  
  - Provide cultural and historical context
  - Find cross-references and related passages

  Always cite your sources and explain translation differences when relevant.`,

  tools: [
    {
      type: "function",
      function: {
        name: "fetchScripture",
        description: "Fetch scripture text in ULT and UST translations",
        parameters: {
          type: "object",
          properties: {
            reference: {
              type: "string",
              description: "Scripture reference (e.g. 'John 3:16')",
            },
          },
          required: ["reference"],
        },
      },
    },
    // ... define other translation tools
  ],
});

// Handle function calls
async function handleFunctionCall(functionName: string, arguments: any) {
  switch (functionName) {
    case "fetchScripture":
      return await translationClient.fetchScripture(arguments.reference);
    // ... handle other functions
  }
}
```

## Step 6: Best Practices

### Error Handling

```typescript
// Robust error handling for MCP calls
async function safeToolCall(toolName: string, args: any) {
  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    return result.content;
  } catch (error) {
    console.error(`Tool call failed: ${toolName}`, error);

    // Provide graceful fallback
    return {
      error: true,
      message: `Unable to fetch ${toolName} data. Please try again.`,
      fallback: "You may want to consult a physical Bible or online resource.",
    };
  }
}
```

### Caching Strategies

```typescript
// Implement caching for frequently accessed resources
class CachedTranslationClient {
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();

  async fetchWithCache(toolName: string, args: any, ttl = 3600) {
    const key = `${toolName}:${JSON.stringify(args)}`;
    const now = Date.now();

    // Check cache
    if (this.cache.has(key) && this.cacheExpiry.get(key)! > now) {
      return this.cache.get(key);
    }

    // Fetch fresh data
    const result = await this.client.callTool({ name: toolName, arguments: args });

    // Cache result
    this.cache.set(key, result.content);
    this.cacheExpiry.set(key, now + ttl * 1000);

    return result.content;
  }
}
```

### Rate Limiting

```typescript
// Implement rate limiting to be respectful
class RateLimitedClient {
  private lastRequest = 0;
  private minInterval = 100; // 100ms between requests

  async callTool(toolName: string, args: any) {
    const now = Date.now();
    const elapsed = now - this.lastRequest;

    if (elapsed < this.minInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minInterval - elapsed));
    }

    this.lastRequest = Date.now();
    return await this.client.callTool({ name: toolName, arguments: args });
  }
}
```

## Step 7: Sample Prompts for Your AI

Train your AI with these effective prompt patterns:

### System Prompt

```
You are a biblical studies assistant with access to comprehensive translation resources through MCP tools.

When users ask about:
- Scripture passages: Use fetchScripture to get ULT/UST translations
- Word meanings: Use getTranslationWord for definitions
- Cultural context: Use fetchTranslationNotes for background
- Study questions: Use fetchTranslationQuestions for comprehension

Always:
1. Cite which translation you're using (ULT/UST)
2. Explain translation differences when significant
3. Provide cultural/historical context when relevant
4. Suggest related passages for deeper study

Be accurate, respectful, and acknowledge when information is uncertain.
```

### Example User Prompts

```
"Explain the parable of the sower with cultural background"
"Compare how different translations handle Romans 3:25"
"What Greek words are behind 'love' in 1 Corinthians 13?"
"Find verses about forgiveness in the Sermon on the Mount"
"What would a first-century Jew understand by 'Son of Man'?"
```

## Troubleshooting

### MCP Server Not Starting

- Check Node.js version (requires 18+)
- Verify build completed successfully
- Check environment variables are set
- Look for port conflicts

### Tool Calls Failing

- Verify MCP server is running
- Check network connectivity
- Validate tool arguments format
- Review server logs for errors

### Performance Issues

- Implement caching for repeated queries
- Use pagination for large result sets
- Consider request coalescing
- Monitor rate limits

---

**Congratulations!** Your AI assistant now has direct access to comprehensive biblical translation resources. It can provide instant access to multiple translations, word studies, cultural context, and cross-references, making it a powerful tool for biblical study and translation work.
