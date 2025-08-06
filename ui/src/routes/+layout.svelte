<script lang="ts">
	import { page } from '$app/stores';
	import { VERSION } from '$lib/version';
	import {
		BookOpen,
		Code,
		Droplets,
		ExternalLink,
		FileText,
		Github,
		Info,
		Menu,
		MessageSquare,
		ScrollText,
		TrendingUp,
		X,
		Zap
	} from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import '../app.css';

	// Navigation items
	const navItems = [
		{
			href: '/',
			label: 'Home',
			icon: Zap,
			description: 'Overview and features'
		},
		{
			href: '/chat',
			label: 'Chat',
			icon: MessageSquare,
			description: 'AI-powered Bible assistant'
		},
		{
			href: '/mcp-tools',
			label: 'MCP Tools',
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
		},
		{
			href: '/changelog',
			label: 'Changelog',
			icon: ScrollText,
			description: 'Latest updates and improvements'
		},
		{
			href: '/whitepaper',
			label: 'Whitepaper',
			icon: FileText,
			description: 'Detailed technical explanation'
		},
		{
			href: '/about',
			label: 'About',
			icon: Info,
			description: 'Learn more about The Aqueduct'
		}
	];

	// Mobile menu state
	let mobileMenuOpen = false;
	let currentPath = '';
	let isNavigating = false;
	let navigationError = false;

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
		navigationError = false;
	}

	// Handle navigation with loading state
	async function handleNavigation(e: MouseEvent, href: string) {
		e.preventDefault();
		
		// Provide immediate visual feedback
		isNavigating = true;
		navigationError = false;
		
		try {
			// Import navigation functions
			const { goto } = await import('$app/navigation');
			
			// Navigate to the page
			await goto(href);
			
			// Close menu on successful navigation
			closeMobileMenu();
		} catch (error) {
			console.error('Navigation error:', error);
			navigationError = true;
			
			// Try fallback navigation
			window.location.href = href;
		} finally {
			isNavigating = false;
		}
	}

	// Close mobile menu when route changes
	$: {
		if (currentPath && currentPath !== $page.url.pathname && mobileMenuOpen) {
			closeMobileMenu();
		}
		currentPath = $page.url.pathname;
	}

	// Health monitoring lifecycle
	onMount(() => {
		// startHealthMonitoring(); // Single check on page load
	});

	onDestroy(() => {
		// stopHealthMonitoring();
	});
</script>

<svelte:head>
	<title>The Aqueduct - {VERSION}</title>
	<meta
		name="description"
		content="Stateless RAG for Bible Translation. Cache-first. LLM-native. Order without control."
	/>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

