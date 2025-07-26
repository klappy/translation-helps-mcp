<script>
	import { onMount, onDestroy } from 'svelte';
	import { MessageSquare, Send, Sparkles, Eye, EyeOff, Clock, Database } from 'lucide-svelte';
	import BibleVerse from '$lib/components/BibleVerse.svelte';
	import TranslationWord from '$lib/components/TranslationWord.svelte';
	import XRayPanel from './XRayPanel.svelte';
	import { marked } from 'marked';
	
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
		
		// Parse markdown to HTML
		let html = marked.parse(content);
		
		// Handle RC links - convert to interactive elements
		html = html.replace(/href="rc:([^"]+)"/g, 'href="#" data-rc-link="$1" onclick="return false;"');
		
		// Add Tailwind classes to HTML elements
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
			// Blockquotes
			.replace(/<blockquote>/g, '<blockquote class="border-l-4 border-gray-600 pl-4 italic my-4">')
			// Strong/Bold
			.replace(/<strong>/g, '<strong class="font-bold">')
			// Links
			.replace(/<a href/g, '<a class="text-blue-400 hover:text-blue-300 underline" href');
		
		return html;
	}
	
	// Handle RC link clicks
	async function handleRCLinkClick(event) {
		const link = event.target.closest('[data-rc-link]');
		if (!link) return;
		
		const articleId = link.getAttribute('data-rc-link');
		const articleName = link.textContent.replace('Learn more about ', '').replace('Learn more', '').trim();
		
		// Send a message asking about this article
		const message = `Tell me about the Translation Academy article: ${articleName} (${articleId})`;
		inputValue = message;
		await sendMessage();
	}
	
	// Welcome message
	onMount(() => {
		messages = [{
			id: 'welcome',
			role: 'assistant',
			content: `Welcome to the Translation Helps AI Assistant! 🌟
			
I can help you explore Bible passages and translation resources. I follow sacred text constraints:
• Scripture is quoted verbatim, character for character
• I provide translation helps without interpretation
• All resources are clearly cited

Try asking me about a Bible verse, translation notes, or word meanings!`,
			timestamp: new Date()
		}];
		
		// Add event listener for RC links
		document.addEventListener('click', handleRCLinkClick);
	});
	
	onDestroy(() => {
		// Clean up event listener
		document.removeEventListener('click', handleRCLinkClick);
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
			
			const assistantMessage = {
				id: (Date.now() + 1).toString(),
				role: 'assistant',
				content: data.content,
				timestamp: new Date(),
				xrayData: data.xrayData
			};
			
			messages = [...messages, assistantMessage];
			currentXRayData = data.xrayData;
			
		} catch (error) {
			console.error('Chat error:', error);
			const errorMessage = {
				id: (Date.now() + 1).toString(),
				role: 'assistant',
				content: 'Sorry, I encountered an error. Please try again.',
				timestamp: new Date()
			};
			messages = [...messages, errorMessage];
		} finally {
			isLoading = false;
			scrollToBottom();
		}
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
		{#each messages as message}
			<div class="mb-6 flex items-start gap-3 {message.role === 'user' ? 'flex-row-reverse' : ''}">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg {message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}">
					{#if message.role === 'user'}
						<MessageSquare class="h-5 w-5 text-white" />
					{:else}
						<Sparkles class="h-5 w-5 text-white" />
					{/if}
				</div>
				
				<div class="max-w-2xl">
					<div class="rounded-lg px-4 py-3 {message.role === 'user' ? 'bg-gray-800 text-gray-100' : 'bg-blue-600 text-white'} {message.role === 'assistant' ? 'prose prose-invert max-w-none' : ''}">
						{#if message.role === 'assistant'}
							<div class="markdown-content">
								{@html renderMarkdown(message.content)}
							</div>
						{:else}
							{message.content}
						{/if}
						
						{#if message.xrayData}
							{#if message.xrayData.tools.length > 0}
								<div class="mt-2 flex items-center gap-2 text-xs opacity-75">
									<Clock class="h-3 w-3" />
									{message.xrayData.totalTime}ms
									{#if message.xrayData.tools[0].cached}
										<Database class="h-3 w-3" />
										Cached
									{/if}
								</div>
							{/if}
							
							{#if message.xrayData.citations.length > 0}
								<div class="mt-2 text-xs opacity-75">
									📚 Sources: {message.xrayData.citations.join(', ')}
								</div>
							{/if}
						{/if}
					</div>
					
					<div class="mt-2 text-xs text-gray-500">
						{message.timestamp.toLocaleTimeString()}
					</div>
					
					{#if message.role === 'assistant' && message.xrayData && message.content}
						<button
							class="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
							on:click={() => {
								currentXRayData = message.xrayData;
								showXRay = true;
							}}
						>
							<Eye class="h-3 w-3" />
							View X-Ray ({message.xrayData.tools.length} tools, {message.xrayData.totalTime}ms)
						</button>
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
</div>

{#if showXRay && currentXRayData}
	<XRayPanel
		data={currentXRayData}
		on:close={() => showXRay = false}
	/>
{/if}