<script>
	import { Copy, Check } from 'lucide-svelte';

	export let response = null;
	export let loading = false;
	export let error = null;

	let copied = false;

	function copyToClipboard() {
		if (response) {
			navigator.clipboard.writeText(JSON.stringify(response, null, 2));
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

	function formatJson(obj) {
		return JSON.stringify(obj, null, 2);
	}
</script>

{#if loading}
	<div class="rounded-lg border border-white/10 bg-white/5 p-4">
		<div class="flex items-center space-x-2 text-gray-400">
			<div
				class="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"
			></div>
			<span>Making request...</span>
		</div>
	</div>
{:else if error}
	<div class="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
		<h5 class="mb-2 text-sm font-medium text-red-400">Error:</h5>
		<pre
			class="scrollbar-thin scrollbar-track-red-800 scrollbar-thumb-red-600 max-h-96 overflow-auto rounded bg-red-900/20 p-3 text-sm text-red-300">{error}</pre>
	</div>
{:else if response}
	<div class="rounded-lg border border-white/10 bg-black/20 p-4">
		<div class="mb-2 flex items-center justify-between">
			<h5 class="text-sm font-medium text-gray-300">Response:</h5>
			<button
				on:click={copyToClipboard}
				class="flex items-center space-x-1 rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
			>
				{#if copied}
					<Check class="h-3 w-3" />
					<span>Copied!</span>
				{:else}
					<Copy class="h-3 w-3" />
					<span>Copy</span>
				{/if}
			</button>
		</div>
		<pre
			class="scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 max-h-96 overflow-auto rounded bg-gray-900/50 p-3 text-sm text-gray-300">{formatJson(
				response
			)}</pre>
	</div>
{/if}
