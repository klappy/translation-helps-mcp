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
		
		// Simulate API call with mock response
		setTimeout(() => {
			const assistantMessage = {
				id: (Date.now() + 1).toString(),
				role: 'assistant',
				content: getMockResponse(userMessage.content),
				timestamp: new Date(),
				xrayData: getMockXrayData()
			};
			
			messages = [...messages, assistantMessage];
			isLoading = false;
			scrollToBottom();
		}, 1500);
	}
	
	// Handle Enter key
	function handleKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}
	
	// Mock response generator
	function getMockResponse(query) {
		const lowerQuery = query.toLowerCase();
		
		if (lowerQuery.includes('john 3:16')) {
			return `Here's John 3:16 from the ULT:

"For God so loved the world that he gave his only begotten Son, so that everyone who believes in him will not perish but will have eternal life."

[Scripture - John 3:16 ULT]`;
		}
		
		if (lowerQuery.includes('love') || lowerQuery.includes('agape')) {
			return `The Greek word "agape" (ἀγάπη) appears frequently in the New Testament:

**Definition**: Unconditional, self-sacrificial love
**Usage**: Often describes God's love for humanity
**Key verses**: 1 Corinthians 13, 1 John 4:8

[Translation Words - Love/Agape]`;
		}
		
		return `I can help you explore Bible passages and translation resources. Try asking about:
- A specific verse (e.g., "What does John 3:16 say?")
- Translation notes for a passage
- The meaning of specific words
- Translation questions

What would you like to know?`;
	}
	
	// Mock X-ray data
	function getMockXrayData() {
		return {
			tools: [
				{
					id: 'tool-1',
					name: 'fetch_scripture',
					params: { reference: 'John 3:16', version: 'ult' },
					response: { text: 'For God so loved...' },
					duration: 145,
					cached: true
				}
			],
			totalTime: 145,
			citations: ['Scripture - John 3:16 ULT'],
			timeline: [
				{ time: 0, event: 'Request received' },
				{ time: 10, event: 'Tool: fetch_scripture' },
				{ time: 145, event: 'Response sent' }
			]
		};
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