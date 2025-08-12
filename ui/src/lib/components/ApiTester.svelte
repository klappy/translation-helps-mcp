<script lang="ts">
	import { Clock, Database, Loader, Play, Zap } from 'lucide-svelte';
	import { createEventDispatcher, onMount } from 'svelte';

	interface Parameter {
		name: string;
		type: string;
		required?: boolean;
		description?: string;
		default?: any;
		options?: string[];
		example?: any;
		min?: number;
		max?: number;
		pattern?: string;
	}

	interface Endpoint {
		name: string;
		parameters?: Parameter[];
		example?: {
			request?: Record<string, any>;
			response?: any;
		};
	}

	export let endpoint: Endpoint | null = null;
	export let loading: boolean = false;
	export let result: any = null;

	const dispatch = createEventDispatcher();

	let formData: Record<string, any> = {};
	let currentEndpointName: string | null = null;

	// Initialize form data only when endpoint actually changes (not on every reactive cycle)
	function initializeFormData() {
		if (!endpoint || endpoint.name === currentEndpointName) return;

		currentEndpointName = endpoint.name;
		const newFormData: Record<string, any> = {};
		endpoint.parameters?.forEach((param: Parameter) => {
			// Extract default from example if available
			if (endpoint.example?.request && endpoint.example.request[param.name]) {
				newFormData[param.name] = endpoint.example.request[param.name];
			} else if (param.default) {
				newFormData[param.name] = param.default;
			} else {
				newFormData[param.name] = '';
			}
		});
		formData = newFormData;
	}

	// Initialize on mount and when endpoint changes
	onMount(() => {
		initializeFormData();
	});

	// Only re-initialize if the endpoint name actually changed
	$: if (endpoint?.name !== currentEndpointName) {
		initializeFormData();
	}

	function handleSubmit() {
		dispatch('test', { endpoint, formData });
	}

	function getResponseTimeColor(time: number) {
		if (time <= 50) return 'text-emerald-400';
		if (time <= 100) return 'text-yellow-400';
		if (time <= 300) return 'text-orange-400';
		return 'text-red-400';
	}

	function getCacheStatusColor(status: string) {
		switch (status) {
			case 'hit':
				return 'text-emerald-400';
			case 'miss':
				return 'text-orange-400';
			case 'error':
				return 'text-red-400';
			default:
				return 'text-gray-400';
		}
	}

	function getCacheStatusIcon(status: string) {
		switch (status) {
			case 'hit':
				return '⚡';
			case 'miss':
				return '💾';
			case 'error':
				return '❌';
			default:
				return '❓';
		}
	}
</script>

