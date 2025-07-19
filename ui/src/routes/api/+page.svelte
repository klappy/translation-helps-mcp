<script lang="ts">
	import {
		BookOpen,
		FileText,
		Users,
		Code,
		MessageSquare,
		Zap,
		Copy,
		Check,
		ExternalLink,
		Clock,
		CheckCircle,
		AlertCircle
	} from 'lucide-svelte';

	// This page documents the Translation Helps REST API endpoints
	// All endpoints are fully functional and actively maintained
	// MCP tools are also available as an alternative interface

	const endpoints = [
		{
			name: 'Fetch Scripture',
			icon: BookOpen,
			path: '/api/fetch-scripture',
			description: 'Get Bible verses with context, cross-references, and multiple translations',
			method: 'GET',
			deprecated: false,
			mcpAlternative: 'fetchScripture',
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
					name: 'translation',
					type: 'string',
					required: false,
					description: 'Specific translation (e.g., "ult", "ust") or "all" for multiple'
				}
			],
			example: {
				url: '/api/fetch-scripture?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					scripture: {
						text: "Paul, a servant of God and an apostle of Jesus Christ for the faith of God's chosen ones and the knowledge of the truth that is according to godliness,",
						translation: 'ULT',
						citation: {
							resource: 'unfoldingWord® Literal Text',
							organization: 'unfoldingWord',
							language: 'en',
							url: 'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/57-TIT.usfm',
							version: 'master'
						}
					},
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 245
				}
			}
		},
		{
			name: 'Fetch Translation Notes',
			icon: FileText,
			path: '/api/fetch-translation-notes',
			description: 'Access detailed translation notes, cultural context, and linguistic insights',
			method: 'GET',
			deprecated: false,
			mcpAlternative: 'fetchTranslationNotes',
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
					notes: [
						{
							reference: 'Titus 1:1',
							verse: 1,
							id: 'abc123',
							supportReference: '',
							originalQuote: 'Paul',
							occurrence: 1,
							glQuote: 'Paul',
							occurenceNote: 'This is the same Paul who wrote many letters...'
						}
					],
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 187
				}
			}
		},
		{
			name: 'Fetch Translation Questions',
			icon: Users,
			path: '/api/fetch-translation-questions',
			description: 'Find answers to common translation challenges and theological questions',
			method: 'GET',
			deprecated: false,
			mcpAlternative: 'fetchTranslationQuestions',
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
					questions: [
						{
							reference: 'Titus 1:1',
							verse: 1,
							id: 'def456',
							question: 'How does Paul describe himself in this verse?',
							response:
								'Paul describes himself as both a servant of God and an apostle of Jesus Christ.'
						}
					],
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 156
				}
			}
		},
		{
			name: 'Fetch Translation Words',
			icon: Code,
			path: '/api/fetch-translation-words',
			description: 'Get definitions, usage examples, and semantic domains for key terms',
			method: 'GET',
			deprecated: false,
			mcpAlternative: 'fetchTranslationWords',
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
				url: '/api/fetch-translation-words?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					words: [
						{
							term: 'apostle',
							definition: 'A person sent by God to deliver a message...',
							examples: ['Paul was an apostle', 'The twelve apostles'],
							aliases: ['sent one', 'messenger']
						}
					],
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 203
				}
			}
		},
		{
			name: 'Get Languages',
			icon: MessageSquare,
			path: '/api/get-languages',
			description: 'List all available languages with their metadata',
			method: 'GET',
			deprecated: false,
			mcpAlternative: 'getLanguages',
			parameters: [
				{
					name: 'organization',
					type: 'string',
					required: false,
					description: 'Filter by organization (e.g., "unfoldingWord")'
				}
			],
			example: {
				url: '/api/get-languages?organization=unfoldingWord',
				response: {
					data: [
						{
							code: 'en',
							name: 'English',
							direction: 'ltr',
							resources: 24
						},
						{
							code: 'es',
							name: 'Español',
							direction: 'ltr',
							resources: 12
						}
					],
					count: 87,
					organization: 'unfoldingWord',
					responseTime: 45
				}
			}
		},
		{
			name: 'Fetch Resources',
			icon: Zap,
			path: '/api/fetch-resources',
			description: 'Get comprehensive resource data for a Bible reference',
			method: 'GET',
			deprecated: false,
			mcpAlternative: 'fetchResources',
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
				url: '/api/fetch-resources?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					reference: 'Titus 1:1',
					scripture: { text: '...', translation: 'ULT' },
					notes: [{ reference: 'Titus 1:1', note: '...' }],
					questions: [{ question: '...', response: '...' }],
					words: [{ term: 'apostle', definition: '...' }],
					responseTime: 512
				}
			}
		}
	];

	let copiedExample = '';

	function copyToClipboard(text: string, id: string) {
		navigator.clipboard.writeText(text).then(() => {
			copiedExample = id;
			setTimeout(() => {
				copiedExample = '';
			}, 2000);
		});
	}

	function formatJson(obj: any) {
		return JSON.stringify(obj, null, 2);
	}
</script>

