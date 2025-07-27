<script>
	import { onMount, onDestroy, afterUpdate } from 'svelte';
	import { MessageSquare, Send, Sparkles, Eye, EyeOff, Clock, Database, Droplets, TrendingUp, User } from 'lucide-svelte';
	import BibleVerse from '$lib/components/BibleVerse.svelte';
	import TranslationWord from '$lib/components/TranslationWord.svelte';
	import XRayPanel from './XRayPanel.svelte';
	import { marked } from 'marked';
	import { browser } from '$app/environment';
	
	// Configure marked for safe HTML rendering
	marked.setOptions({
		breaks: true,
		gfm: true,
		headerIds: true,
		mangle: false
	});
	
	// State
	let messages = [];
	let inputValue = '';
	let isLoading = false;
	let showXRay = false;
	let currentXRayData = null;
	let messagesContainer;
	
	// Helper function to render markdown with proper styling
	function renderMarkdown(content) {
		if (!content) return '';
		
		// First render the markdown
		let html = marked(content);
		
		// Apply Tailwind classes to HTML elements
		html = html
			// Headers
			.replace(/<h1>/g, '<h1 class="text-2xl font-bold mb-4 mt-6 text-gray-100">')
			.replace(/<h2>/g, '<h2 class="text-xl font-bold mb-3 mt-5 text-gray-100">')
			.replace(/<h3>/g, '<h3 class="text-lg font-semibold mb-2 mt-4 text-gray-100">')
			// Lists
			.replace(/<ul>/g, '<ul class="list-disc list-inside space-y-2 my-4">')
			.replace(/<ol>/g, '<ol class="list-decimal list-inside space-y-2 my-4">')
			.replace(/<li>/g, '<li class="ml-4">')
			// Paragraphs
			.replace(/<p>/g, '<p class="mb-4">')
			// Code
			.replace(/<code>/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">')
			.replace(/<pre>/g, '<pre class="bg-gray-800 p-4 rounded-lg overflow-x-auto my-4">')
			// Blockquotes (for scripture)
			.replace(/<blockquote>/g, '<blockquote class="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-200">')
			// Strong/Bold
			.replace(/<strong>/g, '<strong class="font-bold text-white">')
			// Horizontal rules
			.replace(/<hr>/g, '<hr class="my-6 border-gray-700">')
			// Regular links
			.replace(/<a href="(?!rc:\/\/)/g, '<a class="text-blue-400 hover:text-blue-300 underline" href="');
		
		// Then make RC links clickable with special handling
		html = html.replace(/<a href="(rc:\/\/[^"]+)">([^<]+)<\/a>/g, (match, href, text) => {
			return `<a href="${href}" data-rc-link="${href}" class="rc-link inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline cursor-pointer">${text}</a>`;
		});
		
		return html;
	}
	
	// After component updates, attach click handlers to RC links
	afterUpdate(() => {
		if (browser) {
			// Remove old listeners
			document.querySelectorAll('.rc-link').forEach(link => {
				link.removeEventListener('click', handleRCLinkClickWrapper);
			});
			
			// Add new listeners
			document.querySelectorAll('.rc-link').forEach(link => {
				link.addEventListener('click', handleRCLinkClickWrapper);
			});
		}
	});
	
	// Wrapper function for RC link click handling
	function handleRCLinkClickWrapper(event) {
		const href = event.target.getAttribute('data-rc-link');
		if (href) {
			handleRCLinkClick(event, href);
		}
	}
	
	// Cleanup on destroy
	onDestroy(() => {
		if (browser) {
			document.querySelectorAll('.rc-link').forEach(link => {
				link.removeEventListener('click', handleRCLinkClickWrapper);
			});
		}
	});
	
	// Handle RC link clicks
	async function handleRCLinkClick(event, href) {
		event.preventDefault();
		console.log('RC link clicked:', href);
		
		// Parse the RC link to understand what type of resource it is
		const parts = href.replace('rc://', '').split('/');
		
		let prompt = '';
		
		// Handle different types of RC links
		if (href.includes('/tw/dict/') || href.includes('rc://words/')) {
			// Translation Word link
			const wordId = parts[parts.length - 1];
			const word = wordId.replace(/-/g, ' ');
			prompt = `Define the biblical term "${word}" and explain its significance`;
		} else if (href.includes('/ta/man/')) {
			// Translation Academy article
			const articleId = parts[parts.length - 1];
			const articleName = articleId.replace(/-/g, ' ');
			prompt = `Show me the Translation Academy article about "${articleName}"`;
		} else if (href.includes('/bible/')) {
			// Bible reference link
			const book = parts[parts.length - 2];
			const chapter = parts[parts.length - 1];
			prompt = `Show me ${book} ${chapter}`;
		} else {
			// Generic handling for other RC links
			const resourceName = parts[parts.length - 1].replace(/-/g, ' ');
			prompt = `Tell me about "${resourceName}"`;
		}
		
		// Send the generated prompt
		inputValue = prompt;
		await sendMessage();
	}
	
	// Welcome message
	onMount(() => {
		messages = [{
			id: '0',
			role: 'assistant',
			content: `Hello! I'm an MCP Bible study assistant. I provide information exclusively from our translation resources database.

I can help you access:
• **Scripture** - "Show me John 3:16"
• **Translation Notes** - "What do the notes say about Titus 1?"
• **Word Definitions** - "Define 'agape' from Translation Words"
• **Study Questions** - "Questions for Genesis 1"
• **Translation Academy** - "Article about metaphors"

Important: I only share what's available in our MCP database - no external biblical interpretations. All my responses come directly from unfoldingWord's translation resources.

Just ask naturally - I'll fetch the exact resources you need! 📚`,
			timestamp: new Date()
		}];
		
		// Add event listener for RC links - only in browser
		if (browser) {
			document.addEventListener('click', handleRCLinkClick);
		}
	});
	
	onDestroy(() => {
		// Clean up event listener - only in browser
		if (browser) {
			document.removeEventListener('click', handleRCLinkClick);
		}
	});
	
	// Auto-scroll to bottom
	function scrollToBottom() {
		if (messagesContainer) {
			setTimeout(() => {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}, 100);
		}
	}
	
	// Send message
	async function sendMessage() {
		if (!inputValue.trim() || isLoading) return;
		
		const userMessage = {
			id: Date.now().toString(),
			role: 'user',
			content: inputValue.trim(),
			timestamp: new Date()
		};
		
		messages = [...messages, userMessage];
		inputValue = '';
		isLoading = true;
		
		scrollToBottom();
		
		// Call the chat API
		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: userMessage.content,
					history: messages.slice(0, -1), // Exclude current user message
					enableXRay: true
				})
			});
			
			if (!response.ok) {
				throw new Error('Failed to get response');
			}
			
			const data = await response.json();
			
			// Check if we got an error response
			if (data.error) {
				const errorMessage = {
					id: (Date.now() + 1).toString(),
					role: 'assistant',
					content: `❌ Error: ${data.error}\n\nDetails: ${data.details || 'No additional details'}${data.suggestion ? '\n\nSuggestion: ' + data.suggestion : ''}`,
					timestamp: new Date(),
					isError: true
				};
				messages = [...messages, errorMessage];
			} else if (data.debug && (!data.content || data.content === 'No content found')) {
				// Show debug info when no content found
				const debugMessage = {
					id: (Date.now() + 1).toString(),
					role: 'assistant',
					content: `⚠️ No content found.\n\n**Debug Info:**\n- URL: ${data.debug.url}\n- Response: \`\`\`json\n${JSON.stringify(data.debug.response, null, 2).substring(0, 500)}...\n\`\`\`\n\nThis usually means the API structure has changed. The system should adapt automatically.`,
					timestamp: new Date(),
					isError: true
				};
				messages = [...messages, debugMessage];
			} else {
				const assistantMessage = {
					id: (Date.now() + 1).toString(),
					role: 'assistant',
					content: data.content,
					timestamp: new Date(),
					xrayData: data.xrayData
				};
				
				messages = [...messages, assistantMessage];
				currentXRayData = data.xrayData;
			}
			
		} catch (error) {
			console.error('Chat error:', error);
			const errorMessage = {
				id: (Date.now() + 1).toString(),
				role: 'assistant',
				content: `❌ Network error: ${error.message}\n\nPlease check your connection and try again.`,
				timestamp: new Date(),
				isError: true
			};
			messages = [...messages, errorMessage];
		} finally {
			isLoading = false;
			scrollToBottom();
		}
	}
	
	// Show X-ray data for a message
	function showXRayData(message) {
		currentXRayData = message.xrayData;
		showXRay = true;
	}
	
	function closeXRay() {
		showXRay = false;
		currentXRayData = null;
	}
	
	// Handle Enter key
	function handleKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}
