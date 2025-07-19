<script>
	// @ts-nocheck
	import {
		Wrench,
		Code,
		Search,
		BookOpen,
		MessageSquare,
		FileText,
		Users,
		Zap,
		Copy,
		ExternalLink,
		CheckCircle,
		AlertCircle,
		Info,
		Terminal,
		Globe,
		Database,
		List,
		Link
	} from 'lucide-svelte';
	import ApiTester from '$lib/components/ApiTester.svelte';
	import ResponseDisplay from '$lib/components/ResponseDisplay.svelte';

	// MCP Tools documentation
	const mcpTools = [
		{
			name: 'Fetch Resources',
			tool: 'translation_helps_fetch_resources',
			description: 'Get comprehensive translation resources for a Bible reference',
			category: 'comprehensive',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					default: 'en',
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (default: "unfoldingWord")'
				},
				{
					name: 'resources',
					type: 'array',
					required: false,
					default: '["scripture", "notes", "questions", "words", "links"]',
					description: 'Resource types to fetch'
				}
			],
			path: '/api/fetch-resources',
			example: {
				reference: 'Titus 1:1',
				language: 'en',
				organization: 'unfoldingWord'
			}
		},
		{
			name: 'List Available Resources',
			tool: 'translation_helps_search_resources',
			description:
				'Get a list of available translation resources filtered by criteria (metadata only)',
			category: 'metadata',
			parameters: [
				{
					name: 'language',
					type: 'string',
					required: false,
					description: 'Filter by language'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					description: 'Filter by organization'
				},
				{
					name: 'query',
					type: 'string',
					required: false,
					description: 'Search query string'
				}
			],
			path: '/api/search-resources',
			example: {
				query: 'faith',
				language: 'en'
			}
		},
		{
			name: 'Get Context',
			tool: 'translation_helps_get_context',
			description: 'Get contextual information and cross-references for Bible passages',
			category: 'context',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					default: 'en',
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (default: "unfoldingWord")'
				}
			],
			path: '/api/get-context',
			example: {
				reference: 'John 3:16',
				language: 'en'
			}
		},
		{
			name: 'Get Languages',
			tool: 'translation_helps_get_languages',
			description: 'Get list of available languages and organizations',
			category: 'metadata',
			parameters: [],
			path: '/api/get-languages',
			example: {}
		},
		{
			name: 'Extract References',
			tool: 'translation_helps_extract_references',
			description: 'Extract and parse Bible references from text',
			category: 'parsing',
			parameters: [
				{
					name: 'text',
					type: 'string',
					required: true,
					description: 'Text containing Bible references'
				}
			],
			path: '/api/extract-references',
			example: {
				text: 'See John 3:16 and Romans 1:1 for more details'
			}
		},
		{
			name: 'Browse Translation Words',
			tool: 'translation_helps_browse_words',
			description: 'Browse available translation word articles by category',
			category: 'translation-words',
			parameters: [
				{
					name: 'language',
					type: 'string',
					required: false,
					default: 'en',
					description: 'Language code (e.g., "en", "es", "fr")'
				},
				{
					name: 'category',
					type: 'string',
					required: false,
					description: 'Filter by category: "kt" (key terms), "other", "names"'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (e.g., "unfoldingWord")'
				}
			],
			path: '/api/browse-translation-words',
			example: {
				language: 'en',
				category: 'kt',
				organization: 'unfoldingWord'
			},
			sampleResponse: {
				words: [
					{
						name: 'grace',
						aliases: ['favor', 'kindness']
					},
					{
						name: 'love',
						aliases: ['beloved', 'loving']
					}
				]
			}
		},
		{
			name: 'Get Translation Word',
			tool: 'translation_helps_get_word',
			description: 'Get detailed information about a specific translation word',
			category: 'translation-words',
			parameters: [
				{
					name: 'term',
					type: 'string',
					required: true,
					description: 'The translation word term to lookup'
				},
				{
					name: 'path',
					type: 'string',
					required: false,
					description: 'Optional path for nested terms'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					default: 'en',
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (default: "unfoldingWord")'
				}
			],
			path: '/api/get-translation-word',
			example: {
				term: 'grace',
				language: 'en',
				organization: 'unfoldingWord'
			},
			sampleResponse: {
				term: 'grace',
				definition: 'Grace is when God gives us good things that we do not deserve.',
				related: ['mercy', 'favor', 'kindness']
			}
		},
		{
			name: 'Get Words for Reference',
			tool: 'translation_helps_words_for_reference',
			description: 'Get translation words that apply to a specific Bible reference',
			category: 'translation-words',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					default: 'en',
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (default: "unfoldingWord")'
				}
			],
			path: '/api/get-words-for-reference',
			example: {
				reference: 'John 3:16',
				language: 'en'
			}
		},
		{
			name: 'Fetch Scripture',
			tool: 'translation_helps_fetch_scripture',
			description: 'Get Bible verses with multiple translations and context',
			category: 'scripture',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					default: 'en',
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (default: "unfoldingWord")'
				},
				{
					name: 'translation',
					type: 'string',
					required: false,
					description: 'Specific translation (e.g., "ULT", "UST") or "all"'
				}
			],
			path: '/api/fetch-scripture',
			example: {
				reference: 'John 3:16',
				language: 'en',
				organization: 'unfoldingWord',
				translation: 'ULT'
			}
		},
		{
			name: 'Fetch Translation Notes',
			tool: 'translation_helps_fetch_translation_notes',
			description: 'Get detailed translation notes with cultural and linguistic context',
			category: 'notes',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					default: 'en',
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (default: "unfoldingWord")'
				},
				{
					name: 'includeIntro',
					type: 'boolean',
					required: false,
					default: false,
					description: 'Include introductory notes for books/chapters'
				}
			],
			path: '/api/fetch-translation-notes',
			example: {
				reference: 'John 3:16',
				language: 'en',
				organization: 'unfoldingWord'
			}
		},
		{
			name: 'Fetch Translation Questions',
			tool: 'translation_helps_fetch_translation_questions',
			description: 'Get comprehension and translation questions for Bible passages',
			category: 'questions',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					default: 'en',
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (default: "unfoldingWord")'
				}
			],
			path: '/api/fetch-translation-questions',
			example: {
				reference: 'John 3:16',
				language: 'en'
			}
		},
		{
			name: 'Fetch Translation Word Links',
			tool: 'translation_helps_fetch_translation_word_links',
			description: 'Get links between translation words and scripture references',
			category: 'links',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					default: 'en',
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (default: "unfoldingWord")'
				}
			],
			path: '/api/fetch-translation-word-links',
			example: {
				reference: 'John 3:16',
				language: 'en'
			}
		}
	];

	let copySuccess = {};
	let testResults = {};
	let testLoading = {};

	function copyToClipboard(text, id) {
		navigator.clipboard.writeText(text);
		copySuccess[id] = true;
		setTimeout(() => {
			copySuccess[id] = false;
		}, 2000);
	}

	function scrollToTool(toolName) {
		const element = document.getElementById(toolName.replace('translation_helps_', ''));
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	async function handleTest(event) {
		const { endpoint, formData } = event.detail;
		const endpointId = endpoint.tool || endpoint.path;

		testLoading[endpointId] = true;
		testResults[endpointId] = null;

		try {
			// Build URL with query parameters using direct Netlify function path
			const functionName = endpoint.path.replace('/api/', '');
			const url = new URL(`/.netlify/functions/${functionName}`, window.location.origin);
			Object.entries(formData).forEach(([key, value]) => {
				if (value) {
					url.searchParams.set(key, value);
				}
			});

			const response = await fetch(url.toString());
			const data = await response.json();

			testResults[endpointId] = data;
		} catch (error) {
			testResults[endpointId] = { error: error.message };
		} finally {
			testLoading[endpointId] = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
	<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
				Translation Helps MCP Tools
			</h1>
			<p class="mx-auto max-w-3xl text-xl text-gray-300">
				Model Context Protocol tools for seamless AI integration. These tools provide structured
				access to biblical translation resources for language models and AI assistants.
			</p>
		</div>

		<!-- Quick Start -->
		<div class="mb-12 rounded-lg border border-white/10 bg-white/5 p-8">
			<h2 class="mb-6 text-2xl font-bold text-white">Quick Start</h2>
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">1. Run MCP Server</h3>
					<div class="rounded-lg bg-black/20 p-4">
						<code class="text-blue-400">npx tsx src/index.ts</code>
					</div>
					<p class="mt-2 text-sm text-gray-400">
						Start the MCP server locally for AI assistant integration
					</p>
				</div>
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">2. Configure AI Assistant</h3>
					<div class="rounded-lg bg-black/20 p-4">
						<code class="text-green-400">stdio://npx tsx src/index.ts</code>
					</div>
					<p class="mt-2 text-sm text-gray-400">
						Use this connection string in your AI assistant's MCP configuration
					</p>
				</div>
			</div>
		</div>

		<!-- MCP vs REST API -->
		<div class="mb-12 rounded-lg border border-white/10 bg-white/5 p-6">
			<h2 class="mb-4 text-xl font-semibold text-white">MCP Tools vs REST API</h2>
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<h3 class="mb-2 text-lg font-medium text-white">MCP Tools</h3>
					<p class="text-gray-400">
						Structured tools designed for AI assistants. Include built-in parameter validation,
						context awareness, and optimized data formats for language models.
					</p>
				</div>
				<div>
					<h3 class="mb-2 text-lg font-medium text-white">REST API</h3>
					<p class="text-gray-400">
						Direct HTTP endpoints for traditional web applications. The interactive examples below
						use the REST API equivalents to demonstrate the data these MCP tools provide.
					</p>
				</div>
			</div>
		</div>

		<!-- Table of Contents -->
		<div class="mb-8 rounded-xl border border-gray-700 bg-gray-800/50 p-6">
			<div class="mb-4 flex items-center gap-3">
				<List class="h-6 w-6 text-purple-400" />
				<h2 class="text-2xl font-bold text-white">Table of Contents</h2>
			</div>
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
				{#each mcpTools as tool}
					<button
						on:click={() => scrollToTool(tool.tool)}
						class="group flex items-center gap-3 rounded-lg bg-gray-700/50 p-3 text-left transition-colors hover:bg-gray-600/50"
					>
						<Link class="h-4 w-4 text-purple-400 group-hover:text-purple-300" />
						<div>
							<div class="font-medium text-white group-hover:text-purple-300">
								{tool.name}
							</div>
							<div class="text-sm text-gray-400">
								{tool.tool}
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- MCP Tools -->
		<div class="space-y-8">
			<h2 class="text-2xl font-bold text-white">Available MCP Tools</h2>

			{#each mcpTools as tool}
				<div
					id={tool.tool.replace('translation_helps_', '')}
					class="rounded-lg border border-white/10 bg-white/5 p-6"
				>
					<!-- Tool Header -->
					<div class="mb-6 flex items-start justify-between">
						<div class="flex items-center space-x-4">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500"
							>
								<Wrench class="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 class="text-xl font-semibold text-white">{tool.name}</h3>
								<p class="text-gray-400">{tool.description}</p>
								<div class="mt-2 flex items-center space-x-3">
									<span
										class="rounded-full bg-indigo-500/20 px-3 py-1 text-sm font-medium text-indigo-300"
									>
										MCP Tool
									</span>
									<code class="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300">
										{tool.tool}
									</code>
								</div>
							</div>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
						<!-- Parameters -->
						<div>
							<h4 class="mb-4 text-lg font-semibold text-white">Parameters</h4>
							<div class="space-y-3">
								{#each tool.parameters as param}
									<div class="rounded-lg border border-white/10 bg-white/5 p-4">
										<div class="mb-2 flex items-center justify-between">
											<code class="text-purple-300">{param.name}</code>
											<div class="flex items-center space-x-2">
												<span class="rounded bg-gray-600 px-2 py-1 text-xs text-gray-300">
													{param.type}
												</span>
												{#if param.required}
													<span class="rounded bg-red-600 px-2 py-1 text-xs text-white">
														Required
													</span>
												{/if}
												{#if param.default}
													<span class="rounded bg-blue-600 px-2 py-1 text-xs text-white">
														Default: {param.default}
													</span>
												{/if}
											</div>
										</div>
										<p class="text-sm text-gray-400">{param.description}</p>
									</div>
								{/each}
							</div>
						</div>

						<!-- Example -->
						<div>
							<h4 class="mb-4 text-lg font-semibold text-white">Example</h4>
							<div class="space-y-4">
								<!-- Request -->
								<div class="rounded-lg border border-white/10 bg-black/20 p-4">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium text-gray-400">Request:</span>
										<button
											on:click={() =>
												copyToClipboard(
													JSON.stringify(tool.example.request, null, 2),
													`${tool.tool}-request`
												)}
											class="flex items-center space-x-1 rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
										>
											{#if copySuccess[`${tool.tool}-request`]}
												<CheckCircle class="h-3 w-3" />
												<span>Copied!</span>
											{:else}
												<Copy class="h-3 w-3" />
												<span>Copy</span>
											{/if}
										</button>
									</div>
									<pre class="overflow-auto text-sm text-gray-300">{JSON.stringify(
											tool.example.request,
											null,
											2
										)}</pre>
								</div>

								<!-- Response -->
								<div class="rounded-lg border border-white/10 bg-black/20 p-4">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium text-gray-400">Response:</span>
										<button
											on:click={() =>
												copyToClipboard(
													JSON.stringify(tool.example.response, null, 2),
													`${tool.tool}-response`
												)}
											class="flex items-center space-x-1 rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
										>
											{#if copySuccess[`${tool.tool}-response`]}
												<CheckCircle class="h-3 w-3" />
												<span>Copied!</span>
											{:else}
												<Copy class="h-3 w-3" />
												<span>Copy</span>
											{/if}
										</button>
									</div>
									<pre class="overflow-auto text-sm text-gray-300">{JSON.stringify(
											tool.example.response,
											null,
											2
										)}</pre>
								</div>
							</div>
						</div>
					</div>

					<!-- Use Case -->
					<div class="mt-6 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
						<h5 class="mb-2 text-sm font-medium text-blue-300">Use Case</h5>
						<p class="text-sm text-blue-200">{tool.useCase}</p>
					</div>

					<!-- Interactive Tester (using REST API equivalent) -->
					{#if tool.path}
						<div class="mt-8">
							<h4 class="mb-4 text-lg font-semibold text-white">
								Try It Out (REST API Equivalent)
							</h4>
							<ApiTester
								endpoint={tool}
								loading={testLoading[tool.tool]}
								result={testResults[tool.tool]}
								on:test={handleTest}
							/>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Additional Info -->
		<div class="mt-12 rounded-lg border border-white/10 bg-white/5 p-6">
			<h2 class="mb-4 text-xl font-semibold text-white">Additional Information</h2>
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<h3 class="mb-2 text-lg font-medium text-white">MCP Protocol</h3>
					<p class="text-gray-400">
						These tools follow the Model Context Protocol specification for seamless integration
						with AI assistants like Claude, ChatGPT, and other language models.
					</p>
				</div>
				<div>
					<h3 class="mb-2 text-lg font-medium text-white">REST API Alternative</h3>
					<p class="text-gray-400">
						For traditional web development, use our
						<a href="/api" class="text-blue-400 hover:text-blue-300">REST API endpoints</a>
						which provide the same data through standard HTTP requests.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
