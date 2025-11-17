<script lang="ts">
	import {
		ExternalLink,
		Code,
		Layers,
		ArrowRight,
		FileCode,
		GitBranch,
		BookOpen
	} from 'lucide-svelte';
	import { onMount, afterUpdate } from 'svelte';
	import Prism from 'prismjs';
	import 'prismjs/components/prism-typescript';
	import 'prismjs/components/prism-javascript';
	import 'prismjs/components/prism-bash';
	import 'prismjs/themes/prism-tomorrow.css';

	// Code examples
	const sdkWrapperCode = `import { TranslationHelpsClient } from '@translation-helps/mcp-client';
import type { MCPTool, MCPPrompt, MCPResponse } from '@translation-helps/mcp-client';

let clientInstance: TranslationHelpsClient | null = null;

/**
 * Get or create the MCP client instance
 */
function getMCPClient(serverUrl?: string): TranslationHelpsClient {
  if (!clientInstance) {
    clientInstance = new TranslationHelpsClient({
      serverUrl: serverUrl || undefined,
      timeout: 30000,
    });
  } else if (serverUrl && clientInstance['serverUrl'] !== serverUrl) {
    // If serverUrl changes, create a new instance
    clientInstance = new TranslationHelpsClient({ serverUrl });
  }
  return clientInstance;
}

/**
 * Initialize the MCP client connection
 */
async function initializeMCPClient(serverUrl?: string): Promise<void> {
  const client = getMCPClient(serverUrl);
  if (!client.isConnected()) {
    await client.connect();
  }
}

/**
 * List all available tools
 */
export async function listTools(serverUrl?: string): Promise<MCPTool[]> {
  await initializeMCPClient(serverUrl);
  const client = getMCPClient(serverUrl);
  return await client.listTools();
}

/**
 * Call an MCP tool
 */
export async function callTool(
  name: string,
  arguments_: Record<string, any>,
  serverUrl?: string
): Promise<MCPResponse> {
  await initializeMCPClient(serverUrl);
  const client = getMCPClient(serverUrl);
  return await client.callTool(name, arguments_);
}

/**
 * Get an MCP prompt
 */
export async function getPrompt(
  name: string,
  arguments_: Record<string, any> = {},
  serverUrl?: string
): Promise<MCPResponse> {
  await initializeMCPClient(serverUrl);
  const client = getMCPClient(serverUrl);
  return await client.getPrompt(name, arguments_);
}`;

	const apiEndpointCode = `// File: ui/src/routes/api/chat-stream/+server.ts
// This is a SvelteKit API endpoint that receives POST requests from the frontend

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { callTool, getPrompt, listTools, listPrompts } from '$lib/mcp/client.js';

// Discover available tools and prompts using the SDK
async function discoverMCPEndpoints(baseUrl: string) {
  const serverUrl = \`\${baseUrl}/api/mcp\`;
  const tools = await listTools(serverUrl);      // Uses SDK wrapper
  const prompts = await listPrompts(serverUrl);  // Uses SDK wrapper
  
  // Convert tools to endpoint format (for compatibility)
  const endpoints = tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    path: \`/api/\${tool.name.replace(/_/g, '-')}\`,
    parameters: tool.inputSchema?.properties || {}
  }));
  
  return { endpoints, prompts };
}

// Execute MCP calls using the SDK
async function executeMCPCalls(calls, baseUrl: string) {
  const serverUrl = \`\${baseUrl}/api/mcp\`;
  const data = [];
  
  for (const call of calls) {
    if (call.prompt) {
      // Use SDK to execute prompt
      const response = await getPrompt(call.prompt, call.params, serverUrl);
      data.push({ type: \`prompt:\${call.prompt}\`, result: response });
    } else {
      // Use SDK to call tool
      const toolName = endpointToToolName(call.endpoint);
      const response = await callTool(toolName, call.params, serverUrl);
      data.push({ type: \`tool:\${toolName}\`, result: response });
    }
  }
  
  return { data };
}

// Call OpenAI API to generate chat response
async function callOpenAI(message: string, context: string, chatHistory: any[], apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a Bible study assistant...' },
        { role: 'system', content: context },
        ...chatHistory.slice(-6),
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Main POST handler (called by frontend)
export const POST: RequestHandler = async ({ request, url, platform }) => {
  const { message, chatHistory = [] } = await request.json();
  const baseUrl = url.origin;
  
  // Get OpenAI API key from environment
  const apiKey = platform?.env?.OPENAI_API_KEY || env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }
  
  // Step 1: Discover available MCP resources
  const { endpoints, prompts } = await discoverMCPEndpoints(baseUrl);
  
  // Step 2: Let LLM decide which tools to use (simplified - you'll need determineMCPCalls function)
  const endpointCalls = await determineMCPCalls(message, apiKey, endpoints, prompts);
  
  // Step 3: Execute the MCP calls using SDK
  const { data } = await executeMCPCalls(endpointCalls, baseUrl);
  
  // Step 4: Format MCP data as context for OpenAI
  const context = formatDataForContext(data);
  
  // Step 5: Call OpenAI with the context and get response
  const aiResponse = await callOpenAI(message, context, chatHistory, apiKey);
  
  // Step 6: Return response to frontend
  return json({ content: aiResponse, xrayData: { apiCalls: endpointCalls } });
}`;

	const frontendCode = `// File: ui/src/routes/(app)/chat/ChatInterface.svelte
// The frontend doesn't directly use the MCP SDK
// Instead, it calls the SvelteKit API endpoint which uses the SDK

async function sendMessage() {
  if (!inputValue.trim() || isLoading) return;

  // Add user message to UI
  const userMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: inputValue.trim(),
    timestamp: new Date()
  };
  messages = [...messages, userMessage];
  inputValue = '';
  isLoading = true;

  try {
    // Call the API endpoint (which uses the MCP SDK internally)
    const response = await fetch('/api/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage.content,
        chatHistory: messages.slice(0, -1).map(m => ({
          role: m.role,
          content: m.content
        })),
        enableXRay: true  // Get debug info about MCP calls
      })
    });

    if (!response.ok) throw new Error('Failed to get response');
    
    const data = await response.json();
    
    if (data.error) {
      // Handle errors
      messages = [...messages, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: \`❌ Error: \${data.error}\`,
        isError: true
      }];
    } else {
      // Display the AI response (which used MCP tools via SDK)
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || '',  // AI-generated response
        xrayData: data.xrayData,       // Debug info about MCP calls
        timestamp: new Date()
      };
      messages = [...messages, assistantMessage];
    }
  } catch (error) {
    console.error('Chat error:', error);
    messages = [...messages, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: \`❌ Error: \${error.message}\`,
      isError: true
    }];
  } finally {
    isLoading = false;
  }
}

// Note: The actual MCP SDK interaction happens in the API endpoint:
// /api/chat-stream uses the SDK wrapper (client.ts) which uses @translation-helps/mcp-client`;

	// Code element references for Prism highlighting
	let sdkWrapperElement: HTMLElement | null = null;
	let apiEndpointElement: HTMLElement | null = null;
	let frontendElement: HTMLElement | null = null;

	function highlightCode() {
		// Highlight all code blocks on the page
		if (typeof document !== 'undefined') {
			Prism.highlightAll();
		}

		// Also manually highlight our specific code blocks
		if (sdkWrapperElement) {
			sdkWrapperElement.textContent = sdkWrapperCode;
			sdkWrapperElement.className = 'language-typescript';
			Prism.highlightElement(sdkWrapperElement);
		}
		if (apiEndpointElement) {
			apiEndpointElement.textContent = apiEndpointCode;
			apiEndpointElement.className = 'language-typescript';
			Prism.highlightElement(apiEndpointElement);
		}
		if (frontendElement) {
			frontendElement.textContent = frontendCode;
			frontendElement.className = 'language-javascript';
			Prism.highlightElement(frontendElement);
		}
	}

	afterUpdate(() => {
		highlightCode();
	});

	onMount(() => {
		highlightCode();
	});
