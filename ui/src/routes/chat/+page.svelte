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
	import { LLMChatService } from '$lib/services/llmChatService';
	import { marked } from 'marked';

	// Create an instance of the AI system
	const chatService = new LLMChatService();

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
		thinkingTrace?: string[];
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
	let collapsedThinkingTraces = new Set<string>();
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

	// Example conversations with realistic prompts for the demo
	const exampleConversations = [
		{
			title: 'Scripture Lookup',
			description: 'Fetch and display Bible verses',
			icon: BookOpen,
			color: 'from-blue-500 to-cyan-500',
			examples: ['Show me Titus 1:1', 'Display John 3:16', 'Get Genesis 1:1-3', 'Fetch Psalm 23:1']
		},
		{
			title: 'Translation Notes',
			description: 'Get translation helps and notes',
			icon: MessageSquare,
			color: 'from-green-500 to-emerald-500',
			examples: [
				'What are the translation notes for "grace"?',
				'Show me translation notes for "love" in 1 Corinthians 13',
				'Get translation helps for "righteousness"',
				'What are the translation notes for "kingdom"?'
			]
		},
		{
			title: 'Word Definitions',
			description: 'Look up word meanings and definitions',
			icon: Search,
			color: 'from-purple-500 to-pink-500',
			examples: [
				'What does "apostle" mean?',
				'Define the word "faith"',
				'What are the semantic domains for "kingdom"?',
				'Look up the definition of "salvation"'
			]
		},
		{
			title: 'Resource Search',
			description: 'Find Bible resources and helps',
			icon: Code,
			color: 'from-orange-500 to-red-500',
			examples: [
				'Search for resources about "grace"',
				'Find translation helps for "love"',
				'Look up resources about "faith"',
				'Search for "kingdom" in the Gospels'
			]
		}
	];

	// Initialize with welcome message and LLM
	onMount(async () => {
		messages = [
			{
				id: 'welcome',
				role: 'assistant',
				content: `Hello! I'm a **reference implementation** of a Bible resource assistant, powered by a small AI model running **entirely on your device**!

**What I can do:**
• Search and display relevant Bible verses, translation notes, and word definitions
• Fetch translation helps and linguistic resources based on your queries
• Show you how the Translation Helps MCP Server integration works

**What I cannot do:**
• Provide deep theological analysis or complex reasoning
• Answer questions that require extensive biblical knowledge
• Generate original insights beyond the resources I can fetch

**Privacy & Performance:**
• Your AI processing happens locally on your device - no servers involved!
• Only Bible resource requests go to our MCP server
• Your questions and AI responses stay completely private

This is a demo of the MCP integration capabilities, not a replacement for serious Bible study tools. I'm currently loading my model...`,
				timestamp: new Date()
			}
		];

		// Initialize the browser LLM
		try {
			llmStatus = 'initializing';
			// AI service initializes automatically in constructor
			llmStatus = 'ready';

			// Update welcome message once LLM is ready
			messages = messages.map((msg) =>
				msg.id === 'welcome'
					? {
							...msg,
							content: `Hello! I'm a **reference implementation** of a Bible resource assistant, powered by a small AI model running **entirely on your device**!

**What I can do:**
• Search and display relevant Bible verses, translation notes, and word definitions
• Fetch translation helps and linguistic resources based on your queries
• Show you how the Translation Helps MCP Server integration works

**What I cannot do:**
• Provide deep theological analysis or complex reasoning
• Answer questions that require extensive biblical knowledge
• Generate original insights beyond the resources I can fetch

**Privacy & Performance:**
• Your AI processing happens locally on your device - no servers involved!
• Only Bible resource requests go to our MCP server
• Your questions and AI responses stay completely private

✅ **Model Ready!** Try asking me something like "Show me Titus 1:1" or "What are the translation notes for 'grace'?" to see the MCP integration in action.`
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

		// Generate initial thinking trace (even for mock responses)
		const initialThinkingTrace = chatService.generateThinkingTrace(messageToSend, []);

		// Create typing message with thinking trace
		const typingMessage: ChatMessage = {
			id: (Date.now() + 1).toString(),
			role: 'assistant',
			content: '',
			timestamp: new Date(),
			isTyping: true,
			thinkingTrace: initialThinkingTrace
		};

		messages = [...messages, typingMessage];

		try {
			// Generate real AI response with Bible context
			const response = await generateAIResponse(messageToSend);

			// Update typing message with final thinking trace
			messages = messages.map((msg) =>
				msg.isTyping
					? { ...msg, thinkingTrace: response.thinkingTrace }
					: msg
			);

			// Remove typing indicator and add real response
			messages = messages.filter((msg) => !msg.isTyping);

			const assistantMessage: ChatMessage = {
				id: (Date.now() + 2).toString(),
				role: 'assistant',
				content: response.content,
				timestamp: new Date(),
				apiCalls: response.apiCalls,
				responseTime: response.responseTime,
				thinkingTrace: response.thinkingTrace,
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
	): Promise<{ content: string; apiCalls: ApiCall[]; responseTime: number; thinkingTrace: string[] }> {
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
					`/.netlify/functions/fetch-scripture?reference=${encodeURIComponent(reference)}&language=${chatConfig.language}&organization=${chatConfig.organization}&translation=all`
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
			contextPrompt += '\n\n## 📖 Bible Context\n\n';

			successfulCalls.forEach((call) => {
				console.log(`=== DEBUG: Processing ${call.endpoint} ===`);
				console.log('Response:', call.response);

				if (call.response) {
					if (call.endpoint === '/api/fetch-scripture') {
						if (call.response.scriptures) {
							// Multiple translations returned
							console.log('Multiple scriptures found:', call.response.scriptures);
							contextPrompt += '### Scripture Translations\n\n';
							call.response.scriptures.forEach((scripture: any, index: number) => {
								contextPrompt += `**${scripture.translation.toUpperCase()}**: ${scripture.text}\n\n`;
							});
							if (call.response.scriptures[0]?.citation) {
								citations.scripture = call.response.scriptures[0].citation;
							}
						} else if (call.response.scripture) {
							// Single translation returned (legacy format)
							console.log('Scripture found:', call.response.scripture);
							contextPrompt += '### Scripture\n\n';
							contextPrompt += `${call.response.scripture.text}\n\n`;
							if (call.response.scripture.citation) {
								citations.scripture = call.response.scripture.citation;
							}
						}
					}
					if (call.endpoint === '/api/fetch-translation-notes' && call.response.translationNotes) {
						console.log('Translation notes found:', call.response.translationNotes);
						contextPrompt += '### 📝 Translation Notes\n\n';

						call.response.translationNotes.forEach((note: any, index: number) => {
							contextPrompt += `#### Note ${index + 1}\n`;
							contextPrompt += `**Reference**: ${note.reference || 'Unknown'}\n`;
							if (note.quote) {
								contextPrompt += `**Greek Quote**: ${note.quote}\n`;
							}
							if (note.occurrence) {
								contextPrompt += `**Occurrence**: ${note.occurrence}\n`;
							}
							if (note.tags) {
								contextPrompt += `**Tags**: ${note.tags}\n`;
							}
							if (note.supportReference) {
								contextPrompt += `**Support Reference**: ${note.supportReference}\n`;
							}
							contextPrompt += `**Note**: ${note.note}\n\n`;
						});

						if (call.response.citation) {
							citations.translationNotes = call.response.citation;
						}
					}
					if (call.endpoint === '/api/fetch-translation-words' && call.response.translationWords) {
						console.log('Translation words found:', call.response.translationWords);
						contextPrompt += '### 📚 Translation Words\n\n';

						call.response.translationWords.forEach((word: any, index: number) => {
							contextPrompt += `#### Word ${index + 1}\n`;
							contextPrompt += `**Term**: ${word.term}\n`;
							if (word.definition) {
								contextPrompt += `**Definition**: ${word.definition}\n`;
							}
							if (word.content) {
								contextPrompt += `**Content**: ${word.content}\n`;
							}
							contextPrompt += '\n';
						});

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

		// Log the word detection specifically
		const wordMatchDebug = userMessage.match(/["']([^"']+)["']/);
		console.log('=== DEBUG: Word detection ===');
		console.log('User message:', userMessage);
		console.log('Word match:', wordMatchDebug);
		console.log('Extracted word:', wordMatchDebug ? wordMatchDebug[1] : 'No word found');

		// Generate thinking trace
		const thinkingTrace = chatService.generateThinkingTrace(userMessage, apiCalls);

		// Generate AI response with citations
		const llmResponse = await chatService.generateResponse(userMessage);

		const responseTime = performance.now() - startTime;

		return {
			content: llmResponse.success ? llmResponse.response : `Error: ${llmResponse.error}`,
			apiCalls,
			responseTime: responseTime,
			thinkingTrace
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

	function toggleThinkingTrace(id: string) {
		if (collapsedThinkingTraces.has(id)) {
			collapsedThinkingTraces.delete(id);
		} else {
			collapsedThinkingTraces.add(id);
		}
		collapsedThinkingTraces = collapsedThinkingTraces; // Trigger reactivity
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
		collapsedThinkingTraces.clear();
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
			class="mb-6 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300"
		>
			<Code class="mr-2 h-4 w-4" />
			Reference Implementation
		</div>
		<h1 class="mb-6 text-4xl font-bold text-white md:text-5xl">
			API Demo:
			<span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"
				>Bible Resource Assistant</span
			>
		</h1>
		<p class="mx-auto max-w-3xl text-xl text-gray-300">
			This is a <strong>reference implementation</strong> showing how to integrate our Translation Helps
			MCP Server with a browser-based AI model. The AI runs entirely on your device - no servers needed!
			It can fetch and display Bible resources based on your queries, but has limited reasoning capabilities.
		</p>
		<div class="mx-auto mt-4 max-w-2xl rounded-lg border border-green-500/20 bg-green-500/10 p-4">
			<div class="mb-2 flex items-center space-x-2">
				<Zap class="h-4 w-4 text-green-400" />
				<span class="text-sm font-medium text-green-300">Runs on Your Device!</span>
			</div>
			<p class="text-sm text-green-200">
				The AI model runs completely on your phone, laptop, or tablet - no servers involved! Your
				Bible questions stay private and local. Only the Bible resource requests go to our MCP
				server.
			</p>
		</div>
		<div class="mx-auto mt-4 max-w-2xl rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
			<div class="mb-2 flex items-center space-x-2">
				<AlertCircle class="h-4 w-4 text-yellow-400" />
				<span class="text-sm font-medium text-yellow-300">Demo Limitations</span>
			</div>
			<p class="text-sm text-yellow-200">
				This uses a small, limited AI model for demonstration purposes. It can search and display
				relevant Bible resources, but cannot provide deep theological analysis or complex reasoning.
				It's designed to show the MCP integration capabilities.
			</p>
		</div>
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
							<h2 class="text-lg font-semibold text-white">Bible Resource Assistant</h2>
							<div class="flex items-center space-x-2">
								<p class="text-sm text-gray-400">
									Reference Implementation • Translation Helps MCP Server
								</p>
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
										<!-- Thinking Trace during typing -->
										{#if message.thinkingTrace && message.thinkingTrace.length > 0}
											<div class="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
												<div class="mb-3 flex items-center justify-between">
													<div class="flex items-center space-x-2">
														<Lightbulb class="h-4 w-4 text-blue-400" />
														<span class="text-sm font-medium text-blue-300">AI Thinking Process</span>
														{#if message.isTyping}
															<div class="flex space-x-1">
																<div class="h-2 w-2 animate-bounce rounded-full bg-blue-400"></div>
																<div
																	class="h-2 w-2 animate-bounce rounded-full bg-blue-400"
																	style="animation-delay: 0.1s"
																></div>
																<div
																	class="h-2 w-2 animate-bounce rounded-full bg-blue-400"
																	style="animation-delay: 0.2s"
																></div>
															</div>
														{/if}
													</div>
													{#if !message.isTyping}
														<button
															on:click={() => toggleThinkingTrace(message.id)}
															class="flex items-center space-x-1 rounded px-2 py-1 text-xs transition-colors hover:bg-blue-500/20"
														>
															{#if collapsedThinkingTraces.has(message.id)}
																<ChevronDown class="h-3 w-3 text-blue-400" />
																<span class="text-blue-400">Show</span>
															{:else}
																<ChevronUp class="h-3 w-3 text-blue-400" />
																<span class="text-blue-400">Hide</span>
															{/if}
														</button>
													{/if}
												</div>
												{#if !collapsedThinkingTraces.has(message.id) || message.isTyping}
													<div class="space-y-2">
														{#each message.thinkingTrace as step, index}
															<div class="flex items-start space-x-3">
																<div class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-medium text-blue-300">
																	{index + 1}
																</div>
																<div class="flex-1 text-sm text-blue-200">
																	{@html marked(step)}
																</div>
															</div>
														{/each}
													</div>
												{/if}
											</div>
										{/if}
									{:else}

										<div class="ai-response-content max-w-none leading-relaxed text-gray-300">
											<style>
												/* Override Tailwind's base layer resets */
												@layer base {
													:global(.ai-response-content ol) {
														list-style: decimal !important;
														padding-left: 1.5rem !important;
														margin: 0 !important;
													}
													:global(.ai-response-content ul) {
														list-style: disc !important;
														padding-left: 1.5rem !important;
														margin: 0 !important;
													}
													:global(.ai-response-content li) {
														margin: 0 !important;
														padding: 0 !important;
														list-style: inherit !important;
													}
												}

												/* Component styles */
												:global(.ai-response-content h2) {
													color: white !important;
													font-weight: 600 !important;
													font-size: 1.25rem !important;
													margin-bottom: 1rem !important;
												}
												:global(.ai-response-content h3) {
													color: white !important;
													font-weight: 600 !important;
													font-size: 1.125rem !important;
													margin-bottom: 0.75rem !important;
												}
												:global(.ai-response-content p) {
													color: rgb(209 213 219) !important;
													line-height: 1.625 !important;
													margin-bottom: 1rem !important;
												}
												:global(.ai-response-content strong) {
													color: white !important;
													font-weight: 600 !important;
												}
												:global(.ai-response-content blockquote) {
													border-left: 4px solid rgb(168 85 247) !important;
													background-color: rgba(168, 85, 247, 0.1) !important;
													padding-left: 1rem !important;
													padding-top: 0.5rem !important;
													padding-bottom: 0.5rem !important;
													margin: 1rem 0 !important;
												}
												:global(.ai-response-content li) {
													color: rgb(209 213 219) !important;
													margin-bottom: 0.25rem !important;
												}
												:global(.ai-response-content hr) {
													border-color: rgba(255, 255, 255, 0.2) !important;
													margin: 1.5rem 0 !important;
												}
											</style>
											{@html marked(message.content)}
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

									<!-- Clean Debug Panel -->
									{#if message.apiCalls && message.apiCalls.length > 0 && !message.isTyping}
										<!-- Debug Toggle Bar -->
										<div
											class="mt-4 flex items-center justify-between rounded-lg bg-gray-900/30 px-3 py-2"
										>
											<div class="flex items-center space-x-2">
												<Code class="h-3 w-3 text-gray-400" />
												<span class="text-xs text-gray-300">Debug Info</span>
												<span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
													{message.apiCalls.length} API calls
												</span>
												{#if message.responseTime}
													<span class="text-xs text-gray-400">
														• {message.responseTime.toFixed(0)}ms total
													</span>
												{/if}
											</div>
											<button
												on:click={() => toggleMessageExpansion(message.id)}
												class="flex items-center space-x-1 rounded px-2 py-1 text-xs transition-colors hover:bg-gray-700"
											>
												{#if expandedMessages.has(message.id)}
													<ChevronUp class="h-3 w-3 text-gray-400" />
													<span class="text-gray-400">Hide</span>
												{:else}
													<ChevronDown class="h-3 w-3 text-gray-400" />
													<span class="text-gray-400">Show</span>
												{/if}
											</button>
										</div>

										<!-- Expanded Debug Panel -->
										{#if expandedMessages.has(message.id)}
											<div class="mt-2 space-y-4 rounded-lg bg-gray-900/50 p-4">
												<!-- Raw Response Content -->
												<div>
													<h4 class="mb-2 text-xs font-semibold text-gray-200">Raw AI Response</h4>
													<pre
														class="max-h-32 overflow-auto rounded bg-black/50 p-3 text-xs text-gray-300">{message.content}</pre>
												</div>

												<!-- API Calls Summary -->
												<div>
													<h4 class="mb-2 text-xs font-semibold text-gray-200">
														API Calls Summary
													</h4>
													<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
														{#each message.apiCalls as call}
															<div class="flex items-center space-x-2 rounded bg-gray-800/50 p-2">
																<svelte:component
																	this={call.status === 'success' ? CheckCircle2 : AlertCircle}
																	class="h-3 w-3 {call.status === 'success'
																		? 'text-green-400'
																		: 'text-red-400'}"
																/>
																<div class="min-w-0 flex-1">
																	<div class="truncate font-mono text-xs text-purple-300">
																		{call.endpoint.split('/').pop()}
																	</div>
																	<div class="flex items-center space-x-2 text-xs text-gray-400">
																		<Timer class="h-2 w-2" />
																		<span>{call.responseTime.toFixed(0)}ms</span>
																		{#if call.endpoint === '/api/fetch-translation-notes' && call.response?.translationNotes}
																			<span class="text-yellow-300"
																				>• {call.response.translationNotes.length} notes</span
																			>
																		{/if}
																		{#if call.endpoint === '/api/fetch-scripture'}
																			{#if call.response?.scriptures}
																				<span class="text-yellow-300"
																					>• {call.response.scriptures.length} translations</span
																				>
																			{:else if call.response?.scripture}
																				<span class="text-yellow-300"
																					>• {call.response.scripture.text?.length} chars</span
																				>
																			{/if}
																		{/if}
																		{#if call.endpoint === '/api/fetch-translation-words' && call.response?.translationWords}
																			<span class="text-yellow-300"
																				>• {call.response.translationWords.length} words</span
																			>
																		{/if}
																	</div>
																</div>
															</div>
														{/each}
													</div>
												</div>

												<!-- Detailed API Call Data -->
												<div>
													<h4 class="mb-2 text-xs font-semibold text-gray-200">
														Detailed API Data
													</h4>
													<div class="space-y-3">
														{#each message.apiCalls as call, index}
															<div class="rounded bg-gray-800/30 p-3">
																<div class="mb-2 flex items-center justify-between">
																	<div class="flex items-center space-x-2">
																		<span class="font-mono text-sm text-purple-300"
																			>{call.endpoint}</span
																		>
																		<span class="text-gray-400">—</span>
																		<span
																			class={call.status === 'success'
																				? 'text-green-400'
																				: 'text-red-400'}>{call.status}</span
																		>
																		<span class="text-gray-400"
																			>({call.responseTime.toFixed(0)}ms)</span
																		>
																	</div>
																</div>

																<!-- Parameters -->
																<div class="mb-2">
																	<div class="text-xs text-gray-400">Parameters:</div>
																	<pre
																		class="mt-1 max-h-20 overflow-auto rounded bg-black/50 p-2 text-xs">{JSON.stringify(
																			call.params,
																			null,
																			2
																		)}</pre>
																</div>

																<!-- Response Data -->
																{#if call.response}
																	<div class="mb-2">
																		<div class="text-xs text-yellow-300">Response Data:</div>
																		<pre
																			class="mt-1 max-h-40 overflow-auto rounded bg-black/50 p-2 text-xs">{JSON.stringify(
																				call.response,
																				null,
																				2
																			)}</pre>
																	</div>
																{/if}
															</div>
														{/each}
													</div>
												</div>
											</div>
										{/if}
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
</div>
