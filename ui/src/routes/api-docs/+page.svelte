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
		AlertCircle,
		CheckCircle2,
		Sparkles
	} from 'lucide-svelte';

		// Complete endpoints data
	const endpoints = [
		{
			path: '/fetch-scripture',
			method: 'GET',
			summary: 'Fetch Scripture with Alignment',
			description: 'Retrieves Scripture text in ULT/GLT and/or UST/GST translations with embedded word alignment data for precise translation work.',
			category: 'core',
			parameters: [
				{ name: 'reference', required: true, type: 'string', example: 'John 3:16', description: 'Bible reference (e.g., "John 3:16", "Romans 1:1-5")' },
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Target language code (ISO 639-1)' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization/publisher' },
				{ name: 'includeVerseNumbers', required: false, type: 'boolean', example: 'true', description: 'Include verse numbers in response' },
				{ name: 'format', required: false, type: 'string', example: 'text', description: 'Response format (text or usfm)' }
			]
		},
		{
			path: '/fetch-translation-notes',
			method: 'GET',
			summary: 'Fetch Translation Notes',
			description: 'Retrieves detailed translation notes that provide context, cultural background, and translation guidance for specific Bible passages.',
			category: 'translation',
			parameters: [
				{ name: 'reference', required: true, type: 'string', example: 'Titus 1:1', description: 'Bible reference for translation notes' },
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Target language code' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization' }
			]
		},
		{
			path: '/fetch-translation-questions',
			method: 'GET',
			summary: 'Fetch Translation Questions',
			description: 'Retrieves comprehension questions designed to help translators and checkers verify accurate understanding and translation of Bible passages.',
			category: 'translation',
			parameters: [
				{ name: 'reference', required: true, type: 'string', example: 'Titus 1:1', description: 'Bible reference for translation questions' },
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Target language code' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization' }
			]
		},
		{
			path: '/fetch-translation-words',
			method: 'GET',
			summary: 'Fetch Translation Words',
			description: 'Retrieves definitions and detailed information for key biblical terms, including theological concepts, cultural references, and translation guidance.',
			category: 'linguistics',
			parameters: [
				{ name: 'reference', required: true, type: 'string', example: 'Titus 1:1', description: 'Bible reference to get translation words for' },
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Target language code' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization' }
			]
		},
		{
			path: '/fetch-translation-word-links',
			method: 'GET',
			summary: 'Fetch Translation Word Links',
			description: 'Retrieves word links that connect specific terms in Bible passages to their corresponding translation word entries.',
			category: 'linguistics',
			parameters: [
				{ name: 'reference', required: true, type: 'string', example: 'Titus 1:1', description: 'Bible reference for word links' },
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Target language code' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization' }
			]
		},
		{
			path: '/get-translation-word',
			method: 'GET',
			summary: 'Get Specific Translation Word',
			description: 'Retrieves detailed information for a specific translation word by its identifier.',
			category: 'linguistics',
			parameters: [
				{ name: 'word', required: true, type: 'string', example: 'grace', description: 'Translation word identifier or term' },
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Target language code' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization' }
			]
		},
		{
			path: '/browse-translation-words',
			method: 'GET',
			summary: 'Browse Translation Words',
			description: 'Browse and search through translation words by category, enabling discovery of related terms and concepts.',
			category: 'linguistics',
			parameters: [
				{ name: 'category', required: false, type: 'string', example: 'kt', description: 'Word category to browse (kt = Key Terms)' },
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Target language code' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization' }
			]
		},
		{
			path: '/get-words-for-reference',
			method: 'GET',
			summary: 'Get Words for Reference',
			description: 'Retrieves all translation words that are relevant for a specific Bible reference, with their associated links and definitions.',
			category: 'linguistics',
			parameters: [
				{ name: 'reference', required: true, type: 'string', example: 'Titus 1:1', description: 'Bible reference to get words for' },
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Target language code' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization' }
			]
		},
		{
			path: '/fetch-resources',
			method: 'GET',
			summary: 'Fetch All Resources (POWER ENDPOINT)',
			description: '🚀 Retrieves all available translation resources for a Bible reference in a single optimized call. Includes scripture, notes, questions, words, and links.',
			category: 'comprehensive',
			parameters: [
				{ name: 'reference', required: true, type: 'string', example: 'Titus 1:1', description: 'Bible reference for all resources' },
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Target language code' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization' }
			]
		},
		{
			path: '/get-context',
			method: 'GET',
			summary: 'Get Context Information',
			description: 'Retrieves contextual information for Bible references, including surrounding passages and cross-references.',
			category: 'comprehensive',
			parameters: [
				{ name: 'reference', required: true, type: 'string', example: 'Titus 1:1', description: 'Bible reference for context' },
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Target language code' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization' }
			]
		},
		{
			path: '/get-languages',
			method: 'GET',
			summary: 'Get Available Languages',
			description: 'Retrieves the complete list of available languages with their coverage information and resource availability.',
			category: 'metadata',
			parameters: [
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization to filter by' }
			]
		},
		{
			path: '/get-available-books',
			method: 'GET',
			summary: 'Get Available Books',
			description: 'Retrieves the list of available Bible books with their coverage information for a specific language.',
			category: 'metadata',
			parameters: [
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Language code to check book availability' },
				{ name: 'organization', required: false, type: 'string', example: 'unfoldingWord', description: 'Content organization' }
			]
		},
		{
			path: '/list-available-resources',
			method: 'GET',
			summary: 'List Available Resources',
			description: 'Retrieves a comprehensive list of all available translation resources and their metadata.',
			category: 'metadata',
			parameters: [
				{ name: 'language', required: false, type: 'string', example: 'en', description: 'Language code to filter resources' },
				{ name: 'query', required: false, type: 'string', example: 'faith', description: 'Search query to filter resources' }
			]
		},
		{
			path: '/extract-references',
			method: 'GET',
			summary: 'Extract Bible References',
			description: 'Extracts and normalizes Bible references from text input, useful for parsing user input and content analysis.',
			category: 'metadata',
			parameters: [
				{ name: 'text', required: true, type: 'string', example: 'See John 3:16 and Romans 1:1 for more details', description: 'Text containing Bible references to extract' }
			]
		},
		{
			path: '/health',
			method: 'GET',
			summary: 'Health Check',
			description: 'System health check endpoint that returns the current status of the API and its dependencies with performance metrics.',
			category: 'health',
			parameters: []
		}
	];

	let selectedEndpoint = endpoints[0];
	let selectedCategory = 'core';
	
	// Category information with descriptions and icons
	const categories = {
		core: { 
			name: 'Core Scripture', 
			description: 'Essential scripture and translation endpoints',
			icon: 'BookOpen',
			color: 'from-blue-500 to-cyan-500'
		},
		translation: { 
			name: 'Translation Resources', 
			description: 'Translation notes, questions, and guidance',
			icon: 'FileText',
			color: 'from-green-500 to-emerald-500'
		},
		linguistics: { 
			name: 'Linguistic Tools', 
			description: 'Word definitions, links, and analysis',
			icon: 'MessageSquare',
			color: 'from-purple-500 to-pink-500'
		},
		metadata: { 
			name: 'Discovery & Metadata', 
			description: 'Available books, languages, and resource discovery',
			icon: 'BarChart3',
			color: 'from-orange-500 to-red-500'
		},
		comprehensive: { 
			name: 'Power Endpoints', 
			description: 'Multi-resource aggregated endpoints',
			icon: 'Zap',
			color: 'from-yellow-500 to-orange-500'
		},
		health: { 
			name: 'System Health', 
			description: 'System status and monitoring',
			icon: 'Activity',
			color: 'from-teal-500 to-cyan-500'
		}
	};
	
	// Filter endpoints by category
	function getEndpointsByCategory(category) {
		return endpoints.filter(endpoint => endpoint.category === category);
	}
	let testResults = new Map();
	let isLoading = false;
	let copiedEndpoint = '';

	// Test endpoint
	async function testEndpoint(endpoint, params = {}) {
		isLoading = true;
		const startTime = performance.now();
		
		try {
			const url = new URL('/api' + endpoint.path, window.location.origin);
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

			testResults = testResults;
		} catch (error) {
			testResults.set(endpoint.path, {
				status: 'error',
				error: error.message,
				responseTime: 0,
				timestamp: new Date()
			});
			testResults = testResults;
		} finally {
			isLoading = false;
		}
	}

	// Copy code example
	function copyCodeExample(code, endpointName) {
		navigator.clipboard.writeText(code);
		copiedEndpoint = endpointName;
		setTimeout(() => copiedEndpoint = '', 2000);
	}

	// Generate examples
	function generateJavaScriptExample(endpoint, params) {
		const url = new URL('/api' + endpoint.path, 'https://translation-helps-mcp.pages.dev');
		Object.entries(params).forEach(([key, value]) => {
			if (value) url.searchParams.append(key, value);
		});

		return `// ${endpoint.summary}
const response = await fetch('${url.toString()}');
const data = await response.json();
console.log(data);`;
	}

	// Form data
	let formData = {};
	$: if (selectedEndpoint) {
		const newFormData = {};
		selectedEndpoint.parameters?.forEach((param) => {
			newFormData[param.name] = param.example || '';
		});
		formData = newFormData;
	}
