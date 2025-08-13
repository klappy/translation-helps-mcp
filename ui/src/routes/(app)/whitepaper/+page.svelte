<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let renderedHtml = '';

	// Simple markdown to HTML converter
	function markdownToHtml(markdown: string): string {
		return (
			markdown
				// Headers
				.replace(/^### (.*$)/gim, '<h3>$1</h3>')
				.replace(/^## (.*$)/gim, '<h2>$1</h2>')
				.replace(/^# (.*$)/gim, '<h1>$1</h1>')
				// Strong/bold text
				.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
				// Italic text
				.replace(/\*(.*?)\*/g, '<em>$1</em>')
				// Code blocks
				.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
				// Inline code
				.replace(/`([^`]+)`/g, '<code>$1</code>')
				// Lists (simple implementation)
				.replace(/^- (.*$)/gim, '<li>$1</li>')
				// Links
				.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
				// Horizontal rules
				.replace(/^---$/gim, '<hr>')
				// Line breaks to paragraphs
				.replace(/\n\n/g, '</p><p>')
				// Wrap content in paragraphs
				.replace(/^(.*)$/gim, function (match, content) {
					// Skip if already a tag
					if (content.match(/^<[^>]+>/)) return content;
					// Skip if empty
					if (content.trim() === '') return content;
					// Skip if part of list
					if (content.match(/^<li>/)) return content;
					return '<p>' + content + '</p>';
				})
				// Clean up extra paragraph tags around other elements
				.replace(/<p>(<h[1-6]>.*?<\/h[1-6]>)<\/p>/g, '$1')
				.replace(/<p>(<pre>.*?<\/pre>)<\/p>/g, '$1')
				.replace(/<p>(<hr>)<\/p>/g, '$1')
				.replace(/<p>(<li>.*?<\/li>)<\/p>/g, '<ul>$1</ul>')
				// Clean up nested lists
				.replace(/<\/ul>\s*<ul>/g, '')
				// Remove empty paragraphs
				.replace(/<p><\/p>/g, '')
		);
	}

	onMount(() => {
		renderedHtml = markdownToHtml(data.whitepaper);
	});
</script>

<svelte:head>
	<title>Whitepaper Preview - The Aqueduct</title>
	<meta
		name="description"
		content="Preview of The Aqueduct technical whitepaper: A Stateless RAG Architecture for Bible Translation. Get a sneak peek at the upcoming comprehensive technical documentation."
	/>
</svelte:head>

<!-- Main Content -->
<section class="relative min-h-screen">
	<!-- Animated Background -->
	<div class="fixed inset-0 overflow-hidden">
		<div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900"></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_70%)]"
		></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_70%)]"
		></div>
		<!-- Animated SVG paths -->
		<svg class="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
			<path
				d="M0,50 Q25,20 50,50 T100,50"
				stroke="rgba(59,130,246,0.1)"
				stroke-width="0.5"
				fill="none"
				opacity="0.6"
			>
				<animate
					attributeName="d"
					values="M0,50 Q25,20 50,50 T100,50;M0,50 Q25,80 50,50 T100,50;M0,50 Q25,20 50,50 T100,50"
					dur="20s"
					repeatCount="indefinite"
				/>
			</path>
			<path
				d="M0,30 Q50,10 100,30"
				stroke="rgba(168,85,247,0.1)"
				stroke-width="0.3"
				fill="none"
				opacity="0.4"
			>
				<animate
					attributeName="d"
					values="M0,30 Q50,10 100,30;M0,30 Q50,50 100,30;M0,30 Q50,10 100,30"
					dur="15s"
					repeatCount="indefinite"
				/>
			</path>
		</svg>
	</div>

	<!-- Content -->
	<div class="relative z-10 px-4 py-16 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-4xl">
			<!-- Header -->
			<div class="mb-16 text-center">
				<div
					class="mb-8 inline-flex animate-pulse items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-6 py-3 text-sm font-medium text-purple-300 backdrop-blur-xl"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
						/>
					</svg>
					Technical Preview • Coming August 2025 • Sneak Peek
				</div>
				<h1 class="mb-8 text-5xl font-bold text-white md:text-6xl">
					<span class="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
						The Aqueduct
					</span> Whitepaper Preview
				</h1>
				<p class="mx-auto max-w-3xl text-xl leading-relaxed text-gray-300 md:text-2xl">
					Get a sneak peek at our upcoming technical whitepaper on stateless RAG architecture for
					Bible translation workflows.
					<strong class="text-purple-300"
						>The full document with implementation guides is coming soon!</strong
					>
				</p>
			</div>

			<!-- Whitepaper Content -->
			<div
				class="rounded-3xl border border-purple-500/30 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl md:p-12"
			>
				{#if data.error}
					<div
						class="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center backdrop-blur-xl"
					>
						<div class="mb-2 text-red-300">⚠️ Error Loading Whitepaper Preview</div>
						<div class="text-gray-300">{data.error}</div>
					</div>
				{:else}
					<div class="whitepaper-content">
						{@html renderedHtml}
					</div>
				{/if}
			</div>

			<!-- Navigation -->
			<div class="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-between">
				<a
					href="/"
					class="inline-flex items-center rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-600/80 to-cyan-600/80 px-8 py-4 font-bold text-white shadow-lg backdrop-blur-xl transition-all hover:from-blue-500/90 hover:to-cyan-500/90 hover:shadow-xl"
				>
					<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back to Home
				</a>
				<div class="flex gap-4">
					<a
						href="/changelog"
						class="inline-flex items-center rounded-xl border border-gray-500/30 bg-gray-500/10 px-6 py-4 font-medium text-gray-300 backdrop-blur-xl transition-all hover:bg-gray-500/20 hover:text-white"
					>
						<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						Changelog
					</a>
					<a
						href="/mcp-tools"
						class="inline-flex items-center rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-4 font-medium text-green-300 backdrop-blur-xl transition-all hover:bg-green-500/20 hover:text-white"
					>
						<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
							/>
						</svg>
						API Reference
					</a>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	:global(.whitepaper-content h1) {
		color: white;
		font-size: 2.25rem;
		font-weight: bold;
		margin-bottom: 2rem;
		background: linear-gradient(to right, #a855f7, #ec4899);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
	}

	:global(.whitepaper-content h2) {
		color: #c084fc;
		font-size: 1.5rem;
		font-weight: bold;
		margin-bottom: 1.5rem;
		margin-top: 3rem;
	}

	:global(.whitepaper-content h3) {
		color: white;
		font-size: 1.25rem;
		font-weight: bold;
		margin-bottom: 1rem;
		margin-top: 2rem;
	}

	:global(.whitepaper-content h4) {
		color: #d1d5db;
		font-size: 1.125rem;
		font-weight: bold;
		margin-bottom: 0.75rem;
		margin-top: 1.5rem;
	}

	:global(.whitepaper-content p) {
		color: #d1d5db;
		margin-bottom: 1rem;
		line-height: 1.625;
	}

	:global(.whitepaper-content ul) {
		margin-bottom: 1.5rem;
	}

	:global(.whitepaper-content li) {
		color: #d1d5db;
		margin-bottom: 0.5rem;
		margin-left: 1rem;
		list-style-type: disc;
		list-style-position: inside;
	}

	:global(.whitepaper-content strong) {
		font-weight: bold;
		color: #c084fc;
	}

	:global(.whitepaper-content em) {
		font-style: italic;
		color: #e5e7eb;
	}

	:global(.whitepaper-content code) {
		background-color: rgba(31, 41, 55, 0.5);
		color: #86efac;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid rgba(168, 85, 247, 0.3);
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
	}

	:global(.whitepaper-content pre) {
		background-color: rgba(31, 41, 55, 0.5);
		border-radius: 0.5rem;
		padding: 1rem;
		border: 1px solid rgba(168, 85, 247, 0.3);
		backdrop-filter: blur(4px);
		overflow-x: auto;
		margin: 1rem 0;
	}

	:global(.whitepaper-content pre code) {
		color: #86efac;
		font-size: 0.875rem;
		background: transparent;
		padding: 0;
		border: none;
		font-family: 'Courier New', monospace;
	}

	:global(.whitepaper-content a) {
		color: #a855f7;
		text-decoration: underline;
		transition: color 0.2s;
	}

	:global(.whitepaper-content a:hover) {
		color: #c084fc;
	}

	:global(.whitepaper-content hr) {
		border-color: rgba(168, 85, 247, 0.3);
		margin: 2rem 0;
	}
</style>
