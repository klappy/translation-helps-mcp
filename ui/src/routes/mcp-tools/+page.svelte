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
		Link,
		Activity,
		Settings,
		Beaker,
		Book
	} from 'lucide-svelte';
	import ApiTester from '$lib/components/ApiTester.svelte';
	import ResponseDisplay from '$lib/components/ResponseDisplay.svelte';
	import { onMount } from 'svelte';

	// Health check state
	let healthData = null;
	let healthLoading = false;

	// Current selection state
	let selectedCategory = 'overview';
	let selectedTool = null;

	// API testing state
	let responses = {}; // Track responses per endpoint
	let loadingStates = {}; // Track loading per endpoint

	// Categories with organized endpoints
	const categories = {
		overview: {
			name: 'Overview',
			icon: Info,
			description: 'MCP via HTTP/Web API Documentation'
		},
		health: {
			name: 'Health Status',
			icon: Activity,
			description: 'Real-time API endpoint monitoring'
		},
		core: {
			name: 'Core Endpoints',
			icon: Database,
			description: 'Direct mappings to DCS/Door43 resources'
		},
		linked: {
			name: 'Linked Endpoints',
			icon: Link,
			description: 'Combine multiple endpoints for enhanced functionality'
		},
		experimental: {
			name: 'Experimental',
			icon: Beaker,
			description: 'Value-added endpoints that may change'
		}
	};

	// Organized MCP Tools by category
	const mcpTools = {
		core: [
			{
				name: 'Fetch Scripture',
				tool: 'translation_helps_fetch_scripture',
				description: 'Get Bible text in USFM or plain text format',
				apiEndpoint: '/api/fetch-scripture',
				icon: BookOpen,
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
						description: 'Language code'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				exampleRequest: {
					reference: 'John 3:16',
					language: 'en',
					organization: 'unfoldingWord'
				}
			},
			{
				name: 'Fetch Translation Notes',
				tool: 'translation_helps_fetch_translation_notes',
				description: 'Get detailed translation notes for Bible passages',
				apiEndpoint: '/api/fetch-translation-notes',
				icon: FileText,
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
						description: 'Language code'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				exampleRequest: {
					reference: 'Titus 1:1',
					language: 'en',
					organization: 'unfoldingWord'
				}
			},
			{
				name: 'Fetch Translation Questions',
				tool: 'translation_helps_fetch_translation_questions',
				description: 'Get comprehension questions for Bible passages',
				apiEndpoint: '/api/fetch-translation-questions',
				icon: MessageSquare,
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
						description: 'Language code'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				exampleRequest: {
					reference: 'John 3:16',
					language: 'en',
					organization: 'unfoldingWord'
				}
			},
			{
				name: 'Fetch Translation Words',
				tool: 'translation_helps_fetch_translation_words',
				description: 'Get specific translation word article content',
				apiEndpoint: '/api/fetch-translation-words',
				icon: Book,
				parameters: [
					{
						name: 'words',
						type: 'string',
						required: true,
						description: 'Comma-separated word terms (e.g., "grace,mercy")'
					},
					{
						name: 'language',
						type: 'string',
						required: false,
						default: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				exampleRequest: {
					words: 'grace,mercy',
					language: 'en',
					organization: 'unfoldingWord'
				}
			},
			{
				name: 'Browse Translation Words',
				tool: 'translation_helps_browse_translation_words',
				description: 'Browse available translation word articles by category',
				apiEndpoint: '/api/browse-translation-words',
				icon: Search,
				parameters: [
					{
						name: 'language',
						type: 'string',
						required: false,
						default: 'en',
						description: 'Language code'
					},
					{
						name: 'category',
						type: 'string',
						required: false,
						description: 'Filter by category (kt, names, other)'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				exampleRequest: {
					language: 'en',
					category: 'kt',
					organization: 'unfoldingWord'
				}
			},
			{
				name: 'Fetch Translation Word Links',
				tool: 'translation_helps_fetch_translation_word_links',
				description: 'Get translation word links for specific Bible references',
				apiEndpoint: '/api/fetch-translation-word-links',
				icon: Link,
				parameters: [
					{
						name: 'reference',
						type: 'string',
						required: true,
						description: 'Bible reference (e.g., "Genesis 1:1")'
					},
					{
						name: 'language',
						type: 'string',
						required: false,
						default: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				exampleRequest: {
					reference: 'Genesis 1:1',
					language: 'en',
					organization: 'unfoldingWord'
				}
			},
			{
				name: 'Get Languages',
				tool: 'translation_helps_get_languages',
				description: 'List all available languages for translation resources',
				apiEndpoint: '/api/get-languages',
				icon: Globe,
				parameters: [],
				exampleRequest: {}
			},
			{
				name: 'Extract References',
				tool: 'translation_helps_extract_references',
				description: 'Extract and parse Bible references from text',
				apiEndpoint: '/api/extract-references',
				icon: Search,
				parameters: [
					{
						name: 'text',
						type: 'string',
						required: true,
						description: 'Text containing Bible references'
					}
				],
				exampleRequest: {
					text: 'See John 3:16 and Romans 1:1 for more details'
				}
			},
			{
				name: 'List Available Resources',
				tool: 'translation_helps_list_available_resources',
				description: 'Search and list available translation resources',
				apiEndpoint: '/api/list-available-resources',
				icon: List,
				parameters: [
					{
						name: 'language',
						type: 'string',
						required: false,
						default: 'en',
						description: 'Language code'
					},
					{
						name: 'query',
						type: 'string',
						required: false,
						description: 'Search query term'
					}
				],
				exampleRequest: {
					language: 'en',
					query: 'faith'
				}
			},
			{
				name: 'Get Available Books',
				tool: 'translation_helps_get_available_books',
				description: 'List available Bible books for translation resources',
				apiEndpoint: '/api/get-available-books',
				icon: BookOpen,
				parameters: [
					{
						name: 'language',
						type: 'string',
						required: false,
						default: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				exampleRequest: {
					language: 'en',
					organization: 'unfoldingWord'
				}
			}
		],
		linked: [
			{
				name: 'Get Words for Reference',
				tool: 'translation_helps_get_words_for_reference',
				description: 'Get translation words that apply to specific Bible references',
				apiEndpoint: '/api/get-words-for-reference',
				icon: Link,
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
						description: 'Language code'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				exampleRequest: {
					reference: 'John 3:16',
					language: 'en',
					organization: 'unfoldingWord'
				}
			},
			{
				name: 'Fetch Resources',
				tool: 'translation_helps_fetch_resources',
				description: 'Get comprehensive translation resources for a Bible reference',
				apiEndpoint: '/api/fetch-resources',
				icon: Database,
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
						description: 'Language code'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					},
					{
						name: 'resources',
						type: 'array',
						required: false,
						description: 'Resource types to include'
					}
				],
				exampleRequest: {
					reference: 'Titus 1:1',
					language: 'en',
					organization: 'unfoldingWord',
					resources: ['scripture', 'notes', 'questions', 'words']
				}
			}
		],
		experimental: [
			{
				name: 'Get Context',
				tool: 'translation_helps_get_context',
				description: 'Get contextual information and cross-references for Bible passages',
				apiEndpoint: '/api/get-context',
				icon: Info,
				parameters: [
					{
						name: 'reference',
						type: 'string',
						required: true,
						description: 'Bible reference (e.g., "Genesis 1:1")'
					},
					{
						name: 'language',
						type: 'string',
						required: false,
						default: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				exampleRequest: {
					reference: 'Genesis 1:1',
					language: 'en',
					organization: 'unfoldingWord'
				}
			},
			{
				name: 'Get Translation Word',
				tool: 'translation_helps_get_translation_word',
				description: 'Get detailed information about a specific translation word',
				apiEndpoint: '/api/get-translation-word',
				icon: Search,
				parameters: [
					{
						name: 'term',
						type: 'string',
						required: true,
						description: 'Translation word term (e.g., "grace")'
					},
					{
						name: 'language',
						type: 'string',
						required: false,
						default: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						type: 'string',
						required: false,
						default: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				exampleRequest: {
					term: 'grace',
					language: 'en',
					organization: 'unfoldingWord'
				}
			}
		]
	};

	// Load health check data
	async function loadHealthCheck() {
		healthLoading = true;
		try {
			// Add cache-busting to get fresh health data
			const response = await fetch(
				'/api/health?' +
					new URLSearchParams({
						_t: Date.now().toString()
					}),
				{
					headers: {
						'Cache-Control': 'no-cache',
						'X-Cache-Bypass': 'true'
					}
				}
			);
			const data = await response.json();

			// Accept both 200 (healthy) and 503 (degraded but with valid data)
			if (!response.ok && response.status !== 503) {
				throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
			}

			// Validate the response structure
			if (!data || typeof data !== 'object') {
				throw new Error('Invalid health check response: not an object');
			}

			// Ensure summary exists with required fields
			if (!data.summary || typeof data.summary !== 'object') {
				console.warn('Health check response missing summary, adding fallback');
				data.summary = {
					totalEndpoints: 0,
					healthyEndpoints: 0,
					warningEndpoints: 0,
					errorEndpoints: 0,
					avgResponseTime: 0
				};
			}

			healthData = data;
		} catch (error) {
			console.error('Failed to load health check:', error);
			// Set a fallback healthData to prevent crashes
			healthData = {
				status: 'error',
				timestamp: new Date().toISOString(),
				summary: {
					totalEndpoints: 0,
					healthyEndpoints: 0,
					warningEndpoints: 0,
					errorEndpoints: 0,
					avgResponseTime: 0
				},
				endpoints: [],
				error: error.message
			};
		} finally {
			healthLoading = false;
		}
	}

	// Get all tools for easy access
	function getAllTools() {
		return [...mcpTools.core, ...mcpTools.linked, ...mcpTools.experimental];
	}

	// Select a category or tool
	function selectCategory(category) {
		selectedCategory = category;
		selectedTool = null;
	}

	function selectTool(tool) {
		selectedTool = tool;
		selectedCategory = 'tool';
	}

	// Get health status for an endpoint
	function getEndpointHealth(apiEndpoint) {
		if (!healthData?.endpoints) return null;
		const endpointName = apiEndpoint.replace('/api/', '');
		return healthData.endpoints.find((ep) => ep.name === endpointName);
	}

	// Get status color class
	function getStatusClass(status) {
		switch (status) {
			case 'healthy':
				return 'text-green-500';
			case 'warning':
				return 'text-yellow-500';
			case 'error':
				return 'text-red-500';
			default:
				return 'text-gray-500';
		}
	}

	// Handle API endpoint testing
	async function handleTest(event) {
		const { endpoint, formData } = event.detail;
		const endpointKey = endpoint.path || endpoint;

		loadingStates[endpointKey] = true;
		responses[endpointKey] = null;

		try {
			// Build URL with parameters
			const functionName = endpointKey.replace('/api/', '');
			const url = new URL(`/api/${functionName}`, window.location.origin);

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

	onMount(() => {
		loadHealthCheck();
	});
</script>

<svelte:head>
	<title>MCP via HTTP/Web API - Translation Helps</title>
	<meta
		name="description"
		content="Complete documentation for Translation Helps MCP over HTTP/Web API endpoints"
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
	<div class="container mx-auto px-4 py-8">
		<div class="flex flex-col gap-8 lg:flex-row">
			<!-- Sidebar Navigation -->
			<div class="lg:w-1/4">
				<div class="sticky top-8 rounded-xl bg-gray-800/50 p-6 backdrop-blur-sm">
					<h2 class="mb-4 flex items-center gap-2 text-xl font-bold text-white">
						<Terminal class="h-5 w-5" />
						Documentation
					</h2>

					<nav class="space-y-2">
						<!-- Overview & Health -->
						{#each Object.entries(categories) as [key, category]}
							<button
								class="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all {selectedCategory ===
								key
									? 'bg-purple-600 text-white'
									: 'text-gray-300 hover:bg-gray-700'}"
								on:click={() => selectCategory(key)}
							>
								<svelte:component this={category.icon} class="h-4 w-4" />
								{category.name}
							</button>
						{/each}

						<!-- Tool Categories -->
						{#each Object.entries(mcpTools) as [categoryKey, tools]}
							<div class="mt-4">
								<div class="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">
									{categories[categoryKey]?.name || categoryKey}
								</div>
								{#each tools as tool}
									<button
										class="w-full rounded-lg p-2 pl-6 text-left text-sm transition-all {selectedTool?.name ===
										tool.name
											? 'bg-purple-600 text-white'
											: 'text-gray-300 hover:bg-gray-700'}"
										on:click={() => selectTool(tool)}
									>
										{tool.name}
									</button>
								{/each}
							</div>
						{/each}
					</nav>
				</div>
			</div>

			<!-- Main Content -->
			<div class="lg:w-3/4">
				<div class="rounded-xl bg-gray-800/50 p-8 backdrop-blur-sm">
					<!-- Overview -->
					{#if selectedCategory === 'overview'}
						<div class="space-y-6">
							<div class="text-center">
								<h1 class="mb-4 text-4xl font-bold text-white">Translation Helps MCP</h1>
								<p class="mb-8 text-xl text-gray-300">Model Context Protocol via HTTP/Web API</p>
							</div>

							<div class="grid gap-6 md:grid-cols-2">
								<div class="rounded-lg bg-gray-700/50 p-6">
									<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
										<Zap class="h-5 w-5 text-yellow-500" />
										HTTP-Based MCP
									</h3>
									<p class="text-sm text-gray-300">
										Access all MCP tools via standard HTTP requests. Perfect for stateless
										environments like Cloudflare Workers.
									</p>
								</div>

								<div class="rounded-lg bg-gray-700/50 p-6">
									<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
										<Database class="h-5 w-5 text-blue-500" />
										Bible Translation Resources
									</h3>
									<p class="text-sm text-gray-300">
										Comprehensive access to Scripture, translation notes, comprehension questions,
										and word studies.
									</p>
								</div>

								<div class="rounded-lg bg-gray-700/50 p-6">
									<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
										<Globe class="h-5 w-5 text-green-500" />
										Multi-Language Support
									</h3>
									<p class="text-sm text-gray-300">
										Access resources in multiple languages from the Door43 catalog with unified API
										endpoints.
									</p>
								</div>

								<div class="rounded-lg bg-gray-700/50 p-6">
									<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
										<Activity class="h-5 w-5 text-purple-500" />
										Real-time Monitoring
									</h3>
									<p class="text-sm text-gray-300">
										Comprehensive health monitoring with performance metrics and status tracking for
										all endpoints.
									</p>
								</div>
							</div>

							<div class="rounded-lg bg-gray-700/30 p-6">
								<h3 class="mb-4 text-lg font-semibold text-white">Usage Methods</h3>
								<div class="space-y-4">
									<div>
										<h4 class="mb-2 font-medium text-white">🔌 Local MCP Server</h4>
										<code class="rounded bg-gray-900 px-3 py-1 text-sm text-green-400">
											npm start
										</code>
										<p class="mt-1 text-sm text-gray-400">
											Traditional MCP server with WebSocket connection
										</p>
									</div>
									<div>
										<h4 class="mb-2 font-medium text-white">🌐 HTTP/Web API</h4>
										<code class="rounded bg-gray-900 px-3 py-1 text-sm text-blue-400">
											https://translation-helps-mcp.pages.dev/api/mcp
										</code>
										<p class="mt-1 text-sm text-gray-400">
											Stateless HTTP endpoint for all MCP tools
										</p>
									</div>
									<div>
										<h4 class="mb-2 font-medium text-white">⚡ Direct API Endpoints</h4>
										<code class="rounded bg-gray-900 px-3 py-1 text-sm text-purple-400">
											https://translation-helps-mcp.pages.dev/api/fetch-scripture
										</code>
										<p class="mt-1 text-sm text-gray-400">
											Direct access to individual endpoint functionality
										</p>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Health Status -->
					{#if selectedCategory === 'health'}
						<div class="space-y-6">
							<h2 class="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
								<Activity class="h-6 w-6" />
								API Health Status
							</h2>

							{#if healthLoading}
								<div class="py-8 text-center">
									<div
										class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"
									></div>
									<p class="mt-4 text-gray-400">Loading health status...</p>
								</div>
							{:else if healthData && healthData.summary}
								<!-- Summary Cards -->
								<div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
									<div class="rounded-lg bg-gray-700/50 p-4 text-center">
										<div class="text-2xl font-bold text-white">
											{healthData.summary.totalEndpoints || 0}
										</div>
										<div class="text-sm text-gray-400">Total Endpoints</div>
									</div>
									<div class="rounded-lg bg-gray-700/50 p-4 text-center">
										<div class="text-2xl font-bold text-green-500">
											{healthData.summary.healthyEndpoints || 0}
										</div>
										<div class="text-sm text-gray-400">Healthy</div>
									</div>
									<div class="rounded-lg bg-gray-700/50 p-4 text-center">
										<div class="text-2xl font-bold text-yellow-500">
											{healthData.summary.warningEndpoints || 0}
										</div>
										<div class="text-sm text-gray-400">Warnings</div>
									</div>
									<div class="rounded-lg bg-gray-700/50 p-4 text-center">
										<div class="text-2xl font-bold text-red-500">
											{healthData.summary.errorEndpoints || 0}
										</div>
										<div class="text-sm text-gray-400">Errors</div>
									</div>
								</div>

								<!-- Endpoint Details -->
								<div class="space-y-3">
									{#each healthData.endpoints as endpoint}
										<div class="rounded-lg bg-gray-700/30 p-4">
											<!-- Main endpoint status -->
											<div class="mb-3 flex items-center justify-between">
												<div class="flex items-center gap-3">
													{#if endpoint.status === 'healthy'}
														<CheckCircle class="h-5 w-5 text-green-500" />
													{:else if endpoint.status === 'warning'}
														<AlertCircle class="h-5 w-5 text-yellow-500" />
													{:else}
														<AlertCircle class="h-5 w-5 text-red-500" />
													{/if}
													<div>
														<div class="font-medium text-white">{endpoint.name}</div>
														<div class="text-sm text-gray-400">/api/{endpoint.name}</div>
													</div>
												</div>
												<div class="text-right">
													<div class="text-sm font-medium {getStatusClass(endpoint.status)}">
														{endpoint.status.toUpperCase()}
													</div>
													<div class="text-xs text-gray-400">
														avg {endpoint.responseTime}ms
													</div>
												</div>
											</div>

											<!-- Cache vs Bypass Details -->
											{#if endpoint.cached && endpoint.bypassed}
												<div class="grid grid-cols-2 gap-3 border-t border-gray-600 pt-3">
													<!-- Cached Result -->
													<div class="rounded bg-gray-800/50 p-3">
														<div class="mb-2 flex items-center justify-between">
															<div class="flex items-center gap-2">
																<div
																	class="h-2 w-2 rounded-full {endpoint.cached.status === 'healthy'
																		? 'bg-green-500'
																		: endpoint.cached.status === 'warning'
																			? 'bg-yellow-500'
																			: 'bg-red-500'}"
																></div>
																<span class="text-sm font-medium text-gray-300">Cached</span>
															</div>
															<span class="text-xs text-gray-400"
																>{endpoint.cached.responseTime}ms</span
															>
														</div>
														{#if endpoint.cached.cacheStatus}
															<div class="text-xs text-gray-500">
																{endpoint.cached.cacheStatus}
															</div>
														{/if}
														{#if endpoint.cached.error}
															<div class="mt-1 text-xs text-red-400">
																{endpoint.cached.error}
															</div>
														{/if}
													</div>

													<!-- Bypassed Result -->
													<div class="rounded bg-gray-800/50 p-3">
														<div class="mb-2 flex items-center justify-between">
															<div class="flex items-center gap-2">
																<div
																	class="h-2 w-2 rounded-full {endpoint.bypassed.status ===
																	'healthy'
																		? 'bg-green-500'
																		: endpoint.bypassed.status === 'warning'
																			? 'bg-yellow-500'
																			: 'bg-red-500'}"
																></div>
																<span class="text-sm font-medium text-gray-300">Bypassed</span>
															</div>
															<span class="text-xs text-gray-400"
																>{endpoint.bypassed.responseTime}ms</span
															>
														</div>
														{#if endpoint.bypassed.cacheStatus}
															<div class="text-xs text-gray-500">
																{endpoint.bypassed.cacheStatus}
															</div>
														{/if}
														{#if endpoint.bypassed.error}
															<div class="mt-1 text-xs text-red-400">
																{endpoint.bypassed.error}
															</div>
														{/if}
													</div>
												</div>
											{/if}
										</div>
									{/each}
								</div>

								<div class="mt-6 text-center">
									<button
										class="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
										on:click={loadHealthCheck}
									>
										Refresh Status
									</button>
								</div>
							{:else}
								<div class="py-8 text-center">
									<AlertCircle class="mx-auto mb-4 h-12 w-12 text-red-500" />
									<p class="text-gray-400">Failed to load health status</p>
									<button
										class="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
										on:click={loadHealthCheck}
									>
										Retry
									</button>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Category Overview -->
					{#if selectedCategory === 'core' || selectedCategory === 'linked' || selectedCategory === 'experimental'}
						<div class="space-y-6">
							<h2 class="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
								<svelte:component this={categories[selectedCategory].icon} class="h-6 w-6" />
								{categories[selectedCategory].name}
							</h2>

							<p class="mb-8 text-gray-300">
								{categories[selectedCategory].description}
							</p>

							<div class="grid gap-4">
								{#each mcpTools[selectedCategory] as tool}
									<div
										class="cursor-pointer rounded-lg bg-gray-700/30 p-6 transition-all hover:bg-gray-700/50"
										on:click={() => selectTool(tool)}
									>
										<div class="flex items-start justify-between">
											<div class="flex items-start gap-3">
												<svelte:component this={tool.icon} class="mt-1 h-5 w-5 text-purple-400" />
												<div>
													<h3 class="mb-2 font-semibold text-white">{tool.name}</h3>
													<p class="mb-3 text-sm text-gray-300">{tool.description}</p>
													<div class="flex items-center gap-4 text-xs">
														<span class="rounded bg-gray-600 px-2 py-1 text-gray-300">
															{tool.apiEndpoint}
														</span>
														{#if healthData}
															{@const health = getEndpointHealth(tool.apiEndpoint)}
															{#if health}
																<span
																	class="flex items-center gap-1 {getStatusClass(health.status)}"
																>
																	{#if health.status === 'healthy'}
																		<CheckCircle class="h-3 w-3" />
																	{:else}
																		<AlertCircle class="h-3 w-3" />
																	{/if}
																	{health.status}
																</span>
															{/if}
														{/if}
													</div>
												</div>
											</div>
											<ExternalLink class="h-4 w-4 text-gray-400" />
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Individual Tool Documentation -->
					{#if selectedTool}
						<div class="space-y-6">
							<div class="mb-6 flex items-center gap-3">
								<svelte:component this={selectedTool.icon} class="h-6 w-6 text-purple-400" />
								<h2 class="text-2xl font-bold text-white">{selectedTool.name}</h2>
								{#if healthData}
									{@const health = getEndpointHealth(selectedTool.apiEndpoint)}
									{#if health}
										<span class="flex items-center gap-1 text-sm {getStatusClass(health.status)}">
											{#if health.status === 'healthy'}
												<CheckCircle class="h-4 w-4" />
											{:else}
												<AlertCircle class="h-4 w-4" />
											{/if}
											{health.status} ({health.responseTime}ms)
										</span>
									{/if}
								{/if}
							</div>

							<p class="text-lg text-gray-300">{selectedTool.description}</p>

							<!-- API Endpoint -->
							<div class="rounded-lg bg-gray-700/30 p-4">
								<h3 class="mb-2 font-semibold text-white">API Endpoint</h3>
								<code class="block rounded bg-gray-900 px-3 py-2 text-green-400">
									{selectedTool.apiEndpoint}
								</code>
							</div>

							<!-- Parameters -->
							{#if selectedTool.parameters && selectedTool.parameters.length > 0}
								<div class="rounded-lg bg-gray-700/30 p-4">
									<h3 class="mb-4 font-semibold text-white">Parameters</h3>
									<div class="space-y-3">
										{#each selectedTool.parameters as param}
											<div class="flex items-start gap-3">
												<div class="flex-1">
													<div class="mb-1 flex items-center gap-2">
														<code class="font-mono text-purple-400">{param.name}</code>
														<span class="rounded bg-gray-600 px-2 py-1 text-xs text-gray-300">
															{param.type}
														</span>
														{#if param.required}
															<span class="rounded bg-red-600 px-2 py-1 text-xs text-white"
																>required</span
															>
														{:else}
															<span class="rounded bg-gray-500 px-2 py-1 text-xs text-gray-300"
																>optional</span
															>
														{/if}
													</div>
													<p class="text-sm text-gray-300">{param.description}</p>
													{#if param.default}
														<p class="mt-1 text-xs text-gray-400">Default: {param.default}</p>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Interactive Tester -->
							<div class="rounded-lg bg-gray-700/30 p-6">
								<h3 class="mb-4 flex items-center gap-2 font-semibold text-white">
									<Zap class="h-5 w-5" />
									Try It Out
								</h3>
								<ApiTester
									endpoint={{
										name: selectedTool.name,
										path: selectedTool.apiEndpoint,
										parameters: selectedTool.parameters || [],
										example: { request: selectedTool.exampleRequest }
									}}
									loading={loadingStates[selectedTool.apiEndpoint]}
									on:test={handleTest}
								/>

								{#if responses[selectedTool.apiEndpoint]}
									<div class="mt-6">
										<ResponseDisplay response={responses[selectedTool.apiEndpoint]} />
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
