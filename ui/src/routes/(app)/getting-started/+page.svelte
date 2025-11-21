<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Code,
		Copy,
		Check,
		Terminal,
		Zap,
		Package,
		Globe,
		Menu,
		X,
		BookOpen,
		Server,
		FileCode,
		Network
	} from 'lucide-svelte';

	type SectionType = 'overview' | 'remote-mcp' | 'local-mcp' | 'rest' | 'python-tutorial';
	let activeSection: SectionType = 'overview';
	let sidebarOpen = false;

	type MCPClientType = 'claude' | 'cursor' | 'cline' | 'generic';
	let activeMCPClient: MCPClientType = 'claude';

	type RESTExample = 'scripture' | 'questions' | 'words' | 'notes' | 'prompts';
	let activeRESTExample: RESTExample = 'scripture';

	let copiedConfig = false;
	let copiedCurl = false;

	interface MCPConfig {
		name: string;
		file: string;
		location: {
			windows: string;
			mac: string;
			linux: string;
		};
		config: any;
		note?: string;
	}

	// MCP Configuration examples
	const mcpConfigs: Record<MCPClientType, MCPConfig> = {
		claude: {
			name: 'Claude Desktop',
			file: 'claude_desktop_config.json',
			location: {
				windows: '%APPDATA%\\Claude\\',
				mac: '~/Library/Application Support/Claude/',
				linux: '~/.config/Claude/'
			},
			config: {
				mcpServers: {
					'translation-helps': {
						command: 'npx',
						args: ['tsx', 'C:/path/to/translation-helps-mcp/src/index.ts'],
						env: {
							NODE_ENV: 'production'
						}
					}
				}
			},
			note: 'Replace C:/path/to/translation-helps-mcp with your actual clone path'
		},
		cursor: {
			name: 'Cursor',
			file: 'mcp.json',
			location: {
				windows: 'Project root: .cursor\\',
				mac: 'Project root: .cursor/',
				linux: 'Project root: .cursor/'
			},
			config: {
				mcpServers: {
					'translation-helps': {
						command: 'npx',
						args: ['tsx', 'src/index.ts'],
						cwd: 'C:/path/to/translation-helps-mcp',
						env: {}
					}
				}
			},
			note: 'Replace C:/path/to/translation-helps-mcp with your actual clone path'
		},
		cline: {
			name: 'Cline',
			file: 'cline_mcp_settings.json',
			location: {
				windows: 'VS Code settings',
				mac: 'VS Code settings',
				linux: 'VS Code settings'
			},
			config: {
				mcpServers: {
					'translation-helps': {
						command: 'npx',
						args: ['tsx', 'src/index.ts'],
						cwd: 'C:/path/to/translation-helps-mcp'
					}
				}
			},
			note: 'Replace C:/path/to/translation-helps-mcp with your actual clone path'
		},
		generic: {
			name: 'Generic MCP Client',
			file: 'config.json',
			location: {
				windows: 'Client-specific location',
				mac: 'Client-specific location',
				linux: 'Client-specific location'
			},
			config: {
				mcpServers: {
					'translation-helps': {
						command: 'npx',
						args: ['tsx', '/path/to/translation-helps-mcp/src/index.ts']
					}
				}
			},
			note: 'Replace /path/to/translation-helps-mcp with your actual clone path'
		}
	};

	// REST API Examples
	const restExamples = {
		scripture: {
			title: 'Fetch Scripture',
			description: 'Get Bible text in multiple translations',
			curl: `curl "https://translation-helps-mcp-945.pages.dev/api/fetch-scripture?reference=John+3:16&language=en"`,
			typescript: `const response = await fetch(
  'https://translation-helps-mcp-945.pages.dev/api/fetch-scripture?' +
  new URLSearchParams({
    reference: 'John 3:16',
    language: 'en'
  })
);
const data = await response.json();`,
			python: `import requests

response = requests.get(
    'https://translation-helps-mcp-945.pages.dev/api/fetch-scripture',
    params={
        'reference': 'John 3:16',
        'language': 'en'
    }
)
data = response.json()`
		},
		questions: {
			title: 'Translation Questions',
			description: 'Get comprehension questions for a passage',
			curl: `curl "https://translation-helps-mcp-945.pages.dev/api/fetch-translation-questions?reference=John+3:16&language=en"`,
			typescript: `const response = await fetch(
  'https://translation-helps-mcp-945.pages.dev/api/fetch-translation-questions?' +
  new URLSearchParams({
    reference: 'John 3:16',
    language: 'en'
  })
);
const data = await response.json();`,
			python: `import requests

response = requests.get(
    'https://translation-helps-mcp-945.pages.dev/api/fetch-translation-questions',
    params={
        'reference': 'John 3:16',
        'language': 'en'
    }
)
data = response.json()`
		},
		words: {
			title: 'Translation Words',
			description: 'Get word definitions and links for a passage',
			curl: `curl "https://translation-helps-mcp-945.pages.dev/api/fetch-translation-word-links?reference=John+3:16&language=en"`,
			typescript: `const response = await fetch(
  'https://translation-helps-mcp-945.pages.dev/api/fetch-translation-word-links?' +
  new URLSearchParams({
    reference: 'John 3:16',
    language: 'en'
  })
);
const data = await response.json();`,
			python: `import requests

response = requests.get(
    'https://translation-helps-mcp-945.pages.dev/api/fetch-translation-word-links',
    params={
        'reference': 'John 3:16',
        'language': 'en'
    }
)
data = response.json()`
		},
		notes: {
			title: 'Translation Notes',
			description: 'Get translation notes for a passage',
			curl: `curl "https://translation-helps-mcp-945.pages.dev/api/fetch-translation-notes?reference=John+3:16&language=en"`,
			typescript: `const response = await fetch(
  'https://translation-helps-mcp-945.pages.dev/api/fetch-translation-notes?' +
  new URLSearchParams({
    reference: 'John 3:16',
    language: 'en'
  })
);
const data = await response.json();`,
			python: `import requests

response = requests.get(
    'https://translation-helps-mcp-945.pages.dev/api/fetch-translation-notes',
    params={
        'reference': 'John 3:16',
        'language': 'en'
    }
)
data = response.json()`
		},
		prompts: {
			title: 'MCP Prompts (HTTP)',
			description: 'Execute multi-step prompts via REST API',
			curl: `curl -X POST "https://translation-helps-mcp-945.pages.dev/api/execute-prompt" \\
  -H "Content-Type: application/json" \\
  -d '{
    "promptName": "translation-helps-for-passage",
    "parameters": {
      "reference": "John 3:16",
      "language": "en"
    }
  }'`,
			typescript: `const response = await fetch(
  'https://translation-helps-mcp-945.pages.dev/api/execute-prompt',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      promptName: 'translation-helps-for-passage',
      parameters: {
        reference: 'John 3:16',
        language: 'en'
      }
    })
  }
);
const data = await response.json();`,
			python: `import requests

response = requests.post(
    'https://translation-helps-mcp-945.pages.dev/api/execute-prompt',
    json={
        'promptName': 'translation-helps-for-passage',
        'parameters': {
            'reference': 'John 3:16',
            'language': 'en'
        }
    }
)
data = response.json()`
		}
	};

	function copyToClipboard(text: string, type: 'config' | 'curl') {
		navigator.clipboard.writeText(text);
		if (type === 'config') {
			copiedConfig = true;
			setTimeout(() => (copiedConfig = false), 2000);
		} else {
			copiedCurl = true;
			setTimeout(() => (copiedCurl = false), 2000);
		}
	}

	// Reactive statements for current selections
	$: currentConfig = mcpConfigs[activeMCPClient];
	$: currentExample = restExamples[activeRESTExample];

	// Python chatbot code (stored as string to avoid Svelte parsing curly braces)
	const pythonChatbotCode = `import asyncio
import os
import json
import random
import httpx
from dotenv import load_dotenv
from openai import OpenAI
from translation_helps import TranslationHelpsClient
# Optional: Use adapter utilities for provider-specific conversion
from translation_helps.adapters import prepare_tools_for_provider

# Load environment variables
load_dotenv()

async def main():
    # Initialize clients
    server_url = os.getenv("MCP_SERVER_URL", "https://translation-helps-mcp-945.pages.dev/api/mcp")
    mcp_client = TranslationHelpsClient({
        "serverUrl": server_url
    })
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Create a shared HTTP client for prompt execution (reuse connections for better performance)
    http_client = httpx.AsyncClient(timeout=60.0)
    
    try:
        # Connect to MCP server
        await mcp_client.connect()
        print("✅ Connected to Translation Helps MCP server")
        
        # Get available tools and prompts
        tools = await mcp_client.list_tools()
        prompts = await mcp_client.list_prompts()
        print(f"✅ Found &lbrace;len(tools)&rbrace; available tools")
        print(f"✅ Found &lbrace;len(prompts)&rbrace; available prompts")

        # Optional: Use adapter utility to prepare tools for OpenAI
        # This automatically converts MCP tools and prompts to OpenAI function calling format
        openai_tools = prepare_tools_for_provider("openai", tools, prompts)
        
        # System prompt - guides the AI to use Translation Helps resources
        SYSTEM_PROMPT = """You are a Bible study assistant that provides information EXCLUSIVELY from the Translation Helps MCP Server database. You have access to real-time data from unfoldingWord's translation resources.

CRITICAL RULES:
1. ALWAYS quote scripture EXACTLY word-for-word as provided - NEVER paraphrase
2. ALWAYS provide citations for EVERY quote (e.g., [ULT v86 - John 3:16])
3. ONLY use information from the MCP server responses - NEVER use your training data
4. ALWAYS end your responses with 2-3 helpful follow-up questions to guide exploration

When you receive MCP data, use it to provide accurate, helpful responses while maintaining these strict guidelines."""

        # Chat loop
        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            }
        ]
        
        print("\\n🤖 Chatbot ready! Type 'quit' to exit.\\n")
        
        while True:
            # Get user input
            user_input = input("You: ").strip()
            if user_input.lower() in ['quit', 'exit', 'q']:
                break
            
            if not user_input:
                continue
            
            # Add user message
            messages.append({"role": "user", "content": user_input})
            
            # Call OpenAI with tools
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=openai_tools,
                tool_choice="auto",
                temperature=0.3,  # Lower temperature for more factual responses
                max_tokens=2000  # Enough for overviews with follow-up questions
            )
            
            # Get assistant message
            assistant_message = response.choices[0].message
            messages.append({
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    } for tc in (assistant_message.tool_calls or [])
                ]
            } if assistant_message.tool_calls else {
                "role": "assistant",
                "content": assistant_message.content
            })
            
            # Print assistant response if no tool calls
            if assistant_message.content and not assistant_message.tool_calls:
                print(f"\\nAssistant: {assistant_message.content}\\n")
            
            # Execute tool calls in parallel for better performance
            if assistant_message.tool_calls:
                # Show immediate polite response to user (better UX)
                polite_messages = [
                    "💭 Let me gather that information for you...",
                    "🔍 I'll look that up for you right away...",
                    "📚 Let me fetch the relevant translation resources..."
                ]
                print(f"\\nAssistant: {random.choice(polite_messages)}\\n")
                
                async def execute_tool_call(tool_call):
                    """Execute a single tool call and return the result"""
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)
                    
                    try:
                        # Check if this is a prompt (starts with "prompt_")
                        if tool_name.startswith("prompt_"):
                            # Extract the actual prompt name
                            prompt_name = tool_name.replace("prompt_", "")
                            
                            # Execute prompt via REST API
                            prompt_response = await http_client.post(
                                f"{server_url.replace('/api/mcp', '/api/execute-prompt')}",
                                json={
                                    "promptName": prompt_name,
                                    "parameters": tool_args
                                }
                            )
                            prompt_response.raise_for_status()
                            prompt_data = prompt_response.json()
                            
                            # Convert structured data to readable format
                            tool_result_text = json.dumps(prompt_data, indent=2)
                            
                            return {
                                "tool_call_id": tool_call.id,
                                "name": tool_name,
                                "content": tool_result_text
                            }
                        
                        # Regular tool call via MCP SDK
                        result = await mcp_client.call_tool(tool_name, tool_args)
                        
                        # Extract text from result
                        tool_result_text = ""
                        if result.get("content"):
                            content_items = result["content"]
                            if not isinstance(content_items, list):
                                content_items = [content_items]
                            
                            for item in content_items:
                                if isinstance(item, dict):
                                    if "text" in item:
                                        tool_result_text += str(item.get("text", ""))
                                    elif item.get("type") == "text" and "text" in item:
                                        tool_result_text += item.get("text", "")
                                elif isinstance(item, str):
                                    tool_result_text += item
                        
                        if not tool_result_text and result.get("text"):
                            tool_result_text = result["text"]
                        
                        return {
                            "tool_call_id": tool_call.id,
                            "name": tool_name,
                            "content": tool_result_text
                        }
                    except Exception as e:
                        error_msg = f"[ERROR] The tool call failed: {str(e)}"
                        return {
                            "tool_call_id": tool_call.id,
                            "name": tool_name,
                            "content": error_msg
                        }
                
                # Execute all tool calls in parallel using asyncio.gather
                tool_results = await asyncio.gather(*[execute_tool_call(tc) for tc in assistant_message.tool_calls])
                
                # Add all tool results to messages
                for result in tool_results:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": result["tool_call_id"],
                        "name": result["name"],
                        "content": result["content"]
                    })
                
                # Get final response from OpenAI with tool results
                final_response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages
                )
                
                final_message = final_response.choices[0].message
                final_content = final_message.content
                
                # Post-process: Ensure follow-up questions are present
                content_lower = final_content.lower()
                followup_indicators = ["would you like", "should we", "want to explore"]
                has_followups = any(indicator in content_lower for indicator in followup_indicators)
                
                if not has_followups:
                    # Extract reference if possible
                    import re
                    ref_match = re.search(r'\\b([1-3]?\\s?[a-z]+)\\s+(\\d+):(\\d+)', user_input.lower())
                    if ref_match:
                        book = ref_match.group(1).strip().title()
                        chapter = ref_match.group(2)
                        verse = ref_match.group(3)
                        reference = f"{book} {chapter}:{verse}"
                        final_content += f"\\n\\nWould you like to explore more? Would you like to see the translation notes for {reference}? Would you like to explore the key terms in {reference}? Or would you like to learn about the translation challenges in {reference}?"
                    else:
                        final_content += f"\\n\\nWould you like to explore more? Would you like to see the translation notes for this verse? Would you like to explore the key terms in this passage? Or would you like to learn about the translation challenges here?"
                
                messages.append({
                    "role": "assistant",
                    "content": final_content
                })
                
                print(f"\\nAssistant: {final_content}\\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Clean up resources
        await http_client.aclose()  # Close the shared HTTP client
        await mcp_client.close()
        print("\\n👋 Goodbye!")

if __name__ == "__main__":
    asyncio.run(main())`;
