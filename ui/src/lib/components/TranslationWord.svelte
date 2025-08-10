<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { Code, BookOpen, Lightbulb, ExternalLink, Copy } from 'lucide-svelte';

	export let word: {
		word: string;
		title?: string;
		subtitle?: string;
		content?: string;
		semanticDomains?: string[];
		occurrences?: number;
	};

	export let showDetails = true;
	export let theme: 'default' | 'expanded' | 'compact' = 'default';

	let isExpanded = false;
	let isCopied = false;

	function copyDefinition() {
		const text = `${word.word}: ${word.title || ''} - ${word.content || ''}`;
		navigator.clipboard.writeText(text);
		isCopied = true;
		setTimeout(() => {
			isCopied = false;
		}, 2000);
	}

	function toggleExpansion() {
		isExpanded = !isExpanded;
	}
</script>

<div
	class="translation-word {theme}"
	class:expanded={theme === 'expanded' || isExpanded}
	class:compact={theme === 'compact'}
	in:fade={{ duration: 300 }}
>
	<div class="word-header">
		<div class="word-icon">
			<Code class="h-5 w-5" />
		</div>
		<div class="word-info">
			<h3 class="word-title">{word.word}</h3>
			{#if word.subtitle}
				<p class="word-subtitle">{word.subtitle}</p>
			{/if}
		</div>
		<div class="word-actions">
			<button
				class="action-btn {isCopied ? 'copied' : ''}"
				on:click={copyDefinition}
				title="Copy definition"
			>
				<Copy class="h-4 w-4" />
			</button>
			{#if theme === 'default'}
				<button class="action-btn" on:click={toggleExpansion} title="Toggle details">
					<BookOpen class="h-4 w-4" />
				</button>
			{/if}
		</div>
	</div>

	{#if word.title && theme !== 'compact'}
		<div class="word-definition" in:slide={{ duration: 200 }}>
			<div class="definition-header">
				<Lightbulb class="h-4 w-4 text-yellow-400" />
				<span class="definition-label">Definition</span>
			</div>
			<p class="definition-text">{word.title}</p>
		</div>
	{/if}

	{#if (showDetails && (theme === 'expanded' || isExpanded)) || theme === 'expanded'}
		<div class="word-details" in:slide={{ duration: 300, delay: 100 }}>
			{#if word.content}
				<div class="detail-section">
					<h4 class="detail-title">Detailed Explanation</h4>
					<div class="detail-content prose prose-invert">
						{@html word.content.replace(/\n/g, '<br>')}
					</div>
				</div>
			{/if}

			{#if word.semanticDomains && word.semanticDomains.length > 0}
				<div class="detail-section">
					<h4 class="detail-title">Semantic Domains</h4>
					<div class="semantic-domains">
						{#each word.semanticDomains as domain}
							<span class="domain-tag">{domain}</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if word.occurrences}
				<div class="detail-section">
					<h4 class="detail-title">Usage</h4>
					<div class="usage-info">
						<span class="occurrences">{word.occurrences} occurrences in Scripture</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Decorative elements -->
	<div class="word-decoration">
		<div class="decoration-dot"></div>
		<div class="decoration-line"></div>
	</div>
</div>

<style>
	.translation-word {
		position: relative;
		padding: 1.5rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.3s ease;
		overflow: hidden;
	}

	.translation-word:hover {
		transform: translateY(-2px);
		border-color: rgba(59, 130, 246, 0.3);
		box-shadow: 0 10px 30px rgba(59, 130, 246, 0.1);
	}

	.translation-word.expanded {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1));
		border-color: rgba(59, 130, 246, 0.3);
	}

	.translation-word.compact {
		padding: 1rem;
	}

	.word-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.word-icon {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, #3b82f6, #a855f7);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
	}

	.word-info {
		flex: 1;
		min-width: 0;
	}

	.word-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: white;
		margin: 0 0 0.25rem 0;
		text-transform: capitalize;
	}

	.word-subtitle {
		font-size: 0.875rem;
		color: #94a3b8;
		margin: 0;
		font-style: italic;
	}

	.word-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.action-btn {
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #94a3b8;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.2);
		color: white;
		transform: scale(1.05);
	}

	.action-btn.copied {
		background: rgba(34, 197, 94, 0.2);
		border-color: rgba(34, 197, 94, 0.3);
		color: #86efac;
	}

	.word-definition {
		margin-bottom: 1rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 0.75rem;
		border-left: 4px solid #3b82f6;
	}

	.definition-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.definition-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.definition-text {
		font-size: 1rem;
		line-height: 1.6;
		color: #e2e8f0;
		margin: 0;
	}

	.word-details {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 1rem;
	}

	.detail-section {
		margin-bottom: 1.5rem;
	}

	.detail-section:last-child {
		margin-bottom: 0;
	}

	.detail-title {
		font-size: 1rem;
		font-weight: 600;
		color: white;
		margin: 0 0 0.75rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.detail-title::before {
		content: '';
		width: 0.25rem;
		height: 1rem;
		background: linear-gradient(to bottom, #3b82f6, #a855f7);
		border-radius: 0.125rem;
	}

	.detail-content {
		font-size: 0.875rem;
		line-height: 1.6;
		color: #cbd5e1;
	}

	.semantic-domains {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.domain-tag {
		padding: 0.25rem 0.75rem;
		background: rgba(59, 130, 246, 0.2);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 1rem;
		font-size: 0.75rem;
		color: #93c5fd;
		font-weight: 500;
	}

	.usage-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.occurrences {
		font-size: 0.875rem;
		color: #94a3b8;
	}

	.word-decoration {
		position: absolute;
		top: 0;
		right: 0;
		width: 100px;
		height: 100px;
		pointer-events: none;
		z-index: 1;
	}

	.decoration-dot {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 0.5rem;
		height: 0.5rem;
		background: rgba(59, 130, 246, 0.3);
		border-radius: 50%;
	}

	.decoration-line {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		width: 2rem;
		height: 1px;
		background: linear-gradient(to right, rgba(59, 130, 246, 0.3), transparent);
	}

	/* Responsive design */
	@media (max-width: 640px) {
		.translation-word {
			padding: 1rem;
		}

		.word-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.word-actions {
			align-self: flex-end;
		}

		.semantic-domains {
			justify-content: flex-start;
		}
	}

	/* Animation for expansion */
	.translation-word.expanded {
		animation: expandGlow 0.3s ease-out;
	}

	@keyframes expandGlow {
		0% {
			box-shadow: 0 0 0 rgba(59, 130, 246, 0);
		}
		50% {
			box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
		}
		100% {
			box-shadow: 0 10px 30px rgba(59, 130, 246, 0.1);
		}
	}
</style>
