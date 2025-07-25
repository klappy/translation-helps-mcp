<script>
	import { X, ChevronDown, ChevronRight, Clock, Database, Zap, AlertCircle } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	
	export let data = null;
	
	const dispatch = createEventDispatcher();
	let expandedTools = {};
	
	function toggleTool(toolId) {
		expandedTools[toolId] = !expandedTools[toolId];
	}
	
	function getToolIcon(toolName) {
		if (toolName.includes('scripture')) return '📖';
		if (toolName.includes('notes')) return '📝';
		if (toolName.includes('words')) return '📚';
		if (toolName.includes('links')) return '🔗';
		if (toolName.includes('context')) return '🧩';
		return '🔧';
	}
	
	function formatDuration(ms) {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}
</script>

<style>
	.xray-panel {
		@apply fixed bottom-0 right-0 z-50 h-full w-96 bg-gray-900 shadow-2xl;
		transform: translateX(0);
		transition: transform 0.3s ease-out;
	}
	
	.xray-header {
		@apply flex items-center justify-between border-b border-gray-800 bg-gray-900 p-4;
	}
	
	.xray-content {
		@apply h-full overflow-y-auto p-4 pb-20;
	}
	
	.summary-section {
		@apply mb-6 rounded-lg bg-gray-800 p-4;
	}
	
	.summary-grid {
		@apply grid grid-cols-2 gap-4;
	}
	
	.summary-item {
		@apply text-center;
	}
	
	.summary-value {
		@apply text-2xl font-bold text-white;
	}
	
	.summary-label {
		@apply text-xs text-gray-400;
	}
	
	.tool-list {
		@apply space-y-3;
	}
	
	.tool-item {
		@apply rounded-lg border border-gray-700 bg-gray-800/50 transition-all;
	}
	
	.tool-header {
		@apply flex cursor-pointer items-center justify-between p-3 hover:bg-gray-800;
	}
	
	.tool-info {
		@apply flex items-center gap-2;
	}
	
	.tool-icon {
		@apply text-xl;
	}
	
	.tool-name {
		@apply font-medium text-white;
	}
	
	.tool-metrics {
		@apply flex items-center gap-3 text-sm;
	}
	
	.metric {
		@apply flex items-center gap-1;
	}
	
	.metric.cache-hit {
		@apply text-green-400;
	}
	
	.metric.cache-miss {
		@apply text-orange-400;
	}
	
	.tool-details {
		@apply border-t border-gray-700 bg-gray-900/50 p-3;
	}
	
	.detail-row {
		@apply mb-2 text-sm;
	}
	
	.detail-label {
		@apply font-medium text-gray-400;
	}
	
	.detail-value {
		@apply mt-1 rounded bg-gray-900 p-2 font-mono text-xs text-gray-300;
	}
	
	.timeline {
		@apply relative mt-6 pl-8;
	}
	
	.timeline::before {
		@apply absolute left-3 top-0 h-full w-0.5 bg-gray-700;
		content: '';
	}
	
	.timeline-item {
		@apply relative mb-4;
	}
	
	.timeline-dot {
		@apply absolute -left-5 top-1 h-2 w-2 rounded-full bg-blue-500;
	}
	
	.timeline-content {
		@apply text-sm;
	}
	
	.timeline-time {
		@apply text-xs text-gray-500;
	}
</style>

<div class="xray-panel">
	<div class="xray-header">
		<div>
			<h3 class="text-lg font-semibold text-white">X-Ray Tool Analysis</h3>
			<p class="text-sm text-gray-400">MCP tool discovery & performance</p>
		</div>
		<button
			class="rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
			on:click={() => dispatch('close')}
		>
			<X class="h-5 w-5" />
		</button>
	</div>
	
	<div class="xray-content">
		{#if data}
			<!-- Summary Section -->
			<div class="summary-section">
				<h4 class="mb-3 text-sm font-medium text-gray-300">Performance Summary</h4>
				<div class="summary-grid">
					<div class="summary-item">
						<div class="summary-value">{data.tools.length}</div>
						<div class="summary-label">Tools Used</div>
					</div>
					<div class="summary-item">
						<div class="summary-value">{formatDuration(data.totalTime)}</div>
						<div class="summary-label">Total Time</div>
					</div>
					<div class="summary-item">
						<div class="summary-value">
							{data.tools.filter(t => t.cached).length}/{data.tools.length}
						</div>
						<div class="summary-label">Cache Hits</div>
					</div>
					<div class="summary-item">
						<div class="summary-value">
							{Math.round((data.tools.filter(t => t.cached).length / data.tools.length) * 100)}%
						</div>
						<div class="summary-label">Hit Rate</div>
					</div>
				</div>
			</div>
			
			<!-- Tool List -->
			<div>
				<h4 class="mb-3 text-sm font-medium text-gray-300">Tool Calls</h4>
				<div class="tool-list">
					{#each data.tools as tool, index}
						<div class="tool-item">
							<div class="tool-header" on:click={() => toggleTool(tool.id)}>
								<div class="tool-info">
									<span class="tool-icon">{getToolIcon(tool.name)}</span>
									<span class="tool-name">{tool.name}</span>
								</div>
								<div class="tool-metrics">
									<div class="metric" class:cache-hit={tool.cached} class:cache-miss={!tool.cached}>
										<Database class="h-3 w-3" />
										<span>{tool.cached ? 'HIT' : 'MISS'}</span>
									</div>
									<div class="metric">
										<Clock class="h-3 w-3" />
										<span>{formatDuration(tool.duration)}</span>
									</div>
									{#if expandedTools[tool.id]}
										<ChevronDown class="h-4 w-4 text-gray-400" />
									{:else}
										<ChevronRight class="h-4 w-4 text-gray-400" />
									{/if}
								</div>
							</div>
							
							{#if expandedTools[tool.id]}
								<div class="tool-details">
									<div class="detail-row">
										<div class="detail-label">Parameters</div>
										<div class="detail-value">
											{JSON.stringify(tool.params, null, 2)}
										</div>
									</div>
									{#if tool.result}
										<div class="detail-row">
											<div class="detail-label">Result Preview</div>
											<div class="detail-value">
												{JSON.stringify(tool.result, null, 2).slice(0, 200)}...
											</div>
										</div>
									{/if}
									{#if tool.error}
										<div class="detail-row">
											<div class="detail-label flex items-center gap-1 text-red-400">
												<AlertCircle class="h-3 w-3" />
												Error
											</div>
											<div class="detail-value text-red-300">
												{tool.error}
											</div>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
			
			<!-- Timeline -->
			<div class="timeline">
				<h4 class="mb-3 text-sm font-medium text-gray-300">Execution Timeline</h4>
				{#each data.tools as tool, index}
					<div class="timeline-item">
						<div class="timeline-dot"></div>
						<div class="timeline-content">
							<div class="text-white">{tool.name}</div>
							<div class="timeline-time">
								{tool.startTime}ms - {tool.endTime}ms
								<span class="text-gray-400">({formatDuration(tool.duration)})</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
			
			<!-- Citations -->
			{#if data.citations?.length > 0}
				<div class="mt-6">
					<h4 class="mb-3 text-sm font-medium text-gray-300">Resource Citations</h4>
					<div class="space-y-2">
						{#each data.citations as citation}
							<div class="flex items-center gap-2 text-sm">
								<span class="text-blue-400">📚</span>
								<span class="text-gray-300">{citation}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<div class="text-center text-gray-500">
				No X-Ray data available
			</div>
		{/if}
	</div>
</div>