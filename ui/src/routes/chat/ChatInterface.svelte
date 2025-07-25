<script>
	import { onMount, onDestroy } from 'svelte';
	import { MessageSquare, Send, Sparkles, Eye, EyeOff, Clock, Database } from 'lucide-svelte';
	import BibleVerse from '$lib/components/BibleVerse.svelte';
	import TranslationWord from '$lib/components/TranslationWord.svelte';
	import XRayPanel from './XRayPanel.svelte';
	
	// State
	let messages = [];
	let inputValue = '';
	let isLoading = false;
	let showXRay = false;
	let currentXRayData = null;
	let messagesContainer;
	
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
		
		// Create assistant message placeholder
		const assistantMessage = {
			id: (Date.now() + 1).toString(),
			role: 'assistant',
			content: '',
			timestamp: new Date(),
			xrayData: {
				tools: [],
				totalTime: 0,
				citations: []
			}
		};
		
		messages = [...messages, assistantMessage];
		
		try {
			// Call AI endpoint with MCP tools
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: userMessage.content,
					history: messages.slice(0, -2), // Exclude current messages
					enableXRay: true
				})
			});
			
			if (!response.ok) throw new Error('Failed to get response');
			
			const data = await response.json();
			
			// Update assistant message
			messages = messages.map(msg => 
				msg.id === assistantMessage.id 
					? { ...msg, content: data.content, xrayData: data.xrayData }
					: msg
			);
			
			currentXRayData = data.xrayData;
			
		} catch (error) {
			console.error('Chat error:', error);
			messages = messages.map(msg => 
				msg.id === assistantMessage.id 
					? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
					: msg
			);
		} finally {
			isLoading = false;
			scrollToBottom();
		}
	}
	
	// Handle enter key
	function handleKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}
	
	// Format message content with components
	function formatContent(content) {
		// This would parse content and replace scripture/word references with components
		// For now, return as-is
		return content;
	}
</script>

<style>
	.chat-container {
		@apply flex h-full flex-col bg-gray-900;
	}
	
	.messages-area {
		@apply flex-1 overflow-y-auto px-4 py-6;
	}
	
	.message {
		@apply mb-6 flex items-start gap-3;
	}
	
	.message.user {
		@apply flex-row-reverse;
	}
	
	.message-avatar {
		@apply flex h-10 w-10 items-center justify-center rounded-lg;
	}
	
	.message.assistant .message-avatar {
		@apply bg-blue-600;
	}
	
	.message.user .message-avatar {
		@apply bg-gray-700;
	}
	
	.message-content {
		@apply max-w-2xl rounded-lg px-4 py-3;
	}
	
	.message.assistant .message-content {
		@apply bg-gray-800 text-gray-100;
	}
	
	.message.user .message-content {
		@apply bg-blue-600 text-white;
	}
	
	.input-area {
		@apply border-t border-gray-800 bg-gray-900 p-4;
	}
	
	.input-container {
		@apply mx-auto flex max-w-4xl items-end gap-3;
	}
	
	.input-wrapper {
		@apply flex-1;
	}
	
	.input-field {
		@apply w-full resize-none rounded-lg bg-gray-800 px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500;
	}
	
	.send-button {
		@apply flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50;
	}
	
	.xray-toggle {
		@apply flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200;
	}
	
	.xray-toggle.active {
		@apply bg-blue-600 text-white;
	}
	
	.loading-dots {
		@apply inline-flex gap-1;
	}
	
	.loading-dots span {
		@apply inline-block h-2 w-2 animate-bounce rounded-full bg-blue-500;
	}
	
	.loading-dots span:nth-child(2) {
		animation-delay: 0.1s;
	}
	
	.loading-dots span:nth-child(3) {
		animation-delay: 0.2s;
	}
	
	.citation {
		@apply mt-2 text-xs text-gray-500;
	}
	
	.message-timestamp {
		@apply mt-1 text-xs text-gray-600;
	}
</style>

<div class="chat-container">
	<div class="messages-area" bind:this={messagesContainer}>
		{#each messages as message}
			<div class="message {message.role}">
				<div class="message-avatar">
					{#if message.role === 'assistant'}
						<Sparkles class="h-6 w-6" />
					{:else}
						<MessageSquare class="h-5 w-5" />
					{/if}
				</div>
				
				<div class="flex-1">
					<div class="message-content">
						{#if message.role === 'assistant' && !message.content && isLoading}
							<div class="loading-dots">
								<span></span>
								<span></span>
								<span></span>
							</div>
						{:else}
							<div class="whitespace-pre-wrap">
								{@html formatContent(message.content)}
							</div>
							
							{#if message.xrayData?.citations?.length > 0}
								<div class="citation">
									📚 Sources: {message.xrayData.citations.join(', ')}
								</div>
							{/if}
						{/if}
					</div>
					
					<div class="message-timestamp">
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
	
	<div class="input-area">
		<div class="input-container">
			<div class="input-wrapper">
				<textarea
					class="input-field"
					placeholder="Ask about a Bible verse, translation notes, or word meanings..."
					bind:value={inputValue}
					on:keydown={handleKeydown}
					rows="1"
					disabled={isLoading}
				/>
			</div>
			
			<button
				class="xray-toggle"
				class:active={showXRay}
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
				class="send-button"
				on:click={sendMessage}
				disabled={!inputValue.trim() || isLoading}
			>
				<Send class="h-5 w-5" />
			</button>
		</div>
	</div>
</div>

{#if showXRay && currentXRayData}
	<XRayPanel 
		data={currentXRayData} 
		on:close={() => showXRay = false}
	/>
{/if}