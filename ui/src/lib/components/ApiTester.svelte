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
</div>
