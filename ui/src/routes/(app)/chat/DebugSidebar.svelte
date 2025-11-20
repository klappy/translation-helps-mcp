<script lang="ts">
	import { Bug, X, Trash2, AlertCircle, Clock, CheckCircle, Filter } from 'lucide-svelte';

	export let logs: Array<{
		id: string;
		timestamp: Date;
		type: 'mcp-tool' | 'mcp-prompt' | 'network' | 'llm' | 'other';
		endpoint?: string;
		params?: Record<string, any>;
		error?: string;
		status?: number;
		duration?: number;
		userMessage?: string;
		response?: any; // Full MCP server response
		llmResponse?: string; // LLM's final response for comparison
		isError?: boolean; // Whether this is an error or successful response
	}> = [];

	let isOpen = false;
	let filterMode: 'all' | 'errors' | 'success' = 'all';

	function formatTimestamp(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		}).format(date);
	}

	function getErrorTypeIcon(type: string) {
		switch (type) {
			case 'mcp-tool':
				return '🔧';
			case 'mcp-prompt':
				return '📝';
			case 'network':
				return '🌐';
			case 'llm':
				return '🤖';
			default:
				return '⚠️';
		}
	}

	function getErrorTypeColor(type: string): string {
		switch (type) {
			case 'mcp-tool':
				return 'text-orange-400';
			case 'mcp-prompt':
				return 'text-purple-400';
			case 'network':
				return 'text-red-400';
			case 'llm':
				return 'text-blue-400';
			default:
				return 'text-yellow-400';
		}
	}

	function clearLogs() {
		logs = [];
	}

	// Filter logs based on current filter mode
	$: filteredLogs = logs.filter((log) => {
		if (filterMode === 'errors') return log.isError === true;
		if (filterMode === 'success') return log.isError === false || log.isError === undefined;
		return true; // 'all'
	});

	$: errorCount = logs.filter((log) => log.isError === true).length;
	$: successCount = logs.filter((log) => log.isError === false || log.isError === undefined).length;

	function formatParams(params?: Record<string, any>): string {
		if (!params || Object.keys(params).length === 0) return 'None';
		return JSON.stringify(params, null, 2);
	}

	function formatResponse(response?: any): string {
		if (!response) return 'No response data';

		try {
			// Deep clone to avoid mutating the original
			const cloned = JSON.parse(JSON.stringify(response));

			// If response has content array with text fields, parse JSON strings
			if (cloned.content && Array.isArray(cloned.content)) {
				cloned.content = cloned.content.map((item: any) => {
					if (item.type === 'text' && item.text && typeof item.text === 'string') {
						// Try to parse JSON strings for better readability
						try {
							const parsed = JSON.parse(item.text);
							// Replace the string with the parsed object
							item.text = parsed;
							// Add a note that this was parsed
							item._parsedFromString = true;
						} catch {
							// Not JSON, keep as is but truncate if too long
							if (item.text.length > 500) {
								item.text = item.text.substring(0, 500) + '... (truncated)';
								item._truncated = true;
							}
						}
					}
					return item;
				});
			}

			// Format with proper indentation
			return JSON.stringify(cloned, null, 2);
		} catch (error) {
			// Fallback: try basic stringification
			try {
				return JSON.stringify(response, null, 2);
			} catch {
				// Last resort: convert to string
				return String(response);
			}
		}
	}
</script>

<!-- Toggle Button (always visible) -->
<button
	on:click={() => (isOpen = !isOpen)}
	class="fixed right-4 bottom-20 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-white shadow-lg transition-all hover:bg-gray-600 {isOpen
		? 'bg-gray-600'
		: ''}"
	title="Debug Console ({logs.length} entries, {errorCount} errors)"
