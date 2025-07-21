<svelte:head>
	<title>About - The Aqueduct</title>
	<meta
		name="description"
		content="Learn more about The Aqueduct - our stateless RAG platform for Bible translation."
	/>
</svelte:head>

<!-- Page Content -->
<section class="relative min-h-screen px-4 py-16 sm:px-6 lg:px-8">
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
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				About The Project
			</div>
			<h1 class="mb-8 text-5xl font-bold text-white md:text-6xl">
				About
				<span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
					The Aqueduct
				</span>
			</h1>
			<p class="mx-auto max-w-3xl text-xl leading-relaxed text-gray-300">
				<strong class="text-blue-300">Stateless RAG for Bible Translation.</strong>
				Cache-first. LLM-native. Order without control.
			</p>
		</div>

		<!-- Content -->
		<div class="space-y-8">
			<div class="rounded-3xl border border-blue-500/30 bg-white/5 p-8 backdrop-blur-2xl">
				<h2 class="mb-4 text-2xl font-bold text-white">What is The Aqueduct?</h2>
				<p class="text-lg leading-relaxed text-gray-300">
					The Aqueduct is a <strong class="text-blue-300"
						>Model Context Protocol (MCP) server</strong
					>
					that provides comprehensive Bible translation resources. Built with SvelteKit and designed
					to flow data seamlessly from canonical sources to your AI applications.
				</p>
			</div>

			<div class="rounded-3xl border border-blue-500/30 bg-white/5 p-8 backdrop-blur-2xl">
				<h2 class="mb-4 text-2xl font-bold text-white">Core Philosophy</h2>
				<div class="space-y-4 text-lg text-gray-300">
					<p>
						<strong class="text-cyan-300">Cache-first:</strong> Always serve from cache when possible,
						reducing costs and improving performance.
					</p>
					<p>
						<strong class="text-cyan-300">LLM-native:</strong> Designed specifically for Large Language
						Model consumption and processing.
					</p>
					<p>
						<strong class="text-cyan-300">Order without control:</strong> Structured data flows without
						rigid constraints, allowing for flexible implementation.
					</p>
				</div>
			</div>

			<div class="rounded-3xl border border-blue-500/30 bg-white/5 p-8 backdrop-blur-2xl">
				<h2 class="mb-4 text-2xl font-bold text-white">Features</h2>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
						<h3 class="mb-2 font-semibold text-blue-300">Scripture Access</h3>
						<p class="text-sm text-gray-400">
							Direct access to Bible texts in multiple translations and formats
						</p>
					</div>
					<div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
						<h3 class="mb-2 font-semibold text-blue-300">Translation Notes</h3>
						<p class="text-sm text-gray-400">
							Comprehensive translation guidance and contextual notes
						</p>
					</div>
					<div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
						<h3 class="mb-2 font-semibold text-blue-300">Word Studies</h3>
						<p class="text-sm text-gray-400">
							Detailed word definitions and semantic relationships
						</p>
					</div>
					<div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
						<h3 class="mb-2 font-semibold text-blue-300">Multi-Platform</h3>
						<p class="text-sm text-gray-400">Deploy on Cloudflare Workers or Netlify Functions</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
