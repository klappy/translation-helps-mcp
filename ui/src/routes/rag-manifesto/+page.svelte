<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import CostCalculator from './components/CostCalculator.svelte';
	import PerformanceChart from './components/PerformanceChart.svelte';
	import ComparisonTable from './components/ComparisonTable.svelte';
	import LiveDemo from './components/LiveDemo.svelte';
	import TokenVisualizer from './components/TokenVisualizer.svelte';

	let scrollY = 0;
	let heroRef: HTMLElement;
	let problemRef: HTMLElement;
	let solutionRef: HTMLElement;
	let proofRef: HTMLElement;

	let monthlyRagCost = 0;
	let ragCostInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		// Animate the RAG cost counter
		ragCostInterval = setInterval(() => {
			if (monthlyRagCost < 800) {
				monthlyRagCost += 23;
			}
		}, 100);

		return () => {
			clearInterval(ragCostInterval);
		};
	});
</script>

<svelte:window bind:scrollY />

<div class="min-h-screen bg-gradient-to-b from-purple-950 via-gray-900 to-black text-white">
	<!-- Hero Section -->
	<section
		bind:this={heroRef}
		class="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
	>
		<div class="bg-grid-pattern absolute inset-0 opacity-10"></div>

		<div class="relative z-10 mx-auto max-w-6xl text-center">
			<h1
				class="mb-6 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-5xl font-bold text-transparent md:text-7xl"
			>
				Your Bible Data is Already Outdated
			</h1>

			<p class="mb-8 text-2xl text-gray-300 md:text-3xl">
				Because Translation Resources Change Every Day
			</p>

			<div
				class="mb-8 inline-flex items-center gap-2 rounded-full bg-green-500/20 px-6 py-3 text-lg font-bold text-green-400"
			>
				<span>🎉</span>
				<span>Open Source • No API Keys • $7-15/mo on Netlify/Cloudflare</span>
			</div>

			<div class="mb-12">
				<TokenVisualizer />
			</div>

			<a
				href="#problem"
				class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 text-lg font-semibold transition-transform hover:scale-105"
			>
				See the 100x Difference
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 14l-7 7m0 0l-7-7m7 7V3"
					/>
				</svg>
			</a>
		</div>

		<div class="absolute bottom-10 left-1/2 -translate-x-1/2 transform animate-bounce">
			<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 14l-7 7m0 0l-7-7m7 7V3"
				/>
			</svg>
		</div>
	</section>

	<!-- Problem Section -->
	<section id="problem" bind:this={problemRef} class="px-4 py-20">
		<div class="mx-auto max-w-6xl">
			<div class="mb-16 text-center">
				<h2 class="mb-4 text-4xl font-bold md:text-5xl">The RAG Tax You're Paying</h2>
				<div class="font-mono text-6xl text-red-500">
					${monthlyRagCost.toLocaleString()}/month
				</div>
				<p class="mt-2 text-gray-400">Average cost for a typical Bible app with RAG</p>
			</div>

			<div class="grid items-center gap-12 md:grid-cols-2">
				<div>
					<h3 class="mb-6 text-2xl font-bold text-red-400">
						Why Traditional Bible RAG Approaches Fail
					</h3>
					<ul class="space-y-4">
						<li class="flex items-start gap-3">
							<span class="mt-1 text-red-500">❌</span>
							<div>
								<strong>Stale Data in Days:</strong> Bible scholars update resources daily - your RAG
								is already wrong
							</div>
						</li>
						<li class="flex items-start gap-3">
							<span class="mt-1 text-red-500">❌</span>
							<div>
								<strong>Sync Failures:</strong> Even the smartest teams can't keep databases in sync
								with source content
							</div>
						</li>
						<li class="flex items-start gap-3">
							<span class="mt-1 text-red-500">❌</span>
							<div>
								<strong>Vector Database Costs:</strong> $100-500/month for embeddings that are outdated
								tomorrow
							</div>
						</li>
						<li class="flex items-start gap-3">
							<span class="mt-1 text-red-500">❌</span>
							<div>
								<strong>REST APIs Don't Work:</strong> Traditional APIs return data formats that LLMs
								can't use effectively
							</div>
						</li>
						<li class="flex items-start gap-3">
							<span class="mt-1 text-red-500">❌</span>
							<div>
								<strong>Maintenance Never Ends:</strong> Update scripts, sync jobs, re-embeddings - forever
							</div>
						</li>
					</ul>
				</div>

				<div class="rounded-2xl border border-red-500/20 bg-gray-800 p-8">
					<h4 class="mb-4 text-center text-xl font-bold">The Traditional RAG Sync Problem</h4>
					<div class="space-y-4">
						<div class="rounded-lg bg-gray-900 p-4 font-mono text-sm">
							<div class="text-red-400">// Monday: Bible scholars update Greek text</div>
							<div>// Tuesday: Your sync job hasn't run yet ⚠️</div>
							<div>// Wednesday: SQL database finally updates</div>
							<div>// Thursday: Vector embeddings still outdated ❌</div>
							<div>// Friday: Your RAG returns old translation data 💥</div>
						</div>
						<div class="text-center text-gray-400">
							Result: <span class="font-bold text-red-500"
								>Your RAG's "knowledge" is already stale</span
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Solution Section -->
	<section
		id="solution"
		bind:this={solutionRef}
		class="bg-gradient-to-b from-black to-purple-950 px-4 py-20"
	>
		<div class="mx-auto max-w-6xl">
			<div class="mb-16 text-center">
				<h2
					class="mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
				>
					Always Fresh. Never Wrong.
				</h2>
				<p class="text-xl text-gray-300">A stateless RAG that queries the source in real-time.</p>
				<p class="mt-4 text-lg text-gray-400">
					Replace your traditional RAG infrastructure. Keep your LLM (GPT-4, Claude, etc).
				</p>
			</div>

			<div class="mb-16 grid gap-8 md:grid-cols-3">
				<div
					class="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-blue-500/10 p-8"
				>
					<div class="mb-4 text-5xl">🔄</div>
					<h3 class="mb-2 text-xl font-bold">Always Current</h3>
					<p class="text-gray-400">
						Direct access to source content. When scholars update, you get it instantly.
					</p>
				</div>

				<div
					class="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-blue-500/10 p-8"
				>
					<div class="mb-4 text-5xl">🤖</div>
					<h3 class="mb-2 text-xl font-bold">LLM-Optimized</h3>
					<p class="text-gray-400">
						Returns exactly what AI needs. Not JSON blobs your LLM can't parse.
					</p>
				</div>

				<div
					class="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-blue-500/10 p-8"
				>
					<div class="mb-4 text-5xl">🛡️</div>
					<h3 class="mb-2 text-xl font-bold">Zero Maintenance</h3>
					<p class="text-gray-400">No sync jobs. No update scripts. No re-embeddings. Ever.</p>
				</div>
			</div>

			<ComparisonTable />

			<div class="mt-16">
				<CostCalculator />
			</div>

			<!-- Real World Evidence Section -->
			<div class="mt-20 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-8">
				<h3 class="mb-6 text-center text-2xl font-bold text-yellow-400">
					🚨 The Dirty Secret of Bible AI RAG Stacks
				</h3>
				<div class="mx-auto max-w-3xl space-y-4 text-lg">
					<p class="text-gray-300">
						<strong class="text-yellow-400">Scenario 1:</strong> Teams spend months building RAG
						systems. They're inconsistent, expensive, and
						<span class="font-bold text-yellow-400">still outdated</span>
						because Bible resources are revised daily.
					</p>
					<p class="text-gray-300">
						<strong class="text-yellow-400">Scenario 2:</strong> Other teams parse everything into
						SQL databases for faster lookups. But keeping them synced with content creators?
						<span class="font-bold text-red-400">Even the best teams fail.</span>
					</p>
					<p class="text-gray-300">
						<strong class="text-yellow-400">Scenario 3:</strong> Hybrid approaches that combine SQL
						+ vectors + caching layers? Now you're maintaining THREE systems that all drift out of
						sync at different rates.
						<span class="font-bold text-red-400"
							>Triple the complexity, triple the failure points.</span
						>
					</p>
					<p class="text-gray-300">
						<strong class="text-yellow-400">The Reality:</strong> We've never seen ANY
						implementation - whether RAG or database - that actually stays current with Bible
						translation resources.
						<span class="italic">If it has been done, please share!</span>
					</p>
					<div class="mt-6 rounded-lg bg-black/30 p-4 text-center">
						<p class="text-xl font-bold text-green-400">
							This is RAG done right: Real-time, Always-fresh, Guaranteed.
						</p>
						<p class="mt-2 text-gray-400">
							A stateless RAG that fetches directly from the source. No sync needed.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Proof Section -->
	<section id="proof" bind:this={proofRef} class="px-4 py-20">
		<div class="mx-auto max-w-6xl">
			<div class="mb-16 text-center">
				<h2 class="mb-4 text-4xl font-bold md:text-5xl">See Real-Time Updates in Action</h2>
				<p class="text-xl text-gray-300">This data was updated by scholars this morning</p>
			</div>

			<LiveDemo />

			<div class="mt-16">
				<PerformanceChart />
			</div>
		</div>
	</section>

	<!-- Adoption Section -->
	<section class="bg-gradient-to-b from-purple-950 to-black px-4 py-20">
		<div class="mx-auto max-w-4xl text-center">
			<h2 class="mb-8 text-4xl font-bold md:text-5xl">Start Saving in 3 Minutes</h2>

			<div class="mb-12 grid gap-8 md:grid-cols-3">
				<div class="rounded-xl bg-gray-800 p-6">
					<div class="mb-2 text-3xl font-bold text-green-400">1</div>
					<h3 class="mb-2 text-xl font-bold">Get Your API Key</h3>
					<p class="text-gray-400">Sign up and get instant access</p>
					<p class="mt-2 text-sm text-green-400">(Just kidding, no API key needed)</p>
				</div>

				<div class="rounded-xl bg-gray-800 p-6">
					<div class="mb-2 text-3xl font-bold text-green-400">2</div>
					<h3 class="mb-2 text-xl font-bold">Deploy to Netlify/Cloudflare</h3>
					<p class="text-gray-400">Or run locally. Your choice.</p>
				</div>

				<div class="rounded-xl bg-gray-800 p-6">
					<div class="mb-2 text-3xl font-bold text-green-400">3</div>
					<h3 class="mb-2 text-xl font-bold">Never Sync Again</h3>
					<p class="text-gray-400">Delete your update scripts forever</p>
				</div>
			</div>

			<div class="inline-block rounded-2xl bg-gradient-to-r from-green-500 to-blue-500 p-1">
				<a
					href="/"
					class="block rounded-2xl bg-gray-900 px-12 py-4 text-xl font-bold transition-colors hover:bg-gray-800"
				>
					Get Started →
				</a>
			</div>

			<p class="mt-8 text-gray-400">
				Join teams who finally have <span class="font-bold text-green-400">accurate Bible data</span
				>
				without the maintenance nightmare
			</p>

			<div class="mt-8 rounded-lg bg-blue-500/10 p-4 text-center">
				<p class="text-sm text-blue-300">
					🤝 Open source & no API keys needed • Deploy on your existing infrastructure
				</p>
				<p class="mt-2 text-xs text-gray-400">
					Need help with custom implementation? We'll guide you through integration with your Bible
					translation product.
				</p>
			</div>
		</div>
	</section>
</div>

<style>
	.bg-grid-pattern {
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
		background-size: 50px 50px;
	}
</style>
