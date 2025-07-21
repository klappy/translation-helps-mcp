<script lang="ts">
	import {
		Droplet,
		Zap,
		ArrowRight,
		Code,
		MessageSquare,
		Layers,
		ShieldCheck,
		Globe
	} from 'lucide-svelte';

	// Problem bullets
	const chaosPoints = [
		'A dozen RAG systems and counting…',
		"Everyone’s building bots. Everyone’s reinventing pipelines.",
		'Resources drift. Versions clash. Dead links multiply.',
		"You don’t need another \u201cplatform.\u201d You need a protocol. A principle. A proxy.",
		'The age of stateless RAG has arrived.'
	];

	// Solution cards
	const solutionFeatures = [
		{
			icon: Droplet,
			title: 'Stateless RAG',
			description: 'No user data stored. Just answers—fast, cached and accurate.'
		},
		{
			icon: Layers,
			title: 'MCP Server',
			description: 'Your proxy. Your adapter. Your vault. Bridge every format & repo.'
		},
		{
			icon: ShieldCheck,
			title: 'Canonical Versioning',
			description: '“Latest”, “Checked”, or “Frozen” truth—your call, always traceable.'
		},
		{
			icon: Globe,
			title: 'No Gatekeepers',
			description: 'Any content. Any tech stack. Any language. Total interoperability.'
		},
		{
			icon: Zap,
			title: 'Live Interlinking',
			description: 'Instantly pull aligned scripture, notes, dictionaries and more.'
		}
	];

	// Developer stacks
	const devStacks = [
		'GitHub repo',
		'Node / Cloudflare + Edge adapters',
		'Codex plug-in',
		'Tauri / Local-first versions',
		'LangChain / RAG integrations'
	];

	// Testimonials
	const testimonials = [
		{
			quote: 'I stopped waiting for perfect. Now I ship every week.',
			author: 'Lead Dev, BT Servant'
		},
		{
			quote: 'It turned Git into our TMS. No migration. Just better answers.',
			author: 'Codex Integrator'
		},
		{
			quote: 'Finally, a way to unify without making anyone conform.',
			author: 'Strategist, Open Translation Network'
		}
	];
</script>

<svelte:head>
	<title>The Aqueduct — Stateless RAG for Bible Translation</title>
</svelte:head>