</script>

<style>
	/* Additional markdown styling */
	:global(.markdown-content) {
		line-height: 1.6;
	}
	
	/* RC Link styling */
	:global(.markdown-content [data-rc-link]) {
		background-color: rgba(59, 130, 246, 0.2);
		padding: 0.125rem 0.5rem;
		border-radius: 0.375rem;
		text-decoration: none;
		font-style: italic;
		transition: all 0.2s;
		display: inline-block;
		margin: 0.125rem 0;
	}
	
	:global(.markdown-content [data-rc-link]:hover) {
		background-color: rgba(59, 130, 246, 0.4);
		transform: translateY(-1px);
		cursor: pointer;
	}
	
	:global(.markdown-content > *:first-child) {
		margin-top: 0 !important;
	}
	
	:global(.markdown-content > *:last-child) {
		margin-bottom: 0 !important;
	}
	
	/* Ensure proper contrast for code blocks in blue background */
	:global(.bg-blue-600 .markdown-content code) {
		background-color: rgba(0, 0, 0, 0.3);
		color: #ffffff;
	}
	
	:global(.bg-blue-600 .markdown-content pre) {
		background-color: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}
	
	/* Better list styling */
	:global(.markdown-content ul li::marker) {
		color: currentColor;
		opacity: 0.7;
	}
	
	:global(.markdown-content ol li::marker) {
		color: currentColor;
		opacity: 0.7;
	}
	
	/* Horizontal rules */
	:global(.markdown-content hr) {
		border-color: rgba(255, 255, 255, 0.2);
		margin: 1.5rem 0;
	}
	
	/* Tables if needed */
	:global(.markdown-content table) {
		border-collapse: collapse;
		width: 100%;
		margin: 1rem 0;
	}
	
	:global(.markdown-content th),
	:global(.markdown-content td) {
		border: 1px solid rgba(255, 255, 255, 0.2);
		padding: 0.5rem;
		text-align: left;
	}
	
	:global(.markdown-content th) {
		background-color: rgba(0, 0, 0, 0.2);
		font-weight: bold;
	}
