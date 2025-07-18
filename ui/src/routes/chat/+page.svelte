<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Send,
		User,
		Bot,
		Zap,
		MessageSquare,
		Copy,
		Code,
		BookOpen,
		Clock,
		ChevronDown,
		ChevronUp,
		Sparkles,
		Loader2,
		Mic,
		MicOff,
		Settings,
		RefreshCw,
		Lightbulb,
		Search,
		Heart,
		Share2,
		MoreHorizontal,
		CheckCircle2,
		AlertCircle,
		Timer
	} from 'lucide-svelte';
	import BibleVerse from '$lib/components/BibleVerse.svelte';
	import TranslationWord from '$lib/components/TranslationWord.svelte';
	import { BrowserLLM } from '$lib/services/BrowserLLM';
	import { marked } from 'marked';

	// Create an instance of the AI system
	const browserLLM = new BrowserLLM();

	// Types
	interface ChatMessage {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		timestamp: Date;
		apiCalls?: ApiCall[];
		responseTime?: number;
		isTyping?: boolean;
		status?: 'sending' | 'sent' | 'error';
	}

	interface ApiCall {
		endpoint: string;
		params: Record<string, string>;
		response: any;
		responseTime: number;
		status: 'success' | 'error';
	}

	// State
	let messages: ChatMessage[] = [];
	let currentMessage = '';
	let isLoading = false;
	let expandedMessages = new Set<string>();
	let isTyping = false;
	let showSuggestions = true;
	let autoScroll = true;
	let showApiDetails = true;
	let llmStatus = 'uninitialized';

	// Chat configuration
	let chatConfig = {
		language: 'en',
		organization: 'unfoldingWord',
		includeDebug: true,
		responseStyle: 'detailed' // 'detailed' | 'concise' | 'technical'
	};

	// Example conversations with enhanced prompts
	const exampleConversations = [
		{
			title: 'Scripture Analysis',
			description: 'Ask about specific Bible verses and their meaning',
			icon: BookOpen,
			color: 'from-blue-500 to-cyan-500',
			examples: [
				"What does Titus 1:1 say about Paul's apostleship?",
				'Explain the context of John 3:16',
				'What are the key themes in Genesis 1:1-3?',
				"How does Psalm 23:1 relate to God's care?"
			]
		},
		{
			title: 'Translation Questions',
			description: 'Get help with translation challenges',
			icon: MessageSquare,
			color: 'from-green-500 to-emerald-500',
			examples: [
				'How should I translate "grace" in different contexts?',
				'What are the translation notes for "love" in 1 Corinthians 13?',
				'Help me understand the translation of "righteousness" in Romans',
				'What\'s the best way to translate "kingdom" in Matthew?'
			]
		},
		{
			title: 'Word Studies',
			description: 'Deep dive into specific words and their meanings',
			icon: Search,
			color: 'from-purple-500 to-pink-500',
			examples: [
				'What does the word "apostle" mean in the New Testament?',
				'Give me the translation word definition for "faith"',
				'What are the semantic domains for "kingdom"?',
				'How is "salvation" used throughout the Bible?'
			]
		},
		{
			title: 'Cross-References',
			description: 'Find related passages and connections',
			icon: Code,
			color: 'from-orange-500 to-red-500',
			examples: [
				"What other passages talk about God's love like John 3:16?",
				'Find verses that mention "grace" similar to Ephesians 2:8',
				'What are the key passages about "faith" in the New Testament?',
				'Show me how "kingdom" is used in the Gospels'
			]
		}
	];

	// Initialize with welcome message and LLM
	onMount(async () => {
		messages = [
			{
				id: 'welcome',
				role: 'assistant',
				content: `Hello! I'm your AI Bible assistant, powered by a real AI model running right in your browser! I can help you with:

• **Scripture Analysis**: Ask about specific Bible verses and their meaning
• **Translation Questions**: Get help with translation challenges and notes
• **Word Studies**: Deep dive into specific words and their semantic domains
• **Cross-references**: Find related passages and connections

I have access to comprehensive Bible resources including:
- Scripture text with context
- Translation notes and insights
- Translation questions and answers
- Word definitions and usage
- Cross-references and links

I'm currently loading my AI model... this will take a moment the first time.`,
				timestamp: new Date()
			}
		];

		// Initialize the browser LLM
		try {
			llmStatus = 'initializing';
			await browserLLM.initialize();
			llmStatus = 'ready';

			// Update welcome message once LLM is ready
			messages = messages.map((msg) =>
				msg.id === 'welcome'
					? {
							...msg,
							content: `Hello! I'm your AI Bible assistant, powered by a real AI model running right in your browser! I can help you with:

• **Scripture Analysis**: Ask about specific Bible verses and their meaning
• **Translation Questions**: Get help with translation challenges and notes
• **Word Studies**: Deep dive into specific words and their semantic domains
• **Cross-references**: Find related passages and connections

I have access to comprehensive Bible resources including:
- Scripture text with context
- Translation notes and insights
- Translation questions and answers
- Word definitions and usage
- Cross-references and links

✅ **AI Model Ready!** Try asking me something like "What does Titus 1:1 say about Paul's apostleship?" or "How should I translate 'grace' in different contexts?"`
						}
					: msg
			);
		} catch (error) {
			console.error('Failed to initialize LLM:', error);
			llmStatus = 'error';
		}
	});

	// Send message with enhanced typing simulation
	async function sendMessage() {
		if (!currentMessage.trim() || isLoading) return;

		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			role: 'user',
			content: currentMessage,
			timestamp: new Date(),
			status: 'sending'
		};

		messages = [...messages, userMessage];
		const messageToSend = currentMessage;
		currentMessage = '';
		isLoading = true;

		// Simulate typing indicator
		const typingMessage: ChatMessage = {
			id: (Date.now() + 1).toString(),
			role: 'assistant',
			content: '',
			timestamp: new Date(),
			isTyping: true
		};

		messages = [...messages, typingMessage];

		try {
			// Generate real AI response with Bible context
			const response = await generateAIResponse(messageToSend);

			// Remove typing indicator and add real response
			messages = messages.filter((msg) => !msg.isTyping);

			const assistantMessage: ChatMessage = {
				id: (Date.now() + 2).toString(),
				role: 'assistant',
				content: response.content,
				timestamp: new Date(),
				apiCalls: response.apiCalls,
				responseTime: response.responseTime,
				status: 'sent'
			};

			messages = [...messages, assistantMessage];
		} catch (error) {
			// Remove typing indicator
			messages = messages.filter((msg) => !msg.isTyping);

			const errorMessage: ChatMessage = {
				id: (Date.now() + 2).toString(),
				role: 'assistant',
				content: 'Sorry, I encountered an error while processing your request. Please try again.',
				timestamp: new Date(),
				status: 'error'
			};
			messages = [...messages, errorMessage];
		}

		// Update user message status
		messages = messages.map((msg) =>
			msg.role === 'user' && msg.status === 'sending' ? { ...msg, status: 'sent' } : msg
		);

		isLoading = false;
	}

	// Real AI response using browser LLM with Bible context
	async function generateAIResponse(
		userMessage: string
	): Promise<{ content: string; apiCalls: ApiCall[]; responseTime: number }> {
		const startTime = performance.now();
		const apiCalls: ApiCall[] = [];

		// First, gather relevant Bible context
		const lowerMessage = userMessage.toLowerCase();

		// Check for scripture references
		const scriptureMatch = userMessage.match(/(\w+\s+\d+:\d+(?:-\d+)?)/);
		if (scriptureMatch) {
			const reference = scriptureMatch[1];

			// Gather scripture context
			try {
				const scriptureStart = performance.now();
				const scriptureResponse = await fetch(
					`/.netlify/functions/fetch-scripture?reference=${encodeURIComponent(reference)}&language=${chatConfig.language}&organization=${chatConfig.organization}`
				);
				const scriptureData = await scriptureResponse.json();
				const scriptureTime = performance.now() - scriptureStart;

				apiCalls.push({
					endpoint: '/api/fetch-scripture',
					params: {
						reference,
						language: chatConfig.language,
						organization: chatConfig.organization
					},
					response: scriptureData,
					responseTime: scriptureTime,
					status: scriptureResponse.ok ? 'success' : 'error'
				});
			} catch (error) {
				apiCalls.push({
					endpoint: '/api/fetch-scripture',
					params: {
						reference,
						language: chatConfig.language,
						organization: chatConfig.organization
					},
					response: null,
					responseTime: 0,
					status: 'error'
				});
			}

			// Gather translation notes
			try {
				const notesStart = performance.now();
				const notesResponse = await fetch(
					`/.netlify/functions/fetch-translation-notes?reference=${encodeURIComponent(reference)}&language=${chatConfig.language}&organization=${chatConfig.organization}`
				);
				const notesData = await notesResponse.json();
				const notesTime = performance.now() - notesStart;

				apiCalls.push({
					endpoint: '/api/fetch-translation-notes',
					params: {
						reference,
						language: chatConfig.language,
						organization: chatConfig.organization
					},
					response: notesData,
					responseTime: notesTime,
					status: notesResponse.ok ? 'success' : 'error'
				});
			} catch (error) {
				apiCalls.push({
					endpoint: '/api/fetch-translation-notes',
					params: {
						reference,
						language: chatConfig.language,
						organization: chatConfig.organization
					},
					response: null,
					responseTime: 0,
					status: 'error'
				});
			}
		}

		// Check for word queries
		const wordMatch = userMessage.match(/["']([^"']+)["']/);
		if (wordMatch) {
			const word = wordMatch[1];
			try {
				const wordStart = performance.now();
				const wordResponse = await fetch(
					`/.netlify/functions/fetch-translation-words?word=${encodeURIComponent(word)}&language=${chatConfig.language}&organization=${chatConfig.organization}&includeTitle=true&includeSubtitle=true&includeContent=true`
				);
				const wordData = await wordResponse.json();
				const wordTime = performance.now() - wordStart;

				apiCalls.push({
					endpoint: '/api/fetch-translation-words',
					params: { word, language: chatConfig.language, organization: chatConfig.organization },
					response: wordData,
					responseTime: wordTime,
					status: wordResponse.ok ? 'success' : 'error'
				});
			} catch (error) {
				apiCalls.push({
					endpoint: '/api/fetch-translation-words',
					params: {
						word: wordMatch[1],
						language: chatConfig.language,
						organization: chatConfig.organization
					},
					response: null,
					responseTime: 0,
					status: 'error'
				});
			}
		}

		// Now generate AI response with context
		let contextPrompt = userMessage;
		let citations: any = {};

		// Add Bible context to the prompt
		const successfulCalls = apiCalls.filter((call) => call.status === 'success');
		console.log('=== DEBUG: Successful API calls ===');
		console.log(successfulCalls);

		if (successfulCalls.length > 0) {
			contextPrompt += '\n\nBible Context:\n';
			successfulCalls.forEach((call) => {
				console.log(`=== DEBUG: Processing ${call.endpoint} ===`);
				console.log('Response:', call.response);

				if (call.response) {
					if (call.endpoint === '/api/fetch-scripture' && call.response.scripture) {
						console.log('Scripture found:', call.response.scripture);
						contextPrompt += `Scripture: ${call.response.scripture.text}\n`;
						if (call.response.scripture.citation) {
							citations.scripture = call.response.scripture.citation;
						}
					}
					if (call.endpoint === '/api/fetch-translation-notes' && call.response.translationNotes) {
						console.log('Translation notes found:', call.response.translationNotes);
						// Pass notes as individual items separated by double newlines
						const notesText = call.response.translationNotes.map((n: any) => n.note).join('\n\n');
						console.log('DEBUG: notesText string:', notesText);
						const notesArray = notesText.split('\n\n');
						console.log('DEBUG: notesArray after split:', notesArray);
						contextPrompt += `Translation Notes: ${notesText}\n`;
						if (call.response.citation) {
							citations.translationNotes = call.response.citation;
						}
					}
					if (call.endpoint === '/api/fetch-translation-words' && call.response.translationWords) {
						console.log('Translation words found:', call.response.translationWords);
						contextPrompt += `Word Definitions: ${call.response.translationWords.map((w: any) => `${w.term}: ${w.definition}`).join(' ')}\n`;
						if (call.response.citation) {
							citations.translationWords = call.response.citation;
						}
					}
				}
			});
		}

		console.log('=== DEBUG: Final context prompt ===');
		console.log(contextPrompt);
		console.log('=== DEBUG: Citations ===');
		console.log(citations);

		// Generate AI response with citations
		const llmResponse = await browserLLM.generateResponse(contextPrompt);

		const responseTime = performance.now() - startTime;

		return {
			content: llmResponse.text,
			apiCalls,
			responseTime: responseTime + llmResponse.time
		};
	}

	// Utility functions
	function toggleMessageExpansion(id: string) {
		if (expandedMessages.has(id)) {
			expandedMessages.delete(id);
		} else {
			expandedMessages.add(id);
		}
		expandedMessages = expandedMessages; // Trigger reactivity
	}

	function copyMessage(id: string) {
		const message = messages.find((m) => m.id === id);
		if (message) {
			navigator.clipboard.writeText(message.content);
		}
	}

	function useSuggestion(text: string) {
		currentMessage = text;
	}

	function clearChat() {
		messages = [messages[0]]; // Keep welcome message
		expandedMessages.clear();
	}

	function getStatusIcon(status?: string) {
		switch (status) {
			case 'sent':
				return CheckCircle2;
			case 'error':
				return AlertCircle;
			case 'sending':
				return Loader2;
			default:
				return null;
		}
	}

	function getStatusColor(status?: string) {
		switch (status) {
			case 'sent':
				return 'text-green-400';
			case 'error':
				return 'text-red-400';
			case 'sending':
				return 'text-yellow-400';
			default:
				return 'text-gray-400';
		}
	}

	// Auto-scroll to bottom when new messages are added
	$: if (messages.length > 0 && autoScroll) {
		setTimeout(() => {
			const container = document.getElementById('chat-container');
			if (container) {
				container.scrollTop = container.scrollHeight;
			}
		}, 100);
	}

	// Handle Enter key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}
