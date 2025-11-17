# Building an MCP Client for Remote Servers

This tutorial shows you how to build an MCP client that connects to our remote Translation Helps MCP server. You'll learn to create a client that can use our tools and prompts to access Bible translation resources.

**Server URL**: `https://translation-helps-mcp-945.pages.dev/api/mcp`

---

## Prerequisites

- Python 3.8+ or Node.js 18+
- Basic understanding of async programming
- An API key for your LLM provider (OpenAI, Anthropic, etc.)

---

## Understanding Remote vs Local MCP Servers

**Local MCP Servers** (STDIO):

- Run on your local machine
- Communicate via standard input/output
- Require installation and local setup

**Remote MCP Servers** (HTTP):

- Hosted on the internet
- Accessible via HTTP/HTTPS
- No local installation required
- Perfect for web applications and shared services

Our Translation Helps server is a **remote HTTP server**, so we'll use HTTP transport instead of STDIO.

---

## Python Client Tutorial

### Step 1: Set Up Your Project

```bash
# Create project directory
mkdir mcp-translation-client
cd mcp-translation-client

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install anthropic python-dotenv httpx
```

### Step 2: Create Environment File

Create a `.env` file:

```bash
# .env
ANTHROPIC_API_KEY=your-api-key-here
# Or use OpenAI:
# OPENAI_API_KEY=your-api-key-here
```

### Step 3: Create the Client

Create `client.py`:

