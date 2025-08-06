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

	// Three main categories
	type MainCategory = 'core' | 'extended' | 'experimental' | 'health';
	const categoryConfig = {
		core: { name: 'Core Tools', icon: Database },
		extended: { name: 'Extended Features', icon: Link },
		experimental: { name: 'Experimental Lab', icon: Beaker },
		health: { name: 'Health Status', icon: Activity }
	} as const;

	// State
	let selectedCategory: MainCategory = 'core';
	let selectedEndpoint: any = null;
	let coreEndpoints: any[] = [];
	let extendedEndpoints: any[] = [];
	let experimentalEndpoints: any[] = [];
	let loadingError: string | null = null;
	let isLoading = false;
	let apiResult: any = null;
	let copiedExample: number | null = null;
	let performanceData: any = {};
	let healthStatus: Record<string, {status: 'checking' | 'healthy' | 'error' | 'unknown', message?: string}> = {};
	let isCheckingHealth = false;

	// Load endpoints from configuration
	onMount(async () => {
		try {
			console.log('🔧 Initializing MCP Tools with real endpoint configurations...');
			
			// Fetch endpoint configurations from API
			const response = await fetch('/api/mcp-config');
			const configData = await response.json();
			
			if (!configData.success) {
				throw new Error(configData.message || 'Failed to load endpoint configurations');
			}
			
			// Load core endpoints (category: 'core')
			coreEndpoints = configData.data.core || [];
			console.log(`✅ Loaded ${coreEndpoints.length} core endpoints`);
			
			// Load extended endpoints (category: 'extended') 
			extendedEndpoints = configData.data.extended || [];
			console.log(`✅ Loaded ${extendedEndpoints.length} extended endpoints`);
			
			// Load experimental endpoints (category: 'experimental')
			experimentalEndpoints = configData.data.experimental || [];
			console.log(`✅ Loaded ${experimentalEndpoints.length} experimental endpoints`);
			
			console.log('🎉 MCP Tools successfully connected to configuration system!');
		} catch (error) {
			console.error('❌ Failed to load endpoint configurations:', error);
			loadingError = error instanceof Error ? error.message : String(error);
		}
	});

	// Get endpoints by category from our loaded state
	function getEndpointsByCategory(category: MainCategory) {
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

	// Group core endpoints by subcategory
	function groupCoreEndpoints(endpoints: any[]) {
		const groups: Record<string, any[]> = {
			scripture: [],
			translationHelps: [],
			discovery: []
		};

		endpoints.forEach(endpoint => {
			const name = endpoint.name.toLowerCase();
			if (name.includes('scripture') || name.includes('ult') || name.includes('ust')) {
				groups.scripture.push(endpoint);
			} else if (name.includes('translation')) {
				groups.translationHelps.push(endpoint);
			} else {
				groups.discovery.push(endpoint);
			}
		});

		return {
			'Scripture Resources': {
				icon: '📖',
				description: 'Access Bible texts in original and simplified languages',
				endpoints: groups.scripture
			},
			'Translation Helps': {
				icon: '📚',
				description: 'Questions, notes, word definitions, and study materials',
				endpoints: groups.translationHelps
			},
			'Discovery & Meta': {
				icon: '🔍',
				description: 'Explore available languages, books, and resources',
				endpoints: groups.discovery
			}
		};
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

	// Check health of a specific endpoint
	async function checkEndpointHealth(endpoint: any) {
		const healthKey = endpoint.path;
		healthStatus[healthKey] = { status: 'checking' };
		
		try {
			// Create a simple test request
			const testParams: any = {};
			
			// Add minimal required params for testing
			if (endpoint.name === 'fetchScripture' || endpoint.name === 'fetchUltScripture' || endpoint.name === 'fetchUstScripture') {
				testParams.reference = 'John 3:16';
				testParams.outputFormat = 'text';
			} else if (endpoint.name === 'fetchTranslationNotes') {
				testParams.reference = 'John 3:16';
			} else if (endpoint.name === 'fetchTranslationWords') {
				testParams.reference = 'John 3:16';
			} else if (endpoint.name === 'getTranslationWord') {
				testParams.word = 'faith';
			} else if (endpoint.name === 'browseTranslationWords' || endpoint.name === 'browseTranslationAcademy') {
				// No params needed
			} else if (endpoint.name === 'extractReferences') {
				testParams.text = 'Check John 3:16';
			} else if (endpoint.name === 'getAvailableBooks') {
				testParams.resource = 'tn';
			}
			
			const response = await fetch(endpoint.path, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(testParams)
			});
			
			if (response.ok) {
				const data = await response.json();
				if (data.success !== false) {
					healthStatus[healthKey] = { status: 'healthy', message: 'Endpoint responding correctly' };
				} else {
					healthStatus[healthKey] = { status: 'error', message: data.error || 'Endpoint returned error' };
				}
			} else {
				healthStatus[healthKey] = { status: 'error', message: `HTTP ${response.status}` };
			}
		} catch (error) {
			healthStatus[healthKey] = { 
				status: 'error', 
				message: error instanceof Error ? error.message : 'Network error' 
			};
		}
		
		// Trigger reactivity
		healthStatus = healthStatus;
	}
	
	// Check all endpoints health
	async function checkAllEndpointsHealth() {
		isCheckingHealth = true;
		const allEndpoints = [...coreEndpoints, ...extendedEndpoints, ...experimentalEndpoints];
		
		// Check all endpoints in parallel
		await Promise.all(allEndpoints.map(endpoint => checkEndpointHealth(endpoint)));
		
		isCheckingHealth = false;
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

	<!-- Three Main Tabs -->
	<div class="mb-6 flex space-x-1 rounded-lg bg-gray-800 p-1">
		<button
			class="tab-button touch-friendly flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
			class:active={selectedCategory === 'core'}
			on:click={() => {
				selectedCategory = 'core';
				selectedEndpoint = null;
			}}
		>
			Core Tools
		</button>
		<button
			class="tab-button touch-friendly flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
			class:active={selectedCategory === 'extended'}
			on:click={() => {
				selectedCategory = 'extended';
				selectedEndpoint = null;
			}}
		>
			Extended Features
		</button>
		<button
			class="tab-button touch-friendly flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
			class:active={selectedCategory === 'experimental'}
			on:click={() => {
				selectedCategory = 'experimental';
				selectedEndpoint = null;
			}}
		>
			🧪 Experimental Lab
		</button>
		<button
			class="tab-button touch-friendly flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
			class:active={selectedCategory === 'health'}
			on:click={() => {
				selectedCategory = 'health';
				selectedEndpoint = null;
			}}
		>
			💪 Health Status
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
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
		{#if selectedEndpoint}
			<!-- Endpoint Testing Interface (Full Width) -->
			<div class="space-y-6 lg:col-span-3">
				<!-- Back Button -->
				<button
					class="flex items-center text-sm text-blue-400 hover:text-blue-300 touch-friendly"
					on:click={() => {
						selectedEndpoint = null;
					}}
				>
					← Back to {categoryConfig[selectedCategory as keyof typeof categoryConfig]?.name || 'endpoints'}
				</button>

				<!-- Endpoint Details Card -->
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4 lg:p-6">
					<h3 class="mb-2 text-lg lg:text-xl font-semibold text-white">{selectedEndpoint.name}</h3>
					<p class="mb-4 text-sm text-gray-300">{selectedEndpoint.description}</p>

					<div class="space-y-3 text-sm">
						<div>
							<span class="font-medium text-gray-400">Endpoint:</span>
							<code class="ml-2 overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-900 px-2 py-1 text-xs text-blue-400">{selectedEndpoint.path}</code>
						</div>
						<div>
							<span class="font-medium text-gray-400">Category:</span>
							<span class="ml-2 capitalize text-white">{selectedEndpoint.category}</span>
						</div>
						{#if selectedEndpoint.tags?.length > 0}
							<div>
								<span class="font-medium text-gray-400">Tags:</span>
								<div class="mt-1 flex flex-wrap gap-1">
									{#each selectedEndpoint.tags as tag}
										<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">{tag}</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>

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
					<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-4 lg:p-6">
						<div class="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
							<h3 class="text-lg font-semibold text-white">Real Data Examples</h3>
							<span class="rounded-full bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-400 self-start sm:self-auto">
								{selectedEndpoint.examples.length} example{selectedEndpoint.examples.length !== 1 ? 's' : ''}
							</span>
						</div>
						<div class="space-y-4">
							{#each selectedEndpoint.examples as example, index}
								<details class="example-card border border-gray-600/50 group" open={index === 0}>
									<summary class="cursor-pointer p-4 hover:bg-gray-700/30 touch-friendly flex items-center justify-between">
										<div class="flex-1">
											<h4 class="font-medium text-white">
												{example.name || example.title || `Example ${index + 1}`}
											</h4>
											{#if example.description}
												<p class="mt-1 text-sm text-gray-400">{example.description}</p>
											{/if}
										</div>
										<button
											class="flex items-center space-x-1 rounded px-3 py-2 text-xs text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 touch-friendly"
											on:click|stopPropagation={() => copyExample(example, index)}
										>
											{#if copiedExample === index}
												<Check class="h-3 w-3" />
												<span class="hidden sm:inline">Copied!</span>
											{:else}
												<Copy class="h-3 w-3" />
												<span class="hidden sm:inline">Copy</span>
											{/if}
										</button>
									</summary>
									
									<div class="border-t border-gray-600/50 p-4">
										<!-- Parameters -->
										<div class="mb-3">
											<span class="text-xs font-medium text-gray-400 uppercase tracking-wide">Parameters</span>
											<pre class="mt-1 overflow-x-auto rounded bg-gray-900 p-3 text-xs lg:text-sm whitespace-pre-wrap break-words">
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
															<span class="text-xs text-blue-400">Expected fields:</span>
															<div class="mt-1 flex flex-wrap gap-1">
																{#each example.expectedContent.fields as field}
																	<span class="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">{field}</span>
																{/each}
															</div>
														</div>
													{/if}
												</div>
											</div>
										{/if}
									</div>
								</details>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Performance Metrics -->
				{#if performanceData[selectedEndpoint.name]}
					<PerformanceMetrics data={performanceData[selectedEndpoint.name]} />
				{/if}
			</div>
		{:else if selectedCategory === 'core'}
			{@const groupedEndpoints = groupCoreEndpoints(coreEndpoints)}
			<!-- Core Endpoints with Sidebar -->
			<!-- Left Sidebar -->
			<div class="lg:col-span-1">
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4 sticky top-4">
					<h3 class="mb-4 text-lg font-semibold text-white">Core Endpoints</h3>
					<div class="space-y-3">
						{#each Object.entries(groupedEndpoints) as [groupName, group]}
							<div>
								<h4 class="mb-2 flex items-center gap-2 text-sm font-medium text-gray-400">
									<span>{group.icon}</span>
									{groupName}
								</h4>
								<div class="space-y-1">
									{#each group.endpoints as endpoint}
										<button
											class="w-full rounded border border-gray-700/50 bg-gray-900/30 p-2 text-left text-sm transition-all hover:border-blue-500/50 hover:bg-gray-800/50"
											class:bg-blue-900/30={selectedEndpoint?.name === endpoint.name}
											class:border-blue-500/50={selectedEndpoint?.name === endpoint.name}
											on:click={() => selectEndpoint(endpoint)}
										>
											<div class="font-medium text-white">{endpoint.title || endpoint.name}</div>
											<div class="text-xs text-gray-500 truncate">{endpoint.path}</div>
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
			
			<!-- Main Content -->
			<div class="lg:col-span-2 rounded-lg border border-gray-700 bg-gray-800/50 p-4 lg:p-6">
				<h2 class="mb-4 text-2xl font-bold text-white">Core Endpoints</h2>
				<p class="mb-6 text-gray-300">Essential tools for Bible translation and study</p>
				
				{#if coreEndpoints.length > 0}
					<div class="space-y-8">
						{#each Object.entries(groupedEndpoints) as [groupName, group]}
							<div class="rounded-lg border border-gray-700/50 bg-gray-900/30 p-4">
								<div class="mb-4 flex items-center gap-3">
									<span class="text-2xl">{group.icon}</span>
									<div>
										<h3 class="text-lg font-semibold text-white">{groupName}</h3>
										<p class="text-sm text-gray-400">{group.description}</p>
									</div>
								</div>
								
								<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{#each group.endpoints as endpoint}
										<div 
											class="endpoint-card cursor-pointer border-gray-700/50 bg-gray-800/30 p-3 transition-all hover:border-blue-500/50 hover:bg-gray-800/50"
											on:click={() => selectEndpoint(endpoint)}
											on:keydown={(e) => e.key === 'Enter' && selectEndpoint(endpoint)}
											tabindex="0"
											role="button"
										>
											<div class="mb-1 flex items-start justify-between gap-2">
												<h4 class="text-sm font-medium text-white line-clamp-1">{endpoint.title || endpoint.name}</h4>
											</div>
											<p class="mb-2 text-xs text-gray-400 line-clamp-2">{endpoint.description}</p>
											<div class="flex items-center justify-between text-xs">
												<span class="text-gray-500">
													<code class="rounded bg-gray-900 px-1 py-0.5 text-xs">{endpoint.path}</code>
												</span>
												{#if endpoint.examples?.length > 0}
													<span class="text-green-400">
														<Check class="inline h-3 w-3" />
													</span>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-gray-400">Loading core endpoints...</p>
				{/if}
			</div>

		{:else if selectedCategory === 'extended'}
			<!-- Extended Endpoints with Sidebar -->
			<!-- Left Sidebar -->
			<div class="lg:col-span-1">
				<div class="rounded-lg border border-gray-700 bg-gray-800 p-4 sticky top-4">
					<h3 class="mb-4 text-lg font-semibold text-white">Extended Endpoints</h3>
					<div class="space-y-1">
						{#each extendedEndpoints as endpoint}
							<button
								class="w-full rounded border border-gray-700/50 bg-gray-900/30 p-2 text-left text-sm transition-all hover:border-blue-500/50 hover:bg-gray-800/50"
								class:bg-blue-900/30={selectedEndpoint?.name === endpoint.name}
								class:border-blue-500/50={selectedEndpoint?.name === endpoint.name}
								on:click={() => selectEndpoint(endpoint)}
							>
								<div class="font-medium text-white">{endpoint.title || endpoint.name}</div>
								<div class="text-xs text-gray-500 truncate">{endpoint.path}</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
			
			<!-- Main Content -->
			<div class="lg:col-span-2 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
				<h2 class="mb-4 text-2xl font-bold text-white">Extended Features</h2>
				<p class="mb-6 text-gray-300">Intelligent features that combine resources for enhanced workflows</p>
				
				{#if extendedEndpoints.length > 0}
					<div class="grid gap-4 sm:grid-cols-2">
						{#each extendedEndpoints as endpoint}
							<div 
								class="endpoint-card cursor-pointer transition-all"
								on:click={() => selectEndpoint(endpoint)}
								on:keydown={(e) => e.key === 'Enter' && selectEndpoint(endpoint)}
								tabindex="0"
								role="button"
							>
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
			<!-- Experimental Endpoints (Full Width for Safety) -->
			<div class="lg:col-span-3 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
				<h2 class="mb-4 text-2xl font-bold text-white">🧪 Experimental Lab</h2>
				<p class="mb-6 text-gray-300">Test cutting-edge features in a separate, clearly marked section</p>
				
				{#if experimentalEndpoints.length > 0}
					<div class="grid gap-4 sm:grid-cols-2">
						{#each experimentalEndpoints as endpoint}
							<div 
								class="endpoint-card border-purple-500/30 cursor-pointer transition-all"
								on:click={() => selectEndpoint(endpoint)}
								on:keydown={(e) => e.key === 'Enter' && selectEndpoint(endpoint)}
								tabindex="0"
								role="button"
							>
								<div class="mb-2 flex items-start justify-between">
									<h3 class="font-semibold text-white">🧪 {endpoint.title || endpoint.name}</h3>
									<span class="text-xs text-purple-400">{endpoint.path}</span>
								</div>
								<p class="mb-3 text-sm text-gray-400">{endpoint.description}</p>
								{#if endpoint.experimental}
									<div class="rounded bg-purple-900/20 p-2 text-xs text-purple-300">
										⚠️ {endpoint.experimental.warning || 'Experimental feature - use with caution'}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<div class="rounded-lg border border-purple-700/30 bg-purple-900/10 p-8 text-center">
						<Beaker class="mx-auto h-12 w-12 text-purple-400" />
						<h3 class="mt-4 text-lg font-semibold text-purple-300">No Experimental Features Available</h3>
						<p class="mt-2 text-sm text-purple-400">Check back soon for cutting-edge AI-powered features!</p>
					</div>
				{/if}
			</div>
		{:else if selectedCategory === 'health'}
			<!-- Health Status (Full Width) -->
			<div class="lg:col-span-3 rounded-lg border border-gray-700 bg-gray-800/50 p-6">
				<h2 class="mb-4 text-2xl font-bold text-white">Health Status</h2>
				<p class="mb-6 text-gray-300">Live endpoint health checks - tests if each endpoint returns valid data</p>
				
				<div class="mb-4">
					<button 
						on:click={checkAllEndpointsHealth}
						disabled={isCheckingHealth}
						class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{#if isCheckingHealth}
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
							Checking...
						{:else}
							<Activity class="h-4 w-4" />
							Run Health Check
						{/if}
					</button>
				</div>
				
				<div class="space-y-4">
					<!-- Core Endpoints Health -->
					<div class="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
						<h3 class="mb-3 text-lg font-semibold text-white">Core Endpoints</h3>
						<div class="grid gap-2">
							{#each coreEndpoints as endpoint}
								{@const health = healthStatus[endpoint.path] || { status: 'unknown' }}
								<div class="flex items-center justify-between rounded-lg bg-gray-800/50 p-3">
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium text-gray-300">{endpoint.name}</span>
										<code class="text-xs text-gray-500">{endpoint.path}</code>
									</div>
									<div class="flex items-center gap-2">
										{#if health.status === 'checking'}
											<div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
											<span class="text-xs text-blue-400">Checking...</span>
										{:else if health.status === 'healthy'}
											<Check class="h-4 w-4 text-green-400" />
											<span class="text-xs text-green-400">Healthy</span>
										{:else if health.status === 'error'}
											<span class="text-red-400">❌</span>
											<span class="text-xs text-red-400">{health.message || 'Error'}</span>
										{:else}
											<span class="text-gray-500">⚫</span>
											<span class="text-xs text-gray-500">Not tested</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Extended Endpoints Health -->
					<div class="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
						<h3 class="mb-3 text-lg font-semibold text-white">Extended Endpoints</h3>
						<div class="grid gap-2">
							{#each extendedEndpoints as endpoint}
								{@const health = healthStatus[endpoint.path] || { status: 'unknown' }}
								<div class="flex items-center justify-between rounded-lg bg-gray-800/50 p-3">
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium text-gray-300">{endpoint.name}</span>
										<code class="text-xs text-gray-500">{endpoint.path}</code>
									</div>
									<div class="flex items-center gap-2">
										{#if health.status === 'checking'}
											<div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
											<span class="text-xs text-blue-400">Checking...</span>
										{:else if health.status === 'healthy'}
											<Check class="h-4 w-4 text-green-400" />
											<span class="text-xs text-green-400">Healthy</span>
										{:else if health.status === 'error'}
											<span class="text-red-400">❌</span>
											<span class="text-xs text-red-400">{health.message || 'Error'}</span>
										{:else}
											<span class="text-gray-500">⚫</span>
											<span class="text-xs text-gray-500">Not tested</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Experimental Endpoints Health -->
					{#if experimentalEndpoints.length > 0}
						<div class="rounded-lg border border-purple-700/30 bg-purple-900/10 p-4">
							<h3 class="mb-3 text-lg font-semibold text-purple-300">🧪 Experimental Endpoints</h3>
							<div class="grid gap-2">
								{#each experimentalEndpoints as endpoint}
									{@const health = healthStatus[endpoint.path] || { status: 'unknown' }}
									<div class="flex items-center justify-between rounded-lg bg-purple-800/20 p-3">
										<div class="flex items-center gap-2">
											<span class="text-sm font-medium text-purple-300">{endpoint.name}</span>
											<code class="text-xs text-purple-500">{endpoint.path}</code>
										</div>
										<div class="flex items-center gap-2">
											{#if health.status === 'checking'}
												<div class="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
												<span class="text-xs text-purple-400">Checking...</span>
											{:else if health.status === 'healthy'}
												<Check class="h-4 w-4 text-green-400" />
												<span class="text-xs text-green-400">Healthy</span>
											{:else if health.status === 'error'}
												<span class="text-red-400">❌</span>
												<span class="text-xs text-red-400">{health.message || 'Error'}</span>
											{:else}
												<span class="text-gray-500">⚫</span>
												<span class="text-xs text-gray-500">Not tested</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
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
		min-height: 44px; /* Touch-friendly minimum */
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
		min-height: 44px; /* Touch-friendly minimum */
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
		min-height: 44px; /* Touch-friendly minimum */
		display: flex;
		align-items: center;
		justify-content: center;
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

	/* Touch-friendly interactive elements */
	.touch-friendly {
		min-height: 44px;
		min-width: 44px;
		cursor: pointer;
		touch-action: manipulation;
	}

	/* Improve mobile scrolling for code blocks */
	@media (max-width: 768px) {
		pre {
			font-size: 0.75rem;
			line-height: 1.2;
		}
		
		.tab-button {
			padding: 0.75rem 1rem;
			font-size: 0.875rem;
		}
		
		/* Ensure proper touch targets on mobile */
		button, .category-card, .endpoint-card {
			min-height: 44px;
		}
	}
</style>