</script>

<svelte:head>
	<title>API Documentation | Translation Helps Platform</title>
	<meta name="description" content="Interactive API documentation for the Translation Helps Platform" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
	<!-- Header -->
	<div class="border-b border-white/10 bg-black/20 backdrop-blur-sm">
		<div class="container mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-white">Interactive API Documentation</h1>
					<p class="mt-2 text-blue-200">Comprehensive documentation with live testing</p>
				</div>
				<div class="flex items-center space-x-4">
					<div class="rounded-lg bg-white/10 px-3 py-1 text-sm text-white">v{VERSION}</div>
					<a href="/test" class="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
						<Play class="h-4 w-4" />
						<span>Live Demo</span>
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="container mx-auto px-4 py-8">
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
			<!-- Sidebar -->
			<div class="lg:col-span-1">
				<div class="sticky top-8 space-y-6">
					<div class="rounded-lg border border-white/10 bg-white/5 p-6">
						<h3 class="mb-4 text-lg font-semibold text-white">Endpoints</h3>
						<div class="space-y-2">
							{#each endpoints as endpoint}
								<button
									on:click={() => selectedEndpoint = endpoint}
									class="block w-full rounded-lg p-3 text-left transition-colors hover:bg-white/10 {selectedEndpoint.path === endpoint.path ? 'bg-white/10' : ''}"
								>
									<div class="flex items-center space-x-2">
										<span class="rounded bg-green-600 px-2 py-1 text-xs text-white">{endpoint.method}</span>
										<code class="text-sm text-blue-300">{endpoint.path}</code>
									</div>
									<p class="mt-1 text-xs text-gray-400">{endpoint.summary}</p>
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Main Content -->
			<div class="lg:col-span-3">
				{#if selectedEndpoint}
					<div class="space-y-8">
						<!-- Endpoint Header -->
						<div class="rounded-lg border border-white/10 bg-white/5 p-6">
							<div class="mb-4 flex items-center space-x-3">
								<span class="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white">{selectedEndpoint.method}</span>
								<code class="text-lg text-blue-300">{selectedEndpoint.path}</code>
								{#if selectedEndpoint.category === 'comprehensive'}
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
												<span class="text-sm text-gray-400">{param.type}</span>
											</div>
											<p class="text-sm text-gray-300">{param.description}</p>
											{#if param.example}
												<div class="mt-2 rounded bg-black/30 px-2 py-1">
													<code class="text-xs text-green-300">Example: {param.example}</code>
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
							
							{#if selectedEndpoint.parameters?.length > 0}
								<div class="mb-6 space-y-4">
									{#each selectedEndpoint.parameters as param}
										<div>
											<label class="mb-1 block text-sm font-medium text-white">
												{param.name}
												{#if param.required}<span class="text-red-400">*</span>{/if}
											</label>
											<input
												type="text"
												bind:value={formData[param.name]}
												placeholder={param.example || param.description}
												class="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
											/>
										</div>
									{/each}
								</div>
							{/if}

							<button
								on:click={() => testEndpoint(selectedEndpoint, formData)}
								disabled={isLoading}
								class="flex items-center space-x-2 rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700 disabled:opacity-50"
							>
								{#if isLoading}
									<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
									<span>Testing...</span>
								{:else}
									<Play class="h-4 w-4" />
									<span>Send Request</span>
								{/if}
							</button>

							<!-- Results -->
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

						<!-- Code Example -->
						<div class="rounded-lg border border-white/10 bg-white/5 p-6">
							<h3 class="mb-4 text-lg font-semibold text-white">💻 Code Example</h3>
							<div class="mb-2 flex items-center justify-between">
								<h4 class="text-sm font-medium text-white">JavaScript</h4>
								<button
									on:click={() => copyCodeExample(generateJavaScriptExample(selectedEndpoint, formData), 'js')}
									class="flex items-center space-x-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-white"
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
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
