<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	let visible = false;

	onMount(() => {
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					visible = true;
				}
			});
		});

		const element = document.querySelector('#comparison-table');
		if (element) observer.observe(element);

		return () => observer.disconnect();
	});

	// Infrastructure costs (what we're replacing)
	const infrastructureItems = [
		{
			name: 'Database Hosting',
			traditional: '$25–150',
			ours: '$0',
			saving: '100%'
		},
		{
			name: 'Vector Store (Pinecone/Weaviate)',
			traditional: '$100–500',
			ours: '$0',
			saving: '100%'
		},
		{
			name: 'Embedding Pipeline',
			traditional: '$5–50',
			ours: '$0',
			saving: '100%'
		},
		{
			name: 'Sync Jobs & DevOps',
			traditional: '$20–100',
			ours: '$0',
			saving: '100%'
		},
		{
			name: 'API/Function Layer',
			traditional: '$10–25',
			ours: '$7–15',
			saving: '85%'
		}
	];

	// LLM costs (users pay this separately)
	const llmCosts = {
		traditional: {
			tokens: '~750K per book lookup',
			monthlyCost: '$100–500'
		},
		ours: {
			tokens: '~10K per book lookup',
			monthlyCost: '$1.50–8'
		}
	};
</script>

<div id="comparison-table" class="overflow-x-auto">
	{#if visible}
		<div class="rounded-2xl bg-gray-800/50 p-8 backdrop-blur" in:fade={{ duration: 600 }}>
			<h3 class="mb-6 text-center text-2xl font-bold">Real Cost Breakdown</h3>

			<!-- Infrastructure Costs Section -->
			<div class="mb-8">
				<h4 class="mb-4 text-lg font-bold text-blue-400">
					RAG Infrastructure Costs (What We Replace)
				</h4>
				<div class="space-y-3">
					{#each infrastructureItems as item, i}
						<div
							class="grid grid-cols-4 items-center gap-4 rounded-lg p-3 transition-colors hover:bg-gray-700/30"
							in:fly={{ y: 20, delay: i * 80, duration: 500 }}
						>
							<div class="text-sm">{item.name}</div>
							<div class="font-mono text-sm text-red-400">{item.traditional}</div>
							<div class="font-mono text-sm text-green-400">{item.ours}</div>
							<div class="text-right">
								<span class="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
									-{item.saving}
								</span>
							</div>
						</div>
					{/each}

					<div class="border-t border-gray-700 pt-3">
						<div class="grid grid-cols-4 items-center gap-4 font-bold">
							<div>Infrastructure Total</div>
							<div class="font-mono text-red-500">$160–$825/mo</div>
							<div class="font-mono text-green-500">$7–$15/mo*</div>
							<div class="text-right">
								<span class="rounded-full bg-green-500/30 px-3 py-1 text-sm text-green-400">
									-95% avg
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- LLM Costs Section -->
			<div class="rounded-lg bg-yellow-500/10 p-6">
				<h4 class="mb-4 text-lg font-bold text-yellow-400">LLM Costs (You Pay Your Provider)</h4>
				<div class="space-y-4">
					<div class="grid grid-cols-3 gap-4 text-sm">
						<div></div>
						<div class="text-center font-medium text-gray-400">Traditional Copy-and-Sync RAG</div>
						<div class="text-center font-medium text-gray-400">Our Stateless RAG</div>
					</div>
					<div class="grid grid-cols-3 gap-4">
						<div class="text-sm">Tokens per lookup</div>
						<div class="text-center font-mono text-red-400">{llmCosts.traditional.tokens}</div>
						<div class="text-center font-mono text-green-400">{llmCosts.ours.tokens}</div>
					</div>
					<div class="grid grid-cols-3 gap-4">
						<div class="text-sm">Monthly LLM cost*</div>
						<div class="text-center font-mono text-red-400">{llmCosts.traditional.monthlyCost}</div>
						<div class="text-center font-mono text-green-400">{llmCosts.ours.monthlyCost}</div>
					</div>
				</div>
				<p class="mt-4 text-xs text-gray-400">
					* Based on 1M lookups/month using GPT-4o-mini. You use your own API key.
				</p>
			</div>

			<!-- Total Costs -->
			<div class="mt-6 rounded-lg bg-gray-900 p-4">
				<div class="grid grid-cols-4 items-center gap-4 text-lg font-bold">
					<div>Total Stack Cost</div>
					<div class="font-mono text-red-500">$260–$1,325/mo</div>
					<div class="font-mono text-green-500">$8.50–$23/mo</div>
					<div class="text-right">
						<span class="rounded-full bg-green-500/30 px-3 py-2 text-sm text-green-400">
							-97% total
						</span>
					</div>
				</div>
			</div>

			<div class="mt-6 text-center text-sm text-gray-400">
				💡 This is still RAG - just done right. Stateless, real-time, always fresh.
			</div>
			<div class="mt-2 text-center text-xs text-gray-500">
				* Runs on Cloudflare Workers. Yes, you could self-host for free, but why have your $200k/yr
				developer
				<br />spend weeks figuring that out to save $10/month?
			</div>
		</div>
	{/if}
</div>