<div class="rounded-lg border border-white/10 bg-white/5 p-6">
	<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<h4 class="text-lg font-semibold text-white">Try {endpoint ? endpoint.name : 'Endpoint'}</h4>
		<button
			on:click={handleSubmit}
			disabled={loading}
			class="touch-friendly flex min-h-[44px] items-center justify-center space-x-2 rounded bg-purple-600 px-6 py-3 text-white hover:bg-purple-700 disabled:opacity-50"
		>
			{#if loading}
				<Loader class="h-4 w-4 animate-spin" />
				<span>Testing...</span>
			{:else}
				<Play class="h-4 w-4" />
				<span>Test</span>
			{/if}
		</button>
	</div>

	{#if endpoint && endpoint.parameters && endpoint.parameters.length > 0}
		<div class="mb-6 grid gap-4">
			{#each endpoint.parameters as param}
				{#if param.name !== 'includeAlignment'}
					<div>
						<label
							for="{endpoint.name}-{param.name}"
							class="mb-2 block text-sm font-medium text-gray-300"
						>
							{param.name}
							{#if param.required}
								<span class="text-red-400">*</span>
							{/if}
						</label>

						{#if param.type === 'boolean'}
							<input
								id="{endpoint.name}-{param.name}"
								type="checkbox"
								bind:checked={formData[param.name]}
								class="rounded border border-white/20 bg-white/10 text-purple-600 focus:border-purple-500 focus:outline-none"
							/>
						{:else if param.options}
							<!-- Special handling for outputFormat - always use dropdown -->
							{#if param.name === 'outputFormat'}
								<select
									id="{endpoint.name}-{param.name}"
									bind:value={formData[param.name]}
									class="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
								>
									<option value="">Select output format</option>
									{#each param.options as option}
										<option value={option}>{option}</option>
									{/each}
								</select>
								<p class="mt-1 text-xs text-gray-400">
									{#if param.options.includes('text')}
										text = plain text, usfm = formatted scripture, json = structured data
									{/if}
								</p>
								<!-- Skip includeAlignment - it's automatic with USFM -->
							{:else if param.name === 'includeAlignment'}
								<!-- Hidden - automatically handled by outputFormat selection -->
							{:else}
								<!-- All other parameters use text input with datalist -->
								<div class="relative">
									<input
										id="{endpoint.name}-{param.name}"
										type="text"
										bind:value={formData[param.name]}
										placeholder={param.description || `Enter ${param.name}`}
										list="{endpoint.name}-{param.name}-list"
										class="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
									/>
									<datalist id="{endpoint.name}-{param.name}-list">
										{#each param.options as option}
											<option value={option}>{option}</option>
										{/each}
									</datalist>
									{#if param.name === 'lang' || param.name === 'language'}
										<p class="mt-1 text-xs text-gray-400">
											Common: en, es, fr, de, pt, ru, zh, ar, hi, sw, id
										</p>
										<!-- TODO: Future enhancement - fetch available languages from DCS API
									     Endpoints needed:
									     - GET /api/v1/catalog/languages
									     - GET /api/v1/repos/search?lang=<code>
									-->
									{:else if param.name === 'org' || param.name === 'organization'}
										<p class="mt-1 text-xs text-gray-400">
											Common: unfoldingWord, Door43-Catalog, STR, BCS
										</p>
										<!-- TODO: Future enhancement - fetch organizations from DCS API
									     Endpoints needed:
									     - GET /api/v1/orgs
									     - Filter by orgs that have translation resources
									-->
									{:else if param.name === 'resource'}
										<p class="mt-1 text-xs text-gray-400">Common: tn, tw, tq, ta, obs, ult, ust</p>
										<!-- TODO: Future enhancement - fetch resource types from DCS API
									     Endpoints needed:
									     - GET /api/v1/repos/search?topic=<resource_type>
									     - Parse subject field from repos
									-->
									{/if}
								</div>
							{/if}
						{:else}
							<input
								id="{endpoint.name}-{param.name}"
								type={param.type === 'number' ? 'number' : 'text'}
								bind:value={formData[param.name]}
								placeholder={param.description}
								class="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
							/>
						{/if}

						{#if param.description}
							<p class="mt-1 text-xs text-gray-400">{param.description}</p>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- DCS Server Error Warning -->
	{#if result && result._metadata && result._metadata.serverErrors && result._metadata.serverErrors > 0}
		<div class="mb-4 animate-pulse rounded-lg border-2 border-red-500 bg-red-900/30 p-4">
			<div class="flex items-start gap-3">
				<span class="text-3xl">🚨</span>
				<div class="flex-1">
					<h4 class="mb-2 text-lg font-bold text-red-400">Upstream Server Issue Detected</h4>
					<p class="mb-3 text-red-300">
						The Door43 Content Service (DCS) server is currently blocking requests. This is NOT an
						issue with The Aqueduct API.
					</p>
					<div class="space-y-2 text-sm">
						<div class="flex items-center gap-2">
							<span class="text-red-400">•</span>
							<span class="text-red-200"
								>Server errors detected: {result._metadata.serverErrors}</span
							>
						</div>
						{#if result._metadata.dataSourcesCached}
							<div class="flex items-center gap-2">
								<span class="text-yellow-400">•</span>
								<span class="text-yellow-200">
									Catalog cached: {result._metadata.dataSourcesCached.catalog ? '✅ Yes' : '❌ No'}
								</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-yellow-400">•</span>
								<span class="text-yellow-200">
									ZIP files cached: {result._metadata.dataSourcesCached.zip
										? '✅ Yes'
										: '❌ No (Server blocked download)'}
								</span>
							</div>
						{/if}
						<div class="flex items-center gap-2">
							<span class="text-blue-400">•</span>
							<span class="text-blue-200">Response cached: ❌ Never (per architecture rules)</span>
						</div>
					</div>
					<div class="mt-3 rounded border border-white/10 bg-black/50 p-3">
						<p class="text-xs text-gray-300">
							<strong>What's happening:</strong> DCS has enabled bot detection that blocks automated
							requests. The Aqueduct API correctly identified this issue and returned an honest error
							message instead of caching or hiding the problem.
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Performance Indicators -->
	{#if result?._metadata}
		<div
			class="mb-6 rounded-lg border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-4"
		>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<!-- Response Time -->
				<div class="flex items-center gap-2">
					<Clock class="h-4 w-4 flex-shrink-0 text-blue-400" />
					<span class="text-sm text-gray-300">Response Time:</span>
					<span
						class="font-mono text-sm font-semibold {getResponseTimeColor(
							result._metadata.responseTime
						)}"
					>
						{result._metadata.responseTime}ms
					</span>
				</div>

				<!-- Cache Status -->
				<div class="flex items-center gap-2">
					<Database class="h-4 w-4 flex-shrink-0 text-emerald-400" />
					<span class="text-sm text-gray-300">Data Cache:</span>
					<span
						class="flex items-center gap-1 font-mono text-sm font-semibold {getCacheStatusColor(
							result._metadata.dataCacheStatus || result._metadata.cacheStatus || 'miss'
						)}"
					>
						<span
							>{getCacheStatusIcon(
								result._metadata.dataCacheStatus || result._metadata.cacheStatus || 'miss'
							)}</span
						>
						{(
							result._metadata.dataCacheStatus ||
							result._metadata.cacheStatus ||
							'miss'
						).toUpperCase()}
					</span>
				</div>

				<!-- Status Code -->
				<div class="flex items-center gap-2">
					<Zap class="h-4 w-4 flex-shrink-0 text-yellow-400" />
					<span class="text-sm text-gray-300">Status:</span>
					<span
						class="font-mono text-sm font-semibold {result._metadata.success
							? 'text-emerald-400'
							: 'text-red-400'}"
					>
						{result._metadata.status}
					</span>
				</div>
			</div>

			<!-- Performance Badge -->
			{#if result._metadata.responseTime <= 50}
				<div
					class="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-400"
				>
					⚡ Lightning Fast
				</div>
			{:else if result._metadata.responseTime <= 100}
				<div
					class="mt-3 inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-900/30 px-3 py-1 text-xs font-medium text-yellow-400"
				>
					🚀 Fast
				</div>
			{:else if result._metadata.responseTime <= 300}
				<div
					class="mt-3 inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-900/30 px-3 py-1 text-xs font-medium text-orange-400"
				>
					⏱️ Moderate
				</div>
			{:else}
				<div
					class="mt-3 inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-900/30 px-3 py-1 text-xs font-medium text-red-400"
				>
					🐌 Slow
				</div>
			{/if}

			<!-- Cache Details -->
			{#if result._metadata.dataSourcesCached}
				<div class="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
					<h5 class="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
						Cache Details
					</h5>
					<div class="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
						<div class="flex items-center gap-2">
							<span
								class={result._metadata.dataSourcesCached.catalog
									? 'text-emerald-400'
									: 'text-gray-500'}
							>
								{result._metadata.dataSourcesCached.catalog ? '✅' : '⭕'}
							</span>
							<span class="text-gray-300">Catalog</span>
						</div>
						<div class="flex items-center gap-2">
							<span
								class={result._metadata.dataSourcesCached.zip
									? 'text-emerald-400'
									: 'text-gray-500'}
							>
								{result._metadata.dataSourcesCached.zip ? '✅' : '⭕'}
							</span>
							<span class="text-gray-300">ZIP Files</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="text-red-400">❌</span>
							<span class="text-gray-300">Response (Never)</span>
						</div>
					</div>
					{#if result._metadata.cacheNote}
						<p class="mt-2 text-xs text-gray-500 italic">{result._metadata.cacheNote}</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Response Display -->
	{#if result}
		<div class="rounded-lg border border-white/10 bg-black/20">
			<details class="group" open>
				<summary
					class="touch-friendly flex cursor-pointer items-center gap-2 p-4 text-sm font-medium text-gray-300 hover:text-white"
				>
					<span class="transform transition-transform group-open:rotate-90">▶</span>
					Response Data
					<span class="ml-auto text-xs text-gray-500">
						{(typeof result === 'string'
							? result.length
							: JSON.stringify(result).length
						).toLocaleString()} chars
					</span>
				</summary>
				<div class="border-t border-white/10 p-4">
					{#if typeof result === 'string'}
						<pre
							class="overflow-x-auto text-xs break-words whitespace-pre-wrap text-gray-300 lg:text-sm">{result}</pre>
					{:else if result?.metadata?.format === 'markdown' && typeof result?.data === 'string'}
						<!-- JSON response with markdown content -->
						<div class="space-y-4">
							<div class="border-b border-white/10 pb-2 text-xs text-gray-500">
								<strong>Format:</strong> Markdown |
								{#if result.metadata.category}<strong>Category:</strong>
									{result.metadata.category} |
								{/if}
								{#if result.metadata.moduleCount}<strong>Modules:</strong>
									{result.metadata.moduleCount} |
								{/if}
								<strong>Source:</strong>
								{result.metadata.source || 'N/A'}
							</div>
							<pre
								class="overflow-x-auto text-xs break-words whitespace-pre-wrap text-gray-300 lg:text-sm">{result.data}</pre>
						</div>
					{:else}
						<pre
							class="overflow-x-auto text-xs break-words whitespace-pre-wrap text-gray-300 lg:text-sm">{JSON.stringify(
								result,
								null,
								2
							)}</pre>
					{/if}
				</div>
			</details>
		</div>
	{/if}

	<!-- X-Ray Tracing Visualization -->
	{#if result?.data?.metadata?.xrayTrace || result?.metadata?.xrayTrace}
		{@const xrayTrace = result?.data?.metadata?.xrayTrace || result?.metadata?.xrayTrace}
		<div class="mt-6 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4">
			<div class="mb-4 flex items-center gap-2">
				<Database class="h-5 w-5 text-cyan-400" />
				<h4 class="font-mono text-lg font-semibold text-cyan-300">X-Ray: DCS Call Trace</h4>
				<div
					class="ml-auto rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-300"
				>
					{(xrayTrace.calls || xrayTrace.apiCalls || []).length} calls
				</div>
			</div>

			<!-- Trace Summary -->
			<div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div class="rounded bg-slate-800/50 p-3">
					<div class="text-xs text-gray-400">Total Duration</div>
					<div class="font-mono text-lg font-bold text-cyan-300">
						{xrayTrace.totalDuration.toFixed(1)}ms
					</div>
				</div>
				<div class="rounded bg-slate-800/50 p-3">
					<div class="text-xs text-gray-400">Cache Hit Rate</div>
					<div class="font-mono text-lg font-bold text-emerald-300">
						{#if xrayTrace.cacheStats.hitRate !== undefined}
							{xrayTrace.cacheStats.hitRate.toFixed(1)}%
						{:else if xrayTrace.cacheStats.total > 0}
							{((xrayTrace.cacheStats.hits / xrayTrace.cacheStats.total) * 100).toFixed(1)}%
						{:else}
							0.0%
						{/if}
					</div>
				</div>
				<div class="rounded bg-slate-800/50 p-3">
					<div class="text-xs text-gray-400">Performance</div>
					<div class="font-mono text-lg font-bold text-amber-300">
						{#if xrayTrace.performance && xrayTrace.performance.average !== undefined}
							{xrayTrace.performance.average.toFixed(1)}ms avg
						{:else if xrayTrace.apiCalls && xrayTrace.apiCalls.length > 0}
							{(xrayTrace.totalDuration / xrayTrace.apiCalls.length).toFixed(1)}ms avg
						{:else}
							N/A
						{/if}
					</div>
				</div>
			</div>

			<!-- Server Error Warning -->
			{#if (xrayTrace.calls || xrayTrace.apiCalls || []).filter((call) => call.status >= 500).length > 0}
				<div class="mb-4 rounded-lg border border-red-500 bg-red-900/30 p-3">
					<div class="flex items-start gap-2">
						<span class="text-2xl">🚨</span>
						<div>
							<p class="font-bold text-red-400">DCS Server Blocking Detected!</p>
							<p class="text-sm text-red-300">
								{(xrayTrace.calls || xrayTrace.apiCalls || []).filter((call) => call.status >= 500)
									.length} requests were blocked by Door43's bot detection (500 errors)
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Individual DCS Calls -->
			<div class="space-y-2">
				<div class="text-sm font-medium text-gray-300">Individual DCS API Calls:</div>
				{#each xrayTrace.calls || xrayTrace.apiCalls || [] as call, index}
					<div class="flex items-center gap-3 rounded bg-slate-800/30 p-3 font-mono text-sm">
						<!-- Call Number -->
						<div
							class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white"
						>
							{index + 1}
						</div>

						<!-- Cache Status Badge -->
						<div class="flex-shrink-0">
							{#if call.cacheStatus === 'HIT' || call.cached === true}
								<span
									class="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300"
								>
									🚀 HIT
								</span>
							{:else if call.status >= 500}
								<span
									class="inline-flex animate-pulse items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-300"
								>
									❌ ERROR
								</span>
							{:else if call.cacheStatus === 'MISS' || call.cached === false}
								<span
									class="inline-flex items-center gap-1 rounded bg-orange-500/20 px-2 py-1 text-xs font-medium text-orange-300"
								>
									🌐 MISS
								</span>
							{:else}
								<span
									class="inline-flex items-center gap-1 rounded bg-gray-500/20 px-2 py-1 text-xs font-medium text-gray-300"
								>
									❓ {call.cacheStatus || 'Unknown'}
								</span>
							{/if}
						</div>

						<!-- Endpoint -->
						<div class="flex-1 truncate text-cyan-300">
							{call.endpoint || call.url || 'Unknown'}
						</div>

						<!-- Timing -->
						<div class="flex-shrink-0 text-right">
							<div
								class="font-bold {call.duration < 50
									? 'text-emerald-300'
									: call.duration < 100
										? 'text-yellow-300'
										: call.duration < 300
											? 'text-orange-300'
											: 'text-red-300'}"
							>
								{call.duration.toFixed(1)}ms
							</div>
							{#if call.cacheSource}
								<div class="text-xs text-gray-400">{call.cacheSource}</div>
							{/if}
						</div>

						<!-- Status Code -->
						<div class="flex-shrink-0">
							{#if call.status}
								<span
									class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium {call.status >=
										200 && call.status < 300
										? 'bg-emerald-500/20 text-emerald-300'
										: call.status >= 500
											? 'animate-pulse bg-red-500/20 text-red-300'
											: call.status >= 400
												? 'bg-orange-500/20 text-orange-300'
												: 'bg-gray-500/20 text-gray-300'}"
								>
									{call.status}
									{#if call.status >= 200 && call.status < 300}
										✅
									{:else if call.status >= 500}
										⚠️
									{:else if call.status >= 400}
										❌
									{:else}
										❓
									{/if}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Debug Information (Collapsible) -->
			<details class="mt-4">
				<summary class="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
					🔍 Debug Details
				</summary>
				<pre
					class="mt-2 max-h-40 overflow-auto rounded bg-slate-900/50 p-3 text-xs text-gray-300">{JSON.stringify(
						xrayTrace,
						null,
						2
					)}</pre>
			</details>
		</div>
	{/if}
</div>