<div class="relative min-h-screen overflow-hidden">
	<!-- Animated Background -->
	<div class="fixed inset-0 overflow-hidden">
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

	<!-- Navigation -->
	<nav class="relative z-50">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<!-- Logo -->
				<div class="flex items-center space-x-3">
					<a href="/" class="group flex items-center space-x-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12"
						>
							<Droplets class="h-6 w-6 text-white" />
						</div>
						<div class="hidden sm:block">
							<div
								class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-lg font-bold text-transparent"
							>
								The Aqueduct
							</div>
							<div class="text-xs text-blue-200">Stateless RAG • v{VERSION}</div>
						</div>
					</a>
				</div>

				<!-- Desktop Navigation -->
				<div class="hidden items-center space-x-1 md:flex">
					{#each navItems as item}
						<a
							href={item.href}
							class="group relative rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 {$page
								.url.pathname === item.href
								? 'border border-white/20 bg-white/20 text-white shadow-lg backdrop-blur-xl'
								: 'border border-transparent text-blue-200 backdrop-blur-xl hover:border-white/10 hover:bg-white/10 hover:text-white'}"
						>
							<div class="flex items-center space-x-2">
								<svelte:component this={item.icon} class="h-4 w-4" />
								<span>{item.label}</span>
							</div>

							<!-- Tooltip -->
							<div
								class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform rounded-lg border border-blue-500/30 bg-black/90 px-3 py-2 text-xs whitespace-nowrap text-blue-200 opacity-0 backdrop-blur-xl transition-opacity duration-200 group-hover:opacity-100"
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
							class="rounded-full bg-gradient-to-r from-emerald-500/20 to-green-500/20 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30 backdrop-blur-xl"
						>
							v{VERSION}
						</div>
					</div>

					<!-- GitHub Link -->
					<a
						href="https://github.com/klappy/translation-helps-mcp"
						target="_blank"
						rel="noopener noreferrer"
						class="hidden items-center space-x-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-blue-200 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-white/30 hover:bg-white/10 hover:text-white sm:flex"
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
						class="rounded-xl border border-white/20 p-3 text-blue-200 backdrop-blur-xl transition-all duration-300 md:hidden {mobileMenuOpen
							? 'border-white/30 bg-white/20 text-white'
							: 'bg-white/5 hover:border-white/30 hover:bg-white/10 hover:text-white'}"
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
				class="absolute top-full right-0 left-0 z-50 border-b border-blue-500/30 bg-black/95 backdrop-blur-2xl md:hidden"
			>
				<div class="space-y-2 px-4 py-6">
					{#if navigationError}
						<div class="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
							<p class="text-sm">Navigation error occurred. Retrying...</p>
						</div>
					{/if}
					
					{#each navItems as item}
						<a
							href={item.href}
							on:click={(e) => handleNavigation(e, item.href)}
							class="flex items-center space-x-3 rounded-xl p-3 transition-all duration-300 {$page
								.url.pathname === item.href
								? 'border border-white/20 bg-white/20 text-white'
								: 'border border-transparent text-blue-200 hover:border-white/10 hover:bg-white/10 hover:text-white'} backdrop-blur-xl {isNavigating ? 'pointer-events-none opacity-50' : ''}"
						>
							<svelte:component this={item.icon} class="h-5 w-5 {isNavigating ? 'animate-spin' : ''}" />
							<div>
								<div class="font-medium">
									{item.label}
									{#if isNavigating}
										<span class="ml-2 text-xs text-blue-300">(Loading...)</span>
									{/if}
								</div>
								<div class="text-sm text-blue-300/70">{item.description}</div>
							</div>
							{#if $page.url.pathname === item.href}
								<div class="ml-auto h-2 w-2 rounded-full bg-emerald-400"></div>
							{/if}
						</a>
					{/each}

					<div class="border-t border-blue-500/30 pt-4">
						<a
							href="https://github.com/klappy/translation-helps-mcp"
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center space-x-3 rounded-xl border border-transparent p-3 text-blue-200 backdrop-blur-xl transition-all duration-300 hover:border-white/10 hover:bg-white/10 hover:text-white"
						>
							<Github class="h-5 w-5" />
							<div>
								<div class="font-medium">GitHub</div>
								<div class="text-sm text-blue-300/70">View source code</div>
							</div>
							<ExternalLink class="ml-auto h-4 w-4" />
						</a>
					</div>
				</div>
			</div>
		{/if}
	</nav>

	<!-- Page Content -->
	<main class="relative">
		<slot />
	</main>

	<!-- Footer -->
	<footer class="relative mt-20 border-t border-blue-500/30">
		<div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
			<div class="grid grid-cols-1 gap-12 md:grid-cols-4">
				<!-- Brand -->
				<div class="md:col-span-2">
					<div class="mb-6 flex items-center space-x-3">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 transition-transform duration-300 hover:scale-110"
						>
							<Droplets class="h-7 w-7 text-white" />
						</div>
						<div>
							<div
								class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-xl font-bold text-transparent"
							>
								The Aqueduct
							</div>
							<div class="text-sm text-blue-200">Stateless RAG • MCP Server</div>
						</div>
					</div>
					<p class="mb-8 max-w-md text-lg leading-relaxed text-gray-300">
						AI-powered Bible translation assistance through the Model Context Protocol.
						<strong class="text-blue-300"
							>Supercharge your LLM with canonical Bible resources.</strong
						>
					</p>
					<div class="flex items-center space-x-4">
						<a
							href="https://github.com/klappy/translation-helps-mcp"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center space-x-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-blue-200 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-white/30 hover:bg-white/10 hover:text-white"
						>
							<Github class="h-5 w-5" />
							<span class="font-medium">GitHub</span>
						</a>
					</div>
				</div>

				<!-- Quick Links -->
				<div>
					<h3 class="mb-6 text-lg font-semibold text-white">Quick Links</h3>
					<div class="space-y-4">
						{#each navItems as item}
							<a
								href={item.href}
								class="group flex items-center space-x-3 text-gray-300 transition-all duration-300 hover:text-blue-300"
							>
								<svelte:component
									this={item.icon}
									class="h-4 w-4 transition-transform group-hover:scale-110"
								/>
								<span class="text-sm">{item.label}</span>
							</a>
						{/each}
					</div>
				</div>

				<!-- Resources -->
				<div>
					<h3 class="mb-6 text-lg font-semibold text-white">Resources</h3>
					<div class="space-y-4">
						<a
							href="/mcp-tools"
							class="group flex items-center space-x-3 text-gray-300 transition-all duration-300 hover:text-blue-300"
						>
							<Code class="h-4 w-4 transition-transform group-hover:scale-110" />
							<span class="text-sm">MCP Tools API</span>
						</a>

						<a
							href="/rag-manifesto"
							class="group flex items-center space-x-3 text-gray-300 transition-all duration-300 hover:text-blue-300"
						>
							<BookOpen class="h-4 w-4 transition-transform group-hover:scale-110" />
							<span class="text-sm">RAG Guide</span>
						</a>
					</div>
				</div>
			</div>

			<div class="mt-16 border-t border-blue-500/30 pt-8">
				<div class="flex flex-col items-center justify-between space-y-6 md:flex-row md:space-y-0">
					<div class="text-center md:text-left">
						<div class="text-gray-300">
							© 2025 Klappy • Built with ❤️ for the Bible translation community
						</div>
						<div class="mt-1 text-sm text-blue-300">
							<span class="font-medium">The age of stateless RAG has arrived</span>
						</div>
					</div>
					<div class="flex items-center space-x-6">
						<div
							class="rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 px-4 py-2 text-sm font-medium text-purple-300 ring-1 ring-purple-500/30 backdrop-blur-xl"
						>
							v{VERSION}
						</div>
						<div class="flex items-center space-x-4 text-sm">
							<a
								href="https://github.com/klappy/translation-helps-mcp"
								target="_blank"
								rel="noopener noreferrer"
								class="text-gray-400 transition-colors hover:text-blue-300">GitHub</a
							>
							<a href="/mcp-tools" class="text-gray-400 transition-colors hover:text-blue-300"
								>API</a
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	/* Enhanced scrollbar */
	::-webkit-scrollbar {
		width: 10px;
	}

	::-webkit-scrollbar-track {
		background: rgba(59, 130, 246, 0.1);
		border-radius: 5px;
	}

	::-webkit-scrollbar-thumb {
		background: rgba(59, 130, 246, 0.3);
		border-radius: 5px;
		transition: background 0.3s ease;
	}

	::-webkit-scrollbar-thumb:hover {
		background: rgba(59, 130, 246, 0.5);
	}

	/* Enhanced focus styles */
	*:focus {
		outline: 2px solid rgba(59, 130, 246, 0.6);
		outline-offset: 2px;
		border-radius: 4px;
	}

	/* Enhanced selection styles */
	::selection {
		background: rgba(59, 130, 246, 0.4);
		color: white;
	}

	/* Smooth animations */
	* {
		transition-property:
			background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
		transition-duration: 300ms;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}
</style>
