<script lang="ts">
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	let chartRef: HTMLDivElement;
	let visible = false;

	const verseTime = tweened(0, { duration: 1000, easing: cubicOut });
	const chapterTime = tweened(0, { duration: 1500, easing: cubicOut });
	const bookTime = tweened(0, { duration: 2000, easing: cubicOut });

	onMount(() => {
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && !visible) {
					visible = true;
					animateChart();
				}
			});
		});

		if (chartRef) observer.observe(chartRef);

		return () => observer.disconnect();
	});

	function animateChart() {
		verseTime.set(1);
		chapterTime.set(3.5);
		bookTime.set(8);
	}

	const performanceData = [
		{
			scope: 'Verse',
			tokens: '~12K',
			ttft: '300-500ms',
			totalTime: '~1s',
			color: 'text-green-400',
			bgColor: 'bg-green-400'
		},
		{
			scope: 'Chapter',
			tokens: '~250K',
			ttft: '1.5-2.5s',
			totalTime: '3-5s',
			color: 'text-yellow-400',
			bgColor: 'bg-yellow-400'
		},
		{
			scope: 'Book',
			tokens: '~750K',
			ttft: '4-6s',
			totalTime: '7-10s',
			color: 'text-red-400',
			bgColor: 'bg-red-400'
		}
	];
</script>

<div class="rounded-2xl bg-gray-800/50 p-8 backdrop-blur">
	<h3 class="mb-6 text-center text-2xl font-bold">Performance Impact by Context Size</h3>

	<!-- Visual bar chart -->
	<div class="mb-8" bind:this={chartRef}>
		<div class="space-y-4">
			<div class="flex items-center gap-4">
				<div class="w-20 text-sm text-gray-400">Verse</div>
				<div class="relative h-8 flex-1 overflow-hidden rounded-full bg-gray-700">
					<div
						class="absolute inset-y-0 left-0 flex items-center justify-end rounded-full bg-green-400 pr-2"
						style="width: {$verseTime * 10}%"
					>
						<span class="text-xs font-bold text-black">1s</span>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-4">
				<div class="w-20 text-sm text-gray-400">Chapter</div>
				<div class="relative h-8 flex-1 overflow-hidden rounded-full bg-gray-700">
					<div
						class="absolute inset-y-0 left-0 flex items-center justify-end rounded-full bg-yellow-400 pr-2"
						style="width: {$chapterTime * 10}%"
					>
						<span class="text-xs font-bold text-black">3.5s</span>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-4">
				<div class="w-20 text-sm text-gray-400">Book</div>
				<div class="relative h-8 flex-1 overflow-hidden rounded-full bg-gray-700">
					<div
						class="absolute inset-y-0 left-0 flex items-center justify-end rounded-full bg-red-400 pr-2"
						style="width: {$bookTime * 10}%"
					>
						<span class="text-xs font-bold text-black">8s</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Detailed breakdown table -->
	<div class="overflow-x-auto">
		<table class="w-full">
			<thead>
				<tr class="border-b border-gray-700">
					<th class="px-4 py-2 text-left text-sm font-medium text-gray-400">Scope</th>
					<th class="px-4 py-2 text-center text-sm font-medium text-gray-400">Tokens</th>
					<th class="px-4 py-2 text-center text-sm font-medium text-gray-400">TTFT</th>
					<th class="px-4 py-2 text-center text-sm font-medium text-gray-400">Total Time</th>
				</tr>
			</thead>
			<tbody>
				{#each performanceData as item}
					<tr class="border-b border-gray-700/50">
						<td class="px-4 py-3 font-medium">{item.scope}</td>
						<td class="px-4 py-3 text-center {item.color} font-mono">{item.tokens}</td>
						<td class="px-4 py-3 text-center text-gray-300">{item.ttft}</td>
						<td class="px-4 py-3 text-center">
							<span class="px-2 py-1 {item.bgColor}/20 {item.color} rounded text-sm">
								{item.totalTime}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="mt-6 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
		<p class="text-sm text-blue-300">
			<strong>💡 Pro Tip:</strong> Verse-level queries give you real-time AI responses. Chapter-level
			adds noticeable delay. Book-level makes users wait.
		</p>
	</div>
</div>
