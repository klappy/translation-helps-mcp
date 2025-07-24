<script>
	import { Clock, Database, Loader, Play, Zap } from 'lucide-svelte';
	import { createEventDispatcher, onMount } from 'svelte';

	export let endpoint;
	export let loading = false;
	export let result = null;

	const dispatch = createEventDispatcher();

	let formData = {};
	let currentEndpointName = null;

	// Initialize form data only when endpoint actually changes (not on every reactive cycle)
	function initializeFormData() {
		if (!endpoint || endpoint.name === currentEndpointName) return;

		currentEndpointName = endpoint.name;
		const newFormData = {};
		endpoint.parameters?.forEach((param) => {
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

	function getResponseTimeColor(time) {
		if (time <= 50) return 'text-emerald-400';
		if (time <= 100) return 'text-yellow-400';
		if (time <= 300) return 'text-orange-400';
		return 'text-red-400';
	}

	function getCacheStatusColor(status) {
		switch (status) {
			case 'hit': return 'text-emerald-400';
			case 'miss': return 'text-orange-400';
			case 'error': return 'text-red-400';
			default: return 'text-gray-400';
		}
	}

	function getCacheStatusIcon(status) {
		switch (status) {
			case 'hit': return '⚡';
			case 'miss': return '💾';
			case 'error': return '❌';
			default: return '❓';
		}
	}
</script>

<div class="rounded-lg border border-white/10 bg-white/5 p-6">
	<div class="mb-4 flex items-center justify-between">
		<h4 class="text-lg font-semibold text-white">Try {endpoint.name}</h4>
		<button
			on:click={handleSubmit}
			disabled={loading}
			class="flex items-center space-x-2 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
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

	{#if endpoint.parameters?.length > 0}
		<div class="mb-6 grid gap-4">
			{#each endpoint.parameters as param}
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
						<select
							id="{endpoint.name}-{param.name}"
							bind:value={formData[param.name]}
							class="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
						>
							<option value="">Select {param.name}</option>
							{#each param.options as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
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
			{/each}
		</div>
	{/if}

	<!-- Performance Indicators -->
	{#if result?._metadata}
		<div class="mb-6 rounded-lg bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 p-4">
			<div class="flex items-center gap-6">
				<!-- Response Time -->
				<div class="flex items-center gap-2">
					<Clock class="h-4 w-4 text-blue-400" />
					<span class="text-sm text-gray-300">Response Time:</span>
					<span class="font-mono text-sm font-semibold {getResponseTimeColor(result._metadata.responseTime)}">
						{result._metadata.responseTime}ms
					</span>
				</div>

				<!-- Cache Status -->
				<div class="flex items-center gap-2">
					<Database class="h-4 w-4 text-emerald-400" />
					<span class="text-sm text-gray-300">Cache:</span>
					<span class="flex items-center gap-1 font-mono text-sm font-semibold {getCacheStatusColor(result._metadata.cacheStatus)}">
						<span>{getCacheStatusIcon(result._metadata.cacheStatus)}</span>
						{result._metadata.cacheStatus.toUpperCase()}
					</span>
				</div>

				<!-- Status Code -->
				<div class="flex items-center gap-2">
					<Zap class="h-4 w-4 text-yellow-400" />
					<span class="text-sm text-gray-300">Status:</span>
					<span class="font-mono text-sm font-semibold {result._metadata.success ? 'text-emerald-400' : 'text-red-400'}">
						{result._metadata.status}
					</span>
				</div>
			</div>
			
			<!-- Performance Badge -->
			{#if result._metadata.responseTime <= 50}
				<div class="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/30">
					⚡ Lightning Fast
				</div>
			{:else if result._metadata.responseTime <= 100}
				<div class="mt-2 inline-flex items-center gap-1 rounded-full bg-yellow-900/30 px-3 py-1 text-xs font-medium text-yellow-400 border border-yellow-500/30">
					🚀 Fast
				</div>
			{:else if result._metadata.responseTime <= 300}
				<div class="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-900/30 px-3 py-1 text-xs font-medium text-orange-400 border border-orange-500/30">
					⏱️ Moderate
				</div>
			{:else}
				<div class="mt-2 inline-flex items-center gap-1 rounded-full bg-red-900/30 px-3 py-1 text-xs font-medium text-red-400 border border-red-500/30">
					🐌 Slow
				</div>
			{/if}
		</div>
	{/if}

	{#if result}
		<div class="rounded-lg border border-white/10 bg-black/20 p-4">
			<h5 class="mb-2 text-sm font-medium text-gray-300">Response:</h5>
			<pre class="overflow-auto text-sm text-gray-300">{JSON.stringify(result, null, 2)}</pre>
		</div>
	{/if}

	<!-- X-Ray Tracing Visualization -->
	{#if result?.data?.metadata?.xrayTrace || result?.metadata?.xrayTrace}
		{@const xrayTrace = result?.data?.metadata?.xrayTrace || result?.metadata?.xrayTrace}
		<div class="mt-6 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-4">
			<div class="mb-4 flex items-center gap-2">
				<Database class="h-5 w-5 text-cyan-400" />
				<h4 class="font-mono text-lg font-semibold text-cyan-300">X-Ray: DCS Call Trace</h4>
				<div class="ml-auto rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-300">
					{xrayTrace.calls.length} calls
				</div>
			</div>

			<!-- Trace Summary -->
			<div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div class="rounded bg-slate-800/50 p-3">
					<div class="text-xs text-gray-400">Total Duration</div>
					<div class="text-lg font-mono font-bold text-cyan-300">
						{xrayTrace.totalDuration.toFixed(1)}ms
					</div>
				</div>
				<div class="rounded bg-slate-800/50 p-3">
					<div class="text-xs text-gray-400">Cache Hit Rate</div>
					<div class="text-lg font-mono font-bold text-emerald-300">
						{xrayTrace.cacheStats.hitRate.toFixed(1)}%
					</div>
				</div>
				<div class="rounded bg-slate-800/50 p-3">
					<div class="text-xs text-gray-400">Performance</div>
					<div class="text-lg font-mono font-bold text-amber-300">
						{xrayTrace.performance.average.toFixed(1)}ms avg
					</div>
				</div>
			</div>

			<!-- Individual DCS Calls -->
			<div class="space-y-2">
				<div class="text-sm font-medium text-gray-300">Individual DCS API Calls:</div>
				{#each xrayTrace.calls as call, index}
					<div class="flex items-center gap-3 rounded bg-slate-800/30 p-3 font-mono text-sm">
						<!-- Call Number -->
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
							{index + 1}
						</div>

						<!-- Cache Status Badge -->
						<div class="flex-shrink-0">
							{#if call.cacheStatus === 'HIT'}
								<span class="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300">
									🚀 HIT
								</span>
							{:else if call.cacheStatus === 'MISS'}
								<span class="inline-flex items-center gap-1 rounded bg-orange-500/20 px-2 py-1 text-xs font-medium text-orange-300">
									🌐 MISS
								</span>
							{:else}
								<span class="inline-flex items-center gap-1 rounded bg-gray-500/20 px-2 py-1 text-xs font-medium text-gray-300">
									❓ {call.cacheStatus}
								</span>
							{/if}
						</div>

						<!-- Endpoint -->
						<div class="flex-1 truncate text-cyan-300">
							{call.endpoint}
						</div>

						<!-- Timing -->
						<div class="flex-shrink-0 text-right">
							<div class="font-bold {
								call.duration < 50 ? 'text-emerald-300' :
								call.duration < 100 ? 'text-yellow-300' :
								call.duration < 300 ? 'text-orange-300' : 
								'text-red-300'
							}">
								{call.duration.toFixed(1)}ms
							</div>
							{#if call.cacheSource}
								<div class="text-xs text-gray-400">{call.cacheSource}</div>
							{/if}
						</div>

						<!-- Status Code -->
						<div class="flex-shrink-0">
							<span class="inline-flex items-center rounded px-2 py-1 text-xs font-medium {
								call.statusCode >= 200 && call.statusCode < 300 ? 'bg-emerald-500/20 text-emerald-300' :
								call.statusCode >= 400 ? 'bg-red-500/20 text-red-300' :
								'bg-gray-500/20 text-gray-300'
							}">
								{call.statusCode}
							</span>
						</div>
					</div>
				{/each}
			</div>

			<!-- Debug Information (Collapsible) -->
			<details class="mt-4">
				<summary class="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
					🔍 Debug Details
				</summary>
				<pre class="mt-2 max-h-40 overflow-auto rounded bg-slate-900/50 p-3 text-xs text-gray-300">{JSON.stringify(xrayTrace, null, 2)}</pre>
			</details>
		</div>
	{/if}
</div>