</style>

<div class="flex h-full flex-col" style="background-color: #0f172a;">
	<div bind:this={messagesContainer} class="flex-1 overflow-y-auto px-4 py-6">
		{#each messages as message (message.id)}
			<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4">
				<div class="flex max-w-[80%] items-end space-x-2">
					{#if message.role === 'assistant'}
						<div class="flex-shrink-0">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
								<Droplets class="h-5 w-5 text-white" />
							</div>
						</div>
					{/if}
					
					<div>
						<div class="rounded-2xl px-4 py-3 {message.role === 'user' 
							? 'bg-gray-700 text-white' 
							: message.isError
								? 'bg-red-900/30 text-red-100 border border-red-700/50'
								: 'bg-blue-600 text-white'}">
							<div class="markdown-content">
								{@html renderMarkdown(message.content)}
							</div>
						</div>
						
						{#if message.xrayData}
							<div class="mt-2 text-xs text-gray-400">
								<button
									class="flex items-center space-x-1 hover:text-gray-300"
									on:click={() => showXRayData(message)}
								>
									<TrendingUp class="h-3 w-3" />
									<span>X-ray: {message.xrayData.totalTime}ms</span>
								</button>
							</div>
						{/if}
					</div>
					
					{#if message.role === 'user'}
						<div class="flex-shrink-0">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600">
								<User class="h-5 w-5 text-white" />
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
	
	<div class="border-t border-gray-800 p-4" style="background-color: #0f172a;">
		<div class="mx-auto flex max-w-4xl items-end gap-3">
			<div class="flex-1">
				<textarea
					class="w-full resize-none rounded-lg bg-gray-800 px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="Ask about a Bible verse, translation notes, or word meanings..."
					bind:value={inputValue}
					on:keydown={handleKeydown}
					rows="1"
					disabled={isLoading}
				></textarea>
			</div>
			
			<button
				class="flex h-12 w-12 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-200 {showXRay ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}"
				on:click={() => showXRay = !showXRay}
				title="Toggle X-Ray view"
			>
				{#if showXRay}
					<EyeOff class="h-5 w-5" />
				{:else}
					<Eye class="h-5 w-5" />
				{/if}
			</button>
			
			<button
				class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
				on:click={sendMessage}
				disabled={isLoading || !inputValue.trim()}
			>
				{#if isLoading}
					<div class="inline-flex gap-1">
						<span class="inline-block h-2 w-2 animate-bounce rounded-full bg-white" style="animation-delay: 0ms"></span>
						<span class="inline-block h-2 w-2 animate-bounce rounded-full bg-white" style="animation-delay: 150ms"></span>
						<span class="inline-block h-2 w-2 animate-bounce rounded-full bg-white" style="animation-delay: 300ms"></span>
					</div>
				{:else}
					<Send class="h-5 w-5" />
				{/if}
			</button>
		</div>
		
		{#if messages.length === 1}
			<div class="mt-1 text-center text-xs text-gray-600">
				Press Enter to send • Shift+Enter for new line
			</div>
		{/if}
	</div>
	
	<!-- Quick suggestions -->
	{#if messages.length <= 2}
		<div class="mt-3 flex flex-wrap gap-2 px-4">
			<button
				on:click={() => { inputValue = "Show me John 3:16"; sendMessage(); }}
				class="rounded-full border border-gray-600 px-3 py-1 text-sm text-gray-300 hover:border-blue-500 hover:text-blue-400 transition-all"
			>
				📖 John 3:16
			</button>
			<button
				on:click={() => { inputValue = "What does 'love' mean in the Bible?"; sendMessage(); }}
				class="rounded-full border border-gray-600 px-3 py-1 text-sm text-gray-300 hover:border-blue-500 hover:text-blue-400 transition-all"
			>
				💝 Define "love"
			</button>
			<button
				on:click={() => { inputValue = "Explain the notes on Ephesians 2:8-9"; sendMessage(); }}
				class="rounded-full border border-gray-600 px-3 py-1 text-sm text-gray-300 hover:border-blue-500 hover:text-blue-400 transition-all"
			>
				📝 Notes on grace
			</button>
			<button
				on:click={() => { inputValue = "What questions should I consider for Genesis 1?"; sendMessage(); }}
				class="rounded-full border border-gray-600 px-3 py-1 text-sm text-gray-300 hover:border-blue-500 hover:text-blue-400 transition-all"
			>
				❓ Study questions
			</button>
		</div>
	{/if}
</div>

{#if showXRay && currentXRayData}
	<XRayPanel
		data={currentXRayData}
		on:close={closeXRay}
	/>
{/if}