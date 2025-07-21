<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	let lookupsPerDay = 1000;
	let versePercent = 70;
	let chapterPercent = 20;
	let bookPercent = 10;

	// Infrastructure costs (monthly)
	const ragInfrastructureCost = 400; // Average of range
	const apiServiceCost = 10; // Netlify/Cloudflare serverless functions

	// Token costs per lookup (using GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output)
	const inputPricePerMillion = 0.15;
	const outputPricePerMillion = 0.6;

	// Traditional RAG tokens (includes vector search overhead)
	const ragTokensPerVerse = 750; // ~750 tokens for chunked context
	const ragTokensPerChapter = 7500; // ~10x verse
	const ragTokensPerBook = 750000; // Entire book context

	// Our API tokens (precise extraction)
	const apiTokensPerVerse = 10; // Just the verse
	const apiTokensPerChapter = 100; // Just the chapter
	const apiTokensPerBook = 10000; // Just the book

	// Output tokens (LLM response - same for both)
	const outputTokensPerLookup = 50;

	$: monthlyLookups = lookupsPerDay * 30;
	$: verseLookups = (monthlyLookups * versePercent) / 100;
	$: chapterLookups = (monthlyLookups * chapterPercent) / 100;
	$: bookLookups = (monthlyLookups * bookPercent) / 100;

	// Calculate LLM costs
	$: traditionalLLMCost = calculateLLMCost(
		verseLookups * ragTokensPerVerse +
			chapterLookups * ragTokensPerChapter +
			bookLookups * ragTokensPerBook,
		monthlyLookups * outputTokensPerLookup
	);

	$: apiLLMCost = calculateLLMCost(
		verseLookups * apiTokensPerVerse +
			chapterLookups * apiTokensPerChapter +
			bookLookups * apiTokensPerBook,
		monthlyLookups * outputTokensPerLookup
	);

	// Total monthly costs
	$: traditionalTotalCost = ragInfrastructureCost + traditionalLLMCost;
	$: apiTotalCost = apiServiceCost + apiLLMCost;
	$: monthlySavings = traditionalTotalCost - apiTotalCost;
	$: yearlySavings = monthlySavings * 12;
	$: savingsPercent = Math.round((monthlySavings / traditionalTotalCost) * 100);

	function calculateLLMCost(inputTokens: number, outputTokens: number): number {
		const inputCost = (inputTokens / 1_000_000) * inputPricePerMillion;
		const outputCost = (outputTokens / 1_000_000) * outputPricePerMillion;
		return inputCost + outputCost;
	}

	// Animated values
	const animatedSavings = tweened(0, { duration: 1000, easing: cubicOut });
	$: animatedSavings.set(yearlySavings);

	// Ensure percentages always add up to 100
	$: {
		const total = versePercent + chapterPercent + bookPercent;
		if (total !== 100) {
			const diff = 100 - total;
			bookPercent = Math.max(0, Math.min(100, bookPercent + diff));
		}
	}
</script>

<div class="rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-8">
	<h3 class="mb-6 text-2xl font-bold">Calculate Your Savings</h3>

	<div class="space-y-6">
		<!-- Lookups per day -->
		<div>
			<label for="lookups-per-day" class="mb-2 block text-sm font-medium">
				Daily API Lookups: <span class="text-green-400">{lookupsPerDay.toLocaleString()}</span>
			</label>
			<input
				id="lookups-per-day"
				type="range"
				bind:value={lookupsPerDay}
				min="100"
				max="10000"
				step="100"
				class="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
			/>
		</div>

		<!-- Usage distribution -->
		<div>
			<h4 class="mb-2 block text-sm font-medium">Usage Distribution</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm">Verse lookups: {versePercent}%</span>
					<input
						type="range"
						bind:value={versePercent}
						min="0"
						max="100"
						step="5"
						class="slider h-2 w-48 cursor-pointer appearance-none rounded-lg bg-gray-700"
					/>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm">Chapter lookups: {chapterPercent}%</span>
					<input
						type="range"
						bind:value={chapterPercent}
						min="0"
						max="100"
						step="5"
						class="slider h-2 w-48 cursor-pointer appearance-none rounded-lg bg-gray-700"
					/>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm">Book lookups: {bookPercent}%</span>
					<input
						type="range"
						bind:value={bookPercent}
						min="0"
						max="100"
						step="5"
						class="slider h-2 w-48 cursor-pointer appearance-none rounded-lg bg-gray-700"
					/>
				</div>
			</div>
		</div>

		<!-- Cost breakdown -->
		<div class="space-y-4 rounded-lg bg-black/30 p-6">
			<h4 class="text-lg font-bold">Monthly Cost Breakdown</h4>

			<div class="space-y-3">
				<!-- Traditional RAG Stack -->
				<div class="rounded-lg bg-red-500/10 p-4">
					<div class="mb-2 font-medium text-red-400">Traditional Copy-and-Sync RAG</div>
					<div class="space-y-1 text-sm">
						<div class="flex justify-between">
							<span>Infrastructure (DB, Vector Store, Sync)</span>
							<span class="font-mono">${ragInfrastructureCost.toFixed(2)}</span>
						</div>
						<div class="flex justify-between">
							<span>LLM Costs ({(monthlyLookups / 1000).toFixed(0)}K lookups)</span>
							<span class="font-mono">${traditionalLLMCost.toFixed(2)}</span>
						</div>
						<div class="flex justify-between border-t border-red-500/20 pt-1 font-bold">
							<span>Total</span>
							<span class="font-mono">${traditionalTotalCost.toFixed(2)}/mo</span>
						</div>
					</div>
				</div>

				<!-- Our API -->
				<div class="rounded-lg bg-green-500/10 p-4">
					<div class="mb-2 font-medium text-green-400">Our Stateless RAG + Your LLM</div>
					<div class="space-y-1 text-sm">
						<div class="flex justify-between">
							<span>Serverless Functions (Netlify/Cloudflare)</span>
							<span class="font-mono">${apiServiceCost.toFixed(2)}</span>
						</div>
						<div class="flex justify-between">
							<span>LLM Costs (same lookups, fewer tokens)</span>
							<span class="font-mono">${apiLLMCost.toFixed(2)}</span>
						</div>
						<div class="flex justify-between border-t border-green-500/20 pt-1 font-bold">
							<span>Total</span>
							<span class="font-mono">${apiTotalCost.toFixed(2)}/mo</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Savings highlight -->
		<div class="rounded-2xl bg-gradient-to-r from-green-500/20 to-blue-500/20 p-6 text-center">
			<div class="text-sm text-gray-400">Your Annual Savings</div>
			<div class="text-4xl font-bold text-green-400">
				${Math.round($animatedSavings).toLocaleString()}
			</div>
			<div class="mt-2 text-sm text-gray-400">
				That's {savingsPercent}% less than traditional RAG
			</div>
		</div>

		<div class="text-center text-xs text-gray-500">
			* LLM costs calculated using GPT-4o-mini pricing. Infrastructure costs based on typical
			AWS/Pinecone setup.
		</div>
	</div>
</div>

<style>
	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		background: #10b981;
		cursor: pointer;
		border-radius: 50%;
	}
	.slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: #10b981;
		cursor: pointer;
		border-radius: 50%;
		border: none;
	}
</style>
