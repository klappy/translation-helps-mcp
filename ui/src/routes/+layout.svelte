<script lang="ts">
	import { page } from '$app/stores';
	import {
		Zap,
		TestTube,
		MessageSquare,
		Code,
		Menu,
		X,
		ExternalLink,
		Github,
		BookOpen,
		Settings,
		HelpCircle,
		TrendingUp,
		Wrench
	} from 'lucide-svelte';
	import '../app.css';
	import { VERSION } from '$lib/version';

	// Navigation items
	const navItems = [
		{
			href: '/',
			label: 'Home',
			icon: Zap,
			description: 'Overview and features'
		},
		{
			href: '/test',
			label: 'Test',
			icon: TestTube,
			description: 'Test API endpoints'
		},
		{
			href: '/chat',
			label: 'Chat',
			icon: MessageSquare,
			description: 'AI-powered Bible assistant'
		},
		{
			href: '/mcp-tools',
			label: 'MCP Tools API',
			icon: Code,
			description: 'MCP server tools and API documentation'
		},
		{
			href: '/performance',
			label: 'Performance',
			icon: TrendingUp,
			description: 'Performance & cost analysis'
		},
		{
			href: '/rag-manifesto',
			label: 'RAG Manifesto',
			icon: Zap,
			description: 'The right way to do Bible RAG'
		}
	];

	// Mobile menu state
	let mobileMenuOpen = false;
	let currentPath = '';

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	// Close mobile menu when route changes
	$: {
		if (currentPath && currentPath !== $page.url.pathname && mobileMenuOpen) {
			closeMobileMenu();
		}
		currentPath = $page.url.pathname;
	}
</script>