```python
import asyncio
import os
import httpx
from typing import Optional, Dict, Any

from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

# Our remote server URL
REMOTE_SERVER_URL = "https://translation-helps-mcp-945.pages.dev/api/mcp"

class RemoteMCPClient:
    def __init__(self):
        self.anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.http_client = httpx.AsyncClient()
        self.tools_cache: Optional[list] = None
        self.prompts_cache: Optional[list] = None

    async def _send_request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Send an HTTP POST request to the MCP server"""
        payload = {"method": method}
        if params:
            payload["params"] = params

        response = await self.http_client.post(
            REMOTE_SERVER_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30.0
        )
        response.raise_for_status()
        return response.json()

    async def connect_to_remote_server(self):
        """Connect to the remote Translation Helps MCP server"""
        print(f"Connecting to remote server: {REMOTE_SERVER_URL}")

        # Initialize the server
        init_response = await self._send_request("initialize")
        print(f"✅ Server initialized: {init_response.get('serverInfo', {}).get('name')} v{init_response.get('serverInfo', {}).get('version')}")

        # List available tools
        tools_response = await self._send_request("tools/list")
        self.tools_cache = tools_response.get("tools", [])
        print(f"\n✅ Available tools: {[tool['name'] for tool in self.tools_cache]}")

        # List available prompts
        prompts_response = await self._send_request("prompts/list")
        self.prompts_cache = prompts_response.get("prompts", [])
        print(f"✅ Available prompts: {[prompt['name'] for prompt in self.prompts_cache]}")

    async def process_query(self, query: str) -> str:
        """Process a query using Claude and available MCP tools"""
        if not self.tools_cache:
            raise RuntimeError("Not connected to server. Call connect_to_remote_server() first.")

        # Use cached tools
        available_tools = [{
            "name": tool["name"],
            "description": tool["description"],
            "input_schema": tool["inputSchema"]
        } for tool in self.tools_cache]

        messages = [{"role": "user", "content": query}]

        # Initial Claude API call
        response = self.anthropic.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=messages,
            tools=available_tools
        )

        final_text = []
        assistant_message_content = []

        for content in response.content:
            if content.type == 'text':
                final_text.append(content.text)
                assistant_message_content.append(content)

            elif content.type == 'tool_use':
                tool_name = content.name
                tool_args = content.input

                print(f"\n🔧 Calling tool: {tool_name}")
                print(f"   Arguments: {tool_args}")

                # Execute tool call via MCP server
                try:
                    result = await self._send_request(
                        "tools/call",
                        {
                            "name": tool_name,
                            "arguments": tool_args
                        }
                    )

                    # Extract text from tool result
                    tool_result_text = ""
                    if "content" in result:
                        for item in result["content"]:
                            if isinstance(item, dict) and item.get("type") == "text":
                                tool_result_text += item.get("text", "")
                            elif isinstance(item, str):
                                tool_result_text += item
                    elif "text" in result:
                        tool_result_text = result["text"]
                    else:
                        # Fallback: stringify the entire result
                        tool_result_text = str(result)

                    print(f"✅ Tool result received ({len(tool_result_text)} chars)")

                    # Add to conversation
                    assistant_message_content.append(content)
                    messages.append({
                        "role": "assistant",
                        "content": assistant_message_content
                    })
                    messages.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": content.id,
                            "content": tool_result_text
                        }]
                    })

                    # Get next response from Claude
                    response = self.anthropic.messages.create(
                        model="claude-sonnet-4-20250514",
                        max_tokens=2000,
                        messages=messages,
                        tools=available_tools
                    )

                    if response.content:
                        final_text.append(response.content[0].text)

                except Exception as e:
                    print(f"❌ Tool execution error: {e}")
                    final_text.append(f"[Error executing {tool_name}: {str(e)}]")

        return "\n".join(final_text)

    async def use_prompt(self, prompt_name: str, arguments: dict):
        """Use an MCP prompt to get guided instructions"""
        if not self.tools_cache:
            raise RuntimeError("Not connected to server.")

        print(f"\n📝 Getting prompt: {prompt_name}")

        # Get the prompt
        prompt_response = await self._send_request(
            "prompts/get",
            {
                "name": prompt_name,
                "arguments": arguments
            }
        )

        # The prompt returns messages that guide the AI
        # You can use these messages directly with your LLM
        messages = []
        prompt_messages = prompt_response.get("messages", [])
        for msg in prompt_messages:
            if msg.get("role") == "user":
                content = msg.get("content", {})
                if isinstance(content, dict) and content.get("type") == "text":
                    messages.append({
                        "role": "user",
                        "content": content.get("text", "")
                    })
                elif isinstance(content, str):
                    messages.append({
                        "role": "user",
                        "content": content
                    })

        # Use the prompt messages with Claude
        response = self.anthropic.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=messages,
            tools=[{
                "name": tool["name"],
                "description": tool["description"],
                "input_schema": tool["inputSchema"]
            } for tool in self.tools_cache]
        )

        return response.content[0].text

    async def chat_loop(self):
        """Run an interactive chat loop"""
        print("\n" + "="*60)
        print("Translation Helps MCP Client")
        print("="*60)
        print("\nCommands:")
        print("  - Ask questions about Bible passages")
        print("  - Use 'prompt:<name>' to use a prompt (e.g., 'prompt:translation-helps-for-passage')")
        print("  - Type 'quit' to exit")
        print("\n" + "="*60)

        while True:
            try:
                query = input("\n💬 Your question: ").strip()

                if query.lower() == 'quit':
                    break

                # Check if user wants to use a prompt
                if query.startswith('prompt:'):
                    prompt_name = query.split(':', 1)[1].strip()
                    # For prompts, you might want to ask for arguments
                    print(f"Using prompt: {prompt_name}")
                    reference = input("Enter Bible reference (e.g., John 3:16): ").strip()
                    language = input("Enter language (default: en): ").strip() or "en"

                    response = await self.use_prompt(
                        prompt_name,
                        {"reference": reference, "language": language}
                    )
                else:
                    response = await self.process_query(query)

                print("\n" + "="*60)
                print("🤖 Response:")
                print("="*60)
                print(response)
                print("="*60)

            except KeyboardInterrupt:
                print("\n\nExiting...")
                break
            except Exception as e:
                print(f"\n❌ Error: {str(e)}")
                import traceback
                traceback.print_exc()

    async def cleanup(self):
        """Clean up resources"""
        await self.http_client.aclose()

async def main():
    client = RemoteMCPClient()
    try:
        await client.connect_to_remote_server()
        await client.chat_loop()
    finally:
        await client.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
```

