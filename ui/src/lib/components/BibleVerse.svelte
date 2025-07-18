<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { BookOpen, Quote, Heart, Share2, Copy } from 'lucide-svelte';

	export let verse: {
		reference: string;
		text: string;
		book?: string;
		chapter?: number;
		verse?: number;
	};

	export let showActions = true;
	export let theme: 'default' | 'highlight' | 'minimal' = 'default';

	let isLiked = false;
	let isCopied = false;

	function copyVerse() {
		navigator.clipboard.writeText(`${verse.reference}: ${verse.text}`);
		isCopied = true;
		setTimeout(() => {
			isCopied = false;
		}, 2000);
	}

	function toggleLike() {
		isLiked = !isLiked;
	}

	function shareVerse() {
		if (navigator.share) {
			navigator.share({
				title: verse.reference,
				text: `${verse.reference}: ${verse.text}`,
				url: window.location.href
			});
		} else {
			copyVerse();
		}
	}
</script>

<div 
	class="bible-verse {theme}"
	class:highlight={theme === 'highlight'}
	class:minimal={theme === 'minimal'}
	in:fade={{ duration: 300 }}
>
	<div class="verse-content">
		{#if theme !== 'minimal'}
			<div class="verse-header">
				<div class="verse-icon">
					<BookOpen class="w-5 h-5" />
				</div>
				<h3 class="verse-reference">{verse.reference}</h3>
			</div>
		{/if}
		
		<div class="verse-text">
			{#if theme === 'minimal'}
				<span class="minimal-reference">{verse.reference}</span>
			{/if}
			<p class="text-content">{verse.text}</p>
		</div>

		{#if showActions && theme !== 'minimal'}
			<div class="verse-actions" in:fly={{ y: 20, duration: 200, delay: 100 }}>
				<button
					class="action-btn {isLiked ? 'liked' : ''}"
					on:click={toggleLike}
					title="Like this verse"
				>
					<Heart class="w-4 h-4" />
				</button>
				<button
					class="action-btn"
					on:click={shareVerse}
					title="Share this verse"
				>
					<Share2 class="w-4 h-4" />
				</button>
				<button
					class="action-btn {isCopied ? 'copied' : ''}"
					on:click={copyVerse}
					title="Copy verse text"
				>
					<Copy class="w-4 h-4" />
				</button>
			</div>
		{/if}
	</div>

	{#if theme === 'highlight'}
		<div class="verse-decoration">
			<Quote class="w-8 h-8 opacity-20" />
		</div>
	{/if}
</div>

<style>
	.bible-verse {
		position: relative;
		padding: 1.5rem;
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(20px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.3s ease;
		overflow: hidden;
	}

	.bible-verse:hover {
		transform: translateY(-2px);
		border-color: rgba(168, 85, 247, 0.3);
		box-shadow: 0 10px 30px rgba(168, 85, 247, 0.1);
	}

	.bible-verse.highlight {
		background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1));
		border-color: rgba(168, 85, 247, 0.3);
	}

	.bible-verse.minimal {
		padding: 1rem;
		background: transparent;
		border: none;
	}

	.bible-verse.minimal:hover {
		transform: none;
		box-shadow: none;
	}

	.verse-content {
		position: relative;
		z-index: 2;
	}

	.verse-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.verse-icon {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.75rem;
		background: linear-gradient(135deg, #a855f7, #3b82f6);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.verse-reference {
		font-size: 1.125rem;
		font-weight: 600;
		color: white;
		margin: 0;
	}

	.verse-text {
		margin-bottom: 1rem;
	}

	.minimal-reference {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #a855f7;
		margin-bottom: 0.5rem;
	}

	.text-content {
		font-size: 1.125rem;
		line-height: 1.7;
		color: #e2e8f0;
		margin: 0;
		font-style: italic;
	}

	.verse-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.action-btn {
		width: 2.5rem;
		height: 2.5rem;
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

	.action-btn.liked {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.3);
		color: #fca5a5;
	}

	.action-btn.copied {
		background: rgba(34, 197, 94, 0.2);
		border-color: rgba(34, 197, 94, 0.3);
		color: #86efac;
	}

	.verse-decoration {
		position: absolute;
		top: 1rem;
		right: 1rem;
		color: rgba(168, 85, 247, 0.3);
		z-index: 1;
	}

	/* Responsive design */
	@media (max-width: 640px) {
		.bible-verse {
			padding: 1rem;
		}

		.text-content {
			font-size: 1rem;
		}

		.verse-actions {
			justify-content: center;
		}
	}

	/* Animation for like button */
	.action-btn.liked {
		animation: heartBeat 0.3s ease-in-out;
	}

	@keyframes heartBeat {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.2);
		}
	}

	/* Glow effect for highlight theme */
	.bible-verse.highlight::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1));
		border-radius: 1rem;
		z-index: 1;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.bible-verse.highlight:hover::before {
		opacity: 1;
	}
</style> 