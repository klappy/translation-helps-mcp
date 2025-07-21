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

	// Configure marked with custom renderer for Tailwind classes
	const renderer = new marked.Renderer();

	// Configure list rendering with proper Tailwind classes
	renderer.list = function (token) {
		const ordered = token.ordered;
		const body = token.items.map((item) => this.listitem(item)).join('');
		const type = ordered ? 'ol' : 'ul';
		const listClass = ordered
			? 'list-decimal list-inside pl-4 space-y-1'
			: 'list-disc list-inside pl-4 space-y-1';
		return `<${type} class="${listClass}">\n${body}</${type}>\n`;
	};

	renderer.listitem = function (token) {
		const text = this.parser.parse(token.tokens || []);
		return `<li class="text-gray-300 leading-relaxed">${text}</li>\n`;
	};

	// Configure heading rendering
	renderer.heading = function (token) {
		const text = this.parser.parseInline(token.tokens || []);
		const level = token.depth;
		const classes = {
			1: 'text-2xl font-bold text-white mb-4 mt-6',
			2: 'text-xl font-semibold text-white mb-3 mt-5',
			3: 'text-lg font-medium text-white mb-2 mt-4',
			4: 'text-base font-medium text-white mb-2 mt-3',
			5: 'text-sm font-medium text-white mb-1 mt-2',
			6: 'text-sm font-medium text-white mb-1 mt-2'
		} as const;
		const className = classes[level as keyof typeof classes] || classes[6];
		return `<h${level} class="${className}">${text}</h${level}>`;
	};

	// Configure paragraph rendering
	renderer.paragraph = function (token) {
		const text = this.parser.parseInline(token.tokens || []);
		return `<p class="text-gray-300 leading-relaxed mb-4">${text}</p>`;
	};

	// Configure strong/bold rendering
	renderer.strong = function (token) {
		const text = this.parser.parseInline(token.tokens || []);
		return `<strong class="font-semibold text-white">${text}</strong>`;
	};

	// Configure emphasis/italic rendering
	renderer.em = function (token) {
		const text = this.parser.parseInline(token.tokens || []);
		return `<em class="italic text-gray-200">${text}</em>`;
	};

	// Configure code rendering
	renderer.code = function (token) {
		const code = token.text;
		const language = token.lang || '';
		return `<pre class="bg-gray-900 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-green-400 text-sm font-mono">${code}</code></pre>`;
	};

	renderer.codespan = function (token) {
		const code = token.text;
		return `<code class="bg-gray-800 text-green-400 px-2 py-1 rounded text-sm font-mono">${code}</code>`;
	};

	// Configure blockquote rendering
	renderer.blockquote = function (token) {
		const quote = this.parser.parse(token.tokens || []);
		return `<blockquote class="border-l-4 border-purple-500 bg-purple-500/10 pl-4 py-2 my-4 italic text-purple-200">${quote}</blockquote>`;
	};

	// Configure horizontal rule rendering
	renderer.hr = function () {
		return `<hr class="border-gray-600 my-6">`;
	};

	// Configure link rendering
	renderer.link = function (token) {
		const href = token.href;
		const title = token.title || '';
		const text = this.parser.parseInline(token.tokens || []);
		const titleAttr = title ? ` title="${title}"` : '';
		return `<a href="${href}" class="text-blue-400 hover:text-blue-300 underline"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
	};

	// Set the custom renderer
	marked.setOptions({
		renderer: renderer,
		breaks: true,
		gfm: true
	});

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
		isFallback?: boolean;
		overallStatus?: 'success' | 'warning' | 'error';
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
				content: `Hello! I'm a **reference implementation** of a Bible resource assistant, powered by **OpenAI's GPT-4o-mini** model!

**What I can do:**
• Search and display relevant Bible verses, translation notes, and word definitions
• Fetch translation helps and linguistic resources based on your queries
• Show you how the Translation Helps MCP Server integration works
• Provide intelligent analysis and context for Bible study

**What I cannot do:**
• Provide deep theological analysis or complex reasoning
• Answer questions that require extensive biblical knowledge
• Generate original insights beyond the resources I can fetch

**AI Model & Performance:**
• Powered by OpenAI's GPT-4o-mini for optimal balance of performance and cost
• Your questions are processed securely through our backend
• Only Bible resource requests go to our MCP server
• Fast, reliable responses for Bible study and translation work

✅ **Ready to help!** Try asking me something like "Show me Titus 1:1" or "What are the translation notes for 'grace'?" to see the MCP integration in action.`,
				timestamp: new Date()
			}
		];

		// Initialize the chat service
		try {
			llmStatus = 'initializing';
			// Chat service initializes automatically in constructor
			llmStatus = 'ready';

			// Update welcome message once service is ready
			messages = messages.map((msg) =>
				msg.id === 'welcome'
					? {
							...msg,
							content: `Hello! I'm a **reference implementation** of a Bible resource assistant, powered by **OpenAI's GPT-4o-mini** model!

**What I can do:**
• Search and display relevant Bible verses, translation notes, and word definitions
• Fetch translation helps and linguistic resources based on your queries
• Show you how the Translation Helps MCP Server integration works
• Provide intelligent analysis and context for Bible study

**What I cannot do:**
• Provide deep theological analysis or complex reasoning
• Answer questions that require extensive biblical knowledge
• Generate original insights beyond the resources I can fetch

**AI Model & Performance:**
• Powered by OpenAI's GPT-4o-mini for optimal balance of performance and cost
• Your questions are processed securely through our backend
• Only Bible resource requests go to our MCP server
• Fast, reliable responses for Bible study and translation work

✅ **Ready to help!** Try asking me something like "Show me Titus 1:1" or "What are the translation notes for 'grace'?" to see the MCP integration in action.`
						}
					: msg
			);
		} catch (error) {
			console.error('Failed to initialize chat service:', error);
			llmStatus = 'error';
		}
	});

	// Send message with streaming response
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

		// Create typing message for streaming
		const typingMessage: ChatMessage = {
			id: (Date.now() + 1).toString(),
			role: 'assistant',
			content: '',
			timestamp: new Date(),
			isTyping: true,
			thinkingTrace: [],
			apiCalls: []
		};

		messages = [...messages, typingMessage];

		// Track actual API calls that happen
		const apiCallsTracked: ApiCall[] = [];
		const messageStartTime = performance.now();

		try {
			// First, gather Bible context if needed
			const lowerMessage = messageToSend.toLowerCase();

			// Check for scripture references
			const scriptureMatch = messageToSend.match(/(\w+\s+\d+:\d+(?:-\d+)?)/);
			if (scriptureMatch) {
				const reference = scriptureMatch[1];

				// Fetch scripture with timing
				try {
					const scriptureStart = performance.now();
					const scriptureResponse = await fetch(
						`/api/fetch-scripture?reference=${encodeURIComponent(reference)}&language=${chatConfig.language}&organization=${chatConfig.organization}&translation=all`
					);
					const scriptureData = await scriptureResponse.json();
					const scriptureTime = performance.now() - scriptureStart;

					apiCallsTracked.push({
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
					apiCallsTracked.push({
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

				// Fetch translation notes with timing
				try {
					const notesStart = performance.now();
					const notesResponse = await fetch(
						`/api/fetch-translation-notes?reference=${encodeURIComponent(reference)}&language=${chatConfig.language}&organization=${chatConfig.organization}`
					);
					const notesData = await notesResponse.json();
					const notesTime = performance.now() - notesStart;

					apiCallsTracked.push({
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
					apiCallsTracked.push({
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
			const wordMatch = messageToSend.match(/["']([^"']+)["']/);
			if (wordMatch) {
				const word = wordMatch[1];
				try {
					const wordStart = performance.now();
					const wordResponse = await fetch(
						`/api/fetch-translation-words?word=${encodeURIComponent(word)}&language=${chatConfig.language}&organization=${chatConfig.organization}&includeTitle=true&includeSubtitle=true&includeContent=true`
					);
					const wordData = await wordResponse.json();
					const wordTime = performance.now() - wordStart;

					apiCallsTracked.push({
						endpoint: '/api/fetch-translation-words',
						params: { word, language: chatConfig.language, organization: chatConfig.organization },
						response: wordData,
						responseTime: wordTime,
						status: wordResponse.ok ? 'success' : 'error'
					});
				} catch (error) {
					apiCallsTracked.push({
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

			// Build context for the AI
			let contextMessage = messageToSend + '\n\n---\n\n## MCP Response Data\n\n';

			// Add fetched data to context
			for (const call of apiCallsTracked) {
				if (call.status === 'success' && call.response) {
					contextMessage += `### ${call.endpoint}\n\`\`\`json\n${JSON.stringify(call.response, null, 2)}\n\`\`\`\n\n`;
				}
			}

			// Use simple non-streaming response
			const response = await chatService.generateResponse(contextMessage);

			// Handle the response
			if (response.success) {
				const totalResponseTime = performance.now() - messageStartTime;

				// Calculate overall status based on API calls
				const hasFailedCalls = apiCallsTracked.some((call) => call.status === 'error');

				let overallStatus: 'success' | 'warning' | 'error' = 'success';
				if (hasFailedCalls) {
					overallStatus = 'error';
				} else if (response.isFallback) {
					overallStatus = 'warning';
				}

				// Replace typing message with final message
				const assistantMessage: ChatMessage = {
					id: (Date.now() + 2).toString(),
					role: 'assistant',
					content: response.response || '',
					timestamp: new Date(),
					apiCalls: apiCallsTracked,
					responseTime: totalResponseTime,
					thinkingTrace: [],
					status: 'sent',
					isFallback: response.isFallback || false,
					overallStatus: overallStatus
				};

				messages = [...messages.slice(0, -1), assistantMessage];
			} else {
				// Handle error response
				const errorMessage: ChatMessage = {
					id: (Date.now() + 2).toString(),
					role: 'assistant',
					content: `Error: ${response.error}`,
					timestamp: new Date(),
					status: 'error',
					overallStatus: 'error'
				};

				messages = [...messages.slice(0, -1), errorMessage];
			}
		} catch (error) {
			// Remove typing indicator
			messages = messages.filter((msg) => !msg.isTyping);

			const errorMessage: ChatMessage = {
				id: (Date.now() + 2).toString(),
				role: 'assistant',
				content: 'Sorry, I encountered an error while processing your request. Please try again.',
				timestamp: new Date(),
				status: 'error',
				overallStatus: 'error'
			};
			messages = [...messages, errorMessage];
		}

		// Update user message status
		messages = messages.map((msg) =>
			msg.role === 'user' && msg.status === 'sending' ? { ...msg, status: 'sent' } : msg
		);

		isLoading = false;
	}

	// DEPRECATED - This function is no longer used
	// We now use streaming response directly in sendMessage()
	/*
	async function generateAIResponse(
		userMessage: string
	): Promise<{
		content: string;
		apiCalls: ApiCall[];
		responseTime: number;
		thinkingTrace: string[];
		isFallback?: boolean;
	}> {
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
					`/api/fetch-scripture?reference=${encodeURIComponent(reference)}&language=${chatConfig.language}&organization=${chatConfig.organization}&translation=all`
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
					`/api/fetch-translation-notes?reference=${encodeURIComponent(reference)}&language=${chatConfig.language}&organization=${chatConfig.organization}`
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
					`/api/fetch-translation-words?word=${encodeURIComponent(word)}&language=${chatConfig.language}&organization=${chatConfig.organization}&includeTitle=true&includeSubtitle=true&includeContent=true`
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

		// Update thinking trace if it's a fallback response
		if ((llmResponse as any).isFallback) {
			thinkingTrace.push(`🎭 **OpenAI API call failed** - falling back to development mode`);
			thinkingTrace.push(`⚠️ **Using pre-written mock response** instead of real AI`);
		}

		return {
			content: llmResponse.success ? llmResponse.response : `Error: ${llmResponse.error}`,
			apiCalls,
			responseTime: responseTime,
			thinkingTrace,
			isFallback: (llmResponse as any).isFallback || false
		};
	}
	*/

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

	/**
	 * Calculate overall status based on API calls and fallback status
	 */
	function calculateOverallStatus(
		apiCalls: ApiCall[] = [],
		isFallback: boolean = false
	): 'success' | 'warning' | 'error' {
		// If there are no API calls and it's not a fallback, it's an error
		if (apiCalls.length === 0 && !isFallback) {
			return 'error';
		}

		// Check if any API calls failed
		const hasFailedCalls = apiCalls.some((call) => call.status === 'error');

		// If any API calls failed, it's an error
		if (hasFailedCalls) {
			return 'error';
		}

		// If all API calls succeeded but it's a fallback, it's a warning
		if (isFallback) {
			return 'warning';
		}

		// If all API calls succeeded and it's not a fallback, it's success
		return 'success';
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
	<title>AI Chat - The Aqueduct</title>
	<meta
		name="description"
		content="Chat with our AI-powered Bible assistant. Reference implementation of Translation Helps MCP Server."
	/>
</svelte:head>

<!-- Page Content -->
<section class="relative px-4 py-16 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<!-- Header -->
		<div class="mb-16 text-center">
			<div
				class="mb-8 inline-flex animate-pulse items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-medium text-blue-300 backdrop-blur-xl"
			>
				<MessageSquare class="mr-2 h-4 w-4" />
				Reference Implementation • Live Demo
			</div>
			<h1 class="mb-8 text-5xl font-bold text-white md:text-6xl">
				Talk to
				<span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
					The Aqueduct
				</span>
			</h1>
			<p class="mx-auto max-w-4xl text-xl leading-relaxed text-gray-300 md:text-2xl">
				Ask questions about the Bible and get
				<strong class="text-blue-300">intelligent, contextualized answers</strong>
				powered by our MCP server and canonical resources.
			</p>

			<!-- Feature Cards -->
			<div class="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
				<div
					class="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 backdrop-blur-xl transition-all duration-300 hover:scale-105"
				>
					<div class="mb-4 flex items-center space-x-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
							<Zap class="h-5 w-5 text-green-400" />
						</div>
						<span class="text-lg font-semibold text-green-300">Powered by GPT-4o-mini</span>
					</div>
					<p class="text-green-200">
						Optimal balance of performance and cost. Secure processing with fast, reliable responses
						for Bible study and translation work.
					</p>
				</div>

				<div
					class="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6 backdrop-blur-xl transition-all duration-300 hover:scale-105"
				>
					<div class="mb-4 flex items-center space-x-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
							<Bot class="h-5 w-5 text-blue-400" />
						</div>
						<span class="text-lg font-semibold text-blue-300">Intelligent Bible Assistant</span>
					</div>
					<p class="text-blue-200">
						Search and display relevant Bible resources with intelligent analysis. Built for Bible
						study through MCP integration.
					</p>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
			<!-- Chat Interface -->
			<div class="lg:col-span-3">
				<div
					class="flex h-[600px] flex-col rounded-3xl border border-blue-500/30 bg-white/5 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-blue-500/40"
				>
					<!-- Chat Header -->
					<div
						class="flex items-center justify-between border-b border-blue-500/30 p-6 backdrop-blur-xl"
					>
						<div class="flex items-center space-x-4">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 transition-transform duration-300 hover:scale-110 hover:rotate-12"
							>
								<Bot class="h-6 w-6 text-white" />
							</div>
							<div>
								<h2 class="text-xl font-bold text-white">The Aqueduct Assistant</h2>
								<div class="flex items-center space-x-2">
									<p class="text-sm text-blue-200">Live Demo • Translation Helps MCP Server</p>
									{#if llmStatus === 'initializing'}
										<div
											class="flex items-center space-x-1 rounded-full bg-yellow-500/20 px-2 py-1"
										>
											<Loader2 class="h-3 w-3 animate-spin text-yellow-400" />
											<span class="text-xs text-yellow-400">Initializing...</span>
										</div>
									{:else if llmStatus === 'ready'}
										<div class="flex items-center space-x-1 rounded-full bg-green-500/20 px-2 py-1">
											<CheckCircle2 class="h-3 w-3 text-green-400" />
											<span class="text-xs text-green-400">Ready</span>
										</div>
									{:else if llmStatus === 'error'}
										<div class="flex items-center space-x-1 rounded-full bg-red-500/20 px-2 py-1">
											<AlertCircle class="h-3 w-3 text-red-400" />
											<span class="text-xs text-red-400">Error</span>
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
													<div class="flex items-center space-x-2">
														<span class="text-sm font-medium">Bible AI</span>
														{#if message.isFallback}
															<span
																class="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/20 px-2 py-1 text-xs font-medium text-yellow-300"
															>
																🎭 Mock
															</span>
														{/if}
													</div>
												{/if}
											</div>
											<div class="flex items-center space-x-2">
												{#if message.responseTime}
													<div class="flex items-center space-x-1 text-xs opacity-70">
														<Timer class="h-3 w-3" />
														<span>{message.responseTime.toFixed(0)}ms</span>
													</div>
												{/if}
												{#if message.overallStatus}
													<div class="flex items-center space-x-1">
														{#if message.overallStatus === 'success'}
															<div
																class="h-3 w-3 rounded-full bg-green-500"
																title="All systems working perfectly"
															></div>
														{:else if message.overallStatus === 'warning'}
															<div
																class="h-3 w-3 rounded-full bg-yellow-500"
																title="Tool calls worked but AI response was mocked"
															></div>
														{:else if message.overallStatus === 'error'}
															<div
																class="h-3 w-3 rounded-full bg-red-500"
																title="Some tool calls failed"
															></div>
														{/if}
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
											<!-- Simple typing indicator -->
											<div class="flex items-center space-x-3 p-4">
												<span class="text-sm text-blue-300">AI is thinking</span>
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
											</div>

											<!-- Thinking Trace during typing -->
											{#if message.thinkingTrace && message.thinkingTrace.length > 0}
												<div class="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
													<div class="mb-3 flex items-center justify-between">
														<div class="flex items-center space-x-2">
															<Lightbulb class="h-4 w-4 text-blue-400" />
															<span class="text-sm font-medium text-blue-300"
																>AI Thinking Process</span
															>
															{#if message.overallStatus && !message.isTyping}
																{#if message.overallStatus === 'success'}
																	<div
																		class="flex items-center space-x-1 rounded-full bg-green-500/20 px-2 py-1"
																	>
																		<div class="h-2 w-2 rounded-full bg-green-500"></div>
																		<span class="text-xs font-medium text-green-300"
																			>All Systems OK</span
																		>
																	</div>
																{:else if message.overallStatus === 'warning'}
																	<div
																		class="flex items-center space-x-1 rounded-full bg-yellow-500/20 px-2 py-1"
																	>
																		<div class="h-2 w-2 rounded-full bg-yellow-500"></div>
																		<span class="text-xs font-medium text-yellow-300"
																			>Mock Response</span
																		>
																	</div>
																{:else if message.overallStatus === 'error'}
																	<div
																		class="flex items-center space-x-1 rounded-full bg-red-500/20 px-2 py-1"
																	>
																		<div class="h-2 w-2 rounded-full bg-red-500"></div>
																		<span class="text-xs font-medium text-red-300">API Errors</span>
																	</div>
																{/if}
															{/if}
															{#if message.isTyping}
																<div class="flex space-x-1">
																	<div
																		class="h-2 w-2 animate-bounce rounded-full bg-blue-400"
																	></div>
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
																	<div
																		class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-medium text-blue-300"
																	>
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
											<!-- Thinking Trace for Completed Messages (at the beginning) -->
											{#if message.thinkingTrace && message.thinkingTrace.length > 0}
												<div class="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
													<div class="mb-3 flex items-center justify-between">
														<div class="flex items-center space-x-2">
															<Lightbulb class="h-4 w-4 text-blue-400" />
															<span class="text-sm font-medium text-blue-300"
																>AI Thinking Process</span
															>
															{#if message.overallStatus}
																{#if message.overallStatus === 'success'}
																	<div
																		class="flex items-center space-x-1 rounded-full bg-green-500/20 px-2 py-1"
																	>
																		<div class="h-2 w-2 rounded-full bg-green-500"></div>
																		<span class="text-xs font-medium text-green-300"
																			>All Systems OK</span
																		>
																	</div>
																{:else if message.overallStatus === 'warning'}
																	<div
																		class="flex items-center space-x-1 rounded-full bg-yellow-500/20 px-2 py-1"
																	>
																		<div class="h-2 w-2 rounded-full bg-yellow-500"></div>
																		<span class="text-xs font-medium text-yellow-300"
																			>Mock Response</span
																		>
																	</div>
																{:else if message.overallStatus === 'error'}
																	<div
																		class="flex items-center space-x-1 rounded-full bg-red-500/20 px-2 py-1"
																	>
																		<div class="h-2 w-2 rounded-full bg-red-500"></div>
																		<span class="text-xs font-medium text-red-300">API Errors</span>
																	</div>
																{/if}
															{/if}
														</div>
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
													</div>
													{#if !collapsedThinkingTraces.has(message.id)}
														<div class="space-y-2">
															{#each message.thinkingTrace as step, index}
																<div class="flex items-start space-x-3">
																	<div
																		class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-medium text-blue-300"
																	>
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

											<!-- AI Response Content -->
											<div class="ai-response-content max-w-none">
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
														<h4 class="mb-2 text-xs font-semibold text-gray-200">
															Raw AI Response
														</h4>
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
					<div class="border-t border-blue-500/30 p-6 backdrop-blur-xl">
						<div class="flex items-end space-x-4">
							<div class="flex-1">
								<textarea
									bind:value={currentMessage}
									on:keydown={handleKeydown}
									placeholder="Ask The Aqueduct anything about the Bible..."
									class="w-full resize-none rounded-2xl border border-blue-500/30 bg-white/5 px-6 py-4 text-white placeholder-blue-300/70 backdrop-blur-xl transition-all duration-300 focus:border-blue-400 focus:bg-white/10 focus:ring-2 focus:ring-blue-400/20"
									rows="2"
									disabled={isLoading}
								></textarea>
							</div>
							<button
								on:click={sendMessage}
								disabled={!currentMessage.trim() || isLoading}
								class="flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-4 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-cyan-700 hover:shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
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
						<div
							class="rounded-3xl border border-blue-500/30 bg-white/5 p-6 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:border-blue-500/40"
						>
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
</section>
