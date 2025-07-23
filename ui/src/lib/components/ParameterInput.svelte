<script>
	export let parameter;
	export let value;
	export let endpointName;

	// Generate unique ID for accessibility
	$: inputId = `${endpointName}-${parameter.name}`.replace(/\s+/g, '-').toLowerCase();
</script>

<div class="parameter-input">
	<label for={inputId} class="mb-2 block text-sm font-medium text-gray-300">
		{parameter.name}
		{#if parameter.required}
			<span class="text-red-400">*</span>
		{/if}
	</label>

	{#if parameter.type === 'boolean'}
		<input
			id={inputId}
			type="checkbox"
			bind:checked={value}
			class="rounded border border-white/20 bg-white/10 text-purple-600 focus:border-purple-500 focus:outline-none"
		/>
	{:else if parameter.options && parameter.options.length > 0}
		<select
			id={inputId}
			bind:value
			class="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
		>
			<option value="">Select {parameter.name}</option>
			{#each parameter.options as option}
				<option value={option}>{option}</option>
			{/each}
		</select>
	{:else}
		<input
			id={inputId}
			type={parameter.type === 'number' ? 'number' : 'text'}
			bind:value
			placeholder={parameter.example || `Enter ${parameter.name}`}
			class="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
		/>
	{/if}

	{#if parameter.description}
		<p class="mt-1 text-xs text-gray-500">{parameter.description}</p>
	{/if}
</div>

<style>
	.parameter-input {
		@apply w-full;
	}
</style>