<svelte:head>
	<title>Translation Helps MCP - {VERSION}</title>
	<meta name="description" content="Bible translation resources API and MCP server" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900" role="main">
	<!-- Navigation -->
	<nav class="relative z-50">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<!-- Logo -->
				<div class="flex items-center space-x-3">
					<a href="/" class="group flex items-center space-x-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 transition-transform duration-200 group-hover:scale-110"
						>
							<BookOpen class="h-6 w-6 text-white" />
						</div>
						<div class="hidden sm:block">
							<div class="text-lg font-bold text-white">Translation Helps</div>
							<div class="text-xs text-gray-400">MCP Server v{VERSION}</div>
						</div>
					</a>
				</div>

				<!-- Desktop Navigation -->
				<div class="hidden items-center space-x-1 md:flex">
					{#each navItems as item}
						<a
							href={item.href}
							class="group relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 {$page
								.url.pathname === item.href
								? 'bg-white/10 text-white'
								: 'text-gray-300 hover:bg-white/5 hover:text-white'}"
						>
							<div class="flex items-center space-x-2">
								<svelte:component this={item.icon} class="h-4 w-4" />
								<span>{item.label}</span>
							</div>

							<!-- Tooltip -->
							<div
								class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs whitespace-nowrap text-gray-300 opacity-0 backdrop-blur-xl transition-opacity duration-200 group-hover:opacity-100"
							>
								{item.description}
								<div
									class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-transparent border-t-black/90"
								></div>
							</div>
						</a>
					{/each}
				</div>

				<!-- Right side actions -->
				<div class="flex items-center space-x-4">
					<!-- Version Badge -->
					<div class="hidden sm:block">
						<div
							class="rounded-full bg-emerald-600/20 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-600/30"
						>
							v{VERSION}
						</div>
					</div>

					<!-- GitHub Link -->
					<a
						href="https://github.com/klappy/translation-helps-mcp"
						target="_blank"
						rel="noopener noreferrer"
						class="hidden items-center space-x-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-gray-300 transition-all duration-200 hover:bg-white/10 hover:text-white sm:flex"
					>
						<Github class="h-4 w-4" />
						<span class="text-sm font-medium">GitHub</span>
						<ExternalLink class="h-3 w-3" />
					</a>

					<!-- Mobile menu button -->
					<button
						on:click={toggleMobileMenu}
						type="button"
						aria-label="Toggle mobile menu"
						aria-expanded={mobileMenuOpen}
						class="rounded-lg border border-white/10 p-3 text-gray-300 transition-all duration-200 md:hidden {mobileMenuOpen
							? 'bg-white/10 text-white'
							: 'bg-white/5 hover:bg-white/10 hover:text-white'}"
					>
						{#if mobileMenuOpen}
							<X class="h-5 w-5" />
						{:else}
							<Menu class="h-5 w-5" />
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Mobile Navigation -->
		{#if mobileMenuOpen}
			<div
				data-testid="mobile-menu"
				class="absolute top-full right-0 left-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-xl md:hidden"
			>
				<div class="space-y-4 px-4 py-6">
					{#each navItems as item}
						<a
							href={item.href}
							class="flex items-center space-x-3 rounded-lg p-3 transition-all duration-200 {$page
								.url.pathname === item.href
								? 'bg-white/10 text-white'
								: 'text-gray-300 hover:bg-white/5 hover:text-white'}"
						>
							<svelte:component this={item.icon} class="h-5 w-5" />
							<div>
								<div class="font-medium">{item.label}</div>
								<div class="text-sm text-gray-400">{item.description}</div>
							</div>
						</a>
					{/each}

					<div class="border-t border-white/10 pt-4">
						<a
							href="https://github.com/klappy/translation-helps-mcp"
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center space-x-3 rounded-lg p-3 text-gray-300 transition-all duration-200 hover:bg-white/5 hover:text-white"
						>
							<Github class="h-5 w-5" />
							<div>
								<div class="font-medium">GitHub</div>
								<div class="text-sm text-gray-400">View source code</div>
							</div>
							<ExternalLink class="ml-auto h-4 w-4" />
						</a>
					</div>
				</div>
			</div>
		{/if}
	</nav>

	<!-- Page Content -->
	<main>
		<slot />
	</main>

	<!-- Footer -->
	<footer class="relative mt-20 border-t border-white/10">
		<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
			<div class="grid grid-cols-1 gap-8 md:grid-cols-4">
				<!-- Brand -->
				<div class="md:col-span-2">
					<div class="mb-4 flex items-center space-x-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500"
						>
							<BookOpen class="h-6 w-6 text-white" />
						</div>
						<div>
							<div class="text-lg font-bold text-white">Translation Helps</div>
							<div class="text-sm text-gray-400">MCP Server</div>
						</div>
					</div>
					<p class="mb-6 max-w-md text-gray-300">
						AI-powered Bible translation assistance through the Model Context Protocol. Supercharge
						your LLM with comprehensive Bible resources.
					</p>
					<div class="flex items-center space-x-4">
						<a
							href="https://github.com/klappy/translation-helps-mcp"
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center space-x-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-gray-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
						>
							<Github class="h-4 w-4" />
							<span class="text-sm font-medium">GitHub</span>
						</a>
					</div>
				</div>

				<!-- Quick Links -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">Quick Links</h3>
					<div class="space-y-3">
						{#each navItems as item}
							<a
								href={item.href}
								class="flex items-center space-x-2 text-gray-300 transition-colors hover:text-white"
							>
								<svelte:component this={item.icon} class="h-4 w-4" />
								<span class="text-sm">{item.label}</span>
							</a>
						{/each}
					</div>
				</div>

				<!-- Resources -->
				<div>
					<h3 class="mb-4 text-lg font-semibold text-white">Resources</h3>
					<div class="space-y-3">
						<a
							href="/mcp-tools"
							class="flex items-center space-x-2 text-gray-300 transition-colors hover:text-white"
						>
							<Code class="h-4 w-4" />
							<span class="text-sm">MCP Tools API</span>
						</a>
						<a
							href="/test"
							class="flex items-center space-x-2 text-gray-300 transition-colors hover:text-white"
						>
							<TestTube class="h-4 w-4" />
							<span class="text-sm">Test API</span>
						</a>
					</div>
				</div>
			</div>

			<div class="mt-12 border-t border-white/10 pt-8">
				<div class="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
					<div class="text-sm text-gray-400">
						© 2025 Translation Helps MCP Server. Built with ❤️ for the Bible translation community.
					</div>
					<div class="flex items-center space-x-6 text-sm text-gray-400">
						<div
							class="rounded-full bg-purple-600/20 px-3 py-1 text-xs font-medium text-purple-300 ring-1 ring-purple-600/30"
						>
							v{VERSION}
						</div>
						<a
							href="https://github.com/klappy/translation-helps-mcp"
							target="_blank"
							rel="noopener noreferrer"
							class="transition-colors hover:text-white">GitHub</a
						>
						<a href="/mcp-tools" class="transition-colors hover:text-white">MCP Tools API</a>
						<a href="/test" class="transition-colors hover:text-white">Test</a>
					</div>
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	/* Custom scrollbar */
	::-webkit-scrollbar {
		width: 8px;
	}

	::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
	}

	::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	/* Focus styles */
	*:focus {
		outline: 2px solid rgba(168, 85, 247, 0.5);
		outline-offset: 2px;
	}

	/* Selection styles */
	::selection {
		background: rgba(168, 85, 247, 0.3);
		color: white;
	}
</style>
