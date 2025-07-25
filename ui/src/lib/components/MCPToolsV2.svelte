<script>
	import { onMount } from 'svelte';
	import { generateUIByCategory } from '../../../../src/config/UIGenerator';
	import ApiTester from './ApiTester.svelte';
	import PerformanceMetrics from './PerformanceMetrics.svelte';
	import {
		Database,
		Languages,
		BookOpen,
		Search,
		Link,
		Beaker,
		Info,
		Activity,
		ChevronRight,
		Copy,
		Check
	} from 'lucide-svelte';

	// Categories with icons
	const categoryConfig = {
		overview: { name: 'Overview', icon: Info },
		health: { name: 'Health Status', icon: Activity },
		scripture: { name: 'Scripture', icon: BookOpen },
		helps: { name: 'Translation Helps', icon: Languages },
		discovery: { name: 'Discovery', icon: Search },
		context: { name: 'Context & Aggregation', icon: Link },
		experimental: { name: 'Experimental Lab', icon: Beaker }
	};

	// State
	let selectedCategory = 'overview';
	let selectedEndpoint = null;
	let coreEndpoints = [];
	let experimentalEndpoints = [];
	let copiedExample = null;
	let performanceData = {};

	// Load endpoints from configuration
	onMount(async () => {
		try {
			// In a real implementation, this would import from the config
			// For now, we'll simulate the structure
			coreEndpoints = await loadEndpointConfigs('core');
			experimentalEndpoints = await loadEndpointConfigs('experimental');
		} catch (error) {
			console.error('Failed to load endpoint configurations:', error);
		}
	});

	// Simulate loading endpoint configs
	async function loadEndpointConfigs(category) {
		// This would actually use generateUIByCategory
		return [];
	}

	// Group endpoints by category
	function getEndpointsByCategory(category) {
		if (category === 'experimental') {
			return experimentalEndpoints;
		}

		const categoryMap = {
			scripture: ['fetch-scripture', 'fetch-ult-scripture', 'fetch-ust-scripture'],
			helps: ['fetch-translation-notes', 'fetch-translation-words', 'fetch-translation-questions'],
			discovery: ['get-languages', 'get-available-books', 'list-available-resources'],
			context: ['get-context', 'fetch-resources', 'get-words-for-reference']
		};

		const endpointNames = categoryMap[category] || [];
		return coreEndpoints.filter(ep => endpointNames.includes(ep.name));
	}

	// Copy example to clipboard
	async function copyExample(example, index) {
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
	function selectEndpoint(endpoint) {
		selectedEndpoint = endpoint;
		selectedCategory = null;
	}

	// Handle API response
	function handleApiResponse(endpoint, response) {
		performanceData[endpoint.name] = {
			responseTime: response.metadata?.responseTime,
			cached: response.metadata?.cached,
			timestamp: new Date()
		};
	}
</script>

<style>
	.category-card {
		@apply cursor-pointer rounded-lg border border-gray-700 bg-gray-800/50 p-6 transition-all hover:border-blue-500/50 hover:bg-gray-800;
	}

	.category-card.selected {
		@apply border-blue-500 bg-gray-800;
	}

	.endpoint-card {
		@apply cursor-pointer rounded-lg border border-gray-700 bg-gray-800/30 p-4 transition-all hover:border-blue-500/30 hover:bg-gray-800/50;
	}

	.endpoint-card.selected {
		@apply border-blue-500 bg-gray-800/70;
	}

	.example-card {
		@apply rounded-lg border border-gray-700 bg-gray-900/50 p-4;
	}

	.tab-button {
		@apply rounded-t-lg border-b-2 px-6 py-3 font-medium transition-all;
	}

	.tab-button.active {
		@apply border-blue-500 text-blue-400;
	}

	.tab-button:not(.active) {
		@apply border-transparent text-gray-400 hover:text-gray-300;
	}
</style>

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
				<!-- Experimental Endpoints List -->
				<h3 class="mb-4 text-lg font-semibold text-white">Experimental Features</h3>
				<div class="space-y-3">
					{#each experimentalEndpoints as endpoint}
						<div
							class="endpoint-card"
							class:selected={selectedEndpoint === endpoint}
							on:click={() => selectEndpoint(endpoint)}
						>
							<h4 class="font-medium text-white">{endpoint.name}</h4>
							<p class="mt-1 text-sm text-gray-400">{endpoint.description}</p>
						</div>
					{/each}
					{#if experimentalEndpoints.length === 0}
						<p class="text-sm text-gray-500">No experimental features available</p>
					{/if}
				</div>
			{:else if selectedCategory && selectedCategory !== 'overview' && selectedCategory !== 'health'}
				<!-- Endpoints for Selected Category -->
				<h3 class="mb-4 text-lg font-semibold text-white">
					{categoryConfig[selectedCategory]?.name} Endpoints
				</h3>
				<div class="space-y-3">
					{#each getEndpointsByCategory(selectedCategory) as endpoint}
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
									selectedCategory = key;
									selectedEndpoint = null;
								}}
							>
								<div class="flex items-start space-x-3">
									<svelte:component this={config.icon} class="mt-1 h-5 w-5 text-blue-400" />
									<div class="flex-1">
										<h4 class="font-medium text-white">{config.name}</h4>
										{#if key === 'scripture'}
											<p class="mt-1 text-sm text-gray-400">ULT, UST, and general scripture fetching</p>
										{:else if key === 'helps'}
											<p class="mt-1 text-sm text-gray-400">Translation notes, words, and questions</p>
										{:else if key === 'discovery'}
											<p class="mt-1 text-sm text-gray-400">Languages, books, and resource availability</p>
										{:else if key === 'context'}
											<p class="mt-1 text-sm text-gray-400">Combined fetching and context analysis</p>
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
							onResponse={(response) => handleApiResponse(selectedEndpoint, response)}
						/>
					</div>

					<!-- Examples -->
					{#if selectedEndpoint.examples?.length > 0}
						<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
							<h3 class="mb-4 text-lg font-semibold text-white">Examples</h3>
							<div class="space-y-4">
								{#each selectedEndpoint.examples as example, index}
									<div class="example-card">
										<div class="mb-2 flex items-start justify-between">
											<h4 class="font-medium text-white">
												{example.title || example.description || `Example ${index + 1}`}
											</h4>
											<button
												class="flex items-center space-x-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
												on:click={() => copyExample(example, index)}
											>
												{#if copiedExample === index}
													<Check class="h-3 w-3" />
													<span>Copied!</span>
												{:else}
													<Copy class="h-3 w-3" />
													<span>Copy</span>
												{/if}
											</button>
										</div>
										<pre class="overflow-x-auto rounded bg-gray-900 p-3 text-sm">
<code class="text-gray-300">{JSON.stringify(example.params, null, 2)}</code></pre>
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
			{/if}
		</div>
	</div>
</div>