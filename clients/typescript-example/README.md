# Translation Helps MCP TypeScript Example Client

This is an example TypeScript client that demonstrates how to use the `@translation-helps/mcp-client` SDK to build a client that integrates with AI providers (Anthropic Claude, OpenAI, etc.).

## Overview

This example follows the correct MCP flow:

1. **Connect to MCP server** → Get available tools and prompts
2. **Send user query to AI WITH tools** → AI receives both the question and available tools
3. **AI decides which tools to call** → The AI model intelligently selects which tools to use
4. **Execute tool calls via SDK** → Client executes tool calls through the MCP SDK
5. **Feed results back to AI** → Tool results are sent back to the AI
6. **AI provides final answer** → AI synthesizes the tool results into a natural language response

## Installation

```bash
cd clients/typescript-example
npm install
```

### Install AI Provider SDK

**For OpenAI (default):**

```bash
npm install openai
```

**For Anthropic Claude (optional):**

```bash
npm install @anthropic-ai/sdk
```

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and add your OpenAI API key:

```env
# For OpenAI (default)
OPENAI_API_KEY=your-openai-api-key-here

# Optional: Custom MCP server URL
# MCP_SERVER_URL=https://translation-helps-mcp-945.pages.dev/api/mcp

# Optional: Change AI provider (defaults to 'openai')
# AI_PROVIDER=openai
# AI_PROVIDER=anthropic  # if using Anthropic
```

## Usage

### Basic Usage

```bash
# Using OpenAI (default)
npm start "What does John 3:16 say?"

# Using Anthropic (if installed)
AI_PROVIDER=anthropic npm start "What does John 3:16 say?"
```

### Development Mode

```bash
npm run dev
```

This will watch for file changes and automatically restart.

### Build

```bash
npm run build
```

## Code Example

```typescript
import { TranslationHelpsExampleClient } from "./src/index.js";

const client = new TranslationHelpsExampleClient();

// Initialize with your preferred AI provider
await client.initialize("anthropic"); // or 'openai'

// Process a query - the AI will automatically decide which tools to use
const response = await client.processQuery(
  "What does John 3:16 say and what are the key translation considerations?",
);

console.log(response);
```

## How It Works

### 1. MCP Integration

The client uses the `@translation-helps/mcp-client` SDK to:

- Connect to the remote MCP server
- Discover available tools and prompts
- Execute tool calls
- Handle MCP protocol details automatically

### 2. AI Provider Integration

The client supports multiple AI providers:

- **Anthropic Claude**: Uses `@anthropic-ai/sdk`
- **OpenAI**: Uses `openai` package

The client converts MCP tools to each provider's specific format automatically.

### 3. Tool Calling Flow

```
User Query
    ↓
AI receives query + available tools
    ↓
AI decides: "I need to call fetch_scripture"
    ↓
Client executes: mcpClient.callTool('fetch_scripture', {...})
    ↓
Tool result fed back to AI
    ↓
AI provides final answer with scripture text
```

## Available Tools

The MCP server provides these tools (automatically discovered):

- `fetch_scripture` - Get Bible text
- `fetch_translation_notes` - Translation notes
- `fetch_translation_questions` - Comprehension questions
- `fetch_translation_word_links` - Word links
- `fetch_translation_word` - Word definitions
- `fetch_translation_academy` - Academy articles
- `get_system_prompt` - System prompt
- `get_languages` - Available languages
- `fetch_resources` - All resources
- `search_resources` - Search resources

## Available Prompts

- `translation-helps-for-passage` - Complete translation help
- `get-translation-words-for-passage` - Get all translation words
- `get-translation-academy-for-passage` - Get academy articles

## Architecture

```
┌─────────────────┐
│  User Query     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  AI Provider (Claude/GPT) │
│  + Available MCP Tools   │
└────────┬──────────────────┘
         │
         ▼ (AI decides to call tool)
┌─────────────────────────┐
│  TranslationHelpsClient │
│  (MCP SDK)              │
└────────┬──────────────────┘
         │
         ▼
┌─────────────────────────┐
│  MCP Server (Remote)     │
│  Returns tool results    │
└────────┬──────────────────┘
         │
         ▼
┌─────────────────────────┐
│  AI Provider             │
│  Synthesizes response    │
└────────┬──────────────────┘
         │
         ▼
┌─────────────────┐
│  Final Answer   │
└─────────────────┘
```

## Key Concepts

### The AI Makes Decisions

**✅ Correct Flow:**

- AI receives query + tools
- AI decides which tools to call
- Client executes tool calls
- Results fed back to AI

**❌ Incorrect Flow:**

- Client decides which tools to call
- Client calls tools directly
- Client formats response

The power of MCP is that the AI intelligently selects which tools to use based on the user's query!

### Tool Format Conversion

Different AI providers use different tool formats:

- **Anthropic**: `{ name, description, input_schema }`
- **OpenAI**: `{ type: 'function', function: { name, description, parameters } }`

The client automatically converts MCP tools to each provider's format.

## Error Handling

The client includes error handling for:

- Network errors
- Tool execution errors
- AI provider errors
- Maximum iteration limits (prevents infinite loops)

## Extending the Client

### Adding a New AI Provider

1. Add provider type to `AIProvider` union
2. Implement `initializeAIProvider()` case
3. Implement `convertToolsToAIFormat()` case
4. Implement `extractToolCalls()` case
5. Implement `extractFinalText()` case

### Custom Tool Processing

You can extend the client to:

- Add custom tool result formatting
- Implement caching
- Add retry logic
- Add logging/monitoring

## Troubleshooting

### "AI provider SDK not installed"

Install the required SDK:

```bash
npm install @anthropic-ai/sdk  # for Anthropic
npm install openai              # for OpenAI
```

### "API key not found"

Make sure your `.env` file exists and contains:

```env
ANTHROPIC_API_KEY=your-key-here
# OR
OPENAI_API_KEY=your-key-here
```

### "Maximum iterations reached"

The AI may be stuck in a loop. Try:

- Simplifying your query
- Checking tool responses for errors
- Increasing `maxIterations` in the code

## License

MIT

## Links

- [SDK Documentation](../../packages/js-sdk/README.md)
- [MCP Server Documentation](https://translation-helps-mcp-945.pages.dev)
- [MCP Protocol](https://modelcontextprotocol.io)
