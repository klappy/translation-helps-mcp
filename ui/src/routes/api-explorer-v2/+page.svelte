<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Activity, Book, Check, Copy, Database, FileText, Search } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import ApiTester from '../../lib/components/ApiTester.svelte';
	import PerformanceMetrics from '../../lib/components/PerformanceMetrics.svelte';

	// Four main categories for API Explorer
	type MainCategory = 'scripture' | 'helps' | 'discovery' | 'utility';
	const categoryConfig = {
		scripture: { name: 'Scripture Resources', icon: Book },
		helps: { name: 'Translation Helps', icon: FileText },
		discovery: { name: 'Discovery & Browse', icon: Search },
		utility: { name: 'Utilities & Health', icon: Activity }
	} as const;

	// State
	let selectedCategory: MainCategory = 'scripture';
	let selectedEndpoint: any = null;
	let endpointsByCategory: Record<MainCategory, any[]> = {
		scripture: [],
		helps: [],
		discovery: [],
		utility: []
	};
	let loadingError: string | null = null;
	let isLoading = false;
	let apiResult: any = null;
	let copiedExample: string | null = null;
	let performanceData: Record<string, any> = {};
	let healthStatus: Record<
		string,
		{ status: 'checking' | 'healthy' | 'error' | 'unknown' | 'warning'; message?: string }
	> = {};
	let isCheckingHealth = false;
	let isInitialized = false;

	// Load endpoints from configuration
	onMount(async () => {
		try {
			console.log('🔧 Initializing API Explorer v2 with dynamic endpoint configurations...');

			// Fetch endpoint configurations from API
			const response = await fetch('/api/mcp-config');
			const configData = await response.json();

			if (!configData.success) {
				throw new Error(configData.message || 'Failed to load endpoint configurations');
			}

			// Organize endpoints by category for API Explorer
			const allEndpoints = [
				...(configData.data.core || []),
				...(configData.data.extended || []),
				...(configData.data.experimental || [])
			];

			// Use all endpoints (they're all v2 anyway)
			const v2Endpoints = allEndpoints;

			// Categorize endpoints based on their names/paths
			endpointsByCategory = {
				scripture: v2Endpoints.filter(
					(e) =>
						e.name.toLowerCase().includes('scripture') ||
						e.name.toLowerCase().includes('ult') ||
						e.name.toLowerCase().includes('ust') ||
						e.path?.includes('scripture')
				),
				helps: v2Endpoints.filter(
					(e) =>
						e.name.toLowerCase().includes('translation') ||
						e.name.toLowerCase().includes('word') ||
						e.name.toLowerCase().includes('note') ||
						e.name.toLowerCase().includes('question') ||
						e.name.toLowerCase().includes('academy') ||
						e.path?.includes('translation')
				),
				discovery: v2Endpoints.filter(
					(e) =>
						e.name.toLowerCase().includes('language') ||
						e.name.toLowerCase().includes('book') ||
						e.name.toLowerCase().includes('resource') ||
						e.name.toLowerCase().includes('catalog') ||
						e.name.toLowerCase().includes('browse') ||
						e.name.toLowerCase().includes('available') ||
						e.path?.includes('browse') ||
						e.path?.includes('get-')
				),
				utility: v2Endpoints.filter(
					(e) =>
						e.name.toLowerCase().includes('health') ||
						e.name.toLowerCase().includes('context') ||
						e.name.toLowerCase().includes('extract') ||
						e.name.toLowerCase().includes('recommendation') ||
						e.path?.includes('health') ||
						e.path?.includes('extract')
				)
			};

			// Remove duplicates
			const seen = new Set();
			Object.keys(endpointsByCategory).forEach((cat) => {
				endpointsByCategory[cat as MainCategory] = endpointsByCategory[cat as MainCategory].filter(
					(e) => {
						if (seen.has(e.name)) return false;
						seen.add(e.name);
						return true;
					}
				);
			});

			console.log('📊 API Explorer v2 endpoints loaded by category:', {
				scripture: endpointsByCategory.scripture.length,
				helps: endpointsByCategory.helps.length,
				discovery: endpointsByCategory.discovery.length,
				utility: endpointsByCategory.utility.length
			});

			isInitialized = true;

			// Check URL for focused endpoint
			const urlParams = new URLSearchParams($page.url.search);
			const endpointParam = urlParams.get('endpoint');
			const categoryParam = $page.url.hash.replace('#', '') || 'scripture';

			if (categoryParam && Object.keys(categoryConfig).includes(categoryParam)) {
				selectedCategory = categoryParam as MainCategory;
			}

			if (endpointParam) {
				// Find and select the endpoint
				const allEndpointsFlat = Object.values(endpointsByCategory).flat();
				const endpoint = allEndpointsFlat.find((e) => e.name === endpointParam);
				if (endpoint) {
					selectEndpoint(endpoint);
				}
			}

			// Run initial health check
			checkAllHealth();
		} catch (error) {
			console.error('❌ Failed to load endpoint configurations:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			isInitialized = true;
		}
	});

	// Select an endpoint
	function selectEndpoint(endpoint: any) {
		selectedEndpoint = endpoint;
		apiResult = null;
		performanceData = {};

		// Update URL
		const url = new URL(window.location.href);
		url.searchParams.set('endpoint', endpoint.name);
		goto(url.toString(), { replaceState: true, noScroll: true });
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
			// Note: v2 endpoints already have /api/v2 in their path from config
			const url = `/api${endpoint.path}${queryString ? `?${queryString}` : ''}`;

			console.log(`🚀 Making request to: ${url}`);

			const response = await fetch(url, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json'
				}
			});

			const responseData = await response.json();
			const headers = Object.fromEntries(response.headers.entries());

			// Create result object
			const result = {
				success: response.ok,
				status: response.status,
				statusText: response.statusText,
				data: responseData,
				headers: headers,
				url: url,
				timestamp: Date.now()
			};

			// Handle the result
			handleApiResult(result);
		} catch (error) {
			console.error('❌ API test failed:', error);
			apiResult = {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: Date.now()
			};
		} finally {
			isLoading = false;
		}
	}

	// Handle API call results
	function handleApiResult(result: any) {
		apiResult = result;

		// Extract performance data from headers if available
		if (result.headers) {
			performanceData = {
				responseTime: result.headers['x-response-time'],
				endpoint: result.headers['x-endpoint'],
				traceId: result.headers['x-trace-id'],
				cacheHits: result.headers['x-cache-hits'],
				cacheMisses: result.headers['x-cache-misses'],
				apiCalls: result.headers['x-trace-api-calls'],
				apiDuration: result.headers['x-trace-api-duration'],
				cacheStatus: result.headers['x-cache-status'] || 'unknown'
			};
		}
	}

	// Copy example to clipboard
	async function copyExample(endpoint: any) {
		try {
			// Build example URL with parameters
			const params = new URLSearchParams();
			endpoint.parameters?.forEach((param: any) => {
				if (param.example || param.default) {
					params.set(param.name, param.example || param.default);
				}
			});

			const exampleUrl = `${window.location.origin}${endpoint.path}${params.toString() ? '?' + params.toString() : ''}`;
			await navigator.clipboard.writeText(exampleUrl);
			copiedExample = endpoint.name;
			setTimeout(() => {
				copiedExample = null;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	}

	// Check health of all endpoints
	async function checkAllHealth() {
		isCheckingHealth = true;
		const healthChecks = [
			{ name: 'API Health', path: '/api/v2/health' },
			{ name: 'DCS Health', path: '/api/v2/health-dcs' }
		];

		for (const check of healthChecks) {
			healthStatus[check.name] = { status: 'checking' };
		}

		for (const check of healthChecks) {
			try {
				const response = await fetch(check.path);
				const data = await response.json();

				if (response.ok && data.status === 'healthy') {
					healthStatus[check.name] = { status: 'healthy', message: data.message || 'Operational' };
				} else {
					healthStatus[check.name] = {
						status: 'warning',
						message: data.message || 'Degraded performance'
					};
				}
			} catch (error) {
				healthStatus[check.name] = {
					status: 'error',
					message: error instanceof Error ? error.message : 'Connection failed'
				};
			}
		}

		isCheckingHealth = false;
	}

	// Get health status color
	function getHealthColor(status: string) {
		switch (status) {
			case 'healthy':
				return 'text-green-600';
			case 'warning':
				return 'text-yellow-600';
			case 'error':
				return 'text-red-600';
			case 'checking':
				return 'text-gray-400 animate-pulse';
			default:
				return 'text-gray-500';
		}
	}

	// Get health status icon
	function getHealthIcon(status: string) {
		switch (status) {
			case 'healthy':
				return '✅';
			case 'warning':
				return '⚠️';
			case 'error':
				return '❌';
			case 'checking':
				return '🔄';
			default:
				return '❓';
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="border-b bg-white shadow-sm">
		<div class="px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between py-4">
				<div>
					<h1 class="flex items-center gap-2 text-2xl font-bold text-gray-900">
						<Database class="h-6 w-6" />
						API Explorer v2
					</h1>
					<p class="mt-1 text-sm text-gray-600">
						Interactive documentation and testing for Translation Helps API v2
					</p>
				</div>

				<!-- Health Status -->
				<div class="flex items-center gap-4">
					{#each Object.entries(healthStatus) as [name, status]}
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium text-gray-700">{name}:</span>
							<span class="{getHealthColor(status.status)} flex items-center gap-1 text-sm">
								{getHealthIcon(status.status)}
								{#if status.status === 'checking'}
									Checking...
								{:else}
									{status.status === 'healthy' ? 'Healthy' : status.status}
								{/if}
							</span>
						</div>
					{/each}
					{#if !isCheckingHealth}
						<button on:click={checkAllHealth} class="text-sm text-blue-600 hover:text-blue-800">
							Refresh
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="flex h-[calc(100vh-5rem)]">
		<!-- Sidebar -->
		<div class="w-80 overflow-y-auto border-r bg-white">
			<!-- Category Tabs -->
			<div class="border-b">
				<div class="grid grid-cols-2 gap-0">
					{#each Object.entries(categoryConfig) as [key, config]}
						<button
							on:click={() => {
								selectedCategory = key as MainCategory;
								selectedEndpoint = null;
							}}
							class="border-b-2 px-4 py-3 text-sm font-medium transition-colors
								{selectedCategory === key
								? 'border-blue-500 bg-blue-50 text-blue-600'
								: 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'}"
						>
							<svelte:component this={config.icon} class="mx-auto mb-1 h-4 w-4" />
							<div class="text-xs">{config.name}</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Endpoints List -->
			<div class="p-4">
				{#if !isInitialized}
					<div class="py-8 text-center">
						<div class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
						<p class="mt-2 text-sm text-gray-500">Loading endpoints...</p>
					</div>
				{:else if loadingError}
					<div class="py-8 text-center">
						<p class="text-sm text-red-600">{loadingError}</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each endpointsByCategory[selectedCategory] as endpoint}
							<button
								on:click={() => selectEndpoint(endpoint)}
								class="w-full rounded-lg p-3 text-left transition-colors
									{selectedEndpoint?.name === endpoint.name
									? 'border border-blue-200 bg-blue-50'
									: 'hover:bg-gray-50'}"
							>
								<div class="text-sm font-medium">{endpoint.name}</div>
								<div class="mt-1 font-mono text-xs text-gray-500">{endpoint.path}</div>
								{#if endpoint.description}
									<div class="mt-1 text-xs text-gray-400">{endpoint.description}</div>
								{/if}
							</button>
						{/each}

						{#if endpointsByCategory[selectedCategory].length === 0}
							<p class="py-4 text-center text-sm text-gray-500">No endpoints in this category</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Main Content -->
		<div class="flex-1 overflow-y-auto">
			{#if selectedEndpoint}
				<div class="p-6">
					<!-- Endpoint Header -->
					<div class="mb-6">
						<div class="flex items-start justify-between">
							<div>
								<h2 class="text-2xl font-bold text-gray-900">{selectedEndpoint.name}</h2>
								<p class="mt-1 text-gray-600">{selectedEndpoint.description}</p>
								<div class="mt-2 flex items-center gap-4">
									<code class="rounded bg-gray-100 px-2 py-1 font-mono text-sm">
										{selectedEndpoint.path}
									</code>
									<button
										on:click={() => copyExample(selectedEndpoint)}
										class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
									>
										<Copy class="h-4 w-4" />
										{copiedExample === selectedEndpoint.name ? 'Copied!' : 'Copy Example'}
									</button>
								</div>
							</div>
						</div>
					</div>

					<!-- Performance Metrics -->
					{#if Object.keys(performanceData).length > 0}
						<div class="mb-6">
							<h3 class="mb-3 text-lg font-semibold text-gray-900">X-Ray Trace Information</h3>
							<PerformanceMetrics data={performanceData} />
						</div>
					{/if}

					<!-- API Tester -->
					<div class="rounded-lg bg-white p-6 shadow">
						<h3 class="mb-4 text-lg font-semibold text-gray-900">Test Endpoint</h3>
						<ApiTester
							endpoint={selectedEndpoint}
							loading={isLoading}
							result={apiResult}
							on:test={handleApiTest}
						/>
					</div>
				</div>
			{:else}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<Database class="mx-auto mb-4 h-12 w-12 text-gray-400" />
						<p class="text-gray-500">Select an endpoint to view documentation and test it</p>
						<p class="mt-2 text-sm text-gray-400">
							All endpoints support format parameters: json, md, text
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Custom scrollbar */
	:global(.overflow-y-auto) {
		scrollbar-width: thin;
		scrollbar-color: #e5e7eb #f9fafb;
	}

	:global(.overflow-y-auto::-webkit-scrollbar) {
		width: 8px;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-track) {
		background: #f9fafb;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-thumb) {
		background-color: #e5e7eb;
		border-radius: 4px;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
		background-color: #d1d5db;
	}
</style>