</script>

<svelte:head>
	<title>SDK Integration Tutorial - Translation Helps MCP</title>
	<meta
		name="description"
		content="Step-by-step tutorial: How the chat interface integrates with the @translation-helps/mcp-client SDK"
	/>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12">
	<div class="mb-8">
		<a href="/chat" class="mb-6 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">
			← Back to Chat
		</a>
		<h1 class="mb-4 text-4xl font-bold text-white">SDK Integration Tutorial</h1>
		<p class="text-lg text-gray-400">
			Learn how to integrate the <code class="rounded bg-gray-800 px-2 py-1"
				>@translation-helps/mcp-client</code
			> SDK into a SvelteKit chat application
		</p>
	</div>

	<div class="space-y-12">
		<!-- Step 0: Setup SvelteKit -->
		<section class="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
			<div class="mb-4 flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
					0
				</div>
				<h2 class="text-2xl font-semibold text-white">Setup SvelteKit Project</h2>
			</div>
			<p class="mb-4 text-gray-300">
				First, create a new SvelteKit project and install the necessary dependencies.
			</p>
			<div class="mb-4 space-y-4">
				<div>
					<strong class="text-white">1. Create a new SvelteKit project:</strong>
					<pre class="mt-2 overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm"><code
							class="language-bash"
							>npm create svelte@latest my-chat-app