<div class="relative">
	<!-- Hero Section -->
	<section class="relative px-4 py-28 sm:px-6 lg:px-8 text-center">
		<div class="mx-auto max-w-6xl">
			<div class="mb-8 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 backdrop-blur">Stateless · Cache-first · LLM-native</div>

			<h1 class="mb-6 text-6xl font-extrabold leading-tight tracking-tight text-white md:text-8xl">
				<span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">The Aqueduct</span>
			</h1>

			<p class="mx-auto mb-10 max-w-3xl text-2xl leading-relaxed text-gray-300">
				Align knowledge. Preserve versioned truth. Bridge every silo.
			</p>

			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<a href="/chat" class="inline-flex transform items-center rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-cyan-700 hover:to-blue-700">
					<MessageSquare class="mr-2 h-5 w-5" /> Talk to the LLM <ArrowRight class="ml-2 h-5 w-5" />
				</a>
				<a href="https://github.com/klappy/translation-helps-mcp" target="_blank" class="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition-all duration-200 hover:bg-white/20">
					<Code class="mr-2 h-5 w-5" /> Deploy Your Own
				</a>
			</div>
		</div>
	</section>

	<!-- Problem Section -->
	<section class="px-4 py-24 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-gray-900/30 to-transparent">
		<div class="mx-auto max-w-6xl text-center">
			<h2 class="mb-8 text-4xl font-bold text-white md:text-5xl">The Chaos is Already Here</h2>
			<div class="mx-auto max-w-2xl space-y-4 text-xl text-gray-300">
				{#each chaosPoints as point}
					<div class="flex items-start space-x-3"><Droplet class="mt-1 h-5 w-5 text-cyan-400" /><span>{point}</span></div>
				{/each}
			</div>

			<div class="mx-auto mt-8 max-w-lg rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-6 text-left text-gray-200 backdrop-blur">
				<div class="mb-2 text-sm font-semibold text-cyan-300">Remember:</div>
				<div class="space-y-1 text-base">
					<div>❌ Vector&nbsp;DB ≠ Contextual Accuracy</div>
					<div>✅ Canonical truth needs cache control, versioning, source indexing & dynamic fallback logic.</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Solution Section -->
	<section class="px-4 py-24 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-6xl">
			<div class="mb-16 text-center">
				<h2 class="mb-6 text-4xl font-bold text-white md:text-5xl">What if Knowledge Flowed Like Water?</h2>
				<p class="mx-auto max-w-3xl text-xl text-gray-300">Aqueducts carried clean water over mountains. This one carries living knowledge across tools, versions and formats.</p>
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
				{#each solutionFeatures as feature}
					<div class="group rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-cyan-400/30">
						<div class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 group-hover:scale-110 transition-transform duration-300">
							<svelte:component this={feature.icon} class="h-6 w-6 text-white" />
						</div>
						<h3 class="mb-4 text-xl font-semibold text-white">{feature.title}</h3>
						<p class="leading-relaxed text-gray-300">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Interactive CTA Section -->
	<section class="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8 bg-gradient-to-r from-cyan-600 to-blue-600">
		<div class="relative z-10 mx-auto max-w-5xl text-center text-white">
			<h2 class="mb-6 text-4xl font-extrabold md:text-5xl">Test It Yourself</h2>
			<p class="mx-auto mb-10 max-w-2xl text-lg text-cyan-100">Ask a biblical question, toggle versions, and see aligned fallback in action—powered by the real Aqueduct cache.</p>
			<a href="/chat" class="inline-flex items-center rounded-xl bg-black/20 px-8 py-4 text-lg font-semibold backdrop-blur transition-all duration-200 hover:bg-black/30">
				<MessageSquare class="mr-2 h-5 w-5" /> Open the Chat Demo <ArrowRight class="ml-2 h-5 w-5" />
			</a>
		</div>
		<div class="absolute inset-0 bg-[url('/aqueduct-bg.svg')] bg-cover bg-center opacity-20"></div>
	</section>

	<!-- Testimonials Section -->
	<section class="px-4 py-24 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-6xl text-center">
			<h2 class="mb-12 text-4xl font-bold text-white md:text-5xl">Voices From the Flow</h2>
			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				{#each testimonials as t}
					<blockquote class="rounded-2xl border border-white/10 bg-white/5 p-8 text-left shadow-lg backdrop-blur-xl">
						<p class="mb-4 text-lg leading-relaxed text-gray-200">“{t.quote}”</p>
						<footer class="text-sm font-medium text-cyan-300">— {t.author}</footer>
					</blockquote>
				{/each}
			</div>
		</div>
	</section>

	<!-- Developer Section -->
	<section class="px-4 py-24 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-gray-900/30 to-transparent">
		<div class="mx-auto max-w-6xl text-center">
			<h2 class="mb-8 text-4xl font-bold text-white md:text-5xl">For Developers</h2>
			<p class="mx-auto mb-12 max-w-2xl text-xl text-gray-300">Code. Plug-ins. Docs. Playground. Choose your stack and start shipping smarter.</p>
			<div class="flex flex-wrap items-center justify-center gap-6">
				{#each devStacks as stack}
					<div class="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-gray-200 backdrop-blur transition-all duration-200 hover:bg-white/10 hover:text-white">{stack}</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Final CTA -->
	<section class="px-4 py-24 sm:px-6 lg:px-8 text-center">
		<div class="mx-auto max-w-6xl">
			<h2 class="mb-8 text-4xl font-bold text-white md:text-5xl">Ship Smarter. Share Freely.</h2>
			<p class="mx-auto mb-10 max-w-2xl text-xl text-gray-300">You already have the content. You already know the questions. Now give them answers—accurate, aligned, and always live.</p>
			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<a href="https://github.com/klappy/translation-helps-mcp" target="_blank" class="inline-flex transform items-center rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-cyan-700 hover:to-blue-700">
					<Code class="mr-2 h-5 w-5" /> Deploy Your Own Aqueduct <ArrowRight class="ml-2 h-5 w-5" />
				</a>
				<a href="/chat" class="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition-all duration-200 hover:bg-white/20">
					<MessageSquare class="mr-2 h-5 w-5" /> Talk to the LLM Yourself
				</a>
			</div>
		</div>
	</section>
</div>
