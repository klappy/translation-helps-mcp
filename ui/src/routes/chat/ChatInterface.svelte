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
					<div class="rounded-lg px-4 py-3 {message.role === 'user' ? 'bg-gray-800 text-gray-100' : 'bg-blue-600 text-white'}">
						{message.content}
						
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