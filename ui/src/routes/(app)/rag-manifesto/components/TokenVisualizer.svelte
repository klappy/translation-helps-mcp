<script lang="ts">
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	const verseTokens = tweened(0, { duration: 1000, easing: cubicOut });
	const chapterTokens = tweened(0, { duration: 2000, easing: cubicOut });
	const bookTokens = tweened(0, { duration: 3000, easing: cubicOut });

	let showComparison = false;

	onMount(() => {
		setTimeout(() => {
			verseTokens.set(12000);
			setTimeout(() => {
				chapterTokens.set(250000);
				setTimeout(() => {
					bookTokens.set(750000);
					showComparison = true;
				}, 500);
			}, 500);
		}, 500);
	});
</script>

<div class="relative">
	<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
		<div class="rounded-xl bg-gray-800/50 p-6 text-center backdrop-blur">
			<div class="mb-2 text-sm text-gray-400">Verse Lookup</div>
			<div class="font-mono text-3xl font-bold text-green-400">
				{Math.floor($verseTokens).toLocaleString()}
			</div>
			<div class="mt-1 text-xs text-gray-500">tokens</div>
		</div>

		<div class="rounded-xl bg-gray-800/50 p-6 text-center backdrop-blur">
			<div class="mb-2 text-sm text-gray-400">Chapter Lookup</div>
			<div class="font-mono text-3xl font-bold text-yellow-400">
				{Math.floor($chapterTokens).toLocaleString()}
			</div>
			<div class="mt-1 text-xs text-gray-500">tokens</div>
		</div>

		<div class="rounded-xl bg-gray-800/50 p-6 text-center backdrop-blur">
			<div class="mb-2 text-sm text-gray-400">Book Lookup</div>
			<div class="font-mono text-3xl font-bold text-red-400">
				{Math.floor($bookTokens).toLocaleString()}
			</div>
			<div class="mt-1 text-xs text-gray-500">tokens</div>
		</div>
	</div>

	{#if showComparison}
		<div class="animate-pulse text-center text-sm text-gray-400">
			That's <span class="font-bold text-red-400">62x more tokens</span> than you need for most queries
		</div>
	{/if}

	<!-- Token waste visualization -->
	<div
		class="absolute -top-20 -left-20 h-40 w-40 animate-pulse rounded-full bg-red-500/10 blur-3xl"
	></div>
	<div
		class="absolute -right-20 -bottom-20 h-60 w-60 animate-pulse rounded-full bg-purple-500/10 blur-3xl delay-300"
	></div>
</div>
