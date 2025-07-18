<script lang="ts">
	import { 
		BookOpen, 
		FileText, 
		Users, 
		Code, 
		MessageSquare, 
		Zap, 
		Copy, 
		ExternalLink,
		Clock,
		CheckCircle,
		AlertCircle
	} from 'lucide-svelte';

	const endpoints = [
		{
			name: 'Fetch Scripture',
			icon: BookOpen,
			path: '/api/fetch-scripture',
			description: 'Retrieve Bible verses with context and metadata',
			method: 'GET',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference (e.g., "Titus 1:1")' },
				{ name: 'language', type: 'string', required: true, description: 'Language code (e.g., "en", "es")' },
				{ name: 'organization', type: 'string', required: true, description: 'Organization (e.g., "unfoldingWord")' }
			],
			example: {
				url: '/api/fetch-scripture?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					reference: 'Titus 1:1',
					verses: [
						{
							reference: 'Titus 1:1',
							text: 'Paul, a servant of God and an apostle of Jesus Christ for the faith of God\'s chosen ones and the knowledge of the truth that is according to godliness,'
						}
					],
					responseTime: 245
				}
			}
		},
		{
			name: 'Fetch Translation Notes',
			icon: FileText,
			path: '/api/fetch-translation-notes',
			description: 'Get translation notes and insights for Bible passages',
			method: 'GET',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference (e.g., "Titus 1:1")' },
				{ name: 'language', type: 'string', required: true, description: 'Language code (e.g., "en", "es")' },
				{ name: 'organization', type: 'string', required: true, description: 'Organization (e.g., "unfoldingWord")' }
			],
			example: {
				url: '/api/fetch-translation-notes?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					reference: 'Titus 1:1',
					notes: [
						{
							note: 'This verse introduces Paul and his role as an apostle.'
						}
					],
					responseTime: 189
				}
			}
		},
		{
			name: 'Fetch Translation Questions',
			icon: Users,
			path: '/api/fetch-translation-questions',
			description: 'Retrieve translation questions and answers',
			method: 'GET',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference (e.g., "Titus 1:1")' },
				{ name: 'language', type: 'string', required: true, description: 'Language code (e.g., "en", "es")' },
				{ name: 'organization', type: 'string', required: true, description: 'Organization (e.g., "unfoldingWord")' }
			],
			example: {
				url: '/api/fetch-translation-questions?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					reference: 'Titus 1:1',
					questions: [
						{
							question: 'How should "apostle" be translated?',
							answer: 'The term "apostle" refers to someone sent with authority.'
						}
					],
					responseTime: 156
				}
			}
		},
		{
			name: 'Fetch Translation Words',
			icon: Code,
			path: '/api/fetch-translation-words',
			description: 'Get word definitions and semantic information',
			method: 'GET',
			parameters: [
				{ name: 'word', type: 'string', required: true, description: 'Word to look up (e.g., "apostle")' },
				{ name: 'language', type: 'string', required: true, description: 'Language code (e.g., "en", "es")' },
				{ name: 'organization', type: 'string', required: true, description: 'Organization (e.g., "unfoldingWord")' },
				{ name: 'includeTitle', type: 'boolean', required: false, description: 'Include word title (default: true)' },
				{ name: 'includeSubtitle', type: 'boolean', required: false, description: 'Include word subtitle (default: true)' },
				{ name: 'includeContent', type: 'boolean', required: false, description: 'Include word content (default: true)' }
			],
			example: {
				url: '/api/fetch-translation-words?word=apostle&language=en&organization=unfoldingWord&includeTitle=true&includeSubtitle=true&includeContent=true',
				response: {
					words: [
						{
							word: 'apostle',
							title: 'Apostle',
							subtitle: 'One sent with authority',
							content: 'An apostle is someone who is sent with authority to represent the sender.'
						}
					],
					responseTime: 234
				}
			}
		},
		{
			name: 'Fetch Translation Word Links',
			icon: MessageSquare,
			path: '/api/fetch-translation-word-links',
			description: 'Get links to translation word articles',
			method: 'GET',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference (e.g., "Titus 1:1")' },
				{ name: 'language', type: 'string', required: true, description: 'Language code (e.g., "en", "es")' },
				{ name: 'organization', type: 'string', required: true, description: 'Organization (e.g., "unfoldingWord")' }
			],
			example: {
				url: '/api/fetch-translation-word-links?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					reference: 'Titus 1:1',
					links: [
						{
							word: 'apostle',
							uri: 'rc://en/tn/help/tit/01/01'
						}
					],
					responseTime: 167
				}
			}
		},
		{
			name: 'Fetch All Resources',
			icon: Zap,
			path: '/api/fetch-resources',
			description: 'Get all resources for a Bible reference in one call',
			method: 'GET',
			parameters: [
				{ name: 'reference', type: 'string', required: true, description: 'Bible reference (e.g., "Titus 1:1")' },
				{ name: 'language', type: 'string', required: true, description: 'Language code (e.g., "en", "es")' },
				{ name: 'organization', type: 'string', required: true, description: 'Organization (e.g., "unfoldingWord")' },
				{ name: 'includeTitle', type: 'boolean', required: false, description: 'Include word titles (default: true)' },
				{ name: 'includeSubtitle', type: 'boolean', required: false, description: 'Include word subtitles (default: true)' },
				{ name: 'includeContent', type: 'boolean', required: false, description: 'Include word content (default: true)' }
			],
			example: {
				url: '/api/fetch-resources?reference=Titus%201:1&language=en&organization=unfoldingWord&includeTitle=true&includeSubtitle=true&includeContent=true',
				response: {
					reference: 'Titus 1:1',
					scripture: { /* scripture data */ },
					translationNotes: { /* notes data */ },
					translationQuestions: { /* questions data */ },
					translationWords: { /* words data */ },
					translationWordLinks: { /* links data */ },
					responseTime: 456
				}
			}
		}
	];

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}

	function testEndpoint(url: string) {
		window.open(url, '_blank');
	}
