<script lang="ts">
	import { onMount } from 'svelte';
	import { VERSION } from '$lib/version.js';
	import { 
		BookOpen, 
		Code, 
		ExternalLink, 
		Copy, 
		Check, 
		Play,
		Zap,
		Clock,
		BarChart3,
		FileText,
		MessageSquare,
		Users,
		Activity,
		ChevronDown,
		ChevronUp,
		AlertCircle,
		CheckCircle2,
		Star,
		Sparkles
	} from 'lucide-svelte';

	// OpenAPI specification data
	let openApiSpec: any = null;
	let selectedEndpoint: any = null;
	let selectedTag: string = 'core';
	let testResults = new Map();
	let isLoading = false;
	let copiedEndpoint = '';

	// Load OpenAPI spec on mount
	onMount(async () => {
		// Define the spec inline for now (later we can load from YAML)
		openApiSpec = {
			info: {
				title: "Translation Helps MCP API",
				version: "1.0.0",
				description: "High-performance API platform providing instant access to unfoldingWord translation resources"
			},
			tags: [
				{ name: 'core', description: 'Essential scripture and translation endpoints' },
				{ name: 'translation', description: 'Translation notes, questions, and guidance' },
				{ name: 'linguistics', description: 'Word definitions, links, and linguistic analysis' },
				{ name: 'metadata', description: 'Available books, languages, and resource discovery' },
				{ name: 'comprehensive', description: 'Multi-resource aggregated endpoints' },
				{ name: 'health', description: 'System health and monitoring' }
			],
			paths: {
				'/fetch-scripture': {
					get: {
						tags: ['core'],
						summary: 'Fetch Scripture with Alignment',
						description: 'Retrieves Scripture text in ULT/GLT and/or UST/GST translations with embedded word alignment data for precise translation work.',
						parameters: [
							{
								name: 'reference',
								in: 'query',
								required: true,
								description: 'Bible reference (e.g., "John 3:16", "Romans 1:1-5")',
								schema: { type: 'string', example: 'John 3:16' }
							},
							{
								name: 'language',
								in: 'query',
								required: false,
								description: 'Target language code (ISO 639-1)',
								schema: { type: 'string', default: 'en', example: 'en' }
							},
							{
								name: 'organization',
								in: 'query',
								required: false,
								description: 'Content organization/publisher',
								schema: { type: 'string', default: 'unfoldingWord' }
							}
						]
					}
				},
				'/fetch-translation-notes': {
					get: {
						tags: ['translation'],
						summary: 'Fetch Translation Notes',
						description: 'Retrieves detailed translation notes with context, cultural background, and translation guidance for specific Bible passages.',
						parameters: [
							{
								name: 'reference',
								in: 'query',
								required: true,
								description: 'Bible reference for translation notes',
								schema: { type: 'string', example: 'Titus 1:1' }
							},
							{
								name: 'language',
								in: 'query',
								required: false,
								description: 'Target language code',
								schema: { type: 'string', default: 'en' }
							}
						]
					}
				},
				'/fetch-translation-questions': {
					get: {
						tags: ['translation'],
						summary: 'Fetch Translation Questions',
						description: 'Retrieves comprehension questions designed to help translators verify accurate understanding.',
						parameters: [
							{
								name: 'reference',
								in: 'query',
								required: true,
								description: 'Bible reference for questions',
								schema: { type: 'string', example: 'Titus 1:1' }
							}
						]
					}
				},
				'/fetch-translation-words': {
					get: {
						tags: ['linguistics'],
						summary: 'Fetch Translation Words',
						description: 'Retrieves definitions and detailed information for key biblical terms and concepts.',
						parameters: [
							{
								name: 'reference',
								in: 'query',
								required: true,
								description: 'Bible reference to get words for',
								schema: { type: 'string', example: 'Titus 1:1' }
							}
						]
					}
				},
				'/fetch-resources': {
					get: {
						tags: ['comprehensive'],
						summary: 'Fetch All Resources (POWER ENDPOINT)',
						description: '🚀 Retrieves all available translation resources for a Bible reference in a single optimized call. Includes scripture, notes, questions, words, and links.',
						parameters: [
							{
								name: 'reference',
								in: 'query',
								required: true,
								description: 'Bible reference for all resources',
								schema: { type: 'string', example: 'Titus 1:1' }
							}
						]
					}
				},
				'/get-languages': {
					get: {
						tags: ['metadata'],
						summary: 'Get Available Languages',
						description: 'Retrieves the complete list of available languages with coverage information.',
						parameters: []
					}
				},
				'/health': {
					get: {
						tags: ['health'],
						summary: 'Health Check',
						description: 'System health check endpoint with performance metrics and service status.',
						parameters: []
					}
				}
			}
		};

		// Select first endpoint by default
		if (openApiSpec.paths) {
			const firstPath = Object.keys(openApiSpec.paths)[0];
			selectedEndpoint = {
				path: firstPath,
				...openApiSpec.paths[firstPath].get
			};
		}
	});

	// Get endpoints by tag
	function getEndpointsByTag(tag: string) {
		if (!openApiSpec?.paths) return [];
		
		return Object.entries(openApiSpec.paths)
			.map(([path, methods]: [string, any]) => ({
				path,
				...methods.get
			}))
			.filter(endpoint => endpoint.tags?.includes(tag));
	}

	// Select endpoint
	function selectEndpoint(endpoint: any) {
		selectedEndpoint = endpoint;
	}

	// Test endpoint
	async function testEndpoint(endpoint: any, params: Record<string, string> = {}) {
		isLoading = true;
		const startTime = performance.now();
		
		try {
			const url = new URL(endpoint.path, window.location.origin + '/api');
			Object.entries(params).forEach(([key, value]) => {
				if (value) url.searchParams.append(key, value);
			});

			const response = await fetch(url.toString());
			const data = await response.json();
			const responseTime = performance.now() - startTime;

			testResults.set(endpoint.path, {
				status: response.ok ? 'success' : 'error',
				statusCode: response.status,
				data,
				responseTime: Math.round(responseTime),
				timestamp: new Date()
			});

			testResults = testResults; // Trigger reactivity
		} catch (error) {
			testResults.set(endpoint.path, {
				status: 'error',
				error: error.message,
				responseTime: 0,
				timestamp: new Date()
			});
			testResults = testResults; // Trigger reactivity
		} finally {
			isLoading = false;
		}
	}

	// Copy code example
	function copyCodeExample(code: string, endpoint: string) {
		navigator.clipboard.writeText(code);
		copiedEndpoint = endpoint;
		setTimeout(() => copiedEndpoint = '', 2000);
	}

	// Generate code examples
	function generateJavaScriptExample(endpoint: any, params: Record<string, string>) {
		const url = new URL(endpoint.path, 'https://translation-helps-mcp.pages.dev/api');
		Object.entries(params).forEach(([key, value]) => {
			if (value) url.searchParams.append(key, value);
		});

		return `// Fetch ${endpoint.summary}
const response = await fetch('${url.toString()}');
const data = await response.json();
console.log(data);`;
	}

	function generateCurlExample(endpoint: any, params: Record<string, string>) {
		const url = new URL(endpoint.path, 'https://translation-helps-mcp.pages.dev/api');
		Object.entries(params).forEach(([key, value]) => {
			if (value) url.searchParams.append(key, value);
		});

		return `curl "${url.toString()}"`;
	}

	function generatePythonExample(endpoint: any, params: Record<string, string>) {
		const paramsStr = Object.entries(params)
			.filter(([_, value]) => value)
			.map(([key, value]) => `'${key}': '${value}'`)
			.join(', ');

		return `import requests

response = requests.get('https://translation-helps-mcp.pages.dev/api${endpoint.path}', 
    params={${paramsStr}})
data = response.json()
print(data)`;
	}

	// Form data for testing
	let formData = {};

	$: if (selectedEndpoint) {
		// Initialize form data with default values
		const newFormData = {};
		selectedEndpoint.parameters?.forEach((param: any) => {
			newFormData[param.name] = param.schema?.example || param.schema?.default || '';
		});
		formData = newFormData;
	}

	// Get tag icon
	function getTagIcon(tag: string) {
		switch (tag) {
			case 'core': return BookOpen;
			case 'translation': return FileText;
			case 'linguistics': return MessageSquare;
			case 'metadata': return BarChart3;
			case 'comprehensive': return Zap;
			case 'health': return Activity;
			default: return Code;
		}
	}

	// Get tag color
	function getTagColor(tag: string) {
		switch (tag) {
			case 'core': return 'from-blue-500 to-cyan-500';
			case 'translation': return 'from-green-500 to-emerald-500';
			case 'linguistics': return 'from-purple-500 to-pink-500';
			case 'metadata': return 'from-orange-500 to-red-500';
			case 'comprehensive': return 'from-yellow-500 to-orange-500';
			case 'health': return 'from-teal-500 to-cyan-500';
			default: return 'from-gray-500 to-gray-600';
		}
	}
