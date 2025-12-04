<script lang="ts">
	import { ChevronDown, ChevronRight, Clock, Database, X, Zap } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	export let data: any = null;

	const dispatch = createEventDispatcher();
	let expandedTools: Record<string, boolean> = {};
	let expandedAgents: Record<string, boolean> = {};

	function toggleTool(toolId: string) {
		expandedTools[toolId] = !expandedTools[toolId];
	}

	function toggleAgent(agentId: string) {
		expandedAgents[agentId] = !expandedAgents[agentId];
	}

	function getToolIcon(toolName: string) {
		if (toolName.includes('scripture')) return '📖';
		if (toolName.includes('notes')) return '📝';
		if (toolName.includes('words')) return '📚';
		if (toolName.includes('links')) return '🔗';
		if (toolName.includes('context')) return '🧩';
		return '🔧';
	}

	function getAgentIcon(agentName: string) {
		if (agentName === 'scripture') return '📖';
		if (agentName === 'notes') return '📝';
		if (agentName === 'words') return '📚';
		if (agentName === 'academy') return '🎓';
		if (agentName === 'search') return '🔍';
		return '🤖';
	}

	function formatDuration(ms: number) {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	// Check if this is orchestrated data
	$: isOrchestrated =
		data?.mode === 'orchestrated' || data?.orchestration || data?.agents?.dispatched > 0;
	$: agents = data?.agents?.details || data?.agents || [];
	$: timeline = data?.timeline || [];
	$: summary = data?.summary || {};

	// Group timeline by type for display
	$: llmCalls = timeline.filter((t: any) => t.type === 'llm');
	$: toolCalls = timeline.filter((t: any) => t.type === 'tool');

	function getTimelineIcon(entry: any) {
		if (entry.type === 'llm') {
			if (entry.name.includes('Orchestrator')) return '🎯';
			if (entry.name.includes('Synthesis')) return '✨';
			return '🧠';
		}
		return getToolIcon(entry.name);
	}

	function getTimelineColor(entry: any) {
		if (entry.type === 'llm') return 'border-purple-500/50 bg-purple-900/20';
		return 'border-blue-500/50 bg-blue-900/20';
	}
</script>

<div
	class="fixed right-0 bottom-0 z-50 h-full w-96 shadow-2xl"
	style="background-color: #0f172a; transform: translateX(0); transition: transform 0.3s ease-out;"
>
	<div
		class="flex items-center justify-between border-b border-gray-800 p-4"
		style="background-color: #0f172a;"
	>
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
				<div class="grid {isOrchestrated ? 'grid-cols-4' : 'grid-cols-2'} gap-3">
					{#if isOrchestrated}
						<div class="text-center">
							<div class="text-xl font-bold text-purple-400">
								{summary.llmCalls || llmCalls.length || 0}
							</div>
							<div class="text-xs text-gray-400">LLM Calls</div>
						</div>
						<div class="text-center">
							<div class="text-xl font-bold text-blue-400">
								{summary.toolCalls || toolCalls.length || 0}
							</div>
							<div class="text-xs text-gray-400">Tool Calls</div>
						</div>
						<div class="text-center">
							<div class="text-xl font-bold text-green-400">
								{summary.agentsDispatched || agents.length || 0}
							</div>
							<div class="text-xs text-gray-400">Agents</div>
						</div>
					{:else}
						<div class="text-center">
							<div class="text-2xl font-bold text-white">{data.tools?.length || 0}</div>
							<div class="text-xs text-gray-400">Tools Used</div>
						</div>
					{/if}
					{#if data.timings?.ttft}
						<div class="text-center">
							<div class="text-xl font-bold text-emerald-400">
								{formatDuration(data.timings.ttft)}
							</div>
							<div class="text-xs text-gray-400">TTFT</div>
						</div>
					{/if}
					<div class="text-center">
						<div class="text-xl font-bold text-white">{formatDuration(data.totalTime)}</div>
						<div class="text-xs text-gray-400">Total</div>
					</div>
				</div>
				{#if isOrchestrated}
					<div class="mt-3 border-t border-gray-700 pt-3">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 text-xs text-blue-400">
								<span>🧠</span>
								<span>Multi-Agent Orchestration</span>
							</div>
							{#if summary.agentsSuccessful !== undefined}
								<div class="text-xs">
									<span class="text-green-400">{summary.agentsSuccessful} ✓</span>
									{#if summary.agentsFailed > 0}
										<span class="ml-2 text-red-400">{summary.agentsFailed} ✗</span>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Execution Timeline Section (for orchestrated requests) -->
			{#if isOrchestrated && timeline.length > 0}
				<div class="mb-6">
					<h4 class="mb-3 text-sm font-medium text-gray-300">
						<span class="mr-2">⏱️</span>Execution Timeline
					</h4>
					<div class="relative space-y-2">
						<!-- Timeline connector line -->
						<div class="absolute top-0 bottom-0 left-4 w-0.5 bg-gray-700"></div>

						{#each timeline as entry, index}
							<div class="relative flex items-start gap-3 pl-2">
								<!-- Timeline dot -->
								<div
									class="relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm
									{entry.type === 'llm'
										? 'bg-purple-900 ring-2 ring-purple-500/50'
										: 'bg-blue-900 ring-2 ring-blue-500/50'}"
								>
									{getTimelineIcon(entry)}
								</div>

								<!-- Timeline content -->
								<div class="flex-1 rounded-lg border {getTimelineColor(entry)} p-2">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<span class="text-sm font-medium text-white">{entry.name}</span>
											{#if entry.agent}
												<span class="text-xs text-gray-500">({entry.agent})</span>
											{/if}
											{#if entry.success === false}
												<span class="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-300"
													>Failed</span
												>
											{:else if entry.success}
												<span class="text-xs text-green-400">✓</span>
											{/if}
										</div>
										{#if entry.duration}
											<span class="flex items-center gap-1 text-xs text-gray-400">
												<Clock class="h-3 w-3" />
												{formatDuration(entry.duration)}
											</span>
										{/if}
									</div>
									{#if entry.description}
										<div class="mt-1 truncate text-xs text-gray-400">{entry.description}</div>
									{/if}
									{#if entry.model}
										<div class="mt-1 text-xs text-purple-400/70">
											{entry.model.split('/').pop()}
										</div>
									{/if}
									{#if entry.preview}
										<div class="mt-1 truncate text-xs text-gray-500">
											{entry.preview.substring(0, 80)}...
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Timing Breakdown Section -->
			{#if data.timings?.breakdown}
				<div class="mb-6 rounded-lg bg-gray-800 p-4">
					<h4 class="mb-3 text-sm font-medium text-gray-300">Performance Breakdown</h4>
					<div class="space-y-2">
						{#each Object.entries(data.timings.breakdown) as [phase, timing]}
							<div class="flex items-center justify-between text-sm">
								<span class="text-gray-400">{phase}</span>
								<span class="font-mono text-white">{timing}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Agent Execution Section (for orchestrated requests) -->
			{#if isOrchestrated && agents.length > 0}
				<div class="mb-6">
					<h4 class="mb-3 text-sm font-medium text-gray-300">
						<span class="mr-2">🧠</span>Agent Execution
					</h4>
					<div class="space-y-2">
						{#each agents as agent}
							{@const hasDetails = agent.toolCalls?.length > 0 || agent.summary || agent.error}
							<div class="rounded-lg border border-gray-700 bg-gray-800/50">
								{#if hasDetails}
									<button
										class="flex w-full cursor-pointer items-center justify-between p-3 hover:bg-gray-800"
										on:click={() => toggleAgent(agent.agent || agent.name)}
									>
										<div class="flex items-center gap-2">
											<span class="text-lg">{getAgentIcon(agent.agent || agent.name)}</span>
											<span class="font-medium text-white capitalize"
												>{agent.agent || agent.name}</span
											>
											{#if agent.success === false || agent.status === 'error'}
												<span class="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-300"
													>Failed</span
												>
											{:else if agent.success || agent.status === 'complete'}
												<span class="rounded bg-green-900/50 px-1.5 py-0.5 text-xs text-green-300"
													>Done</span
												>
											{/if}
										</div>
										<div class="flex items-center gap-2 text-sm">
											{#if agent.confidence !== undefined}
												<span class="text-xs text-gray-500"
													>{Math.round(agent.confidence * 100)}% conf</span
												>
											{/if}
											{#if agent.duration}
												<span class="flex items-center gap-1 text-gray-400">
													<Clock class="h-3 w-3" />
													{formatDuration(agent.duration)}
												</span>
											{/if}
											{#if expandedAgents[agent.agent || agent.name]}
												<ChevronDown class="h-4 w-4 text-gray-400" />
											{:else}
												<ChevronRight class="h-4 w-4 text-gray-400" />
											{/if}
										</div>
									</button>
								{:else}
									<div class="flex items-center justify-between p-3">
										<div class="flex items-center gap-2">
											<span class="text-lg">{getAgentIcon(agent.agent || agent.name)}</span>
											<span class="font-medium text-white capitalize"
												>{agent.agent || agent.name}</span
											>
										</div>
										<div class="flex items-center gap-2 text-sm text-gray-400">
											{#if agent.duration}
												<Clock class="h-3 w-3" />
												{formatDuration(agent.duration)}
											{/if}
										</div>
									</div>
								{/if}

								{#if expandedAgents[agent.agent || agent.name] && hasDetails}
									<div
										class="border-t border-gray-700 p-3"
										style="background-color: rgba(15, 23, 42, 0.5);"
									>
										{#if agent.task}
											<div class="mb-2 text-sm">
												<span class="font-medium text-gray-400">Task:</span>
												<span class="ml-2 text-gray-300">{agent.task}</span>
											</div>
										{/if}
										{#if agent.summary}
											<div class="mb-2 text-sm">
												<span class="font-medium text-gray-400">Summary:</span>
												<span class="ml-2 text-gray-300">{agent.summary}</span>
											</div>
										{/if}
										{#if agent.error}
											<div class="mb-2 text-sm">
												<span class="font-medium text-red-400">Error:</span>
												<span class="ml-2 text-red-300">{agent.error}</span>
											</div>
										{/if}
										{#if agent.toolCalls && agent.toolCalls.length > 0}
											<div class="mt-2">
												<span class="text-sm font-medium text-gray-400">Tool Calls:</span>
												<div class="mt-1 space-y-1">
													{#each agent.toolCalls as tc}
														<div class="rounded bg-gray-900/50 px-2 py-1 text-xs">
															<span class="text-blue-400">🔧 {tc.name}</span>
															{#if tc.preview}
																<span class="ml-2 text-gray-500">→ {tc.preview}</span>
															{/if}
														</div>
													{/each}
												</div>
											</div>
										{/if}
										{#if agent.citations && agent.citations.length > 0}
											<div class="mt-2">
												<span class="text-sm font-medium text-gray-400">Citations:</span>
												<div class="mt-1 space-y-1">
													{#each agent.citations as citation}
														<div class="rounded bg-gray-900/50 px-2 py-1 text-xs text-gray-400">
															📚 {citation.source}{citation.reference
																? ` (${citation.reference})`
																: ''}
														</div>
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Orchestration Plan -->
				{#if data.orchestration?.plan}
					<div class="mb-6 rounded-lg bg-gray-800 p-4">
						<h4 class="mb-3 text-sm font-medium text-gray-300">
							<span class="mr-2">🎯</span>Orchestration Plan
						</h4>
						<p class="text-sm text-gray-400">
							{data.orchestration.plan.reasoning || 'No reasoning provided'}
						</p>
						{#if data.orchestration.plan.needsIteration}
							<div class="mt-2 text-xs text-yellow-400">⚠️ Iteration was expected</div>
						{/if}
					</div>
				{/if}
			{/if}

			<!-- Tool List -->
			<div>
				<h4 class="mb-3 text-sm font-medium text-gray-300">Tool Calls</h4>
				<div class="space-y-3">
					{#each data.tools as tool, index}
						{@const hasExpandableContent = tool.params || tool.response || tool.error}
						{@const cacheStatus = tool.cacheStatus || (tool.cached ? 'hit' : 'miss')}
						<div class="rounded-lg border border-gray-700 bg-gray-800/50 transition-all">
							{#if hasExpandableContent}
								<button
									class="flex w-full cursor-pointer items-center justify-between p-3 hover:bg-gray-800"
									on:click={() => toggleTool(tool.id)}
								>
									<div class="flex items-center gap-2">
										<span class="text-xl">{getToolIcon(tool.name)}</span>
										<span class="font-medium text-white">{tool.name}</span>
										{#if tool.error || tool.status === 404}
											<span class="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-300"
												>Failed</span
											>
										{:else if tool.responseSize}
											<span class="rounded bg-green-900/50 px-1.5 py-0.5 text-xs text-green-300"
												>{Math.round((tool.responseSize / 1024) * 10) / 10}KB</span
											>
										{/if}
									</div>
									<div class="flex items-center gap-3 text-sm">
										<span class="flex items-center gap-1">
											<Clock class="h-3 w-3" />
											{formatDuration(tool.duration)}
										</span>
										{#if cacheStatus === 'hit'}
											<span class="text-green-400">
												<Database class="h-3 w-3" />
											</span>
										{:else if cacheStatus === 'partial'}
											<span class="text-yellow-400">
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
							{:else}
								<div class="flex items-center justify-between p-3">
									<div class="flex items-center gap-2">
										<span class="text-xl">{getToolIcon(tool.name)}</span>
										<span class="font-medium text-white">{tool.name}</span>
									</div>
									<div class="flex items-center gap-3 text-sm">
										<span class="flex items-center gap-1">
											<Clock class="h-3 w-3" />
											{formatDuration(tool.duration)}
										</span>
										{#if cacheStatus === 'hit'}
											<span class="text-green-400">
												<Database class="h-3 w-3" />
											</span>
										{:else if cacheStatus === 'partial'}
											<span class="text-yellow-400">
												<Database class="h-3 w-3" />
											</span>
										{:else}
											<span class="text-orange-400">
												<Zap class="h-3 w-3" />
											</span>
										{/if}
									</div>
								</div>
							{/if}

							{#if expandedTools[tool.id] && hasExpandableContent}
								<div
									class="border-t border-gray-700 p-3"
									style="background-color: rgba(15, 23, 42, 0.5);"
								>
									{#if tool.params}
										<div class="mb-2 text-sm">
											<span class="font-medium text-gray-400">Parameters:</span>
											<pre
												class="mt-1 rounded p-2 font-mono text-xs text-gray-300"
												style="background-color: #0f172a;">{JSON.stringify(
													tool.params,
													null,
													2
												)}</pre>
										</div>
									{/if}
									{#if tool.response}
										<div class="mb-2 text-sm">
											<span class="font-medium text-gray-400">Response:</span>
											{#if tool.responseSize}
												<span class="ml-2 text-xs text-gray-500"
													>({Math.round((tool.responseSize / 1024) * 10) / 10}KB)</span
												>
											{/if}
											<pre
												class="mt-1 max-h-48 overflow-y-auto rounded p-2 font-mono text-xs text-gray-300"
												style="background-color: #0f172a;">{JSON.stringify(
													tool.response,
													null,
													2
												).substring(0, 500)}{JSON.stringify(tool.response, null, 2).length > 500
													? '...'
													: ''}</pre>
										</div>
									{:else if tool.error}
										<div class="mb-2 text-sm">
											<span class="font-medium text-red-400">Error:</span>
											<span class="ml-2 text-xs text-red-300">{tool.error}</span>
										</div>
									{/if}
									{#if tool.status}
										<div class="mb-2 text-sm">
											<span class="font-medium text-gray-400">Status:</span>
											<span class="ml-2 font-mono text-xs">
												{#if tool.error}
													<span class="text-red-400">Error: {tool.error}</span>
												{:else}
													<span class="text-green-400">HTTP {tool.status}</span>
												{/if}
											</span>
										</div>
									{/if}
									<div class="mb-2 text-sm">
										<span class="font-medium text-gray-400">Cache Status:</span>
										<span
											class="ml-2 {cacheStatus === 'hit'
												? 'text-green-400'
												: cacheStatus === 'partial'
													? 'text-yellow-400'
													: 'text-orange-400'}"
										>
											{cacheStatus.charAt(0).toUpperCase() + cacheStatus.slice(1)}
										</span>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

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
			<div class="text-center text-gray-500">No X-Ray data available</div>
		{/if}
	</div>
</div>
