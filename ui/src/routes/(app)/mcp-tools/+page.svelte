<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Activity, Beaker, Check, Copy, Database, Link } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import ApiTester from '../../../lib/components/ApiTester.svelte';
	import PerformanceMetrics from '../../../lib/components/PerformanceMetrics.svelte';
	import XRayTraceView from '../../../lib/components/XRayTraceView.svelte';

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
			isInitialized = true;

			// Check URL for focused endpoint
			const urlParams = new URLSearchParams($page.url.search);
			const toolParam = urlParams.get('tool');
			const categoryParam = $page.url.hash.replace('#', '') || 'core';

			if (categoryParam && ['core', 'extended', 'experimental'].includes(categoryParam)) {
				selectedCategory = categoryParam as MainCategory;
			}

			if (toolParam) {
				// Find the endpoint and focus it
				const allEndpoints = [...coreEndpoints, ...extendedEndpoints, ...experimentalEndpoints];
				const endpoint = allEndpoints.find((e) => e.name === toolParam);
				if (endpoint) {
					selectEndpoint(endpoint);
				}
			}
		} catch (error) {
			console.error('❌ Failed to load endpoint configurations:', error);
			loadingError = error instanceof Error ? error.message : String(error);
			isInitialized = true; // Still set to prevent infinite loading
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
			verseReferenced: [],
			rcLinked: [],
			browsingHelpers: [],
			discovery: []
		};

		endpoints.forEach((endpoint) => {
			const name = endpoint.name.toLowerCase();

			// Scripture Resources (separate category)
			if (name.includes('scripture') || name.includes('ult') || name.includes('ust')) {
				groups.scripture.push(endpoint);
			}
			// Verse Referenced Data
			else if (
				name === 'translation-notes' ||
				name === 'translation-questions' ||
				name === 'fetch-translation-word-links'
			) {
				groups.verseReferenced.push(endpoint);
			}
			// RC Linked Data
			else if (name === 'get-translation-word' || name === 'fetch-translation-academy') {
				groups.rcLinked.push(endpoint);
			}
			// Browsing Helpers
			else if (name === 'browse-translation-words' || name === 'browse-translation-academy') {
				groups.browsingHelpers.push(endpoint);
			}
			// Discovery
			else {
				groups.discovery.push(endpoint);
			}
		});

		// Custom sort order for each group
		const sortOrder = {
			verseReferenced: [
				'translation-notes',
				'translation-questions',
				'fetch-translation-word-links'
			],
			rcLinked: ['get-translation-word', 'fetch-translation-academy'],
			browsingHelpers: ['browse-translation-words', 'browse-translation-academy'],
			discovery: ['simple-languages', 'list-available-resources', 'get-available-books']
		};

		// Sort each group according to custom order
		Object.keys(sortOrder).forEach((key) => {
			if (groups[key]) {
				groups[key].sort((a, b) => {
					const aIndex = sortOrder[key].indexOf(a.name);
					const bIndex = sortOrder[key].indexOf(b.name);
					return aIndex - bIndex;
				});
			}
		});

		return {
			'Scripture Resources': {
				icon: '📖',
				description: 'Access Bible texts in original and simplified languages',
				endpoints: groups.scripture
			},
			'Verse Referenced Data': {
				icon: '📚',
				description:
					'Translation helps organized by scripture reference (Notes ✅, Questions ✅, Word Links ✅)',
				endpoints: groups.verseReferenced
			},
			'RC Linked Data': {
				icon: '🔗',
				description:
					'Resources accessed via RC links (Words ❌, Academy ⚠️) - Note: RC Resolver is in Extended tab',
				endpoints: groups.rcLinked
			},
			'Browsing Helpers': {
				icon: '📂',
				description: 'Browse available words and academy articles (Both not implemented yet)',
				endpoints: groups.browsingHelpers
			},
			Discovery: {
				icon: '🔍',
				description: 'Find available languages ✅, resources ✅, and books ⚠️ (returns empty)',
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
	function selectEndpoint(endpoint: any | null) {
		// Transform endpoint config to ApiTester format
		selectedEndpoint = endpoint ? transformEndpointForTesting(endpoint) : null;
		// Clear previous results when selecting new endpoint
		apiResult = null;
		isLoading = false;

		// Update URL to persist selection
		const url = new URL(window.location.href);
		url.hash = selectedCategory;
		if (endpoint?.name) {
			url.searchParams.set('tool', endpoint.name);
		}
		goto(url.toString(), { replaceState: true, noScroll: true });
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
			transformed.parameters = Object.entries(endpoint.params).map(
				([name, config]: [string, any]) => ({
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
				})
			);
		}

		// Use first example for default values
		if (endpoint.examples && endpoint.examples.length > 0) {
			transformed.example = {
				request: endpoint.examples[0].params || {},
				response:
					endpoint.examples[0].expectedResponse || endpoint.examples[0].expectedContent || {}
			};
		}

		return transformed;
	}

	// Handle API response
	function handleApiResponse(endpoint: any, response: any) {
		console.log(`🎯 handleApiResponse called for ${endpoint.name}`, response);
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
			cacheStats: xrayTrace.cacheStats
				? {
						hits: xrayTrace.cacheStats.hits,
						misses: xrayTrace.cacheStats.misses,
						total: xrayTrace.cacheStats.total,
						hitRate:
							xrayTrace.cacheStats.total > 0
								? xrayTrace.cacheStats.hits / xrayTrace.cacheStats.total
								: 0
					}
				: null,

			// Performance metrics
			performance: xrayTrace.performance
				? {
						fastest: xrayTrace.performance.fastest,
						slowest: xrayTrace.performance.slowest,
						average: xrayTrace.performance.average
					}
				: null,

			// API call details
			calls: xrayTrace.apiCalls || [],

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

		console.log(
			`📊 Performance data captured for ${endpoint.name}:`,
			performanceData[endpoint.name]
		);

		// Debug X-ray data specifically
		console.log(`🔍 X-ray trace data:`, {
			traceId: performanceData[endpoint.name].traceId,
			totalDuration: performanceData[endpoint.name].totalDuration,
			calls: performanceData[endpoint.name].calls,
			cacheStats: performanceData[endpoint.name].cacheStats
		});

		// Force reactivity update
		performanceData = performanceData;
	}

	// Handle API test requests from ApiTester component
	async function handleApiTest(event: any) {
		const { endpoint, formData } = event.detail;

		console.log(`🧪 Testing endpoint: ${endpoint.name}`, formData);

		// Set loading state
		isLoading = true;
		apiResult = null;
		const startTime = Date.now();

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
					Accept: 'application/json',
					'Content-Type': 'application/json'
				}
			});

			// Check content type to determine how to parse response
			const contentType = response.headers.get('content-type') || '';
			let responseData;

			if (contentType.includes('application/json')) {
				responseData = await response.json();
			} else if (contentType.includes('text/markdown') || contentType.includes('text/plain')) {
				// For markdown/text responses, wrap in a simple object
				const text = await response.text();
				responseData = {
					success: true,
					data: text,
					metadata: {
						format: 'markdown',
						contentType: contentType
					}
				};
			} else {
				// Default to JSON parsing
				responseData = await response.json();
			}

			// Extract diagnostic data from headers WITHOUT polluting the response body
			let headerDiagnostics = {
				xrayTrace: null as any,
				responseTime: undefined as number | undefined,
				cacheStatus: undefined as string | undefined,
				traceId: undefined as string | undefined
			};

			try {
				// X-ray trace (case-sensitive header name)
				const xrayHeader =
					response.headers.get('X-XRay-Trace') || response.headers.get('x-xray-trace');
				if (xrayHeader) {
					const cleaned = xrayHeader.replace(/\s+/g, '');
					headerDiagnostics.xrayTrace = JSON.parse(atob(cleaned));
				}

				// Response time
				const rt = response.headers.get('X-Response-Time');
				if (rt) {
					const rtNum = parseInt(rt.replace(/[^0-9]/g, ''), 10);
					if (!isNaN(rtNum)) {
						headerDiagnostics.responseTime = rtNum;
					}
				}

				// Cache status
				const cacheStatus = response.headers.get('X-Cache-Status');
				if (cacheStatus) {
					headerDiagnostics.cacheStatus = cacheStatus.toLowerCase();
				}

				// Trace ID
				const traceId = response.headers.get('X-Trace-Id');
				if (traceId) {
					headerDiagnostics.traceId = traceId;
				}
			} catch (e) {
				console.warn('Failed to extract diagnostic headers', e);
			}

			console.log(`✅ Response received:`, responseData);

			// Set the result for display (clean, without injected headers)
			apiResult = responseData;

			// Create a separate object for performance tracking that includes diagnostic data from headers
			const responseWithDiagnostics = {
				...responseData,
				metadata: {
					...(responseData.metadata || {}),
					// Add header diagnostics ONLY for performance tracking UI
					xrayTrace: headerDiagnostics.xrayTrace,
					responseTime: responseData.metadata?.responseTime || headerDiagnostics.responseTime,
					cacheStatus: responseData.metadata?.cacheStatus || headerDiagnostics.cacheStatus,
					traceId: responseData.metadata?.traceId || headerDiagnostics.traceId
				}
			};

			// Process response and extract performance data
			handleApiResponse(endpoint, responseWithDiagnostics);
		} catch (error: any) {
			console.error(`❌ API test failed for ${endpoint.name}:`, error);

			// Even for network errors, try to create a minimal error response
			apiResult = {
				error: error.message || 'Network or request error',
				details: {
					endpoint: endpoint.name,
					path: endpoint.path,
					timestamp: new Date().toISOString()
				},
				status: 0
			};

			// Create error trace data for visualization
			const errorTrace = {
				traceId: `error-${Date.now()}`,
				mainEndpoint: endpoint.name,
				totalDuration: Date.now() - startTime,
				apiCalls: [],
				cacheStats: { hits: 0, misses: 0 },
				error: error.message
			};

			// Store performance data even for errors
			performanceData[endpoint.name] = {
				responseTime: Date.now() - startTime,
				timestamp: new Date(),
				xrayTrace: errorTrace,
				error: true
			};

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
			// Set test parameters based on endpoint
			const testParams: Record<string, string | boolean> = {};

			if (
				endpoint.name === 'fetch-scripture' ||
				endpoint.name === 'fetch-ult-scripture' ||
				endpoint.name === 'fetch-ust-scripture'
			) {
				testParams.reference = 'John 3:16';
				testParams.outputFormat = 'text';
			} else if (endpoint.name === 'translation-notes') {
				testParams.reference = 'John 3:16';
				testParams.language = 'en';
				testParams.organization = 'unfoldingWord';
			} else if (endpoint.name === 'fetch-translation-words') {
				testParams.reference = 'John 3:16';
			} else if (endpoint.name === 'translation-questions') {
				testParams.reference = 'John 3:16';
				testParams.language = 'en';
				testParams.organization = 'unfoldingWord';
			} else if (endpoint.name === 'get-translation-word') {
				testParams.term = 'faith';
			} else if (endpoint.name === 'fetch-translation-word-links') {
				testParams.reference = 'John 3:16';
				testParams.language = 'en';
				testParams.organization = 'unfoldingWord';
			} else if (endpoint.name === 'get-context') {
				testParams.reference = 'John 3:16';
				testParams.language = 'en';
				testParams.organization = 'unfoldingWord';
			} else if (endpoint.name === 'get-words-for-reference') {
				testParams.reference = 'John 3:16';
			} else if (endpoint.name === 'browse-translation-words') {
				// No params needed
			} else if (endpoint.name === 'browse-translation-academy') {
				testParams.language = 'en';
				testParams.organization = 'unfoldingWord';
			} else if (endpoint.name === 'extract-references') {
				testParams.text = 'Check John 3:16';
			} else if (endpoint.name === 'get-available-books') {
				testParams.resource = 'tn';
				testParams.language = 'en';
				testParams.organization = 'unfoldingWord';
			} else if (endpoint.name === 'resolve-rc-link') {
				testParams.rcLink = 'rc://*/tw/dict/bible/kt/love';
			}

			// Build query string
			const params = new URLSearchParams();
			Object.entries(testParams).forEach(([key, value]) => {
				if (value !== null && value !== undefined && value !== '') {
					params.append(key, String(value));
				}
			});

			// Force JSON format for endpoints that support multiple formats
			if (endpoint.name === 'browse-translation-academy' && !params.has('format')) {
				params.append('format', 'json');
			}

			// Ensure endpoint path starts with /api
			const apiPath = endpoint.path.startsWith('/api') ? endpoint.path : `/api${endpoint.path}`;
			const queryString = params.toString();
			const url = `${apiPath}${queryString ? `?${queryString}` : ''}`;

			const response = await fetch(url, {
				method: 'GET',
				headers: {
					Accept: 'application/json'
				}
			});

			if (response.ok) {
				const data = await response.json(); // Everything returns JSON now

				// Antifragile error detection: recursively search entire response for ANY error indicators
				function hasAnyErrors(
					obj: any,
					visited = new Set()
				): { hasError: boolean; errorDetails: string[] } {
					if (!obj || typeof obj !== 'object' || visited.has(obj))
						return { hasError: false, errorDetails: [] };
					visited.add(obj);

					const errors: string[] = [];

					// Check current level for ANY error indicators
					if (obj.statusCode && obj.statusCode !== 200) {
						errors.push(`statusCode: ${obj.statusCode}`);
					}
					if (obj.code && obj.code.includes('HTTP_')) {
						errors.push(`code: ${obj.code}`);
					}
					if (obj.status && obj.status !== 200 && obj.status !== 'success') {
						errors.push(`status: ${obj.status}`);
					}
					if (obj.error) {
						errors.push(
							`error: ${typeof obj.error === 'string' ? obj.error : JSON.stringify(obj.error)}`
						);
					}
					if (obj.message && typeof obj.message === 'string') {
						const msg = obj.message.toLowerCase();
						if (
							msg.includes('not found') ||
							msg.includes('does not exist') ||
							msg.includes('failed') ||
							msg.includes('error')
						) {
							errors.push(`message: ${obj.message}`);
						}
					}
					if (obj.success === false) {
						errors.push('success: false');
					}

					// Recursively check all properties (but skip very large data arrays)
					for (const [key, value] of Object.entries(obj)) {
						// Skip recursing into large data arrays to avoid performance issues
						if (key === 'data' && Array.isArray(value) && value.length > 50) {
							continue;
						}
						const nestedResult = hasAnyErrors(value, visited);
						if (nestedResult.hasError) {
							errors.push(...nestedResult.errorDetails.map((detail) => `${key}.${detail}`));
						}
					}

					return { hasError: errors.length > 0, errorDetails: errors };
				}

				// Check if endpoint is responding properly
				if (data._metadata && data._metadata.success) {
					const errorResult = hasAnyErrors(data);

					if (errorResult.hasError) {
						const errorSummary = errorResult.errorDetails.slice(0, 3).join(', ');
						const moreErrors =
							errorResult.errorDetails.length > 3
								? ` (+${errorResult.errorDetails.length - 3} more)`
								: '';

						healthStatus[healthKey] = {
							status: 'warning',
							message: `Endpoint working but underlying issues: ${errorSummary}${moreErrors}`
						};
					} else {
						healthStatus[healthKey] = {
							status: 'healthy',
							message: 'Endpoint responding correctly'
						};
					}
				} else if (data.data && data.data.success === false) {
					// Data operation failed, but endpoint is working
					const errorResult = hasAnyErrors(data.data);
					const errorSummary =
						errorResult.errorDetails.length > 0
							? errorResult.errorDetails.slice(0, 2).join(', ')
							: 'unknown issue';

					healthStatus[healthKey] = {
						status: 'warning',
						message: `Endpoint working (data issue: ${errorSummary})`
					};
				} else if (data.success !== false && !data.error) {
					// Check for any hidden errors even in "successful" responses
					const errorResult = hasAnyErrors(data);

					if (errorResult.hasError) {
						const errorSummary = errorResult.errorDetails.slice(0, 2).join(', ');
						healthStatus[healthKey] = {
							status: 'warning',
							message: `Response has issues: ${errorSummary}`
						};
					} else {
						healthStatus[healthKey] = {
							status: 'healthy',
							message: 'Endpoint responding correctly'
						};
					}
				} else if (
					data.success === undefined &&
					(data.notes || data.citation || data.words || data.metadata)
				) {
					// Some endpoints return data without explicit success field - check for hidden errors
					const errorResult = hasAnyErrors(data);

					if (errorResult.hasError) {
						const errorSummary = errorResult.errorDetails.slice(0, 2).join(', ');
						healthStatus[healthKey] = {
							status: 'warning',
							message: `Data returned but with issues: ${errorSummary}`
						};
					} else {
						healthStatus[healthKey] = {
							status: 'healthy',
							message: 'Endpoint responding correctly'
						};
					}
				} else {
					healthStatus[healthKey] = {
						status: 'error',
						message: data.error || data.message || 'Endpoint returned error'
					};
				}
			} else if (response.status === 500) {
				// Skip unimplemented endpoints
				const data = await response.json().catch(() => ({}));
				if (data.error && data.error.includes('not yet implemented')) {
					healthStatus[healthKey] = { status: 'warning', message: 'Feature not yet implemented' };
				} else {
					healthStatus[healthKey] = { status: 'error', message: `HTTP ${response.status}` };
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
		await Promise.all(allEndpoints.map((endpoint) => checkEndpointHealth(endpoint)));

		isCheckingHealth = false;
	}
</script>

<svelte:head>
	<title>MCP Tools - Translation Helps Interface</title>
	<meta
		name="description"
		content="Complete visibility into all translation helps endpoints with real-time performance metrics."
	/>
	<meta
		name="keywords"
		content="MCP, Bible translation, translation tools, API, endpoints, performance metrics"
	/>
</svelte:head>

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
						on:click={() => (loadingError = null)}
					>
						Dismiss
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	{#if !isInitialized}
		<div class="flex items-center justify-center p-8">
			<div class="text-center">
				<div
					class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"
				></div>
				<p class="text-gray-400">Loading MCP Tools...</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
			{#if selectedEndpoint && (selectedCategory === 'core' || selectedCategory === 'extended')}
				<!-- Persistent Sidebar + Endpoint Details View -->
				{#if selectedCategory === 'core'}
					{@const groupedEndpoints = groupCoreEndpoints(coreEndpoints)}
					<!-- Left Sidebar -->
					<div class="lg:col-span-1">
						<div class="sticky top-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
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
													class="w-full rounded border p-2 text-left text-sm transition-all hover:border-blue-500/50 hover:bg-gray-800/50 {selectedEndpoint &&
													selectedEndpoint.name === endpoint.name
														? 'border-blue-500/50 bg-blue-900/30'
														: 'border-gray-700/50 bg-gray-900/30'}"
													on:click={() => selectEndpoint(endpoint)}
												>
													<div class="font-medium text-white">
														{endpoint.title || endpoint.name}
													</div>
													<div class="truncate text-xs text-gray-500">{endpoint.path}</div>
												</button>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else if selectedCategory === 'extended'}
					<!-- Left Sidebar -->
					<div class="lg:col-span-1">
						<div class="sticky top-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
							<h3 class="mb-4 text-lg font-semibold text-white">Extended Endpoints</h3>
							<div class="space-y-1">
								{#each extendedEndpoints as endpoint}
									<button
										class="w-full rounded border p-2 text-left text-sm transition-all hover:border-blue-500/50 hover:bg-gray-800/50 {selectedEndpoint &&
										selectedEndpoint.name === endpoint.name
											? 'border-blue-500/50 bg-blue-900/30'
											: 'border-gray-700/50 bg-gray-900/30'}"
										on:click={() => selectEndpoint(endpoint)}
									>
										<div class="font-medium text-white">{endpoint.title || endpoint.name}</div>
										<div class="truncate text-xs text-gray-500">{endpoint.path}</div>
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- Endpoint Testing Interface (Right Panel) -->
				<div class="space-y-6 lg:col-span-2">
					<!-- Back Button -->
					<button
						class="touch-friendly flex items-center text-sm text-blue-400 hover:text-blue-300"
						on:click={() => {
							selectedEndpoint = null;
						}}
					>
						← Back to Overview
					</button>

					<!-- Endpoint Details Card -->
					<div class="rounded-lg border border-gray-700 bg-gray-800 p-4 lg:p-6">
						<h3 class="mb-2 text-lg font-semibold text-white lg:text-xl">
							{selectedEndpoint.name}
						</h3>
						<p class="mb-4 text-sm text-gray-300">{selectedEndpoint.description}</p>

						<div class="space-y-3 text-sm">
							<div>
								<span class="font-medium text-gray-400">Endpoint:</span>
								<code
									class="ml-2 overflow-x-auto rounded bg-gray-900 px-2 py-1 text-xs break-words whitespace-pre-wrap text-blue-400"
									>{selectedEndpoint.path}</code
								>
							</div>
							<div>
								<span class="font-medium text-gray-400">Category:</span>
								<span class="ml-2 text-white capitalize">{selectedEndpoint.category}</span>
							</div>
							{#if selectedEndpoint.tags?.length > 0}
								<div>
									<span class="font-medium text-gray-400">Tags:</span>
									<div class="mt-1 flex flex-wrap gap-1">
										{#each selectedEndpoint.tags as tag}
											<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
												>{tag}</span
											>
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
							<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<h3 class="text-lg font-semibold text-white">Real Data Examples</h3>
								<span
									class="self-start rounded-full bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-400 sm:self-auto"
								>
									{selectedEndpoint.examples.length} example{selectedEndpoint.examples.length !== 1
										? 's'
										: ''}
								</span>
							</div>
							<div class="space-y-4">
								{#each selectedEndpoint.examples as example, index}
									<details class="example-card group border border-gray-600/50" open={index === 0}>
										<summary
											class="touch-friendly flex cursor-pointer items-center justify-between p-4 hover:bg-gray-700/30"
										>
											<div class="flex-1">
												<h4 class="font-medium text-white">
													{example.name || example.title || `Example ${index + 1}`}
												</h4>
												{#if example.description}
													<p class="mt-1 text-sm text-gray-400">{example.description}</p>
												{/if}
											</div>
											<button
												class="touch-friendly flex items-center space-x-1 rounded px-3 py-2 text-xs text-blue-400 hover:bg-blue-900/20 hover:text-blue-300"
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
												<span class="text-xs font-medium tracking-wide text-gray-400 uppercase"
													>Parameters</span
												>
												<pre
													class="mt-1 overflow-x-auto rounded bg-gray-900 p-3 text-xs break-words whitespace-pre-wrap lg:text-sm">
<code class="text-green-400">{JSON.stringify(example.params, null, 2)}</code></pre>
											</div>

											<!-- Expected Content (if available) -->
											{#if example.expectedContent}
												<div class="mt-3 rounded bg-gray-900/50 p-3">
													<span class="text-xs font-medium tracking-wide text-gray-400 uppercase"
														>Expected Response</span
													>
													<div class="mt-2 space-y-2">
														{#if example.expectedContent.contains?.length > 0}
															<div>
																<span class="text-xs text-blue-400">Contains:</span>
																<div class="mt-1 flex flex-wrap gap-1">
																	{#each example.expectedContent.contains as pattern}
																		<span
																			class="rounded bg-blue-900/20 px-2 py-0.5 text-xs text-blue-300"
																			>{pattern}</span
																		>
																	{/each}
																</div>
															</div>
														{/if}
														{#if example.expectedContent.minLength}
															<div>
																<span class="text-xs text-gray-400">Min length: </span>
																<span class="text-xs text-white"
																	>{example.expectedContent.minLength} chars</span
																>
															</div>
														{/if}
														{#if example.expectedContent.fields}
															<div>
																<span class="text-xs text-blue-400">Expected fields:</span>
																<div class="mt-1 flex flex-wrap gap-1">
																	{#each example.expectedContent.fields as field}
																		<span
																			class="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
																			>{field}</span
																		>
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

					<!-- X-Ray Trace Visualization -->
					{#if performanceData[selectedEndpoint.name] && performanceData[selectedEndpoint.name].xrayTrace}
						<XRayTraceView
							trace={performanceData[selectedEndpoint.name].xrayTrace}
							error={performanceData[selectedEndpoint.name].error ? apiResult : null}
						/>
					{:else if performanceData[selectedEndpoint.name] && performanceData[selectedEndpoint.name].calls && performanceData[selectedEndpoint.name].calls.length > 0}
						<XRayTraceView
							trace={{
								apiCalls: performanceData[selectedEndpoint.name].calls,
								totalDuration: performanceData[selectedEndpoint.name].totalDuration,
								cacheStats: performanceData[selectedEndpoint.name].cacheStats,
								traceId: performanceData[selectedEndpoint.name].traceId
							}}
						/>
					{:else if apiResult && apiResult.error}
						<XRayTraceView
							error={{
								serverErrors: apiResult.details?.stack ? 1 : 0,
								message: apiResult.error,
								details: apiResult.details
							}}
						/>
					{/if}
				</div>
			{:else if selectedEndpoint}
				<!-- Full Width for Experimental/Health Endpoints -->
				<div class="space-y-6 lg:col-span-3">
					<!-- Back Button -->
					<button
						class="touch-friendly flex items-center text-sm text-blue-400 hover:text-blue-300"
						on:click={() => {
							selectedEndpoint = null;
						}}
					>
						← Back to {selectedCategory === 'experimental' ? 'Lab' : 'Health Status'}
					</button>

					<!-- Endpoint Details Card -->
					<div class="rounded-lg border border-gray-700 bg-gray-800 p-4 lg:p-6">
						<h3 class="mb-2 text-lg font-semibold text-white lg:text-xl">
							{selectedEndpoint.name}
						</h3>
						<p class="mb-4 text-sm text-gray-300">{selectedEndpoint.description}</p>

						<div class="space-y-3 text-sm">
							<div>
								<span class="font-medium text-gray-400">Endpoint:</span>
								<code
									class="ml-2 overflow-x-auto rounded bg-gray-900 px-2 py-1 text-xs break-words whitespace-pre-wrap text-blue-400"
									>{selectedEndpoint.path}</code
								>
							</div>
							<div>
								<span class="font-medium text-gray-400">Category:</span>
								<span class="ml-2 text-white capitalize">{selectedEndpoint.category}</span>
							</div>
							{#if selectedEndpoint.tags?.length > 0}
								<div>
									<span class="font-medium text-gray-400">Tags:</span>
									<div class="mt-1 flex flex-wrap gap-1">
										{#each selectedEndpoint.tags as tag}
											<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
												>{tag}</span
											>
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

					<!-- Performance Metrics -->
					{#if performanceData[selectedEndpoint.name]}
						<PerformanceMetrics data={performanceData[selectedEndpoint.name]} />
					{/if}

					<!-- X-Ray Trace Visualization -->
					{#if performanceData[selectedEndpoint.name] && performanceData[selectedEndpoint.name].xrayTrace}
						<XRayTraceView
							trace={performanceData[selectedEndpoint.name].xrayTrace}
							error={performanceData[selectedEndpoint.name].error ? apiResult : null}
						/>
					{:else if performanceData[selectedEndpoint.name] && performanceData[selectedEndpoint.name].calls && performanceData[selectedEndpoint.name].calls.length > 0}
						<XRayTraceView
							trace={{
								apiCalls: performanceData[selectedEndpoint.name].calls,
								totalDuration: performanceData[selectedEndpoint.name].totalDuration,
								cacheStats: performanceData[selectedEndpoint.name].cacheStats,
								traceId: performanceData[selectedEndpoint.name].traceId
							}}
						/>
					{:else if apiResult && apiResult.error}
						<XRayTraceView
							error={{
								serverErrors: apiResult.details?.stack ? 1 : 0,
								message: apiResult.error,
								details: apiResult.details
							}}
						/>
					{/if}
				</div>
			{:else if selectedCategory === 'core'}
				<!-- Core Endpoints with Sidebar -->
				{#if coreEndpoints.length > 0}
					{@const groupedEndpoints = groupCoreEndpoints(coreEndpoints)}
					<!-- Left Sidebar -->
					<div class="lg:col-span-1">
						<div class="sticky top-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
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
													class={`w-full rounded border p-2 text-left text-sm transition-all hover:border-blue-500/50 hover:bg-gray-800/50 ${
														selectedEndpoint?.name === endpoint.name
															? 'border-blue-500/50 bg-blue-900/30'
															: 'border-gray-700/50 bg-gray-900/30'
													}`}
													on:click={() => selectEndpoint(endpoint)}
												>
													<div class="font-medium text-white">
														{endpoint.title || endpoint.name}
													</div>
													<div class="truncate text-xs text-gray-500">{endpoint.path}</div>
												</button>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Main Content -->
					<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-4 lg:col-span-2 lg:p-6">
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
														<h4 class="line-clamp-1 text-sm font-medium text-white">
															{endpoint.title || endpoint.name}
														</h4>
													</div>
													<p class="mb-2 line-clamp-2 text-xs text-gray-400">
														{endpoint.description}
													</p>
													<div class="flex items-center justify-between text-xs">
														<span class="text-gray-500">
															<code class="rounded bg-gray-900 px-1 py-0.5 text-xs"
																>{endpoint.path}</code
															>
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
				{:else}
					<!-- Loading state for core -->
					<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6 lg:col-span-3">
						<p class="text-gray-400">Loading core endpoints...</p>
					</div>
				{/if}
			{:else if selectedCategory === 'extended'}
				<!-- Extended Endpoints with Sidebar -->
				<!-- Left Sidebar -->
				<div class="lg:col-span-1">
					<div class="sticky top-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
						<h3 class="mb-4 text-lg font-semibold text-white">Extended Endpoints</h3>
						<div class="space-y-1">
							{#each extendedEndpoints as endpoint}
								<button
									class={`w-full rounded border p-2 text-left text-sm transition-all hover:border-blue-500/50 hover:bg-gray-800/50 ${
										selectedEndpoint?.name === endpoint.name
											? 'border-blue-500/50 bg-blue-900/30'
											: 'border-gray-700/50 bg-gray-900/30'
									}`}
									on:click={() => selectEndpoint(endpoint)}
								>
									<div class="font-medium text-white">{endpoint.title || endpoint.name}</div>
									<div class="truncate text-xs text-gray-500">{endpoint.path}</div>
								</button>
							{/each}
						</div>
					</div>
				</div>

				<!-- Main Content -->
				<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6 lg:col-span-2">
					<h2 class="mb-4 text-2xl font-bold text-white">Extended Features</h2>
					<p class="mb-6 text-gray-300">
						Intelligent features that combine resources for enhanced workflows
					</p>

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
										<span class="text-gray-500"
											>{Object.keys(endpoint.params || {}).length} parameters</span
										>
										{#if endpoint.examples?.length > 0}
											<span class="text-green-400"
												>{endpoint.examples.length} example{endpoint.examples.length !== 1
													? 's'
													: ''}</span
											>
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
				<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6 lg:col-span-3">
					<h2 class="mb-4 text-2xl font-bold text-white">🧪 Experimental Lab</h2>
					<p class="mb-6 text-gray-300">
						Test cutting-edge features in a separate, clearly marked section
					</p>

					{#if experimentalEndpoints.length > 0}
						<div class="grid gap-4 sm:grid-cols-2">
							{#each experimentalEndpoints as endpoint}
								<div
									class="endpoint-card cursor-pointer border-purple-500/30 transition-all"
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
											⚠️ {endpoint.experimental.warning ||
												'Experimental feature - use with caution'}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{#each experimentalEndpoints as endpoint}
								<div
									class="group rounded-lg border border-purple-700/30 bg-purple-900/10 p-4 transition-colors hover:bg-purple-900/20"
								>
									<h3 class="flex items-center gap-2 font-semibold text-purple-200">
										<span class="text-lg">{endpoint.title}</span>
										{#if !endpoint.enabled}
											<span
												class="rounded-full bg-purple-700/30 px-2 py-0.5 text-xs text-purple-300"
											>
												Coming Soon
											</span>
										{/if}
									</h3>
									<p class="mt-2 text-sm text-purple-400">{endpoint.description}</p>
									<p class="mt-2 font-mono text-xs text-purple-500/70">{endpoint.path}</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if selectedCategory === 'health'}
				<!-- Health Status (Full Width) -->
				<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6 lg:col-span-3">
					<h2 class="mb-4 text-2xl font-bold text-white">Health Status</h2>
					<p class="mb-6 text-gray-300">
						Live endpoint health checks - tests if each endpoint returns valid data
					</p>

					<div class="mb-4">
						<button
							on:click={checkAllEndpointsHealth}
							disabled={isCheckingHealth}
							class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
						>
							{#if isCheckingHealth}
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
								></div>
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
												<div
													class="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"
												></div>
												<span class="text-xs text-blue-400">Checking...</span>
											{:else if health.status === 'healthy'}
												<Check class="h-4 w-4 text-green-400" />
												<span class="text-xs text-green-400">Healthy</span>
											{:else if health.status === 'error'}
												<span class="text-red-400">❌</span>
												<span class="text-xs text-red-400">{health.message || 'Error'}</span>
											{:else if health.status === 'warning'}
												<span class="text-yellow-400">⚠️</span>
												<span class="text-xs text-yellow-400">{health.message || 'Warning'}</span>
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
												<div
													class="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"
												></div>
												<span class="text-xs text-blue-400">Checking...</span>
											{:else if health.status === 'healthy'}
												<Check class="h-4 w-4 text-green-400" />
												<span class="text-xs text-green-400">Healthy</span>
											{:else if health.status === 'error'}
												<span class="text-red-400">❌</span>
												<span class="text-xs text-red-400">{health.message || 'Error'}</span>
											{:else if health.status === 'warning'}
												<span class="text-yellow-400">⚠️</span>
												<span class="text-xs text-yellow-400">{health.message || 'Warning'}</span>
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
								<h3 class="mb-3 text-lg font-semibold text-purple-300">
									🧪 Experimental Endpoints
								</h3>
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
													<div
														class="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"
													></div>
													<span class="text-xs text-purple-400">Checking...</span>
												{:else if health.status === 'healthy'}
													<Check class="h-4 w-4 text-green-400" />
													<span class="text-xs text-green-400">Healthy</span>
												{:else if health.status === 'error'}
													<span class="text-red-400">❌</span>
													<span class="text-xs text-red-400">{health.message || 'Error'}</span>
												{:else if health.status === 'warning'}
													<span class="text-yellow-400">⚠️</span>
													<span class="text-xs text-yellow-400">{health.message || 'Warning'}</span>
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
	{/if}
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
		button,
		.category-card,
		.endpoint-card {
			min-height: 44px;
		}
	}
</style>
