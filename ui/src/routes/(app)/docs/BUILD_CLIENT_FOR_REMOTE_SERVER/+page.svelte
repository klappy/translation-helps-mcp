<script lang="ts">
	import {
		ArrowLeft,
		Code,
		Copy,
		Check,
		Terminal,
		BookOpen,
		Lightbulb,
		CheckCircle2,
		Package
	} from 'lucide-svelte';
	import { onMount, afterUpdate } from 'svelte';
	import Prism from 'prismjs';
	import 'prismjs/components/prism-python';
	import 'prismjs/components/prism-typescript';
	import 'prismjs/components/prism-bash';
	import 'prismjs/themes/prism-tomorrow.css';

	type LanguageTab = 'python' | 'typescript';
	let activeLanguage: LanguageTab = 'python';
	let useSDK = false;
	let copiedCode = '';
	let currentStep = 1;
	let codeElement: HTMLElement | null = null;
	let completeCodeElement: HTMLElement | null = null;

	const SERVER_URL = 'https://translation-helps-mcp-945.pages.dev/api/mcp';

	function copyToClipboard(text: string, id: string) {
		navigator.clipboard.writeText(text);
		copiedCode = id;
		setTimeout(() => (copiedCode = ''), 2000);
	}

	const pythonSteps = [
		{
			title: 'Set Up Your Project',
			description: 'Create a new project directory and install dependencies',
			code: `# Create project directory
mkdir mcp-translation-client
cd mcp-translation-client

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install required packages
# Install your AI provider's SDK (e.g., anthropic, openai, etc.)
pip install <your-ai-provider-sdk> python-dotenv httpx`,
			explanation:
				"We start by creating a clean project directory and setting up a Python virtual environment. This keeps our dependencies isolated. Install your AI provider's SDK (check their documentation for the exact package name), along with `python-dotenv` for environment variables and `httpx` for HTTP requests to our MCP server."
		},
		{
			title: 'Create Environment File',
			description: 'Store your API key securely',
			code: `# .env
# Set your AI provider's API key (e.g., ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)
YOUR_AI_PROVIDER_API_KEY=your-api-key-here`,
			explanation:
				"Create a `.env` file in your project root. This file stores sensitive credentials like API keys. Never commit this file to version control! Add `.env` to your `.gitignore` file. Refer to your AI provider's documentation for the exact environment variable name they use."
		},
		{
			title: 'Create the Client Class',
			description: 'Build the core client that connects to our MCP server',
			code: `import asyncio
import os
import httpx
from typing import Optional, Dict, Any

# Import your AI provider's SDK
# from anthropic import Anthropic
# from openai import OpenAI
# (Refer to your provider's documentation for correct import)

from dotenv import load_dotenv

load_dotenv()

# Our remote server URL
REMOTE_SERVER_URL = "${SERVER_URL}"

class RemoteMCPClient:
    def __init__(self):
        # Initialize your AI provider's client
        # self.ai_client = YourAIProvider(api_key=os.getenv("YOUR_API_KEY"))
        # (Refer to your provider's documentation for initialization)
        
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
        return response.json()`,
			explanation:
				"This is the foundation of our client. The `_send_request` method handles all communication with the MCP server. It sends JSON payloads via HTTP POST, which is how remote MCP servers work (unlike local servers that use STDIO). Initialize your AI provider's client according to their documentation."
		},
		{
			title: 'Connect to the Server',
			description: 'Initialize the connection and discover available tools',
			code: `    async def connect_to_remote_server(self):
        """Connect to the remote Translation Helps MCP server"""
        print(f"Connecting to remote server: {REMOTE_SERVER_URL}")
        
        # Initialize the server
        init_response = await self._send_request("initialize")
        print(f"✅ Server initialized: {init_response.get('serverInfo', {}).get('name')} v{init_response.get('serverInfo', {}).get('version')}")
        
        # List available tools
        tools_response = await self._send_request("tools/list")
        self.tools_cache = tools_response.get("tools", [])
        print(f"\\n✅ Available tools: {[tool['name'] for tool in self.tools_cache]}")
        
        # List available prompts
        prompts_response = await self._send_request("prompts/list")
        self.prompts_cache = prompts_response.get("prompts", [])
        print(f"✅ Available prompts: {[prompt['name'] for prompt in self.prompts_cache]}")`,
			explanation:
				"The `initialize` method tells the server we're connecting. Then we fetch the list of available tools and prompts. This discovery step is important - it lets us know what capabilities the server provides before we try to use them."
		},
		{
			title: 'Process Queries with Tools',
			description: 'Use your AI provider to decide which tools to call, then execute them',
			code: `    async def process_query(self, query: str) -> str:
        """Process a query using your AI provider and available MCP tools"""
        if not self.tools_cache:
            raise RuntimeError("Not connected to server. Call connect_to_remote_server() first.")
        
        # Convert MCP tools to your AI provider's format
        # Each provider has different tool formats - refer to their documentation
        available_tools = [{
            "name": tool["name"],
            "description": tool["description"],
            "input_schema": tool["inputSchema"]
            # Adapt this format to match your provider's requirements
        } for tool in self.tools_cache]
        
        messages = [{"role": "user", "content": query}]
        
        # Call your AI provider's API with tools
        # Refer to your provider's documentation for the exact API call format
        # Example pattern:
        # response = self.ai_client.messages.create(
        #     model="your-model",
        #     messages=messages,
        #     tools=available_tools
        # )
        
        final_text = []
        
        # Handle your provider's response format
        # Different providers return tool calls differently:
        # - Anthropic: response.content with tool_use items
        # - OpenAI: response.choices[0].message.tool_calls
        # - Others: Check their documentation
        
        # When your AI requests a tool call:
        for tool_call in <extract_tool_calls_from_response>:
            tool_name = tool_call.name  # or tool_call.function.name (provider-dependent)
            tool_args = tool_call.input  # or tool_call.function.arguments (provider-dependent)
            
            print(f"\\n🔧 Calling tool: {tool_name}")
            
            # Execute tool call via MCP server (this part is universal!)
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
                
                print(f"✅ Tool result received ({len(tool_result_text)} chars)")
                
                # Add tool result back to your AI provider's conversation format
                # Format depends on your provider - refer to their documentation
                messages.append({
                    "role": "assistant",
                    "content": <format_assistant_message_with_tool_call>
                })
                messages.append({
                    "role": "user",  # or "tool" for some providers
                    "content": <format_tool_result_for_provider>
                })
                
                # Get your AI's response with the tool data
                # response = self.ai_client.messages.create(...)
                # Extract final text from response
                
            except Exception as e:
                print(f"❌ Tool execution error: {e}")
                final_text.append(f"[Error executing {tool_name}: {str(e)}]")
        
        return "\\n".join(final_text)`,
			explanation:
				"This is where the magic happens! Your AI receives your question and the list of available tools. It decides which tool(s) to use, and we execute them via the MCP server. The tool results are fed back to the AI, which then provides a natural language answer. The MCP integration part (calling `tools/call`) is universal, but the AI provider API calls differ - refer to your provider's documentation for their specific format (Anthropic, OpenAI, etc.)."
		},
		{
			title: 'Add Cleanup Method',
			description: 'Properly close connections when done',
			code: `    async def cleanup(self):
        """Close HTTP connections"""
        await self.http_client.aclose()`,
			explanation:
				'Always clean up resources! This method closes the HTTP client connection to prevent resource leaks.'
		},
		{
			title: 'Create the Main Function',
			description: 'Put it all together in a runnable script',
			code: `async def main():
    client = RemoteMCPClient()
    try:
        await client.connect_to_remote_server()
        
        # Example: Ask a question
        response = await client.process_query("What does John 3:16 say?")
        print("\\n" + "="*60)
        print("🤖 Response:")
        print("="*60)
        print(response)
        print("="*60)
    finally:
        await client.cleanup()

if __name__ == "__main__":
    asyncio.run(main())`,
			explanation:
				'The main function ties everything together. We create a client, connect to the server, ask a question, and get an intelligent response that uses real Bible translation data from our MCP server.'
		}
	];

	// SDK-based steps (much simpler!)
	const pythonSDKSteps = [
		{
			title: 'Install the SDK',
			description: 'Install the official Python SDK',
			code: `# Install the SDK
pip install translation-helps-mcp-client

# Also install your AI provider's SDK
pip install <your-ai-provider-sdk> python-dotenv`,
			explanation:
				"Install our official SDK which handles all MCP protocol details for you. You still need your AI provider's SDK for the LLM integration."
		},
		{
			title: 'Create Environment File',
			description: 'Store your API key securely',
			code: `# .env
# Set your AI provider's API key (e.g., ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)
YOUR_AI_PROVIDER_API_KEY=your-api-key-here`,
			explanation:
				"Create a `.env` file for your AI provider's API key. The MCP server doesn't require authentication."
		},
		{
			title: 'Create Your Client',
			description: 'Let the AI decide which tools to call',
			code: `import asyncio
import os
from translation_helps import TranslationHelpsClient
# Import your AI provider's SDK
# from anthropic import Anthropic
# from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

async def main():
    # Create MCP client - it handles all protocol details!
    async with TranslationHelpsClient() as mcp_client:
        # Get available tools and prompts from MCP server
        tools = await mcp_client.list_tools()
        prompts = await mcp_client.list_prompts()
        
        # Convert MCP tools to your AI provider's format
        # Each provider has different formats - refer to their documentation
        available_tools = [{
            "name": tool["name"],
            "description": tool.get("description"),
            "input_schema": tool.get("inputSchema"),
        } for tool in tools]
        
        # Note: Prompts provide instructions/templates - refer to your provider's docs for usage
        
        # Initialize your AI provider's client
        # ai_client = YourAIProvider(api_key=os.getenv("YOUR_API_KEY"))
        
        # User's question
        user_query = "What does John 3:16 say and what are the key translation considerations?"
        
        # Send query to AI WITH available tools
        # The AI will decide which tools to call!
        messages = [{"role": "user", "content": user_query}]
        
        # Call your AI provider's API with tools
        # Refer to your provider's documentation for the exact API call format
        # response = await ai_client.messages.create(
        #     model="your-model",
        #     messages=messages,
        #     tools=available_tools
        # )
        
        # When your AI requests a tool call:
        # for tool_call in <extract_tool_calls_from_response>:
        #     tool_name = tool_call.name
        #     tool_args = tool_call.input
        #     
        #     # Execute tool call via MCP server (SDK handles this!)
        #     result = await mcp_client.call_tool(tool_name, tool_args)
        #     
        #     # Feed result back to AI
        #     messages.append({"role": "assistant", "content": <format_with_tool_call>})
        #     messages.append({"role": "user", "content": <format_tool_result>})
        #     
        #     # Get AI's response with the tool data
        #     # response = await ai_client.messages.create(...)

if __name__ == "__main__":
    asyncio.run(main())`,
			explanation:
				'The correct MCP flow: AI receives query + tools → AI decides which tools to call → SDK executes them → Results fed back to AI → AI provides answer. The SDK handles the MCP protocol, but the AI makes the decisions!'
		}
	];

	const typescriptSDKSteps = [
		{
			title: 'Install the SDK',
			description: 'Install the official TypeScript/JavaScript SDK',
			code: `# Install the SDK
npm install @translation-helps/mcp-client

# Also install your AI provider's SDK
npm install <your-ai-provider-sdk> dotenv`,
			explanation:
				"Install our official SDK which handles all MCP protocol details for you. You still need your AI provider's SDK for the LLM integration."
		},
		{
			title: 'Create Environment File',
			description: 'Store your API key securely',
			code: `# .env
# Set your AI provider's API key (e.g., ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)
YOUR_AI_PROVIDER_API_KEY=your-api-key-here`,
			explanation:
				"Create a `.env` file for your AI provider's API key. The MCP server doesn't require authentication."
		},
		{
			title: 'Create Your Client',
			description: 'Let the AI decide which tools to call',
			code: `import { TranslationHelpsClient } from '@translation-helps/mcp-client';
// Import your AI provider's SDK
// import Anthropic from '@anthropic-ai/sdk';
// import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Create MCP client - it handles all protocol details!
  const mcpClient = new TranslationHelpsClient();
  await mcpClient.connect();

  try {
    // Get available tools and prompts from MCP server
    const tools = await mcpClient.listTools();
    const prompts = await mcpClient.listPrompts();
    
    // Convert MCP tools to your AI provider's format
    // Each provider has different formats - refer to their documentation
    const availableTools = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
    
    // Note: Prompts provide instructions/templates - refer to your provider's docs for usage
    
    // Initialize your AI provider's client
    // const aiClient = new YourAIProvider({
    //   apiKey: process.env.YOUR_API_KEY
    // });
    
    // User's question
    const userQuery = "What does John 3:16 say and what are the key translation considerations?";
    
    // Send query to AI WITH available tools
    // The AI will decide which tools to call!
    const messages = [
      { role: 'user', content: userQuery }
    ];
    
    // Call your AI provider's API with tools
    // Refer to your provider's documentation for the exact API call format
    // let response = await aiClient.messages.create({
    //   model: 'your-model',
    //   messages,
    //   tools: availableTools
    // });
    
    // When your AI requests a tool call:
    // for (const toolCall of <extract_tool_calls_from_response>) {
    //   const toolName = toolCall.name;
    //   const toolArgs = toolCall.input;
    //   
    //   // Execute tool call via MCP server (SDK handles this!)
    //   const result = await mcpClient.callTool(toolName, toolArgs);
    //   
    //   // Feed result back to AI
    //   messages.push({ role: 'assistant', content: <format_with_tool_call> });
    //   messages.push({ role: 'user', content: <format_tool_result> });
    //   
    //   // Get AI's response with the tool data
    //   // response = await aiClient.messages.create({...});
    // }
  } finally {
    // Cleanup (if not using connection pooling)
  }
}

main().catch(console.error);`,
			explanation:
				'The correct MCP flow: AI receives query + tools → AI decides which tools to call → SDK executes them → Results fed back to AI → AI provides answer. The SDK handles the MCP protocol, but the AI makes the decisions!'
		}
	];

	const typescriptSteps = [
		{
			title: 'Set Up Your Project',
			description: 'Initialize a new Node.js project with TypeScript',
			code: `# Create project directory
mkdir mcp-translation-client
cd mcp-translation-client

# Initialize Node.js project
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk <your-ai-provider-sdk> dotenv
npm install -D typescript @types/node tsx`,
			explanation:
				"We start with a fresh Node.js project. The MCP SDK provides the client infrastructure. Install your AI provider's SDK (check their documentation for the exact package name). TypeScript gives us type safety. `tsx` lets us run TypeScript directly without compilation."
		},
		{
			title: 'Configure TypeScript',
			description: 'Set up TypeScript for modern JavaScript features',
			code: `// tsconfig.json
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
}`,
			explanation:
				'This TypeScript configuration enables modern JavaScript features and strict type checking. The `esModuleInterop` option is important for using the MCP SDK which uses ESM modules.'
		},
		{
			title: 'Create Environment File',
			description: 'Store your API key securely',
			code: `# .env
# Set your AI provider's API key (e.g., ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)
YOUR_AI_PROVIDER_API_KEY=your-api-key-here`,
			explanation:
				"Create a `.env` file in your project root. This file stores sensitive credentials. Never commit this file to version control! Refer to your AI provider's documentation for the exact environment variable name they use."
		},
		{
			title: 'Create the Client Class',
			description: 'Build the core client using the MCP SDK',
			code: `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
// Import your AI provider's SDK
// import Anthropic from "@anthropic-ai/sdk";
// import OpenAI from "openai";
// (Refer to your provider's documentation for correct import)

import * as dotenv from "dotenv";

dotenv.config();

const REMOTE_SERVER_URL = "${SERVER_URL}";

class RemoteMCPClient {
  private client: Client;
  // private aiClient: YourAIProvider;
  private toolsCache: any[] | null = null;
  private promptsCache: any[] | null = null;
  
  constructor() {
    // Initialize your AI provider's client
    // this.aiClient = new YourAIProvider({
    //   apiKey: process.env.YOUR_API_KEY,
    // });
    // (Refer to your provider's documentation for initialization)
  }
  
  async connect(): Promise<void> {
    console.log(\`Connecting to remote server: \${REMOTE_SERVER_URL}\`);
    
    // Use SSE transport for remote HTTP server
    const transport = new SSEClientTransport(
      new URL(REMOTE_SERVER_URL),
      {}
    );
    
    this.client = new Client(
      {
        name: "translation-helps-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
    
    await this.client.connect(transport);
    
    // List available tools
    const tools = await this.client.listTools();
    this.toolsCache = tools.tools;
    console.log(\`\\n✅ Connected! Available tools: \${tools.tools.map(t => t.name).join(", ")}\`);
    
    // List available prompts
    const prompts = await this.client.listPrompts();
    this.promptsCache = prompts.prompts;
    console.log(\`✅ Available prompts: \${prompts.prompts.map(p => p.name).join(", ")}\`);
  }`,
			explanation:
				"The MCP SDK provides a `Client` class that handles the protocol details. We use `SSEClientTransport` for remote HTTP servers (Server-Sent Events). The SDK manages connection lifecycle, error handling, and protocol compliance automatically. Initialize your AI provider's client according to their documentation."
		},
		{
			title: 'Process Queries with Tools',
			description: 'Use your AI provider to decide which tools to call, then execute them',
			code: `  async processQuery(query: string): Promise<string> {
    if (!this.client || !this.toolsCache) {
      throw new Error("Not connected. Call connect() first.");
    }
    
    // Convert MCP tools to your AI provider's format
    // Each provider has different tool formats - refer to their documentation
    const availableTools = this.toolsCache.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
      // Adapt this format to match your provider's requirements
    }));
    
    const messages = [
      { role: "user", content: query },
    ];
    
    // Call your AI provider's API with tools
    // Refer to your provider's documentation for the exact API call format
    // Example pattern:
    // let response = await this.aiClient.messages.create({
    //   model: "your-model",
    //   messages,
    //   tools: availableTools,
    // });
    
    const finalText: string[] = [];
    
    // Handle your provider's response format
    // Different providers return tool calls differently:
    // - Anthropic: response.content with tool_use items
    // - OpenAI: response.choices[0].message.tool_calls
    // - Others: Check their documentation
    
    // When your AI requests a tool call:
    for (const toolCall of <extract_tool_calls_from_response>) {
      const toolName = toolCall.name;  // or toolCall.function.name (provider-dependent)
      const toolArgs = toolCall.input;  // or toolCall.function.arguments (provider-dependent)
      
      console.log(\`\\n🔧 Calling tool: \${toolName}\`);
      
      try {
        // Execute tool call via MCP server (this part is universal!)
        const result = await this.client.callTool({
          name: toolName,
          arguments: toolArgs as Record<string, unknown>,
        });
        
        let toolResultText = "";
        for (const item of result.content) {
          if (item.type === "text") {
            toolResultText += item.text;
          }
        }
        
        console.log(\`✅ Tool result received (\${toolResultText.length} chars)\`);
        
        // Add tool result back to your AI provider's conversation format
        // Format depends on your provider - refer to their documentation
        messages.push({
          role: "assistant",
          content: <format_assistant_message_with_tool_call>
        });
        messages.push({
          role: "user",  // or "tool" for some providers
          content: <format_tool_result_for_provider>
        });
        
        // Get your AI's response with the tool data
        // response = await this.aiClient.messages.create(...);
        // Extract final text from response
        
      } catch (error) {
        console.error(\`❌ Tool execution error:\`, error);
        finalText.push(\`[Error executing \${toolName}: \${error}]\`);
      }
    }
    
    return finalText.join("\\n");
  }`,
			explanation:
				"The flow is similar to Python: Your AI receives your question and available tools, decides which tools to use, we execute them via the MCP SDK, and feed results back to the AI for a natural language response. The MCP integration part (calling `client.callTool`) is universal, but the AI provider API calls differ - refer to your provider's documentation for their specific format. TypeScript gives us better type safety and IDE support."
		},
		{
			title: 'Add Disconnect Method',
			description: 'Properly close connections when done',
			code: `  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }`,
			explanation:
				'Always clean up resources! This method closes the MCP client connection to prevent resource leaks.'
		},
		{
			title: 'Create the Main Function',
			description: 'Put it all together in a runnable script',
			code: `async function main() {
  const client = new RemoteMCPClient();
  try {
    await client.connect();
    
    // Example: Ask a question
    const response = await client.processQuery("What does John 3:16 say?");
    console.log("\\n" + "=".repeat(60));
    console.log("🤖 Response:");
    console.log("=".repeat(60));
    console.log(response);
    console.log("=".repeat(60));
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);`,
			explanation:
				'The main function demonstrates the complete flow. We create a client, connect to the server, ask a question, and get an intelligent response using real Bible translation data.'
		}
	];

	$: currentSteps = useSDK
		? activeLanguage === 'python'
			? pythonSDKSteps
			: typescriptSDKSteps
		: activeLanguage === 'python'
			? pythonSteps
			: typescriptSteps;
	$: currentStepData = currentSteps[currentStep - 1];
	$: currentStepCode = currentStepData?.code || '';

	// Determine language class - first step uses bash, others use the selected language
	function getLanguageClass(stepIndex: number): string {
		if (stepIndex === 0) return 'language-bash';
		return activeLanguage === 'python' ? 'language-python' : 'language-typescript';
	}

	function highlightCode() {
		if (codeElement && currentStepData) {
			const langClass = getLanguageClass(currentStep - 1);
			// Reset content first to ensure it updates when language changes
			codeElement.textContent = currentStepCode;
			codeElement.className = langClass;
			Prism.highlightElement(codeElement);
		}
		if (completeCodeElement && currentSteps.length > 0) {
			const completeLangClass =
				activeLanguage === 'python' ? 'language-python' : 'language-typescript';
			const fullCode = currentSteps.map((s) => s.code).join('\n\n');
			// Reset content first to ensure it updates when language changes
			completeCodeElement.textContent = fullCode;
			completeCodeElement.className = completeLangClass;
			Prism.highlightElement(completeCodeElement);
		}
	}

	// Highlight code after each update (when step or language changes)
	afterUpdate(() => {
		highlightCode();
	});

	onMount(() => {
		// Initial highlight after DOM is ready
		highlightCode();
	});
