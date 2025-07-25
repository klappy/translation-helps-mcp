<script>
	import { Activity, Clock, Database, Server, TrendingUp, Zap } from 'lucide-svelte';
	
	export let data = {};
	
	// Format response time
	function formatTime(ms) {
		if (!ms) return 'N/A';
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}
	
	// Get performance color
	function getPerformanceColor(ms) {
		if (!ms) return 'text-gray-400';
		if (ms < 200) return 'text-green-400';
		if (ms < 500) return 'text-yellow-400';
		return 'text-red-400';
	}
	
	// Get cache color
	function getCacheColor(cached) {
		return cached ? 'text-green-400' : 'text-orange-400';
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
				{#if data.responseTime && data.responseTime < 200}
					Excellent
				{:else if data.responseTime && data.responseTime < 500}
					Good
				{:else if data.responseTime}
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
			<div class="text-2xl font-bold {getCacheColor(data.cached)}">
				{data.cached ? 'HIT' : 'MISS'}
			</div>
			<div class="mt-1 text-xs text-gray-500">
				{data.cached ? 'Served from cache' : 'Fresh from source'}
			</div>
		</div>
		
		<!-- Data Source -->
		{#if data.dataSource}
			<div class="rounded-lg bg-gray-900/50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm text-gray-400">Data Source</span>
					<Server class="h-4 w-4 text-gray-500" />
				</div>
				<div class="text-lg font-medium text-white">
					{data.dataSource}
				</div>
				<div class="mt-1 text-xs text-gray-500">
					Origin server
				</div>
			</div>
		{/if}
		
		<!-- Request Size -->
		{#if data.requestSize}
			<div class="rounded-lg bg-gray-900/50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm text-gray-400">Request Size</span>
					<TrendingUp class="h-4 w-4 text-gray-500" />
				</div>
				<div class="text-lg font-medium text-white">
					{data.requestSize}
				</div>
			</div>
		{/if}
		
		<!-- Cache Performance -->
		{#if data.cacheHitRate !== undefined}
			<div class="rounded-lg bg-gray-900/50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm text-gray-400">Cache Hit Rate</span>
					<Zap class="h-4 w-4 text-gray-500" />
				</div>
				<div class="text-2xl font-bold text-blue-400">
					{(data.cacheHitRate * 100).toFixed(1)}%
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
	
	<!-- Additional Debug Info -->
	{#if data.debug}
		<div class="mt-4 rounded-lg bg-gray-900/50 p-4">
			<h4 class="mb-2 text-sm font-medium text-gray-400">Debug Information</h4>
			<pre class="overflow-x-auto text-xs text-gray-300">
{JSON.stringify(data.debug, null, 2)}
			</pre>
		</div>
	{/if}
</div>