</script>

<svelte:head>
	<title>Getting Started - Translation Helps MCP</title>
	<meta
		name="description"
		content="Learn how to use Translation Helps MCP server via MCP protocol or REST API. Complete guide with examples for Claude Desktop, Cursor, and more."
	/>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Hero Section -->
	<section class="mb-12 text-center">
		<div
			class="mb-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 backdrop-blur-xl"
		>
			Getting Started Guide
		</div>
		<h1 class="mb-4 text-5xl font-bold text-white md:text-6xl">
			Start Using
			<span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
				Translation Helps
			</span>
		</h1>
		<p class="mx-auto mb-8 max-w-3xl text-xl text-gray-300">
			Access Bible translation resources via <strong class="text-blue-300">MCP Protocol</strong>
			or <strong class="text-cyan-300">REST API</strong>. Choose your integration method below.
		</p>

		<!-- Prominent Tutorial Link -->
		<div class="mx-auto mt-8 max-w-2xl">
			<a
				href="/docs/BUILD_CLIENT_FOR_REMOTE_SERVER"
				data-sveltekit-preload-data="off"
				class="group flex items-center justify-center gap-3 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 p-6 text-lg font-semibold text-white transition-all hover:border-emerald-400 hover:from-emerald-500/30 hover:to-blue-500/30 hover:shadow-lg hover:shadow-emerald-500/20"
			>
				<Package class="h-6 w-6 text-emerald-300 transition-transform group-hover:scale-110" />
				<span>📖 Build Your Own MCP Client - Complete Tutorial</span>
				<svg
					class="h-5 w-5 text-emerald-300 transition-transform group-hover:translate-x-1"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</a>
			<p class="mt-3 text-center text-sm text-gray-400">
				Learn to build Python and TypeScript clients that connect to our remote MCP server
			</p>
		</div>
	</section>

	<!-- Sidebar Navigation -->
	<div class="mb-8 flex gap-6">
		<!-- Sidebar -->
		<aside class="hidden w-64 flex-shrink-0 lg:block">
			<nav class="sticky top-8 space-y-2">
				<button
					on:click={() => (activeSection = 'overview')}
					class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all {activeSection ===
					'overview'
						? 'border-emerald-500 bg-emerald-500/20 text-white'
						: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
				>
					<BookOpen class="h-5 w-5" />
					<span class="font-medium">Overview</span>
				</button>
				<button
					on:click={() => (activeSection = 'remote-mcp')}
					class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all {activeSection ===
					'remote-mcp'
						? 'border-emerald-500 bg-emerald-500/20 text-white'
						: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
				>
					<Globe class="h-5 w-5" />
					<span class="font-medium">Remote MCP Server</span>
				</button>
				<button
					on:click={() => (activeSection = 'local-mcp')}
					class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all {activeSection ===
					'local-mcp'
						? 'border-blue-500 bg-blue-500/20 text-white'
						: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
				>
					<Server class="h-5 w-5" />
					<span class="font-medium">Local MCP (STDIO)</span>
				</button>
				<button
					on:click={() => (activeSection = 'rest')}
					class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all {activeSection ===
					'rest'
						? 'border-cyan-500 bg-cyan-500/20 text-white'
						: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
				>
					<Network class="h-5 w-5" />
					<span class="font-medium">REST API</span>
				</button>
				<button
					on:click={() => (activeSection = 'python-tutorial')}
					class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all {activeSection ===
					'python-tutorial'
						? 'border-purple-500 bg-purple-500/20 text-white'
						: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
				>
					<FileCode class="h-5 w-5" />
					<span class="font-medium">Python Chatbot Tutorial</span>
				</button>
			</nav>
		</aside>

		<!-- Mobile Menu Button -->
		<div class="mb-4 lg:hidden">
			<button
				on:click={() => (sidebarOpen = !sidebarOpen)}
				class="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-gray-300 hover:bg-gray-700"
			>
				{#if sidebarOpen}
					<X class="h-5 w-5" />
				{:else}
					<Menu class="h-5 w-5" />
				{/if}
				<span>Menu</span>
			</button>
		</div>

		<!-- Mobile Sidebar -->
		{#if sidebarOpen}
			<div class="fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm lg:hidden">
				<div class="flex h-full">
					<aside class="w-64 border-r border-gray-700 bg-gray-800 p-4">
						<div class="mb-4 flex items-center justify-between">
							<h2 class="text-lg font-semibold text-white">Navigation</h2>
							<button
								on:click={() => (sidebarOpen = false)}
								class="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
							>
								<X class="h-5 w-5" />
							</button>
						</div>
						<nav class="space-y-2">
							<button
								on:click={() => {
									activeSection = 'overview';
									sidebarOpen = false;
								}}
								class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all {activeSection ===
								'overview'
									? 'border-emerald-500 bg-emerald-500/20 text-white'
									: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
							>
								<BookOpen class="h-5 w-5" />
								<span class="font-medium">Overview</span>
							</button>
							<button
								on:click={() => {
									activeSection = 'remote-mcp';
									sidebarOpen = false;
								}}
								class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all {activeSection ===
								'remote-mcp'
									? 'border-emerald-500 bg-emerald-500/20 text-white'
									: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
							>
								<Globe class="h-5 w-5" />
								<span class="font-medium">Remote MCP Server</span>
							</button>
							<button
								on:click={() => {
									activeSection = 'local-mcp';
									sidebarOpen = false;
								}}
								class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all {activeSection ===
								'local-mcp'
									? 'border-blue-500 bg-blue-500/20 text-white'
									: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
							>
								<Server class="h-5 w-5" />
								<span class="font-medium">Local MCP (STDIO)</span>
							</button>
							<button
								on:click={() => {
									activeSection = 'rest';
									sidebarOpen = false;
								}}
								class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all {activeSection ===
								'rest'
									? 'border-cyan-500 bg-cyan-500/20 text-white'
									: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
							>
								<Network class="h-5 w-5" />
								<span class="font-medium">REST API</span>
							</button>
							<button
								on:click={() => {
									activeSection = 'python-tutorial';
									sidebarOpen = false;
								}}
								class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all {activeSection ===
								'python-tutorial'
									? 'border-purple-500 bg-purple-500/20 text-white'
									: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
							>
								<FileCode class="h-5 w-5" />
								<span class="font-medium">Python Chatbot Tutorial</span>
							</button>
						</nav>
					</aside>
					<div class="flex-1" on:click={() => (sidebarOpen = false)}></div>
				</div>
			</div>
		{/if}

		<!-- Main Content -->
		<div class="min-w-0 flex-1">
			<!-- Overview Section -->
			{#if activeSection === 'overview'}
				<div class="space-y-8">
					<div class="rounded-2xl border border-emerald-500/30 bg-white/5 p-8 backdrop-blur-xl">
						<h2 class="mb-4 text-3xl font-bold text-white">Welcome to Translation Helps MCP</h2>
						<p class="mb-6 text-lg text-gray-300">
							Get started with Bible translation resources through the Model Context Protocol (MCP)
							or REST API.
						</p>
						<div class="grid gap-6 md:grid-cols-3">
							<div class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
								<h3 class="mb-2 font-semibold text-emerald-300">🌐 Remote MCP Server</h3>
								<p class="mb-4 text-sm text-gray-400">
									Connect to our hosted MCP server instantly - no installation required!
								</p>
								<button
									on:click={() => (activeSection = 'remote-mcp')}
									class="text-sm text-emerald-400 hover:text-emerald-300 hover:underline"
								>
									Learn more →
								</button>
							</div>
							<div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
								<h3 class="mb-2 font-semibold text-blue-300">⚡ Local MCP (STDIO)</h3>
								<p class="mb-4 text-sm text-gray-400">
									Run the MCP server locally for maximum control and customization.
								</p>
								<button
									on:click={() => (activeSection = 'local-mcp')}
									class="text-sm text-blue-400 hover:text-blue-300 hover:underline"
								>
									Learn more →
								</button>
							</div>
							<div class="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6">
								<h3 class="mb-2 font-semibold text-cyan-300">🔌 REST API</h3>
								<p class="mb-4 text-sm text-gray-400">
									Use standard HTTP endpoints for web apps and integrations.
								</p>
								<button
									on:click={() => (activeSection = 'rest')}
									class="text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
								>
									Learn more →
								</button>
							</div>
						</div>
					</div>

					<div class="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-8">
						<h2 class="mb-4 text-2xl font-bold text-white">🚀 Quick Start Tutorials</h2>
						<div class="grid gap-6 md:grid-cols-2">
							<div class="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6">
								<h3 class="mb-2 font-semibold text-purple-300">🐍 Python Chatbot</h3>
								<p class="mb-4 text-sm text-gray-400">
									Build a chatbot using Python SDK and OpenAI that answers Bible translation
									questions.
								</p>
								<button
									on:click={() => (activeSection = 'python-tutorial')}
									class="text-sm text-purple-400 hover:text-purple-300 hover:underline"
								>
									Start tutorial →
								</button>
							</div>
							<div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
								<h3 class="mb-2 font-semibold text-blue-300">📖 Complete Client Guide</h3>
								<p class="mb-4 text-sm text-gray-400">
									Comprehensive guide for building MCP clients in Python and TypeScript.
								</p>
								<a
									href="/docs/BUILD_CLIENT_FOR_REMOTE_SERVER"
									class="text-sm text-blue-400 hover:text-blue-300 hover:underline"
								>
									Read guide →
								</a>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Remote MCP Server Section -->
			{#if activeSection === 'remote-mcp'}
				<div class="space-y-8">
					<!-- What is Remote MCP -->
					<div class="rounded-2xl border border-emerald-500/30 bg-white/5 p-8 backdrop-blur-xl">
						<h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
							<Globe class="h-6 w-6 text-emerald-400" />
							Connect to Our Remote MCP Server
						</h2>
						<div class="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
							<p class="text-sm text-emerald-300">
								<strong>🌐 Server URL:</strong>
								<code class="ml-2 rounded bg-gray-900 px-2 py-1 text-cyan-300"
									>https://translation-helps-mcp-945.pages.dev/api/mcp</code
								>
							</p>
						</div>
						<p class="mb-4 text-lg text-gray-300">
							Our <strong class="text-emerald-300">remote MCP server</strong> is hosted on Cloudflare
							Pages and accessible via HTTP. No installation or local setup required! Perfect for:
						</p>
						<div class="grid gap-4 md:grid-cols-3">
							<div class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h3 class="mb-2 font-semibold text-emerald-300">🚀 Zero Setup</h3>
								<p class="text-sm text-gray-400">
									Connect instantly - no cloning, no installation, no configuration files
								</p>
							</div>
							<div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
								<h3 class="mb-2 font-semibold text-blue-300">🌍 Always Available</h3>
								<p class="text-sm text-gray-400">
									Hosted on Cloudflare's global edge network for fast, reliable access
								</p>
							</div>
							<div class="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
								<h3 class="mb-2 font-semibold text-purple-300">🔓 Open & Free</h3>
								<p class="text-sm text-gray-400">
									No authentication required - open access to all translation resources
								</p>
							</div>
						</div>
					</div>

					<!-- General Connection Instructions -->
					<div class="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 backdrop-blur-xl">
						<h2 class="mb-6 text-2xl font-bold text-white">How to Connect</h2>
						<div class="space-y-6">
							<div class="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
								<h3 class="mb-4 font-semibold text-blue-300">🔌 General Connection Steps</h3>
								<p class="mb-4 text-sm text-gray-300">
									Most MCP clients support remote servers via HTTP. The general process is:
								</p>
								<ol class="space-y-4 text-sm text-gray-300">
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300"
											>1</span
										>
										<div class="flex-1">
											<span class="mb-2 block"
												>Open your MCP client's settings or configuration</span
											>
											<p class="text-xs text-gray-400">
												Look for "Connectors", "MCP Servers", "Remote Servers", or similar options
											</p>
										</div>
									</li>
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300"
											>2</span
										>
										<div class="flex-1">
											<span class="mb-2 block">Add a new remote server or connector</span>
											<p class="text-xs text-gray-400">
												Click "Add", "New", "Connect", or similar button
											</p>
										</div>
									</li>
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300"
											>3</span
										>
										<div class="flex-1">
											<span class="mb-2 block">Enter the server URL:</span>
											<code class="mt-2 block rounded bg-gray-900 px-3 py-2 text-cyan-300"
												>https://translation-helps-mcp-945.pages.dev/api/mcp</code
											>
										</div>
									</li>
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300"
											>4</span
										>
										<div class="flex-1">
											<span class="mb-2 block">Configure transport type (if required)</span>
											<p class="text-xs text-gray-400">
												Select <strong>HTTP</strong> or <strong>Streamable HTTP</strong> (not SSE or
												STDIO)
											</p>
										</div>
									</li>
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300"
											>5</span
										>
										<div class="flex-1">
											<span class="mb-2 block">Save and connect</span>
											<p class="mt-1 text-xs text-gray-400">
												No authentication required - the server is open and free to use
											</p>
										</div>
									</li>
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300"
											>6</span
										>
										<div class="flex-1">
											<span class="mb-2 block">Start using tools and prompts!</span>
											<p class="mt-1 text-xs text-gray-400">
												Your client should now have access to all 10 tools and 3 prompts
											</p>
										</div>
									</li>
								</ol>
							</div>

							<!-- Client-Specific Examples -->
							<div class="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
								<h3 class="mb-4 font-semibold text-purple-300">📱 Client-Specific Examples</h3>
								<div class="space-y-4">
									<div class="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
										<h4 class="mb-2 font-semibold text-purple-200">Claude Desktop / Claude Web</h4>
										<p class="mb-2 text-xs text-gray-300">
											Go to <strong>Settings → Connectors</strong>, click
											<strong>"Add Custom Connector"</strong>, and enter the server URL.
										</p>
										<p class="text-xs text-gray-400">
											⚠️ For Claude Desktop: Remote servers must be added via Settings → Connectors,
											not via the config file.
										</p>
									</div>
									<div class="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
										<h4 class="mb-2 font-semibold text-purple-200">
											Cursor / Cline / Other MCP Clients
										</h4>
										<p class="mb-2 text-xs text-gray-300">
											Check your client's documentation for remote MCP server support. Most clients
											support HTTP-based remote servers.
										</p>
										<p class="text-xs text-gray-400">
											Look for configuration options like <code
												class="rounded bg-gray-800 px-2 py-0.5 text-cyan-300">remoteServers</code
											>
											or
											<code class="rounded bg-gray-800 px-2 py-0.5 text-cyan-300">httpServers</code>
											in your client's config.
										</p>
									</div>
									<div class="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
										<h4 class="mb-2 font-semibold text-purple-200">Programmatic Access</h4>
										<p class="mb-2 text-xs text-gray-300">
											Use the MCP SDK to connect programmatically. See the <a
												href="https://modelcontextprotocol.io/docs/develop/connect-remote-servers"
												target="_blank"
												rel="noopener noreferrer"
												class="text-purple-400 hover:underline">MCP Remote Servers Guide</a
											> for code examples.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Available Features -->
					<div class="grid gap-4 md:grid-cols-2">
						<div class="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
							<h3 class="mb-3 font-semibold text-blue-300">🛠️ Available Tools (10)</h3>
							<ul class="space-y-2 text-sm text-gray-300">
								<li><code class="text-cyan-300">fetch_scripture</code> - Get Bible text</li>
								<li>
									<code class="text-cyan-300">fetch_translation_notes</code> - Translation notes
								</li>
								<li>
									<code class="text-cyan-300">fetch_translation_questions</code> - Comprehension questions
								</li>
								<li>
									<code class="text-cyan-300">fetch_translation_word_links</code> - Word links
								</li>
								<li>
									<code class="text-cyan-300">fetch_translation_word</code> - Word definitions
								</li>
								<li>
									<code class="text-cyan-300">fetch_translation_academy</code> - Academy articles
								</li>
								<li><code class="text-cyan-300">get_system_prompt</code> - System prompt</li>
								<li><code class="text-cyan-300">get_languages</code> - Available languages</li>
								<li><code class="text-cyan-300">fetch_resources</code> - All resources</li>
								<li><code class="text-cyan-300">search_resources</code> - Search resources</li>
							</ul>
						</div>
						<div class="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
							<h3 class="mb-3 font-semibold text-purple-300">✨ Available Prompts (3)</h3>
							<ul class="space-y-2 text-sm text-gray-300">
								<li>
									<code class="text-cyan-300">translation-helps-for-passage</code> - Complete translation
									help
								</li>
								<li>
									<code class="text-cyan-300">get-translation-words-for-passage</code> - Words only
								</li>
								<li>
									<code class="text-cyan-300">get-translation-academy-for-passage</code> - Academy only
								</li>
							</ul>
							<p class="mt-3 text-xs text-gray-400">
								Prompts chain multiple tools automatically to provide comprehensive results.
							</p>
						</div>
					</div>

					<!-- Testing & Resources -->
					<div class="grid gap-4 md:grid-cols-2">
						<div class="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6">
							<h3 class="mb-3 font-semibold text-cyan-300">🧪 Test Your Connection</h3>
							<p class="mb-4 text-sm text-gray-300">
								Use the MCP Inspector to test and validate your connection:
							</p>
							<div class="space-y-2 text-xs text-gray-400">
								<code class="block rounded bg-gray-900 px-3 py-2 text-cyan-300"
									>npx @modelcontextprotocol/inspector@latest</code
								>
								<p class="mt-2">
									Then enter: <code class="rounded bg-gray-800 px-2 py-0.5 text-cyan-300"
										>https://translation-helps-mcp-945.pages.dev/api/mcp</code
									>
								</p>
							</div>
							<p class="mt-4 text-xs text-gray-400">
								Or use <a
									href="https://developers.cloudflare.com/agents/guides/remote-mcp-server/#test-a-remote-mcp-server"
									target="_blank"
									rel="noopener noreferrer"
									class="text-cyan-400 hover:underline">Cloudflare's AI Playground</a
								> to test remote MCP servers.
							</p>
						</div>
						<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
							<h3 class="mb-4 font-semibold text-emerald-300">📚 Documentation & Tutorials</h3>

							<!-- Featured Tutorial Card -->
							<div class="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4">
								<a
									href="/docs/BUILD_CLIENT_FOR_REMOTE_SERVER"
									data-sveltekit-preload-data="off"
									class="group flex items-center justify-between"
								>
									<div class="flex-1">
										<div class="mb-1 flex items-center gap-2">
											<span class="text-lg">📖</span>
											<span class="font-semibold text-emerald-300 group-hover:text-emerald-200">
												Build Your Own MCP Client
											</span>
										</div>
										<p class="text-xs text-gray-400">
											Complete step-by-step tutorial with Python and TypeScript examples
										</p>
									</div>
									<svg
										class="h-5 w-5 text-emerald-400 transition-transform group-hover:translate-x-1"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</a>
							</div>

							<ul class="space-y-2 text-sm text-gray-300">
								<li>
									<a
										href="https://modelcontextprotocol.io/docs/develop/connect-remote-servers"
										target="_blank"
										rel="noopener noreferrer"
										class="text-emerald-400 hover:underline"
									>
										MCP Remote Servers Guide →
									</a>
								</li>
								<li>
									<a
										href="https://modelcontextprotocol.io/docs/develop/build-client"
										target="_blank"
										rel="noopener noreferrer"
										class="text-emerald-400 hover:underline"
									>
										Build an MCP Client (Official Tutorial) →
									</a>
								</li>
								<li>
									<a
										href="https://support.claude.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers"
										target="_blank"
										rel="noopener noreferrer"
										class="text-emerald-400 hover:underline"
									>
										Claude Remote MCP Guide →
									</a>
								</li>
							</ul>
						</div>
					</div>
				</div>
			{/if}

			<!-- Python Chatbot Tutorial Section -->
			{#if activeSection === 'python-tutorial'}
				<div class="space-y-8">
					<!-- Python Chatbot Tutorial -->
					<div
						class="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-8 backdrop-blur-xl"
					>
						<h2 class="mb-6 flex items-center gap-3 text-3xl font-bold text-white">
							<Package class="h-8 w-8 text-purple-400" />
							Build a Python Chatbot with OpenAI
						</h2>
						<p class="mb-6 text-lg text-gray-300">
							Learn how to create a simple chatbot that uses our Python SDK and OpenAI to answer
							questions about Bible translation resources.
						</p>

						<!-- Prerequisites -->
						<div class="mb-8 rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
							<h3 class="mb-4 flex items-center gap-2 text-xl font-semibold text-blue-300">
								<Check class="h-5 w-5" />
								Prerequisites
							</h3>
							<ul class="space-y-2 text-sm text-gray-300">
								<li class="flex items-start gap-2">
									<span class="text-blue-400">✓</span>
									<span>Python 3.8+ installed</span>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-blue-400">✓</span>
									<span
										>OpenAI API key (<a
											href="https://platform.openai.com/api-keys"
											target="_blank"
											rel="noopener noreferrer"
											class="text-blue-400 hover:underline">Get one here</a
										>)</span
									>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-blue-400">✓</span>
									<span>Basic Python knowledge</span>
								</li>
							</ul>
						</div>

						<!-- Section 1: Project Setup -->
						<div class="mb-8 rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
							<h3 class="mb-4 flex items-center gap-2 text-xl font-semibold text-blue-300">
								<Package class="h-5 w-5" />
								Section 1: Project Setup
							</h3>

							<!-- Step 1.1: Install Dependencies -->
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 1.1:</span>
									Install Dependencies
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Install the Python SDK and required libraries.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> The SDK provides the MCP client, adapter utilities convert MCP
									tools to OpenAI format, and httpx enables async HTTP requests for prompt execution.
								</p>
								<pre class="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code
										>mkdir translation-helps-chatbot
cd translation-helps-chatbot

# Install the Python SDK and dependencies
pip install translation-helps-mcp-client>=1.1.1 openai python-dotenv httpx</code
									></pre>
								<p class="mt-2 text-xs text-gray-400">
									<strong>Note:</strong> Version 1.1.1+ includes optional adapter utilities for converting
									MCP tools/prompts to provider formats.
								</p>
							</div>

							<!-- Step 1.2: Configure Environment -->
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 1.2:</span>
									Configure Environment Variables
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Create a
									<code class="rounded bg-gray-800 px-1 py-0.5 text-cyan-300">.env</code> file with your
									OpenAI API key.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> Keeps sensitive credentials out of your code. The
									<code class="rounded bg-gray-800 px-1 py-0.5 text-gray-400">python-dotenv</code> library
									loads these automatically.
								</p>
								<pre class="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code
										>OPENAI_API_KEY=your-openai-api-key-here</code
									></pre>
								<p class="mt-2 text-xs text-gray-400">
									⚠️ Never commit your <code class="rounded bg-gray-800 px-1 py-0.5 text-gray-400"
										>.env</code
									>
									file to version control. Add it to
									<code class="rounded bg-gray-800 px-1 py-0.5 text-gray-400">.gitignore</code>.
								</p>
							</div>
						</div>

						<!-- Section 2: Code Structure Overview -->
						<div class="mb-8 rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
							<h3 class="mb-4 flex items-center gap-2 text-xl font-semibold text-purple-300">
								<FileCode class="h-5 w-5" />
								Section 2: Understanding the Code Structure
							</h3>
							<p class="mb-4 text-sm text-gray-300">
								Before diving into the code, let's understand the key components and their roles:
							</p>
							<div class="space-y-3 text-sm text-gray-300">
								<div class="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
									<strong class="text-purple-300">1. Imports & Setup</strong>
									<p class="mt-1 text-xs text-gray-400">
										Import the MCP client, OpenAI client, adapter utilities, and HTTP client.
										Initialize clients with configuration.
									</p>
								</div>
								<div class="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
									<strong class="text-purple-300">2. Tool Discovery</strong>
									<p class="mt-1 text-xs text-gray-400">
										Connect to the MCP server and discover available tools and prompts dynamically.
										This ensures your chatbot always has access to the latest resources.
									</p>
								</div>
								<div class="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
									<strong class="text-purple-300">3. Adapter Preparation</strong>
									<p class="mt-1 text-xs text-gray-400">
										Use <code class="text-cyan-300">prepare_tools_for_provider()</code> to convert MCP
										tools and prompts into OpenAI's function calling format. This is necessary because
										OpenAI's API doesn't natively support MCP prompts.
									</p>
								</div>
								<div class="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
									<strong class="text-purple-300">4. Main Loop</strong>
									<p class="mt-1 text-xs text-gray-400">
										Continuously prompt for user input, send to OpenAI with available tools, execute
										tool calls in parallel, and return responses with follow-up questions.
									</p>
								</div>
								<div class="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
									<strong class="text-purple-300">5. Tool Execution</strong>
									<p class="mt-1 text-xs text-gray-400">
										Handle both regular MCP tools (via SDK) and prompts (via REST API). Execute all
										tool calls in parallel using <code class="text-cyan-300">asyncio.gather()</code>
										for better performance.
									</p>
								</div>
							</div>
						</div>

						<!-- Section 3: Implementation -->
						<div class="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
							<h3 class="mb-4 flex items-center gap-2 text-xl font-semibold text-emerald-300">
								<FileCode class="h-5 w-5" />
								Section 3: Building the Code Step by Step
							</h3>
							<p class="mb-4 text-sm text-gray-300">
								We'll build the chatbot incrementally. Create <code
									class="rounded bg-gray-800 px-1 py-0.5 text-cyan-300">chatbot.py</code
								> and add each section as we go.
							</p>

							<!-- Step 3.1: Imports -->
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 3.1:</span>
									Import Required Libraries
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Import all necessary libraries and load environment variables.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> We need asyncio for async operations, httpx for HTTP requests,
									OpenAI client for AI responses, and the MCP SDK for accessing translation resources.
								</p>
								<pre class="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code
										>import asyncio
import os
import json
import random
import httpx
from dotenv import load_dotenv
from openai import OpenAI
from translation_helps import TranslationHelpsClient
from translation_helps.adapters import prepare_tools_for_provider

# Load environment variables from .env file
load_dotenv()</code
									></pre>
							</div>

							<!-- Step 3.2: Client Initialization -->
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 3.2:</span>
									Initialize Clients
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Create the main function and initialize MCP, OpenAI, and
									HTTP clients.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> The MCP client connects to translation resources, OpenAI client
									generates responses, and the shared HTTP client reuses connections for better performance
									when executing prompts.
								</p>
								<pre class="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code
										>async def main():
    # Get server URL from environment or use default
    server_url = os.getenv("MCP_SERVER_URL", "https://translation-helps-mcp-945.pages.dev/api/mcp")
    
    # Initialize MCP client for accessing translation resources
    mcp_client = TranslationHelpsClient({'{'}"serverUrl": server_url{'}'})
    
    # Initialize OpenAI client for AI responses
    openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Create shared HTTP client for prompt execution (reuses connections)
    http_client = httpx.AsyncClient(timeout=60.0)
    
    try:
        # ... rest of code goes here ...
    finally:
        await http_client.aclose()
        await mcp_client.close()

if __name__ == "__main__":
    asyncio.run(main())</code
									></pre>
							</div>

							<!-- Step 3.3: Tool Discovery -->
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 3.3:</span>
									Connect and Discover Tools
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Connect to the MCP server and discover available tools
									and prompts, then convert them for OpenAI.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> We need to know what tools are available before we can use them.
									The adapter converts MCP tools/prompts to OpenAI's function calling format since OpenAI
									doesn't natively support MCP prompts.
								</p>
								<pre
									class="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code>    try:
        # Connect to MCP server
        await mcp_client.connect()
        print("✅ Connected to Translation Helps MCP server")
        
        # Discover available tools and prompts
        tools = await mcp_client.list_tools()
        prompts = await mcp_client.list_prompts()
        print(f"✅ Found {'{'}len(tools){'}'} available tools")
        print(f"✅ Found {'{'}len(prompts){'}'} available prompts")
        
        # Convert MCP tools/prompts to OpenAI function calling format
        openai_tools = prepare_tools_for_provider("openai", tools, prompts)
        
        # ... rest of code goes here ...</code
									></pre>
							</div>

							<!-- Step 3.4: System Prompt -->
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 3.4:</span>
									Define System Prompt
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Create a comprehensive system prompt that instructs the
									AI on how to use translation resources.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> The system prompt defines the AI's behavior, explains available
									resources, and ensures accurate, helpful responses. This is critical for getting good
									results.
								</p>
								<pre
									class="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code>        # System prompt - defines AI behavior and available resources
        SYSTEM_PROMPT = """You are a Bible study assistant that provides information EXCLUSIVELY from the Translation Helps MCP Server database. You have access to real-time data from unfoldingWord's translation resources.

UNDERSTANDING TRANSLATION RESOURCES:
1. **Scripture Texts** (ULT, UST) - The actual Bible text
2. **Translation Notes** (TN) - Explains difficult phrases and cultural context
3. **Translation Words** (TW) - Comprehensive biblical term definitions
4. **Translation Questions** (TQ) - Comprehension questions
5. **Translation Academy** (TA) - Training articles on translation concepts

CRITICAL RULES:
- ALWAYS use tools to fetch data before answering
- Quote scripture EXACTLY as provided
- Include citations for all information
- Present complete translation word articles when asked
- Always end responses with helpful follow-up questions

... (full prompt continues with detailed instructions) ..."""
        
        # Initialize message history with system prompt
        messages = [
            {'{'}"role": "system", "content": SYSTEM_PROMPT{'}'}
        ]
        
        print("\\n🤖 Chatbot ready! Type 'quit' to exit.\\n")</code
									></pre>
								<p class="mt-2 text-xs text-gray-400">
									<strong>Note:</strong> The full system prompt is quite long (~260 lines). See the complete
									code example for the full prompt.
								</p>
							</div>

							<!-- Step 3.5: Main Loop -->
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 3.5:</span>
									Create Main Chat Loop
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Create a loop that reads user input, sends it to OpenAI
									with tools, and handles responses.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> This is the core interaction loop. It continuously processes
									user questions, lets OpenAI decide which tools to call, and displays responses.
								</p>
								<pre
									class="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code>        while True:
            # Get user input
            user_input = input("You: ").strip()
            if user_input.lower() in ['quit', 'exit', 'q']:
                break
            
            if not user_input:
                continue
            
            # Add user message to conversation history
            messages.append({'{'}"role": "user", "content": user_input{'}'})
            
            # Call OpenAI with available tools
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=openai_tools,
                tool_choice="auto",  # Let OpenAI decide which tools to use
                temperature=0.3,  # Lower temperature for more factual responses
                max_tokens=2000
            )
            
            # Get assistant's response
            assistant_message = response.choices[0].message
            
            # Add assistant message to history (including tool calls if any)
            messages.append({'{'}
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {'{'}
                        "id": tc.id,
                        "type": "function",
                        "function": {'{'}
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        {'}'}
                    {'}'} for tc in (assistant_message.tool_calls or [])
                ]
            {'}'} if assistant_message.tool_calls else {'{'}
                "role": "assistant",
                "content": assistant_message.content
            {'}'})
            
            # ... handle tool calls next ...</code
									></pre>
							</div>

							<!-- Step 3.6: Tool Execution -->
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 3.6:</span>
									Execute Tool Calls in Parallel
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Create a function to execute tool calls and run them all
									in parallel.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> Parallel execution is much faster than sequential. We handle
									two types: (1) Regular MCP tools via SDK, (2) Prompts via REST API (since OpenAI doesn't
									support MCP prompts natively).
								</p>
								<pre
									class="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code>            # If OpenAI wants to call tools, execute them
            if assistant_message.tool_calls:
                # Show immediate feedback to user
                polite_messages = [
                    "💭 Let me gather that information for you...",
                    "🔍 I'll look that up for you right away...",
                    "📚 Let me fetch the relevant translation resources..."
                ]
                print(f"\\nAssistant: {'{'}random.choice(polite_messages){'}'}\\n")
                
                # Define function to execute a single tool call
                async def execute_tool_call(tool_call):
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)
                    
                    try:
                        # Check if this is a prompt (starts with "prompt_")
                        if tool_name.startswith("prompt_"):
                            prompt_name = tool_name.replace("prompt_", "")
                            
                            # Execute prompt via REST API
                            prompt_response = await http_client.post(
                                f"{'{'}server_url.replace('/api/mcp', '/api/execute-prompt'){'}'}",
                                json={'{'}
                                    "promptName": prompt_name,
                                    "parameters": tool_args
                                {'}'}
                            )
                            prompt_response.raise_for_status()
                            prompt_data = prompt_response.json()
                            return {'{'}
                                "tool_call_id": tool_call.id,
                                "name": tool_name,
                                "content": json.dumps(prompt_data, indent=2)
                            {'}'}
                        
                        # Regular MCP tool call via SDK
                        result = await mcp_client.call_tool(tool_name, tool_args)
                        
                        # Extract text from MCP response
                        tool_result_text = ""
                        if result.get("content"):
                            for item in result["content"]:
                                if isinstance(item, dict) and "text" in item:
                                    tool_result_text += item.get("text", "")
                        
                        return {'{'}
                            "tool_call_id": tool_call.id,
                            "name": tool_name,
                            "content": tool_result_text
                        {'}'}
                    except Exception as e:
                        return {'{'}
                            "tool_call_id": tool_call.id,
                            "name": tool_name,
                            "content": f"[ERROR] {'{'}str(e){'}'}"
                        {'}'}
                
                # Execute all tool calls in parallel
                tool_results = await asyncio.gather(*[
                    execute_tool_call(tc) for tc in assistant_message.tool_calls
                ])
                
                # Add tool results to conversation history
                for result in tool_results:
                    messages.append({'{'}
                        "role": "tool",
                        "tool_call_id": result["tool_call_id"],
                        "name": result["name"],
                        "content": result["content"]
                    {'}'})
                
                # ... get final response next ...</code
									></pre>
							</div>

							<!-- Step 3.7: Final Response -->
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 3.7:</span>
									Get Final Response and Add Follow-up Questions
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Get OpenAI's final response with tool results, ensure
									follow-up questions are present, and display it.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> After tool execution, OpenAI generates a response using the fetched
									data. We post-process to ensure follow-up questions are always included for better
									user engagement.
								</p>
								<pre
									class="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code>                # Get final response from OpenAI with tool results
                final_response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages
                )
                
                final_message = final_response.choices[0].message
                final_content = final_message.content
                
                # Post-process: Ensure follow-up questions are present
                content_lower = final_content.lower()
                followup_indicators = ["would you like", "should we", "want to explore"]
                has_followups = any(indicator in content_lower for indicator in followup_indicators)
                
                if not has_followups:
                    # Extract Bible reference if present
                    import re
                    ref_match = re.search(r'\\b([1-3]?\\s?[a-z]+)\\s+(\\d+):(\\d+)', user_input.lower())
                    if ref_match:
                        book = ref_match.group(1).strip().title()
                        chapter = ref_match.group(2)
                        verse = ref_match.group(3)
                        reference = f"{'{'}book{'}'} {'{'}chapter{'}'}:{'{'}verse{'}'}"
                        final_content += f"\\n\\nWould you like to explore more? Would you like to see the translation notes for {'{'}reference{'}'}? Would you like to explore the key terms in {'{'}reference{'}'}? Or would you like to learn about the translation challenges in {'{'}reference{'}'}?"
                    else:
                        final_content += f"\\n\\nWould you like to explore more? Would you like to see the translation notes for this verse? Would you like to explore the key terms in this passage? Or would you like to learn about the translation challenges here?"
                
                # Add final response to history
                messages.append({'{'}
                    "role": "assistant",
                    "content": final_content
                {'}'})
                
                # Display response
                print(f"\\nAssistant: {'{'}final_content{'}'}\\n")
            
            # If no tool calls, just display the response
            elif assistant_message.content:
                print(f"\\nAssistant: {'{'}assistant_message.content{'}'}\\n")</code
									></pre>
							</div>

							<!-- Complete Code Reference -->
							<div class="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-300">
									<FileCode class="h-4 w-4" />
									Complete Code Reference
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									For the complete working code with all features (CLI arguments, error handling,
									etc.), see the full example:
								</p>
								<details class="mt-2">
									<summary class="cursor-pointer text-xs text-blue-400 hover:text-blue-300">
										Click to view complete chatbot.py code
									</summary>
									<pre
										class="mt-2 overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code
											>{pythonChatbotCode}</code
										></pre>
								</details>
							</div>
						</div>

						<!-- Section 4: Running and Testing -->
						<div class="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
							<h3 class="mb-4 flex items-center gap-2 text-xl font-semibold text-emerald-300">
								<Zap class="h-5 w-5" />
								Section 4: Running and Testing
							</h3>
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 4.1:</span>
									Run Your Chatbot
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Execute the chatbot script.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> This starts the interactive loop where you can ask questions
									about Bible translation resources.
								</p>
								<pre class="overflow-x-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-300"><code
										>python chatbot.py</code
									></pre>
							</div>
							<div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
									<span class="text-emerald-400">Step 4.2:</span>
									Test with Sample Questions
								</h4>
								<p class="mb-3 text-xs text-gray-300">
									<strong>What we do:</strong> Try different types of questions to see how the chatbot
									handles various requests.
								</p>
								<p class="mb-3 text-xs text-gray-400">
									<strong>Why:</strong> Different question types trigger different tools, helping you
									understand how the system works.
								</p>
								<ul class="mt-2 space-y-1 text-xs text-gray-400">
									<li>
										• <strong>"What does John 3:16 say?"</strong> → Triggers
										<code class="text-cyan-300">fetch_scripture</code> tool
									</li>
									<li>
										• <strong>"What are the translation notes for Ephesians 2:8-9?"</strong> →
										Triggers <code class="text-cyan-300">fetch_translation_notes</code> tool
									</li>
									<li>
										• <strong>"What does the word 'love' mean in the Bible?"</strong> → Triggers
										<code class="text-cyan-300">fetch_translation_word</code> tool with term="love"
									</li>
									<li>
										• <strong>"Teach me how to translate Romans 14:1"</strong> → Triggers
										<code class="text-cyan-300">prompt_translation-helps-for-passage</code> for comprehensive
										data
									</li>
								</ul>
							</div>
							<div class="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
								<p class="text-xs text-blue-300">
									<strong>💡 Features:</strong> The chatbot includes parallel tool execution, immediate
									user feedback, automatic follow-up questions, and support for MCP prompts via REST
									API.
								</p>
							</div>
						</div>

						<!-- How It Works -->
						<div class="mb-6 rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
							<h3 class="mb-4 flex items-center gap-2 text-xl font-semibold text-purple-300">
								<Zap class="h-5 w-5" />
								How It Works
							</h3>
							<div class="space-y-4 text-sm text-gray-300">
								<div class="flex gap-3">
									<span
										class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300"
										>1</span
									>
									<div>
										<strong class="text-purple-300">User asks a question</strong>
										<p class="mt-1 text-xs text-gray-400">e.g., "What does John 3:16 say?"</p>
									</div>
								</div>
								<div class="flex gap-3">
									<span
										class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300"
										>2</span
									>
									<div>
										<strong class="text-purple-300"
											>Adapter utility prepares tools for OpenAI</strong
										>
										<p class="mt-1 text-xs text-gray-400">
											Uses <code class="text-cyan-300">prepare_tools_for_provider()</code> to convert
											MCP tools and prompts to OpenAI function calling format
										</p>
									</div>
								</div>
								<div class="flex gap-3">
									<span
										class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300"
										>3</span
									>
									<div>
										<strong class="text-purple-300"
											>OpenAI receives question + available tools</strong
										>
										<p class="mt-1 text-xs text-gray-400">
											OpenAI sees all MCP tools (fetch_scripture, fetch_translation_notes, etc.)
											plus converted prompts
										</p>
									</div>
								</div>
								<div class="flex gap-3">
									<span
										class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300"
										>4</span
									>
									<div>
										<strong class="text-purple-300">OpenAI decides which tools to call</strong>
										<p class="mt-1 text-xs text-gray-400">
											OpenAI might call <code class="text-cyan-300">fetch_scripture</code> with
											<code class="text-cyan-300">reference="John 3:16"</code>
											or <code class="text-cyan-300">prompt_translation-helps-for-passage</code>
										</p>
									</div>
								</div>
								<div class="flex gap-3">
									<span
										class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300"
										>5</span
									>
									<div>
										<strong class="text-purple-300"
											>Python SDK executes tool calls in parallel</strong
										>
										<p class="mt-1 text-xs text-gray-400">
											All tool calls execute simultaneously using <code class="text-cyan-300"
												>asyncio.gather()</code
											> for better performance. Prompts execute via REST API.
										</p>
									</div>
								</div>
								<div class="flex gap-3">
									<span
										class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300"
										>6</span
									>
									<div>
										<strong class="text-purple-300">Tool results fed back to OpenAI</strong>
										<p class="mt-1 text-xs text-gray-400">
											OpenAI receives the data and generates a natural language response with
											follow-up questions
										</p>
									</div>
								</div>
								<div class="flex gap-3">
									<span
										class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300"
										>7</span
									>
									<div>
										<strong class="text-purple-300">User receives final answer</strong>
										<p class="mt-1 text-xs text-gray-400">
											OpenAI provides a comprehensive answer using the fetched data, always ending
											with helpful follow-up questions
										</p>
									</div>
								</div>
							</div>
						</div>

						<!-- Key Features -->
						<div class="mb-6 rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
							<h3 class="mb-4 flex items-center gap-2 text-xl font-semibold text-purple-300">
								<Zap class="h-5 w-5" />
								Key Features
							</h3>
							<ul class="space-y-2 text-sm text-gray-300">
								<li class="flex items-start gap-2">
									<span class="text-purple-400">⚡</span>
									<span
										><strong>Parallel Tool Execution:</strong> All tool calls execute simultaneously
										for faster responses</span
									>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-purple-400">💬</span>
									<span
										><strong>Immediate Feedback:</strong> Shows polite messages while gathering information</span
									>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-purple-400">🔧</span>
									<span
										><strong>Adapter Utilities:</strong> Automatically converts MCP tools/prompts to
										OpenAI format</span
									>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-purple-400">❓</span>
									<span
										><strong>Follow-up Questions:</strong> Every response includes helpful follow-up
										questions to guide exploration</span
									>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-purple-400">📚</span>
									<span
										><strong>Prompt Support:</strong> Supports MCP prompts via REST API for comprehensive
										data gathering</span
									>
								</li>
							</ul>
						</div>

						<!-- Next Steps -->
						<div class="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
							<h3 class="mb-4 flex items-center gap-2 text-xl font-semibold text-blue-300">
								<Globe class="h-5 w-5" />
								Next Steps
							</h3>
							<ul class="space-y-3 text-sm text-gray-300">
								<li class="flex items-start gap-2">
									<span class="text-blue-400">→</span>
									<span>Add CLI arguments (--verbose, --debug, --quiet) for better control</span>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-blue-400">→</span>
									<span>Customize the system prompt to better suit your use case</span>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-blue-400">→</span>
									<span
										>Explore the full example in <code
											class="rounded bg-gray-800 px-1 py-0.5 text-cyan-300"
											>examples/python-chatbot/</code
										></span
									>
								</li>
								<li class="flex items-start gap-2">
									<span class="text-blue-400">→</span>
									<span
										>Check out the <a
											href="/docs/BUILD_CLIENT_FOR_REMOTE_SERVER"
											class="text-blue-400 hover:underline">complete client tutorial</a
										> for more advanced examples</span
									>
								</li>
							</ul>
						</div>
					</div>
				</div>
			{/if}

			<!-- Next Steps (shown on all sections except overview) -->
			{#if activeSection !== 'overview'}
				<div
					class="mt-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 backdrop-blur-xl"
				>
					<h2 class="mb-6 text-2xl font-bold text-white">🎉 Next Steps</h2>
					<div class="grid gap-6 md:grid-cols-3">
						<div>
							<h3 class="mb-2 font-semibold text-emerald-300">Test Interactively</h3>
							<p class="mb-3 text-sm text-gray-300">
								Try our tools and prompts in an interactive browser environment.
							</p>
							<a
								href="/mcp-tools"
								class="text-sm text-blue-400 hover:text-blue-300 hover:underline"
							>
								Open MCP Tools →
							</a>
						</div>
						<div>
							<h3 class="mb-2 font-semibold text-emerald-300">Explore API</h3>
							<p class="mb-3 text-sm text-gray-300">
								Browse all endpoints with live testing and response previews.
							</p>
							<a
								href="/api-explorer"
								class="text-sm text-blue-400 hover:text-blue-300 hover:underline"
							>
								Open API Explorer →
							</a>
						</div>
						<div>
							<h3 class="mb-2 font-semibold text-emerald-300">Read Docs</h3>
							<p class="mb-3 text-sm text-gray-300">
								Learn about MCP concepts, prompts, and advanced features.
							</p>
							<a
								href="https://modelcontextprotocol.io/docs"
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm text-blue-400 hover:text-blue-300 hover:underline"
							>
								MCP Documentation ↗
							</a>
						</div>
					</div>
				</div>
			{/if}

			<!-- Local MCP Protocol Section -->
			{#if activeSection === 'local-mcp'}
				<div class="space-y-8">
					<!-- What is MCP Protocol -->
					<div class="rounded-2xl border border-blue-500/30 bg-white/5 p-8 backdrop-blur-xl">
						<h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
							<Zap class="h-6 w-6 text-blue-400" />
							What is MCP Protocol?
						</h2>
						<p class="mb-4 text-lg text-gray-300">
							The <strong class="text-blue-300">Model Context Protocol (MCP)</strong> is an open
							standard that enables AI assistants to securely connect to external data sources and
							tools. This section covers
							<strong class="text-blue-300">local STDIO-based</strong> connections. For remote HTTP connections,
							see the "Remote MCP Server" tab above.
						</p>
						<div class="grid gap-4 md:grid-cols-3">
							<div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
								<h3 class="mb-2 font-semibold text-blue-300">🛠️ Tools</h3>
								<p class="text-sm text-gray-400">
									6 core tools for fetching scripture, notes, questions, and word articles
								</p>
							</div>
							<div class="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
								<h3 class="mb-2 font-semibold text-purple-300">✨ Prompts</h3>
								<p class="text-sm text-gray-400">
									3 multi-step workflows that chain tools together automatically
								</p>
							</div>
							<div class="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
								<h3 class="mb-2 font-semibold text-cyan-300">🔒 Secure</h3>
								<p class="text-sm text-gray-400">
									STDIO transport with user approval for all operations
								</p>
							</div>
						</div>
						<div class="mt-6 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
							<p class="text-sm text-gray-400">
								📚 Learn more about MCP concepts:
								<a
									href="https://modelcontextprotocol.io/docs/learn/client-concepts"
									target="_blank"
									rel="noopener noreferrer"
									class="text-blue-400 hover:text-blue-300 hover:underline"
								>
									Client Concepts
								</a>
								|
								<a
									href="https://modelcontextprotocol.io/docs/learn/server-concepts"
									target="_blank"
									rel="noopener noreferrer"
									class="text-blue-400 hover:text-blue-300 hover:underline"
								>
									Server Concepts
								</a>
							</p>
						</div>
					</div>

					<!-- Client Selection -->
					<div class="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 backdrop-blur-xl">
						<h2 class="mb-6 text-2xl font-bold text-white">Choose Your MCP Client</h2>
						<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{#each Object.entries(mcpConfigs) as [key, config]}
								<button
									on:click={() => (activeMCPClient = key as MCPClientType)}
									class="rounded-xl border p-4 text-left transition-all {activeMCPClient === key
										? 'border-blue-500 bg-blue-500/10'
										: 'border-gray-700 bg-gray-800/30 hover:border-gray-600'}"
								>
									<h3 class="font-semibold text-white">{config.name}</h3>
									<p class="text-xs text-gray-400">{config.file}</p>
								</button>
							{/each}
						</div>

						<!-- Configuration Instructions -->
						<div class="space-y-4">
							<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
								<h3 class="mb-3 flex items-center gap-2 font-semibold text-white">
									<Terminal class="h-5 w-5 text-blue-400" />
									Configuration Location
								</h3>
								<div class="space-y-2 text-sm">
									<p class="text-gray-400">
										<strong class="text-gray-300">Windows:</strong>
										<code class="ml-2 rounded bg-gray-800 px-2 py-1 text-cyan-300"
											>{currentConfig.location.windows}</code
										>
									</p>
									<p class="text-gray-400">
										<strong class="text-gray-300">macOS:</strong>
										<code class="ml-2 rounded bg-gray-800 px-2 py-1 text-cyan-300"
											>{currentConfig.location.mac}</code
										>
									</p>
									<p class="text-gray-400">
										<strong class="text-gray-300">Linux:</strong>
										<code class="ml-2 rounded bg-gray-800 px-2 py-1 text-cyan-300"
											>{currentConfig.location.linux}</code
										>
									</p>
								</div>
							</div>

							<!-- Configuration Code -->
							<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
								<div class="mb-3 flex items-center justify-between">
									<h3 class="flex items-center gap-2 font-semibold text-white">
										<Code class="h-5 w-5 text-cyan-400" />
										{currentConfig.file}
									</h3>
									<button
										on:click={() =>
											copyToClipboard(JSON.stringify(currentConfig.config, null, 2), 'config')}
										class="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
									>
										{#if copiedConfig}
											<Check class="h-4 w-4 text-green-400" />
											<span class="text-green-400">Copied!</span>
										{:else}
											<Copy class="h-4 w-4" />
											<span>Copy</span>
										{/if}
									</button>
								</div>
								<pre class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-300"><code
										>{JSON.stringify(currentConfig.config, null, 2)}</code
									></pre>
							</div>

							<!-- Setup Steps -->
							<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
								<h3 class="mb-4 font-semibold text-emerald-300">🚀 Quick Setup Steps</h3>
								<ol class="space-y-3 text-sm text-gray-300">
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300"
											>1</span
										>
										<div class="flex-1">
											<span class="mb-2 block">Clone the repository and install dependencies:</span>
											<pre
												class="overflow-x-auto rounded bg-gray-950 p-2 text-xs text-gray-300"><code
													>git clone https://github.com/unfoldingWord/translation-helps-mcp.git
cd translation-helps-mcp
npm install</code
												></pre>
										</div>
									</li>
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300"
											>2</span
										>
										<span>
											Create or edit <code class="rounded bg-gray-800 px-2 py-0.5 text-cyan-300"
												>{currentConfig.file}</code
											> in the location shown above
										</span>
									</li>
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300"
											>3</span
										>
										<div class="flex-1">
											<span class="mb-2 block"
												>Paste the configuration JSON and update the path:</span
											>
											{#if currentConfig.note}
												<div
													class="rounded border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300"
												>
													⚠️ {currentConfig.note}
												</div>
											{/if}
										</div>
									</li>
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300"
											>4</span
										>
										<span>Restart {currentConfig.name}</span>
									</li>
									<li class="flex gap-3">
										<span
											class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300"
											>5</span
										>
										<span
											>Start using tools like <code
												class="rounded bg-gray-800 px-2 py-0.5 text-cyan-300">fetch_scripture</code
											>
											and prompts like
											<code class="rounded bg-gray-800 px-2 py-0.5 text-cyan-300"
												>translation-helps-for-passage</code
											>
										</span>
									</li>
								</ol>
							</div>
						</div>

						<!-- Available Features -->
						<div class="grid gap-4 md:grid-cols-2">
							<div class="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
								<h3 class="mb-3 font-semibold text-blue-300">🛠️ Available Tools</h3>
								<ul class="space-y-2 text-sm text-gray-300">
									<li>
										<code class="text-cyan-300">fetch_scripture</code> - Get Bible text
									</li>
									<li>
										<code class="text-cyan-300">translation_questions</code> - Comprehension questions
									</li>
									<li>
										<code class="text-cyan-300">translation_notes</code> - Translation notes
									</li>
									<li>
										<code class="text-cyan-300">fetch_translation_word_links</code> - Word links
									</li>
									<li>
										<code class="text-cyan-300">fetch_translation_word</code> - Word definitions
									</li>
									<li>
										<code class="text-cyan-300">fetch_translation_academy</code> - Academy articles
									</li>
								</ul>
							</div>
							<div class="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
								<h3 class="mb-3 font-semibold text-purple-300">✨ Available Prompts</h3>
								<ul class="space-y-2 text-sm text-gray-300">
									<li>
										<code class="text-cyan-300">translation-helps-for-passage</code> - Complete translation
										help
									</li>
									<li>
										<code class="text-cyan-300">get-translation-words-for-passage</code> - Words only
									</li>
									<li>
										<code class="text-cyan-300">get-translation-academy-for-passage</code> - Academy
										only
									</li>
								</ul>
								<p class="mt-3 text-xs text-gray-400">
									Prompts chain multiple tools automatically to provide comprehensive results.
								</p>
							</div>
						</div>

						<!-- Test in Browser -->
						<div class="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6">
							<h3 class="mb-3 font-semibold text-cyan-300">🧪 Test Tools & Prompts</h3>
							<p class="mb-4 text-sm text-gray-300">
								Want to try the tools and prompts before setting up? Visit our interactive testing
								page:
							</p>
							<a
								href="/mcp-tools"
								class="inline-flex items-center gap-2 rounded-lg border border-cyan-500 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20"
							>
								<Package class="h-4 w-4" />
								Open MCP Tools Explorer
							</a>
						</div>
					</div>
				</div>
			{/if}

			<!-- REST API Section -->
			{#if activeSection === 'rest'}
				<div class="space-y-8">
					<!-- What is REST API -->
					<div class="rounded-2xl border border-cyan-500/30 bg-white/5 p-8 backdrop-blur-xl">
						<h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
							<Globe class="h-6 w-6 text-cyan-400" />
							REST API Access
						</h2>
						<div class="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
							<p class="text-sm text-blue-300">
								<strong>🌐 Production API:</strong>
								<code class="ml-2 rounded bg-gray-900 px-2 py-1 text-cyan-300"
									>https://translation-helps-mcp-945.pages.dev</code
								>
							</p>
						</div>
						<p class="mb-4 text-lg text-gray-300">
							Access our translation resources through standard <strong class="text-cyan-300"
								>HTTP REST API</strong
							>. Perfect for web applications, mobile apps, or any HTTP client.
						</p>
						<div class="grid gap-4 md:grid-cols-3">
							<div class="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
								<h3 class="mb-2 font-semibold text-cyan-300">🌐 Public API</h3>
								<p class="text-sm text-gray-400">HTTPS endpoints with CORS support for web apps</p>
							</div>
							<div class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
								<h3 class="mb-2 font-semibold text-emerald-300">⚡ Fast</h3>
								<p class="text-sm text-gray-400">Cloudflare Workers edge deployment worldwide</p>
							</div>
							<div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
								<h3 class="mb-2 font-semibold text-blue-300">📦 JSON</h3>
								<p class="text-sm text-gray-400">Clean JSON responses with metadata</p>
							</div>
						</div>
					</div>

					<!-- Endpoint Selection -->
					<div class="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 backdrop-blur-xl">
						<h2 class="mb-6 text-2xl font-bold text-white">Choose an Endpoint</h2>
						<div class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{#each Object.entries(restExamples) as [key, example]}
								<button
									on:click={() => (activeRESTExample = key as RESTExample)}
									class="rounded-xl border p-4 text-left transition-all {activeRESTExample === key
										? 'border-cyan-500 bg-cyan-500/10'
										: 'border-gray-700 bg-gray-800/30 hover:border-gray-600'}"
								>
									<h3 class="mb-1 font-semibold text-white">{example.title}</h3>
									<p class="text-xs text-gray-400">{example.description}</p>
								</button>
							{/each}
						</div>

						<!-- Code Examples -->
						<div class="space-y-6">
							<!-- cURL Example -->
							<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
								<div class="mb-3 flex items-center justify-between">
									<h3 class="flex items-center gap-2 font-semibold text-white">
										<Terminal class="h-5 w-5 text-emerald-400" />
										cURL
									</h3>
									<button
										on:click={() => copyToClipboard(currentExample.curl, 'curl')}
										class="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
									>
										{#if copiedCurl}
											<Check class="h-4 w-4 text-green-400" />
											<span class="text-green-400">Copied!</span>
										{:else}
											<Copy class="h-4 w-4" />
											<span>Copy</span>
										{/if}
									</button>
								</div>
								<pre class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-300"><code
										>{currentExample.curl}</code
									></pre>
							</div>

							<!-- TypeScript Example -->
							<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
								<div class="mb-3 flex items-center justify-between">
									<h3 class="flex items-center gap-2 font-semibold text-white">
										<Code class="h-5 w-5 text-blue-400" />
										TypeScript / JavaScript
									</h3>
									<button
										on:click={() => copyToClipboard(currentExample.typescript, 'curl')}
										class="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
									>
										<Copy class="h-4 w-4" />
										<span>Copy</span>
									</button>
								</div>
								<pre class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-300"><code
										>{currentExample.typescript}</code
									></pre>
							</div>

							<!-- Python Example -->
							<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-6">
								<div class="mb-3 flex items-center justify-between">
									<h3 class="flex items-center gap-2 font-semibold text-white">
										<Code class="h-5 w-5 text-yellow-400" />
										Python
									</h3>
									<button
										on:click={() => copyToClipboard(currentExample.python, 'curl')}
										class="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-700"
									>
										<Copy class="h-4 w-4" />
										<span>Copy</span>
									</button>
								</div>
								<pre class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-300"><code
										>{currentExample.python}</code
									></pre>
							</div>

							<!-- API Reference Link -->
							<div class="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
								<h3 class="mb-3 font-semibold text-blue-300">📚 Full API Reference</h3>
								<p class="mb-4 text-sm text-gray-300">
									View all available endpoints, parameters, and response formats:
								</p>
								<a
									href="/api-explorer"
									class="inline-flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/20"
								>
									<Code class="h-4 w-4" />
									Open API Explorer
								</a>
							</div>
						</div>
					</div>

					<!-- Common Parameters -->
					<div class="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 backdrop-blur-xl">
						<h2 class="mb-6 text-2xl font-bold text-white">Common Parameters</h2>
						<div class="space-y-4">
							<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
								<div class="mb-2 flex items-center gap-2">
									<code class="text-cyan-300">reference</code>
									<span class="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300"
										>Required</span
									>
								</div>
								<p class="text-sm text-gray-400">
									Bible reference (e.g., <code class="text-gray-300">John 3:16</code>,
									<code class="text-gray-300">Genesis 1:1-5</code>,
									<code class="text-gray-300">Matthew 5</code>)
								</p>
							</div>
							<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
								<div class="mb-2 flex items-center gap-2">
									<code class="text-cyan-300">language</code>
									<span class="rounded bg-gray-500/20 px-2 py-0.5 text-xs text-gray-300"
										>Optional</span
									>
								</div>
								<p class="text-sm text-gray-400">
									Language code (default: <code class="text-gray-300">en</code>). Supports
									<code class="text-gray-300">en</code>, <code class="text-gray-300">es</code>,
									<code class="text-gray-300">fr</code>, and more.
								</p>
							</div>
							<div class="rounded-xl border border-gray-700 bg-gray-900/50 p-4">
								<div class="mb-2 flex items-center gap-2">
									<code class="text-cyan-300">format</code>
									<span class="rounded bg-gray-500/20 px-2 py-0.5 text-xs text-gray-300"
										>Optional</span
									>
								</div>
								<p class="text-sm text-gray-400">
									Response format (default: <code class="text-gray-300">json</code>)
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	code {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	pre code {
		display: block;
		line-height: 1.6;
	}
</style>
