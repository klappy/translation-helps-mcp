<script lang="ts">
	import { onMount } from 'svelte';
	import {
		TestTube,
		Play,
		Copy,
		Check,
		X,
		Clock,
		Zap,
		ChevronDown,
		ChevronUp,
		Settings,
		BarChart3,
		FileText,
		MessageSquare,
		BookOpen,
		Users,
		Code,
		Loader2,
		Activity,
		Timer,
		TrendingUp,
		AlertTriangle,
		CheckCircle2,
		XCircle,
		Info,
		RefreshCw
	} from 'lucide-svelte';
	import BibleVerse from '$lib/components/BibleVerse.svelte';
	import TranslationWord from '$lib/components/TranslationWord.svelte';

	// Types
	interface TestResult {
		id: string;
		endpoint: string;
		params: Record<string, string>;
		status: 'pending' | 'success' | 'error';
		responseTime: number;
		serverTime: number;
		data: any;
		error?: string;
		timestamp: Date;
		debugInfo?: {
			requestSize: number;
			responseSize: number;
			networkLatency: number;
			processingTime: number;
		};
	}

	interface BulkTestResult {
		total: number;
		passed: number;
		failed: number;
		results: TestResult[];
		totalTime: number;
		debugLogs: string[];
		performanceMetrics: {
			averageResponseTime: number;
			fastestResponse: number;
			slowestResponse: number;
			successRate: number;
		};
	}

	// State
	let activeTab = 'individual';
	let testResults: TestResult[] = [];
	let bulkResults: BulkTestResult | null = null;
	let isRunning = false;
	let isBulkRunning = false;
	let expandedResults = new Set<string>();
	let showDebugInfo = true;
	let autoScroll = true;

	// Form data
	let formData = {
		reference: 'Titus 1:1',
		language: 'en',
		organization: 'unfoldingWord',
		includeTitle: true,
		includeSubtitle: true,
		includeContent: true
	};

	let bulkConfig = {
		type: 'quick',
		count: 5,
		parallel: false, // Default to sequential to avoid rate limits
		delay: 500, // Increased delay to be more gentle on the server
		batchSize: 10 // Run tests in batches to avoid overwhelming the server
	};

	// API endpoints with enhanced metadata
	const endpoints = [
		{
			name: 'Scripture',
			icon: BookOpen,
			path: '/.netlify/functions/fetch-scripture',
			description: 'Fetch Bible verses with context',
			color: 'from-blue-500 to-cyan-500',
			category: 'core'
		},
		{
			name: 'Translation Notes',
			icon: FileText,
			path: '/.netlify/functions/fetch-translation-notes',
			description: 'Get translation notes and insights',
			color: 'from-green-500 to-emerald-500',
			category: 'translation'
		},
		{
			name: 'Translation Questions',
			icon: Users,
			path: '/.netlify/functions/fetch-translation-questions',
			description: 'Find answers to translation questions',
			color: 'from-purple-500 to-pink-500',
			category: 'translation'
		},
		{
			name: 'Translation Words',
			icon: Code,
			path: '/.netlify/functions/fetch-translation-words',
			description: 'Get word definitions and usage',
			color: 'from-orange-500 to-red-500',
			category: 'linguistics'
		},
		{
			name: 'Translation Word Links',
			icon: MessageSquare,
			path: '/.netlify/functions/fetch-translation-word-links',
			description: 'Get links to translation word articles',
			color: 'from-indigo-500 to-blue-500',
			category: 'linguistics'
		},
		{
			name: 'All Resources',
			icon: Zap,
			path: '/.netlify/functions/fetch-resources',
			description: 'Fetch all resources for a reference',
			color: 'from-yellow-500 to-orange-500',
			category: 'comprehensive'
		},
		{
			name: 'Available Books',
			icon: BookOpen,
			path: '/.netlify/functions/get-available-books',
			description: 'Get list of available books for each resource type',
			color: 'from-teal-500 to-cyan-500',
			category: 'metadata'
		}
	];

	// Test individual endpoint with enhanced debugging
	async function testEndpoint(endpoint: string, params: Record<string, string> = {}) {
		const startTime = performance.now();
		const id = `${endpoint}-${Date.now()}`;

		// Add to results
		testResults = [
			...testResults,
			{
				id,
				endpoint,
				params,
				status: 'pending',
				responseTime: 0,
				serverTime: 0,
				data: null,
				timestamp: new Date()
			}
		];

		try {
			const url = new URL(endpoint, window.location.origin);
			Object.entries(params).forEach(([key, value]) => {
				if (value) url.searchParams.append(key, value);
			});

			const requestStart = performance.now();
			const response = await fetch(url.toString());
			const requestEnd = performance.now();
			const responseTime = requestEnd - startTime;
			const networkLatency = requestEnd - requestStart;

			const data = await response.json();
			const processingEnd = performance.now();
			const processingTime = processingEnd - requestEnd;

			// Calculate debug info
			const requestSize = JSON.stringify(params).length;
			const responseSize = JSON.stringify(data).length;

			// Update result
			testResults = testResults.map((result) =>
				result.id === id
					? {
							...result,
							status: response.ok ? 'success' : 'error',
							responseTime,
							serverTime: data.responseTime || 0,
							data: response.ok ? data : null,
							error: response.ok ? undefined : data.error || 'Request failed',
							debugInfo: {
								requestSize,
								responseSize,
								networkLatency,
								processingTime
							}
						}
					: result
			);

			// Auto-scroll to latest result
			if (autoScroll) {
				setTimeout(() => {
					const element = document.getElementById(`result-${id}`);
					if (element) {
						element.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}, 100);
			}
		} catch (error) {
			const responseTime = performance.now() - startTime;
			testResults = testResults.map((result) =>
				result.id === id
					? {
							...result,
							status: 'error',
							responseTime,
							serverTime: 0,
							data: null,
							error: error instanceof Error ? error.message : 'Unknown error',
							debugInfo: {
								requestSize: JSON.stringify(params).length,
								responseSize: 0,
								networkLatency: 0,
								processingTime: 0
							}
						}
					: result
			);
		}
	}

	// Test all endpoints with enhanced parallel processing
	async function testAllEndpoints() {
		isRunning = true;
		testResults = [];

		const params = {
			reference: formData.reference,
			language: formData.language,
			organization: formData.organization,
			...(formData.includeTitle !== undefined && {
				includeTitle: formData.includeTitle.toString()
			}),
			...(formData.includeSubtitle !== undefined && {
				includeSubtitle: formData.includeSubtitle.toString()
			}),
			...(formData.includeContent !== undefined && {
				includeContent: formData.includeContent.toString()
			})
		};

		// Test each endpoint with configurable delay
		for (const endpoint of endpoints) {
			await testEndpoint(endpoint.path, params);
			if (bulkConfig.delay > 0) {
				await new Promise((resolve) => setTimeout(resolve, bulkConfig.delay));
			}
		}

		isRunning = false;
	}

	// Enhanced bulk testing with performance metrics
	async function runBulkTests() {
		isBulkRunning = true;
		const startTime = performance.now();
		const debugLogs: string[] = [];
		const results: TestResult[] = [];

		// Generate test cases based on config
		const testCases = await generateTestCases(bulkConfig);
		debugLogs.push(`🚀 Starting bulk test suite with ${testCases.length} test cases`);
		debugLogs.push(`⚡ Parallel execution: ${bulkConfig.parallel ? 'enabled' : 'disabled'}`);
		debugLogs.push(`⏱️ Delay between requests: ${bulkConfig.delay}ms`);
		debugLogs.push(`📦 Batch size: ${bulkConfig.batchSize} tests per batch`);

		// Process tests in batches
		const batchSize = bulkConfig.batchSize || 10;
		for (let batchStart = 0; batchStart < testCases.length; batchStart += batchSize) {
			const batch = testCases.slice(batchStart, batchStart + batchSize);
			const batchNumber = Math.floor(batchStart / batchSize) + 1;
			const totalBatches = Math.ceil(testCases.length / batchSize);

			debugLogs.push(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} tests)`);

			if (bulkConfig.parallel) {
				// Parallel execution within batch
				const promises = batch.map(async (testCase, index) => {
					const overallIndex = batchStart + index;
					debugLogs.push(
						`📡 Starting test ${overallIndex + 1}/${testCases.length}: ${testCase.endpoint}`
					);
					const result = await executeTestCase(testCase);
					debugLogs.push(
						`✅ Completed test ${overallIndex + 1}: ${result.status} (${result.responseTime.toFixed(0)}ms)`
					);
					return result;
				});

				const batchResults = await Promise.all(promises);
				results.push(...batchResults);
			} else {
				// Sequential execution within batch
				for (let i = 0; i < batch.length; i++) {
					const testCase = batch[i];
					const overallIndex = batchStart + i;
					debugLogs.push(
						`📡 Starting test ${overallIndex + 1}/${testCases.length}: ${testCase.endpoint}`
					);
					const result = await executeTestCase(testCase);
					debugLogs.push(
						`✅ Completed test ${overallIndex + 1}: ${result.status} (${result.responseTime.toFixed(0)}ms)`
					);
					results.push(result);

					if (bulkConfig.delay > 0 && i < batch.length - 1) {
						await new Promise((resolve) => setTimeout(resolve, bulkConfig.delay));
					}
				}
			}

			// Delay between batches
			if (batchNumber < totalBatches) {
				const batchDelay = Math.max(bulkConfig.delay * 2, 1000); // Longer delay between batches
				debugLogs.push(`⏸️ Waiting ${batchDelay}ms before next batch...`);
				await new Promise((resolve) => setTimeout(resolve, batchDelay));
			}
		}

		const totalTime = performance.now() - startTime;
		const passed = results.filter((r) => r.status === 'success').length;
		const failed = results.filter((r) => r.status === 'error').length;

		// Calculate performance metrics
		const responseTimes = results.map((r) => r.responseTime);
		const performanceMetrics = {
			averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
			fastestResponse: Math.min(...responseTimes),
			slowestResponse: Math.max(...responseTimes),
			successRate: (passed / results.length) * 100
		};

		bulkResults = {
			total: results.length,
			passed,
			failed,
			results,
			totalTime,
			debugLogs,
			performanceMetrics
		};

		debugLogs.push(`🎯 Test suite completed in ${totalTime.toFixed(0)}ms`);
		debugLogs.push(`📊 Success rate: ${performanceMetrics.successRate.toFixed(1)}%`);
		debugLogs.push(
			`⚡ Average response time: ${performanceMetrics.averageResponseTime.toFixed(0)}ms`
		);

		isBulkRunning = false;
	}

	// Execute a single test case
	async function executeTestCase(testCase: any): Promise<TestResult> {
		const startTime = performance.now();
		const id = `${testCase.endpoint}-${Date.now()}`;

		try {
			const url = new URL(testCase.endpoint, window.location.origin);
			Object.entries(testCase.params).forEach(([key, value]) => {
				if (value) url.searchParams.append(key, value);
			});

			const requestStart = performance.now();
			const response = await fetch(url.toString());
			const requestEnd = performance.now();
			const responseTime = requestEnd - startTime;
			const networkLatency = requestEnd - requestStart;

			const data = await response.json();
			const processingEnd = performance.now();
			const processingTime = processingEnd - requestEnd;

			return {
				id,
				endpoint: testCase.endpoint,
				params: testCase.params,
				status: response.ok ? 'success' : 'error',
				responseTime,
				serverTime: data.responseTime || 0,
				data: response.ok ? data : null,
				error: response.ok ? undefined : data.error || 'Request failed',
				timestamp: new Date(),
				debugInfo: {
					requestSize: JSON.stringify(testCase.params).length,
					responseSize: JSON.stringify(data).length,
					networkLatency,
					processingTime
				}
			};
		} catch (error) {
			return {
				id,
				endpoint: testCase.endpoint,
				params: testCase.params,
				status: 'error',
				responseTime: performance.now() - startTime,
				serverTime: 0,
				data: null,
				error: `${error instanceof Error ? error.message : 'Unknown error'} (URL: ${testCase.endpoint})`,
				timestamp: new Date(),
				debugInfo: {
					requestSize: JSON.stringify(testCase.params).length,
					responseSize: 0,
					networkLatency: 0,
					processingTime: 0
				}
			};
		}
	}

	// Smart test case generation using available books
	async function generateTestCases(config: any) {
		const testCases = [];

		try {
			// First, get available books for each resource
			const availabilityResponse = await fetch(
				'/.netlify/functions/get-available-books?language=en&organization=unfoldingWord'
			);
			if (!availabilityResponse.ok) {
				console.warn('Could not fetch available books, using fallback references');
				return generateFallbackTestCases(config);
			}

			const availability = await availabilityResponse.json();
			const resources = availability.resources || [];

			// Find common books across different resources
			const bibleBooks = resources.find((r) => r.resource === 'bible')?.availableBooks || [];
			const notesBooks = resources.find((r) => r.resource === 'tn')?.availableBooks || [];
			const questionsBooks = resources.find((r) => r.resource === 'tq')?.availableBooks || [];
			const wordsBooks = resources.find((r) => r.resource === 'tw')?.availableBooks || [];
			const wordLinksBooks = resources.find((r) => r.resource === 'twl')?.availableBooks || [];

			// Use books that exist in Bible for sure, and prefer ones that also have multiple resource types
			const priorityBooks = bibleBooks
				.filter(
					(book) =>
						notesBooks.includes(book) ||
						questionsBooks.includes(book) ||
						wordsBooks.includes(book) ||
						wordLinksBooks.includes(book)
				)
				.slice(0, 10); // Take top 10

			const fallbackBooks = bibleBooks.slice(0, 15); // Use any Bible books as fallback
			const smartBooks = priorityBooks.length > 5 ? priorityBooks : fallbackBooks;

			// Convert book codes to readable references
			const bookToReference = {
				TIT: 'Titus 1:1',
				JHN: 'John 3:16',
				GEN: 'Genesis 1:1',
				MAT: 'Matthew 5:1',
				MRK: 'Mark 1:1',
				ROM: 'Romans 1:1',
				'1CO': '1 Corinthians 1:1',
				EPH: 'Ephesians 1:1',
				PHP: 'Philippians 1:1',
				COL: 'Colossians 1:1',
				GAL: 'Galatians 1:1',
				ACT: 'Acts 1:1',
				LUK: 'Luke 1:1',
				HEB: 'Hebrews 1:1',
				JAS: 'James 1:1'
			};

			const smartReferences = smartBooks
				.map((book) => bookToReference[book])
				.filter((ref) => ref) // Remove undefined
				.slice(0, 8); // Limit to reasonable number

			if (smartReferences.length === 0) {
				console.warn('No smart references found, using fallback');
				return generateFallbackTestCases(config);
			}

			console.log(`📚 Using ${smartReferences.length} smart references based on available books`);

			for (let i = 0; i < config.count; i++) {
				const reference = smartReferences[i % smartReferences.length];
				const endpoint = endpoints[i % endpoints.length];

				// Skip get-available-books endpoint for bulk testing (it doesn't need a reference)
				if (endpoint.path.includes('get-available-books')) {
					testCases.push({
						endpoint: endpoint.path,
						params: {
							language: 'en',
							organization: 'unfoldingWord'
						}
					});
				} else {
					testCases.push({
						endpoint: endpoint.path,
						params: {
							reference,
							language: 'en',
							organization: 'unfoldingWord',
							includeTitle: 'true',
							includeSubtitle: 'true',
							includeContent: 'true'
						}
					});
				}
			}
		} catch (error) {
			console.error('Error generating smart test cases:', error);
			return generateFallbackTestCases(config);
		}

		return testCases;
	}

	// Fallback test case generation
	function generateFallbackTestCases(config: any) {
		const testCases = [];
		const references = ['Titus 1:1', 'John 3:16', 'Genesis 1:1', 'Matthew 5:1', 'Mark 1:1'];

		for (let i = 0; i < config.count; i++) {
			const reference = references[i % references.length];
			const endpoint = endpoints[i % endpoints.length];

			testCases.push({
				endpoint: endpoint.path,
				params: {
					reference,
					language: 'en',
					organization: 'unfoldingWord',
					includeTitle: 'true',
					includeSubtitle: 'true',
					includeContent: 'true'
				}
			});
		}

		return testCases;
	}

	// Utility functions
	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}

	function toggleResultExpansion(id: string) {
		if (expandedResults.has(id)) {
			expandedResults.delete(id);
		} else {
			expandedResults.add(id);
		}
		expandedResults = expandedResults; // Trigger reactivity
	}

	function clearResults() {
		testResults = [];
		bulkResults = null;
		expandedResults.clear();
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'success':
				return CheckCircle2;
			case 'error':
				return XCircle;
			case 'pending':
				return Loader2;
			default:
				return Info;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'success':
				return 'text-green-400';
			case 'error':
				return 'text-red-400';
			case 'pending':
				return 'text-yellow-400';
			default:
				return 'text-gray-400';
		}
	}

	function formatBytes(bytes: number) {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	// Auto-scroll to bottom when new results are added
	$: if (testResults.length > 0 && autoScroll) {
		setTimeout(() => {
			const container = document.getElementById('results-container');
			if (container) {
				container.scrollTop = container.scrollHeight;
			}
		}, 100);
	}
</script>

<svelte:head>
	<title>Test Interface - Translation Helps MCP Server</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Header -->
	<div class="mb-12 text-center">
		<div
			class="mb-6 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300"
		>
			<TestTube class="mr-2 h-4 w-4" />
			Advanced Testing Interface
		</div>
		<h1 class="mb-6 text-4xl font-bold text-white md:text-5xl">
			Test & Debug
			<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
				>Translation Helps API</span
			>
		</h1>
		<p class="mx-auto max-w-3xl text-xl text-gray-300">
			Comprehensive testing interface with real-time progress, detailed debug information, and
			performance analytics.
		</p>
	</div>

	<!-- Tab Navigation -->
	<div class="mb-8 flex space-x-1 rounded-xl bg-white/5 p-1 backdrop-blur-xl">
		<button
			class="flex-1 rounded-lg px-6 py-3 font-medium transition-all duration-200 {activeTab ===
			'individual'
				? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
				: 'text-gray-300 hover:text-white'}"
			on:click={() => (activeTab = 'individual')}
		>
			<TestTube class="mr-2 inline h-4 w-4" />
			Individual Tests
		</button>
		<button
			class="flex-1 rounded-lg px-6 py-3 font-medium transition-all duration-200 {activeTab ===
			'bulk'
				? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
				: 'text-gray-300 hover:text-white'}"
			on:click={() => (activeTab = 'bulk')}
		>
			<BarChart3 class="mr-2 inline h-4 w-4" />
			Bulk Testing
		</button>
	</div>

	<!-- Individual Testing -->
	{#if activeTab === 'individual'}
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Test Configuration -->
			<div class="lg:col-span-1">
				<div
					class="sticky top-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
				>
					<div class="mb-6 flex items-center justify-between">
						<h2 class="text-xl font-semibold text-white">Test Configuration</h2>
						<Settings class="h-5 w-5 text-gray-400" />
					</div>

					<form class="space-y-6">
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-300">Bible Reference</label>
							<input
								type="text"
								bind:value={formData.reference}
								class="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-400 transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
								placeholder="e.g., Titus 1:1"
							/>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="mb-2 block text-sm font-medium text-gray-300">Language</label>
								<select
									bind:value={formData.language}
									class="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
								>
									<option value="en">English</option>
									<option value="es">Spanish</option>
									<option value="fr">French</option>
									<option value="de">German</option>
								</select>
							</div>
							<div>
								<label class="mb-2 block text-sm font-medium text-gray-300">Organization</label>
								<select
									bind:value={formData.organization}
									class="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
								>
									<option value="unfoldingWord">unfoldingWord</option>
									<option value="bible">Bible</option>
								</select>
							</div>
						</div>

						<div class="space-y-3">
							<label class="block text-sm font-medium text-gray-300">Include Options</label>
							<div class="space-y-2">
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={formData.includeTitle}
										class="h-4 w-4 rounded border-white/10 bg-black/30 text-purple-600 focus:ring-purple-500"
									/>
									<span class="ml-2 text-sm text-gray-300">Include Title</span>
								</label>
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={formData.includeSubtitle}
										class="h-4 w-4 rounded border-white/10 bg-black/30 text-purple-600 focus:ring-purple-500"
									/>
									<span class="ml-2 text-sm text-gray-300">Include Subtitle</span>
								</label>
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={formData.includeContent}
										class="h-4 w-4 rounded border-white/10 bg-black/30 text-purple-600 focus:ring-purple-500"
									/>
									<span class="ml-2 text-sm text-gray-300">Include Content</span>
								</label>
							</div>
						</div>

						<div class="space-y-3">
							<label class="block text-sm font-medium text-gray-300">Display Options</label>
							<div class="space-y-2">
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={showDebugInfo}
										class="h-4 w-4 rounded border-white/10 bg-black/30 text-purple-600 focus:ring-purple-500"
									/>
									<span class="ml-2 text-sm text-gray-300">Show Debug Info</span>
								</label>
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={autoScroll}
										class="h-4 w-4 rounded border-white/10 bg-black/30 text-purple-600 focus:ring-purple-500"
									/>
									<span class="ml-2 text-sm text-gray-300">Auto-scroll</span>
								</label>
							</div>
						</div>

						<div class="border-t border-white/10 pt-4">
							<button
								type="button"
								on:click={testAllEndpoints}
								disabled={isRunning}
								class="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:from-purple-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if isRunning}
									<Loader2 class="mr-2 h-5 w-5 animate-spin" />
									Running Tests...
								{:else}
									<Play class="mr-2 h-5 w-5" />
									Test All Endpoints
								{/if}
							</button>
						</div>
					</form>
				</div>
			</div>

			<!-- Test Results -->
			<div class="lg:col-span-2">
				<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
					<div class="mb-6 flex items-center justify-between">
						<h2 class="text-xl font-semibold text-white">Test Results</h2>
						<div class="flex items-center space-x-2">
							<button
								on:click={clearResults}
								class="rounded-lg bg-red-500/20 px-3 py-1 text-sm text-red-400 transition-colors hover:bg-red-500/30"
							>
								Clear All
							</button>
							<span class="text-sm text-gray-400">
								{testResults.length} results
							</span>
						</div>
					</div>

					{#if testResults.length === 0}
						<div class="py-12 text-center">
							<TestTube class="mx-auto mb-4 h-16 w-16 text-gray-400" />
							<p class="text-gray-400">No test results yet. Run some tests to see results here.</p>
						</div>
					{:else}
						<div id="results-container" class="max-h-96 space-y-4 overflow-y-auto">
							{#each testResults as result (result.id)}
								<div
									id="result-{result.id}"
									class="rounded-xl border border-white/5 bg-black/20 p-4 transition-colors hover:border-white/10"
								>
									<!-- Result Header -->
									<div class="mb-3 flex items-center justify-between">
										<div class="flex items-center space-x-3">
											<svelte:component
												this={getStatusIcon(result.status)}
												class="h-5 w-5 {getStatusColor(result.status)}"
											/>
											<div>
												<h3 class="text-lg font-semibold text-white">
													{result.endpoint.split('/').pop()}
												</h3>
												<p class="text-sm text-gray-400">{result.timestamp.toLocaleTimeString()}</p>
											</div>
										</div>
										<div class="flex items-center space-x-4">
											<div class="text-right">
												<div class="text-sm text-gray-400">Response Time</div>
												<div class="text-lg font-semibold text-white">
													{result.responseTime.toFixed(0)}ms
												</div>
											</div>
											<button
												on:click={() => toggleResultExpansion(result.id)}
												class="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
											>
												{#if expandedResults.has(result.id)}
													<ChevronUp class="h-4 w-4 text-gray-400" />
												{:else}
													<ChevronDown class="h-4 w-4 text-gray-400" />
												{/if}
											</button>
										</div>
									</div>

									<!-- Debug Info (if enabled) -->
									{#if showDebugInfo && result.debugInfo}
										<div
											class="mb-3 grid grid-cols-2 gap-4 rounded-lg bg-black/20 p-3 md:grid-cols-4"
										>
											<div class="text-center">
												<div class="text-xs text-gray-400">Request Size</div>
												<div class="text-sm font-semibold text-blue-400">
													{formatBytes(result.debugInfo.requestSize)}
												</div>
											</div>
											<div class="text-center">
												<div class="text-xs text-gray-400">Response Size</div>
												<div class="text-sm font-semibold text-green-400">
													{formatBytes(result.debugInfo.responseSize)}
												</div>
											</div>
											<div class="text-center">
												<div class="text-xs text-gray-400">Network Latency</div>
												<div class="text-sm font-semibold text-yellow-400">
													{result.debugInfo.networkLatency.toFixed(0)}ms
												</div>
											</div>
											<div class="text-center">
												<div class="text-xs text-gray-400">Processing</div>
												<div class="text-sm font-semibold text-purple-400">
													{result.debugInfo.processingTime.toFixed(0)}ms
												</div>
											</div>
										</div>
									{/if}

									<!-- Expanded Content -->
									{#if expandedResults.has(result.id)}
										<div class="space-y-4 border-t border-white/10 pt-4">
											<!-- Parameters -->
											<div>
												<h4 class="mb-2 text-sm font-medium text-gray-400">Parameters</h4>
												<div class="rounded-lg bg-black/20 p-3">
													<pre class="overflow-x-auto text-sm text-gray-300">{JSON.stringify(
															result.params,
															null,
															2
														)}</pre>
												</div>
											</div>

											<!-- Response Data -->
											{#if result.data}
												<div>
													<h4 class="mb-2 text-sm font-medium text-gray-400">Response Data</h4>
													<div class="max-h-64 overflow-y-auto rounded-lg bg-black/20 p-3">
														<pre class="text-sm text-gray-300">{JSON.stringify(
																result.data,
																null,
																2
															)}</pre>
													</div>
												</div>

												<!-- Rich Data Display -->
												{#if result.data.scripture}
													<div>
														<h4 class="mb-2 text-sm font-medium text-gray-400">
															Scripture Display
														</h4>
														<BibleVerse verse={result.data.scripture} theme="highlight" />
													</div>
												{/if}

												{#if result.data.translationWords && result.data.translationWords.length > 0}
													<div>
														<h4 class="mb-2 text-sm font-medium text-gray-400">
															Translation Words
														</h4>
														<div class="space-y-3">
															{#each result.data.translationWords as word}
																<TranslationWord {word} theme="expanded" />
															{/each}
														</div>
													</div>
												{/if}
											{:else if result.error}
												<div>
													<h4 class="mb-2 text-sm font-medium text-gray-400">Error</h4>
													<div class="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
														<p class="text-sm text-red-400">{result.error}</p>
													</div>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Bulk Testing -->
	{#if activeTab === 'bulk'}
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Bulk Configuration -->
			<div class="lg:col-span-1">
				<div
					class="sticky top-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
				>
					<div class="mb-6 flex items-center justify-between">
						<h2 class="text-xl font-semibold text-white">Bulk Test Configuration</h2>
						<BarChart3 class="h-5 w-5 text-gray-400" />
					</div>

					<div class="space-y-6">
						<div>
							<label class="mb-2 block text-sm font-medium text-gray-300">Test Type</label>
							<select
								bind:value={bulkConfig.type}
								class="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
							>
								<option value="quick">Quick Test (5 requests)</option>
								<option value="medium">Medium Test (10 requests)</option>
								<option value="comprehensive">Comprehensive Test (20 requests)</option>
								<option value="stress">Stress Test (50 requests)</option>
							</select>
						</div>

						<div>
							<label class="mb-2 block text-sm font-medium text-gray-300">Number of Tests</label>
							<input
								type="number"
								bind:value={bulkConfig.count}
								min="1"
								max="100"
								class="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
							/>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="mb-2 block text-sm font-medium text-gray-300"
									>Delay Between Requests (ms)</label
								>
								<input
									type="number"
									bind:value={bulkConfig.delay}
									min="0"
									max="5000"
									class="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
								/>
							</div>
							<div>
								<label class="mb-2 block text-sm font-medium text-gray-300">Batch Size</label>
								<input
									type="number"
									bind:value={bulkConfig.batchSize}
									min="1"
									max="50"
									class="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-white transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
								/>
							</div>
						</div>

						<div class="space-y-3">
							<label class="block text-sm font-medium text-gray-300">Execution Options</label>
							<div class="space-y-2">
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={bulkConfig.parallel}
										class="h-4 w-4 rounded border-white/10 bg-black/30 text-purple-600 focus:ring-purple-500"
									/>
									<span class="ml-2 text-sm text-gray-300">Parallel Execution</span>
								</label>
							</div>
						</div>

						<div class="border-t border-white/10 pt-4">
							<button
								type="button"
								on:click={runBulkTests}
								disabled={isBulkRunning}
								class="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:from-green-700 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if isBulkRunning}
									<Loader2 class="mr-2 h-5 w-5 animate-spin" />
									Running Bulk Tests...
								{:else}
									<Zap class="mr-2 h-5 w-5" />
									Start Bulk Testing
								{/if}
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Bulk Results -->
			<div class="lg:col-span-2">
				{#if bulkResults}
					<div class="space-y-6">
						<!-- Performance Summary -->
						<div
							class="rounded-2xl border border-green-500/30 bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-6 backdrop-blur-xl"
						>
							<div class="mb-6 flex items-center justify-between">
								<h2 class="text-xl font-semibold text-white">Performance Summary</h2>
								<div class="flex items-center space-x-2">
									<TrendingUp class="h-5 w-5 text-green-400" />
									<span class="text-sm font-medium text-green-400">
										{bulkResults.performanceMetrics.successRate.toFixed(1)}% Success Rate
									</span>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-6 md:grid-cols-4">
								<div class="text-center">
									<div class="text-2xl font-bold text-white">{bulkResults.total}</div>
									<div class="text-sm text-gray-400">Total Tests</div>
								</div>
								<div class="text-center">
									<div class="text-2xl font-bold text-green-400">{bulkResults.passed}</div>
									<div class="text-sm text-gray-400">Passed</div>
								</div>
								<div class="text-center">
									<div class="text-2xl font-bold text-red-400">{bulkResults.failed}</div>
									<div class="text-sm text-gray-400">Failed</div>
								</div>
								<div class="text-center">
									<div class="text-2xl font-bold text-blue-400">
										{bulkResults.totalTime.toFixed(0)}ms
									</div>
									<div class="text-sm text-gray-400">Total Time</div>
								</div>
							</div>

							<div class="mt-6 grid grid-cols-1 gap-6 border-t border-white/10 pt-6 md:grid-cols-3">
								<div class="text-center">
									<div class="text-lg font-semibold text-white">
										{bulkResults.performanceMetrics.averageResponseTime.toFixed(0)}ms
									</div>
									<div class="text-sm text-gray-400">Average Response</div>
								</div>
								<div class="text-center">
									<div class="text-lg font-semibold text-green-400">
										{bulkResults.performanceMetrics.fastestResponse.toFixed(0)}ms
									</div>
									<div class="text-sm text-gray-400">Fastest</div>
								</div>
								<div class="text-center">
									<div class="text-lg font-semibold text-red-400">
										{bulkResults.performanceMetrics.slowestResponse.toFixed(0)}ms
									</div>
									<div class="text-sm text-gray-400">Slowest</div>
								</div>
							</div>
						</div>

						<!-- Debug Logs -->
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
							<h3 class="mb-4 text-lg font-semibold text-white">Debug Logs</h3>
							<div class="max-h-64 overflow-y-auto rounded-lg bg-black/30 p-4">
								{#each bulkResults.debugLogs as log}
									<div class="mb-1 text-sm text-gray-300">{log}</div>
								{/each}
							</div>
						</div>

						<!-- Individual Results -->
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
							<h3 class="mb-4 text-lg font-semibold text-white">Individual Results</h3>
							<div class="max-h-96 space-y-3 overflow-y-auto">
								{#each bulkResults.results as result (result.id)}
									<div
										class="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 p-3"
									>
										<div class="flex items-center space-x-3">
											<svelte:component
												this={getStatusIcon(result.status)}
												class="h-4 w-4 {getStatusColor(result.status)}"
											/>
											<div>
												<div class="text-sm font-medium text-white">
													{result.endpoint.split('/').pop()}
												</div>
												<div class="text-xs text-gray-400">
													{result.timestamp.toLocaleTimeString()}
												</div>
											</div>
										</div>
										<div class="text-right">
											<div class="text-sm font-semibold text-white">
												{result.responseTime.toFixed(0)}ms
											</div>
											{#if result.error}
												<div class="max-w-32 truncate text-xs text-red-400">{result.error}</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else}
					<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
						<div class="py-12 text-center">
							<BarChart3 class="mx-auto mb-4 h-16 w-16 text-gray-400" />
							<p class="text-gray-400">
								No bulk test results yet. Configure and run bulk tests to see performance analytics.
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