</script>

<svelte:head>
	<title>API Reference - Translation Helps MCP Server</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="text-center mb-12">
		<div class="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6">
			<Code class="w-4 h-4 mr-2" />
			API Documentation
		</div>
		<h1 class="text-4xl md:text-5xl font-bold text-white mb-6">
			Translation Helps
			<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">API Reference</span>
		</h1>
		<p class="text-xl text-gray-300 max-w-3xl mx-auto">
			Complete documentation for all Translation Helps MCP Server endpoints. 
			Learn how to integrate Bible translation resources into your applications.
		</p>
	</div>

	<!-- API Overview -->
	<div class="mb-12">
		<div class="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
			<h2 class="text-2xl font-bold text-white mb-6">API Overview</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="flex items-center space-x-3">
					<CheckCircle class="w-6 h-6 text-green-400" />
					<div>
						<h3 class="text-lg font-semibold text-white">RESTful Design</h3>
						<p class="text-gray-400">Standard HTTP methods and status codes</p>
					</div>
				</div>
				<div class="flex items-center space-x-3">
					<Clock class="w-6 h-6 text-blue-400" />
					<div>
						<h3 class="text-lg font-semibold text-white">Response Timing</h3>
						<p class="text-gray-400">All responses include timing information</p>
					</div>
				</div>
				<div class="flex items-center space-x-3">
					<AlertCircle class="w-6 h-6 text-yellow-400" />
					<div>
						<h3 class="text-lg font-semibold text-white">Error Handling</h3>
						<p class="text-gray-400">Comprehensive error responses with details</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Endpoints -->
	<div class="space-y-8">
		{#each endpoints as endpoint}
			<div class="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
				<!-- Endpoint Header -->
				<div class="flex items-start justify-between mb-6">
					<div class="flex items-center space-x-4">
						<div class="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
							<svelte:component this={endpoint.icon} class="w-6 h-6 text-white" />
						</div>
						<div>
							<h3 class="text-2xl font-bold text-white">{endpoint.name}</h3>
							<p class="text-gray-400">{endpoint.description}</p>
						</div>
					</div>
					<div class="flex items-center space-x-2">
						<span class="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
							{endpoint.method}
						</span>
					</div>
				</div>

				<!-- Endpoint Path -->
				<div class="mb-6">
					<div class="flex items-center space-x-3">
						<span class="text-sm font-medium text-gray-400">Endpoint:</span>
						<code class="px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-purple-300 font-mono">
							{endpoint.path}
						</code>
						<button
							on:click={() => copyToClipboard(endpoint.path)}
							class="text-gray-400 hover:text-white transition-colors"
						>
							<Copy class="w-4 h-4" />
						</button>
					</div>
				</div>

				<!-- Parameters -->
				<div class="mb-6">
					<h4 class="text-lg font-semibold text-white mb-4">Parameters</h4>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b border-white/10">
									<th class="text-left py-3 px-4 text-sm font-medium text-gray-400">Parameter</th>
									<th class="text-left py-3 px-4 text-sm font-medium text-gray-400">Type</th>
									<th class="text-left py-3 px-4 text-sm font-medium text-gray-400">Required</th>
									<th class="text-left py-3 px-4 text-sm font-medium text-gray-400">Description</th>
								</tr>
							</thead>
							<tbody>
								{#each endpoint.parameters as param}
									<tr class="border-b border-white/5">
										<td class="py-3 px-4">
											<code class="text-purple-300 font-mono">{param.name}</code>
										</td>
										<td class="py-3 px-4 text-gray-300">{param.type}</td>
										<td class="py-3 px-4">
											{#if param.required}
												<span class="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">Required</span>
											{:else}
												<span class="px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs">Optional</span>
											{/if}
										</td>
										<td class="py-3 px-4 text-gray-300">{param.description}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Example -->
				<div class="mb-6">
					<h4 class="text-lg font-semibold text-white mb-4">Example</h4>
					<div class="space-y-4">
						<div>
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm font-medium text-gray-400">Request URL:</span>
								<div class="flex items-center space-x-2">
									<button
										on:click={() => copyToClipboard(endpoint.example.url)}
										class="text-gray-400 hover:text-white transition-colors"
									>
										<Copy class="w-4 h-4" />
									</button>
									<button
										on:click={() => testEndpoint(endpoint.example.url)}
										class="text-gray-400 hover:text-white transition-colors"
									>
										<ExternalLink class="w-4 h-4" />
									</button>
								</div>
							</div>
							<div class="p-4 rounded-lg bg-black/30 border border-white/10">
								<code class="text-purple-300 font-mono break-all">{endpoint.example.url}</code>
							</div>
						</div>
						<div>
							<span class="text-sm font-medium text-gray-400 mb-2 block">Response:</span>
							<div class="p-4 rounded-lg bg-black/30 border border-white/10">
								<pre class="text-gray-300 text-sm overflow-x-auto">{JSON.stringify(endpoint.example.response, null, 2)}</pre>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Integration Guide -->
	<div class="mt-16">
		<div class="p-8 rounded-2xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-xl border border-purple-500/30">
			<h2 class="text-3xl font-bold text-white mb-6">Integration Guide</h2>
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<div>
					<h3 class="text-xl font-semibold text-white mb-4">MCP Server Integration</h3>
					<p class="text-gray-300 mb-4">
						The Translation Helps MCP Server is designed to work seamlessly with LLMs and AI assistants. 
						Configure your MCP client to connect to the server and start making natural language queries.
					</p>
					<div class="space-y-2">
						<div class="flex items-center space-x-2">
							<CheckCircle class="w-4 h-4 text-green-400" />
							<span class="text-gray-300">Natural language processing</span>
						</div>
						<div class="flex items-center space-x-2">
							<CheckCircle class="w-4 h-4 text-green-400" />
							<span class="text-gray-300">Automatic API routing</span>
						</div>
						<div class="flex items-center space-x-2">
							<CheckCircle class="w-4 h-4 text-green-400" />
							<span class="text-gray-300">Structured responses</span>
						</div>
					</div>
				</div>
				<div>
					<h3 class="text-xl font-semibold text-white mb-4">Direct API Usage</h3>
					<p class="text-gray-300 mb-4">
						For direct integration, use the REST API endpoints with standard HTTP requests. 
						All endpoints return JSON responses with timing information.
					</p>
					<div class="space-y-2">
						<div class="flex items-center space-x-2">
							<CheckCircle class="w-4 h-4 text-green-400" />
							<span class="text-gray-300">RESTful design</span>
						</div>
						<div class="flex items-center space-x-2">
							<CheckCircle class="w-4 h-4 text-green-400" />
							<span class="text-gray-300">JSON responses</span>
						</div>
						<div class="flex items-center space-x-2">
							<CheckCircle class="w-4 h-4 text-green-400" />
							<span class="text-gray-300">CORS enabled</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div> 