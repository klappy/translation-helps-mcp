<script>
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
		Database
	} from 'lucide-svelte';
	import ApiTester from '$lib/components/ApiTester.svelte';
	import ResponseDisplay from '$lib/components/ResponseDisplay.svelte';

	// MCP Tools documentation
	const mcpTools = [
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
			example: {
				request: {
					language: 'en',
					category: 'kt',
					organization: 'unfoldingWord'
				},
				response: {
					content: [
						{
							path: 'kt/grace.md',
							name: 'grace',
							category: 'kt'
						},
						{
							path: 'kt/love.md',
							name: 'love',
							category: 'kt'
						}
					]
				}
			},
			useCase: 'Discover what translation word articles are available for a language',
			path: '/api/browse-translation-words' // REST API equivalent for testing
		},
		{
			name: 'Get Translation Word',
			tool: 'translation_helps_get_word',
			description: 'Get a specific translation word article by term or path',
			category: 'translation-words',
			parameters: [
				{
					name: 'term',
					type: 'string',
					required: false,
					description: 'Word/term to look up (e.g., "grace", "apostle")'
				},
				{
					name: 'path',
					type: 'string',
					required: false,
					description: 'Direct path to the article (e.g., "kt/grace.md")'
				},
				{
					name: 'language',
					type: 'string',
					required: false,
					default: 'en',
					description: 'Language code (e.g., "en", "es", "fr")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (e.g., "unfoldingWord")'
				}
			],
			example: {
				request: {
					term: 'paul',
					language: 'en'
				},
				response: {
					content: [
						{
							term: 'paul',
							definition: 'Paul, Saul',
							title: 'Paul, Saul',
							subtitle: 'Facts:',
							content:
								'# Paul, Saul\n\n## Facts:\n\nPaul was a leader of the early church who was sent by Jesus to take the good news to many other people groups.\n\n* Paul was a Jew who was born in the Roman city of Tarsus, and was therefore also a Roman citizen.\n* Paul was originally called by his Jewish name, Saul...',
							titleContent: 'Paul, Saul',
							subtitleContent: 'Facts:',
							mainContent:
								'Paul was a leader of the early church who was sent by Jesus to take the good news to many other people groups...'
						}
					]
				}
			},
			useCase: 'Get complete definition and context for biblical terms',
			path: '/api/fetch-translation-words' // REST API equivalent for testing
		},
		{
			name: 'Fetch Scripture',
			tool: 'translation_helps_fetch_scripture',
			description: 'Fetch Bible scripture text for a specific reference',
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
					description: 'Language code (e.g., "en", "es", "fr")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (e.g., "unfoldingWord")'
				},
				{
					name: 'translation',
					type: 'string',
					required: false,
					description:
						'Specific translation (e.g., "ult", "ust", "t4t") or "all" for all translations'
				}
			],
			example: {
				request: {
					reference: 'Titus 1:1',
					language: 'en'
				},
				response: {
					scripture: {
						text: '1 Paul, a servant of God and an apostle of Jesus Christ, for the faith of the chosen people of God and knowledge of the truth that agrees with godliness,',
						translation: 'ULT',
						citation: {
							resource: 'unfoldingWord® Literal Text',
							organization: 'unfoldingWord',
							language: 'en',
							url: 'https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/57-TIT.usfm',
							version: 'master'
						}
					}
				}
			},
			useCase: 'Get Bible text for a specific verse or passage',
			path: '/api/fetch-scripture' // REST API equivalent for testing
		},
		{
			name: 'Fetch Translation Notes',
			tool: 'translation_helps_fetch_translation_notes',
			description: 'Fetch translation notes for a specific Bible reference',
			category: 'notes',
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
					required: false,
					default: 'en',
					description: 'Language code (e.g., "en", "es", "fr")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					default: 'unfoldingWord',
					description: 'Organization (e.g., "unfoldingWord")'
				},
				{
					name: 'includeIntro',
					type: 'boolean',
					required: false,
					default: false,
					description: 'Include introduction notes (default: false)'
				}
			],
			example: {
				request: {
					reference: 'Titus 1:1',
					language: 'en'
				},
				response: {
					translationNotes: [
						{
							reference: 'TIT 1:1',
							quote: 'κατὰ πίστιν ἐκλεκτῶν Θεοῦ καὶ ἐπίγνωσιν ἀληθείας',
							note: "The words **faith**, **knowledge**, and **truth** are abstract nouns. If it would be more clear in your language, you could express those ideas in another way. Alternate translation: [to help God's chosen people to continue to trust him and to know every true thing]"
						},
						{
							reference: 'TIT 1:1',
							quote: 'ἐκλεκτῶν Θεοῦ',
							note: 'If your language does not use this passive form, you could express the idea in active form or in another way that is natural in your language. Alternate translation: [of the people whom God has chosen]'
						}
					]
				}
			},
			useCase: 'Get detailed translation notes for Bible study',
			path: '/api/fetch-translation-notes' // REST API equivalent for testing
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

	async function handleTest(event) {
		const { endpoint, formData } = event.detail;
		const endpointId = endpoint.tool || endpoint.path;

		testLoading[endpointId] = true;
		testResults[endpointId] = null;

		try {
			// Build URL with query parameters using the REST API equivalent
			const url = new URL(endpoint.path, window.location.origin);
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

		<!-- MCP Tools -->
		<div class="space-y-8">
			<h2 class="text-2xl font-bold text-white">Available MCP Tools</h2>

			{#each mcpTools as tool}
				<div class="rounded-lg border border-white/10 bg-white/5 p-6">
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
