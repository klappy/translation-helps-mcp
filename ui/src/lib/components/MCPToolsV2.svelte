<script lang="ts">
	import {
		Activity,
		Beaker,
		Check,
		ChevronRight,
		Copy,
		Database,
		Info,
		Link
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import ApiTester from './ApiTester.svelte';
	import PerformanceMetrics from './PerformanceMetrics.svelte';

	// Dynamic imports to avoid SSR issues
	let endpointRegistry: any;
	let initializeAllEndpoints: any;

	// Categories aligned with three-tier architecture
	type CoreCategory = 'core' | 'extended' | 'experimental';
	type AllCategory = 'overview' | 'health' | CoreCategory | 'endpoint-detail';
	const categoryConfig = {
		overview: { name: 'Overview', icon: Info },
		health: { name: 'Health Status', icon: Activity },
		core: { name: 'Core Endpoints', icon: Database },
		extended: { name: 'Extended Features', icon: Link },
		experimental: { name: 'Experimental Lab', icon: Beaker }
	} as const;

	// State
	let selectedCategory: string = 'overview';
	let selectedEndpoint: any = null;
	let coreEndpoints: any[] = [];
	let extendedEndpoints: any[] = [];
	let experimentalEndpoints: any[] = [];
	let copiedExample: number | null = null;
	let performanceData: Record<string, any> = {};
	let loadingError: any = null;
	let apiResult: any = null;
	let isLoading: boolean = false;

	// Load endpoints from configuration
	onMount(async () => {
		try {
			console.log('🔧 Initializing MCP Tools with real endpoint configurations...');
			
			// Dynamic import to avoid SSR issues with cross-project imports
			// @ts-ignore - importing compiled JS module
			const endpointModule = await import('../../../../dist/src/config/endpoints/index');
			endpointRegistry = endpointModule.endpointRegistry;
			initializeAllEndpoints = endpointModule.initializeAllEndpoints;
			
			// Initialize all endpoint configurations
			initializeAllEndpoints();
			
			// Load core endpoints (category: 'core')
			coreEndpoints = await loadEndpointConfigs('core');
			console.log(`✅ Loaded ${coreEndpoints.length} core endpoints`);
			
			// Load extended endpoints (category: 'extended') 
			extendedEndpoints = await loadEndpointConfigs('extended');
			console.log(`✅ Loaded ${extendedEndpoints.length} extended endpoints`);
			
			// Load experimental endpoints (category: 'experimental')
			experimentalEndpoints = await loadEndpointConfigs('experimental');
			console.log(`✅ Loaded ${experimentalEndpoints.length} experimental endpoints`);
			
			console.log('🎉 MCP Tools successfully connected to configuration system!');
		} catch (error) {
			console.error('❌ Failed to load endpoint configurations:', error);
			loadingError = error instanceof Error ? error.message : String(error);
		}
	});

	// Load endpoint configurations from registry
	async function loadEndpointConfigs(category: CoreCategory) {
		try {
			if (category === 'experimental') {
				// Manual experimental endpoints list (not yet in configuration system)
				return [
					{
						name: 'resource-recommendations',
						title: 'AI Resource Recommendations',
						description: 'Intelligent, context-aware resource suggestions powered by AI',
						path: '/api/resource-recommendations',
						category: 'experimental',
						tags: ['ai', 'recommendations', 'experimental'],
						enabled: true,
						examples: [
							{
								title: 'Get recommendations for John 3:16',
								params: { reference: 'John 3:16', language: 'en', organization: 'unfoldingWord' }
							}
						],
						experimental: {
							warning: 'Uses experimental AI features. Results may vary.',
							stability: 'alpha',
							lastUpdated: '2024-01-01'
						}
					},
					{
						name: 'chat',
						title: 'AI Chat Interface',
						description: 'Interactive chat with translation helps AI assistant',
						path: '/api/chat',
						category: 'experimental',
						tags: ['ai', 'chat', 'experimental'],
						enabled: true,
						examples: [
							{
								title: 'Ask about a Bible verse',
								params: { message: 'What does John 3:16 mean?', context: 'translation' }
							}
						],
						experimental: {
							warning: 'AI responses are experimental and should be verified.',
							stability: 'beta',
							lastUpdated: '2024-01-01'
						}
					},
					{
						name: 'chat-stream',
						title: 'Streaming AI Chat',
						description: 'Real-time streaming chat responses from AI assistant',
						path: '/api/chat-stream',
						category: 'experimental',
						tags: ['ai', 'chat', 'streaming', 'experimental'],
						enabled: true,
						examples: [
							{
								title: 'Stream a conversation',
								params: { message: 'Explain the Trinity', stream: true }
							}
						],
						experimental: {
							warning: 'Streaming responses are experimental.',
							stability: 'alpha',
							lastUpdated: '2024-01-01'
						}
					},
					{
						name: 'mcp',
						title: 'MCP Tools Server',
						description: 'Model Context Protocol server for AI assistant integration',
						path: '/api/mcp',
						category: 'experimental',
						tags: ['mcp', 'integration', 'experimental'],
						enabled: true,
						examples: [
							{
								title: 'Get available MCP tools',
								params: { action: 'list-tools' }
							}
						],
						experimental: {
							warning: 'MCP integration is experimental.',
							stability: 'beta',
							lastUpdated: '2024-01-01'
						}
					}
				];
			}
			return endpointRegistry.getByCategory(category);
		} catch (error) {
			console.error(`Failed to load ${category} endpoints:`, error);
			return [];
		}
	}

	// Get endpoints by three-tier architecture category
	function getEndpointsByCategory(category: CoreCategory) {
		switch (category) {
			case 'core':
				return coreEndpoints;
			case 'extended':
				return extendedEndpoints;
			case 'experimental':
				return experimentalEndpoints;
			default:
				return [];
		}
	}

	// Copy example to clipboard
	async function copyExample(example: any, index: number) {
		try {
			await navigator.clipboard.writeText(JSON.stringify(example.params, null, 2));
			copiedExample = index;
			setTimeout(() => {
				copiedExample = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	// Handle endpoint selection
	function selectEndpoint(endpoint: any) {
		// Transform endpoint config to ApiTester format
		selectedEndpoint = transformEndpointForTesting(endpoint);
		selectedCategory = 'endpoint-detail';
		// Clear previous results when selecting new endpoint
		apiResult = null;
		isLoading = false;
	}

	// Transform endpoint config to format expected by ApiTester
	function transformEndpointForTesting(endpoint: any) {
		const transformed = {
			...endpoint,
			parameters: [],
			example: null
		};

		// Convert params object to parameters array
		if (endpoint.params) {
			transformed.parameters = Object.entries(endpoint.params).map(([name, config]: [string, any]) => ({
				name,
				type: config.type,
				required: config.required || false,
				description: config.description || '',
				default: config.default,
				options: config.options,
				example: config.example,
				min: config.min,
				max: config.max,
				pattern: config.pattern
			}));
		}

		// Use first example for default values
		if (endpoint.examples && endpoint.examples.length > 0) {
			transformed.example = {
				request: endpoint.examples[0].params || {},
				response: endpoint.examples[0].expectedResponse || endpoint.examples[0].expectedContent || {}
			};
		}

		return transformed;
	}

	// Handle API response
	function handleApiResponse(endpoint: any, response: any) {
		const metadata = response.metadata || {};
		const xrayTrace = metadata.xrayTrace || {};
		
		performanceData[endpoint.name] = {
			// Basic performance
			responseTime: metadata.responseTime,
			cached: metadata.cached,
			cacheStatus: metadata.cacheStatus,
			timestamp: new Date(),
			
			// X-ray trace data
			traceId: xrayTrace.traceId,
			mainEndpoint: xrayTrace.mainEndpoint,
			totalDuration: xrayTrace.totalDuration,
			
			// Cache performance stats
			cacheStats: xrayTrace.cacheStats ? {
				hits: xrayTrace.cacheStats.hits,
				misses: xrayTrace.cacheStats.misses,
				total: xrayTrace.cacheStats.total,
				hitRate: xrayTrace.cacheStats.hitRate
			} : null,
			
			// Performance metrics
			performance: xrayTrace.performance ? {
				fastest: xrayTrace.performance.fastest,
				slowest: xrayTrace.performance.slowest,
				average: xrayTrace.performance.average
			} : null,
			
			// API call details
			calls: xrayTrace.calls || [],
			
			// Additional metadata
			format: metadata.format,
			translationsFound: metadata.translationsFound,
			filesFound: metadata.filesFound,
			booksFound: metadata.booksFound,
			languagesFound: metadata.languagesFound,
			
			// Debug info
			debug: {
				cacheKey: metadata.cacheKey,
				success: metadata.success,
				status: metadata.status,
				fullMetadata: metadata
			}
		};
		
		console.log(`📊 Performance data captured for ${endpoint.name}:`, performanceData[endpoint.name]);
	}

	// Handle API test requests from ApiTester component
	async function handleApiTest(event: any) {
		const { endpoint, formData } = event.detail;
		
		console.log(`🧪 Testing endpoint: ${endpoint.name}`, formData);
		
		// Set loading state
		isLoading = true;
		apiResult = null;
		
		try {
			// Build query string from formData
			const params = new URLSearchParams();
			Object.entries(formData).forEach(([key, value]) => {
				if (value !== null && value !== undefined && value !== '') {
					params.append(key, String(value));
				}
			});
			
			const queryString = params.toString();
			const url = `/api${endpoint.path}${queryString ? `?${queryString}` : ''}`;
			
			console.log(`🚀 Making request to: ${url}`);
			
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				}
			});
			
			const responseData = await response.json();
			console.log(`✅ Response received:`, responseData);
			
			// Set the result for display
			apiResult = responseData;
			
			// Process response and extract performance data
			handleApiResponse(endpoint, responseData);
			
		} catch (error: any) {
			console.error(`❌ API test failed for ${endpoint.name}:`, error);
			loadingError = `Failed to test ${endpoint.name}: ${error.message || error}`;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="mb-4 text-4xl font-bold text-white">MCP Tools Interface</h1>
		<p class="text-lg text-gray-300">
			Complete visibility into all translation helps endpoints with real-time performance metrics
		</p>
	</div>

	<!-- Tabs for Core vs Experimental -->
	<div class="mb-6 flex border-b border-gray-700">
		<button
			class="tab-button"
			class:active={selectedCategory !== 'experimental'}
			on:click={() => selectedCategory = selectedCategory === 'experimental' ? 'overview' : selectedCategory}
		>
			Core Tools
		</button>
		<button
			class="tab-button"
			class:active={selectedCategory === 'experimental'}
			on:click={() => selectedCategory = 'experimental'}
		>
			🧪 Experimental Lab
		</button>
	</div>

	<!-- Error Display -->
	{#if loadingError}
		<div class="mb-6 rounded-lg border border-red-500/30 bg-red-900/10 p-4">
			<div class="flex items-start space-x-3">
				<div class="mt-1 h-5 w-5 text-red-400">⚠️</div>
				<div>
					<h3 class="text-lg font-semibold text-red-400">Error</h3>
					<p class="mt-1 text-sm text-red-300">{loadingError}</p>
					<button
						class="mt-2 text-xs text-red-400 underline hover:text-red-300"
						on:click={() => loadingError = null}
					>
						Dismiss
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Left Sidebar - Categories/Endpoints -->
		<div class="lg:col-span-1">
			{#if selectedEndpoint}
				<!-- Endpoint Details -->
				<button
					class="mb-4 flex items-center text-sm text-blue-400 hover:text-blue-300"
					on:click={() => {
						selectedEndpoint = null;
						if (selectedCategory === null) selectedCategory = 'overview';
					}}
				>
					← Back to categories
				</button>

				<div class="rounded-lg border border-gray-700 bg-gray-800 p-6">
					<h3 class="mb-2 text-xl font-semibold text-white">{selectedEndpoint.name}</h3>
					<p class="mb-4 text-sm text-gray-300">{selectedEndpoint.description}</p>

					<div class="mb-4">
						<span class="text-xs font-medium text-gray-400">ENDPOINT</span>
						<code class="mt-1 block rounded bg-gray-900 px-3 py-2 text-sm text-green-400">
							{selectedEndpoint.path}
						</code>
					</div>

					{#if selectedEndpoint.performance}
						<div class="flex items-center justify-between text-sm">
							<span class="text-gray-400">Expected response time</span>
							<span class="font-medium text-white">{selectedEndpoint.performance.expectedMs}ms</span>
						</div>
					{/if}
				</div>
			{:else if selectedCategory === 'experimental'}
				<!-- Experimental Lab Header with Warning -->
				<div class="mb-6 rounded-lg border border-orange-500/30 bg-orange-900/10 p-4">
					<div class="flex items-start space-x-3">
						<Beaker class="mt-1 h-5 w-5 text-orange-400" />
						<div>
							<h3 class="text-lg font-semibold text-orange-400">🧪 Experimental Lab</h3>
							<p class="mt-1 text-sm text-orange-300">
								These features are in active development and may be unstable. Use with caution in production environments.
							</p>
						</div>
					</div>
				</div>

				<!-- Experimental Endpoints List -->
				<div class="space-y-3">
					{#each experimentalEndpoints as endpoint}
						<div
							class="endpoint-card border-orange-500/20 hover:border-orange-500/40"
							class:selected={selectedEndpoint === endpoint}
							on:click={() => selectEndpoint(endpoint)}
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center space-x-2">
										<h4 class="font-medium text-white">{endpoint.title || endpoint.name}</h4>
										{#if endpoint.experimental?.stability}
											<span class="rounded-full px-2 py-0.5 text-xs font-medium
												{endpoint.experimental.stability === 'alpha' ? 'bg-red-900/30 text-red-400' : 
												 endpoint.experimental.stability === 'beta' ? 'bg-yellow-900/30 text-yellow-400' : 
												 'bg-green-900/30 text-green-400'}">
												{endpoint.experimental.stability}
											</span>
										{/if}
									</div>
									<p class="mt-1 text-sm text-gray-400">{endpoint.description}</p>
									{#if endpoint.experimental?.warning}
										<p class="mt-2 text-xs text-orange-400">⚠️ {endpoint.experimental.warning}</p>
									{/if}
								</div>
								<ChevronRight class="h-4 w-4 text-gray-500" />
							</div>
						</div>
					{/each}
					{#if experimentalEndpoints.length === 0}
						<div class="rounded-lg border border-gray-700 bg-gray-800/30 p-6 text-center">
							<Beaker class="mx-auto h-8 w-8 text-gray-500" />
							<p class="mt-2 text-sm text-gray-500">No experimental features available</p>
							<p class="mt-1 text-xs text-gray-600">Check back later for cutting-edge features!</p>
						</div>
					{/if}
				</div>
			{:else if selectedCategory && selectedCategory !== 'overview' && selectedCategory !== 'health'}
				<!-- Endpoints for Selected Category -->
				<h3 class="mb-4 text-lg font-semibold text-white">
					{categoryConfig[selectedCategory as keyof typeof categoryConfig]?.name} Endpoints
				</h3>
				<div class="space-y-3">
					{#each getEndpointsByCategory(selectedCategory as CoreCategory) as endpoint}
						<div
							class="endpoint-card"
							class:selected={selectedEndpoint === endpoint}
							on:click={() => selectEndpoint(endpoint)}
						>
							<h4 class="font-medium text-white">{endpoint.name}</h4>
							<p class="mt-1 text-sm text-gray-400">{endpoint.description}</p>
						</div>
					{/each}
				</div>
			{:else}
				<!-- Category Grid -->
				<h3 class="mb-4 text-lg font-semibold text-white">Categories</h3>
				<div class="space-y-3">
					{#each Object.entries(categoryConfig) as [key, config]}
						{#if key !== 'experimental'}
							<div
								class="category-card"
								class:selected={selectedCategory === key}
								on:click={() => {
									selectedCategory = key as AllCategory;
									selectedEndpoint = null;
								}}
							>
								<div class="flex items-start space-x-3">
									<svelte:component this={config.icon} class="mt-1 h-5 w-5 text-blue-400" />
									<div class="flex-1">
										<h4 class="font-medium text-white">{config.name}</h4>
										{#if key === 'overview'}
											<p class="mt-1 text-sm text-gray-400">Start here for MCP Tools overview and documentation</p>
										{:else if key === 'health'}
											<p class="mt-1 text-sm text-gray-400">System status and endpoint health monitoring</p>
										{:else if key === 'core'}
											<p class="mt-1 text-sm text-gray-400">Fast, direct access to Door43 resources with minimal processing</p>
										{:else if key === 'extended'}
											<p class="mt-1 text-sm text-gray-400">Intelligent features that combine resources for enhanced workflows</p>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>

		<!-- Right Content Area -->
		<div class="lg:col-span-2">
			{#if selectedEndpoint}
				<!-- Endpoint Testing Interface -->
				<div class="space-y-6">
					<!-- Parameter Form -->
					<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
						<h3 class="mb-4 text-lg font-semibold text-white">Parameters</h3>
						<ApiTester
							endpoint={selectedEndpoint}
							loading={isLoading}
							result={apiResult}
							on:test={handleApiTest}
						/>
					</div>

					<!-- Examples -->
					{#if selectedEndpoint.examples?.length > 0}
						<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
							<div class="mb-4 flex items-center justify-between">
								<h3 class="text-lg font-semibold text-white">Real Data Examples</h3>
								<span class="rounded-full bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-400">
									{selectedEndpoint.examples.length} example{selectedEndpoint.examples.length !== 1 ? 's' : ''}
								</span>
							</div>
							<div class="space-y-4">
								{#each selectedEndpoint.examples as example, index}
									<div class="example-card border border-gray-600/50">
										<div class="mb-3 flex items-start justify-between">
											<div class="flex-1">
												<h4 class="font-medium text-white">
													{example.name || example.title || `Example ${index + 1}`}
												</h4>
												{#if example.description}
													<p class="mt-1 text-sm text-gray-400">{example.description}</p>
												{/if}
											</div>
											<button
												class="flex items-center space-x-1 rounded px-2 py-1 text-xs text-blue-400 hover:bg-blue-900/20 hover:text-blue-300"
												on:click={() => copyExample(example, index)}
											>
												{#if copiedExample === index}
													<Check class="h-3 w-3" />
													<span>Copied!</span>
												{:else}
													<Copy class="h-3 w-3" />
													<span>Copy Params</span>
												{/if}
											</button>
										</div>
										
										<!-- Parameters -->
										<div class="mb-3">
											<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Parameters</span>
											<pre class="mt-1 overflow-x-auto rounded bg-gray-900 p-3 text-sm">
<code class="text-green-400">{JSON.stringify(example.params, null, 2)}</code></pre>
										</div>

										<!-- Expected Content (if available) -->
										{#if example.expectedContent}
											<div class="mt-3 rounded bg-gray-900/50 p-3">
												<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Expected Response</span>
												<div class="mt-2 space-y-2">
													{#if example.expectedContent.contains?.length > 0}
														<div>
															<span class="text-xs text-blue-400">Contains:</span>
															<div class="mt-1 flex flex-wrap gap-1">
																{#each example.expectedContent.contains as pattern}
																	<span class="rounded bg-blue-900/20 px-2 py-0.5 text-xs text-blue-300">{pattern}</span>
																{/each}
															</div>
														</div>
													{/if}
													{#if example.expectedContent.minLength}
														<div>
															<span class="text-xs text-gray-400">Min length: </span>
															<span class="text-xs text-white">{example.expectedContent.minLength} chars</span>
														</div>
													{/if}
													{#if example.expectedContent.fields}
														<div>
															<span class="text-xs text-gray-400">Fields: </span>
															<code class="text-xs text-gray-300">{Object.keys(example.expectedContent.fields).join(', ')}</code>
														</div>
													{/if}
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Performance Metrics -->
					{#if performanceData[selectedEndpoint.name]}
						<PerformanceMetrics data={performanceData[selectedEndpoint.name]} />
					{/if}
				</div>
			{:else if selectedCategory === 'overview'}
				<!-- Overview Content -->
				<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-8">
					<h2 class="mb-4 text-2xl font-bold text-white">Welcome to MCP Tools</h2>
					<p class="mb-6 text-gray-300">
						This interface provides complete visibility into all translation helps endpoints. 
						Select a category to explore available tools, test parameters, and monitor performance.
					</p>

					<div class="space-y-4">
						<div class="flex items-start space-x-3">
							<Database class="mt-1 h-5 w-5 text-blue-400" />
							<div>
								<h3 class="font-medium text-white">Core Tools</h3>
								<p class="text-sm text-gray-400">
									Production-ready endpoints for scripture, translation helps, and resource discovery
								</p>
							</div>
						</div>

						<div class="flex items-start space-x-3">
							<Activity class="mt-1 h-5 w-5 text-green-400" />
							<div>
								<h3 class="font-medium text-white">Real-time Metrics</h3>
								<p class="text-sm text-gray-400">
									Monitor response times, cache performance, and endpoint health
								</p>
							</div>
						</div>

						<div class="flex items-start space-x-3">
							<Beaker class="mt-1 h-5 w-5 text-purple-400" />
							<div>
								<h3 class="font-medium text-white">Experimental Lab</h3>
								<p class="text-sm text-gray-400">
									Test cutting-edge features in a separate, clearly marked section
								</p>
							</div>
						</div>
					</div>
				</div>
			{:else if selectedCategory === 'health'}
				<!-- Health Status -->
				<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-8">
					<h2 class="mb-4 text-2xl font-bold text-white">API Health Status</h2>
					<p class="text-gray-300">Real-time monitoring of all endpoints coming soon...</p>
				</div>
			{:else if selectedCategory === 'core'}
				<!-- Core Endpoints -->
				<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
					<h2 class="mb-4 text-2xl font-bold text-white">Core Endpoints</h2>
					<p class="mb-6 text-gray-300">Production-ready endpoints for scripture, translation helps, and resource discovery</p>
					
					{#if coreEndpoints.length > 0}
						<div class="grid gap-4 sm:grid-cols-2">
							{#each coreEndpoints as endpoint}
								<div class="endpoint-card" on:click={() => selectEndpoint(endpoint)}>
									<div class="mb-2 flex items-start justify-between">
										<h3 class="font-semibold text-white">{endpoint.title || endpoint.name}</h3>
										<span class="text-xs text-blue-400">{endpoint.path}</span>
									</div>
									<p class="mb-3 text-sm text-gray-400">{endpoint.description}</p>
									<div class="flex items-center justify-between text-xs">
										<span class="text-gray-500">{Object.keys(endpoint.params || {}).length} parameters</span>
										{#if endpoint.examples?.length > 0}
											<span class="text-green-400">{endpoint.examples.length} example{endpoint.examples.length !== 1 ? 's' : ''}</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-400">Loading core endpoints...</p>
					{/if}
				</div>

			{:else if selectedCategory === 'extended'}
				<!-- Extended Endpoints -->
				<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
					<h2 class="mb-4 text-2xl font-bold text-white">Extended Features</h2>
					<p class="mb-6 text-gray-300">Intelligent features that combine resources for enhanced workflows</p>
					
					{#if extendedEndpoints.length > 0}
						<div class="grid gap-4 sm:grid-cols-2">
							{#each extendedEndpoints as endpoint}
								<div class="endpoint-card" on:click={() => selectEndpoint(endpoint)}>
									<div class="mb-2 flex items-start justify-between">
										<h3 class="font-semibold text-white">{endpoint.title || endpoint.name}</h3>
										<span class="text-xs text-blue-400">{endpoint.path}</span>
									</div>
									<p class="mb-3 text-sm text-gray-400">{endpoint.description}</p>
									<div class="flex items-center justify-between text-xs">
										<span class="text-gray-500">{Object.keys(endpoint.params || {}).length} parameters</span>
										{#if endpoint.examples?.length > 0}
											<span class="text-green-400">{endpoint.examples.length} example{endpoint.examples.length !== 1 ? 's' : ''}</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-400">Loading extended endpoints...</p>
					{/if}
				</div>

			{:else if selectedCategory === 'experimental'}
				<!-- Experimental Endpoints -->
				<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
					<h2 class="mb-4 text-2xl font-bold text-white">🧪 Experimental Lab</h2>
					<p class="mb-6 text-gray-300">Test cutting-edge features in a separate, clearly marked section</p>
					
					{#if experimentalEndpoints.length > 0}
						<div class="grid gap-4 sm:grid-cols-2">
							{#each experimentalEndpoints as endpoint}
								<div class="endpoint-card border-purple-500/30" on:click={() => selectEndpoint(endpoint)}>
									<div class="mb-2 flex items-start justify-between">
										<h3 class="font-semibold text-white">🧪 {endpoint.title || endpoint.name}</h3>
										<span class="text-xs text-purple-400">{endpoint.path}</span>
									</div>
									<p class="mb-3 text-sm text-gray-400">{endpoint.description}</p>
									<div class="flex items-center justify-between text-xs">
										<span class="text-gray-500">{Object.keys(endpoint.params || {}).length} parameters</span>
										{#if endpoint.examples?.length > 0}
											<span class="text-green-400">{endpoint.examples.length} example{endpoint.examples.length !== 1 ? 's' : ''}</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-400">Loading experimental endpoints...</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.category-card {
		cursor: pointer;
		border-radius: 0.5rem;
		border: 1px solid rgb(55 65 81 / 1);
		background-color: rgb(31 41 55 / 0.5);
		padding: 1.5rem;
		transition: all 300ms;
	}

	.category-card:hover {
		border-color: rgb(59 130 246 / 0.5);
		background-color: rgb(31 41 55 / 1);
	}

	.category-card.selected {
		border-color: rgb(59 130 246 / 1);
		background-color: rgb(31 41 55 / 1);
	}

	.endpoint-card {
		cursor: pointer;
		border-radius: 0.5rem;
		border: 1px solid rgb(55 65 81 / 1);
		background-color: rgb(31 41 55 / 0.3);
		padding: 1rem;
		transition: all 300ms;
	}

	.endpoint-card:hover {
		border-color: rgb(59 130 246 / 0.3);
		background-color: rgb(31 41 55 / 0.5);
	}

	.endpoint-card.selected {
		border-color: rgb(59 130 246 / 1);
		background-color: rgb(31 41 55 / 0.7);
	}

	.tab-button {
		border-top-left-radius: 0.5rem;
		border-top-right-radius: 0.5rem;
		border-bottom: 2px solid;
		padding: 0.75rem 1.5rem;
		font-weight: 500;
		transition: all 300ms;
	}

	.tab-button.active {
		border-color: rgb(59 130 246 / 1);
		color: rgb(96 165 250 / 1);
	}

	.tab-button:not(.active) {
		border-color: transparent;
		color: rgb(156 163 175 / 1);
	}

	.tab-button:not(.active):hover {
		color: rgb(209 213 219 / 1);
	}
</style>