</script>

<svelte:head>
	<title>API Documentation | Translation Helps Platform</title>
	<meta name="description" content="Interactive API documentation for the Translation Helps Platform with live testing capabilities." />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
	<!-- Header -->
	<div class="border-b border-white/10 bg-black/20 backdrop-blur-sm">
		<div class="container mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-white">Interactive API Documentation</h1>
					<p class="mt-2 text-blue-200">Comprehensive documentation with live testing capabilities</p>
				</div>
				<div class="flex items-center space-x-4">
					<div class="rounded-lg bg-white/10 px-3 py-1 text-sm text-white">
						v{VERSION}
					</div>
					<a 
						href="/test" 
						class="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						<Play class="h-4 w-4" />
						<span>Live Demo</span>
					</a>
					<a 
						href="https://github.com/translationhelps/translation-helps-mcp" 
						class="flex items-center space-x-2 rounded-lg border border-white/20 px-4 py-2 text-white hover:bg-white/10"
					>
						<ExternalLink class="h-4 w-4" />
						<span>GitHub</span>
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="container mx-auto px-4 py-8">
		<!-- Features Overview -->
		<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
			<div class="rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-6">
				<div class="mb-2 flex items-center space-x-2">
					<BookOpen class="h-5 w-5 text-blue-400" />
					<h3 class="font-semibold text-white">Scripture Access</h3>
				</div>
				<p class="text-sm text-blue-200">Word-level aligned ULT/UST translations with USFM 3.0 precision</p>
			</div>
			<div class="rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-6">
				<div class="mb-2 flex items-center space-x-2">
					<Zap class="h-5 w-5 text-green-400" />
					<h3 class="font-semibold text-white">High Performance</h3>
				</div>
				<p class="text-sm text-green-200">Sub-second response times with intelligent caching and optimization</p>
			</div>
			<div class="rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6">
				<div class="mb-2 flex items-center space-x-2">
					<Users class="h-5 w-5 text-purple-400" />
					<h3 class="font-semibold text-white">AI-Native</h3>
				</div>
				<p class="text-sm text-purple-200">MCP protocol integration for seamless AI assistant workflows</p>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
			<!-- Sidebar - API Navigation -->
			<div class="lg:col-span-1">
				<div class="sticky top-8 space-y-6">
					<!-- Overview -->
					<div class="rounded-lg border border-white/10 bg-white/5 p-6">
						<h3 class="mb-4 text-lg font-semibold text-white">API Overview</h3>
						<div class="space-y-3 text-sm text-gray-300">
							<div class="flex items-center justify-between">
								<span>Base URL:</span>
								<code class="text-xs text-blue-300">translation-helps-mcp.pages.dev/api</code>
							</div>
							<div class="flex items-center justify-between">
								<span>Protocol:</span>
								<span class="text-green-300">HTTPS</span>
							</div>
							<div class="flex items-center justify-between">
								<span>Rate Limit:</span>
								<span class="text-yellow-300">1000/hour</span>
							</div>
							<div class="flex items-center justify-between">
								<span>Format:</span>
								<span class="text-blue-300">JSON</span>
							</div>
						</div>
					</div>

					<!-- Tag Navigation -->
					<div class="rounded-lg border border-white/10 bg-white/5 p-6">
						<h3 class="mb-4 text-lg font-semibold text-white">Endpoint Categories</h3>
						<div class="space-y-2">
							{#each openApiSpec?.tags || [] as tag}
								{@const TagIcon = getTagIcon(tag.name)}
								{@const endpoints = getEndpointsByTag(tag.name)}
								{#if endpoints.length > 0}
									<div class="space-y-1">
										<button
											on:click={() => selectedTag = tag.name}
											class="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-white/10"
											class:bg-white/10={selectedTag === tag.name}
										>
											<div class="flex items-center space-x-2">
												<TagIcon class="h-4 w-4 text-blue-400" />
												<span class="text-sm font-medium text-white capitalize">{tag.name}</span>
											</div>
											<span class="text-xs text-gray-400">{endpoints.length}</span>
										</button>

										{#if selectedTag === tag.name}
											<div class="ml-6 space-y-1">
												{#each endpoints as endpoint}
													<button
														on:click={() => selectEndpoint(endpoint)}
														class="block w-full truncate rounded p-2 text-left text-xs text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
														class:bg-white/5={selectedEndpoint?.path === endpoint.path}
														class:text-white={selectedEndpoint?.path === endpoint.path}
													>
														{endpoint.path}
													</button>
												{/each}
											</div>
										{/if}
									</div>
								{/if}
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Main Content - Endpoint Details -->
			<div class="lg:col-span-3">
				{#if selectedEndpoint}
					<div class="space-y-8">
						<!-- Endpoint Header -->
						<div class="rounded-lg border border-white/10 bg-white/5 p-6">
							<div class="mb-4 flex items-center justify-between">
								<div class="flex items-center space-x-3">
									<span class="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white">GET</span>
									<code class="text-lg text-blue-300">{selectedEndpoint.path}</code>
								</div>
								{#if selectedEndpoint.tags?.includes('comprehensive')}
									<div class="flex items-center space-x-1 rounded-full bg-yellow-500/20 px-3 py-1">
										<Sparkles class="h-4 w-4 text-yellow-400" />
										<span class="text-xs font-medium text-yellow-300">POWER ENDPOINT</span>
									</div>
								{/if}
							</div>
							<h2 class="mb-2 text-2xl font-bold text-white">{selectedEndpoint.summary}</h2>
							<p class="text-gray-300">{selectedEndpoint.description}</p>
						</div>

						<!-- Parameters -->
						{#if selectedEndpoint.parameters?.length > 0}
							<div class="rounded-lg border border-white/10 bg-white/5 p-6">
								<h3 class="mb-4 text-lg font-semibold text-white">Parameters</h3>
								<div class="space-y-4">
									{#each selectedEndpoint.parameters as param}
										<div class="rounded-lg border border-white/10 bg-white/5 p-4">
											<div class="mb-2 flex items-center space-x-3">
												<code class="text-blue-300">{param.name}</code>
												{#if param.required}
													<span class="rounded bg-red-600 px-2 py-1 text-xs text-white">required</span>
												{:else}
													<span class="rounded bg-gray-600 px-2 py-1 text-xs text-white">optional</span>
												{/if}
												<span class="text-sm text-gray-400">{param.schema?.type}</span>
											</div>
											<p class="mb-2 text-sm text-gray-300">{param.description}</p>
											{#if param.schema?.example}
												<div class="rounded bg-black/30 px-2 py-1">
													<code class="text-xs text-green-300">Example: {param.schema.example}</code>
												</div>
											{/if}
											{#if param.schema?.default}
												<div class="mt-1 rounded bg-black/30 px-2 py-1">
													<code class="text-xs text-yellow-300">Default: {param.schema.default}</code>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Try It Out -->
						<div class="rounded-lg border border-white/10 bg-white/5 p-6">
							<h3 class="mb-4 text-lg font-semibold text-white">🧪 Try It Out</h3>
							
							<!-- Parameter Form -->
							{#if selectedEndpoint.parameters?.length > 0}
								<div class="mb-6 space-y-4">
									{#each selectedEndpoint.parameters as param}
										<div>
											<label class="mb-1 block text-sm font-medium text-white">
												{param.name}
												{#if param.required}
													<span class="text-red-400">*</span>
												{/if}
											</label>
											<input
												type="text"
												bind:value={formData[param.name]}
												placeholder={param.schema?.example || param.description}
												class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
											/>
											{#if param.schema?.default && !formData[param.name]}
												<p class="mt-1 text-xs text-gray-400">
													Will use default: <code class="text-yellow-300">{param.schema.default}</code>
												</p>
											{/if}
										</div>
									{/each}
								</div>
							{/if}

							<!-- Test Button -->
							<button
								on:click={() => testEndpoint(selectedEndpoint, formData)}
								disabled={isLoading}
								class="flex items-center space-x-2 rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if isLoading}
									<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
									<span>Testing...</span>
								{:else}
									<Play class="h-4 w-4" />
									<span>Send Request</span>
								{/if}
							</button>

							<!-- Test Results -->
							{#if testResults.has(selectedEndpoint.path)}
								{@const result = testResults.get(selectedEndpoint.path)}
								<div class="mt-6 rounded-lg border border-white/10 bg-black/20 p-4">
									<div class="mb-3 flex items-center justify-between">
										<div class="flex items-center space-x-2">
											{#if result.status === 'success'}
												<CheckCircle2 class="h-4 w-4 text-green-400" />
												<span class="text-sm font-medium text-green-400">Success</span>
											{:else}
												<AlertCircle class="h-4 w-4 text-red-400" />
												<span class="text-sm font-medium text-red-400">Error</span>
											{/if}
											{#if result.statusCode}
												<span class="rounded bg-gray-700 px-2 py-1 text-xs text-white">HTTP {result.statusCode}</span>
											{/if}
										</div>
										<div class="flex items-center space-x-2 text-sm text-gray-400">
											<Clock class="h-3 w-3" />
											<span>{result.responseTime}ms</span>
										</div>
									</div>
									<div class="rounded-lg bg-black/50 p-3">
										<pre class="overflow-x-auto text-xs text-gray-300"><code>{JSON.stringify(result.data || result.error, null, 2)}</code></pre>
									</div>
								</div>
							{/if}
						</div>

						<!-- Code Examples -->
						<div class="rounded-lg border border-white/10 bg-white/5 p-6">
							<h3 class="mb-4 text-lg font-semibold text-white">💻 Code Examples</h3>
							
							<div class="space-y-4">
								<!-- JavaScript -->
								<div>
									<div class="mb-2 flex items-center justify-between">
										<h4 class="text-sm font-medium text-white">JavaScript</h4>
										<button
											on:click={() => copyCodeExample(generateJavaScriptExample(selectedEndpoint, formData), 'js')}
											class="flex items-center space-x-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
										>
											{#if copiedEndpoint === 'js'}
												<Check class="h-3 w-3 text-green-400" />
												<span class="text-green-400">Copied!</span>
											{:else}
												<Copy class="h-3 w-3" />
												<span>Copy</span>
											{/if}
										</button>
									</div>
									<div class="rounded-lg bg-black/50 p-3">
										<pre class="overflow-x-auto text-xs text-gray-300"><code>{generateJavaScriptExample(selectedEndpoint, formData)}</code></pre>
									</div>
								</div>

								<!-- Python -->
								<div>
									<div class="mb-2 flex items-center justify-between">
										<h4 class="text-sm font-medium text-white">Python</h4>
										<button
											on:click={() => copyCodeExample(generatePythonExample(selectedEndpoint, formData), 'python')}
											class="flex items-center space-x-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
										>
											{#if copiedEndpoint === 'python'}
												<Check class="h-3 w-3 text-green-400" />
												<span class="text-green-400">Copied!</span>
											{:else}
												<Copy class="h-3 w-3" />
												<span>Copy</span>
											{/if}
										</button>
									</div>
									<div class="rounded-lg bg-black/50 p-3">
										<pre class="overflow-x-auto text-xs text-gray-300"><code>{generatePythonExample(selectedEndpoint, formData)}</code></pre>
									</div>
								</div>

								<!-- cURL -->
								<div>
									<div class="mb-2 flex items-center justify-between">
										<h4 class="text-sm font-medium text-white">cURL</h4>
										<button
											on:click={() => copyCodeExample(generateCurlExample(selectedEndpoint, formData), 'curl')}
											class="flex items-center space-x-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
										>
											{#if copiedEndpoint === 'curl'}
												<Check class="h-3 w-3 text-green-400" />
												<span class="text-green-400">Copied!</span>
											{:else}
												<Copy class="h-3 w-3" />
												<span>Copy</span>
											{/if}
										</button>
									</div>
									<div class="rounded-lg bg-black/50 p-3">
										<pre class="overflow-x-auto text-xs text-gray-300"><code>{generateCurlExample(selectedEndpoint, formData)}</code></pre>
									</div>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<!-- Loading State -->
					<div class="flex h-64 items-center justify-center rounded-lg border border-white/10 bg-white/5">
						<div class="text-center">
							<div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
							<p class="text-gray-400">Loading API documentation...</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
