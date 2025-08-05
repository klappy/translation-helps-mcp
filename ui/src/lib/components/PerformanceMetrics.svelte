<script>
	import { Activity, BarChart3, Clock, Database, Eye, Link, Zap } from 'lucide-svelte';
	
	export let data = {};
	
	// Format response time
	function formatTime(ms) {
		if (!ms && ms !== 0) return 'N/A';
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}
	
	// Get performance color
	function getPerformanceColor(ms) {
		if (!ms && ms !== 0) return 'text-gray-400';
		if (ms < 200) return 'text-green-400';
		if (ms < 500) return 'text-yellow-400';
		return 'text-red-400';
	}
	
	// Get cache color
	function getCacheColor(status) {
		if (status === 'hit') return 'text-green-400';
		if (status === 'miss') return 'text-orange-400';
		if (status === 'bypass') return 'text-purple-400';
		return 'text-gray-400';
	}
	
	// Get cache status display
	function getCacheStatus(status, cached) {
		if (status) return status.toUpperCase();
		return cached ? 'HIT' : 'MISS';
	}
	
	// Format percentage
	function formatPercentage(rate) {
		if (!rate && rate !== 0) return 'N/A';
		return `${(rate * 100).toFixed(1)}%`;
	}
</script>

<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold text-white">Performance Metrics</h3>
		<Activity class="h-5 w-5 text-blue-400" />
	</div>
	
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<!-- Response Time -->
		<div class="rounded-lg bg-gray-900/50 p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-400">Response Time</span>
				<Clock class="h-4 w-4 text-gray-500" />
			</div>
			<div class="text-2xl font-bold {getPerformanceColor(data.responseTime)}">
				{formatTime(data.responseTime)}
			</div>
			<div class="mt-1 text-xs text-gray-500">
				{#if data.responseTime !== undefined && data.responseTime < 200}
					Excellent
				{:else if data.responseTime !== undefined && data.responseTime < 500}
					Good
				{:else if data.responseTime !== undefined}
					Needs optimization
				{:else}
					No data
				{/if}
			</div>
		</div>
		
		<!-- Cache Status -->
		<div class="rounded-lg bg-gray-900/50 p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-400">Cache Status</span>
				<Database class="h-4 w-4 text-gray-500" />
			</div>
			<div class="text-2xl font-bold {getCacheColor(data.cacheStatus)}">
				{getCacheStatus(data.cacheStatus, data.cached)}
			</div>
			<div class="mt-1 text-xs text-gray-500">
				{#if data.cacheStatus === 'hit'}
					Served from cache
				{:else if data.cacheStatus === 'miss'}
					Fresh from source
				{:else if data.cacheStatus === 'bypass'}
					Cache bypassed
				{:else}
					Cache data
				{/if}
			</div>
		</div>

		<!-- X-ray Trace ID -->
		{#if data.traceId}
			<div class="rounded-lg bg-gray-900/50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm text-gray-400">Trace ID</span>
					<Eye class="h-4 w-4 text-gray-500" />
				</div>
				<div class="text-xs font-mono text-blue-400 break-all">
					{data.traceId}
				</div>
				<div class="mt-1 text-xs text-gray-500">
					X-ray debugging
				</div>
			</div>
		{/if}

		<!-- Cache Performance Stats -->
		{#if data.cacheStats}
			<div class="rounded-lg bg-gray-900/50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm text-gray-400">Cache Hit Rate</span>
					<Zap class="h-4 w-4 text-gray-500" />
				</div>
				<div class="text-2xl font-bold text-blue-400">
					{formatPercentage(data.cacheStats.hitRate)}
				</div>
				<div class="mt-1 text-xs text-gray-500">
					{data.cacheStats.hits} hits, {data.cacheStats.misses} misses
				</div>
			</div>
		{/if}

		<!-- Data Results Count -->
		{#if data.translationsFound || data.filesFound || data.booksFound || data.languagesFound}
			<div class="rounded-lg bg-gray-900/50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm text-gray-400">Results Found</span>
					<BarChart3 class="h-4 w-4 text-gray-500" />
				</div>
				<div class="text-2xl font-bold text-white">
					{data.translationsFound || data.filesFound || data.booksFound || data.languagesFound}
				</div>
				<div class="mt-1 text-xs text-gray-500">
					{#if data.translationsFound}
						Translations
					{:else if data.filesFound}
						Files
					{:else if data.booksFound}
						Books
					{:else if data.languagesFound}
						Languages
					{/if}
				</div>
			</div>
		{/if}

		<!-- Total Duration (if different from response time) -->
		{#if data.totalDuration !== undefined && data.totalDuration !== data.responseTime}
			<div class="rounded-lg bg-gray-900/50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm text-gray-400">Total Duration</span>
					<Clock class="h-4 w-4 text-gray-500" />
				</div>
				<div class="text-lg font-bold {getPerformanceColor(data.totalDuration)}">
					{formatTime(data.totalDuration)}
				</div>
				<div class="mt-1 text-xs text-gray-500">
					Full trace duration
				</div>
			</div>
		{/if}
		
		<!-- Timestamp -->
		<div class="rounded-lg bg-gray-900/50 p-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-400">Last Updated</span>
				<Clock class="h-4 w-4 text-gray-500" />
			</div>
			<div class="text-sm font-medium text-white">
				{data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : 'N/A'}
			</div>
		</div>
	</div>

	<!-- API Calls Trace -->
	{#if data.calls && data.calls.length > 0}
		<div class="mt-6 rounded-lg bg-gray-900/50 p-4">
			<div class="mb-3 flex items-center space-x-2">
				<Link class="h-4 w-4 text-blue-400" />
				<h4 class="text-sm font-medium text-white">API Call Trace</h4>
			</div>
			<div class="space-y-2">
				{#each data.calls as call, index}
					<div class="rounded bg-gray-800/50 p-3 text-xs">
						<div class="flex items-center justify-between">
							<span class="font-mono text-blue-400">{call.endpoint || `Call ${index + 1}`}</span>
							<span class="text-gray-400">{formatTime(call.duration)}</span>
						</div>
						{#if call.url}
							<div class="mt-1 font-mono text-gray-500 break-all">{call.url}</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
	
	<!-- Debug Information -->
	{#if data.debug}
		<div class="mt-6 rounded-lg bg-gray-900/50 p-4">
			<div class="mb-3 flex items-center justify-between">
				<h4 class="text-sm font-medium text-gray-400">Debug Information</h4>
				<button 
					class="text-xs text-blue-400 hover:text-blue-300"
					on:click={() => data.showFullDebug = !data.showFullDebug}
				>
					{data.showFullDebug ? 'Hide' : 'Show'} Full Metadata
				</button>
			</div>
			
			{#if data.debug.cacheKey}
				<div class="mb-2">
					<span class="text-xs text-gray-400">Cache Key:</span>
					<div class="font-mono text-xs text-gray-300 break-all">{data.debug.cacheKey}</div>
				</div>
			{/if}
			
			{#if data.showFullDebug && data.debug.fullMetadata}
				<pre class="overflow-x-auto text-xs text-gray-300 bg-gray-800/50 p-3 rounded">
{JSON.stringify(data.debug.fullMetadata, null, 2)}
				</pre>
			{/if}
		</div>
	{/if}
</div>