>
	<Bug class="h-5 w-5" />
	{#if errorCount > 0}
		<span
			class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
		>
			{errorCount}
		</span>
	{/if}
</button>

<!-- Sidebar Panel -->
{#if isOpen}
	<div
		class="h-full w-96 flex-shrink-0 overflow-hidden border-l border-gray-700 bg-gray-900 shadow-2xl"
		style="background-color: #111827;"
	>
		<!-- Header -->
		<div class="flex flex-col border-b border-gray-700 bg-gray-800">
			<div class="flex items-center justify-between px-4 py-3">
				<div class="flex items-center gap-2">
					<Bug class="h-5 w-5 text-gray-400" />
					<h2 class="text-lg font-semibold text-white">Debug Console</h2>
					<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs font-bold text-gray-300">
						{logs.length}
					</span>
					{#if errorCount > 0}
						<span class="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
							{errorCount} errors
						</span>
					{/if}
					{#if successCount > 0}
						<span class="rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
							{successCount} success
						</span>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					{#if logs.length > 0}
						<button
							on:click={clearLogs}
							class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
							title="Clear all logs"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					{/if}
					<button
						on:click={() => (isOpen = false)}
						class="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
						title="Close debug console"
					>
						<X class="h-5 w-5" />
					</button>
				</div>
			</div>

			<!-- Filter Tabs -->
			<div class="flex gap-1 border-t border-gray-700 px-4 py-2">
				<button
					on:click={() => (filterMode = 'all')}
					class="flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors {filterMode ===
					'all'
						? 'bg-blue-600 text-white'
						: 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'}"
				>
					<Filter class="h-3 w-3" />
					All ({logs.length})
				</button>
				<button
					on:click={() => (filterMode = 'errors')}
					class="flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors {filterMode ===
					'errors'
						? 'bg-red-600 text-white'
						: 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'}"
				>
					Errors ({errorCount})
				</button>
				<button
					on:click={() => (filterMode = 'success')}
					class="flex items-center gap-1 rounded px-3 py-1 text-xs font-medium transition-colors {filterMode ===
					'success'
						? 'bg-green-600 text-white'
						: 'text-gray-400 hover:bg-gray-700 hover:text-gray-300'}"
				>
					<CheckCircle class="h-3 w-3" />
					Success ({successCount})
				</button>
			</div>
		</div>

		<!-- Log List -->
		<div class="h-[calc(100%-8rem)] overflow-y-auto">
			{#if filteredLogs.length === 0}
				<div class="flex h-full flex-col items-center justify-center p-8 text-center">
					<AlertCircle class="mb-4 h-12 w-12 text-gray-600" />
					<p class="text-sm text-gray-400">
						No {filterMode === 'all' ? 'logs' : filterMode} logged
					</p>
					<p class="mt-2 text-xs text-gray-500">MCP server responses will appear here</p>
				</div>
			{:else}
				<div class="divide-y divide-gray-800">
					{#each filteredLogs as log (log.id)}
						<div
							class="border-b border-gray-800 p-4 hover:bg-gray-800/50 {log.isError
								? 'bg-gray-900/50'
								: 'bg-gray-900/30'}"
						>
							<!-- Log Header -->
							<div class="mb-2 flex items-start justify-between">
								<div class="flex items-start gap-2">
									<span class="text-xl">{getErrorTypeIcon(log.type)}</span>
									<div>
										<div class="flex items-center gap-2">
											<span class="text-sm font-semibold {getErrorTypeColor(log.type)}">
												{log.type.replace('mcp-', 'MCP ').replace('-', ' ').toUpperCase()}
											</span>
											{#if log.isError}
												<span
													class="rounded bg-red-900/50 px-1.5 py-0.5 text-xs font-semibold text-red-300"
												>
													ERROR
												</span>
											{:else}
												<span
													class="rounded bg-green-900/50 px-1.5 py-0.5 text-xs font-semibold text-green-300"
												>
													SUCCESS
												</span>
											{/if}
											{#if log.status}
												<span
													class="rounded px-1.5 py-0.5 font-mono text-xs {log.status >= 500
														? 'bg-red-900/50 text-red-300'
														: log.status >= 400
															? 'bg-orange-900/50 text-orange-300'
															: 'bg-green-900/50 text-green-300'}"
												>
													{log.status}
												</span>
											{/if}
										</div>
										{#if log.endpoint}
											<div class="mt-1 text-xs text-gray-400">
												<code class="text-cyan-400">{log.endpoint}</code>
											</div>
										{/if}
									</div>
								</div>
								<div class="flex flex-col items-end gap-1 text-xs text-gray-500">
									<div class="flex items-center gap-1">
										<Clock class="h-3 w-3" />
										{formatTimestamp(log.timestamp)}
									</div>
									{#if log.duration !== undefined}
										<span class="text-gray-600">{log.duration}ms</span>
									{/if}
								</div>
							</div>

							<!-- User Message (if available) -->
							{#if log.userMessage}
								<div class="mb-2 rounded bg-gray-800/50 px-2 py-1 text-xs">
									<span class="text-gray-500">User asked:</span>
									<span class="ml-1 text-gray-300">"{log.userMessage}"</span>
								</div>
							{/if}

							<!-- Error Message (if error) -->
							{#if log.error}
								<div class="mb-2 rounded border border-red-900/50 bg-red-900/20 px-3 py-2">
									<p class="text-sm text-red-200">{log.error}</p>
								</div>
							{/if}

							<!-- Parameters (if available) -->
							{#if log.params && Object.keys(log.params).length > 0}
								<details class="mt-2">
									<summary class="cursor-pointer text-xs text-gray-400 hover:text-gray-300">
										Parameters (including defaults)
									</summary>
									<div class="mt-2 rounded bg-gray-950 p-2">
										<p class="mb-1 text-xs text-gray-500">
											These are the final parameters sent to the MCP tool, including any defaults
											applied (language, organization, format, etc.)
										</p>
										<pre class="overflow-x-auto text-xs text-gray-300">
{formatParams(log.params)}</pre>
									</div>
								</details>
							{/if}

							<!-- Full MCP Server Response (if available) -->
							{#if log.response !== undefined && log.response !== null}
								<details class="mt-2" open>
									<summary class="cursor-pointer text-xs text-cyan-400 hover:text-cyan-300">
										📡 Full MCP Server Response
									</summary>
									<div class="mt-2 rounded bg-gray-950 p-3">
										<pre
											class="max-h-96 overflow-auto font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-gray-300">
{formatResponse(log.response)}</pre>
									</div>
								</details>
							{/if}

							<!-- LLM Response (for comparison) -->
							{#if log.llmResponse}
								<details class="mt-2">
									<summary class="cursor-pointer text-xs text-blue-400 hover:text-blue-300">
										🤖 LLM Response (for comparison)
									</summary>
									<div
										class="mt-2 max-h-64 overflow-auto rounded bg-gray-950 p-2 text-xs whitespace-pre-wrap text-gray-300"
									>
										{log.llmResponse}
									</div>
								</details>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for error list */
	:global(.overflow-y-auto)::-webkit-scrollbar {
		width: 6px;
	}

	:global(.overflow-y-auto)::-webkit-scrollbar-track {
		background: #1f2937;
	}

	:global(.overflow-y-auto)::-webkit-scrollbar-thumb {
		background: #4b5563;
		border-radius: 3px;
	}

	:global(.overflow-y-auto)::-webkit-scrollbar-thumb:hover {
		background: #6b7280;
	}
</style>