cd my-chat-app
npm install</code
						></pre>
				</div>
				<div>
					<strong class="text-white">2. Install the Translation Helps MCP Client SDK:</strong>
					<pre class="mt-2 overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm"><code
							class="language-bash">npm install @translation-helps/mcp-client</code
						></pre>
					<p class="mt-2 text-sm text-gray-400">
						If the SDK isn't published yet, you can use a local path:
					</p>
					<pre class="mt-2 overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm"><code
							class="language-bash">npm install file:../path/to/packages/js-sdk</code
						></pre>
				</div>
				<div>
					<strong class="text-white">3. No OpenAI library needed:</strong>
					<p class="mt-2 text-sm text-gray-400">
						This implementation uses native <code class="rounded bg-gray-800 px-1">fetch</code> API
						to call OpenAI's REST API directly.
						<strong>No additional OpenAI SDK package is required!</strong> This keeps the bundle size
						small and dependencies minimal.
					</p>
				</div>
				<div>
					<strong class="text-white">4. Install additional dependencies (if needed):</strong>
					<pre class="mt-2 overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm"><code
							class="language-bash">npm install zod</code
						></pre>
					<p class="mt-2 text-sm text-gray-400">
						The SDK uses <code class="rounded bg-gray-800 px-1">zod</code> for validation, which should
						be installed automatically as a dependency.
					</p>
				</div>
			</div>
			<div class="mt-4 rounded-lg border border-green-800/50 bg-green-900/20 p-4">
				<p class="text-sm text-green-300">
					<strong>✅ What you'll have:</strong> A fresh SvelteKit project with the MCP SDK installed,
					OpenAI API key configured, and ready to build your chat bot. No OpenAI library dependency needed
					- we use native fetch API!
				</p>
			</div>
		</section>

		<!-- Step 1: File Structure -->
		<section class="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
			<div class="mb-4 flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
					1
				</div>
				<h2 class="text-2xl font-semibold text-white">File Structure</h2>
			</div>
			<p class="mb-4 text-gray-300">
				First, let's understand how a SvelteKit application is structured for this chat integration:
			</p>
			<div class="rounded-lg bg-gray-800/50 p-4 font-mono text-sm">
				<div class="space-y-1 text-gray-300">
					<div class="text-cyan-400">ui/</div>
					<div class="ml-4">
						<div class="text-cyan-400">src/</div>
						<div class="ml-4">
							<div class="text-yellow-400">lib/</div>
							<div class="ml-4">
								<div class="text-yellow-400">mcp/</div>
								<div class="ml-4 text-green-400">client.ts</div>
								<div class="ml-4 text-gray-400">← Step 1: SDK Wrapper</div>
							</div>
						</div>
						<div class="mt-2 ml-4">
							<div class="text-cyan-400">routes/</div>
							<div class="ml-4">
								<div class="text-cyan-400">api/</div>
								<div class="ml-4">
									<div class="text-cyan-400">chat-stream/</div>
									<div class="ml-4 text-green-400">+server.ts</div>
									<div class="ml-4 text-gray-400">← Step 2: API Endpoint</div>
								</div>
							</div>
							<div class="mt-2 ml-4">
								<div class="text-cyan-400">(app)/</div>
								<div class="ml-4">
									<div class="text-cyan-400">chat/</div>
									<div class="ml-4">
										<div class="text-green-400">ChatInterface.svelte</div>
										<div class="ml-4 text-gray-400">← Step 3: Frontend UI</div>
										<div class="text-green-400">+page.svelte</div>
										<div class="ml-4 text-gray-400">← Route Page</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="mt-4 rounded-lg border border-blue-800/50 bg-blue-900/20 p-4">
				<p class="text-sm text-blue-300">
					<strong>💡 SvelteKit Conventions:</strong> Files prefixed with
					<code class="rounded bg-gray-800 px-1">+</code>
					are special route files. <code class="rounded bg-gray-800 px-1">+server.ts</code> creates
					API endpoints, <code class="rounded bg-gray-800 px-1">+page.svelte</code> creates pages.
					The
					<code class="rounded bg-gray-800 px-1">lib/</code> directory is for shared utilities.
				</p>
			</div>
		</section>

		<!-- Step 2: SDK Wrapper -->
		<section class="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
			<div class="mb-4 flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
					2
				</div>
				<h2 class="text-2xl font-semibold text-white">Create the SDK Wrapper</h2>
			</div>
			<p class="mb-4 text-gray-300">
				Create a wrapper around the SDK to provide a clean, reusable interface. This goes in
				<code class="rounded bg-gray-800 px-1">lib/mcp/client.ts</code>.
			</p>
			<div class="mb-4">
				<strong class="text-white">What this does:</strong>
				<ul class="mt-2 ml-6 list-disc space-y-1 text-sm text-gray-300">
					<li>Manages a singleton client instance</li>
					<li>Handles connection initialization</li>
					<li>Provides clean async/await functions</li>
					<li>
						Exports: <code class="rounded bg-gray-800 px-1">listTools()</code>,
						<code class="rounded bg-gray-800 px-1">listPrompts()</code>,
						<code class="rounded bg-gray-800 px-1">callTool()</code>,
						<code class="rounded bg-gray-800 px-1">getPrompt()</code>
					</li>
				</ul>
			</div>
			<pre class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm"><code
					bind:this={sdkWrapperElement}
					class="language-typescript">{sdkWrapperCode}</code
				></pre>
			<div class="mt-4 rounded-lg border border-green-800/50 bg-green-900/20 p-4">
				<p class="text-sm text-green-300">
					<strong>✅ Why this step:</strong> This wrapper encapsulates the SDK, making it easy to use
					throughout your app. You can add caching, error handling, or other features here without changing
					the rest of your code.
				</p>
			</div>
		</section>

		<!-- Step 3: API Endpoint -->
		<section class="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
			<div class="mb-4 flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
					3
				</div>
				<h2 class="text-2xl font-semibold text-white">Create the API Endpoint</h2>
			</div>
			<p class="mb-4 text-gray-300">
				Create a SvelteKit API endpoint that uses the SDK wrapper. This goes in
				<code class="rounded bg-gray-800 px-1">routes/api/chat-stream/+server.ts</code>.
			</p>
			<div class="mb-4">
				<strong class="text-white">What this does:</strong>
				<ul class="mt-2 ml-6 list-disc space-y-1 text-sm text-gray-300">
					<li>Receives POST requests from the frontend</li>
					<li>Gets OpenAI API key from environment variables</li>
					<li>Uses the SDK wrapper to discover available MCP tools</li>
					<li>Uses OpenAI to decide which tools to call based on user query</li>
					<li>Executes MCP calls using the SDK wrapper</li>
					<li>Sends MCP results to OpenAI to generate a natural language response</li>
					<li>Returns the AI-generated response to the frontend</li>
				</ul>
			</div>
			<div class="mb-4 rounded-lg border border-yellow-800/50 bg-yellow-900/20 p-4">
				<p class="text-sm text-yellow-300">
					<strong>⚠️ OpenAI Integration:</strong> This endpoint uses OpenAI's API to:
					<br />• Intelligently select which MCP tools to call based on user queries
					<br />• Generate natural language responses from MCP data
					<br />• Maintain conversation context across multiple messages
				</p>
			</div>
			<pre class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm"><code
					bind:this={apiEndpointElement}
					class="language-typescript">{apiEndpointCode}</code
				></pre>
			<div class="mt-4 rounded-lg border border-green-800/50 bg-green-900/20 p-4">
				<p class="text-sm text-green-300">
					<strong>✅ Why this step:</strong> The API endpoint runs on the server, so it can securely
					use API keys and interact with the MCP server. The frontend just sends user messages and receives
					responses.
				</p>
			</div>
		</section>

		<!-- Step 4: Frontend UI -->
		<section class="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
			<div class="mb-4 flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
					4
				</div>
				<h2 class="text-2xl font-semibold text-white">Create the Frontend UI</h2>
			</div>
			<p class="mb-4 text-gray-300">
				Create the chat interface component. This goes in
				<code class="rounded bg-gray-800 px-1">routes/(app)/chat/ChatInterface.svelte</code>.
			</p>
			<div class="mb-4">
				<strong class="text-white">What this does:</strong>
				<ul class="mt-2 ml-6 list-disc space-y-1 text-sm text-gray-300">
					<li>Displays a chat interface to the user</li>
					<li>Handles user input and sends it to the API endpoint</li>
					<li>Displays responses from the API</li>
					<li>Manages loading states and error handling</li>
				</ul>
			</div>
			<pre class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm"><code
					bind:this={frontendElement}
					class="language-javascript">{frontendCode}</code
				></pre>
			<div class="mt-4 rounded-lg border border-green-800/50 bg-green-900/20 p-4">
				<p class="text-sm text-green-300">
					<strong>✅ Why this step:</strong> The frontend doesn't directly use the MCP SDK. Instead,
					it calls your API endpoint, which handles all the MCP interactions. This keeps your frontend
					simple and secure.
				</p>
			</div>
		</section>

		<!-- How It All Works Together -->
		<section class="rounded-lg border border-purple-800 bg-purple-900/20 p-6">
			<h2 class="mb-4 flex items-center gap-2 text-2xl font-semibold text-white">
				<Layers class="h-6 w-6 text-purple-400" />
				How It All Works Together
			</h2>
			<div class="space-y-4">
				<div class="flex items-start gap-4">
					<div class="flex-shrink-0">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white"
						>
							1
						</div>
					</div>
					<div class="flex-1">
						<strong class="text-white">User types a message</strong>
						<p class="text-sm text-gray-300">
							The user enters a question like "Show me John 3:16" in the chat interface.
						</p>
					</div>
				</div>
				<div class="flex items-center justify-center">
					<ArrowRight class="h-6 w-6 text-purple-400" />
				</div>
				<div class="flex items-start gap-4">
					<div class="flex-shrink-0">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white"
						>
							2
						</div>
					</div>
					<div class="flex-1">
						<strong class="text-white">Frontend sends POST request</strong>
						<p class="text-sm text-gray-300">
							<code class="rounded bg-gray-800 px-1">ChatInterface.svelte</code> sends a POST
							request to <code class="rounded bg-gray-800 px-1">/api/chat-stream</code> with the user's
							message.
						</p>
					</div>
				</div>
				<div class="flex items-center justify-center">
					<ArrowRight class="h-6 w-6 text-purple-400" />
				</div>
				<div class="flex items-start gap-4">
					<div class="flex-shrink-0">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white"
						>
							3
						</div>
					</div>
					<div class="flex-1">
						<strong class="text-white">API endpoint uses SDK wrapper and OpenAI</strong>
						<p class="text-sm text-gray-300">
							<code class="rounded bg-gray-800 px-1">+server.ts</code> uses the SDK wrapper to
							discover available MCP tools, then uses <strong>OpenAI</strong> to intelligently decide
							which tools to call based on the user's query.
						</p>
					</div>
				</div>
				<div class="flex items-center justify-center">
					<ArrowRight class="h-6 w-6 text-purple-400" />
				</div>
				<div class="flex items-start gap-4">
					<div class="flex-shrink-0">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white"
						>
							4
						</div>
					</div>
					<div class="flex-1">
						<strong class="text-white">SDK wrapper calls MCP server</strong>
						<p class="text-sm text-gray-300">
							<code class="rounded bg-gray-800 px-1">client.ts</code> uses the
							<code class="rounded bg-gray-800 px-1">@translation-helps/mcp-client</code> SDK to call
							the MCP server and get the requested data.
						</p>
					</div>
				</div>
				<div class="flex items-center justify-center">
					<ArrowRight class="h-6 w-6 text-purple-400" />
				</div>
				<div class="flex items-start gap-4">
					<div class="flex-shrink-0">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white"
						>
							5
						</div>
					</div>
					<div class="flex-1">
						<strong class="text-white">OpenAI generates response</strong>
						<p class="text-sm text-gray-300">
							The API endpoint sends the MCP data to <strong>OpenAI</strong>, which generates a
							natural language response based on the translation resources.
						</p>
					</div>
				</div>
				<div class="flex items-center justify-center">
					<ArrowRight class="h-6 w-6 text-purple-400" />
				</div>
				<div class="flex items-start gap-4">
					<div class="flex-shrink-0">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white"
						>
							6
						</div>
					</div>
					<div class="flex-1">
						<strong class="text-white">Response flows back to frontend</strong>
						<p class="text-sm text-gray-300">
							API endpoint → Frontend receives AI response → Chat interface displays the answer to
							the user.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Learn More -->
		<section class="rounded-lg border border-blue-800/50 bg-blue-900/20 p-6">
			<h2 class="mb-4 text-2xl font-semibold text-white">Learn More</h2>
			<div class="space-y-3">
				<a
					href="https://github.com/unfoldingWord/translation-helps-mcp-2/tree/main/packages/js-sdk"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 text-blue-400 hover:text-blue-300"
				>
					<GitBranch class="h-5 w-5" />
					<span>SDK Documentation & Source Code</span>
					<ExternalLink class="h-4 w-4" />
				</a>
				<a
					href="https://github.com/unfoldingWord/translation-helps-mcp-2/tree/main/clients/typescript-example"
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-2 text-blue-400 hover:text-blue-300"
				>
					<Code class="h-5 w-5" />
					<span>TypeScript Example Client</span>
					<ExternalLink class="h-4 w-4" />
				</a>
				<a
					href="/getting-started"
					class="flex items-center gap-2 text-blue-400 hover:text-blue-300"
				>
					<BookOpen class="h-5 w-5" />
					<span>Getting Started Guide</span>
				</a>
			</div>
		</section>
	</div>
</div>

<style>
	code {
		font-family: 'Fira Code', 'Consolas', monospace;
	}
</style>