</script>

<svelte:head>
	<title>Build an MCP Client - Translation Helps MCP</title>
	<meta
		name="description"
		content="Learn how to build an MCP client that connects to our remote Translation Helps MCP server. Step-by-step tutorial with Python and TypeScript examples."
	/>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Back Button -->
	<div class="mb-6">
		<a
			href="/getting-started"
			class="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Getting Started
		</a>
	</div>

	<!-- Hero Section -->
	<section class="mb-12 text-center">
		<div
			class="mb-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 backdrop-blur-xl"
		>
			Complete Tutorial
		</div>
		<h1 class="mb-4 text-5xl font-bold text-white md:text-6xl">
			Build Your Own
			<span class="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
				MCP Client
			</span>
		</h1>
		<p class="mx-auto mb-8 max-w-3xl text-xl text-gray-300">
			Learn to create a client that connects to our remote Translation Helps MCP server.
			Step-by-step instructions with working code examples. This tutorial focuses on MCP integration
			- refer to your AI provider's documentation for SDK-specific details.
		</p>
		<div class="mx-auto mb-6 max-w-2xl space-y-4">
			<div class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
				<p class="text-sm text-emerald-300">
					<strong>🌐 Server URL:</strong>
					<code class="ml-2 rounded bg-gray-900 px-2 py-1 text-cyan-300">{SERVER_URL}</code>
				</p>
			</div>
			<div class="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
				<p class="text-sm text-purple-300">
					<strong>📦 Prefer an SDK?</strong> We provide official client libraries! Check out{' '}
					<a href="#using-our-sdk" class="underline hover:text-purple-200">Using Our SDK</a>
					{' '}section below for a faster start.
				</p>
			</div>
		</div>
	</section>

	<!-- Learning Objectives -->
	<div class="mb-8 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6 backdrop-blur-xl">
		<h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
			<BookOpen class="h-6 w-6 text-blue-400" />
			What You'll Learn
		</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="flex gap-3">
				<CheckCircle2 class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
				<div>
					<h3 class="font-semibold text-white">Connect to Remote MCP Servers</h3>
					<p class="text-sm text-gray-400">
						Understand how HTTP-based MCP servers work and how to connect to them
					</p>
				</div>
			</div>
			<div class="flex gap-3">
				<CheckCircle2 class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
				<div>
					<h3 class="font-semibold text-white">Discover Tools & Prompts</h3>
					<p class="text-sm text-gray-400">
						Learn how to list and use available MCP tools and prompts programmatically
					</p>
				</div>
			</div>
			<div class="flex gap-3">
				<CheckCircle2 class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
				<div>
					<h3 class="font-semibold text-white">Integrate with Any AI Provider</h3>
					<p class="text-sm text-gray-400">
						Combine any AI provider (Anthropic, OpenAI, etc.) with MCP tools to create intelligent,
						data-driven responses
					</p>
				</div>
			</div>
			<div class="flex gap-3">
				<CheckCircle2 class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
				<div>
					<h3 class="font-semibold text-white">Handle Tool Execution</h3>
					<p class="text-sm text-gray-400">
						Master the tool calling pattern: LLM decides → execute tool → feed results back
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- SDK vs Manual Implementation Tabs -->
	<div class="mb-6 flex justify-center gap-4">
		<button
			on:click={() => {
				useSDK = false;
				currentStep = 1;
			}}
			class="flex items-center gap-2 rounded-xl border px-6 py-3 font-medium transition-all {!useSDK
				? 'border-cyan-500 bg-cyan-500/20 text-white'
				: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
		>
			<Code class="h-5 w-5" />
			Build from Scratch
		</button>
		<button
			on:click={() => {
				useSDK = true;
				currentStep = 1;
			}}
			class="flex items-center gap-2 rounded-xl border px-6 py-3 font-medium transition-all {useSDK
				? 'border-purple-500 bg-purple-500/20 text-white'
				: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
		>
			<Package class="h-5 w-5" />
			Use Our SDK
		</button>
	</div>

	<!-- Language Tabs -->
	<div class="mb-8 flex justify-center gap-4">
		<button
			on:click={() => {
				activeLanguage = 'python';
				currentStep = 1;
			}}
			class="flex items-center gap-2 rounded-xl border px-6 py-3 font-medium transition-all {activeLanguage ===
			'python'
				? 'border-emerald-500 bg-emerald-500/20 text-white'
				: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
		>
			<Code class="h-5 w-5" />
			Python
		</button>
		<button
			on:click={() => {
				activeLanguage = 'typescript';
				currentStep = 1;
			}}
			class="flex items-center gap-2 rounded-xl border px-6 py-3 font-medium transition-all {activeLanguage ===
			'typescript'
				? 'border-blue-500 bg-blue-500/20 text-white'
				: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
		>
			<Code class="h-5 w-5" />
			TypeScript
		</button>
	</div>

	<!-- Step Navigation -->
	<div class="mb-8" id={useSDK ? 'using-our-sdk' : undefined}>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-2xl font-bold text-white">
				{useSDK ? 'Using Our SDK' : 'Step-by-Step Guide'}
			</h2>
			<div class="text-sm text-gray-400">
				Step {currentStep} of {currentSteps.length}
			</div>
		</div>
		<div class="mb-6 flex gap-2 overflow-x-auto pb-2">
			{#each currentSteps as step, index}
				<button
					on:click={() => (currentStep = index + 1)}
					class="flex-shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-all {currentStep ===
					index + 1
						? 'border-emerald-500 bg-emerald-500/20 text-white'
						: currentStep > index + 1
							? 'border-green-500/50 bg-green-500/10 text-green-300 hover:border-green-500'
							: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'}"
				>
					{index + 1}. {step.title}
				</button>
			{/each}
		</div>
	</div>

	<!-- Current Step Content -->
	<div class="space-y-6">
		<!-- Step Header -->
		<div class="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 backdrop-blur-xl">
			<div class="mb-4 flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-bold text-emerald-300"
				>
					{currentStep}
				</div>
				<div>
					<h3 class="text-2xl font-bold text-white">{currentStepData.title}</h3>
					<p class="text-gray-400">{currentStepData.description}</p>
				</div>
			</div>

			<!-- Explanation -->
			<div class="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
				<div class="mb-2 flex items-center gap-2">
					<Lightbulb class="h-5 w-5 text-blue-400" />
					<span class="font-semibold text-blue-300">Understanding This Step</span>
				</div>
				<p class="text-sm text-gray-300">{currentStepData.explanation}</p>
			</div>

			<!-- Code Block -->
			<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
				<div class="mb-3 flex items-center justify-between">
					<h4 class="flex items-center gap-2 font-semibold text-white">
						<Terminal class="h-5 w-5 text-cyan-400" />
						Code
					</h4>
					<button
						on:click={() => copyToClipboard(currentStepCode, `step-${currentStep}`)}
						class="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
					>
						{#if copiedCode === `step-${currentStep}`}
							<Check class="h-4 w-4 text-green-400" />
							<span class="text-green-400">Copied!</span>
						{:else}
							<Copy class="h-4 w-4" />
							<span>Copy</span>
						{/if}
					</button>
				</div>
				<pre class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm"><code
						bind:this={codeElement}
						class={getLanguageClass(currentStep - 1)}>{currentStepCode}</code
					></pre>
			</div>
		</div>

		<!-- Navigation Buttons -->
		<div class="flex justify-between">
			<button
				on:click={() => (currentStep = Math.max(1, currentStep - 1))}
				disabled={currentStep === 1}
				class="rounded-lg border border-gray-700 bg-gray-800 px-6 py-3 font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
			>
				← Previous Step
			</button>
			<button
				on:click={() => (currentStep = Math.min(currentSteps.length, currentStep + 1))}
				disabled={currentStep === currentSteps.length}
				class="rounded-lg border border-emerald-500 bg-emerald-500/20 px-6 py-3 font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
			>
				Next Step →
			</button>
		</div>
	</div>

	<!-- Complete Example -->
	<div class="mt-12 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-8 backdrop-blur-xl">
		<h2 class="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
			<Code class="h-6 w-6 text-purple-400" />
			Complete Example
		</h2>
		<p class="mb-6 text-gray-300">
			Here's the complete client code for {activeLanguage === 'python' ? 'Python' : 'TypeScript'}.
			Copy it to a file and run it!
		</p>
		<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
			<div class="mb-3 flex items-center justify-between">
				<h3 class="font-semibold text-white">
					{activeLanguage === 'python' ? 'client.py' : 'src/client.ts'}
				</h3>
				<button
					on:click={() => {
						const fullCode = currentSteps.map((s) => s.code).join('\n\n');
						copyToClipboard(fullCode, 'complete');
					}}
					class="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
				>
					{#if copiedCode === 'complete'}
						<Check class="h-4 w-4 text-green-400" />
						<span class="text-green-400">Copied!</span>
					{:else}
						<Copy class="h-4 w-4" />
						<span>Copy All</span>
					{/if}
				</button>
			</div>
			<pre class="max-h-96 overflow-y-auto rounded-lg bg-gray-950 p-4 text-sm"><code
					bind:this={completeCodeElement}
					class={activeLanguage === 'python' ? 'language-python' : 'language-typescript'}
					>{currentSteps.map((s) => s.code).join('\n\n')}</code
				></pre>
		</div>
	</div>

	<!-- Key Concepts -->
	<div class="mt-12 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-8 backdrop-blur-xl">
		<h2 class="mb-6 text-2xl font-bold text-white">Key Concepts</h2>
		<div class="grid gap-6 md:grid-cols-2">
			<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
				<h3 class="mb-3 font-semibold text-cyan-300">Remote vs Local MCP Servers</h3>
				<div class="space-y-3 text-sm text-gray-300">
					<div>
						<strong class="text-white">Local (STDIO):</strong>
						<ul class="mt-1 ml-4 list-disc space-y-1 text-gray-400">
							<li>Runs on your machine</li>
							<li>Uses standard input/output</li>
							<li>Requires installation</li>
						</ul>
					</div>
					<div>
						<strong class="text-white">Remote (HTTP):</strong>
						<ul class="mt-1 ml-4 list-disc space-y-1 text-gray-400">
							<li>Hosted on the internet</li>
							<li>Accessible via HTTP/HTTPS</li>
							<li>No local setup needed</li>
						</ul>
					</div>
				</div>
			</div>
			<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
				<h3 class="mb-3 font-semibold text-cyan-300">How Tool Calling Works</h3>
				<ol class="ml-4 space-y-2 text-sm text-gray-300">
					<li class="list-decimal">
						<strong class="text-white">User asks a question</strong> → "What does John 3:16 say?"
					</li>
					<li class="list-decimal">
						<strong class="text-white">AI receives question + tool list</strong> → Decides to use `fetch_scripture`
					</li>
					<li class="list-decimal">
						<strong class="text-white">Client calls tool via MCP server</strong> → Gets real scripture
						text
					</li>
					<li class="list-decimal">
						<strong class="text-white">Tool result fed back to AI</strong> → AI provides natural language
						answer
					</li>
				</ol>
			</div>
		</div>
	</div>

	<!-- Available Tools & Prompts -->
	<div class="mt-12 grid gap-6 md:grid-cols-2">
		<div class="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-8 backdrop-blur-xl">
			<h2 class="mb-4 text-2xl font-bold text-white">Available Tools</h2>
			<ul class="space-y-2 text-sm text-gray-300">
				<li><code class="text-cyan-300">fetch_scripture</code> - Get Bible text</li>
				<li><code class="text-cyan-300">fetch_translation_notes</code> - Translation notes</li>
				<li>
					<code class="text-cyan-300">fetch_translation_questions</code> - Comprehension questions
				</li>
				<li><code class="text-cyan-300">fetch_translation_word_links</code> - Word links</li>
				<li><code class="text-cyan-300">fetch_translation_word</code> - Word definitions</li>
				<li><code class="text-cyan-300">fetch_translation_academy</code> - Academy articles</li>
				<li><code class="text-cyan-300">get_system_prompt</code> - System prompt</li>
				<li><code class="text-cyan-300">get_languages</code> - Available languages</li>
				<li><code class="text-cyan-300">fetch_resources</code> - All resources</li>
				<li><code class="text-cyan-300">search_resources</code> - Search resources</li>
			</ul>
		</div>
		<div class="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-8 backdrop-blur-xl">
			<h2 class="mb-4 text-2xl font-bold text-white">Available Prompts</h2>
			<ul class="space-y-3 text-sm text-gray-300">
				<li>
					<code class="text-cyan-300">translation-helps-for-passage</code>
					<p class="mt-1 text-xs text-gray-400">
						Complete translation help (scripture + notes + questions + words + academy)
					</p>
				</li>
				<li>
					<code class="text-cyan-300">get-translation-words-for-passage</code>
					<p class="mt-1 text-xs text-gray-400">Get all translation words for a passage</p>
				</li>
				<li>
					<code class="text-cyan-300">get-translation-academy-for-passage</code>
					<p class="mt-1 text-xs text-gray-400">Get academy articles referenced in notes</p>
				</li>
			</ul>
		</div>
	</div>

	<!-- Next Steps -->
	<div class="mt-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 backdrop-blur-xl">
		<h2 class="mb-6 text-2xl font-bold text-white">🎉 Next Steps</h2>
		<div class="grid gap-4 md:grid-cols-3">
			<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
				<h3 class="mb-2 font-semibold text-emerald-300">Test Your Client</h3>
				<p class="text-sm text-gray-400">
					Run your client and try asking questions about Bible passages. Experiment with different
					tools!
				</p>
			</div>
			<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
				<h3 class="mb-2 font-semibold text-emerald-300">Add Error Handling</h3>
				<p class="text-sm text-gray-400">
					Implement retry logic, better error messages, and graceful degradation for network issues.
				</p>
			</div>
			<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
				<h3 class="mb-2 font-semibold text-emerald-300">Build a UI</h3>
				<p class="text-sm text-gray-400">
					Create a web interface or GUI to make your client more user-friendly and accessible.
				</p>
			</div>
		</div>
	</div>
</div>

<style>
	:global(pre[class*='language-']) {
		margin: 0;
		padding: 1rem;
		background: #111827 !important;
		border-radius: 0.5rem;
		overflow-x: auto;
	}

	:global(code[class*='language-']) {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.6;
		display: block;
		white-space: pre;
		color: #d1d5db;
	}

	:global(.token.comment),
	:global(.token.prolog),
	:global(.token.doctype),
	:global(.token.cdata) {
		color: #6b7280;
		font-style: italic;
	}

	:global(.token.punctuation) {
		color: #d1d5db;
	}

	:global(.token.property),
	:global(.token.tag),
	:global(.token.boolean),
	:global(.token.number),
	:global(.token.constant),
	:global(.token.symbol),
	:global(.token.deleted) {
		color: #f472b6;
	}

	:global(.token.selector),
	:global(.token.attr-name),
	:global(.token.string),
	:global(.token.char),
	:global(.token.builtin),
	:global(.token.inserted) {
		color: #34d399;
	}

	:global(.token.operator),
	:global(.token.entity),
	:global(.token.url),
	:global(.language-css .token.string),
	:global(.style .token.string) {
		color: #60a5fa;
	}

	:global(.token.atrule),
	:global(.token.attr-value),
	:global(.token.keyword) {
		color: #a78bfa;
	}

	:global(.token.function),
	:global(.token.class-name) {
		color: #fbbf24;
	}

	:global(.token.regex),
	:global(.token.important),
	:global(.token.variable) {
		color: #fb923c;
	}
</style>
