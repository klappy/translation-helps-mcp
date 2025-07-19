<script>
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
	import ApiTester from '$lib/components/ApiTester.svelte';
	import ResponseDisplay from '$lib/components/ResponseDisplay.svelte';

	// This page documents the Translation Helps REST API endpoints
	// All endpoints are fully functional and actively maintained
	// MCP tools are also available as an alternative interface

	const endpoints = [
		{
			name: 'Fetch Scripture',
			path: '/api/fetch-scripture',
			description: 'Get Bible verses with context, cross-references, and multiple translations',
			method: 'GET',
			deprecated: false,
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
					description: 'Specific translation or "all"'
				}
			],
			example: {
				url: '/api/fetch-scripture?reference=Titus%201:1&language=en&organization=unfoldingWord',
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
					},
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 245
				},
				request: {
					reference: 'Titus 1:1',
					language: 'en',
					organization: 'unfoldingWord'
				}
			}
		},
		{
			name: 'Fetch Translation Notes',
			path: '/api/fetch-translation-notes',
			description:
				'Get detailed translation notes with Greek analysis and alternative translations',
			method: 'GET',
			deprecated: false,
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
					],
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 187
				},
				request: {
					reference: 'Titus 1:1',
					language: 'en',
					organization: 'unfoldingWord'
				}
			}
		},
		{
			name: 'Fetch Translation Words',
			path: '/api/fetch-translation-words',
			description: 'Get comprehensive biblical word definitions with theological context',
			method: 'GET',
			deprecated: false,
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
					translationWords: [
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
					],
					citation: {
						resource: 'Translation Words',
						organization: 'unfoldingWord',
						language: 'en',
						url: 'https://git.door43.org/unfoldingWord/en_tw',
						version: 'master'
					},
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 3119
				},
				request: {
					reference: 'Titus 1:1',
					language: 'en',
					organization: 'unfoldingWord'
				}
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

	async function handleTest(event) {
		const { endpoint, formData } = event.detail;
		const endpointId = endpoint.path;

		testLoading[endpointId] = true;
		testResults[endpointId] = null;

		try {
			// Build URL with query parameters
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

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
	<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-12 text-center">
			<h1 class="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
				Translation Helps REST API
			</h1>
			<p class="mx-auto max-w-3xl text-xl text-gray-300">
				Access comprehensive biblical translation resources through our high-performance REST API.
				All endpoints are fully functional and actively maintained.
			</p>
		</div>

		<!-- Quick Start -->
		<div class="mb-12 rounded-lg border border-white/10 bg-white/5 p-8">
			<h2 class="mb-6 text-2xl font-bold text-white">Quick Start</h2>
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">1. Try the REST API</h3>
					<div class="rounded-lg bg-black/20 p-4">
						<code class="text-green-400">
							curl
							"https://translation-helps-mcp.netlify.app/api/fetch-scripture?reference=Titus%201:1&language=en&organization=unfoldingWord"
						</code>
					</div>
				</div>
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">2. Use MCP Tools</h3>
					<div class="rounded-lg bg-black/20 p-4">
						<code class="text-blue-400">npx tsx src/index.ts</code>
					</div>
					<p class="mt-2 text-sm text-gray-400">
						Run the MCP server locally for AI assistant integration
					</p>
				</div>
			</div>
		</div>

		<!-- API Endpoints -->
		<div class="space-y-8">
			<h2 class="text-2xl font-bold text-white">API Endpoints</h2>

			{#each endpoints as endpoint}
				<div class="rounded-lg border border-white/10 bg-white/5 p-6">
					<!-- Endpoint Header -->
					<div class="mb-6 flex items-start justify-between">
						<div class="flex items-center space-x-4">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500"
							>
								<Code class="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 class="text-xl font-semibold text-white">{endpoint.name}</h3>
								<p class="text-gray-400">{endpoint.description}</p>
								<div class="mt-2 flex items-center space-x-3">
									<span
										class="rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-300"
									>
										{endpoint.method}
									</span>
									<span
										class="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-300"
									>
										REST API
									</span>
								</div>
							</div>
						</div>
					</div>

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
													<span class="rounded bg-red-600 px-2 py-1 text-xs text-white">
														Required
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
								<!-- URL -->
								<div class="rounded-lg border border-white/10 bg-black/20 p-4">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium text-gray-400">Request URL:</span>
										<button
											on:click={() => copyToClipboard(endpoint.example.url, `${endpoint.path}-url`)}
											class="flex items-center space-x-1 rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
										>
											{#if copySuccess[`${endpoint.path}-url`]}
												<Check class="h-3 w-3" />
												<span>Copied!</span>
											{:else}
												<Copy class="h-3 w-3" />
												<span>Copy</span>
											{/if}
										</button>
									</div>
									<code class="text-sm text-green-400">{endpoint.example.url}</code>
								</div>

								<!-- Response -->
								<div class="rounded-lg border border-white/10 bg-black/20 p-4">
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium text-gray-400">Response:</span>
										<button
											on:click={() =>
												copyToClipboard(
													JSON.stringify(endpoint.example.response, null, 2),
													`${endpoint.path}-response`
												)}
											class="flex items-center space-x-1 rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
										>
											{#if copySuccess[`${endpoint.path}-response`]}
												<Check class="h-3 w-3" />
												<span>Copied!</span>
											{:else}
												<Copy class="h-3 w-3" />
												<span>Copy</span>
											{/if}
										</button>
									</div>
									<pre class="overflow-auto text-sm text-gray-300">{JSON.stringify(
											endpoint.example.response,
											null,
											2
										)}</pre>
								</div>
							</div>
						</div>
					</div>

					<!-- Interactive Tester -->
					<div class="mt-8">
						<h4 class="mb-4 text-lg font-semibold text-white">Try It Out</h4>
						<ApiTester
							{endpoint}
							loading={testLoading[endpoint.path]}
							result={testResults[endpoint.path]}
							on:test={handleTest}
						/>
					</div>
				</div>
			{/each}
		</div>

		<!-- Additional Info -->
		<div class="mt-12 rounded-lg border border-white/10 bg-white/5 p-6">
			<h2 class="mb-4 text-xl font-semibold text-white">Additional Information</h2>
			<div class="grid gap-6 md:grid-cols-2">
				<div>
					<h3 class="mb-2 text-lg font-medium text-white">Rate Limits</h3>
					<p class="text-gray-400">
						Our API is designed for high-throughput usage. No rate limits are currently enforced,
						but please use responsibly.
					</p>
				</div>
				<div>
					<h3 class="mb-2 text-lg font-medium text-white">Support</h3>
					<p class="text-gray-400">
						For questions or issues, please visit our
						<a
							href="https://github.com/klappy/translation-helps-mcp"
							target="_blank"
							class="text-blue-400 hover:text-blue-300"
						>
							GitHub repository
						</a>
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
