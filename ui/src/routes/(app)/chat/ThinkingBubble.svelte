<script lang="ts">
	import { slide } from 'svelte/transition';
	import AgentThoughtStream from './AgentThoughtStream.svelte';

	interface AgentStream {
		agent: string;
		name: string;
		icon: string;
		task: string;
		status: 'pending' | 'thinking' | 'tool-calling' | 'complete' | 'error';
		thoughts: string;
		toolCalls: Array<{ name: string; args?: string; status: string; preview?: string }>;
		summary?: string;
		error?: string;
	}

	export let isExpanded = true;
	export let agentStreams: AgentStream[] = [];
	export let orchestratorStatus: 'planning' | 'dispatching' | 'synthesizing' | 'done' = 'planning';
	export let orchestratorThoughts = '';

	// No auto-collapse - let users read the agent details at their own pace
	// The bubble stays expanded until the user manually collapses it

	// Count agents by status
	$: activeAgents = agentStreams.filter(
		(a) => a.status === 'thinking' || a.status === 'tool-calling'
	).length;
	$: completedAgents = agentStreams.filter((a) => a.status === 'complete').length;
	$: errorAgents = agentStreams.filter((a) => a.status === 'error').length;

	function getHeaderText(): string {
		switch (orchestratorStatus) {
			case 'planning':
				return 'Planning approach...';
			case 'dispatching':
				if (activeAgents > 0) {
					return `${activeAgents} agent${activeAgents !== 1 ? 's' : ''} working...`;
				}
				return `${completedAgents} of ${agentStreams.length} complete`;
			case 'synthesizing':
				return 'Synthesizing response...';
			case 'done':
				return errorAgents > 0
					? `Complete (${errorAgents} error${errorAgents !== 1 ? 's' : ''})`
					: 'Thinking complete';
			default:
				return 'Processing...';
		}
	}

	$: headerText = getHeaderText();
</script>

<div class="thinking-bubble" class:collapsed={!isExpanded} class:has-errors={errorAgents > 0}>
	<!-- Header - always visible -->
	<button class="thinking-header" on:click={() => (isExpanded = !isExpanded)}>
		<span class="thinking-icon">🧠</span>
		<span class="thinking-title">{headerText}</span>
		{#if agentStreams.length > 0}
			<span class="agent-count">
				{completedAgents}/{agentStreams.length}
			</span>
		{/if}
		<span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
	</button>

	<!-- Expandable content -->
	{#if isExpanded}
		<div class="thinking-content" transition:slide={{ duration: 250 }}>
			<!-- Orchestrator's planning thoughts -->
			{#if orchestratorThoughts}
				<div class="orchestrator-section">
					<div class="section-header">
						<span class="section-icon">🎯</span>
						<span class="section-title">Orchestrator</span>
						{#if orchestratorStatus === 'planning'}
							<span class="status-badge planning">Planning...</span>
						{:else}
							<span class="status-badge done">Plan ready</span>
						{/if}
					</div>
					<div class="orchestrator-thoughts">
						{orchestratorThoughts}
						{#if orchestratorStatus === 'planning'}
							<span class="cursor">▊</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Agent streams -->
			{#if agentStreams.length > 0}
				<div class="agents-section">
					{#each agentStreams as agentStream (agentStream.agent)}
						<AgentThoughtStream
							agent={{
								name: agentStream.name,
								icon: agentStream.icon,
								task: agentStream.task,
								status: agentStream.status,
								thoughts: agentStream.thoughts,
								toolCalls: agentStream.toolCalls,
								summary: agentStream.summary,
								error: agentStream.error
							}}
						/>
					{/each}
				</div>
			{/if}

			<!-- Empty state -->
			{#if !orchestratorThoughts && agentStreams.length === 0}
				<div class="empty-state">
					<span class="spinner">⏳</span>
					<span>Initializing...</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.thinking-bubble {
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		border: 1px solid #2a2a4a;
		border-radius: 12px;
		margin-bottom: 16px;
		overflow: hidden;
		transition: all 0.3s ease;
	}

	.thinking-bubble.collapsed {
		opacity: 0.7;
	}

	.thinking-bubble.collapsed:hover {
		opacity: 0.9;
	}

	.thinking-bubble.has-errors {
		border-color: rgba(239, 68, 68, 0.3);
	}

	.thinking-header {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 14px 16px;
		background: transparent;
		border: none;
		color: #b0b0c0;
		cursor: pointer;
		font-size: 14px;
		text-align: left;
		transition: background 0.2s;
	}

	.thinking-header:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.thinking-icon {
		font-size: 18px;
	}

	.thinking-title {
		flex: 1;
		font-weight: 500;
	}

	.agent-count {
		font-size: 12px;
		padding: 2px 8px;
		background: rgba(59, 130, 246, 0.2);
		color: #60a5fa;
		border-radius: 10px;
	}

	.expand-icon {
		color: #606070;
		font-size: 10px;
	}

	.thinking-content {
		padding: 0 16px 16px;
	}

	.orchestrator-section {
		margin-bottom: 16px;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
		font-size: 13px;
	}

	.section-icon {
		font-size: 14px;
	}

	.section-title {
		font-weight: 600;
		color: #e0e0e0;
	}

	.status-badge {
		font-size: 10px;
		padding: 2px 8px;
		border-radius: 8px;
		margin-left: auto;
	}

	.status-badge.planning {
		background: rgba(59, 130, 246, 0.2);
		color: #60a5fa;
		animation: pulse 1.5s infinite;
	}

	.status-badge.done {
		background: rgba(34, 197, 94, 0.2);
		color: #4ade80;
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

	.orchestrator-thoughts {
		font-family: 'SF Mono', 'Fira Code', 'Monaco', monospace;
		font-size: 12px;
		line-height: 1.6;
		color: #a0a0b0;
		white-space: pre-wrap;
		word-break: break-word;
		padding: 10px 12px;
		background: rgba(59, 130, 246, 0.08);
		border: 1px solid rgba(59, 130, 246, 0.15);
		border-radius: 8px;
		max-height: 120px;
		overflow-y: auto;
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

	.agents-section {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 24px;
		color: #707080;
		font-size: 13px;
	}

	.spinner {
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
</style>
