<script lang="ts">
	import { slide } from 'svelte/transition';

	export let agent: {
		name: string;
		icon: string;
		task: string;
		status: 'pending' | 'thinking' | 'tool-calling' | 'complete' | 'error';
		thoughts: string;
		toolCalls: Array<{ name: string; args?: string; status: string; preview?: string }>;
		summary?: string;
		error?: string;
	};

	let expanded = true;

	// No auto-collapse - let users read the agent details at their own pace
	// They can manually collapse agents they're done reading

	function getStatusBadge(status: string): { text: string; class: string } {
		switch (status) {
			case 'pending':
				return { text: 'Waiting...', class: 'status-pending' };
			case 'thinking':
				return { text: 'Thinking...', class: 'status-thinking' };
			case 'tool-calling':
				return { text: 'Fetching data...', class: 'status-tool' };
			case 'complete':
				return { text: '✓ Done', class: 'status-complete' };
			case 'error':
				return { text: '✗ Error', class: 'status-error' };
			default:
				return { text: status, class: '' };
		}
	}

	$: statusBadge = getStatusBadge(agent.status);
</script>

<div
	class="agent-stream"
	class:active={agent.status === 'thinking' || agent.status === 'tool-calling'}
	class:error={agent.status === 'error'}
>
	<button class="agent-header" on:click={() => (expanded = !expanded)}>
		<span class="agent-icon">{agent.icon}</span>
		<span class="agent-name">{agent.name}</span>
		<span class="agent-task">{agent.task}</span>
		<span class="agent-status {statusBadge.class}">
			{statusBadge.text}
		</span>
		<span class="expand-icon">{expanded ? '▼' : '▶'}</span>
	</button>

	{#if expanded}
		<div class="thought-content" transition:slide={{ duration: 200 }}>
			<!-- Streaming thoughts -->
			{#if agent.thoughts}
				<div class="thoughts-text">
					{agent.thoughts}
					{#if agent.status === 'thinking'}
						<span class="cursor">▊</span>
					{/if}
				</div>
			{/if}

			<!-- Tool calls -->
			{#if agent.toolCalls.length > 0}
				<div class="tool-calls">
					{#each agent.toolCalls as tool}
						<div
							class="tool-call"
							class:complete={tool.status === 'complete'}
							class:running={tool.status === 'running'}
						>
							<span class="tool-icon">🔧</span>
							<span class="tool-name">{tool.name}</span>
							{#if tool.args}
								<code class="tool-args"
									>{tool.args.substring(0, 60)}{tool.args.length > 60 ? '...' : ''}</code
								>
							{/if}
							{#if tool.status === 'running'}
								<span class="tool-spinner">⏳</span>
							{:else if tool.status === 'complete'}
								<span class="tool-check">✓</span>
							{/if}
						</div>
						{#if tool.preview}
							<div class="tool-preview">{tool.preview}</div>
						{/if}
					{/each}
				</div>
			{/if}

			<!-- Summary when complete -->
			{#if agent.summary}
				<div class="agent-summary">
					✅ {agent.summary}
				</div>
			{/if}

			<!-- Error display -->
			{#if agent.error}
				<div class="agent-error">
					⚠️ {agent.error}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.agent-stream {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		margin: 8px 0;
		overflow: hidden;
		transition: all 0.3s ease;
		background: rgba(0, 0, 0, 0.2);
	}

	.agent-stream.active {
		border-color: rgba(59, 130, 246, 0.5);
		box-shadow: 0 0 15px rgba(59, 130, 246, 0.15);
	}

	.agent-stream.error {
		border-color: rgba(239, 68, 68, 0.5);
	}

	.agent-header {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 10px 14px;
		background: transparent;
		border: none;
		color: #e0e0e0;
		cursor: pointer;
		font-size: 13px;
		text-align: left;
	}

	.agent-header:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.agent-icon {
		font-size: 16px;
		flex-shrink: 0;
	}

	.agent-name {
		font-weight: 600;
		color: #ffffff;
		flex-shrink: 0;
	}

	.agent-task {
		flex: 1;
		color: #a0a0a0;
		font-size: 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin: 0 8px;
	}

	.agent-status {
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 10px;
		flex-shrink: 0;
	}

	.status-pending {
		background: rgba(156, 163, 175, 0.2);
		color: #9ca3af;
	}

	.status-thinking {
		background: rgba(59, 130, 246, 0.2);
		color: #60a5fa;
		animation: pulse 1.5s infinite;
	}

	.status-tool {
		background: rgba(245, 158, 11, 0.2);
		color: #fbbf24;
	}

	.status-complete {
		background: rgba(34, 197, 94, 0.2);
		color: #4ade80;
	}

	.status-error {
		background: rgba(239, 68, 68, 0.2);
		color: #f87171;
	}

	.expand-icon {
		color: #606060;
		font-size: 10px;
		flex-shrink: 0;
	}

	.thought-content {
		padding: 12px 14px;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.thoughts-text {
		font-family: 'SF Mono', 'Fira Code', 'Monaco', monospace;
		font-size: 12px;
		line-height: 1.6;
		color: #c0c0c0;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 150px;
		overflow-y: auto;
		padding: 8px 10px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 6px;
		margin-bottom: 8px;
	}

	.cursor {
		animation: blink 1s infinite;
		color: #60a5fa;
	}

	@keyframes blink {
		0%,
		50% {
			opacity: 1;
		}
		51%,
		100% {
			opacity: 0;
		}
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.6;
		}
	}

	.tool-calls {
		margin-top: 8px;
	}

	.tool-call {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 11px;
		padding: 6px 10px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
		margin-bottom: 4px;
		color: #a0a0a0;
	}

	.tool-call.running {
		border-left: 2px solid #fbbf24;
	}

	.tool-call.complete {
		border-left: 2px solid #4ade80;
	}

	.tool-icon {
		flex-shrink: 0;
	}

	.tool-name {
		font-weight: 500;
		color: #d0d0d0;
	}

	.tool-args {
		font-size: 10px;
		color: #707070;
		background: rgba(0, 0, 0, 0.3);
		padding: 2px 6px;
		border-radius: 3px;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tool-spinner {
		margin-left: auto;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.tool-check {
		margin-left: auto;
		color: #4ade80;
	}

	.tool-preview {
		font-size: 11px;
		color: #808080;
		padding: 4px 10px 4px 28px;
		margin-top: -2px;
		margin-bottom: 4px;
	}

	.agent-summary {
		font-size: 12px;
		color: #4ade80;
		padding: 8px 10px;
		background: rgba(34, 197, 94, 0.1);
		border-radius: 4px;
		margin-top: 8px;
	}

	.agent-error {
		font-size: 12px;
		color: #f87171;
		padding: 8px 10px;
		background: rgba(239, 68, 68, 0.1);
		border-radius: 4px;
		margin-top: 8px;
	}
</style>
