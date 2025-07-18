<script lang="ts">
	import { ArrowRight, Zap, MessageSquare, TestTube, Code, Globe, BookOpen, Users, Sparkles } from 'lucide-svelte';

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
			title: 'Connect to MCP Server',
			description: 'Configure your LLM to use the Translation Helps MCP server',
			code: 'mcp://localhost:8888/.netlify/functions/'
		},
		{
			step: 2,
			title: 'Ask Natural Questions',
			description: 'Use natural language to query Bible data',
			code: '"What does Titus 1:1 say about Paul\'s apostleship?"'
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
	<section class="relative py-20 px-4 sm:px-6 lg:px-8">
		<div class="max-w-7xl mx-auto text-center">
			<div class="mb-8">
				<div class="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6">
					<Zap class="w-4 h-4 mr-2" />
					AI-Powered Bible Translation Assistance
				</div>
				<h1 class="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
					Translation Helps
					<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">MCP Server</span>
				</h1>
				<p class="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
					Supercharge your LLM with real-time access to Bible scripture, translation notes, and linguistic resources. 
					Build AI applications that understand the Bible like never before.
				</p>
			</div>

			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a
					href="/test"
					class="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
				>
					<TestTube class="w-5 h-5 mr-2" />
					Test the API
					<ArrowRight class="w-5 h-5 ml-2" />
				</a>
				<a
					href="/chat"
					class="inline-flex items-center px-8 py-4 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white font-semibold text-lg hover:bg-white/20 transition-all duration-200"
				>
					<MessageSquare class="w-5 h-5 mr-2" />
					Try AI Chat
				</a>
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="py-20 px-4 sm:px-6 lg:px-8">
		<div class="max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
					Everything You Need for
					<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Bible AI</span>
				</h2>
				<p class="text-xl text-gray-300 max-w-3xl mx-auto">
					Access comprehensive Bible translation resources through a simple, powerful API designed for AI integration.
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{#each features as feature}
					<div class="group p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:transform hover:scale-105">
						<div class="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
							<svelte:component this={feature.icon} class="w-6 h-6 text-white" />
						</div>
						<h3 class="text-xl font-semibold text-white mb-4">{feature.title}</h3>
						<p class="text-gray-300 leading-relaxed">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Quick Start Section -->
	<section class="py-20 px-4 sm:px-6 lg:px-8">
		<div class="max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
					Get Started in
					<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">3 Steps</span>
				</h2>
				<p class="text-xl text-gray-300 max-w-3xl mx-auto">
					Integrate the Translation Helps MCP server with your LLM and start building AI-powered Bible applications.
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				{#each quickStartSteps as step}
					<div class="relative">
						<div class="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 h-full">
							<div class="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mb-6 text-white font-bold text-lg">
								{step.step}
							</div>
							<h3 class="text-xl font-semibold text-white mb-4">{step.title}</h3>
							<p class="text-gray-300 mb-6 leading-relaxed">{step.description}</p>
							<div class="bg-black/30 rounded-lg p-4 border border-white/10">
								<code class="text-purple-300 text-sm break-all">{step.code}</code>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Use Cases Section -->
	<section class="py-20 px-4 sm:px-6 lg:px-8">
		<div class="max-w-7xl mx-auto">
			<div class="text-center mb-16">
				<h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
					Perfect for
					<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Any Bible AI</span>
				</h2>
				<p class="text-xl text-gray-300 max-w-3xl mx-auto">
					From translation assistants to theological chatbots, the Translation Helps MCP server powers the next generation of Bible AI.
				</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
				<!-- LLM Integration -->
				<div class="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
					<div class="flex items-center mb-6">
						<div class="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center mr-4">
							<MessageSquare class="w-6 h-6 text-white" />
						</div>
						<h3 class="text-2xl font-semibold text-white">LLM Integration</h3>
					</div>
					<p class="text-gray-300 mb-6 leading-relaxed">
						Connect any LLM to the Translation Helps MCP server and instantly give it access to comprehensive Bible resources. 
						Your AI can now answer questions about scripture, provide translation insights, and assist with Bible study.
					</p>
					<ul class="space-y-3 text-gray-300">
						<li class="flex items-center">
							<div class="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
							Natural language Bible queries
						</li>
						<li class="flex items-center">
							<div class="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
							Contextual translation assistance
						</li>
						<li class="flex items-center">
							<div class="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
							Theological question answering
						</li>
					</ul>
				</div>

				<!-- Manual Testing -->
				<div class="p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
					<div class="flex items-center mb-6">
						<div class="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mr-4">
							<TestTube class="w-6 h-6 text-white" />
						</div>
						<h3 class="text-2xl font-semibold text-white">Manual Testing</h3>
					</div>
					<p class="text-gray-300 mb-6 leading-relaxed">
						Test individual endpoints or run comprehensive bulk tests to verify functionality and performance. 
						Perfect for development, debugging, and understanding the API capabilities.
					</p>
					<ul class="space-y-3 text-gray-300">
						<li class="flex items-center">
							<div class="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
							Individual endpoint testing
						</li>
						<li class="flex items-center">
							<div class="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
							Bulk test suites with timing
						</li>
						<li class="flex items-center">
							<div class="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
							Copy-paste debug output
						</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="py-20 px-4 sm:px-6 lg:px-8">
		<div class="max-w-4xl mx-auto text-center">
			<div class="p-12 rounded-3xl bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-xl border border-purple-500/30">
				<h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
					Ready to Build the Future of
					<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Bible AI?</span>
				</h2>
				<p class="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
					Start exploring the Translation Helps MCP server today and see how easy it is to create AI applications that truly understand the Bible.
				</p>
				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					<a
						href="/test"
						class="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
					>
						<TestTube class="w-5 h-5 mr-2" />
						Start Testing
						<ArrowRight class="w-5 h-5 ml-2" />
					</a>
					<a
						href="/chat"
						class="inline-flex items-center px-8 py-4 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white font-semibold text-lg hover:bg-white/20 transition-all duration-200"
					>
						<MessageSquare class="w-5 h-5 mr-2" />
						Try AI Chat
					</a>
				</div>
			</div>
		</div>
	</section>
</div>
