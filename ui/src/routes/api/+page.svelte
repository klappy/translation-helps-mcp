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
					responseTime: 565
				}
			}
		},
		{
			name: 'Fetch Translation Notes',
			path: '/api/fetch-translation-notes',
			description:
				'Get detailed translation notes for Bible verses with original language analysis',
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
						},
						{
							reference: 'TIT 1:1',
							quote: 'καὶ ἐπίγνωσιν ἀληθείας',
							note: 'Paul is leaving out some of the words that in many languages a sentence would need in order to be complete. You could supply these words from earlier in the sentence if it would be clearer in your language. Alternate translation: [and for their knowledge of the truth] or [and so that the chosen people of God might know the truth]'
						},
						{
							reference: 'TIT 1:1',
							quote: "τῆς κατ' εὐσέβειαν",
							note: 'Here, **godliness** is an abstract noun that refers to living in a way that pleases God. Alternate translation: [that is suitable for honoring God]'
						}
					],
					citation: {
						resource: 'en_tn',
						title: 'unfoldingWord® Translation Notes',
						organization: 'unfoldingWord',
						language: 'en',
						url: 'https://git.door43.org/unfoldingWord/en_tn/raw/branch/master/tn_TIT.tsv',
						version: 'master'
					},
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 487
				}
			}
		},
		{
			name: 'Fetch Translation Words',
			path: '/api/fetch-translation-words',
			description: 'Get theological definitions and cross-references for key biblical terms',
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
						},
						{
							term: 'servant',
							definition: 'servant, serve, maidservant, young man, young women',
							title: 'servant, serve, maidservant, young man, young women',
							subtitle: 'Definition:',
							content:
								'# servant, serve, maidservant, young man, young women\n\n## Definition:\n\nA "servant" refers to a person who works for (or obeys) another person, either by choice or by force...',
							titleContent: 'servant, serve, maidservant, young man, young women',
							subtitleContent: 'Definition:',
							mainContent:
								'A "servant" refers to a person who works for (or obeys) another person, either by choice or by force. A servant was under his master\'s direction...'
						},
						{
							term: 'god',
							definition: 'God',
							title: 'God',
							subtitle: 'Definition:',
							content:
								'# God\n\n## Definition:\n\nIn the Bible, the term "God" refers to the eternal being who created the universe out of nothing. God exists as Father, Son, and Holy Spirit...',
							titleContent: 'God',
							subtitleContent: 'Definition:',
							mainContent:
								'In the Bible, the term "God" refers to the eternal being who created the universe out of nothing. God exists as Father, Son, and Holy Spirit...'
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
					responseTime: 2387
				}
			}
		},
		{
			name: 'Fetch Translation Questions',
			path: '/api/fetch-translation-questions',
			description: 'Get comprehension questions for Bible verses to aid understanding',
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
					translationQuestions: [
						{
							reference: 'TIT 1:1',
							question: 'How does Paul identify himself in his letter to Titus?',
							answer: 'Paul identifies himself as a servant of God and an apostle of Jesus Christ.'
						}
					],
					citation: {
						resource: 'en_tq',
						title: 'unfoldingWord® Translation Questions',
						organization: 'unfoldingWord',
						language: 'en',
						url: 'https://git.door43.org/unfoldingWord/en_tq/raw/branch/master/tq_TIT.tsv',
						version: 'master'
					},
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 298
				}
			}
		},
		{
			name: 'Fetch Translation Word Links',
			path: '/api/fetch-translation-word-links',
			description: 'Get word-level links between original language terms and translation resources',
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
					wordLinks: [
						{
							word: 'Paul',
							link: 'paul',
							strongsNumber: 'G3972'
						},
						{
							word: 'servant',
							link: 'servant',
							strongsNumber: 'G1401'
						},
						{
							word: 'God',
							link: 'god',
							strongsNumber: 'G2316'
						}
					],
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 145
				}
			}
		},
		{
			name: 'Browse Translation Words',
			path: '/api/browse-translation-words',
			description: 'Browse all available translation words with pagination and search',
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
				{ name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
				{
					name: 'limit',
					type: 'number',
					required: false,
					description: 'Items per page (default: 50)'
				},
				{
					name: 'search',
					type: 'string',
					required: false,
					description: 'Search term to filter results'
				}
			],
			example: {
				url: '/api/browse-translation-words?language=en&organization=unfoldingWord&limit=3',
				response: {
					words: [
						{
							term: 'aaron',
							title: 'Aaron',
							definition: 'Aaron',
							subtitle: 'Facts:'
						},
						{
							term: 'abandon',
							title: 'abandon, abandoned, abandons',
							definition: 'abandon, abandoned, abandons',
							subtitle: 'Definition:'
						},
						{
							term: 'abba',
							title: 'Abba',
							definition: 'Abba',
							subtitle: 'Facts:'
						}
					],
					pagination: {
						page: 1,
						limit: 3,
						total: 1847,
						pages: 616
					},
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 234
				}
			}
		},
		{
			name: 'Extract References',
			path: '/api/extract-references',
			description: 'Extract and normalize Bible references from text input',
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
				url: '/api/extract-references?text=See%20John%203:16%20and%20Rom%201:1-3',
				response: {
					references: [
						{
							original: 'John 3:16',
							normalized: 'JHN 3:16',
							book: 'JHN',
							chapter: 3,
							verse: 16
						},
						{
							original: 'Rom 1:1-3',
							normalized: 'ROM 1:1-3',
							book: 'ROM',
							chapter: 1,
							startVerse: 1,
							endVerse: 3
						}
					],
					responseTime: 23
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
				},
				{
					name: 'includeScripture',
					type: 'boolean',
					required: false,
					description: 'Include scripture text'
				},
				{
					name: 'includeNotes',
					type: 'boolean',
					required: false,
					description: 'Include translation notes'
				},
				{
					name: 'includeWords',
					type: 'boolean',
					required: false,
					description: 'Include translation words'
				},
				{
					name: 'includeQuestions',
					type: 'boolean',
					required: false,
					description: 'Include translation questions'
				}
			],
			example: {
				url: '/api/fetch-resources?reference=Titus%201:1&language=en&organization=unfoldingWord&includeScripture=true&includeNotes=true',
				response: {
					reference: 'Titus 1:1',
					scripture: {
						text: '1 Paul, a servant of God and an apostle of Jesus Christ, for the faith of the chosen people of God and knowledge of the truth that agrees with godliness,',
						translation: 'ULT',
						citation: {
							resource: 'unfoldingWord® Literal Text',
							organization: 'unfoldingWord',
							language: 'en'
						}
					},
					translationNotes: [
						{
							reference: 'TIT 1:1',
							quote: 'κατὰ πίστιν ἐκλεκτῶν Θεοῦ καὶ ἐπίγνωσιν ἀληθείας',
							note: 'The words **faith**, **knowledge**, and **truth** are abstract nouns...'
						}
					],
					language: 'en',
					organization: 'unfoldingWord',
					responseTime: 856
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
							organizations: ['unfoldingWord']
						},
						{
							code: 'es',
							name: 'Español',
							organizations: ['unfoldingWord']
						}
					],
					responseTime: 45
				}
			}
		},
		{
			name: 'Health Check',
			path: '/api/health',
			description: 'Check API health and get system information',
			method: 'GET',
			deprecated: false,
			parameters: [],
			example: {
				url: '/api/health',
				response: {
					status: 'healthy',
					timestamp: '2024-01-15T10:30:00.000Z',
					version: '3.4.0',
					uptime: '2 days, 14 hours, 30 minutes'
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
									<Code class="h-6 w-6 text-white" />
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
								<span
									class="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-300"
								>
									REST API
								</span>
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
