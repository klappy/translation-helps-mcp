<script lang="ts">
	import { onMount } from 'svelte';
	import { Code, Copy, Check, Terminal, Zap, Package, Globe } from 'lucide-svelte';

	type TabType = 'mcp' | 'rest';
	let activeTab: TabType = 'mcp';

	type MCPClientType = 'claude' | 'cursor' | 'cline' | 'generic';
	let activeMCPClient: MCPClientType = 'claude';

	type RESTExample = 'scripture' | 'questions' | 'words' | 'notes' | 'prompts';
	let activeRESTExample: RESTExample = 'scripture';

	let copiedConfig = false;
	let copiedCurl = false;

	// MCP Configuration examples
	const mcpConfigs = {
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
						args: ['-y', 'translation-helps-mcp']
					}
				}
			}
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
						args: ['-y', 'translation-helps-mcp']
					}
				}
			}
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
						args: ['-y', 'translation-helps-mcp']
					}
				}
			}
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
						args: ['-y', 'translation-helps-mcp']
					}
				}
			}
		}
	};

	// REST API Examples
	const restExamples = {
		scripture: {
			title: 'Fetch Scripture',
			description: 'Get Bible text in multiple translations',
			curl: `curl "https://translation-helps-mcp.pages.dev/api/fetch-scripture?reference=John+3:16&language=en"`,
			typescript: `const response = await fetch(
  'https://translation-helps-mcp.pages.dev/api/fetch-scripture?' +
  new URLSearchParams({
    reference: 'John 3:16',
    language: 'en'
  })
);
const data = await response.json();`,
			python: `import requests

response = requests.get(
    'https://translation-helps-mcp.pages.dev/api/fetch-scripture',
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
			curl: `curl "https://translation-helps-mcp.pages.dev/api/translation-questions?reference=John+3:16&language=en"`,
			typescript: `const response = await fetch(
  'https://translation-helps-mcp.pages.dev/api/translation-questions?' +
  new URLSearchParams({
    reference: 'John 3:16',
    language: 'en'
  })
);
const data = await response.json();`,
			python: `import requests

response = requests.get(
    'https://translation-helps-mcp.pages.dev/api/translation-questions',
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
			curl: `curl "https://translation-helps-mcp.pages.dev/api/fetch-translation-word-links?reference=John+3:16&language=en"`,
			typescript: `const response = await fetch(
  'https://translation-helps-mcp.pages.dev/api/fetch-translation-word-links?' +
  new URLSearchParams({
    reference: 'John 3:16',
    language: 'en'
  })
);
const data = await response.json();`,
			python: `import requests

response = requests.get(
    'https://translation-helps-mcp.pages.dev/api/fetch-translation-word-links',
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
			curl: `curl "https://translation-helps-mcp.pages.dev/api/translation-notes?reference=John+3:16&language=en"`,
			typescript: `const response = await fetch(
  'https://translation-helps-mcp.pages.dev/api/translation-notes?' +
  new URLSearchParams({
    reference: 'John 3:16',
    language: 'en'
  })
);
const data = await response.json();`,
			python: `import requests

response = requests.get(
    'https://translation-helps-mcp.pages.dev/api/translation-notes',
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
			curl: `curl -X POST "https://translation-helps-mcp.pages.dev/api/execute-prompt" \\
  -H "Content-Type: application/json" \\
  -d '{
    "promptName": "translation-helps-for-passage",
    "parameters": {
      "reference": "John 3:16",
      "language": "en"
    }
  }'`,
			typescript: `const response = await fetch(
  'https://translation-helps-mcp.pages.dev/api/execute-prompt',
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
    'https://translation-helps-mcp.pages.dev/api/execute-prompt',
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

	const currentConfig = $derived(mcpConfigs[activeMCPClient]);
	const currentExample = $derived(restExamples[activeRESTExample]);
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
			Access Bible translation resources via <strong class="text-blue-300"
				>MCP Protocol</strong
			>
			or <strong class="text-cyan-300">REST API</strong>. Choose your integration method below.
		</p>
	</section>

	<!-- Tab Navigation -->
	<div class="mb-8 flex justify-center gap-4">
		<button
			on:click={() => (activeTab = 'mcp')}
			class="flex items-center gap-2 rounded-xl border px-6 py-3 font-medium transition-all {activeTab ===
			'mcp'
				? 'border-blue-500 bg-blue-500/20 text-white'
				: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
		>
			<Zap class="h-5 w-5" />
			MCP Protocol
		</button>
		<button
			on:click={() => (activeTab = 'rest')}
			class="flex items-center gap-2 rounded-xl border px-6 py-3 font-medium transition-all {activeTab ===
			'rest'
				? 'border-cyan-500 bg-cyan-500/20 text-white'
				: 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'}"
		>
			<Globe class="h-5 w-5" />
			REST API
		</button>
	</div>

	<!-- MCP Protocol Tab -->
	{#if activeTab === 'mcp'}
		<div class="space-y-8">
			<!-- What is MCP Protocol -->
			<div class="rounded-2xl border border-blue-500/30 bg-white/5 p-8 backdrop-blur-xl">
				<h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
					<Zap class="h-6 w-6 text-blue-400" />
					What is MCP Protocol?
				</h2>
				<p class="mb-4 text-lg text-gray-300">
					The <strong class="text-blue-300">Model Context Protocol (MCP)</strong> is an open standard
					that enables AI assistants to securely connect to external data sources and tools. Our server
					implements MCP to provide:
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
							on:click={() => (activeMCPClient = key)}
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
						<pre
							class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-300"><code>{JSON.stringify(
								currentConfig.config,
								null,
								2
							)}</code></pre>
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
								<span>
									Create or edit <code class="rounded bg-gray-800 px-2 py-0.5 text-cyan-300"
										>{currentConfig.file}</code
									> in the location shown above
								</span>
							</li>
							<li class="flex gap-3">
								<span
									class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300"
									>2</span
								>
								<span>Paste the configuration JSON shown above</span>
							</li>
							<li class="flex gap-3">
								<span
									class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300"
									>3</span
								>
								<span>Restart {currentConfig.name}</span>
							</li>
							<li class="flex gap-3">
								<span
									class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300"
									>4</span
								>
								<span
									>Start using tools like <code class="rounded bg-gray-800 px-2 py-0.5 text-cyan-300"
										>fetch_scripture</code
									> and prompts like
									<code class="rounded bg-gray-800 px-2 py-0.5 text-cyan-300"
										>translation-helps-for-passage</code
									>
								</span>
							</li>
						</ol>
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
									<code class="text-cyan-300">get-translation-academy-for-passage</code> - Academy only
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
		</div>
	{/if}

	<!-- REST API Tab -->
	{#if activeTab === 'rest'}
		<div class="space-y-8">
			<!-- What is REST API -->
			<div class="rounded-2xl border border-cyan-500/30 bg-white/5 p-8 backdrop-blur-xl">
				<h2 class="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
					<Globe class="h-6 w-6 text-cyan-400" />
					REST API Access
				</h2>
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
							on:click={() => (activeRESTExample = key)}
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
						<pre
							class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-300"><code>{currentExample.curl}</code></pre>
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
						<pre
							class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-300"><code>{currentExample.typescript}</code></pre>
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
						<pre
							class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-300"><code>{currentExample.python}</code></pre>
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
							<span class="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">Required</span
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
							<span class="rounded bg-gray-500/20 px-2 py-0.5 text-xs text-gray-300">Optional</span>
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
							<span class="rounded bg-gray-500/20 px-2 py-0.5 text-xs text-gray-300">Optional</span>
						</div>
						<p class="text-sm text-gray-400">
							Response format (default: <code class="text-gray-300">json</code>)
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Next Steps -->
	<div class="mt-12 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 backdrop-blur-xl">
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

