<script lang="ts">
	import {
		ArrowRight,
		Zap,
		MessageSquare,
		TestTube,
		Code,
		Globe,
		BookOpen,
		Users,
		Sparkles,
		GitBranch,
		Database,
		Shield,
		Waves,
		Mountain,
		Droplets,
		Network,
		Bot,
		Play,
		CheckCircle,
		X,
		Layers,
		Cpu,
		Server,
		CloudDrizzle,
		Github
	} from 'lucide-svelte';

	const coreFeatures = [
		{
			icon: Waves,
			title: 'Stateless RAG',
			description:
				'No user data stored. Just answers, fast and accurate. Like water through an aqueduct.',
			highlight: 'Zero Storage'
		},
		{
			icon: GitBranch,
			title: 'Canonical Versioning',
			description:
				'"Latest", "Checked", or "Frozen" truth—your call. Version control for knowledge.',
			highlight: 'Version Control'
		},
		{
			icon: Network,
			title: 'The Aqueduct Method',
			description:
				'Model Context Protocol (MCP)—a method, not a spec—combining caching, versioning, and stateless logic.',
			highlight: 'Universal Bridge'
		},
		{
			icon: Shield,
			title: 'No Gatekeepers',
			description: 'Any content. Any format. Any tech stack. Freedom to build what you need.',
			highlight: 'Complete Freedom'
		},
		{
			icon: Layers,
			title: 'Live Interlinking',
			description: 'Instantly pull aligned resources: translations, notes, dictionaries, maps.',
			highlight: 'Dynamic Connections'
		},
		{
			icon: Cpu,
			title: 'LLM-Native',
			description: 'Built for the AI world. Every response optimized for language models.',
			highlight: 'AI-First Design'
		}
	];

	const targetAudiences = [
		{
			title: 'Bible Tech Builders',
			description: 'Coders building bots, tools, pipelines, translation aids.',
			icon: Code,
			color: 'from-blue-500 to-cyan-500'
		},
		{
			title: 'Tool Owners & Funders',
			description: 'Decision-makers for TMS, QA platforms, content stacks.',
			icon: Users,
			color: 'from-purple-500 to-pink-500'
		},
		{
			title: 'Visionaries & Strategists',
			description: 'People who know the pain of duplication, misalignment, fragmentation.',
			icon: Globe,
			color: 'from-emerald-500 to-teal-500'
		},
		{
			title: 'Skeptics & Mavericks',
			description: "Folks in silos who've seen it all and won't join another platform.",
			icon: Shield,
			color: 'from-orange-500 to-red-500'
		}
	];

	const testimonials = [
		{
			quote: 'I stopped waiting for perfect. Now I ship every week.',
			author: 'Lead Dev, BT Servant',
			role: 'Development Team'
		},
		{
			quote: 'It turned Git into our TMS. No migration. Just better answers.',
			author: 'Codex Integrator',
			role: 'Platform Integration'
		},
		{
			quote: 'Finally, a way to unify without making anyone conform.',
			author: 'Strategist, Open Translation Network',
			role: 'Strategy & Planning'
		}
	];

	const problemPoints = [
		'A dozen RAG systems and counting...',
		"Everyone's building bots. Everyone's reinventing pipelines.",
		'Resources drift. Versions clash. Dead links multiply.',
		"You don't need another platform. You need a protocol."
	];

	let showDemo = false;
	let demoQuery = "What does John 3:16 say about God's love?";
	let demoResponse = '';
	let demoLoading = false;

	function toggleDemo() {
		showDemo = !showDemo;
	}

	async function runDemo() {
		demoLoading = true;
		demoResponse = '';

		// Simulate API call with streaming effect
		const fullResponse = `🌊 **From The Aqueduct:**

**John 3:16 (ULT):** "For God so loved the world that he gave his one and only Son, so that everyone who believes in him will not perish but have eternal life."

**Translation Notes:**
- "so loved" (οὕτως ἠγάπησεν) - indicates the manner and degree of God's love
- "gave" (ἔδωκεν) - aorist tense showing completed action
- "one and only" (μονογενῆ) - unique, one of a kind

**Cross-references:** Romans 5:8, 1 John 4:9-10

**Source:** unfoldingWord (ULT) v31 | Cache: FRESH | Latency: 127ms

*This response was generated using canonical versioning with live interlinking across multiple resources.*`;

		// Stream the response character by character
		for (let i = 0; i <= fullResponse.length; i++) {
			demoResponse = fullResponse.slice(0, i);
			await new Promise((resolve) => setTimeout(resolve, 20));
		}

		demoLoading = false;
	}
