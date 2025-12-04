<script lang="ts">
	import { browser } from '$app/environment';
	import { Droplets, Eye, EyeOff, Send, TrendingUp, User } from 'lucide-svelte';
	import { marked } from 'marked';
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import XRayPanel from './XRayPanel.svelte';
	import DebugSidebar from './DebugSidebar.svelte';
	import ThinkingBubble from './ThinkingBubble.svelte';
	import { AGENT_DISPLAY_INFO, type AgentName } from '$lib/ai/agents/types.js';

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
	const USE_STREAM = true;

	// Debug console state - logs all MCP responses (successful and failed)
	let debugLogs: Array<{
		id: string;
		timestamp: Date;
		type: 'mcp-tool' | 'mcp-prompt' | 'network' | 'llm' | 'other';
		endpoint?: string;
		params?: Record<string, any>;
		error?: string;
		status?: number;
		duration?: number;
		userMessage?: string;
		response?: any; // Full MCP server response
		llmResponse?: string; // LLM's final response for comparison
		isError?: boolean; // Whether this is an error or successful response
		requestId?: string; // ID of the request this log belongs to
	}> = [];

	// Track which MCP calls have already been logged to prevent duplicates
	let loggedCallIds = new Set<string>();

	// Track which request/streaming session each log belongs to
	let currentRequestId: string | null = null;

	// Multi-agent orchestration state
	let useOrchestration = true; // Feature flag - enabled for testing
	let orchestrationActive = false;
	let orchestratorStatus: 'planning' | 'dispatching' | 'synthesizing' | 'done' = 'planning';
	let orchestratorThoughts = '';
	let agentStreams: Array<{
		agent: string;
		name: string;
		icon: string;
		task: string;
		status: 'pending' | 'thinking' | 'tool-calling' | 'complete' | 'error';
		thoughts: string;
		toolCalls: Array<{ name: string; args?: string; status: string; preview?: string }>;
		summary?: string;
		error?: string;
	}> = [];
	let thinkingBubbleExpanded = true;

	// Rich starter suggestions (shown before conversation starts)
	const suggestions = [
		{
			title: 'Find a specific Bible verse with exact formatting',
			prompt:
				'Show me John 3:16 in ULT. Use verse number without a period and no blank lines between verses.',
			description: 'Ask for a verse with your preferred translation and formatting.'
		},
		{
			title: 'Explore translation notes for a chapter',
			prompt:
				'What do the Translation Notes say about Titus 1? Summarize key translation issues and include links to the specific notes.',
			description: 'Deep-dive notes with source links you can follow.'
		},
		{
			title: 'Define a biblical term from Translation Words',
			prompt:
				"Define 'agape' from Translation Words and explain how it differs from 'phileo', with 2–3 scripture examples.",
			description: 'Grounded definitions and distinctions from TW, with examples.'
		},
		{
			title: 'Study questions to guide a passage review',
			prompt:
				'Give me study questions for Genesis 1 that focus on literary structure, repeated words, and the order of creation.',
			description: 'Structured prompts drawn from official resources.'
		}
	];

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
			.replace(
				/<blockquote>/g,
				'<blockquote class="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-200">'
			)
			// Strong/Bold
			.replace(/<strong>/g, '<strong class="font-bold text-white">')
			// Horizontal rules
			.replace(/<hr>/g, '<hr class="my-6 border-gray-700">')
			// Regular links
			.replace(
				/<a href="(?!rc:\/\/)/g,
				'<a class="text-blue-400 hover:text-blue-300 underline" href="'
			);

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
			document.querySelectorAll('.rc-link').forEach((link) => {
				link.removeEventListener('click', handleRCLinkClickWrapper);
			});

			// Add new listeners
			document.querySelectorAll('.rc-link').forEach((link) => {
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
			document.querySelectorAll('.rc-link').forEach((link) => {
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
			const term = parts[parts.length - 1];
			const word = term.replace(/-/g, ' ');
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
		messages = [
			{
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
			}
		];

		// Add event listener for RC links - only in browser
		if (browser) {
			// Remove this - we're handling RC links differently
			// document.addEventListener('click', handleRCLinkClick);
		}
	});

	onDestroy(() => {
		// Clean up event listener - only in browser
		if (browser) {
			// Remove this - we're handling RC links differently
			// document.removeEventListener('click', handleRCLinkClick);
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

	// Helper function to log MCP calls to debug console (both successful and failed)
	function logMCPCall(
		type: 'mcp-tool' | 'mcp-prompt' | 'network' | 'llm' | 'other',
		details: {
			endpoint?: string;
			params?: Record<string, any>;
			status?: number;
			duration?: number;
			response?: any; // Full MCP server response
			error?: string; // Error message if failed
		}
	) {
		// Get the last user message for context
		const lastUserMessage =
			messages
				.slice()
				.reverse()
				.find((m) => m.role === 'user')?.content || '';

		// Don't try to get LLM response here - it will be updated later when the response is ready
		// This prevents getting the wrong response (like the welcome message)

		const isError = Boolean(
			details.error !== undefined || (details.status && details.status >= 400)
		);

		debugLogs = [
			...debugLogs,
			{
				id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
				timestamp: new Date(),
				type,
				userMessage: lastUserMessage,
				llmResponse: undefined, // Will be updated when LLM response is ready
				isError: isError,
				requestId: currentRequestId || undefined,
				...details
			}
		];
	}

	// Reset orchestration state for new request
	function resetOrchestrationState() {
		orchestrationActive = false;
		orchestratorStatus = 'planning';
		orchestratorThoughts = '';
		agentStreams = [];
		thinkingBubbleExpanded = true;
	}

	// Handle orchestration streaming events
	function handleOrchestrationEvent(event: string, data: unknown) {
		const eventData = data as Record<string, unknown>;

		switch (event) {
			case 'orchestrator:thinking':
				orchestrationActive = true;
				orchestratorStatus = 'planning';
				orchestratorThoughts += (eventData.delta as string) || '';
				break;

			case 'orchestrator:plan':
				orchestratorStatus = 'dispatching';
				const plan = eventData.plan as { agents: Array<{ agent: string; task: string }> };
				if (plan?.agents) {
					agentStreams = plan.agents.map((a) => {
						const agentName = a.agent as AgentName;
						const info = AGENT_DISPLAY_INFO[agentName] || { displayName: a.agent, icon: '🤖' };
						return {
							agent: a.agent,
							name: info.displayName,
							icon: info.icon,
							task: a.task,
							status: 'pending' as const,
							thoughts: '',
							toolCalls: []
						};
					});
				}
				break;

			case 'prompt:start':
				// MCP Prompt workflow started
				orchestratorStatus = 'dispatching';
				const promptName = eventData.promptName as string;
				const reference = eventData.reference as string;
				agentStreams = [
					{
						agent: 'prompt',
						name: `MCP Prompt: ${promptName}`,
						icon: '⚡',
						task: `Executing ${promptName} for ${reference}`,
						status: 'thinking' as const,
						thoughts: `Running comprehensive workflow for ${reference}...`,
						toolCalls: []
					}
				];
				break;

			case 'prompt:complete':
				// MCP Prompt workflow completed
				const promptSuccess = eventData.success as boolean;
				agentStreams = agentStreams.map((a) =>
					a.agent === 'prompt'
						? {
								...a,
								status: promptSuccess ? ('complete' as const) : ('error' as const),
								summary: promptSuccess
									? 'Prompt workflow completed successfully'
									: 'Prompt workflow failed'
							}
						: a
				);
				break;

			case 'prompt:error':
				// MCP Prompt workflow failed
				const promptError = (eventData.error as string) || 'Unknown error';
				agentStreams = agentStreams.map((a) =>
					a.agent === 'prompt'
						? {
								...a,
								status: 'error' as const,
								error: promptError
							}
						: a
				);
				break;

			case 'agent:start':
				const startAgent = eventData.agent as string;
				agentStreams = agentStreams.map((a) =>
					a.agent === startAgent ? { ...a, status: 'thinking' as const } : a
				);
				break;

			case 'agent:thinking':
				const thinkingAgent = eventData.agent as string;
				const delta = (eventData.delta as string) || '';
				agentStreams = agentStreams.map((a) =>
					a.agent === thinkingAgent
						? { ...a, status: 'thinking' as const, thoughts: a.thoughts + delta }
						: a
				);
				break;

			case 'agent:tool:start':
				const toolAgent = eventData.agent as string;
				const toolName = eventData.tool as string;
				const toolArgs = JSON.stringify(eventData.args || {});
				agentStreams = agentStreams.map((a) =>
					a.agent === toolAgent
						? {
								...a,
								status: 'tool-calling' as const,
								toolCalls: [...a.toolCalls, { name: toolName, args: toolArgs, status: 'running' }]
							}
						: a
				);
				break;

			case 'agent:tool:result':
				const resultAgent = eventData.agent as string;
				const resultTool = eventData.tool as string;
				const preview = (eventData.preview as string) || '';
				agentStreams = agentStreams.map((a) =>
					a.agent === resultAgent
						? {
								...a,
								toolCalls: a.toolCalls.map((tc) =>
									tc.name === resultTool ? { ...tc, status: 'complete', preview } : tc
								)
							}
						: a
				);
				break;

			case 'agent:summary':
				const summaryAgent = eventData.agent as string;
				const summary = (eventData.summary as string) || '';
				const success = eventData.success as boolean;
				agentStreams = agentStreams.map((a) =>
					a.agent === summaryAgent
						? { ...a, status: success ? ('complete' as const) : ('error' as const), summary }
						: a
				);
				break;

			case 'agent:error':
				const errorAgent = eventData.agent as string;
				const error = (eventData.error as string) || 'Unknown error';
				agentStreams = agentStreams.map((a) =>
					a.agent === errorAgent ? { ...a, status: 'error' as const, error } : a
				);
				break;

			case 'orchestrator:iterating':
				orchestratorThoughts += `\n${eventData.reason || 'Gathering more information...'}`;
				break;

			case 'synthesis:start':
				orchestratorStatus = 'synthesizing';
				break;

			case 'done':
				orchestratorStatus = 'done';
				// Keep the bubble visible briefly, then collapse
				setTimeout(() => {
					thinkingBubbleExpanded = false;
				}, 1000);
				break;

			case 'error':
				orchestratorStatus = 'done';
				break;
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
		const currentUserInput = inputValue.trim();
		inputValue = '';
		isLoading = true;

		// Clear logged call IDs for the new request and set new request ID
		loggedCallIds.clear();
		currentRequestId = userMessage.id; // Use the user message ID as request ID

		// Reset orchestration state for new request
		resetOrchestrationState();

		// Add loading message immediately
		const loadingMessage = {
			id: (Date.now() + 1).toString(),
			role: 'assistant',
			content: '⚡ Fetching...',
			timestamp: new Date(),
			isLoading: true
		};
		messages = [...messages, loadingMessage];

		scrollToBottom();

		// Call the AI-powered chat API
		try {
			if (USE_STREAM) {
				await streamChat(userMessage);
			} else {
				const response = await fetch('/api/chat-stream', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						message: userMessage.content,
						chatHistory: messages.slice(0, -2).map((m) => ({ role: m.role, content: m.content })),
						enableXRay: true
					})
				});
				if (!response.ok) throw new Error('Failed to get response');
				const data = await response.json();
				if (data.error) {
					// Log error to debug console
					logMCPCall('llm', {
						error: data.error,
						duration: data.metadata?.duration
					});

					const errorMessage = {
						id: (Date.now() + 1).toString(),
						role: 'assistant',
						content: `❌ Error: ${data.error}\n\nDetails: ${data.details || 'No additional details'}${data.suggestion ? '\n\nSuggestion: ' + data.suggestion : ''}`,
						timestamp: new Date(),
						isError: true
					};
					messages = [...messages, errorMessage];
				} else {
					// Log all MCP calls (both successful and failed) to debug console
					// Prefer apiCalls if available (has full response), otherwise use tools
					const mcpCalls =
						data.xrayData?.apiCalls && Array.isArray(data.xrayData.apiCalls)
							? data.xrayData.apiCalls
							: data.xrayData?.tools && Array.isArray(data.xrayData.tools)
								? data.xrayData.tools
								: [];

					for (const call of mcpCalls) {
						// Create a unique ID for this call based on endpoint and params
						const callId = `${call.endpoint || call.name}-${JSON.stringify(call.params || {})}`;

						// Only log if we haven't logged this call yet
						if (!loggedCallIds.has(callId)) {
							loggedCallIds.add(callId);
							const toolType =
								call.endpoint?.includes('prompt') || call.name?.includes('prompt')
									? 'mcp-prompt'
									: 'mcp-tool';
							logMCPCall(toolType, {
								endpoint: call.endpoint || call.name,
								params: call.params,
								status: call.status,
								duration:
									typeof call.duration === 'string'
										? parseInt(call.duration.replace('ms', ''))
										: call.duration,
								response: call.response, // Full MCP server response
								error: call.error // Error message if failed
							});
						}
					}

					// Update logs with the final LLM response
					if (data.content && currentRequestId && debugLogs.length > 0) {
						// Update all logs for this request with the final LLM response
						debugLogs = debugLogs.map((log) => {
							if (log.requestId === currentRequestId && !log.llmResponse) {
								return { ...log, llmResponse: data.content };
							}
							return log;
						});
					}
					const assistantMessage = {
						id: (Date.now() + 1).toString(),
						role: 'assistant',
						content: data.content || '',
						timestamp: new Date(),
						xrayData: data.xrayData,
						isSetupGuide: data.isSetupGuide
					};
					messages = [...messages, assistantMessage];
					currentXRayData = data.xrayData;
				}
			}
		} catch (error) {
			console.error('Chat error:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			// Log to debug console
			logMCPCall('network', {
				error: errorMessage
			});

			const errorMessageObj = {
				id: (Date.now() + 1).toString(),
				role: 'assistant',
				content: `❌ Network error: ${errorMessage}\n\nPlease check your connection and try again.`,
				timestamp: new Date(),
				isError: true
			};
			messages = [...messages, errorMessageObj];
		} finally {
			isLoading = false;
			scrollToBottom();
		}
	}

	// Streaming via SSE
	async function streamChat(userMessage) {
		// Choose endpoint based on orchestration mode
		const endpoint = useOrchestration ? '/api/chat-orchestrated' : '/api/chat-stream?stream=1';

		const body = JSON.stringify({
			message: userMessage.content,
			chatHistory: messages.slice(0, -2).map((m) => ({ role: m.role, content: m.content })),
			enableXRay: false,
			...(useOrchestration ? { config: { maxIterations: 2, confidenceThreshold: 0.5 } } : {})
		});

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'text/event-stream'
			},
			body
		});
		if (!response.body) throw new Error('No response body');

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		// Replace loading message with a real assistant message that we append to
		let streamingMessageIndex = messages.length - 1; // loading message index
		let accumulated = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const parts = buffer.split('\n\n');
			buffer = parts.pop() || '';

			for (const part of parts) {
				const lines = part.split('\n');
				let event = 'message';
				let data = '';
				for (const line of lines) {
					if (line.startsWith('event:')) event = line.replace('event:', '').trim();
					else if (line.startsWith('data:')) data += line.replace('data:', '').trim();
				}
				if (event === 'llm:delta') {
					try {
						const json = JSON.parse(data);
						if (json.text) {
							accumulated += json.text;
							messages[streamingMessageIndex] = {
								...messages[streamingMessageIndex],
								isLoading: false,
								content: accumulated
							};
							messages = [...messages];
						}
					} catch {
						// ignore
					}
				} else if (event === 'xray' || event === 'xray:final') {
					try {
						const json = JSON.parse(data);

						// Log all MCP calls (both successful and failed) to debug console
						// Prefer apiCalls if available (has full response), otherwise use tools
						const mcpCalls =
							json.apiCalls && Array.isArray(json.apiCalls)
								? json.apiCalls
								: json.tools && Array.isArray(json.tools)
									? json.tools
									: [];

						for (const call of mcpCalls) {
							// Create a unique ID for this call based on endpoint and params
							const callId = `${call.endpoint || call.name}-${JSON.stringify(call.params || {})}`;

							// Only log if we haven't logged this call yet
							if (!loggedCallIds.has(callId)) {
								loggedCallIds.add(callId);
								const toolType =
									call.endpoint?.includes('prompt') || call.name?.includes('prompt')
										? 'mcp-prompt'
										: 'mcp-tool';
								logMCPCall(toolType, {
									endpoint: call.endpoint || call.name,
									params: call.params,
									status: call.status,
									duration:
										typeof call.duration === 'string'
											? parseInt(call.duration.replace('ms', ''))
											: call.duration,
									response: call.response, // Full MCP server response
									error: call.error // Error message if failed
								});
							}
						}

						// Attach or update xray on the streaming message
						messages[streamingMessageIndex] = {
							...messages[streamingMessageIndex],
							xrayData: {
								...(messages[streamingMessageIndex].xrayData || {}),
								...json
							}
						};
						messages = [...messages];
						// If final, also set panel data and update logs with LLM response
						if (event === 'xray:final') {
							currentXRayData = messages[streamingMessageIndex].xrayData;

							// Update logs with the final LLM response when xray:final is received
							// This ensures we have the complete response
							const finalLlmResponse = messages[streamingMessageIndex]?.content;
							if (finalLlmResponse && currentRequestId && debugLogs.length > 0) {
								debugLogs = debugLogs.map((log) => {
									if (log.requestId === currentRequestId && !log.llmResponse) {
										return { ...log, llmResponse: finalLlmResponse };
									}
									return log;
								});
							}
						}
					} catch {}
				} else if (event === 'error') {
					// Log error to debug console
					try {
						const errorData = JSON.parse(data);
						logMCPCall('llm', {
							error: errorData.error || data,
							duration:
								Date.now() - (messages[streamingMessageIndex]?.timestamp?.getTime() || Date.now())
						});
					} catch {
						logMCPCall('llm', {
							error: data
						});
					}

					messages[streamingMessageIndex] = {
						...messages[streamingMessageIndex],
						isLoading: false,
						content: `❌ Error: ${data}`
					};
					messages = [...messages];
				} else if (event === 'llm:done') {
					// LLM response is complete - update logs for this request with the final LLM response
					// Use the message content from the messages array, which should be the complete response
					const finalLlmResponse = messages[streamingMessageIndex]?.content || accumulated;
					if (finalLlmResponse && currentRequestId && debugLogs.length > 0) {
						// Update all logs for this request with the final LLM response
						debugLogs = debugLogs.map((log) => {
							// If this log belongs to the current request and doesn't have an LLM response yet
							if (log.requestId === currentRequestId && !log.llmResponse) {
								return { ...log, llmResponse: finalLlmResponse };
							}
							return log;
						});
					}
				} else if (
					event.startsWith('orchestrator:') ||
					event.startsWith('agent:') ||
					event === 'synthesis:start' ||
					event === 'synthesis:delta' ||
					event === 'done'
				) {
					// Handle orchestration events
					try {
						const json = JSON.parse(data);
						handleOrchestrationEvent(event, json);

						// For synthesis:delta, also update the message content
						if (event === 'synthesis:delta' && json.delta) {
							accumulated += json.delta;
							messages[streamingMessageIndex] = {
								...messages[streamingMessageIndex],
								isLoading: false,
								content: accumulated
							};
							messages = [...messages];
						}
					} catch {
						// Ignore parse errors
					}
				}
			}
		}

		// After streaming is completely done, update logs with the final LLM response
		// This ensures we have the complete, final response
		if (currentRequestId && debugLogs.length > 0) {
			const finalLlmResponse = messages[streamingMessageIndex]?.content;
			if (finalLlmResponse) {
				debugLogs = debugLogs.map((log) => {
					if (log.requestId === currentRequestId && !log.llmResponse) {
						return { ...log, llmResponse: finalLlmResponse };
					}
					return log;
				});
			}
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

<div class="relative flex h-full flex-col" style="background-color: #0f172a;">
	<div class="flex min-h-0 flex-1 overflow-hidden">
		<!-- Main Chat Content -->
		<div
			bind:this={messagesContainer}
			class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6"
		>
			{#if messages.length === 1}
				<!-- Starter suggestions area -->
				<div class="mx-auto mb-6 max-w-4xl">
					<div class="mb-3 flex items-center justify-between">
						<div class="text-sm text-gray-400">Try one of these to get started:</div>
						<a
							href="/chat/sdk-integration"
							class="text-xs text-blue-400 transition-colors hover:text-blue-300"
							title="Learn how this chat integrates with the SDK"
						>
							SDK Integration Study Case →
						</a>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						{#each suggestions as s (s.title)}
							<button
								class="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left text-gray-200 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
								on:click={() => {
									inputValue = s.prompt;
									sendMessage();
								}}
							>
								<div class="mb-1 text-sm font-semibold">{s.title}</div>
								<div class="text-xs text-gray-400">{s.description}</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}
			{#each messages as message, index (message.id)}
				<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4">
					<div class="flex max-w-[80%] items-end space-x-2">
						{#if message.role === 'assistant'}
							<div class="flex-shrink-0">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
								>
									<Droplets class="h-5 w-5 text-white" />
								</div>
							</div>
						{/if}

						<div>
							<!-- Thinking Bubble inline with assistant message - shows agent activity -->
							{#if message.role === 'assistant' && orchestrationActive && agentStreams.length > 0 && index === messages.length - 1}
								<div class="mb-3">
									<ThinkingBubble
										bind:isExpanded={thinkingBubbleExpanded}
										{agentStreams}
										{orchestratorStatus}
										{orchestratorThoughts}
									/>
								</div>
							{/if}

							<div
								class="rounded-2xl px-4 py-3 {message.role === 'user'
									? 'bg-gray-700 text-white'
									: message.isError
										? 'border border-red-700/50 bg-red-900/30 text-red-100'
										: 'bg-blue-600 text-white'}"
							>
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

			{#if messages.length <= 2}
				<div class="mt-3 flex flex-wrap gap-2">
					<button
						on:click={() => {
							inputValue = 'Show me John 3:16';
							sendMessage();
						}}
						class="rounded-full border border-gray-600 px-3 py-1 text-sm text-gray-300 transition-all hover:border-blue-500 hover:text-blue-400"
					>
						📖 John 3:16
					</button>
					<button
						on:click={() => {
							inputValue = "What does 'love' mean in the Bible?";
							sendMessage();
						}}
						class="rounded-full border border-gray-600 px-3 py-1 text-sm text-gray-300 transition-all hover:border-blue-500 hover:text-blue-400"
					>
						💝 Define "love"
					</button>
					<button
						on:click={() => {
							inputValue = 'Explain the notes on Ephesians 2:8-9';
							sendMessage();
						}}
						class="rounded-full border border-gray-600 px-3 py-1 text-sm text-gray-300 transition-all hover:border-blue-500 hover:text-blue-400"
					>
						📝 Notes on grace
					</button>
					<button
						on:click={() => {
							inputValue = 'What questions should I consider for Genesis 1?';
							sendMessage();
						}}
						class="rounded-full border border-gray-600 px-3 py-1 text-sm text-gray-300 transition-all hover:border-blue-500 hover:text-blue-400"
					>
						❓ Study questions
					</button>
				</div>
			{/if}
		</div>

		<!-- Debug Sidebar (pushes content to the left when open) -->
		<DebugSidebar logs={debugLogs} />
	</div>

	<!-- Input Area (stays at bottom) -->
	<div
		class="flex-shrink-0 border-t border-gray-800 p-4 pb-[env(safe-area-inset-bottom)]"
		style="background-color: #0f172a;"
	>
		<div class="mx-auto flex max-w-4xl items-end gap-3">
			<div class="flex-1">
				<textarea
					class="w-full resize-none rounded-lg bg-gray-800 px-4 py-3 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					placeholder="Ask about a Bible verse, translation notes, or word meanings..."
					bind:value={inputValue}
					on:keydown={handleKeydown}
					rows="1"
					disabled={isLoading}
				></textarea>
			</div>

			<button
				class="flex h-12 w-12 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-200 {showXRay
					? 'bg-blue-600 text-white'
					: 'bg-gray-800 hover:bg-gray-700'}"
				on:click={() => (showXRay = !showXRay)}
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
						<span
							class="inline-block h-2 w-2 animate-bounce rounded-full bg-white"
							style="animation-delay: 0ms"
						></span>
						<span
							class="inline-block h-2 w-2 animate-bounce rounded-full bg-white"
							style="animation-delay: 150ms"
						></span>
						<span
							class="inline-block h-2 w-2 animate-bounce rounded-full bg-white"
							style="animation-delay: 300ms"
						></span>
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
	<XRayPanel data={currentXRayData} on:close={closeXRay} />
{/if}

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

	/* Add emoji to existing markdown RC links */
	:global(.markdown-content [href*="rc://"])
	{
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	/* Thinking animation */
	@keyframes thinking-pulse {
		0%,
		100% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
	}

	.thinking-step {
		animation: thinking-pulse 1.5s ease-in-out infinite;
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
