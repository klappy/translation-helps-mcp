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
						>Model Context Protocol (MCP) server and API</strong
					>
					that provides Bible translation resources with reliable caching and current data access. Built
					with TypeScript and designed to work well with AI applications and translation tools.
				</p>
			</div>

			<div class="rounded-3xl border border-green-500/30 bg-green-500/5 p-8 backdrop-blur-2xl">
				<h2 class="mb-4 text-2xl font-bold text-white">✅ What's Currently Available</h2>
				<div class="space-y-4 text-lg text-gray-300">
					<p>
						<strong class="text-green-300">Scripture Access:</strong> Fetch Bible texts in multiple translations
						with reliable source connections to Door43/DCS.
					</p>
					<p>
						<strong class="text-green-300">Translation Resources:</strong> Access to translation notes,
						comprehension questions, and word definitions from canonical sources.
					</p>
					<p>
						<strong class="text-green-300">Smart Caching:</strong> Intelligent caching system that keeps
						responses fast while staying current with source updates.
					</p>
					<p>
						<strong class="text-green-300">MCP Integration:</strong> Full Model Context Protocol support
						for seamless AI assistant integration.
					</p>
					<p>
						<strong class="text-green-300">Production Ready:</strong> Deployed on Cloudflare Workers
						with comprehensive testing and monitoring.
					</p>
				</div>
			</div>

			<div class="rounded-3xl border border-yellow-500/30 bg-yellow-500/5 p-8 backdrop-blur-2xl">
				<h2 class="mb-4 text-2xl font-bold text-white">🚧 Future Development</h2>
				<div class="space-y-4 text-lg text-gray-300">
					<p>
						<strong class="text-yellow-300">IPFS Media Archival:</strong> Planned permanent storage for
						audio, video, and multimedia content.
					</p>
					<p>
						<strong class="text-yellow-300">Semantic Search:</strong> Enhanced search capabilities for
						topical and conceptual Bible study queries.
					</p>
					<p>
						<strong class="text-yellow-300">Offline Support:</strong> Planned offline-ready resources
						for field translation work.
					</p>
					<p>
						<strong class="text-yellow-300">Enhanced AI Features:</strong> More sophisticated AI-powered
						analysis and cross-referencing capabilities.
					</p>
				</div>
			</div>

			<div class="rounded-3xl border border-blue-500/30 bg-white/5 p-8 backdrop-blur-2xl">
				<h2 class="mb-4 text-2xl font-bold text-white">Core Philosophy</h2>
				<div class="space-y-4 text-lg text-gray-300">
					<p>
						<strong class="text-cyan-300">Cache-first:</strong> Serve from cache when possible to reduce
						costs and improve performance, while staying current with sources.
					</p>
					<p>
						<strong class="text-cyan-300">LLM-native:</strong> Designed to work well with Large Language
						Model consumption and AI applications.
					</p>
					<p>
						<strong class="text-cyan-300">Reliable access:</strong> Structured data flows that provide
						consistent, traceable results for Bible translation workflows.
					</p>
				</div>
			</div>

			<div class="rounded-3xl border border-blue-500/30 bg-white/5 p-8 backdrop-blur-2xl">
				<h2 class="mb-4 text-2xl font-bold text-white">Current Features</h2>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
						<h3 class="mb-2 font-semibold text-green-300">✅ Scripture Access</h3>
						<p class="text-sm text-gray-400">
							Bible texts in multiple translations with USFM parsing
						</p>
					</div>
					<div class="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
						<h3 class="mb-2 font-semibold text-green-300">✅ Translation Notes</h3>
						<p class="text-sm text-gray-400">
							Comprehensive translation guidance and contextual notes
						</p>
					</div>
					<div class="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
						<h3 class="mb-2 font-semibold text-green-300">✅ Word Studies</h3>
						<p class="text-sm text-gray-400">
							Word definitions, semantic connections, and browsing
						</p>
					</div>
					<div class="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
						<h3 class="mb-2 font-semibold text-green-300">✅ Production Deployment</h3>
						<p class="text-sm text-gray-400">
							Live on Cloudflare Workers with reliable performance
						</p>
					</div>
					<div class="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
						<h3 class="mb-2 font-semibold text-yellow-300">🚧 Media Support</h3>
						<p class="text-sm text-gray-400">Audio/video archival and sync - in development</p>
					</div>
					<div class="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
						<h3 class="mb-2 font-semibold text-yellow-300">🚧 Semantic Search</h3>
						<p class="text-sm text-gray-400">Topical and conceptual search - planned enhancement</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