### Step 4: Run the Client

```bash
python client.py
```

---

## Node.js/TypeScript Client Tutorial

### Step 1: Set Up Your Project

```bash
# Create project directory
mkdir mcp-translation-client
cd mcp-translation-client

# Initialize Node.js project
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk @anthropic-ai/sdk dotenv
npm install -D typescript @types/node tsx
```

### Step 2: Create TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

### Step 3: Create Environment File

Create `.env`:

```bash
ANTHROPIC_API_KEY=your-api-key-here
```

### Step 4: Create the Client

Create `src/client.ts`:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";

dotenv.config();

const REMOTE_SERVER_URL = "https://translation-helps-mcp-945.pages.dev/api/mcp";

class RemoteMCPClient {
  private client: Client;
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async connect(): Promise<void> {
    console.log(`Connecting to remote server: ${REMOTE_SERVER_URL}`);

    // Create SSE transport for remote HTTP server
    const transport = new SSEClientTransport(new URL(REMOTE_SERVER_URL), {});

    this.client = new Client(
      {
        name: "translation-helps-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      },
    );

    await this.client.connect(transport);

    // List available tools
    const tools = await this.client.listTools();
    console.log(
      `\n✅ Connected! Available tools: ${tools.tools.map((t) => t.name).join(", ")}`,
    );

    // List available prompts
    const prompts = await this.client.listPrompts();
    console.log(
      `✅ Available prompts: ${prompts.prompts.map((p) => p.name).join(", ")}`,
    );
  }

  async processQuery(query: string): Promise<string> {
    if (!this.client || !this.toolsCache) {
      throw new Error("Not connected. Call connect() first.");
    }

    // Use cached tools
    const availableTools = this.toolsCache.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: query },
    ];

    // Initial Claude API call
    let response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages,
      tools: availableTools,
    });

    const finalText: string[] = [];
    let assistantMessages: Anthropic.MessageParam[] = [];

    for (const content of response.content) {
      if (content.type === "text") {
        finalText.push(content.text);
        assistantMessages.push({ role: "assistant", content: content.text });
      } else if (content.type === "tool_use") {
        const toolName = content.name;
        const toolArgs = content.input;

        console.log(`\n🔧 Calling tool: ${toolName}`);
        console.log(`   Arguments:`, toolArgs);

        try {
          // Execute tool call via MCP server
          const result = await this.client.callTool({
            name: toolName,
            arguments: toolArgs as Record<string, unknown>,
          });

          let toolResultText = "";
          for (const item of result.content) {
            if (item.type === "text") {
              toolResultText += item.text;
            } else if (typeof item === "string") {
              toolResultText += item;
            }
          }

          console.log(
            `✅ Tool result received (${toolResultText.length} chars)`,
          );

          // Add to conversation
          messages.push(...assistantMessages);
          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: content.id,
                content: toolResultText,
              },
            ],
          });

          // Get next response from Claude
          response = await this.anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            messages,
            tools: availableTools,
          });

          if (response.content[0]?.type === "text") {
            finalText.push(response.content[0].text);
          }
        } catch (error) {
          console.error(`❌ Tool execution error:`, error);
          finalText.push(`[Error executing ${toolName}: ${error}]`);
        }
      }
    }

    return finalText.join("\n");
  }

  async usePrompt(
    promptName: string,
    arguments: Record<string, string>,
  ): Promise<string> {
    if (!this.client) {
      throw new Error("Not connected.");
    }

    console.log(`\n📝 Getting prompt: ${promptName}`);

    // Get the prompt
    const promptResponse = await this.client.getPrompt({
      name: promptName,
      arguments,
    });

    // Convert prompt messages to Claude format
    const messages: Anthropic.MessageParam[] = [];
    for (const msg of promptResponse.messages) {
      if (msg.role === "user" && msg.content.type === "text") {
        messages.push({
          role: "user",
          content: msg.content.text,
        });
      }
    }

    // Use cached tools
    if (!this.toolsCache) {
      const toolsResponse = await this.client.listTools();
      this.toolsCache = toolsResponse.tools;
    }
    const availableTools = this.toolsCache.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    // Use the prompt messages with Claude
    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages,
      tools: availableTools,
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  async chatLoop(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("Translation Helps MCP Client");
    console.log("=".repeat(60));
    console.log("\nCommands:");
    console.log("  - Ask questions about Bible passages");
    console.log("  - Use 'prompt:<name>' to use a prompt");
    console.log("  - Type 'quit' to exit");
    console.log("\n" + "=".repeat(60));

    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (): Promise<void> => {
      return new Promise((resolve) => {
        rl.question("\n💬 Your question: ", async (query: string) => {
          if (query.toLowerCase() === "quit") {
            rl.close();
            resolve();
            return;
          }

          try {
            let response: string;

            if (query.startsWith("prompt:")) {
              const promptName = query.split(":", 1)[1].trim();
              console.log(`Using prompt: ${promptName}`);
              // In a real app, you'd ask for arguments
              response = await this.usePrompt(promptName, {
                reference: "John 3:16",
                language: "en",
              });
            } else {
              response = await this.processQuery(query);
            }

            console.log("\n" + "=".repeat(60));
            console.log("🤖 Response:");
            console.log("=".repeat(60));
            console.log(response);
            console.log("=".repeat(60));
          } catch (error) {
            console.error(`\n❌ Error:`, error);
          }

          resolve(askQuestion());
        });
      });
    };

    await askQuestion();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }
}

