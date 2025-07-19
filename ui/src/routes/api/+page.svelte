<script>
	// @ts-nocheck
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
		AlertCircle,
		List,
		Link
	} from 'lucide-svelte';
	import ApiTester from '$lib/components/ApiTester.svelte';
	import ResponseDisplay from '$lib/components/ResponseDisplay.svelte';

	// This page documents the Translation Helps REST API endpoints
	// All endpoints are fully functional and actively maintained
	// MCP tools are also available as an alternative interface

	const endpoints = [
		{
			name: 'Health Check',
			path: '/api/health',
			description: 'Get API status, version, and available endpoints',
			method: 'GET',
			deprecated: false,
			parameters: [],
			example: {
				url: '/api/health',
				response: {
					status: 'healthy',
					timestamp: '2025-01-19T20:52:42.820Z',
					version: '3.4.0',
					environment: 'production',
					endpoints: [
						'/api/health',
						'/api/fetch-resources',
						'/api/list-available-resources',
						'/api/get-context',
						'/api/get-languages',
						'/api/extract-references'
					]
				}
			}
		},
		{
			name: 'Get Languages',
			path: '/api/get-languages',
			description: 'Get list of available languages and organizations',
			method: 'GET',
			deprecated: false,
			parameters: [],
			example: {
				url: '/api/get-languages',
				response: {
					languages: [
						{
							code: 'en',
							name: 'English',
							organizations: ['unfoldingWord', 'STR']
						},
						{
							code: 'es',
							name: 'Spanish',
							organizations: ['unfoldingWord']
						}
					],
					total: 2
				}
			}
		},
		{
			name: 'Extract References',
			path: '/api/extract-references',
			description: 'Extract and parse Bible references from text',
			method: 'GET',
			deprecated: false,
			parameters: [
				{
					name: 'text',
					type: 'string',
					required: true,
					description: 'Text containing Bible references'
				}
			],
			example: {
				url: '/api/extract-references?text=See John 3:16 and Romans 1:1',
				response: {
					references: [
						{
							reference: 'John 3:16',
							book: 'John',
							chapter: 3,
							verse: 16
						},
						{
							reference: 'Romans 1:1',
							book: 'Romans',
							chapter: 1,
							verse: 1
						}
					],
					count: 2
				}
			}
		},
		{
			name: 'List Available Resources',
			path: '/api/list-available-resources',
			description:
				'Get a list of available translation resources filtered by criteria (metadata only)',
			method: 'GET',
			deprecated: false,
			parameters: [
				{
					name: 'language',
					type: 'string',
					required: false,
					description: 'Filter by language code'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					description: 'Filter by organization'
				},
				{
					name: 'resource',
					type: 'string',
					required: false,
					description: 'Filter by resource type'
				},
				{
					name: 'subject',
					type: 'string',
					required: false,
					description: 'Filter by subject matter'
				}
			],
			example: {
				url: '/api/list-available-resources?language=en&organization=unfoldingWord&resource=scripture',
				response: {
					resources: [
						{
							name: 'unfoldingWord Literal Text',
							language: 'en',
							organization: 'unfoldingWord',
							type: 'scripture',
							description: 'A literal Bible translation'
						},
						{
							name: 'Translation Notes',
							language: 'en',
							organization: 'unfoldingWord',
							type: 'notes',
							description: 'Translation help notes'
						}
					],
					totalResults: 2
				}
			}
		},
		{
			name: 'Get Context',
			path: '/api/get-context',
			description: 'Get contextual information and cross-references for Bible passages',
			method: 'GET',
			deprecated: false,
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
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					description: 'Organization (default: "unfoldingWord")'
				},
				{
					name: 'includeRawData',
					type: 'boolean',
					required: false,
					description: 'Include raw data in response (default: false)'
				},
				{
					name: 'maxTokens',
					type: 'number',
					required: false,
					description: 'Maximum tokens for response'
				}
			],
			example: {
				url: '/api/get-context?reference=John%203:16&language=en&organization=unfoldingWord',
				response: {
					reference: 'John 3:16',
					context: {
						passage: 'For God so loved the world...',
						cross_references: ['Romans 5:8', '1 John 4:9'],
						themes: ['love', 'salvation', 'eternal life']
					},
					language: 'en',
					organization: 'unfoldingWord'
				}
			}
		},
		{
			name: 'Fetch Resources',
			path: '/api/fetch-resources',
			description: 'Get comprehensive translation resources for a Bible reference',
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
				url: '/api/fetch-resources?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					reference: 'Titus 1:1',
					language: 'en',
					organization: 'unfoldingWord',
					scripture: {
						text: 'Paul, a servant of God and an apostle of Jesus Christ...',
						translation: 'ULT'
					},
					notes: [
						{
							id: 'tit01-01-abc1',
							reference: 'rc://*/tn/help/tit/01/01',
							text: 'Paul introduces himself as both a servant and apostle...'
						}
					],
					words: [
						{
							id: 'servant',
							term: 'servant',
							definition: 'A person who serves another...'
						}
					]
				}
			}
		},
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
					notes: [
						{
							id: 'tit01-01-abc1',
							reference: 'rc://*/tn/help/tit/01/01',
							text: 'Paul introduces himself using two titles that describe his relationship to God and to the church.',
							quote: 'Paul, a servant of God and an apostle of Jesus Christ',
							occurrence: 1,
							gl_quote: 'Paul'
						}
					],
					reference: 'Titus 1:1',
					language: 'en',
					organization: 'unfoldingWord'
				}
			}
		},
		{
			name: 'Fetch Translation Questions',
			path: '/api/fetch-translation-questions',
			description: 'Get comprehension and translation questions for Bible passages',
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
				url: '/api/fetch-translation-questions?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					questions: [
						{
							id: 'tit01-01-q1',
							question: 'How does Paul describe himself in this verse?',
							answer: 'Paul describes himself as a servant of God and an apostle of Jesus Christ.'
						}
					],
					reference: 'Titus 1:1',
					language: 'en',
					organization: 'unfoldingWord'
				}
			}
		},
		{
			name: 'Fetch Translation Words',
			path: '/api/fetch-translation-words',
			description: 'Get key biblical terms and their definitions for translation help',
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
					words: [
						{
							id: 'servant',
							term: 'servant',
							definition: 'A person who serves another person, either by choice or by requirement.',
							translation_suggestions: ['servant', 'slave', 'bond-servant']
						},
						{
							id: 'apostle',
							term: 'apostle',
							definition: 'A person sent by God to preach the gospel.',
							translation_suggestions: ['apostle', 'messenger', 'one who is sent']
						}
					],
					reference: 'Titus 1:1',
					language: 'en',
					organization: 'unfoldingWord'
				}
			}
		},
		{
			name: 'Get Words for Reference',
			path: '/api/get-words-for-reference',
			description: 'Get translation words that apply to a specific Bible reference',
			method: 'GET',
			deprecated: false,
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
					description: 'Language code (default: "en")'
				},
				{
					name: 'organization',
					type: 'string',
					required: false,
					description: 'Organization (default: "unfoldingWord")'
				}
			],
			example: {
				url: '/api/get-words-for-reference?reference=John%203:16&language=en&organization=unfoldingWord',
				response: {
					content: [
						{
							term: 'love',
							path: 'kt/love.md',
							excerpt: 'Love is a deep care and affection...'
						},
						{
							term: 'world',
							path: 'other/world.md',
							excerpt: 'The world refers to the earth and all people...'
						}
					],
					reference: 'John 3:16',
					language: 'en',
					organization: 'unfoldingWord'
				}
			}
		},
		{
			name: 'Fetch Translation Word Links',
			path: '/api/fetch-translation-word-links',
			description: 'Get links between translation words and their usage in scripture',
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
				url: '/api/fetch-translation-word-links?reference=Titus%201:1&language=en&organization=unfoldingWord',
				response: {
					links: [
						{
							word: 'servant',
							references: ['Romans 1:1', 'Philippians 1:1', 'Titus 1:1'],
							usage_count: 156
						}
					],
					reference: 'Titus 1:1',
					language: 'en',
					organization: 'unfoldingWord'
				}
			}
		},
		{
			name: 'Browse Translation Words',
			path: '/api/browse-translation-words',
			description: 'Browse and search through all available translation words',
			method: 'GET',
			deprecated: false,
			parameters: [
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
					name: 'search',
					type: 'string',
					required: false,
					description: 'Search term to filter words'
				},
				{
					name: 'limit',
					type: 'number',
					required: false,
					description: 'Maximum number of results (default: 50)'
				}
			],
			example: {
				url: '/api/browse-translation-words?language=en&organization=unfoldingWord&search=love&limit=10',
				response: {
					words: [
						{
							id: 'love',
							term: 'love',
							definition: 'To care deeply for someone or something...',
							aliases: ['beloved', 'loving']
						}
					],
					total: 1,
					search: 'love',
					limit: 10
				}
			}
		}
	];

	let responses = {}; // Track responses per endpoint
	let loadingStates = {}; // Track loading per endpoint

	function scrollToEndpoint(endpointPath) {
		const element = document.getElementById(endpointPath.replace('/api/', ''));
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	async function handleTest(event) {
		const { endpoint, formData } = event.detail;
		const endpointKey = endpoint.path;

		loadingStates[endpointKey] = true;
		responses[endpointKey] = null;

		try {
			// Build URL with parameters
			const functionName = endpoint.path.replace('/api/', '');
			const url = new URL(`/.netlify/functions/${functionName}`, window.location.origin);

			// Add parameters to URL
			Object.entries(formData || {}).forEach(([key, value]) => {
				if (value) {
					url.searchParams.append(key, value);
				}
			});

			const response = await fetch(url.toString());
			const data = await response.json();

			responses[endpointKey] = {
				success: response.ok,
				status: response.status,
				data: data,
				url: url.toString()
			};
		} catch (error) {
			responses[endpointKey] = {
				success: false,
				status: 0,
				data: { error: error.message },
				url: 'Error occurred'
			};
		} finally {
			loadingStates[endpointKey] = false;
		}
	}
</script>

<svelte:head>
	<title>Translation Helps API Reference</title>
	<meta
		name="description"
		content="Complete API reference for Translation Helps endpoints - Scripture, notes, words, and more"
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-12 text-center">
			<div class="mb-4 flex items-center justify-center gap-3">
				<Code class="h-8 w-8 text-blue-400" />
				<h1
					class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-4xl font-bold text-transparent"
				>
					Translation Helps API
				</h1>
			</div>
			<p class="mx-auto max-w-3xl text-xl text-gray-300">
				Comprehensive REST API for Bible translation resources including scripture, notes,
				translation words, and more.
			</p>
			<div class="mt-6 flex items-center justify-center gap-6">
				<div class="flex items-center gap-2">
					<CheckCircle class="h-5 w-5 text-green-400" />
					<span class="text-sm text-gray-300">Live & Interactive</span>
				</div>
				<div class="flex items-center gap-2">
					<Zap class="h-5 w-5 text-yellow-400" />
					<span class="text-sm text-gray-300">{endpoints.length} Endpoints</span>
				</div>
				<div class="flex items-center gap-2">
					<BookOpen class="h-5 w-5 text-blue-400" />
					<span class="text-sm text-gray-300">Translation Resources</span>
				</div>
			</div>
		</div>

		<!-- Table of Contents -->
		<div class="mb-8 rounded-xl border border-gray-700 bg-gray-800/50 p-6">
			<div class="mb-4 flex items-center gap-3">
				<List class="h-6 w-6 text-blue-400" />
				<h2 class="text-2xl font-bold text-white">Table of Contents</h2>
			</div>
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
				{#each endpoints as endpoint}
					<button
						on:click={() => scrollToEndpoint(endpoint.path)}
						class="group flex items-center gap-3 rounded-lg bg-gray-700/50 p-3 text-left transition-colors hover:bg-gray-600/50"
					>
						<Link class="h-4 w-4 text-blue-400 group-hover:text-blue-300" />
						<div>
							<div class="font-medium text-white group-hover:text-blue-300">
								{endpoint.name}
							</div>
							<div class="text-sm text-gray-400">
								{endpoint.path}
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- API Endpoints -->
		<div class="space-y-8">
			{#each endpoints as endpoint}
				<div
					id={endpoint.path.replace('/api/', '')}
					class="overflow-hidden rounded-xl border border-gray-700 bg-gray-800/50"
				>
					<!-- Endpoint Header -->
					<div class="border-b border-gray-700 p-6">
						<div class="mb-4 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<span class="rounded-lg bg-blue-600 px-3 py-1 text-sm font-medium text-white">
									{endpoint.method}
								</span>
								<h3 class="text-2xl font-bold text-white">{endpoint.name}</h3>
							</div>
							{#if endpoint.deprecated}
								<span
									class="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white"
								>
									<AlertCircle class="h-4 w-4" />
									Deprecated
								</span>
							{/if}
						</div>
						<p class="mb-4 text-gray-300">{endpoint.description}</p>
						<div class="rounded-lg bg-gray-900 p-3">
							<code class="font-mono text-blue-300">
								GET {endpoint.path}
							</code>
						</div>
					</div>

					<!-- Interactive Testing -->
					<div class="p-6">
						<ApiTester {endpoint} loading={loadingStates[endpoint.path]} on:test={handleTest} />

						<!-- Response Display - Right where you'd expect it! -->
						{#if responses[endpoint.path]}
							<div class="mt-6 border-t border-gray-600 pt-6">
								<h4 class="mb-4 text-lg font-semibold text-white">Response</h4>
								<ResponseDisplay response={responses[endpoint.path]} />
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Footer -->
		<div class="mt-16 text-center">
			<div class="rounded-xl border border-gray-700 bg-gray-800/50 p-6">
				<h3 class="mb-4 text-xl font-bold text-white">Need Help?</h3>
				<p class="mb-4 text-gray-300">
					All endpoints are fully functional and return real data. Use the interactive forms above
					to test them!
				</p>
				<div class="flex items-center justify-center gap-6">
					<a
						href="/mcp-tools"
						class="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 transition-colors hover:bg-purple-700"
					>
						<MessageSquare class="h-4 w-4" />
						MCP Tools
					</a>
					<a
						href="/test"
						class="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 transition-colors hover:bg-green-700"
					>
						<Zap class="h-4 w-4" />
						Performance Testing
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
