<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Activity, Beaker, Check, Copy, Database, Link, Workflow } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import ApiTester from '../../../lib/components/ApiTester.svelte';
	import PerformanceMetrics from '../../../lib/components/PerformanceMetrics.svelte';
	import XRayTraceView from '../../../lib/components/XRayTraceView.svelte';

	// Three main categories - Core tools, MCP Prompts, and Health status
	type MainCategory = 'core' | 'prompts' | 'health';
	const categoryConfig = {
		core: { name: 'Core Tools', icon: Database },
		prompts: { name: 'MCP Prompts', icon: Workflow },
		health: { name: 'Health Status', icon: Activity }
	} as const;

	// State
	let selectedCategory: MainCategory = 'core';
	let selectedEndpoint: any = null;
	let coreEndpoints: any[] = [];
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
	let endpointTestResults: Record<
		string,
		{ status: 'pending' | 'success' | 'warning' | 'error'; message?: string }
	> = {};
	let isTestingAll = false;

	// MCP Prompts state
	let selectedPrompt: any = null;
	let promptParameters: Record<string, any> = {};
	let isExecutingPrompt = false;
	let promptWorkflowSteps: Array<{
		step: number;
		description: string;
		status: 'pending' | 'running' | 'complete' | 'error';
		duration?: number;
		data?: any;
	}> = [];
	let promptResults: any = null;
	let showRawResponse = false;

	// MCP Prompts definitions
	const mcpPrompts = [
		{
			id: 'translation-helps-for-passage',
			title: 'Complete Translation Help',
			icon: '📖',
			description:
				'Get comprehensive help: scripture, notes, questions, word articles (with titles), and training resources',
			parameters: [
				{
					name: 'reference',
					type: 'text',
					required: true,
					placeholder: 'e.g., John 3:16',
					description: 'Bible reference to get help for'
				},
				{
					name: 'language',
					type: 'text',
					required: false,
					default: 'en',
					placeholder: 'Language code (default: en)',
					description: 'Language for the resources'
				}
			],
			workflow: [
				{ step: 1, tool: 'fetch_scripture', description: 'Fetch scripture text' },
				{ step: 2, tool: 'fetch_translation_questions', description: 'Get translation questions' },
				{ step: 3, tool: 'fetch_translation_word_links', description: 'Get word links' },
				{
					step: 4,
					tool: 'fetch_translation_word',
					description: 'Fetch word articles (multiple calls)',
					multiple: true
				},
				{ step: 5, tool: 'fetch_translation_notes', description: 'Get translation notes' },
				{
					step: 6,
					tool: 'fetch_translation_academy',
					description: 'Get academy articles (multiple calls)',
					multiple: true
				}
			]
		},
		{
			id: 'get-translation-words-for-passage',
			title: 'Dictionary Entries',
			icon: '📚',
			description:
				'Get translation word definitions with human-readable titles (not technical IDs)',
			parameters: [
				{
					name: 'reference',
					type: 'text',
					required: true,
					placeholder: 'e.g., Romans 1:1',
					description: 'Bible reference'
				},
				{ name: 'language', type: 'text', required: false, default: 'en', placeholder: 'en' }
			],
			workflow: [
				{ step: 1, tool: 'fetch_translation_word_links', description: 'Get word links' },
				{
					step: 2,
					tool: 'fetch_translation_word',
					description: 'Fetch word articles and extract titles',
					multiple: true
				}
			]
		},
		{
			id: 'get-translation-academy-for-passage',
			title: 'Training Articles',
			icon: '🎓',
			description: 'Find Translation Academy articles referenced in translation notes',
			parameters: [
				{
					name: 'reference',
					type: 'text',
					required: true,
					placeholder: 'e.g., Matthew 5:13',
					description: 'Bible reference'
				},
				{ name: 'language', type: 'text', required: false, default: 'en', placeholder: 'en' }
			],
			workflow: [
				{ step: 1, tool: 'fetch_translation_notes', description: 'Get translation notes' },
				{
					step: 2,
					tool: 'fetch_translation_academy',
					description: 'Fetch academy articles from supportReferences',
					multiple: true
				}
			]
		}
	];

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

			console.log('🎉 MCP Tools successfully connected to configuration system!');
			isInitialized = true;

			// Check URL for focused endpoint
			const urlParams = new URLSearchParams($page.url.search);
			const toolParam = urlParams.get('tool');
			const categoryParam = $page.url.hash.replace('#', '') || 'core';

			if (categoryParam && categoryParam === 'core') {
				selectedCategory = 'core';
			}

			if (toolParam) {
				// Find the endpoint and focus it
				const endpoint = coreEndpoints.find((e) => e.name === toolParam);
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
		if (category === 'core') {
			return coreEndpoints;
		}
		if (category === 'prompts') {
			return mcpPrompts;
		}
		return [];
	}

	// Select a prompt
	function selectPrompt(prompt: any) {
		selectedPrompt = prompt;
		selectedCategory = 'prompts';
		promptParameters = {};
		// Set default values
		prompt.parameters.forEach((param: any) => {
			if (param.default) {
				promptParameters[param.name] = param.default;
			}
		});
		promptWorkflowSteps = [];
		promptResults = null;
	}

	// Execute prompt workflow
	async function executePrompt() {
		if (!selectedPrompt) return;

		isExecutingPrompt = true;
		promptResults = null;

		// Initialize workflow steps
		promptWorkflowSteps = selectedPrompt.workflow.map((w: any) => ({
			step: w.step,
			description: w.description,
			status: 'pending' as const
		}));

		try {
			const response = await fetch('/api/execute-prompt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					promptName: selectedPrompt.id,
					parameters: promptParameters
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			promptResults = data;

			// Mark all steps as complete
			promptWorkflowSteps = promptWorkflowSteps.map((step) => ({
				...step,
				status: 'complete' as const
			}));
		} catch (error) {
			console.error('Prompt execution failed:', error);
			// Mark the last step as error
			if (promptWorkflowSteps.length > 0) {
				const lastIndex = promptWorkflowSteps.length - 1;
				promptWorkflowSteps[lastIndex].status = 'error';
			}
		} finally {
			isExecutingPrompt = false;
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
			else if (name === 'fetch-translation-word' || name === 'fetch-translation-academy') {
				groups.rcLinked.push(endpoint);
			}
			// Everything else goes to discovery (should be none for core)
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
			rcLinked: ['fetch-translation-word', 'fetch-translation-academy'],
			discovery: [] // No discovery endpoints in core
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
					'Translation helps organized by scripture reference (Notes, Questions, Word Links)',
				endpoints: groups.verseReferenced
			},
			'RC Linked Data': {
				icon: '🔗',
				description: 'Resources accessed via RC links (Translation Words, Translation Academy)',
				endpoints: groups.rcLinked
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

	// Test a single endpoint with its default parameters
	async function testEndpoint(endpoint: any) {
		const testParams: Record<string, any> = {};

		// Build default test parameters based on endpoint name
		if (endpoint.name === 'fetch-scripture') {
			testParams.reference = 'John 3:16';
			testParams.language = 'en';
			testParams.organization = 'unfoldingWord';
		} else if (endpoint.name === 'translation-notes') {
			testParams.reference = 'John 3:16';
			testParams.language = 'en';
			testParams.organization = 'unfoldingWord';
		} else if (endpoint.name === 'translation-questions') {
			testParams.reference = 'John 3:16';
			testParams.language = 'en';
			testParams.organization = 'unfoldingWord';
		} else if (endpoint.name === 'fetch-translation-word') {
			testParams.term = 'faith';
			testParams.language = 'en';
			testParams.organization = 'unfoldingWord';
		} else if (endpoint.name === 'fetch-translation-word-links') {
			testParams.reference = 'John 3:16';
			testParams.language = 'en';
			testParams.organization = 'unfoldingWord';
		} else if (endpoint.name === 'fetch-translation-academy') {
			testParams.language = 'en';
			testParams.organization = 'unfoldingWord';
		}

		// Build query string
		const params = new URLSearchParams();
		Object.entries(testParams).forEach(([key, value]) => {
			if (value !== null && value !== undefined && value !== '') {
				params.append(key, String(value));
			}
		});

		const queryString = params.toString();
		const url = `/api${endpoint.path}${queryString ? '?' + queryString : ''}`;

		try {
			endpointTestResults[endpoint.name] = { status: 'pending' };

			const response = await fetch(url);
			const data = await response.json();

			if (!response.ok) {
				endpointTestResults[endpoint.name] = {
					status: 'error',
					message: `HTTP ${response.status}: ${data.error || data.message || 'Unknown error'}`
				};
			} else if (data.error) {
				endpointTestResults[endpoint.name] = {
					status: 'error',
					message: data.error
				};
			} else if (data.items && Array.isArray(data.items) && data.items.length === 0) {
				endpointTestResults[endpoint.name] = {
					status: 'warning',
					message: 'Returns empty results'
				};
			} else if (data.metadata?.error) {
				endpointTestResults[endpoint.name] = {
					status: 'warning',
					message: data.metadata.error
				};
			} else {
				endpointTestResults[endpoint.name] = { status: 'success' };
			}
		} catch (err) {
			endpointTestResults[endpoint.name] = {
				status: 'error',
				message: err instanceof Error ? err.message : 'Unknown error'
			};
		}

		// Force UI update
		endpointTestResults = endpointTestResults;
	}

	// Test all endpoints
	async function testAllEndpoints() {
		isTestingAll = true;

		// Clear previous results
		endpointTestResults = {};

		// Test each core endpoint
		for (const endpoint of coreEndpoints) {
			await testEndpoint(endpoint);
			// Small delay to avoid overwhelming the server
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		isTestingAll = false;
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
			} else if (endpoint.name === 'fetch-translation-word') {
				testParams.term = 'faith';
				testParams.language = 'en';
				testParams.organization = 'unfoldingWord';
			} else if (endpoint.name === 'fetch-translation-word-links') {
				testParams.reference = 'John 3:16';
				testParams.language = 'en';
				testParams.organization = 'unfoldingWord';
			} else if (endpoint.name === 'fetch-translation-academy') {
				testParams.language = 'en';
				testParams.organization = 'unfoldingWord';
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

		// Check all core endpoints in parallel
		await Promise.all(coreEndpoints.map((endpoint) => checkEndpointHealth(endpoint)));

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

	<!-- Two Main Tabs -->
	<div class="mb-6 flex space-x-1 rounded-lg bg-gray-800 p-1">
		<button
			class="tab-button touch-friendly flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
			class:active={selectedCategory === 'core'}
			on:click={() => {
				selectedCategory = 'core';
				selectedEndpoint = null;
				selectedPrompt = null;
			}}
		>
			Core Tools
		</button>
		<button
			class="tab-button touch-friendly flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
			class:active={selectedCategory === 'prompts'}
			on:click={() => {
				selectedCategory = 'prompts';
				selectedEndpoint = null;
				selectedPrompt = null;
			}}
		>
			✨ MCP Prompts
		</button>
		<button
			class="tab-button touch-friendly flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
			class:active={selectedCategory === 'health'}
			on:click={() => {
				selectedCategory = 'health';
				selectedEndpoint = null;
				selectedPrompt = null;
			}}
		>
			💪 Health Status
		</button>
	</div>

	<!-- Test All Endpoints Button -->
	{#if selectedCategory === 'core'}
		<div class="mb-4 flex justify-end">
			<button
				class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
				on:click={testAllEndpoints}
				disabled={isTestingAll}
			>
				{#if isTestingAll}
					<span class="flex items-center gap-2">
						<span
							class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
						></span>
						Testing Endpoints...
					</span>
				{:else}
					Test All Endpoints
				{/if}
			</button>
		</div>
	{/if}

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
			{#if selectedEndpoint && selectedCategory === 'core'}
				<!-- Persistent Sidebar + Endpoint Details View -->
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
												<div class="flex items-start justify-between gap-2">
													<div>
														<div class="font-medium text-white">
															{endpoint.title || endpoint.name}
														</div>
														<div class="truncate text-xs text-gray-500">{endpoint.path}</div>
													</div>
													{#if endpointTestResults[endpoint.name]}
														<div class="mt-1 flex-shrink-0">
															{#if endpointTestResults[endpoint.name].status === 'pending'}
																<span
																	class="block h-2 w-2 animate-pulse rounded-full bg-gray-400"
																	title="Testing..."
																></span>
															{:else if endpointTestResults[endpoint.name].status === 'success'}
																<span
																	class="block h-2 w-2 rounded-full bg-green-500"
																	title="Working"
																></span>
															{:else if endpointTestResults[endpoint.name].status === 'warning'}
																<span
																	class="block h-2 w-2 rounded-full bg-yellow-500"
																	title={endpointTestResults[endpoint.name].message || 'Warning'}
																></span>
															{:else if endpointTestResults[endpoint.name].status === 'error'}
																<span
																	class="block h-2 w-2 rounded-full bg-red-500"
																	title={endpointTestResults[endpoint.name].message || 'Error'}
																></span>
															{/if}
														</div>
													{/if}
												</div>
											</button>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>

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
													<div class="flex items-start justify-between gap-2">
														<div>
															<div class="font-medium text-white">
																{endpoint.title || endpoint.name}
															</div>
															<div class="truncate text-xs text-gray-500">{endpoint.path}</div>
														</div>
														{#if endpointTestResults[endpoint.name]}
															<div class="mt-1 flex-shrink-0">
																{#if endpointTestResults[endpoint.name].status === 'pending'}
																	<span
																		class="block h-2 w-2 animate-pulse rounded-full bg-gray-400"
																		title="Testing..."
																	></span>
																{:else if endpointTestResults[endpoint.name].status === 'success'}
																	<span
																		class="block h-2 w-2 rounded-full bg-green-500"
																		title="Working"
																	></span>
																{:else if endpointTestResults[endpoint.name].status === 'warning'}
																	<span
																		class="block h-2 w-2 rounded-full bg-yellow-500"
																		title={endpointTestResults[endpoint.name].message || 'Warning'}
																	></span>
																{:else if endpointTestResults[endpoint.name].status === 'error'}
																	<span
																		class="block h-2 w-2 rounded-full bg-red-500"
																		title={endpointTestResults[endpoint.name].message || 'Error'}
																	></span>
																{/if}
															</div>
														{/if}
													</div>
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
			{:else if selectedCategory === 'prompts'}
				<!-- MCP Prompts View -->
				{#if !selectedPrompt}
					<!-- Prompts List -->
					<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6 lg:col-span-3">
						<h2 class="mb-4 text-2xl font-bold text-white">✨ MCP Prompts</h2>
						<p class="mb-6 text-gray-300">
							Guided workflows that chain multiple tools together for comprehensive translation help
						</p>

						<div class="grid gap-4 md:grid-cols-3">
							{#each mcpPrompts as prompt}
								<button
									class="group rounded-lg border border-gray-700 bg-gray-900/50 p-6 text-left transition-all hover:border-blue-500/50 hover:bg-gray-900"
									on:click={() => selectPrompt(prompt)}
								>
									<div class="mb-3 flex items-center gap-3">
										<span class="text-3xl">{prompt.icon}</span>
										<div>
											<h3 class="text-lg font-semibold text-white group-hover:text-blue-400">
												{prompt.title}
											</h3>
										</div>
									</div>
									<p class="mb-4 text-sm text-gray-400">{prompt.description}</p>
									<div class="text-xs text-gray-500">
										{prompt.workflow.length} steps • {prompt.parameters.length} parameters
									</div>
								</button>
							{/each}
						</div>

						<div class="mt-6 rounded-lg border border-blue-500/30 bg-blue-900/10 p-4">
							<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-400">
								<span>ℹ️</span>
								About MCP Prompts
							</h3>
							<p class="text-sm text-gray-300">
								Prompts are guided workflows that help AI assistants chain multiple tool calls
								together intelligently. Click any prompt above to try it out!
							</p>
						</div>
					</div>
				{:else}
					<!-- Prompt Executor -->
					<div class="lg:col-span-3">
						<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
							<!-- Header -->
							<div class="mb-6 flex items-start justify-between">
								<div>
									<div class="mb-2 flex items-center gap-3">
										<span class="text-3xl">{selectedPrompt.icon}</span>
										<h2 class="text-2xl font-bold text-white">{selectedPrompt.title}</h2>
									</div>
									<p class="text-gray-300">{selectedPrompt.description}</p>
								</div>
								<button
									class="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600"
									on:click={() => {
										selectedPrompt = null;
										promptResults = null;
										promptWorkflowSteps = [];
									}}
								>
									← Back to Prompts
								</button>
							</div>

							<!-- Parameter Form -->
							<div class="mb-6 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
								<h3 class="mb-4 text-lg font-semibold text-white">Parameters</h3>
								<form on:submit|preventDefault={executePrompt} class="space-y-4">
									{#each selectedPrompt.parameters as param}
										<div>
											<label class="mb-1 block text-sm font-medium text-gray-300">
												{param.name}
												{#if param.required}
													<span class="text-red-400">*</span>
												{/if}
											</label>
											<input
												type={param.type}
												bind:value={promptParameters[param.name]}
												placeholder={param.placeholder}
												required={param.required}
												class="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
											/>
											{#if param.description}
												<p class="mt-1 text-xs text-gray-500">{param.description}</p>
											{/if}
										</div>
									{/each}
									<button
										type="submit"
										disabled={isExecutingPrompt}
										class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
									>
										{#if isExecutingPrompt}
											<span class="flex items-center gap-2">
												<span
													class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
												></span>
												Executing Workflow...
											</span>
										{:else}
											Execute Prompt
										{/if}
									</button>
								</form>
							</div>

							<!-- Workflow Progress -->
							{#if promptWorkflowSteps.length > 0}
								<div class="mb-6 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
									<h3 class="mb-4 text-lg font-semibold text-white">Workflow Progress</h3>
									<div class="space-y-2">
										{#each promptWorkflowSteps as step}
											<div
												class="flex items-center gap-3 rounded-lg p-3 {step.status === 'complete'
													? 'bg-green-900/20'
													: step.status === 'running'
														? 'bg-blue-900/20'
														: step.status === 'error'
															? 'bg-red-900/20'
															: 'bg-gray-800/50'}"
											>
												<div class="flex-shrink-0">
													{#if step.status === 'complete'}
														<span class="text-green-400">✅</span>
													{:else if step.status === 'running'}
														<span
															class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"
														></span>
													{:else if step.status === 'error'}
														<span class="text-red-400">❌</span>
													{:else}
														<span class="text-gray-500">⏹️</span>
													{/if}
												</div>
												<div class="flex-1">
													<div class="text-sm font-medium text-gray-200">
														Step {step.step}: {step.description}
													</div>
													{#if step.duration}
														<div class="text-xs text-gray-500">({step.duration}ms)</div>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Results -->
							{#if promptResults}
								<div class="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
									<div class="mb-4 flex items-center justify-between">
										<h3 class="text-lg font-semibold text-white">Results</h3>
										<button
											on:click={() => (showRawResponse = !showRawResponse)}
											class="rounded-lg border border-gray-600 bg-gray-700 px-3 py-1 text-sm text-gray-300 hover:bg-gray-600"
										>
											{showRawResponse ? '✨ Show Formatted' : '📋 Show Raw JSON'}
										</button>
									</div>
									<div class="space-y-4">
										{#if showRawResponse}
											<!-- Raw JSON Response -->
											<pre
												class="overflow-x-auto rounded-lg bg-gray-800 p-4 text-xs text-gray-300">{JSON.stringify(
													promptResults,
													null,
													2
												)}</pre>
										{:else if selectedPrompt.id === 'translation-helps-for-passage' && promptResults.words}
											<!-- Comprehensive Results -->
											<div class="space-y-4">
												<div>
													<h4 class="mb-2 text-sm font-semibold text-blue-400">
														📖 Scripture Text
													</h4>
													<div class="rounded-lg bg-gray-800 p-3 text-sm text-gray-300">
														{promptResults.scripture?.text || 'No scripture found'}
													</div>
												</div>

												<div>
													<h4 class="mb-2 text-sm font-semibold text-blue-400">
														📚 Key Terms ({promptResults.words?.length || 0})
													</h4>
													<div class="space-y-3">
														{#each promptResults.words || [] as word}
															<div
																class="rounded-lg bg-gray-800 p-4 {word.error
																	? 'border border-red-500/30'
																	: ''}"
															>
																<div class="mb-2 flex items-start justify-between">
																	<div>
																		<div class="font-medium text-white">{word.title}</div>
																		<div class="text-xs text-gray-500">
																			{word.term} • {word.category}
																			{#if word.error}
																				<span class="text-red-400">• Error loading</span>
																			{/if}
																		</div>
																	</div>
																</div>
																{#if word.content}
																	<details class="mt-2">
																		<summary
																			class="cursor-pointer text-xs text-blue-400 hover:text-blue-300"
																		>
																			Show content
																		</summary>
																		<div
																			class="prose prose-invert prose-sm mt-2 max-w-none overflow-auto rounded border border-gray-700 bg-gray-900 p-3 text-xs"
																		>
																			{@html word.content
																				.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
																				.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
																				.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
																				.replace(/\n\n/g, '</p><p>')
																				.replace(/^(.+)$/gm, '<p>$1</p>')}
																		</div>
																	</details>
																{/if}
															</div>
														{/each}
													</div>
												</div>

												<div>
													<h4 class="mb-2 text-sm font-semibold text-blue-400">
														❓ Translation Questions ({promptResults.questions?.count || 0})
													</h4>
													<div class="space-y-2">
														{#each promptResults.questions?.items || [] as question}
															<div class="rounded-lg bg-gray-800 p-3">
																<div class="mb-1 text-sm font-medium text-white">
																	{question.Question}
																</div>
																<div class="text-xs text-gray-400">{question.Response}</div>
															</div>
														{/each}
													</div>
												</div>

												<div>
													<h4 class="mb-2 text-sm font-semibold text-blue-400">
														📝 Translation Notes ({promptResults.notes?.notes?.length ||
															promptResults.notes?.items?.length ||
															0})
													</h4>
													<div class="space-y-2">
														{#each promptResults.notes?.notes || promptResults.notes?.items || [] as note}
															<div class="rounded-lg bg-gray-800 p-3">
																<div class="mb-1 flex items-start justify-between gap-2">
																	<div class="text-sm font-medium text-white">
																		{note.Quote || 'General note'}
																	</div>
																	{#if note.SupportReference}
																		<div class="flex-shrink-0 text-xs text-blue-400">
																			{note.SupportReference.split('/').pop()}
																		</div>
																	{/if}
																</div>
																<div class="text-xs text-gray-400">
																	{note.Note?.substring(0, 200)}{note.Note?.length > 200
																		? '...'
																		: ''}
																</div>
															</div>
														{/each}
													</div>
												</div>

												<div>
													<h4 class="mb-2 text-sm font-semibold text-blue-400">
														🎓 Academy Articles ({promptResults.academyArticles?.length || 0})
													</h4>
													<div class="space-y-3">
														{#each promptResults.academyArticles || [] as article}
															<div
																class="rounded-lg bg-gray-800 p-4 {article.error
																	? 'border border-red-500/30'
																	: ''}"
															>
																<div class="mb-2 flex items-start justify-between">
																	<div>
																		<div class="font-medium text-white">{article.title}</div>
																		<div class="text-xs text-gray-500">
																			{article.moduleId}
																			{#if article.category}• {article.category}{/if}
																			{#if article.error}
																				<span class="text-red-400">• Error loading</span>
																			{/if}
																		</div>
																	</div>
																</div>
																{#if article.content}
																	<details class="mt-2">
																		<summary
																			class="cursor-pointer text-xs text-blue-400 hover:text-blue-300"
																		>
																			Show content
																		</summary>
																		<div
																			class="prose prose-invert prose-sm mt-2 max-w-none overflow-auto rounded border border-gray-700 bg-gray-900 p-3 text-xs"
																		>
																			{@html article.content
																				.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
																				.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
																				.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
																				.replace(/\n\n/g, '</p><p>')
																				.replace(/^(.+)$/gm, '<p>$1</p>')}
																		</div>
																	</details>
																{/if}
															</div>
														{/each}
													</div>
												</div>
											</div>
										{:else if selectedPrompt.id === 'get-translation-words-for-passage' && promptResults.words}
											<!-- Translation Words Only Results -->
											<div class="space-y-4">
												<div>
													<h4 class="mb-2 text-sm font-semibold text-blue-400">
														📚 Key Terms ({promptResults.words?.length || 0})
													</h4>
													<div class="space-y-3">
														{#each promptResults.words || [] as word}
															<div
																class="rounded-lg bg-gray-800 p-4 {word.error
																	? 'border border-red-500/30'
																	: ''}"
															>
																<div class="mb-2 flex items-start justify-between">
																	<div>
																		<div class="font-medium text-white">{word.title}</div>
																		<div class="text-xs text-gray-500">
																			{word.term} • {word.category}
																			{#if word.error}
																				<span class="text-red-400">• Error loading</span>
																			{/if}
																		</div>
																	</div>
																</div>
																{#if word.content}
																	<details class="mt-2">
																		<summary
																			class="cursor-pointer text-xs text-blue-400 hover:text-blue-300"
																		>
																			Show content
																		</summary>
																		<div
																			class="prose prose-invert prose-sm mt-2 max-w-none overflow-auto rounded border border-gray-700 bg-gray-900 p-3 text-xs"
																		>
																			{@html word.content
																				.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
																				.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
																				.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
																				.replace(/\n\n/g, '</p><p>')
																				.replace(/^(.+)$/gm, '<p>$1</p>')}
																		</div>
																	</details>
																{/if}
															</div>
														{/each}
													</div>
												</div>
											</div>
										{:else if selectedPrompt.id === 'get-translation-academy-for-passage' && promptResults.academyArticles}
											<!-- Translation Academy Only Results -->
											<div class="space-y-4">
												<div>
													<h4 class="mb-2 text-sm font-semibold text-blue-400">
														🎓 Academy Articles ({promptResults.academyArticles?.length || 0})
													</h4>
													<div class="space-y-3">
														{#each promptResults.academyArticles || [] as article}
															<div
																class="rounded-lg bg-gray-800 p-4 {article.error
																	? 'border border-red-500/30'
																	: ''}"
															>
																<div class="mb-2 flex items-start justify-between">
																	<div>
																		<div class="font-medium text-white">{article.title}</div>
																		<div class="text-xs text-gray-500">
																			{article.moduleId}
																			{#if article.category}• {article.category}{/if}
																			{#if article.error}
																				<span class="text-red-400">• Error loading</span>
																			{/if}
																		</div>
																	</div>
																</div>
																{#if article.content}
																	<details class="mt-2">
																		<summary
																			class="cursor-pointer text-xs text-blue-400 hover:text-blue-300"
																		>
																			Show content
																		</summary>
																		<div
																			class="prose prose-invert prose-sm mt-2 max-w-none overflow-auto rounded border border-gray-700 bg-gray-900 p-3 text-xs"
																		>
																			{@html article.content
																				.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
																				.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
																				.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
																				.replace(/\n\n/g, '</p><p>')
																				.replace(/^(.+)$/gm, '<p>$1</p>')}
																		</div>
																	</details>
																{/if}
															</div>
														{/each}
													</div>
												</div>
											</div>
										{:else}
											<!-- Generic JSON Results -->
											<pre
												class="overflow-x-auto rounded-lg bg-gray-800 p-4 text-xs text-gray-300">{JSON.stringify(
													promptResults,
													null,
													2
												)}</pre>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
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