async function main() {
  const client = new RemoteMCPClient();
  try {
    await client.connect();
    await client.chatLoop();
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
```

### Step 5: Add Scripts to package.json

```json
{
  "scripts": {
    "start": "tsx src/client.ts",
    "build": "tsc"
  }
}
```

### Step 6: Run the Client

```bash
npm start
```

---

## Example Usage

Once your client is running, try these queries:

### Using Tools Directly

```
💬 Your question: What does John 3:16 say?
```

The client will:

1. Send your query to Claude
2. Claude decides to use `fetch_scripture` tool
3. Client calls the tool via MCP server
4. Returns scripture text to Claude
5. Claude provides a natural language response

### Using Prompts

```
💬 Your question: prompt:translation-helps-for-passage
Enter Bible reference: John 3:16
Enter language: en
```

This uses the `translation-helps-for-passage` prompt, which automatically chains multiple tools to provide comprehensive translation help.

### Complex Queries

```
💬 Your question: What translation words are used in Romans 8:28?
```

Claude will:

1. Use `fetch_translation_word_links` to find words
2. Use `fetch_translation_word` for each word
3. Compile a comprehensive answer

---

## Key Differences: Remote vs Local

| Aspect             | Local (STDIO)          | Remote (HTTP)              |
| ------------------ | ---------------------- | -------------------------- |
| **Transport**      | `stdio_client`         | `sse_client` or HTTP POST  |
| **Connection**     | Local file path        | HTTP URL                   |
| **Setup**          | Install server locally | Just need URL              |
| **Access**         | Single machine         | Anywhere with internet     |
| **Authentication** | Usually none           | May require OAuth/API keys |

---

## Available Tools

Our server provides 10 tools:

1. **`fetch_scripture`** - Get Bible text in multiple translations
2. **`fetch_translation_notes`** - Get verse-specific translation notes
3. **`fetch_translation_questions`** - Get comprehension questions
4. **`fetch_translation_word_links`** - Get word links for a passage
5. **`fetch_translation_word`** - Get word definitions and articles
6. **`fetch_translation_academy`** - Get training articles
7. **`get_system_prompt`** - Get system prompt information
8. **`get_languages`** - List available languages
9. **`fetch_resources`** - Get all resources for a passage
10. **`search_resources`** - Search across resources

## Available Prompts

Our server provides 3 prompts:

1. **`translation-helps-for-passage`** - Complete translation help (scripture + notes + questions + words + academy)
2. **`get-translation-words-for-passage`** - Get all translation words for a passage
3. **`get-translation-academy-for-passage`** - Get academy articles referenced in notes

---

## Troubleshooting

### Connection Issues

**Error: "Failed to connect"**

- Verify the server URL is correct: `https://translation-helps-mcp-945.pages.dev/api/mcp`
- Check your internet connection
- Ensure the server is online (try accessing the URL in a browser)

**Error: "Transport not supported"**

- Make sure you're using `sse_client` or HTTP POST transport, not `stdio_client`
- Check your MCP SDK version supports remote servers

### Tool Execution Issues

**Error: "Tool not found"**

- List tools first: `await client.list_tools()` to see available tools
- Verify tool names match exactly (case-sensitive)

**Error: "Invalid arguments"**

- Check the tool's `inputSchema` for required parameters
- Ensure argument types match (string, number, etc.)

### Authentication

Our server is **open and free** - no authentication required. If you see auth errors, check:

- You're using the correct server URL
- Your client isn't trying to use OAuth (not needed for our server)

---

## Next Steps

1. **Customize the UI**: Add a web interface or GUI
2. **Add Caching**: Cache tool results for better performance
3. **Error Handling**: Implement retry logic and better error messages
4. **Streaming**: Use streaming responses for real-time updates
5. **Multiple Servers**: Connect to multiple MCP servers simultaneously

---

## Resources

- [MCP Specification](https://modelcontextprotocol.io/docs/specification)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Build an MCP Client (Official Tutorial)](https://modelcontextprotocol.io/docs/develop/build-client)
- [Connect to Remote MCP Servers (Official Guide)](https://modelcontextprotocol.io/docs/develop/connect-remote-servers)
- [Our Server Documentation](/getting-started)

---

## Complete Example: Simple Web Client

Here's a minimal web-based example using JavaScript:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Translation Helps MCP Client</title>
  </head>
  <body>
    <h1>Translation Helps MCP Client</h1>
    <input type="text" id="query" placeholder="Ask about a Bible passage..." />
    <button onclick="askQuestion()">Ask</button>
    <div id="response"></div>

    <script type="module">
      const SERVER_URL = "https://translation-helps-mcp-945.pages.dev/api/mcp";

      async function askQuestion() {
        const query = document.getElementById("query").value;
        const responseDiv = document.getElementById("response");
        responseDiv.innerHTML = "Thinking...";

        try {
          // Initialize connection
          const initResponse = await fetch(SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method: "initialize" }),
          });
          const initData = await initResponse.json();

          // List tools
          const toolsResponse = await fetch(SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ method: "tools/list" }),
          });
          const toolsData = await toolsResponse.json();

          // Call a tool (example: fetch_scripture)
          const toolResponse = await fetch(SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: "tools/call",
              params: {
                name: "fetch_scripture",
                arguments: {
                  reference: query,
                  language: "en",
                },
              },
            }),
          });
          const toolData = await toolResponse.json();

          responseDiv.innerHTML = `<pre>${JSON.stringify(toolData, null, 2)}</pre>`;
        } catch (error) {
          responseDiv.innerHTML = `Error: ${error.message}`;
        }
      }

      window.askQuestion = askQuestion;
    </script>
  </body>
</html>
```

This simple example shows the basic HTTP POST pattern for calling MCP tools on a remote server.

---

## Summary

You've learned how to:

- ✅ Connect to a remote MCP server via HTTP
- ✅ List available tools and prompts
- ✅ Call tools programmatically
- ✅ Use prompts for guided workflows
- ✅ Integrate with LLMs (Claude, OpenAI, etc.)
- ✅ Handle tool execution and responses

Your client can now access all Bible translation resources from our remote server!
