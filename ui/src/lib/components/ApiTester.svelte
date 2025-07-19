<script>
	import { createEventDispatcher } from 'svelte';
	import { Play, Loader } from 'lucide-svelte';

	export let endpoint;
	export let loading = false;
	export let result = null;

	const dispatch = createEventDispatcher();

	let formData = {};

	// Initialize form data with default values from endpoint parameters
	$: if (endpoint) {
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

	function handleSubmit() {
		dispatch('test', { endpoint, formData });
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

	{#if result}
		<div class="rounded-lg border border-white/10 bg-black/20 p-4">
			<h5 class="mb-2 text-sm font-medium text-gray-300">Response:</h5>
			<pre class="overflow-auto text-sm text-gray-300">{JSON.stringify(result, null, 2)}</pre>
		</div>
	{/if}
</div>
