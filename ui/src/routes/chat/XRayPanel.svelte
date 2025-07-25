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

<div class="fixed bottom-0 right-0 z-50 h-full w-96 shadow-2xl" style="background-color: #0f172a; transform: translateX(0); transition: transform 0.3s ease-out;">
	<div class="flex items-center justify-between border-b border-gray-800 p-4" style="background-color: #0f172a;">
		<h3 class="text-lg font-semibold text-white">X-Ray Analysis</h3>
		<button
			class="rounded-lg p-2 transition-colors hover:bg-gray-800"
			on:click={() => dispatch('close')}
		>
			<X class="h-5 w-5 text-gray-400" />
		</button>
	</div>
	
	<div class="h-full overflow-y-auto p-4 pb-20">
		{#if data}
			<!-- Summary Section -->
			<div class="mb-6 rounded-lg bg-gray-800 p-4">
				<h4 class="mb-3 text-sm font-medium text-gray-300">Summary</h4>
				<div class="grid grid-cols-2 gap-4">
					<div class="text-center">
						<div class="text-2xl font-bold text-white">{data.tools.length}</div>
						<div class="text-xs text-gray-400">Tools Used</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-white">{formatDuration(data.totalTime)}</div>
						<div class="text-xs text-gray-400">Total Time</div>
					</div>
				</div>
			</div>
			
			<!-- Tool List -->
			<div>
				<h4 class="mb-3 text-sm font-medium text-gray-300">Tool Calls</h4>
				<div class="space-y-3">
					{#each data.tools as tool, index}
						<div class="rounded-lg border border-gray-700 bg-gray-800/50 transition-all">
							<button
								class="flex w-full cursor-pointer items-center justify-between p-3 hover:bg-gray-800"
								on:click={() => toggleTool(tool.id)}
							>
								<div class="flex items-center gap-2">
									<span class="text-xl">{getToolIcon(tool.name)}</span>
									<span class="font-medium text-white">{tool.name}</span>
								</div>
								<div class="flex items-center gap-3 text-sm">
									<span class="flex items-center gap-1">
										<Clock class="h-3 w-3" />
										{formatDuration(tool.duration)}
									</span>
									{#if tool.cached}
										<span class="text-green-400">
											<Database class="h-3 w-3" />
										</span>
									{:else}
										<span class="text-orange-400">
											<Zap class="h-3 w-3" />
										</span>
									{/if}
									{#if expandedTools[tool.id]}
										<ChevronDown class="h-4 w-4 text-gray-400" />
									{:else}
										<ChevronRight class="h-4 w-4 text-gray-400" />
									{/if}
								</div>
							</button>
							
							{#if expandedTools[tool.id]}
								<div class="border-t border-gray-700 p-3" style="background-color: rgba(15, 23, 42, 0.5);">
									<div class="mb-2 text-sm">
										<span class="font-medium text-gray-400">Parameters:</span>
										<pre class="mt-1 rounded p-2 font-mono text-xs text-gray-300" style="background-color: #0f172a;">{JSON.stringify(tool.params, null, 2)}</pre>
									</div>
									<div class="mb-2 text-sm">
										<span class="font-medium text-gray-400">Response:</span>
										<pre class="mt-1 rounded p-2 font-mono text-xs text-gray-300" style="background-color: #0f172a;">{JSON.stringify(tool.response, null, 2).substring(0, 200)}...</pre>
									</div>
									<div class="mb-2 text-sm">
										<span class="font-medium text-gray-400">Cache Status:</span>
										<span class="ml-2 {tool.cached ? 'text-green-400' : 'text-orange-400'}">
											{tool.cached ? 'Hit' : 'Miss'}
										</span>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
			
			<!-- Timeline -->
			{#if data.timeline}
				<div class="mt-6">
					<h4 class="mb-3 text-sm font-medium text-gray-300">Timeline</h4>
					<div class="relative mt-6 pl-8">
						<div class="absolute left-3 top-0 h-full w-0.5 bg-gray-700"></div>
						{#each data.timeline as event}
							<div class="relative mb-4">
								<div class="absolute -left-5 top-1 h-2 w-2 rounded-full bg-blue-500"></div>
								<div class="text-sm">
									<span class="text-gray-400">{event.time}ms</span>
									<span class="ml-2 text-white">{event.event}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
			
			<!-- Citations -->
			{#if data.citations && data.citations.length > 0}
				<div class="mt-6">
					<h4 class="mb-3 text-sm font-medium text-gray-300">Citations</h4>
					<div class="space-y-2">
						{#each data.citations as citation}
							<div class="rounded bg-gray-800 px-3 py-2 text-sm text-gray-300">
								📚 {citation}
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