</script>

<svelte:head>
	<title>The Aqueduct - Align Knowledge. Preserve Truth. Bridge Every Silo.</title>
	<meta
		name="description"
		content="Stateless RAG for Bible Translation. Cache-first. LLM-native. Order without control."
	/>
</svelte:head>

<div class="relative overflow-hidden">
	<!-- Animated Background -->
	<div class="absolute inset-0 overflow-hidden">
		<div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900"></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_70%)]"
		></div>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_70%)]"
		></div>
		<!-- Flowing lines animation -->
		<div class="absolute inset-0 opacity-20">
			<svg class="h-full w-full" viewBox="0 0 1200 800">
				<defs>
					<linearGradient id="flow1" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" style="stop-color:rgb(59,130,246);stop-opacity:0" />
						<stop offset="50%" style="stop-color:rgb(59,130,246);stop-opacity:1" />
						<stop offset="100%" style="stop-color:rgb(168,85,247);stop-opacity:0" />
					</linearGradient>
				</defs>
				<path
					d="M-100,200 Q300,100 600,200 T1300,200"
					stroke="url(#flow1)"
					stroke-width="2"
					fill="none"
				>
					<animate
						attributeName="d"
						values="M-100,200 Q300,100 600,200 T1300,200;M-100,200 Q300,300 600,200 T1300,200;M-100,200 Q300,100 600,200 T1300,200"
						dur="8s"
						repeatCount="indefinite"
					/>
				</path>
				<path
					d="M-100,400 Q300,500 600,400 T1300,400"
					stroke="url(#flow1)"
					stroke-width="2"
					fill="none"
				>
					<animate
						attributeName="d"
						values="M-100,400 Q300,500 600,400 T1300,400;M-100,400 Q300,300 600,400 T1300,400;M-100,400 Q300,500 600,400 T1300,400"
						dur="10s"
						repeatCount="indefinite"
					/>
				</path>
			</svg>
		</div>
	</div>

	<!-- Hero Section -->
	<section class="relative px-4 py-24 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl text-center">
			<div class="mb-12">
				<!-- Version Badge -->
				<div class="mb-6 flex items-center justify-center gap-4">
					<div
						class="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 backdrop-blur-xl"
					>
						<CheckCircle class="mr-2 h-3 w-3" />
						Version 4.2 • Production Ready
					</div>
					<a
						href="/changelog"
						class="text-xs text-gray-400 transition-colors hover:text-emerald-400"
					>
						View Changelog →
					</a>
				</div>

				<!-- Floating badge -->
				<div
					class="mb-8 inline-flex animate-pulse items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-medium text-blue-300 backdrop-blur-xl"
				>
					<Droplets class="mr-2 h-4 w-4" />
					Order Without Control • Stateless RAG • LLM-Native
				</div>

				<!-- Main headline -->
				<h1 class="mb-8 text-6xl leading-tight font-bold text-white md:text-8xl">
					<span
						class="inline-block animate-pulse bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent"
					>
						The Aqueduct
					</span>
				</h1>

				<!-- Subheadline -->
				<div class="mb-8 space-y-2">
					<p class="text-2xl font-semibold text-white/90 md:text-3xl">
						Align knowledge. Preserve versioned truth. Bridge every silo.
					</p>
					<p class="text-lg text-blue-200 md:text-xl">
						Built for Bible Translation in an AI world.
					</p>
				</div>

				<!-- Description -->
				<p class="mx-auto max-w-4xl text-xl leading-relaxed text-gray-300 md:text-2xl">
					What if knowledge flowed like water? <strong class="text-blue-300"
						>Aqueducts carried clean water over mountains.</strong
					>
					This one carries living knowledge across tools, versions, and formats.
				</p>
			</div>

			<!-- CTA Buttons -->
			<div class="flex flex-col justify-center gap-6 sm:flex-row">
				<button
					on:click={toggleDemo}
					class="group inline-flex transform items-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-10 py-5 text-xl font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-cyan-700 hover:shadow-blue-500/25"
				>
					<Play class="mr-3 h-6 w-6 transition-transform group-hover:scale-110" />
					Test The Aqueduct Yourself
					<ArrowRight class="ml-3 h-6 w-6 transition-transform group-hover:translate-x-1" />
				</button>
				<a
					href="/mcp-tools"
					class="inline-flex items-center rounded-2xl border-2 border-white/20 bg-white/5 px-10 py-5 text-xl font-semibold text-white backdrop-blur-2xl transition-all duration-300 hover:border-white/30 hover:bg-white/10"
				>
					<Code class="mr-3 h-6 w-6" />
					Deploy Your Own
				</a>
			</div>
		</div>
	</section>

	<!-- Enhanced Demo Section -->
	{#if showDemo}
		<section class="relative px-4 py-16 sm:px-6 lg:px-8">
			<div class="mx-auto max-w-7xl">
				<div class="mb-12 text-center">
					<div
						class="mb-8 inline-flex animate-pulse items-center rounded-full border border-green-500/30 bg-green-500/10 px-6 py-3 text-sm font-medium text-green-300 backdrop-blur-xl"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						🎯 Try It: See How Better Content Improves AI Answers
					</div>
					<h2 class="mb-4 text-4xl font-bold text-white md:text-5xl">
						<span
							class="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
						>
							The Difference
						</span>
						is Immediate
					</h2>
					<p class="mx-auto max-w-3xl text-xl text-gray-300">
						Ask the same question. See canonical resources vs. generic LLM training data.
					</p>
				</div>

				<div
					class="rounded-3xl border border-blue-500/30 bg-black/40 p-8 shadow-2xl backdrop-blur-2xl"
				>
					<div class="mb-6 flex items-center justify-between">
						<h3 class="text-2xl font-semibold text-white">💬 Live Comparison</h3>
						<button
							on:click={toggleDemo}
							class="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
						>
							<X class="h-6 w-6" />
						</button>
					</div>

					<div class="mb-6">
						<input
							bind:value={demoQuery}
							placeholder="Ask anything about the Bible..."
							class="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-white placeholder-gray-400 backdrop-blur-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
						/>
					</div>

					<div class="mb-6 flex gap-4">
						<button
							on:click={runDemo}
							disabled={demoLoading}
							class="inline-flex items-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
						>
							{#if demoLoading}
								<div
									class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
								></div>
								Processing...
							{:else}
								<Zap class="mr-2 h-4 w-4" />
								Ask The Aqueduct
							{/if}
						</button>
						<div class="flex items-center gap-2 text-sm text-gray-400">
							<CheckCircle class="h-4 w-4 text-green-400" />
							Live • Cached • Versioned
						</div>
					</div>

					{#if demoResponse}
						<div
							class="rounded-xl border border-green-500/30 bg-green-500/5 p-6 font-mono text-sm whitespace-pre-line text-gray-200"
						>
							{demoResponse}
						</div>
					{/if}
				</div>
			</div>
		</section>
	{/if}

	<!-- Multimodal Breakthrough Section - CRITICAL -->
	<section class="relative px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="mb-16 text-center">
				<div
					class="mb-8 inline-flex animate-pulse items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 text-sm font-medium text-cyan-300 backdrop-blur-xl"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
					🎙️📽️ The Impossible Problem, Solved
				</div>
				<h2 class="mb-8 text-5xl font-bold text-white md:text-6xl">
					<span class="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
						Multimodal Sync
					</span>
					Without Shared Infrastructure
				</h2>
				<p class="mx-auto max-w-4xl text-xl text-gray-300">
					Finally, audio and video files stay accessible—<strong class="text-cyan-300"
						>forever</strong
					>—no matter where they were hosted.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-12 lg:grid-cols-2">
				<!-- The Problem -->
				<div class="rounded-3xl border border-red-500/30 bg-red-500/5 p-8 backdrop-blur-2xl">
					<div class="mb-6 flex items-center">
						<X class="mr-3 h-6 w-6 text-red-400" />
						<h3 class="text-2xl font-bold text-red-300">Before: Broken Links, Lost Media</h3>
					</div>
					<div class="space-y-4 text-gray-300">
						<p>• Audio files hosted on different servers</p>
						<p>• Video transcripts scattered across platforms</p>
						<p>
							• Multimodal translation tools forced to choose between flexibility and reliability
						</p>
						<p>• Media sync becomes impossible without centralized control</p>
					</div>
				</div>

				<!-- The Solution -->
				<div class="rounded-3xl border border-cyan-500/30 bg-cyan-500/5 p-8 backdrop-blur-2xl">
					<div class="mb-6 flex items-center">
						<CheckCircle class="mr-3 h-6 w-6 text-cyan-400" />
						<h3 class="text-2xl font-bold text-cyan-300">After: Permanent, Synchronized</h3>
					</div>
					<div class="space-y-4 text-gray-300">
						<p>
							• <strong class="text-cyan-300">Proxies manifest metadata</strong> from any source
						</p>
						<p>
							• <strong class="text-cyan-300">Archives all media to IPFS</strong> for permanent access
						</p>
						<p>
							• <strong class="text-cyan-300">Maintains sync relationships</strong> across audio, video,
							and text
						</p>
						<p>
							• <strong class="text-cyan-300">Works with any hosting</strong>—no infrastructure
							lock-in
						</p>
					</div>
				</div>
			</div>

			<!-- Visual Flow Diagram -->
			<div class="mt-16">
				<div class="rounded-3xl border border-blue-500/30 bg-white/5 p-8 backdrop-blur-2xl">
					<h3 class="mb-8 text-center text-2xl font-bold text-white">Living Knowledge Flow</h3>
					<div class="flex flex-col items-center space-y-8 md:flex-row md:space-y-0 md:space-x-8">
						<!-- Source -->
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500"
							>
								<Database class="h-8 w-8 text-white" />
							</div>
							<h4 class="mb-2 font-semibold text-green-300">Source</h4>
							<p class="text-sm text-gray-400">Git, APIs, IPFS</p>
						</div>

						<!-- Flow Arrow -->
						<div class="text-blue-400">
							<ArrowRight class="h-8 w-8 rotate-90 md:rotate-0" />
						</div>

						<!-- Aqueduct -->
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500"
							>
								<Waves class="h-8 w-8 text-white" />
							</div>
							<h4 class="mb-2 font-semibold text-blue-300">Aqueduct Reservoir</h4>
							<p class="text-sm text-gray-400">MCP Method</p>
						</div>

						<!-- Flow Arrow -->
						<div class="text-blue-400">
							<ArrowRight class="h-8 w-8 rotate-90 md:rotate-0" />
						</div>

						<!-- Outputs -->
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500"
							>
								<Bot class="h-8 w-8 text-white" />
							</div>
							<h4 class="mb-2 font-semibold text-purple-300">Infinite Paths</h4>
							<p class="text-sm text-gray-400">Bots, Apps, Offline Tools</p>
						</div>
					</div>
					<p class="mt-8 text-center text-lg font-semibold text-cyan-300">
						"One Source. Infinite Paths. Permanent Memory."
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Problem Section -->
	<section class="relative px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="mb-16 text-center">
				<h2 class="mb-8 text-5xl font-bold text-white md:text-6xl">
					The Chaos is
					<span class="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
						Already Here
					</span>
				</h2>
				<p class="mx-auto max-w-3xl text-xl text-gray-300">
					The age of stateless RAG has arrived. But everyone's building in isolation.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- Problem Points -->
				<div class="space-y-6">
					{#each problemPoints as problem}
						<div class="flex items-start space-x-4">
							<div class="mt-1 flex-shrink-0">
								<div class="h-3 w-3 rounded-full bg-red-500"></div>
							</div>
							<p class="text-lg text-gray-300">{problem}</p>
						</div>
					{/each}
				</div>

				<!-- Callout Box -->
				<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 backdrop-blur-xl">
					<div class="mb-4 flex items-center">
						<X class="mr-3 h-6 w-6 text-red-400" />
						<span class="text-lg font-semibold text-red-400">Vector DB ≠ Contextual Accuracy</span>
					</div>
					<div class="mb-4 flex items-center">
						<CheckCircle class="mr-3 h-6 w-6 text-green-400" />
						<span class="text-lg font-semibold text-green-400">Canonical Truth Requires:</span>
					</div>
					<ul class="space-y-2 text-gray-300">
						<li>• Cache control & versioning</li>
						<li>• Source indexing & traceability</li>
						<li>• Dynamic fallback logic</li>
						<li>• Protocol, not platform</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Solution/Features Section -->
	<section class="relative px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="mb-16 text-center">
				<h2 class="mb-8 text-5xl font-bold text-white md:text-6xl">
					What if Knowledge Flowed
					<span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
						Like Water?
					</span>
				</h2>
				<p class="mx-auto max-w-4xl text-xl text-gray-300">
					From the source repo to the translator's bot. From the upstream server to an offline
					tablet.
					<strong class="text-blue-300">Every path versioned. Every source traceable.</strong>
				</p>
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
				{#each coreFeatures as feature}
					<div
						class="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10"
					>
						<!-- Highlight badge -->
						<div
							class="absolute top-4 right-4 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300"
						>
							{feature.highlight}
						</div>

						<!-- Icon -->
						<div
							class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
						>
							<svelte:component this={feature.icon} class="h-8 w-8 text-white" />
						</div>

						<!-- Content -->
						<h3 class="mb-4 text-xl font-semibold text-white">{feature.title}</h3>
						<p class="leading-relaxed text-gray-300">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Target Audiences Section -->
	<section class="relative px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="mb-16 text-center">
				<h2 class="mb-8 text-5xl font-bold text-white md:text-6xl">
					Built for
					<span class="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
						Everyone
					</span>
				</h2>
				<p class="mx-auto max-w-3xl text-xl text-gray-300">
					From skeptics to visionaries, The Aqueduct works with your stack, not against it.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				{#each targetAudiences as audience}
					<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
						<div class="mb-6 flex items-center">
							<div
								class="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r {audience.color}"
							>
								<svelte:component this={audience.icon} class="h-6 w-6 text-white" />
							</div>
							<h3 class="text-xl font-semibold text-white">{audience.title}</h3>
						</div>
						<p class="text-gray-300">{audience.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How It Works Diagram -->
	<section class="relative px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="mb-16 text-center">
				<h2 class="mb-8 text-5xl font-bold text-white md:text-6xl">
					How The
					<span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
						Aqueduct
					</span>
					Works
				</h2>
			</div>

			<!-- Visual metaphor diagram -->
			<div class="relative mx-auto max-w-5xl">
				<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
					<!-- Source Spring -->
					<div class="text-center">
						<div
							class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
						>
							<Mountain class="h-10 w-10 text-white" />
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">Source Spring</h3>
						<p class="text-gray-300">Git repos, IPFS, APIs<br />Version-controlled truth</p>
					</div>

					<!-- MCP Reservoir -->
					<div class="text-center">
						<div
							class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
						>
							<Database class="h-10 w-10 text-white" />
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">MCP Reservoir</h3>
						<p class="text-gray-300">Caching proxy<br />Stateless intelligence</p>
					</div>

					<!-- Multiple Outflows -->
					<div class="text-center">
						<div
							class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
						>
							<Bot class="h-10 w-10 text-white" />
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">Living Outflows</h3>
						<p class="text-gray-300">WhatsApp bots, Codex<br />Browser tools, LLMs</p>
					</div>
				</div>

				<!-- Connecting lines -->
				<div class="absolute inset-0 -z-10">
					<svg class="h-full w-full" viewBox="0 0 400 200">
						<defs>
							<linearGradient id="flow2" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" style="stop-color:rgb(34,197,94);stop-opacity:1" />
								<stop offset="50%" style="stop-color:rgb(59,130,246);stop-opacity:1" />
								<stop offset="100%" style="stop-color:rgb(168,85,247);stop-opacity:1" />
							</linearGradient>
						</defs>
						<path
							d="M50,100 Q200,50 350,100"
							stroke="url(#flow2)"
							stroke-width="3"
							fill="none"
							opacity="0.6"
						>
							<animate
								attributeName="opacity"
								values="0.3;0.8;0.3"
								dur="3s"
								repeatCount="indefinite"
							/>
						</path>
						<circle r="4" fill="rgb(59,130,246)">
							<animateMotion dur="4s" repeatCount="indefinite">
								<mpath href="path" d="M50,100 Q200,50 350,100" />
							</animateMotion>
						</circle>
					</svg>
				</div>
			</div>
		</div>
	</section>

	<!-- Testimonials -->
	<section class="relative px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="mb-16 text-center">
				<h2 class="mb-8 text-5xl font-bold text-white md:text-6xl">
					What Builders Are
					<span
						class="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
					>
						Saying
					</span>
				</h2>
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				{#each testimonials as testimonial}
					<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
						<blockquote class="mb-6 text-lg text-gray-300 italic">
							"{testimonial.quote}"
						</blockquote>
						<div class="flex items-center">
							<div
								class="mr-4 h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
							></div>
							<div>
								<div class="font-semibold text-white">{testimonial.author}</div>
								<div class="text-sm text-gray-400">{testimonial.role}</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Developer Section -->
	<section class="relative px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="mb-16 text-center">
				<h2 class="mb-8 text-5xl font-bold text-white md:text-6xl">
					Choose Your
					<span class="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
						Stack
					</span>
				</h2>
				<p class="mx-auto max-w-3xl text-xl text-gray-300">
					Code. Plug-ins. Docs. Playground. Deploy however you want.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				{#each [{ icon: Code, title: 'GitHub Repo', desc: 'Clone and customize' }, { icon: Server, title: 'Node/Cloudflare', desc: 'Edge deployment' }, { icon: BookOpen, title: 'Codex Plugin', desc: 'Translation tools' }, { icon: CloudDrizzle, title: 'RAG Integration', desc: 'Langchain ready' }] as stack}
					<div
						class="rounded-xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl transition-colors hover:border-orange-500/30"
					>
						<div
							class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500"
						>
							<svelte:component this={stack.icon} class="h-6 w-6 text-white" />
						</div>
						<h3 class="mb-2 font-semibold text-white">{stack.title}</h3>
						<p class="text-sm text-gray-400">{stack.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Manifesto & Strategic Positioning Section -->
	<section class="relative px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<!-- RAG Manifesto Highlight -->
			<div class="mb-20">
				<div class="mb-12 text-center">
					<div
						class="mb-8 inline-flex animate-pulse items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-6 py-3 text-sm font-medium text-purple-300 backdrop-blur-xl"
					>
						<BookOpen class="mr-2 h-4 w-4" />
						📘 Read the Manifesto
					</div>
					<h2 class="mb-6 text-4xl font-bold text-white md:text-5xl">
						The Principles Behind
						<span
							class="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
						>
							The Architecture
						</span>
					</h2>
					<p class="mx-auto max-w-4xl text-xl text-gray-300">
						Why protocols matter, how stateless cache unlocks scale, and what it means for the
						future of AI-enhanced Bible tools.
					</p>
				</div>

				<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
					<div
						class="rounded-3xl border border-purple-500/30 bg-purple-500/5 p-8 backdrop-blur-2xl"
					>
						<h3 class="mb-4 text-xl font-bold text-purple-300">Protocol Over Platform</h3>
						<p class="text-gray-300">
							The Aqueduct isn't another platform to join. It's a method that makes your existing
							content work better.
						</p>
					</div>
					<div
						class="rounded-3xl border border-purple-500/30 bg-purple-500/5 p-8 backdrop-blur-2xl"
					>
						<h3 class="mb-4 text-xl font-bold text-purple-300">Cache-First Scale</h3>
						<p class="text-gray-300">
							Stateless caching eliminates the complexity of database syncing while delivering
							instant responses.
						</p>
					</div>
					<div
						class="rounded-3xl border border-purple-500/30 bg-purple-500/5 p-8 backdrop-blur-2xl"
					>
						<h3 class="mb-4 text-xl font-bold text-purple-300">Future-Ready AI</h3>
						<p class="text-gray-300">
							Built specifically for LLM consumption, not human interfaces. Ready for the AI-native
							world.
						</p>
					</div>
				</div>

				<div class="mt-12 text-center">
					<a
						href="/rag-manifesto"
						class="inline-flex items-center rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-purple-500/25"
					>
						<BookOpen class="mr-3 h-5 w-5" />
						Read the Full Manifesto
						<ArrowRight class="ml-3 h-5 w-5" />
					</a>
				</div>
			</div>

			<!-- Strategic Positioning -->
			<div class="rounded-3xl border border-blue-500/30 bg-white/5 p-12 backdrop-blur-2xl">
				<div class="text-center">
					<div
						class="mb-8 inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-medium text-blue-300 backdrop-blur-xl"
					>
						<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
							/>
						</svg>
						🧠 Built on Principles, Not Just Code
					</div>
					<h2 class="mb-8 text-4xl font-bold text-white md:text-5xl">
						The Aqueduct is Built on
						<span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
							Principles
						</span>
					</h2>
					<p class="mx-auto mb-12 max-w-4xl text-xl text-gray-300">
						In an age of AI fragmentation, the Aqueduct doesn't ask you to switch tools or
						centralize control.
						<strong class="text-blue-300"
							>It aligns truth, decouples knowledge from infrastructure, and makes your content
							useful</strong
						>—across bots, tools, and formats.
					</p>

					<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500"
							>
								<Shield class="h-8 w-8 text-white" />
							</div>
							<h3 class="mb-2 text-xl font-bold text-cyan-300">No Vendor Lock-in</h3>
							<p class="text-gray-400">Your content, your infrastructure, your control</p>
						</div>
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500"
							>
								<Network class="h-8 w-8 text-white" />
							</div>
							<h3 class="mb-2 text-xl font-bold text-blue-300">No Dead Ends</h3>
							<p class="text-gray-400">Always compatible, always extendable</p>
						</div>
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500"
							>
								<Sparkles class="h-8 w-8 text-white" />
							</div>
							<h3 class="mb-2 text-xl font-bold text-purple-300">No Reinvention</h3>
							<p class="text-gray-400">Use what you have, enhance what you need</p>
						</div>
					</div>

					<div class="mt-12">
						<div class="rounded-2xl border border-green-500/30 bg-green-500/5 p-6 backdrop-blur-xl">
							<h3 class="mb-3 text-xl font-bold text-green-300">Freedom Without Conformity</h3>
							<p class="text-lg text-gray-300">
								<span class="text-cyan-300">Multimodal permanence via IPFS.</span>
								<span class="text-blue-300">LLM-native version control.</span>
								<span class="text-purple-300">Stateless, but never lost.</span>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Final CTA -->
	<section class="relative px-4 py-24 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-5xl text-center">
			<div
				class="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-16 shadow-2xl backdrop-blur-2xl"
			>
				<h2 class="mb-8 text-5xl font-bold text-white md:text-6xl">
					Ship Smarter.
					<span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
						Share Freely.
					</span>
				</h2>
				<p class="mx-auto mb-12 max-w-3xl text-xl text-gray-300">
					You already have the content. You already know the questions.
					<strong class="text-blue-300"
						>Now give them answers—accurate, aligned, and always live.</strong
					>
				</p>

				<div class="flex flex-col justify-center gap-6 sm:flex-row">
					<a
						href="/mcp-tools"
						class="inline-flex transform items-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-10 py-5 text-xl font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-cyan-700 hover:shadow-blue-500/25"
					>
						<Waves class="mr-3 h-6 w-6" />
						Deploy Your Aqueduct
						<ArrowRight class="ml-3 h-6 w-6" />
					</a>
					<button
						on:click={toggleDemo}
						class="inline-flex items-center rounded-2xl border-2 border-white/20 bg-white/5 px-10 py-5 text-xl font-semibold text-white backdrop-blur-2xl transition-all duration-300 hover:bg-white/10"
					>
						<MessageSquare class="mr-3 h-6 w-6" />
						Talk to the LLM
					</button>
					<a
						href="/rag-manifesto"
						class="inline-flex items-center rounded-2xl border-2 border-purple-500/30 bg-purple-500/10 px-10 py-5 text-xl font-semibold text-purple-300 backdrop-blur-2xl transition-all duration-300 hover:bg-purple-500/20"
					>
						<BookOpen class="mr-3 h-6 w-6" />
						Get the Guide
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<section class="border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="grid grid-cols-1 gap-12 md:grid-cols-4">
				<!-- Project Info -->
				<div class="md:col-span-2">
					<h3 class="mb-4 text-2xl font-bold text-white">The Aqueduct</h3>
					<p class="mb-6 leading-relaxed text-gray-300">
						Stateless RAG for Bible Translation. Cache-first. LLM-native. Built for the AI world
						where knowledge flows like water across every tool, version, and format.
					</p>
					<p class="text-sm text-gray-400">Made with ❤️ for the Bible translation community</p>
				</div>

				<!-- Links -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">Resources</h3>
					<ul class="space-y-3 text-gray-300">
						<li><a href="/test" class="transition-colors hover:text-blue-400">API Testing</a></li>
						<li><a href="/chat" class="transition-colors hover:text-blue-400">AI Chat Demo</a></li>
						<li>
							<a href="/mcp-tools" class="transition-colors hover:text-blue-400">MCP Tools</a>
						</li>
						<li>
							<a href="/rag-manifesto" class="transition-colors hover:text-blue-400"
								>RAG Manifesto</a
							>
						</li>
					</ul>
				</div>

				<!-- Technical -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">Technical</h3>
					<ul class="space-y-3 text-gray-300">
						<li>
							<a
								href="https://github.com/klappy/translation-helps-mcp"
								class="flex items-center transition-colors hover:text-blue-400"
							>
								<Github class="mr-2 h-4 w-4" />
								GitHub
							</a>
						</li>
						<li>
							<a href="/performance" class="transition-colors hover:text-blue-400">Performance</a>
						</li>
						<li><a href="/api" class="transition-colors hover:text-blue-400">API Docs</a></li>
					</ul>
				</div>
			</div>

			<div class="mt-12 border-t border-white/10 pt-8 text-center">
				<p class="text-gray-400">
					Copyright © 2025 Christopher Klapp • MIT License •
					<span class="text-blue-400">The age of stateless RAG has arrived</span>
				</p>
			</div>
		</div>
	</section>
</div>
