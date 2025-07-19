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

	// DEPRECATED: This page shows the old REST API endpoints
	// All functionality has been moved to MCP tools
	// Please use the MCP Tools page instead: /mcp-tools

	const endpoints = [
		{
			name: 'Fetch Scripture (DEPRECATED)',
			icon: BookOpen,
			path: '/api/fetch-scripture',
			description: 'DEPRECATED: Use MCP tool "translation_helps_fetch_scripture" instead',
			method: 'GET',
			deprecated: true,
			mcpAlternative: 'translation_helps_fetch_scripture',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "Titus 1:1")'
				},
				{
					name: 'language',
					type: 'string',
					required: true,
					description: 'Language code (e.g., "en", "es")'
				},
				{
					name: 'organization',
					type: 'string',
					required: true,
					description: 'Organization (e.g., "unfoldingWord")'
				}
			],
			example: {
				url: '/api/fetch-scripture?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					reference: 'Titus 1:1',
					verses: [
						{
							reference: 'Titus 1:1',
							text: "Paul, a servant of God and an apostle of Jesus Christ for the faith of God's chosen ones and the knowledge of the truth that is according to godliness,"
						}
					],
					responseTime: 245
				}
			}
		},
		{
			name: 'Fetch Translation Notes (DEPRECATED)',
			icon: FileText,
			path: '/api/fetch-translation-notes',
			description: 'DEPRECATED: Use MCP tool "translation_helps_fetch_translation_notes" instead',
			method: 'GET',
			deprecated: true,
			mcpAlternative: 'translation_helps_fetch_translation_notes',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "Titus 1:1")'
				},
				{
					name: 'language',
					type: 'string',
					required: true,
					description: 'Language code (e.g., "en", "es")'
				},
				{
					name: 'organization',
					type: 'string',
					required: true,
					description: 'Organization (e.g., "unfoldingWord")'
				}
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
			name: 'Fetch Translation Questions (DEPRECATED)',
			icon: Users,
			path: '/api/fetch-translation-questions',
			description:
				'DEPRECATED: Use MCP tool "translation_helps_fetch_translation_questions" instead',
			method: 'GET',
			deprecated: true,
			mcpAlternative: 'translation_helps_fetch_translation_questions',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "Titus 1:1")'
				},
				{
					name: 'language',
					type: 'string',
					required: true,
					description: 'Language code (e.g., "en", "es")'
				},
				{
					name: 'organization',
					type: 'string',
					required: true,
					description: 'Organization (e.g., "unfoldingWord")'
				}
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
			name: 'Fetch Translation Words (DEPRECATED)',
			icon: Code,
			path: '/api/fetch-translation-words',
			description: 'DEPRECATED: Use MCP tool "translation_helps_get_word" instead',
			method: 'GET',
			deprecated: true,
			mcpAlternative: 'translation_helps_get_word',
			parameters: [
				{
					name: 'word',
					type: 'string',
					required: false,
					description: 'Word to look up (e.g., "grace", "apostle") - use either word OR reference'
				},
				{
					name: 'reference',
					type: 'string',
					required: false,
					description: 'Bible reference (e.g., "John 3:16") - use either word OR reference'
				},
				{
					name: 'language',
					type: 'string',
					required: true,
					description: 'Language code (e.g., "en", "es")'
				},
				{
					name: 'organization',
					type: 'string',
					required: true,
					description: 'Organization (e.g., "unfoldingWord")'
				},
				{
					name: 'includeTitle',
					type: 'boolean',
					required: false,
					description: 'Include word title (default: true)'
				},
				{
					name: 'includeSubtitle',
					type: 'boolean',
					required: false,
					description: 'Include word subtitle (default: true)'
				},
				{
					name: 'includeContent',
					type: 'boolean',
					required: false,
					description: 'Include word content (default: true)'
				}
			],
			example: {
				url: '/api/fetch-translation-words?word=grace&language=en&organization=unfoldingWord&includeTitle=true&includeSubtitle=true&includeContent=true',
				response: {
					translationWords: [
						{
							term: 'grace',
							title: 'grace, gracious',
							definition: 'Favor or kindness shown to someone who does not deserve it...',
							content: 'The meaning of the Greek word translated as "grace"...'
						}
					],
					responseTime: 234
				}
			}
		},
		{
			name: 'Fetch Translation Word Links (DEPRECATED)',
			icon: MessageSquare,
			path: '/api/fetch-translation-word-links',
			description:
				'DEPRECATED: Use MCP tool "translation_helps_fetch_translation_word_links" instead',
			method: 'GET',
			deprecated: true,
			mcpAlternative: 'translation_helps_fetch_translation_word_links',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "Titus 1:1")'
				},
				{
					name: 'language',
					type: 'string',
					required: true,
					description: 'Language code (e.g., "en", "es")'
				},
				{
					name: 'organization',
					type: 'string',
					required: true,
					description: 'Organization (e.g., "unfoldingWord")'
				}
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
			name: 'Fetch All Resources (DEPRECATED)',
			icon: Zap,
			path: '/api/fetch-resources',
			description: 'DEPRECATED: Use MCP tool "translation_helps_fetch_resources" instead',
			method: 'GET',
			deprecated: true,
			mcpAlternative: 'translation_helps_fetch_resources',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "Titus 1:1")'
				},
				{
					name: 'language',
					type: 'string',
					required: true,
					description: 'Language code (e.g., "en", "es")'
				},
				{
					name: 'organization',
					type: 'string',
					required: true,
					description: 'Organization (e.g., "unfoldingWord")'
				},
				{
					name: 'includeTitle',
					type: 'boolean',
					required: false,
					description: 'Include word titles (default: true)'
				},
				{
					name: 'includeSubtitle',
					type: 'boolean',
					required: false,
					description: 'Include word subtitles (default: true)'
				},
				{
					name: 'includeContent',
					type: 'boolean',
					required: false,
					description: 'Include word content (default: true)'
				}
			],
			example: {
				url: '/api/fetch-resources?reference=Titus%201:1&language=en&organization=unfoldingWord&includeTitle=true&includeSubtitle=true&includeContent=true',
				response: {
					reference: 'Titus 1:1',
					scripture: {
						/* scripture data */
					},
					translationNotes: {
						/* notes data */
					},
					translationQuestions: {
						/* questions data */
					},
					translationWords: {
						/* words data */
					},
					translationWordLinks: {
						/* links data */
					},
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

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Header -->
	<div class="mb-12 text-center">
		<div
			class="mb-6 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300"
		>
			<Code class="mr-2 h-4 w-4" />
			API Documentation
		</div>
		<h1 class="mb-6 text-4xl font-bold text-white md:text-5xl">
			Translation Helps
			<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
				>API Reference (Deprecated)</span
			>
		</h1>
		<p class="mx-auto max-w-3xl text-xl text-gray-300">
			<strong>DEPRECATED:</strong> These REST API endpoints are no longer recommended for use. Please
			use the MCP tools instead for better performance and functionality.
		</p>
	</div>

	<!-- DEPRECATION NOTICE -->
	<div class="mb-12 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-8 backdrop-blur-xl">
		<div class="mb-4 flex items-center">
			<AlertCircle class="mr-3 h-6 w-6 text-yellow-400" />
			<h2 class="text-xl font-semibold text-yellow-200">⚠️ API Endpoints Deprecated</h2>
		</div>
		<p class="mb-4 text-yellow-100">
			<strong>All REST API endpoints have been deprecated and replaced with MCP tools.</strong>
		</p>
		<p class="mb-4 text-yellow-100">
			The Translation Helps system now uses the MCP (Model Context Protocol) architecture for better
			performance, consistency, and enhanced functionality.
		</p>
		<div class="flex items-center space-x-4">
			<a
				href="/mcp-tools"
				class="flex items-center rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
			>
				<ExternalLink class="mr-2 h-4 w-4" />
				View MCP Tools
			</a>
			<span class="text-sm text-yellow-200"> All functionality is now available as MCP tools </span>
		</div>
	</div>

	<!-- API Overview -->
	<div class="mb-12">
		<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
			<h2 class="mb-6 text-2xl font-bold text-white">API Overview</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div class="flex items-center space-x-3">
					<CheckCircle class="h-6 w-6 text-green-400" />
					<div>
						<h3 class="text-lg font-semibold text-white">RESTful Design</h3>
						<p class="text-gray-400">Standard HTTP methods and status codes</p>
					</div>
				</div>
				<div class="flex items-center space-x-3">
					<Clock class="h-6 w-6 text-blue-400" />
					<div>
						<h3 class="text-lg font-semibold text-white">Response Timing</h3>
						<p class="text-gray-400">All responses include timing information</p>
					</div>
				</div>
				<div class="flex items-center space-x-3">
					<AlertCircle class="h-6 w-6 text-yellow-400" />
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
			<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
				<!-- Endpoint Header -->
				<div class="mb-6 flex items-start justify-between">
					<div class="flex items-center space-x-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500"
						>
							<svelte:component this={endpoint.icon} class="h-6 w-6 text-white" />
						</div>
						<div>
							<h3 class="text-2xl font-bold text-white">{endpoint.name}</h3>
							<p class="text-gray-400">{endpoint.description}</p>
						</div>
					</div>
					<div class="flex items-center space-x-2">
						<span class="rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-400">
							{endpoint.method}
						</span>
					</div>
				</div>

				<!-- Endpoint Path -->
				<div class="mb-6">
					<div class="flex items-center space-x-3">
						<span class="text-sm font-medium text-gray-400">Endpoint:</span>
						<code
							class="rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-purple-300"
						>
							{endpoint.path}
						</code>
						<button
							on:click={() => copyToClipboard(endpoint.path)}
							class="text-gray-400 transition-colors hover:text-white"
						>
							<Copy class="h-4 w-4" />
						</button>
					</div>
				</div>

				<!-- Parameters -->
				<div class="mb-6">
					<h4 class="mb-4 text-lg font-semibold text-white">Parameters</h4>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b border-white/10">
									<th class="px-4 py-3 text-left text-sm font-medium text-gray-400">Parameter</th>
									<th class="px-4 py-3 text-left text-sm font-medium text-gray-400">Type</th>
									<th class="px-4 py-3 text-left text-sm font-medium text-gray-400">Required</th>
									<th class="px-4 py-3 text-left text-sm font-medium text-gray-400">Description</th>
								</tr>
							</thead>
							<tbody>
								{#each endpoint.parameters as param}
									<tr class="border-b border-white/5">
										<td class="px-4 py-3">
											<code class="font-mono text-purple-300">{param.name}</code>
										</td>
										<td class="px-4 py-3 text-gray-300">{param.type}</td>
										<td class="px-4 py-3">
											{#if param.required}
												<span class="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400"
													>Required</span
												>
											{:else}
												<span class="rounded-full bg-gray-500/20 px-2 py-1 text-xs text-gray-400"
													>Optional</span
												>
											{/if}
										</td>
										<td class="px-4 py-3 text-gray-300">{param.description}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Example -->
				<div class="mb-6">
					<h4 class="mb-4 text-lg font-semibold text-white">Example</h4>
					<div class="space-y-4">
						<div>
							<div class="mb-2 flex items-center justify-between">
								<span class="text-sm font-medium text-gray-400">Request URL:</span>
								<div class="flex items-center space-x-2">
									<button
										on:click={() => copyToClipboard(endpoint.example.url)}
										class="text-gray-400 transition-colors hover:text-white"
									>
										<Copy class="h-4 w-4" />
									</button>
									<button
										on:click={() => testEndpoint(endpoint.example.url)}
										class="text-gray-400 transition-colors hover:text-white"
									>
										<ExternalLink class="h-4 w-4" />
									</button>
								</div>
							</div>
							<div class="rounded-lg border border-white/10 bg-black/30 p-4">
								<code class="font-mono break-all text-purple-300">{endpoint.example.url}</code>
							</div>
						</div>
						<div>
							<span class="mb-2 block text-sm font-medium text-gray-400">Response:</span>
							<div class="rounded-lg border border-white/10 bg-black/30 p-4">
								<pre class="overflow-x-auto text-sm text-gray-300">{JSON.stringify(
										endpoint.example.response,
										null,
										2
									)}</pre>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Integration Guide -->
	<div class="mt-16">
		<div
			class="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-8 backdrop-blur-xl"
		>
			<h2 class="mb-6 text-3xl font-bold text-white">Integration Guide</h2>
			<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<div>
					<h3 class="mb-4 text-xl font-semibold text-white">MCP Server Integration</h3>
					<p class="mb-4 text-gray-300">
						The Translation Helps MCP Server is designed to work seamlessly with LLMs and AI
						assistants. Configure your MCP client to connect to the server and start making natural
						language queries.
					</p>
					<div class="space-y-2">
						<div class="flex items-center space-x-2">
							<CheckCircle class="h-4 w-4 text-green-400" />
							<span class="text-gray-300">Natural language processing</span>
						</div>
						<div class="flex items-center space-x-2">
							<CheckCircle class="h-4 w-4 text-green-400" />
							<span class="text-gray-300">Automatic API routing</span>
						</div>
						<div class="flex items-center space-x-2">
							<CheckCircle class="h-4 w-4 text-green-400" />
							<span class="text-gray-300">Structured responses</span>
						</div>
					</div>
				</div>
				<div>
					<h3 class="mb-4 text-xl font-semibold text-white">Direct API Usage</h3>
					<p class="mb-4 text-gray-300">
						For direct integration, use the REST API endpoints with standard HTTP requests. All
						endpoints return JSON responses with timing information.
					</p>
					<div class="space-y-2">
						<div class="flex items-center space-x-2">
							<CheckCircle class="h-4 w-4 text-green-400" />
							<span class="text-gray-300">RESTful design</span>
						</div>
						<div class="flex items-center space-x-2">
							<CheckCircle class="h-4 w-4 text-green-400" />
							<span class="text-gray-300">JSON responses</span>
						</div>
						<div class="flex items-center space-x-2">
							<CheckCircle class="h-4 w-4 text-green-400" />
							<span class="text-gray-300">CORS enabled</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
