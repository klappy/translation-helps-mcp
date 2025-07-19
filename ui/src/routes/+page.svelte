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
		Sparkles
	} from 'lucide-svelte';

	const features = [
		{
			icon: BookOpen,
			title: 'Scripture Fetching',
			description: 'Get Bible verses with context, cross-references, and multiple translations'
		},
		{
			icon: MessageSquare,
			title: 'Translation Notes',
			description: 'Access detailed translation notes, cultural context, and linguistic insights'
		},
		{
			icon: Users,
			title: 'Translation Questions',
			description: 'Find answers to common translation challenges and theological questions'
		},
		{
			icon: Code,
			title: 'Translation Words',
			description: 'Get definitions, usage examples, and semantic domains for key terms'
		},
		{
			icon: Globe,
			title: 'Multi-language Support',
			description: 'Work with multiple languages and translation organizations'
		},
		{
			icon: Sparkles,
			title: 'AI Integration',
			description: 'Seamlessly integrate with LLMs for natural language Bible study'
		}
	];

	const quickStartSteps = [
		{
			step: 1,
			title: 'Use REST API',
			description: 'Make direct HTTP requests to get Bible translation resources',
			code: 'curl "https://translation-helps-mcp.netlify.app/api/fetch-scripture?reference=John%203:16&language=en&organization=unfoldingWord"'
		},
		{
			step: 2,
			title: 'Or Use MCP Server',
			description: 'Run the MCP server locally for AI integration',
			code: 'git clone repo && npm install && npx tsx src/index.ts'
		},
		{
			step: 3,
			title: 'Get Rich Responses',
			description: 'Receive structured data with scripture, notes, and context',
			code: 'Scripture + Translation Notes + Word Definitions'
		}
	];
</script>

<svelte:head>
	<title>Translation Helps MCP Server - AI-Powered Bible Translation Assistance</title>
</svelte:head>

