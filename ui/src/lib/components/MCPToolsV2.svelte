<script lang="ts">
	import {
		AlertCircle,
		Beaker,
		Check,
		ChevronRight,
		Clock,
		Code,
		Copy,
		Database
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import ApiTester from './ApiTester.svelte';
	import PerformanceMetrics from './PerformanceMetrics.svelte';
	
	// Endpoint configurations would come from the server
	let endpointConfigs = [];
	let selectedCategory = 'core';
	let selectedEndpoint = null;
	let responses = {};
	let loadingStates = {};
	let performanceMetrics = {};
	let copiedStates = {};
	
	// Categories
	const categories = {
		core: {
			name: 'Core Resources',
			icon: Database,
			description: 'Scripture and translation resources'
		},
		experimental: {
			name: 'Experimental Lab',
			icon: Beaker,
			description: 'Features under development - use with caution'
		}
	};
	
	// Load endpoint configurations
	onMount(async () => {
		try {
			// In real implementation, this would fetch from the server
			// For now, we'll use mock data
			endpointConfigs = getMockEndpointConfigs();
		} catch (error) {
			console.error('Failed to load endpoint configurations:', error);
		}
	});
	
	// Get endpoints for selected category
	$: categoryEndpoints = endpointConfigs.filter(e => e.category === selectedCategory);
	
	// Group endpoints by resource type
	$: groupedEndpoints = categoryEndpoints.reduce((acc, endpoint) => {
		const group = endpoint.responseShape?.type || 'other';
		if (!acc[group]) acc[group] = [];
		acc[group].push(endpoint);
		return acc;
	}, {});
	
	// Handle endpoint selection
	function selectEndpoint(endpoint) {
		selectedEndpoint = endpoint;
	}
	
	// Handle API response
	function handleResponse(endpoint, response) {
		responses[endpoint.name] = response;
		performanceMetrics[endpoint.name] = {
			responseTime: response.responseTime || 0,
			cacheHit: response.cacheHit || false,
			dataSource: response.dataSource || 'unknown'
		};
	}
	
	// Copy example to clipboard
	async function copyExample(endpoint, example) {
		const key = `${endpoint.name}-${example.description}`;
		try {
			await navigator.clipboard.writeText(JSON.stringify(example.params, null, 2));
			copiedStates[key] = true;
			setTimeout(() => {
				copiedStates[key] = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
	
	// Mock endpoint configurations
	function getMockEndpointConfigs() {
		return [
			{
				name: 'fetch-scripture',
				path: '/api/fetch-scripture',
				category: 'core',
				description: 'Fetch scripture text in any supported version (ULT/UST)',
				params: {
					reference: {
						name: 'reference',
						type: 'reference',
						required: true,
						description: 'Scripture reference (book chapter:verse format)',
						examples: ['Genesis 1:1', 'John 3:16', 'Titus 1:1-5', 'Matthew 5']
					},
					language: {
						name: 'language',
						type: 'language',
						required: false,
						default: 'en',
						description: 'Language code (ISO 639-1)',
						examples: ['en', 'es', 'fr', 'hi']
					},
					version: {
						name: 'version',
						type: 'string',
						required: false,
						default: 'ult',
						description: 'Scripture version (ult or ust)',
						examples: ['ult', 'ust']
					}
				},
				responseShape: {
					type: 'scripture',
					fields: [
						{ name: 'text', type: 'string', description: 'Scripture text' },
						{ name: 'reference', type: 'string', description: 'Normalized reference' },
						{ name: 'version', type: 'string', description: 'Translation version' },
						{ name: 'language', type: 'string', description: 'Language code' }
					]
				},
				examples: [
					{
						params: { reference: 'John 3:16', language: 'en', version: 'ult' },
						response: {
							text: 'For God so loved the world...',
							reference: 'John 3:16',
							version: 'ult',
							language: 'en'
						},
						description: 'Single verse'
					}
				],
				performance: {
					targetMs: 300,
					cacheable: true
				}
			}
		];
	}
</script>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900/20 to-gray-900">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold text-white mb-2">MCP Tools Interface</h1>
			<p class="text-gray-300">
				Explore and test all available API endpoints with real-time performance metrics
			</p>
		</div>
		
		<!-- Category Tabs -->
		<div class="flex space-x-1 mb-8 bg-gray-800/50 rounded-lg p-1 backdrop-blur-xl">
			{#each Object.entries(categories) as [key, category]}
				<button
					on:click={() => selectedCategory = key}
					class="flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200
						{selectedCategory === key
							? 'bg-blue-500 text-white shadow-lg'
							: 'text-gray-400 hover:text-white hover:bg-gray-700/50'}"
				>
					<svelte:component this={category.icon} class="w-4 h-4" />
					<span>{category.name}</span>
				</button>
			{/each}
		</div>
		
		<!-- Main Content Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Endpoint List -->
			<div class="lg:col-span-1">
				<div class="bg-gray-800/50 rounded-lg backdrop-blur-xl border border-gray-700">
					<div class="p-4 border-b border-gray-700">
						<h2 class="text-lg font-semibold text-white">
							{categories[selectedCategory].name}
						</h2>
						<p class="text-sm text-gray-400 mt-1">
							{categories[selectedCategory].description}
						</p>
					</div>
					
					<div class="p-4 space-y-4">
						{#each Object.entries(groupedEndpoints) as [group, endpoints]}
							<div>
								<h3 class="text-sm font-medium text-gray-400 uppercase mb-2">
									{group.replace('-', ' ')}
								</h3>
								<div class="space-y-2">
									{#each endpoints as endpoint}
										<button
											on:click={() => selectEndpoint(endpoint)}
											class="w-full text-left p-3 rounded-lg transition-all duration-200
												{selectedEndpoint?.name === endpoint.name
													? 'bg-blue-500/20 border border-blue-500/50'
													: 'hover:bg-gray-700/50 border border-transparent'}"
										>
											<div class="flex items-center justify-between">
												<div>
													<div class="font-medium text-white">
														{endpoint.name}
													</div>
													<div class="text-xs text-gray-400 mt-1">
														{endpoint.description}
													</div>
												</div>
												<ChevronRight class="w-4 h-4 text-gray-400" />
											</div>
											
											{#if performanceMetrics[endpoint.name]}
												<div class="flex items-center space-x-2 mt-2">
													<div class="flex items-center space-x-1">
														<Clock class="w-3 h-3 text-gray-400" />
														<span class="text-xs text-gray-400">
															{performanceMetrics[endpoint.name].responseTime}ms
														</span>
													</div>
													{#if performanceMetrics[endpoint.name].cacheHit}
														<span class="text-xs text-green-400">
															Cache Hit
														</span>
													{/if}
												</div>
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
			
			<!-- Endpoint Details -->
			<div class="lg:col-span-2">
				{#if selectedEndpoint}
					<div class="bg-gray-800/50 rounded-lg backdrop-blur-xl border border-gray-700">
						<!-- Endpoint Header -->
						<div class="p-6 border-b border-gray-700">
							<h2 class="text-2xl font-bold text-white mb-2">
								{selectedEndpoint.name}
							</h2>
							<p class="text-gray-300">
								{selectedEndpoint.description}
							</p>
							<div class="flex items-center space-x-4 mt-4">
								<span class="text-sm text-gray-400">
									Path: <code class="text-blue-400">{selectedEndpoint.path}</code>
								</span>
								{#if selectedEndpoint.performance}
									<span class="text-sm text-gray-400">
										Target: <span class="text-green-400">&lt;{selectedEndpoint.performance.targetMs}ms</span>
									</span>
								{/if}
							</div>
						</div>
						
						<!-- Parameters -->
						<div class="p-6 border-b border-gray-700">
							<h3 class="text-lg font-semibold text-white mb-4">Parameters</h3>
							<div class="space-y-4">
								{#each Object.values(selectedEndpoint.params) as param}
									<div class="bg-gray-900/50 rounded-lg p-4">
										<div class="flex items-center justify-between mb-2">
											<span class="font-medium text-white">
												{param.name}
											</span>
											<span class="text-xs px-2 py-1 rounded-full
												{param.required 
													? 'bg-red-500/20 text-red-400' 
													: 'bg-gray-600/20 text-gray-400'}">
												{param.required ? 'Required' : 'Optional'}
											</span>
										</div>
										<p class="text-sm text-gray-400 mb-2">
											{param.description}
										</p>
										<div class="flex flex-wrap gap-2">
											{#each param.examples as example}
												<code class="text-xs bg-gray-800 px-2 py-1 rounded text-blue-400">
													{example}
												</code>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
						
						<!-- Examples -->
						<div class="p-6 border-b border-gray-700">
							<h3 class="text-lg font-semibold text-white mb-4">Examples</h3>
							<div class="space-y-4">
								{#each selectedEndpoint.examples as example}
									<div class="bg-gray-900/50 rounded-lg p-4">
										<div class="flex items-center justify-between mb-2">
											<span class="text-sm font-medium text-gray-300">
												{example.description}
											</span>
											<button
												on:click={() => copyExample(selectedEndpoint, example)}
												class="flex items-center space-x-1 text-xs text-gray-400 
													hover:text-white transition-colors"
											>
												{#if copiedStates[`${selectedEndpoint.name}-${example.description}`]}
													<Check class="w-3 h-3" />
													<span>Copied!</span>
												{:else}
													<Copy class="w-3 h-3" />
													<span>Copy params</span>
												{/if}
											</button>
										</div>
										<pre class="text-xs bg-gray-800 rounded p-2 overflow-x-auto">
											<code class="text-gray-300">{JSON.stringify(example.params, null, 2)}</code>
										</pre>
									</div>
								{/each}
							</div>
						</div>
						
						<!-- API Tester -->
						<div class="p-6">
							<h3 class="text-lg font-semibold text-white mb-4">Test Endpoint</h3>
							<ApiTester
								endpoint={selectedEndpoint}
								onResponse={(response) => handleResponse(selectedEndpoint, response)}
							/>
						</div>
						
						<!-- Performance Metrics -->
						{#if performanceMetrics[selectedEndpoint.name]}
							<div class="p-6 border-t border-gray-700">
								<PerformanceMetrics metrics={performanceMetrics[selectedEndpoint.name]} />
							</div>
						{/if}
					</div>
				{:else}
					<div class="bg-gray-800/50 rounded-lg backdrop-blur-xl border border-gray-700 p-12">
						<div class="text-center">
							<Code class="w-16 h-16 text-gray-600 mx-auto mb-4" />
							<h3 class="text-xl font-semibold text-gray-400 mb-2">
								Select an Endpoint
							</h3>
							<p class="text-gray-500">
								Choose an endpoint from the list to view details and test it
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
		
		<!-- Experimental Warning -->
		{#if selectedCategory === 'experimental'}
			<div class="mt-8 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
				<div class="flex items-start space-x-3">
					<AlertCircle class="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
					<div>
						<h4 class="font-semibold text-yellow-500">Experimental Features</h4>
						<p class="text-sm text-yellow-400/80 mt-1">
							These endpoints are under active development and may change or be removed.
							Use with caution in production environments.
						</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>