<script lang="ts">
	import { VERSION } from '$lib/version.js';
	import { onMount } from 'svelte';

	let version = '';

	onMount(() => {
		version = VERSION;
	});
</script>

<svelte:head>
	<title>Translation Helps MCP | unfoldingWord Strategic Language Resources</title>
	<meta
		name="description"
		content="High-performance API platform providing instant access to unfoldingWord translation resources with word-level alignment precision for Mother Tongue Translators worldwide."
	/>
	<meta
		name="keywords"
		content="unfoldingWord, Strategic Languages, ULT, UST, GLT, GST, Translation Notes, Translation Words, Mother Tongue Translator, Bible translation, word alignment, MCP server"
	/>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Hero Section -->
	<section class="mb-16 text-center">
		<h1 class="mb-6 text-5xl font-bold text-blue-900">Translation Helps Platform</h1>
		<p class="mx-auto mb-8 max-w-4xl text-xl text-gray-700">
			High-performance API platform providing <strong
				>instant access to unfoldingWord translation resources</strong
			>
			with <strong>word-level alignment precision</strong> for Mother Tongue Translators worldwide.
		</p>

		<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
			<div class="rounded-lg bg-blue-50 p-6">
				<h3 class="mb-2 text-lg font-semibold text-blue-800">Strategic Language Bridge</h3>
				<p class="text-sm text-gray-600">
					Access comprehensive translation resources in Strategic Languages (English, Spanish,
					French, etc.) to translate Scripture into heart languages
				</p>
			</div>
			<div class="rounded-lg bg-green-50 p-6">
				<h3 class="mb-2 text-lg font-semibold text-green-800">Word-Level Precision</h3>
				<p class="text-sm text-gray-600">
					USFM 3.0 alignment data connects every word between original languages and Strategic
					Languages for precise translation guidance
				</p>
			</div>
			<div class="rounded-lg bg-purple-50 p-6">
				<h3 class="mb-2 text-lg font-semibold text-purple-800">AI-Native Integration</h3>
				<p class="text-sm text-gray-600">
					MCP protocol enables AI assistants to provide contextual translation help with
					comprehensive unfoldingWord resource access
				</p>
			</div>
		</div>

		<div class="flex justify-center space-x-4">
			<a
				href="/test"
				class="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
			>
				Try Live Demo
			</a>
			<a
				href="/api-docs"
				class="rounded-lg border border-blue-600 px-6 py-3 text-blue-600 transition-colors hover:bg-blue-50"
			>
				Interactive API Docs
			</a>
		</div>
	</section>

	<!-- Translation Approaches Section -->
	<section class="mb-16">
		<h2 class="mb-12 text-center text-3xl font-bold text-gray-800">
			Translation Approaches Available
		</h2>

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
			<!-- Form-Centric (Literal) -->
			<div class="rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
				<div class="mb-4 flex items-center">
					<div class="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
						<span class="text-xl font-bold text-orange-600">ULT</span>
					</div>
					<div>
						<h3 class="text-xl font-semibold text-gray-800">unfoldingWord Literal Text</h3>
						<p class="text-sm text-gray-500">Form-Centric Translation</p>
					</div>
				</div>
				<p class="mb-4 text-gray-600">
					Preserves original language structure and word order. Shows how biblical authors expressed
					ideas in Hebrew and Greek.
				</p>
				<ul class="space-y-1 text-sm text-gray-600">
					<li>• Maintains source language idioms and figures of speech</li>
					<li>• Preserves grammatical structures for exegetical study</li>
					<li>• Includes embedded word alignment data</li>
					<li>• Available in English (ULT) and Strategic Languages (GLT)</li>
				</ul>
			</div>

			<!-- Meaning-Based (Simplified) -->
			<div class="rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
				<div class="mb-4 flex items-center">
					<div class="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
						<span class="text-xl font-bold text-green-600">UST</span>
					</div>
					<div>
						<h3 class="text-xl font-semibold text-gray-800">unfoldingWord Simplified Text</h3>
						<p class="text-sm text-gray-500">Meaning-Based Translation</p>
					</div>
				</div>
				<p class="mb-4 text-gray-600">
					Demonstrates clear, natural expression of biblical meaning. Shows how to communicate
					biblical concepts in everyday language.
				</p>
				<ul class="space-y-1 text-sm text-gray-600">
					<li>• Uses contemporary vocabulary and sentence structure</li>
					<li>• Explains cultural concepts in accessible terms</li>
					<li>• Includes clarity and readability metrics</li>
					<li>• Available in English (UST) and Strategic Languages (GST)</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Translation Helps Section -->
	<section class="mb-16">
		<h2 class="mb-12 text-center text-3xl font-bold text-gray-800">
			Comprehensive Translation Helps
		</h2>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			<div class="rounded-lg bg-white p-6 shadow-md">
				<h3 class="mb-3 text-lg font-semibold text-blue-600">Translation Notes (tN)</h3>
				<p class="text-sm text-gray-600">
					Verse-by-verse explanations for difficult passages with cultural background and
					alternative rendering options.
				</p>
			</div>

			<div class="rounded-lg bg-white p-6 shadow-md">
				<h3 class="mb-3 text-lg font-semibold text-green-600">Translation Words (tW)</h3>
				<p class="text-sm text-gray-600">
					Comprehensive biblical term definitions with cross-references and usage examples
					throughout Scripture.
				</p>
			</div>

			<div class="rounded-lg bg-white p-6 shadow-md">
				<h3 class="mb-3 text-lg font-semibold text-purple-600">Translation Words Links (tWL)</h3>
				<p class="text-sm text-gray-600">
					Precise mapping of word occurrences to Translation Words articles for contextual term
					definitions.
				</p>
			</div>

			<div class="rounded-lg bg-white p-6 shadow-md">
				<h3 class="mb-3 text-lg font-semibold text-red-600">Translation Questions (tQ)</h3>
				<p class="text-sm text-gray-600">
					Comprehension validation questions for community checking and translation quality
					assurance.
				</p>
			</div>

			<div class="rounded-lg bg-white p-6 shadow-md">
				<h3 class="mb-3 text-lg font-semibold text-yellow-600">Translation Academy (tA)</h3>
				<p class="text-sm text-gray-600">
					Translation methodology and best practices training modules for systematic translator
					development.
				</p>
			</div>

			<div class="rounded-lg bg-white p-6 shadow-md">
				<h3 class="mb-3 text-lg font-semibold text-indigo-600">Open Bible Stories (OBS)</h3>
				<p class="text-sm text-gray-600">
					Chronological Scripture overview through 50 key Bible stories for foundational biblical
					literacy.
				</p>
			</div>
		</div>
	</section>

	<!-- Technical Features Section -->
	<section class="mb-16">
		<h2 class="mb-12 text-center text-3xl font-bold text-gray-800">Technical Architecture</h2>

		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<div class="space-y-6">
				<div class="flex items-start space-x-4">
					<div
						class="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100"
					>
						<span class="text-sm font-bold text-blue-600">⚡</span>
					</div>
					<div>
						<h3 class="mb-2 font-semibold text-gray-800">Edge-Optimized Performance</h3>
						<p class="text-sm text-gray-600">
							Sub-200ms response times with intelligent caching and request coalescing. Deployed
							globally on Cloudflare Workers.
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-4">
					<div
						class="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100"
					>
						<span class="text-sm font-bold text-green-600">🔗</span>
					</div>
					<div>
						<h3 class="mb-2 font-semibold text-gray-800">USFM 3.0 Alignment Parsing</h3>
						<p class="text-sm text-gray-600">
							Advanced word-level alignment extraction with Strong's numbers, lemmas, and
							morphological data for precision translation.
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-4">
					<div
						class="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100"
					>
						<span class="text-sm font-bold text-purple-600">🤖</span>
					</div>
					<div>
						<h3 class="mb-2 font-semibold text-gray-800">MCP Protocol Integration</h3>
						<p class="text-sm text-gray-600">
							Native Model Context Protocol support enables AI assistants to provide contextual
							translation guidance with full resource access.
						</p>
					</div>
				</div>
			</div>

			<div class="space-y-6">
				<div class="flex items-start space-x-4">
					<div
						class="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100"
					>
						<span class="text-sm font-bold text-orange-600">📊</span>
					</div>
					<div>
						<h3 class="mb-2 font-semibold text-gray-800">Real-Time Analytics</h3>
						<p class="text-sm text-gray-600">
							Performance monitoring, alignment confidence scoring, and clarity metrics for
							data-driven translation quality assessment.
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-4">
					<div
						class="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100"
					>
						<span class="text-sm font-bold text-red-600">🔒</span>
					</div>
					<div>
						<h3 class="mb-2 font-semibold text-gray-800">Production-Grade Security</h3>
						<p class="text-sm text-gray-600">
							Rate limiting, input validation, DDoS protection, and secure headers ensure reliable
							service for global translation teams.
						</p>
					</div>
				</div>

				<div class="flex items-start space-x-4">
					<div
						class="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100"
					>
						<span class="text-sm font-bold text-yellow-600">♾️</span>
					</div>
					<div>
						<h3 class="mb-2 font-semibold text-gray-800">Infinite Scalability</h3>
						<p class="text-sm text-gray-600">
							Serverless architecture handles 10,000+ concurrent users with automatic scaling and
							zero infrastructure management required.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
		<div class="mb-4 flex items-center justify-center space-x-4">
			<span>Translation Helps Platform</span>
			<span>•</span>
			<span>Version {version}</span>
			<span>•</span>
			<span>Powered by unfoldingWord</span>
		</div>
		<p class="text-xs">
			Supporting Mother Tongue Translators worldwide with Strategic Language resources and
			word-level alignment precision for accurate biblical translation.
		</p>
	</footer>
</div>
