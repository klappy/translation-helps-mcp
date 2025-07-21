<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let renderedHtml = '';

	// Simple markdown to HTML converter for changelog
	function markdownToHtml(markdown: string): string {
		return (
			markdown
				// Headers
				.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mb-4 mt-8">$1</h3>')
				.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-blue-300 mb-6 mt-12">$1</h2>')
				.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold text-white mb-8">$1</h1>')
				// Bold text
				.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-300">$1</strong>')
				// Code blocks
				.replace(/```[\s\S]*?```/g, (match) => {
					const code = match.replace(/```/g, '').trim();
					return `<pre class="bg-gray-800/50 rounded-lg p-4 border border-blue-500/30 backdrop-blur-sm overflow-x-auto my-4"><code class="text-green-300 text-sm">${code}</code></pre>`;
				})
				// Inline code
				.replace(
					/`([^`]+)`/g,
					'<code class="bg-gray-800/50 text-green-300 px-2 py-1 rounded border border-blue-500/30">$1</code>'
				)
				// Links
				.replace(
					/\[([^\]]+)\]\(([^)]+)\)/g,
					'<a href="$2" class="text-blue-400 hover:text-blue-300 underline transition-colors">$1</a>'
				)
				// Lists
				.replace(/^- (.*$)/gim, '<li class="text-gray-300 mb-2">• $1</li>')
				.replace(/^  - (.*$)/gim, '<li class="text-gray-400 mb-1 ml-4">◦ $1</li>')
				// Horizontal rules
				.replace(/^---$/gim, '<hr class="border-blue-500/30 my-8">')
				// Line breaks
				.replace(/\n\n/g, '</p><p class="text-gray-300 mb-4 leading-relaxed">')
				.replace(/\n/g, '<br>')
		);
	}

	onMount(() => {
		renderedHtml = markdownToHtml(data.changelog);
	});
</script>

<svelte:head>
	<title>Changelog - The Aqueduct</title>
	<meta
		name="description"
		content="Complete version history and changelog for The Aqueduct translation helps API. Track all features, improvements, and fixes."
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
					class="mb-8 inline-flex animate-pulse items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-medium text-blue-300 backdrop-blur-xl"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					Version History • Complete Development Log
				</div>
				<h1 class="mb-8 text-5xl font-bold text-white md:text-6xl">
					<span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
						The Aqueduct
					</span> Changelog
				</h1>
				<p class="mx-auto max-w-3xl text-xl leading-relaxed text-gray-300 md:text-2xl">
					Track every feature, improvement, and breakthrough in our journey to build the ultimate
					Bible translation API.
					<strong class="text-blue-300">All changes are documented here</strong> with full transparency.
				</p>
			</div>

			<!-- Changelog Content -->
			<div
				class="rounded-3xl border border-blue-500/30 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl md:p-12"
			>
				{#if data.error}
					<div
						class="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center backdrop-blur-xl"
					>
						<div class="mb-2 text-red-300">⚠️ Error Loading Changelog</div>
						<div class="text-gray-300">{data.error}</div>
					</div>
				{:else}
					<div class="changelog-content">
						{@html renderedHtml}
					</div>
				{/if}
			</div>

			<!-- Back Navigation -->
			<div class="mt-12 text-center">
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
			</div>
		</div>
	</div>
</section>

<style>
	:global(.changelog-content h1) {
		@apply mb-8 text-4xl font-bold text-white;
	}

	:global(.changelog-content h2) {
		@apply mt-12 mb-6 text-2xl font-bold text-blue-300;
	}

	:global(.changelog-content h3) {
		@apply mt-8 mb-4 text-xl font-bold text-white;
	}

	:global(.changelog-content h4) {
		@apply mt-6 mb-3 text-lg font-bold text-gray-300;
	}

	:global(.changelog-content p) {
		@apply mb-4 leading-relaxed text-gray-300;
	}

	:global(.changelog-content ul) {
		@apply mb-6;
	}

	:global(.changelog-content li) {
		@apply mb-2 ml-4 text-gray-300;
	}

	:global(.changelog-content strong) {
		@apply font-bold text-blue-300;
	}

	:global(.changelog-content code) {
		@apply rounded border border-blue-500/30 bg-gray-800/50 px-2 py-1 text-green-300;
	}

	:global(.changelog-content pre) {
		@apply my-4 overflow-x-auto rounded-lg border border-blue-500/30 bg-gray-800/50 p-4 backdrop-blur-sm;
	}

	:global(.changelog-content pre code) {
		@apply border-0 bg-transparent px-0 py-0 text-sm text-green-300;
	}

	:global(.changelog-content a) {
		@apply text-blue-400 underline transition-colors hover:text-blue-300;
	}

	:global(.changelog-content hr) {
		@apply my-8 border-blue-500/30;
	}
</style>