<div class="relative">
	<!-- Hero Section -->
	<section class="relative px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl text-center">
			<div class="mb-8">
				<div
					class="mb-6 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300"
				>
					<Zap class="mr-2 h-4 w-4" />
					AI-Powered Bible Translation Assistance
				</div>
				<h1 class="mb-6 text-5xl leading-tight font-bold text-white md:text-7xl">
					Translation Helps
					<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
						>MCP Server</span
					>
				</h1>
				<p class="mx-auto max-w-4xl text-xl leading-relaxed text-gray-300 md:text-2xl">
					Supercharge your LLM with real-time access to Bible scripture, translation notes, and
					linguistic resources. Build AI applications that understand the Bible like never before.
				</p>
			</div>

			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<a
					href="/test"
					class="inline-flex transform items-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-purple-700 hover:to-blue-700"
				>
					<TestTube class="mr-2 h-5 w-5" />
					Test the API
					<ArrowRight class="ml-2 h-5 w-5" />
				</a>
				<a
					href="/chat"
					class="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:bg-white/20"
				>
					<MessageSquare class="mr-2 h-5 w-5" />
					Try AI Chat
				</a>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="mb-16 text-center">
				<h2 class="mb-6 text-4xl font-bold text-white md:text-5xl">
					Everything You Need for
					<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
						>Bible AI</span
					>
				</h2>
				<p class="mx-auto max-w-3xl text-xl text-gray-300">
					Access comprehensive Bible translation resources through a simple, powerful API designed
					for AI integration.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
				{#each features as feature}
					<div
						class="group rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:transform hover:border-purple-500/30"
					>
						<div
							class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 transition-transform duration-300 group-hover:scale-110"
						>
							<svelte:component this={feature.icon} class="h-6 w-6 text-white" />
						</div>
						<h3 class="mb-4 text-xl font-semibold text-white">{feature.title}</h3>
						<p class="leading-relaxed text-gray-300">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Quick Start Section -->
	<section class="px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="mb-16 text-center">
				<h2 class="mb-6 text-4xl font-bold text-white md:text-5xl">
					Get Started in
					<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
						>3 Steps</span
					>
				</h2>
				<p class="mx-auto max-w-3xl text-xl text-gray-300">
					Integrate the Translation Helps MCP server with your LLM and start building AI-powered
					Bible applications.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				{#each quickStartSteps as step}
					<div class="relative">
						<div class="h-full rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
							<div
								class="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-lg font-bold text-white"
							>
								{step.step}
							</div>
							<h3 class="mb-4 text-xl font-semibold text-white">{step.title}</h3>
							<p class="mb-6 leading-relaxed text-gray-300">{step.description}</p>
							<div class="rounded-lg border border-white/10 bg-black/30 p-4">
								<code class="text-sm break-all text-purple-300">{step.code}</code>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Use Cases Section -->
	<section class="px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="mb-16 text-center">
				<h2 class="mb-6 text-4xl font-bold text-white md:text-5xl">
					Perfect for
					<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
						>Any Bible AI</span
					>
				</h2>
				<p class="mx-auto max-w-3xl text-xl text-gray-300">
					From translation assistants to theological chatbots, the Translation Helps MCP server
					powers the next generation of Bible AI.
				</p>
			</div>

			<div class="grid grid-cols-1 gap-12 lg:grid-cols-2">
				<!-- LLM Integration -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
					<div class="mb-6 flex items-center">
						<div
							class="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-blue-500"
						>
							<MessageSquare class="h-6 w-6 text-white" />
						</div>
						<h3 class="text-2xl font-semibold text-white">LLM Integration</h3>
					</div>
					<p class="mb-6 leading-relaxed text-gray-300">
						Connect any LLM to the Translation Helps MCP server and instantly give it access to
						comprehensive Bible resources. Your AI can now answer questions about scripture, provide
						translation insights, and assist with Bible study.
					</p>
					<ul class="space-y-3 text-gray-300">
						<li class="flex items-center">
							<div class="mr-3 h-2 w-2 rounded-full bg-purple-400"></div>
							Natural language Bible queries
						</li>
						<li class="flex items-center">
							<div class="mr-3 h-2 w-2 rounded-full bg-purple-400"></div>
							Contextual translation assistance
						</li>
						<li class="flex items-center">
							<div class="mr-3 h-2 w-2 rounded-full bg-purple-400"></div>
							Theological question answering
						</li>
					</ul>
				</div>

				<!-- Manual Testing -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
					<div class="mb-6 flex items-center">
						<div
							class="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500"
						>
							<TestTube class="h-6 w-6 text-white" />
						</div>
						<h3 class="text-2xl font-semibold text-white">Manual Testing</h3>
					</div>
					<p class="mb-6 leading-relaxed text-gray-300">
						Test individual endpoints or run comprehensive bulk tests to verify functionality and
						performance. Perfect for development, debugging, and understanding the API capabilities.
					</p>
					<ul class="space-y-3 text-gray-300">
						<li class="flex items-center">
							<div class="mr-3 h-2 w-2 rounded-full bg-purple-400"></div>
							Individual endpoint testing
						</li>
						<li class="flex items-center">
							<div class="mr-3 h-2 w-2 rounded-full bg-purple-400"></div>
							Bulk test suites with timing
						</li>
						<li class="flex items-center">
							<div class="mr-3 h-2 w-2 rounded-full bg-purple-400"></div>
							Copy-paste debug output
						</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="px-4 py-20 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-4xl text-center">
			<div
				class="rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-12 backdrop-blur-xl"
			>
				<h2 class="mb-6 text-4xl font-bold text-white md:text-5xl">
					Ready to Build the Future of
					<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
						>Bible AI?</span
					>
				</h2>
				<p class="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
					Start exploring the Translation Helps MCP server today and see how easy it is to create AI
					applications that truly understand the Bible.
				</p>
				<div class="flex flex-col justify-center gap-4 sm:flex-row">
					<a
						href="/test"
						class="inline-flex transform items-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:scale-105 hover:from-purple-700 hover:to-blue-700"
					>
						<TestTube class="mr-2 h-5 w-5" />
						Start Testing
						<ArrowRight class="ml-2 h-5 w-5" />
					</a>
					<a
						href="/chat"
						class="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-xl transition-all duration-200 hover:bg-white/20"
					>
						<MessageSquare class="mr-2 h-5 w-5" />
						Try AI Chat
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer Section -->
	<section class="border-t border-white/10 px-4 py-12 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				<!-- Project Info -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">Translation Helps MCP</h3>
					<p class="text-sm leading-relaxed text-gray-300">
						High-performance, serverless API for aggregating Bible translation resources from
						Door43. Built with TypeScript, SvelteKit, and Netlify Functions.
					</p>
				</div>

				<!-- Links -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">Resources</h3>
					<ul class="space-y-2 text-sm">
						<li>
							<a
								href="https://github.com/klappy/translation-helps-mcp"
								class="text-gray-300 transition-colors hover:text-purple-400"
							>
								GitHub Repository
							</a>
						</li>
						<li>
							<a href="/test" class="text-gray-300 transition-colors hover:text-purple-400">
								API Testing
							</a>
						</li>
						<li>
							<a href="/chat" class="text-gray-300 transition-colors hover:text-purple-400">
								AI Chat Demo
							</a>
						</li>
					</ul>
				</div>

				<!-- License -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">License</h3>
					<div class="text-sm text-gray-300">
						<p class="mb-2">This project is licensed under the MIT License.</p>
						<p class="text-xs text-gray-400">Copyright © 2025 Christopher Klapp</p>
						<a
							href="https://github.com/klappy/translation-helps-mcp/blob/main/LICENSE"
							class="text-xs text-purple-400 transition-colors hover:text-purple-300"
						>
							View Full License
						</a>
					</div>
				</div>
			</div>

			<div class="mt-8 border-t border-white/10 pt-8 text-center">
				<p class="text-sm text-gray-400">Made with ❤️ for the Bible translation community</p>
			</div>
		</div>
	</section>
</div>
