<script lang="ts">
	let selectedReference = 'John 3:16';
	let loading = false;
	let result: any = null;
	let error = '';
	let startTime = 0;
	let responseTime = 0;

	const exampleReferences = [
		'John 3:16',
		'Psalm 23:1-6',
		'Genesis 1:1',
		'Romans 8:28',
		'Matthew 5:3-12'
	];

	async function fetchScripture() {
		loading = true;
		error = '';
		startTime = performance.now();

		try {
			const response = await fetch(
				`/api/fetch-scripture?reference=${encodeURIComponent(selectedReference)}`
			);
			responseTime = performance.now() - startTime;

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			result = await response.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch scripture';
			result = null;
		} finally {
			loading = false;
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}

	$: tokenCount = result?.content ? result.content.length * 0.75 : 0; // Rough approximation
</script>

<div class="rounded-2xl bg-gray-800/50 p-8 backdrop-blur">
	<h3 class="mb-6 text-center text-2xl font-bold">Live API Demo</h3>

	<div class="space-y-6">
		<!-- Input section -->
		<div>
			<label for="scripture-input" class="mb-2 block text-sm font-medium"
				>Try a Scripture Reference</label
			>
			<div class="flex gap-2">
				<input
					id="scripture-input"
					type="text"
					bind:value={selectedReference}
					placeholder="e.g., John 3:16"
					class="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 focus:border-green-500 focus:outline-none"
					on:keypress={(e) => e.key === 'Enter' && fetchScripture()}
				/>
				<button
					on:click={fetchScripture}
					disabled={loading}
					class="rounded-lg bg-gradient-to-r from-green-500 to-blue-500 px-6 py-2 font-semibold transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{loading ? 'Loading...' : 'Fetch'}
				</button>
			</div>

			<!-- Quick examples -->
			<div class="mt-3 flex flex-wrap gap-2">
				{#each exampleReferences as ref}
					<button
						on:click={() => {
							selectedReference = ref;
							fetchScripture();
						}}
						class="rounded-full bg-gray-700 px-3 py-1 text-xs transition-colors hover:bg-gray-600"
					>
						{ref}
					</button>
				{/each}
			</div>
		</div>

		<!-- Performance metrics -->
		{#if result || loading}
			<div class="grid grid-cols-3 gap-4 text-center">
				<div class="rounded-lg bg-gray-900/50 p-4">
					<div class="font-mono text-2xl font-bold text-green-400">
						{loading ? '...' : `${responseTime.toFixed(0)}ms`}
					</div>
					<div class="text-xs text-gray-400">Response Time</div>
				</div>

				<div class="rounded-lg bg-gray-900/50 p-4">
					<div class="font-mono text-2xl font-bold text-blue-400">
						{loading ? '...' : `~${Math.round(tokenCount).toLocaleString()}`}
					</div>
					<div class="text-xs text-gray-400">Token Count</div>
				</div>

				<div class="rounded-lg bg-gray-900/50 p-4">
					<div class="font-mono text-2xl font-bold text-purple-400">
						{loading ? '...' : `$${((tokenCount * 0.00015) / 1000).toFixed(4)}`}
					</div>
					<div class="text-xs text-gray-400">LLM Cost</div>
				</div>
			</div>
		{/if}

		<!-- Result display -->
		{#if error}
			<div class="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
				{error}
			</div>
		{:else if result}
			<div class="space-y-4">
				<!-- Scripture content -->
				<div class="rounded-lg bg-gray-900/50 p-4">
					<div class="mb-2 flex items-start justify-between">
						<h4 class="font-semibold">{result.reference || selectedReference}</h4>
						<button
							on:click={() => copyToClipboard(result.content)}
							class="rounded bg-gray-700 px-2 py-1 text-xs transition-colors hover:bg-gray-600"
						>
							Copy
						</button>
					</div>
					<p class="leading-relaxed text-gray-300">
						{result.content || 'No content available'}
					</p>
				</div>

				<!-- API response preview -->
				<details class="rounded-lg bg-gray-900/50">
					<summary class="cursor-pointer p-4 transition-colors hover:bg-gray-800/50">
						View Raw API Response
					</summary>
					<pre class="overflow-x-auto p-4 text-xs"><code>{JSON.stringify(result, null, 2)}</code
						></pre>
				</details>
			</div>
		{/if}

		<!-- Code example -->
		<div class="rounded-lg bg-gray-900 p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-400">Example Code</span>
				<button
					on:click={() =>
						copyToClipboard(`const response = await fetch('/api/fetch-scripture?reference=John+3:16');
const data = await response.json();
console.log(data.content);`)}
					class="rounded bg-gray-700 px-2 py-1 text-xs transition-colors hover:bg-gray-600"
				>
					Copy
				</button>
			</div>
			<pre class="text-sm text-gray-300"><code
					>{`const response = await fetch('/api/fetch-scripture?reference=John+3:16');
const data = await response.json();
console.log(data.content);`}</code
				></pre>
		</div>
	</div>
</div>
