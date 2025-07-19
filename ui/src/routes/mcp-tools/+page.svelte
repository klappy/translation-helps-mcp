<script lang="ts">
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

	// MCP Tools documentation
	const mcpTools = [
		{
			name: 'Browse Translation Words',
			tool: 'translation_helps_browse_words',
			icon: Search,
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
					category: 'kt'
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
			useCase: 'Discover what translation word articles are available for a language'
		},
		{
			name: 'Get Translation Word',
			tool: 'translation_helps_get_word',
			icon: BookOpen,
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
			useCase: 'Get detailed information about a specific biblical term'
		},
		{
			name: 'Get Words for Reference',
			tool: 'translation_helps_words_for_reference',
			icon: FileText,
			description: 'Find all translation word articles linked to a specific Bible reference',
			category: 'translation-words',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "John 3:16", "Genesis 1:1")'
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
					reference: 'John 3:16',
					language: 'en'
				},
				response: {
					content: [
						{
							term: 'God',
							path: 'kt/god.md',
							excerpt: 'The supreme being who created and rules the universe...'
						},
						{
							term: 'love',
							path: 'kt/love.md',
							excerpt: 'A strong feeling of affection and care for someone...'
						}
					]
				}
			},
			useCase: 'Find all translation words mentioned in a specific Bible verse'
		},
		{
			name: 'Fetch Resources',
			tool: 'translation_helps_fetch_resources',
			icon: Database,
			description: 'Get all available resources for a Bible reference',
			category: 'comprehensive',
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
					reference: 'Titus 1:1',
					language: 'en'
				},
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
					}
				}
			},
			useCase: 'Get comprehensive Bible study resources for a verse'
		},
		{
			name: 'Search Resources',
			tool: 'translation_helps_search_resources',
			icon: Search,
			description: 'Search for Bible translation resources',
			category: 'search',
			parameters: [
				{
					name: 'query',
					type: 'string',
					required: true,
					description: 'Search query (e.g., "grace", "apostle")'
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
					query: 'grace',
					language: 'en'
				},
				response: {
					results: [
						{
							type: 'translation-word',
							title: 'grace',
							content: 'Favor or kindness shown to someone who does not deserve it...'
						}
					]
				}
			},
			useCase: 'Search across all translation resources'
		},
		{
			name: 'Get Languages',
			tool: 'translation_helps_get_languages',
			icon: Globe,
			description: 'Get list of available languages and resources',
			category: 'metadata',
			parameters: [
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
					organization: 'unfoldingWord'
				},
				response: {
					languages: [
						{
							code: 'en',
							name: 'English',
							resources: ['en_tw', 'en_tn', 'en_tq']
						},
						{
							code: 'es',
							name: 'Spanish',
							resources: ['es_tw', 'es_tn']
						}
					]
				}
			},
			useCase: 'Discover what languages and resources are available'
		},
		{
			name: 'Extract References',
			tool: 'translation_helps_extract_references',
			icon: FileText,
			description: 'Extract Bible references from natural language text',
			category: 'utility',
			parameters: [
				{
					name: 'text',
					type: 'string',
					required: true,
					description: 'Text to extract references from'
				},
				{
					name: 'context',
					type: 'string',
					required: false,
					description: 'Previous conversation context'
				}
			],
			example: {
				request: {
					text: "What does John 3:16 say about God's love?"
				},
				response: {
					references: ['John 3:16']
				}
			},
			useCase: 'Parse Bible references from user input'
		},
		{
			name: 'Fetch Scripture',
			tool: 'translation_helps_fetch_scripture',
			icon: BookOpen,
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
			useCase: 'Get Bible text for a specific verse or passage'
		},
		{
			name: 'Fetch Translation Notes',
			tool: 'translation_helps_fetch_translation_notes',
			icon: FileText,
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
			useCase: 'Get detailed translation notes for Bible study'
		},
		{
			name: 'Fetch Translation Questions',
			tool: 'translation_helps_fetch_translation_questions',
			icon: Users,
			description: 'Fetch translation questions for a specific Bible reference',
			category: 'questions',
			parameters: [
				{
					name: 'reference',
					type: 'string',
					required: true,
					description: 'Bible reference (e.g., "Matthew 5:1")'
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
					reference: 'Matthew 5:1',
					language: 'en'
				},
				response: {
					translationQuestions: [
						{
							reference: '5:1',
							question: 'What did Jesus do when he saw the crowds?',
							answer: 'He went up on a mountain and sat down.'
						}
					]
				}
			},
			useCase: 'Get comprehension questions for Bible passages'
		},
		{
			name: 'Fetch Translation Word Links',
			tool: 'translation_helps_fetch_translation_word_links',
			icon: MessageSquare,
			description: 'Fetch translation word links for a specific Bible reference',
			category: 'links',
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
				}
			],
			example: {
				request: {
					reference: 'Titus 1:1',
					language: 'en'
				},
				response: {
					translationWordLinks: [
						{
							word: 'apostle',
							link: 'rc://en/tn/help/tit/01/01',
							occurrences: 1
						}
					]
				}
			},
			useCase: 'Get links to translation word articles for a verse'
		}
	];

	// Group tools by category
	const toolsByCategory = {
		'translation-words': mcpTools.filter((t) => t.category === 'translation-words'),
		comprehensive: mcpTools.filter((t) => t.category === 'comprehensive'),
		scripture: mcpTools.filter((t) => t.category === 'scripture'),
		notes: mcpTools.filter((t) => t.category === 'notes'),
		questions: mcpTools.filter((t) => t.category === 'questions'),
		links: mcpTools.filter((t) => t.category === 'links'),
		search: mcpTools.filter((t) => t.category === 'search'),
		metadata: mcpTools.filter((t) => t.category === 'metadata'),
		utility: mcpTools.filter((t) => t.category === 'utility')
	};

	const categoryNames: Record<string, string> = {
		'translation-words': 'Translation Words',
		comprehensive: 'Comprehensive',
		scripture: 'Scripture',
		notes: 'Translation Notes',
		questions: 'Translation Questions',
		links: 'Translation Word Links',
		search: 'Search',
		metadata: 'Metadata',
		utility: 'Utility'
	};

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}

	function scrollToSection(id: string) {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function getCategoryIcon(category: string) {
		switch (category) {
			case 'translation-words':
				return BookOpen;
			case 'comprehensive':
				return Zap;
			case 'scripture':
				return BookOpen;
			case 'notes':
				return FileText;
			case 'questions':
				return Users;
			case 'links':
				return MessageSquare;
			case 'search':
				return Search;
			case 'metadata':
				return Database;
			case 'utility':
				return Wrench;
			default:
				return Code;
		}
	}
</script>

<svelte:head>
	<title>MCP Tools - Translation Helps MCP Server</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Header -->
	<div class="mb-12 text-center">
		<div
			class="mb-6 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300"
		>
			<Wrench class="mr-2 h-4 w-4" />
			Model Context Protocol Tools
		</div>
		<h1 class="mb-6 text-4xl font-bold text-white md:text-5xl">
			MCP Tools
			<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
				>Documentation</span
			>
		</h1>
		<p class="mx-auto max-w-3xl text-xl text-gray-300">
			Complete documentation for all Translation Helps MCP Server tools. These tools enable AI
			assistants to access Bible translation resources through natural language interactions.
		</p>
	</div>

	<!-- Table of Contents -->
	<div class="mb-12">
		<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
			<h2 class="mb-6 text-2xl font-bold text-white">Table of Contents</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each Object.entries(toolsByCategory) as [category, tools]}
					<div>
						<h3 class="mb-3 flex items-center space-x-2 text-lg font-semibold text-white">
							<svelte:component this={getCategoryIcon(category)} class="h-5 w-5 text-purple-400" />
							<span>{categoryNames[category]}</span>
						</h3>
						<div class="space-y-2">
							{#each tools as tool}
								<button
									on:click={() => scrollToSection(tool.tool)}
									class="block w-full rounded-lg p-2 text-left text-sm text-gray-300 transition-all duration-200 hover:bg-white/5 hover:text-white"
								>
									<div class="flex items-center space-x-2">
										<svelte:component this={tool.icon} class="h-4 w-4" />
										<span>{tool.name}</span>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- MCP Overview -->
	<div class="mb-12">
		<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
			<h2 class="mb-6 text-2xl font-bold text-white">What are MCP Tools?</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div class="flex items-center space-x-3">
					<Terminal class="h-6 w-6 text-green-400" />
					<div>
						<h3 class="text-lg font-semibold text-white">AI Integration</h3>
						<p class="text-gray-400">Tools designed for AI assistants and LLMs</p>
					</div>
				</div>
				<div class="flex items-center space-x-3">
					<MessageSquare class="h-6 w-6 text-blue-400" />
					<div>
						<h3 class="text-lg font-semibold text-white">Natural Language</h3>
						<p class="text-gray-400">Access Bible resources through conversation</p>
					</div>
				</div>
				<div class="flex items-center space-x-3">
					<Zap class="h-6 w-6 text-purple-400" />
					<div>
						<h3 class="text-lg font-semibold text-white">Structured Data</h3>
						<p class="text-gray-400">Get organized, reliable Bible translation data</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Tools by Category -->
	<div class="space-y-12">
		{#each Object.entries(toolsByCategory) as [category, tools]}
			<div>
				<div class="mb-8 flex items-center space-x-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500"
					>
						<svelte:component this={getCategoryIcon(category)} class="h-5 w-5 text-white" />
					</div>
					<h2 class="text-3xl font-bold text-white">{categoryNames[category]}</h2>
				</div>

				<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
					{#each tools as tool}
						<div
							id={tool.tool}
							class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
						>
							<!-- Tool Header -->
							<div class="mb-6 flex items-start justify-between">
								<div class="flex items-center space-x-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-blue-500"
									>
										<svelte:component this={tool.icon} class="h-5 w-5 text-white" />
									</div>
									<div>
										<h3 class="text-xl font-bold text-white">{tool.name}</h3>
										<p class="text-sm text-gray-400">{tool.tool}</p>
									</div>
								</div>
							</div>

							<!-- Description -->
							<p class="mb-6 text-gray-300">{tool.description}</p>

							<!-- Use Case -->
							<div class="mb-6">
								<div class="mb-2 flex items-center space-x-2">
									<Info class="h-4 w-4 text-blue-400" />
									<span class="text-sm font-medium text-white">Use Case</span>
								</div>
								<p class="text-sm text-gray-400">{tool.useCase}</p>
							</div>

							<!-- Parameters -->
							<div class="mb-6">
								<h4 class="mb-3 text-lg font-semibold text-white">Parameters</h4>
								<div class="space-y-2">
									{#each tool.parameters as param}
										<div class="flex items-center justify-between rounded-lg bg-black/30 p-3">
											<div>
												<div class="flex items-center space-x-2">
													<code class="font-mono text-sm text-purple-300">{param.name}</code>
													{#if param.required}
														<span class="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400"
															>Required</span
														>
													{:else}
														<span
															class="rounded-full bg-gray-500/20 px-2 py-1 text-xs text-gray-400"
															>Optional</span
														>
													{/if}
												</div>
												<p class="mt-1 text-xs text-gray-400">{param.description}</p>
												{#if 'default' in param && param.default}
													<p class="mt-1 text-xs text-blue-400">Default: {param.default}</p>
												{/if}
											</div>
											<div class="text-xs text-gray-500">{param.type}</div>
										</div>
									{/each}
								</div>
							</div>

							<!-- Example -->
							<div class="mb-6">
								<h4 class="mb-3 text-lg font-semibold text-white">Example</h4>
								<div class="space-y-4">
									<div>
										<div class="mb-2 flex items-center justify-between">
											<span class="text-sm font-medium text-gray-400">Request:</span>
											<button
												on:click={() =>
													copyToClipboard(JSON.stringify(tool.example.request, null, 2))}
												class="text-gray-400 transition-colors hover:text-white"
											>
												<Copy class="h-4 w-4" />
											</button>
										</div>
										<div class="rounded-lg border border-white/10 bg-black/30 p-3">
											<pre class="overflow-x-auto text-xs text-gray-300">{JSON.stringify(
													tool.example.request,
													null,
													2
												)}</pre>
										</div>
									</div>
									<div>
										<div class="mb-2 flex items-center justify-between">
											<span class="text-sm font-medium text-gray-400">Response:</span>
											<button
												on:click={() =>
													copyToClipboard(JSON.stringify(tool.example.response, null, 2))}
												class="text-gray-400 transition-colors hover:text-white"
											>
												<Copy class="h-4 w-4" />
											</button>
										</div>
										<div class="rounded-lg border border-white/10 bg-black/30 p-3">
											<pre class="overflow-x-auto text-xs text-gray-300">{JSON.stringify(
													tool.example.response,
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
					<h3 class="mb-4 text-xl font-semibold text-white">Connecting to MCP Server</h3>
					<p class="mb-4 text-gray-300">
						Configure your MCP client to connect to the Translation Helps MCP server and start using
						these tools in your AI applications.
					</p>
					<div class="space-y-2">
						<div class="flex items-center space-x-2">
							<CheckCircle class="h-4 w-4 text-green-400" />
							<span class="text-gray-300">Natural language processing</span>
						</div>
						<div class="flex items-center space-x-2">
							<CheckCircle class="h-4 w-4 text-green-400" />
							<span class="text-gray-300">Automatic tool routing</span>
						</div>
						<div class="flex items-center space-x-2">
							<CheckCircle class="h-4 w-4 text-green-400" />
							<span class="text-gray-300">Structured responses</span>
						</div>
					</div>
				</div>
				<div>
					<h3 class="mb-4 text-xl font-semibold text-white">Example Usage</h3>
					<p class="mb-4 text-gray-300">
						These tools are designed to work seamlessly with AI assistants. Users can ask natural
						questions and get comprehensive Bible translation resources.
					</p>
					<div class="space-y-2">
						<div class="flex items-center space-x-2">
							<MessageSquare class="h-4 w-4 text-blue-400" />
							<span class="text-gray-300">"What does the word 'grace' mean?"</span>
						</div>
						<div class="flex items-center space-x-2">
							<MessageSquare class="h-4 w-4 text-blue-400" />
							<span class="text-gray-300">"Show me translation words for John 3:16"</span>
						</div>
						<div class="flex items-center space-x-2">
							<MessageSquare class="h-4 w-4 text-blue-400" />
							<span class="text-gray-300">"What languages are available?"</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