<svelte:head>
	<title>API Documentation - Translation Helps MCP</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
	<div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-16 text-center">
			<h1 class="mb-6 text-5xl font-bold text-white md:text-6xl">
				REST API
				<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
					Documentation
				</span>
			</h1>
			<p class="mx-auto max-w-3xl text-xl text-gray-300">
				Complete reference for the Translation Helps REST API endpoints. All endpoints are fully
				functional and actively maintained. MCP tools are also available as an alternative
				interface.
			</p>
		</div>

		<!-- API Interface Options -->
		<div class="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
			<div class="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 backdrop-blur-xl">
				<div class="mb-4 flex items-center">
					<CheckCircle class="mr-3 h-6 w-6 text-green-400" />
					<h3 class="text-xl font-semibold text-white">REST API Endpoints</h3>
				</div>
				<p class="text-gray-300">
					Direct HTTP endpoints for web applications, mobile apps, and any system that can make HTTP
					requests. Perfect for traditional web development and API integrations.
				</p>
			</div>
			<div class="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6 backdrop-blur-xl">
				<div class="mb-4 flex items-center">
					<MessageSquare class="mr-3 h-6 w-6 text-blue-400" />
					<h3 class="text-xl font-semibold text-white">MCP Tools</h3>
				</div>
				<p class="text-gray-300">
					Model Context Protocol tools for LLM integration. These are lightweight wrappers around
					the REST API designed for AI applications. <a
						href="/mcp-tools"
						class="text-blue-400 hover:text-blue-300">View MCP documentation →</a
					>
				</p>
			</div>
		</div>

		<!-- Endpoints -->
		<div class="space-y-8">
			{#each endpoints as endpoint}
				<div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
					<div class="border-b border-white/10 p-6">
						<div class="flex items-center justify-between">
							<div class="flex items-center">
								<div
									class="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500"
								>
									<svelte:component this={endpoint.icon} class="h-6 w-6 text-white" />
								</div>
								<div>
									<h3 class="text-2xl font-semibold text-white">{endpoint.name}</h3>
									<p class="text-gray-300">{endpoint.description}</p>
								</div>
							</div>
							<div class="flex items-center space-x-3">
								<span
									class="rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-300"
								>
									{endpoint.method}
								</span>
								{#if endpoint.mcpAlternative}
									<span
										class="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-300"
									>
										MCP Available
									</span>
								{/if}
							</div>
						</div>
					</div>

					<div class="p-6">
						<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
							<!-- Parameters -->
							<div>
								<h4 class="mb-4 text-lg font-semibold text-white">Parameters</h4>
								<div class="space-y-3">
									{#each endpoint.parameters as param}
										<div class="rounded-lg border border-white/10 bg-white/5 p-4">
											<div class="mb-2 flex items-center justify-between">
												<code class="text-purple-300">{param.name}</code>
												<div class="flex items-center space-x-2">
													<span class="rounded bg-gray-600 px-2 py-1 text-xs text-gray-300">
														{param.type}
													</span>
													{#if param.required}
														<span class="rounded bg-red-600 px-2 py-1 text-xs text-white"
															>required</span
														>
													{:else}
														<span class="rounded bg-green-600 px-2 py-1 text-xs text-white"
															>optional</span
														>
													{/if}
												</div>
											</div>
											<p class="text-sm text-gray-300">{param.description}</p>
										</div>
									{/each}
								</div>
							</div>

							<!-- Example -->
							<div>
								<h4 class="mb-4 text-lg font-semibold text-white">Example</h4>
								<div class="space-y-4">
									<!-- Request -->
									<div>
										<div class="mb-2 flex items-center justify-between">
											<h5 class="text-sm font-medium text-gray-300">Request</h5>
											<button
												type="button"
												on:click={() =>
													copyToClipboard(endpoint.example.url, `${endpoint.path}-request`)}
												class="flex items-center rounded bg-white/10 px-2 py-1 text-xs text-gray-300 hover:bg-white/20"
											>
												{#if copiedExample === `${endpoint.path}-request`}
													<Check class="mr-1 h-3 w-3" />
													Copied
												{:else}
													<Copy class="mr-1 h-3 w-3" />
													Copy
												{/if}
											</button>
										</div>
										<div class="rounded-lg border border-white/10 bg-black/30 p-4">
											<code class="text-sm break-all text-green-300">
												GET {endpoint.example.url}
											</code>
										</div>
									</div>

									<!-- Response -->
									<div>
										<div class="mb-2 flex items-center justify-between">
											<h5 class="text-sm font-medium text-gray-300">Response</h5>
											<button
												type="button"
												on:click={() =>
													copyToClipboard(
														formatJson(endpoint.example.response),
														`${endpoint.path}-response`
													)}
												class="flex items-center rounded bg-white/10 px-2 py-1 text-xs text-gray-300 hover:bg-white/20"
											>
												{#if copiedExample === `${endpoint.path}-response`}
													<Check class="mr-1 h-3 w-3" />
													Copied
												{:else}
													<Copy class="mr-1 h-3 w-3" />
													Copy
												{/if}
											</button>
										</div>
										<div class="rounded-lg border border-white/10 bg-black/30 p-4">
											<pre class="overflow-x-auto text-sm text-blue-300">{formatJson(
													endpoint.example.response
												)}</pre>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Base URL -->
		<div class="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
			<h3 class="mb-4 text-xl font-semibold text-white">Base URL</h3>
			<div class="rounded-lg border border-white/10 bg-black/30 p-4">
				<code class="text-green-300">
					Production: https://translation-helps-mcp.netlify.app<br />
					Development: http://localhost:8888
				</code>
			</div>
		</div>

		<!-- Additional Resources -->
		<div class="mt-12 text-center">
			<h3 class="mb-6 text-2xl font-semibold text-white">Additional Resources</h3>
			<div class="flex flex-wrap justify-center gap-4">
				<a
					href="/test"
					class="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:bg-white/20"
				>
					<ExternalLink class="mr-2 h-5 w-5" />
					Interactive API Tester
				</a>
				<a
					href="/mcp-tools"
					class="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:bg-white/20"
				>
					<MessageSquare class="mr-2 h-5 w-5" />
					MCP Tools Documentation
				</a>
				<a
					href="/chat"
					class="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:bg-white/20"
				>
					<MessageSquare class="mr-2 h-5 w-5" />
					Try AI Chat
				</a>
			</div>
		</div>
	</div>
</div>