</script>

<svelte:head>
	<title>AI Chat - Translation Helps MCP Server</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Header -->
	<div class="mb-12 text-center">
		<div
			class="mb-6 inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-300"
		>
			<Sparkles class="mr-2 h-4 w-4" />
			AI-Powered Bible Assistant
		</div>
		<h1 class="mb-6 text-4xl font-bold text-white md:text-5xl">
			Chat with
			<span class="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"
				>Bible AI</span
			>
		</h1>
		<p class="mx-auto max-w-3xl text-xl text-gray-300">
			Ask natural language questions about the Bible and get comprehensive answers powered by
			translation helps, notes, and linguistic resources.
		</p>
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
		<!-- Chat Interface -->
		<div class="lg:col-span-3">
			<div
				class="flex h-[600px] flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
			>
				<!-- Chat Header -->
				<div class="flex items-center justify-between border-b border-white/10 p-6">
					<div class="flex items-center space-x-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
						>
							<Bot class="h-5 w-5 text-white" />
						</div>
						<div>
							<h2 class="text-lg font-semibold text-white">Bible AI Assistant</h2>
							<div class="flex items-center space-x-2">
								<p class="text-sm text-gray-400">Powered by Translation Helps MCP Server</p>
								{#if llmStatus === 'initializing'}
									<div class="flex items-center space-x-1 rounded-full bg-yellow-500/20 px-2 py-1">
										<Loader2 class="h-3 w-3 animate-spin text-yellow-400" />
										<span class="text-xs text-yellow-400">Loading AI...</span>
									</div>
								{:else if llmStatus === 'ready'}
									<div class="flex items-center space-x-1 rounded-full bg-green-500/20 px-2 py-1">
										<CheckCircle2 class="h-3 w-3 text-green-400" />
										<span class="text-xs text-green-400">AI Ready</span>
									</div>
								{:else if llmStatus === 'error'}
									<div class="flex items-center space-x-1 rounded-full bg-red-500/20 px-2 py-1">
										<AlertCircle class="h-3 w-3 text-red-400" />
										<span class="text-xs text-red-400">AI Error</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
					<div class="flex items-center space-x-2">
						<button
							on:click={clearChat}
							class="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
							title="Clear chat"
						>
							<RefreshCw class="h-4 w-4 text-gray-400" />
						</button>
						<button
							on:click={() => (showApiDetails = !showApiDetails)}
							class="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
							title="Toggle API details"
						>
							<Code class="h-4 w-4 text-gray-400" />
						</button>
						<button
							on:click={() => (showSuggestions = !showSuggestions)}
							class="rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10"
							title="Toggle suggestions"
						>
							<Lightbulb class="h-4 w-4 text-gray-400" />
						</button>
					</div>
				</div>

				<!-- Messages Container -->
				<div id="chat-container" class="flex-1 space-y-6 overflow-y-auto p-6">
					{#each messages as message (message.id)}
						<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
							<div class="max-w-3xl {message.role === 'user' ? 'order-2' : 'order-1'}">
								<!-- Message Bubble -->
								<div
									class="rounded-2xl p-4 {message.role === 'user'
										? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
										: 'border border-white/10 bg-white/10 backdrop-blur-xl'}"
								>
									<!-- Message Header -->
									<div class="mb-3 flex items-center justify-between">
										<div class="flex items-center space-x-2">
											{#if message.role === 'user'}
												<User class="h-4 w-4" />
												<span class="text-sm font-medium">You</span>
											{:else}
												<Bot class="h-4 w-4" />
												<span class="text-sm font-medium">Bible AI</span>
											{/if}
										</div>
										<div class="flex items-center space-x-2">
											{#if message.responseTime}
												<div class="flex items-center space-x-1 text-xs opacity-70">
													<Timer class="h-3 w-3" />
													<span>{message.responseTime.toFixed(0)}ms</span>
												</div>
											{/if}
											{#if message.status}
												<svelte:component
													this={getStatusIcon(message.status)}
													class="h-4 w-4 {getStatusColor(message.status)}"
												/>
											{/if}
											<button
												on:click={() => copyMessage(message.id)}
												class="rounded p-1 transition-colors hover:bg-white/10"
												title="Copy message"
											>
												<Copy class="h-3 w-3" />
											</button>
											{#if message.apiCalls && message.apiCalls.length > 0}
												<button
													on:click={() => toggleMessageExpansion(message.id)}
													class="rounded p-1 transition-colors hover:bg-white/10"
													title="Toggle API details"
												>
													{#if expandedMessages.has(message.id)}
														<ChevronUp class="h-3 w-3" />
													{:else}
														<ChevronDown class="h-3 w-3" />
													{/if}
												</button>
											{/if}
										</div>
									</div>

									<!-- Message Content -->
									{#if message.isTyping}
										<div class="flex items-center space-x-2">
											<div class="flex space-x-1">
												<div class="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
												<div
													class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
													style="animation-delay: 0.1s"
												></div>
												<div
													class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
													style="animation-delay: 0.2s"
												></div>
											</div>
											<span class="text-sm text-gray-400">AI is thinking...</span>
										</div>
									{:else}
										<div
											class="prose prose-invert prose-headings:text-white prose-headings:font-semibold prose-h2:text-xl prose-h2:mb-4 prose-h3:text-lg prose-h3:mb-3 prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4 prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-500/10 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:my-4 prose-strong:text-white prose-strong:font-semibold prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:text-gray-300 prose-li:mb-1 prose-hr:border-white/20 prose-hr:my-6 max-w-none"
										>
											{@html marked(message.content)}
										</div>
									{/if}

									<!-- API Calls Details -->
									{#if message.apiCalls && message.apiCalls.length > 0 && expandedMessages.has(message.id)}
										<div class="mt-4 border-t border-white/10 pt-4">
											<h4 class="mb-3 text-sm font-medium text-gray-400">API Calls Made</h4>
											<div class="space-y-3">
												{#each message.apiCalls as call}
													<div class="rounded-lg border border-white/5 bg-black/20 p-3">
														<div class="mb-2 flex items-center justify-between">
															<div class="flex items-center space-x-2">
																<svelte:component
																	this={call.status === 'success' ? CheckCircle2 : AlertCircle}
																	class="h-4 w-4 {call.status === 'success'
																		? 'text-green-400'
																		: 'text-red-400'}"
																/>
																<span class="text-sm font-medium text-white"
																	>{call.endpoint.split('/').pop()}</span
																>
															</div>
															<div class="flex items-center space-x-2 text-xs text-gray-400">
																<Timer class="h-3 w-3" />
																<span>{call.responseTime.toFixed(0)}ms</span>
															</div>
														</div>
														<div class="text-xs text-gray-400">
															Params: {JSON.stringify(call.params)}
														</div>
													</div>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Rich Data Display -->
									{#if message.apiCalls && message.apiCalls.length > 0 && !message.isTyping}
										{#each message.apiCalls as call}
											{#if call.status === 'success' && call.response}
												{#if call.endpoint === '/api/fetch-scripture' && call.response.verses}
													<div class="mt-4 space-y-3">
														{#each call.response.verses as verse}
															<BibleVerse {verse} theme="highlight" />
														{/each}
													</div>
												{/if}
												{#if call.endpoint === '/api/fetch-translation-words' && call.response.words}
													<div class="mt-4 space-y-3">
														{#each call.response.words as word}
															<TranslationWord {word} theme="expanded" />
														{/each}
													</div>
												{/if}
											{/if}
										{/each}
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Input Area -->
				<div class="border-t border-white/10 p-6">
					<div class="flex items-end space-x-4">
						<div class="flex-1">
							<textarea
								bind:value={currentMessage}
								on:keydown={handleKeydown}
								placeholder="Ask me anything about the Bible, translation, or specific verses..."
								class="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white placeholder-gray-400 transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
								rows="2"
								disabled={isLoading}
							></textarea>
						</div>
						<button
							on:click={sendMessage}
							disabled={!currentMessage.trim() || isLoading}
							class="flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:from-purple-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if isLoading}
								<Loader2 class="h-5 w-5 animate-spin" />
							{:else}
								<Send class="h-5 w-5" />
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Suggestions Sidebar -->
		<div class="lg:col-span-1">
			{#if showSuggestions}
				<div class="space-y-6">
					<!-- Quick Actions -->
					<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
						<h3 class="mb-4 text-lg font-semibold text-white">Quick Actions</h3>
						<div class="space-y-3">
							<button
								on:click={() => useSuggestion("What does John 3:16 say about God's love?")}
								class="w-full rounded-lg border border-blue-500/30 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 p-3 text-left transition-all duration-200 hover:from-blue-600/30 hover:to-cyan-600/30"
							>
								<div class="mb-1 flex items-center space-x-2">
									<BookOpen class="h-4 w-4 text-blue-400" />
									<span class="text-sm font-medium text-white">Scripture Analysis</span>
								</div>
								<p class="text-xs text-gray-400">Ask about John 3:16</p>
							</button>
							<button
								on:click={() => useSuggestion('What does the word "grace" mean in the Bible?')}
								class="w-full rounded-lg border border-green-500/30 bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-3 text-left transition-all duration-200 hover:from-green-600/30 hover:to-emerald-600/30"
							>
								<div class="mb-1 flex items-center space-x-2">
									<Search class="h-4 w-4 text-green-400" />
									<span class="text-sm font-medium text-white">Word Study</span>
								</div>
								<p class="text-xs text-gray-400">Study "grace"</p>
							</button>
							<button
								on:click={() => useSuggestion('What are the translation notes for Titus 1:1?')}
								class="w-full rounded-lg border border-purple-500/30 bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-3 text-left transition-all duration-200 hover:from-purple-600/30 hover:to-pink-600/30"
							>
								<div class="mb-1 flex items-center space-x-2">
									<MessageSquare class="h-4 w-4 text-purple-400" />
									<span class="text-sm font-medium text-white">Translation Help</span>
								</div>
								<p class="text-xs text-gray-400">Get notes for Titus 1:1</p>
							</button>
						</div>
					</div>

					<!-- Example Conversations -->
					<div class="space-y-4">
						{#each exampleConversations as category}
							<div class="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
								<div class="mb-3 flex items-center space-x-2">
									<div
										class="h-8 w-8 rounded-lg bg-gradient-to-r {category.color} flex items-center justify-center"
									>
										<svelte:component this={category.icon} class="h-4 w-4 text-white" />
									</div>
									<h4 class="text-sm font-semibold text-white">{category.title}</h4>
								</div>
								<p class="mb-3 text-xs text-gray-400">{category.description}</p>
								<div class="space-y-2">
									{#each category.examples as example}
										<button
											on:click={() => useSuggestion(example)}
											class="w-full rounded-lg bg-black/20 p-2 text-left transition-colors hover:bg-black/30"
										>
											<p class="text-xs text-gray-300">{example}</p>
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Debug Panel -->
	{#if messages.length > 1}
		<div class="mt-8 rounded-lg bg-gray-900/80 p-4 text-xs text-gray-200">
			<h3 class="mb-2 font-bold">Debug Panel</h3>
			{#each messages as message, i}
				{#if message.apiCalls}
					<div class="mb-2">
						<div class="font-semibold">Message {i + 1} API Calls:</div>
						{#each message.apiCalls as call}
							<div class="mb-1 ml-2">
								<span class="font-mono">{call.endpoint}</span> — <span>{call.status}</span>
								{#if call.endpoint === '/api/fetch-translation-notes' && call.response?.translationNotes}
									<div class="ml-4">
										<div>Notes returned: <b>{call.response.translationNotes.length}</b></div>
										<details>
											<summary>Show raw notes</summary>
											<pre>{JSON.stringify(call.response.translationNotes, null, 2)}</pre>
										</details>
									</div>
								{/if}
								{#if call.endpoint === '/api/fetch-scripture' && call.response?.scripture}
									<div class="ml-4">
										<div>Scripture text length: <b>{call.response.scripture.text?.length}</b></div>
										<details>
											<summary>Show raw scripture</summary>
											<pre>{JSON.stringify(call.response.scripture, null, 2)}</pre>
										</details>
									</div>
								{/if}
								{#if call.endpoint === '/api/fetch-translation-words' && call.response?.translationWords}
									<div class="ml-4">
										<div>Words returned: <b>{call.response.translationWords.length}</b></div>
										<details>
											<summary>Show raw words</summary>
											<pre>{JSON.stringify(call.response.translationWords, null, 2)}</pre>
										</details>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
