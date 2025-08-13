<script lang="ts">
	import { AlertCircle, Loader, Server } from 'lucide-svelte';

	export let trace: any = null;
	export let error: any = null;
	export let loading = false;

	function getCacheStatusColor(status: string): string {
		switch (status?.toLowerCase()) {
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

	function getCacheStatusIcon(status: string): string {
		switch (status?.toLowerCase()) {
			case 'hit':
				return '✅';
			case 'miss':
				return '🟧';
			case 'error':
				return '❌';
			default:
				return '⭕';
		}
	}

	function getStatusColor(status: number): string {
		if (status >= 200 && status < 300) return 'text-emerald-400';
		if (status >= 400 && status < 500) return 'text-yellow-400';
		if (status >= 500) return 'text-red-400';
		return 'text-gray-400';
	}

	function formatDuration(ms: number): string {
		if (ms < 1000) return `${ms.toFixed(0)}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	function formatPercentage(rate: number): string {
		return `${(rate * 100).toFixed(1)}%`;
	}
</script>

{#if loading}
	<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
		<div class="flex items-center justify-center">
			<Loader class="h-8 w-8 animate-spin text-blue-400" />
			<span class="ml-3 text-gray-300">Loading X-Ray trace...</span>
		</div>
	</div>
{:else if error}
	<!-- Error State with DCS Bot Detection Warning -->
	<div class="rounded-lg border border-red-500/50 bg-red-900/20 p-6">
		<div class="mb-4 flex items-start gap-3">
			<AlertCircle class="h-6 w-6 flex-shrink-0 text-red-400" />
			<div class="flex-1">
				<h3 class="text-lg font-semibold text-red-400">Upstream Server Issue Detected</h3>
				<p class="mt-2 text-gray-300">
					The Door43 Content Service (DCS) server is currently blocking requests. This is NOT an
					issue with The Aqueduct API.
				</p>
			</div>
		</div>

		{#if error.serverErrors}
			<div class="mt-4 space-y-2">
				<div class="flex items-center gap-2 text-sm">
					<span class="text-gray-400">•</span>
					<span class="text-gray-300">Server errors detected:</span>
					<span class="font-semibold text-red-400">{error.serverErrors}</span>
				</div>
				<div class="flex items-center gap-2 text-sm">
					<span class="text-gray-400">•</span>
					<span class="text-gray-300">Catalog cached:</span>
					<span class="text-emerald-400">✅ Yes</span>
				</div>
				<div class="flex items-center gap-2 text-sm">
					<span class="text-gray-400">•</span>
					<span class="text-gray-300">ZIP files cached:</span>
					<span class="text-red-400">❌ No (Server blocked download)</span>
				</div>
				<div class="flex items-center gap-2 text-sm">
					<span class="text-gray-400">•</span>
					<span class="text-gray-300">Response cached:</span>
					<span class="text-red-400">❌ Never (per architecture rules)</span>
				</div>
			</div>
		{/if}

		<div class="mt-6 rounded-lg bg-black/30 p-4">
			<p class="text-sm text-gray-300">
				<strong class="text-white">What's happening:</strong> DCS has enabled bot detection that blocks
				automated requests. The Aqueduct API correctly identified this issue and returned an honest error
				message instead of caching or hiding the problem.
			</p>
		</div>
	</div>
{:else if trace}
	<!-- X-Ray Trace Visualization -->
	<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
		<div class="mb-4 flex items-center justify-between">
			<h3 class="flex items-center gap-2 text-lg font-semibold text-white">
				<Server class="h-5 w-5 text-blue-400" />
				X-Ray: DCS Call Trace
			</h3>
			<span class="text-sm text-gray-400">{trace.apiCalls?.length || 0} calls</span>
		</div>

		<!-- Summary Stats -->
		<div class="mb-6 grid grid-cols-3 gap-4">
			<div>
				<div class="text-xs text-gray-400">Total Duration</div>
				<div class="text-2xl font-bold text-white">
					{formatDuration(trace.totalDuration || 0)}
				</div>
			</div>
			<div>
				<div class="text-xs text-gray-400">Cache Hit Rate</div>
				<div class="text-2xl font-bold text-blue-400">
					{formatPercentage(trace.cacheStats?.hitRate || 0)}
				</div>
			</div>
			<div>
				<div class="text-xs text-gray-400">Performance</div>
				<div class="text-2xl font-bold text-yellow-400">
					{formatDuration(trace.totalDuration / (trace.apiCalls?.length || 1))} avg
				</div>
			</div>
		</div>

		<!-- Server Blocking Warning -->
		{#if trace.apiCalls?.some((call) => call.status >= 500)}
			<div class="mb-4 rounded-lg border border-red-500/30 bg-red-900/20 p-4">
				<div class="flex items-center gap-2">
					<AlertCircle class="h-5 w-5 text-red-400" />
					<span class="font-medium text-red-400">DCS Server Blocking Detected!</span>
				</div>
				<p class="mt-1 text-sm text-gray-300">
					{trace.apiCalls.filter((call) => call.status >= 500).length} requests were blocked by Door43's
					bot detection ({trace.apiCalls.find((call) => call.status >= 500)?.status} errors)
				</p>
			</div>
		{/if}

		<!-- Individual API Calls -->
		<div class="space-y-2">
			<h4 class="text-sm font-medium text-gray-400">Individual DCS API Calls:</h4>
			{#each trace.apiCalls || [] as call, index}
				<div class="flex items-center gap-3 rounded-lg bg-gray-900/50 p-3">
					<!-- Index -->
					<span class="w-8 text-center font-mono text-sm text-gray-500">{index + 1}</span>

					<!-- Cache Status -->
					<span
						class={`flex w-16 items-center gap-1 text-sm font-semibold ${getCacheStatusColor(call.cacheStatus)}`}
					>
						<span>{getCacheStatusIcon(call.cacheStatus)}</span>
						<span class="uppercase">{call.cacheStatus || 'MISS'}</span>
					</span>

					<!-- URL -->
					<div class="flex-1 font-mono text-xs text-blue-300">
						{call.url || 'Unknown URL'}
					</div>

					<!-- Duration -->
					<span class="w-20 text-right font-mono text-sm text-white">
						{formatDuration(call.duration || 0)}
					</span>

					<!-- Status Code -->
					<span
						class={`w-12 text-right font-mono text-sm font-semibold ${getStatusColor(call.status)}`}
					>
						{call.status || '???'}
					</span>

					<!-- Error Indicator -->
					{#if call.status >= 500}
						<span class="text-yellow-400" title="Server Error">⚠️</span>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Debug Details (collapsible) -->
		<details class="mt-4">
			<summary class="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
				• Debug Details
			</summary>
			<div class="mt-2 rounded-lg bg-black/30 p-3">
				<pre class="text-xs text-gray-400">{JSON.stringify(trace, null, 2)}</pre>
			</div>
		</details>
	</div>
{:else}
	<!-- No Data State -->
	<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
		<div class="text-center text-gray-400">
			<Server class="mx-auto mb-3 h-12 w-12 opacity-50" />
			<p>No X-Ray trace data available</p>
			<p class="mt-2 text-sm">Make an API request to see the trace visualization</p>
		</div>
	</div>
{/if}
