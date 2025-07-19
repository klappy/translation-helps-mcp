/**
 * LLM Chat Service for Bible Translation Assistance
 * Uses OpenAI GPT-4o-mini for intelligent responses
 */

export class LLMChatService {
	private apiKey: string | null = null;
	private isInitialized: boolean = false;

	constructor() {
		// Initialize properties
	}

	/**
	 * Initialize the chat service
	 */
	async initialize() {
		if (this.isInitialized) return;

		console.log('🚀 Initializing OpenAI chat service...');

		// Check if we have an API key (should be set in environment)
		if (typeof window !== 'undefined' && (window as { OPENAI_API_KEY?: string }).OPENAI_API_KEY) {
			this.apiKey = (window as { OPENAI_API_KEY?: string }).OPENAI_API_KEY || null;
		}

		this.isInitialized = true;
		console.log('✅ OpenAI chat service initialized!');
	}

	/**
	 * Generate a response using OpenAI with thinking trace
	 */
	async generateResponse(userQuestion: string, contextPrompt?: string) {
		await this.initialize();

		try {
			console.log('🤖 Sending request to OpenAI...');

			const response = await fetch('/.netlify/functions/chat-stream', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					messages: [
						{
							role: 'system',
							content:
								contextPrompt ||
								'You are a helpful Bible translation assistant. Provide accurate, helpful responses about Bible translation, scripture interpretation, and translation resources.'
						},
						{
							role: 'user',
							content: userQuestion
						}
					]
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data.success) {
				console.log('✅ OpenAI response received successfully');
				return {
					success: true,
					response: data.response,
					timestamp: data.timestamp,
					contextUsed: data.contextUsed,
					metadata: data.metadata
				};
			} else {
				console.error('❌ OpenAI API error:', data.error);
				return {
					success: false,
					error: data.error || 'Unknown error occurred'
				};
			}
		} catch (error) {
			console.error('❌ Error sending chat message:', error);

			// Fallback to mock response for development
			console.log('🎭 Falling back to mock response due to API error:', (error as Error).message);
			return this.generateMockResponse(userQuestion);
		}
	}

	/**
	 * Generate thinking trace for a user question
	 */
	generateThinkingTrace(
		userQuestion: string,
		apiCalls: Array<{ endpoint: string; status: string; responseTime: number }> = []
	): string[] {
		const thinkingSteps: string[] = [];
		const lowerQuestion = userQuestion.toLowerCase();

		// Analyze the question and generate thinking steps
		thinkingSteps.push(`🔍 **Analyzing your question**: "${userQuestion}"`);

		// Check for scripture references
		const scriptureMatch = userQuestion.match(/(\w+\s+\d+:\d+(?:-\d+)?)/);
		if (scriptureMatch) {
			const reference = scriptureMatch[1];
			thinkingSteps.push(`📖 **Found scripture reference**: "${reference}"`);
			thinkingSteps.push(`🔗 **Fetching scripture text** from multiple translations...`);
			thinkingSteps.push(`📝 **Gathering translation notes** for context and interpretation...`);
		}

		// Check for word queries
		const wordMatch = userQuestion.match(/["']([^"']+)["']/);
		if (wordMatch) {
			const word = wordMatch[1];
			thinkingSteps.push(`📚 **Found word query**: "${word}"`);
			thinkingSteps.push(`🔍 **Looking up translation word definition** and usage...`);
		}

		// Check for general Bible topics
		const bibleTopics = [
			'love',
			'grace',
			'faith',
			'salvation',
			'kingdom',
			'righteousness',
			'sin',
			'forgiveness'
		];
		const foundTopics = bibleTopics.filter((topic) => lowerQuestion.includes(topic));
		if (foundTopics.length > 0) {
			thinkingSteps.push(`💡 **Detected Bible topics**: ${foundTopics.join(', ')}`);
			thinkingSteps.push(`📖 **Gathering relevant scripture passages** and definitions...`);
		}

		// Add API call results to thinking trace
		if (apiCalls.length > 0) {
			thinkingSteps.push(`✅ **Retrieved ${apiCalls.length} resource(s)** from the MCP server`);

			apiCalls.forEach((call, index) => {
				if (call.status === 'success') {
					thinkingSteps.push(
						`📊 **Resource ${index + 1}**: ${call.endpoint} (${Math.round(call.responseTime)}ms)`
					);
				} else {
					thinkingSteps.push(`❌ **Resource ${index + 1}**: ${call.endpoint} failed`);
				}
			});
		}

		// Final thinking step
		thinkingSteps.push(`🧠 **Synthesizing information** to provide a comprehensive answer...`);

		// Add mock response indicator if no API calls were made
		if (apiCalls.length === 0) {
			thinkingSteps.push(`🎭 **Using development mode response** (OpenAI API not configured)`);
		}

		return thinkingSteps;
	}

	/**
	 * Generate a mock response for development/testing
	 */
	generateMockResponse(userQuestion: string) {
		const mockResponses = {
			'what is love':
				'**Love in the Bible**\n\nLove is a central theme throughout Scripture. In John 3:16, we see God\'s love demonstrated through giving His only Son: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."\n\nThis verse shows that God\'s love is:\n- **Sacrificial**: He gave His most precious gift\n- **Universal**: For the entire world\n- **Purposeful**: To bring eternal life\n- **Conditional**: Available to those who believe\n\nIn the original Greek, the word used is "agape" - a selfless, unconditional love that seeks the best for others.',
			'john 3:16':
				'**John 3:16 - The Heart of the Gospel**\n\nThis verse is often called "the gospel in a nutshell" because it summarizes the core message of Christianity:\n\n*"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."*\n\n**Key Elements:**\n- **God\'s Love**: The motivation behind everything\n- **The World**: God\'s love extends to all humanity\n- **His Only Son**: The ultimate sacrifice\n- **Belief**: The condition for receiving eternal life\n- **Eternal Life**: The promise and hope\n\nThis verse appears in Jesus\' conversation with Nicodemus, a religious leader who came to Jesus at night seeking understanding.',
			grace:
				'**Grace - God\'s Unmerited Favor**\n\nGrace is one of the most important concepts in the Bible. It refers to God\'s unmerited favor and kindness toward undeserving sinners.\n\n**Key Aspects of Grace:**\n- **Unearned**: We cannot work for it or deserve it\n- **Free**: Given without cost to us\n- **Sufficient**: Meets all our needs\n- **Transforming**: Changes us from the inside out\n\n**Biblical Examples:**\n- Ephesians 2:8-9: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast."\n- Romans 5:8: "But God demonstrates his own love for us in this: While we were still sinners, Christ died for us."\n\nGrace is the foundation of our relationship with God and the source of all spiritual blessings.'
		};

		const lowerQuestion = userQuestion.toLowerCase();
		let mockResponse =
			"**Bible Translation Assistant**\n\nI understand you're asking about Bible translation. This is a development mode response since the OpenAI API isn't configured yet.\n\n**What I can help with:**\n- Scripture interpretation and context\n- Translation word definitions and usage\n- Cross-reference analysis\n- Historical and cultural background\n- Translation principles and methods\n\n**To get full AI-powered responses:**\nPlease configure your OpenAI API key in the Netlify environment variables.\n\n**For now, try asking about:**\n- John 3:16\n- What is love?\n- Grace\n- Faith\n- Salvation";

		for (const [key, response] of Object.entries(mockResponses)) {
			if (lowerQuestion.includes(key)) {
				mockResponse = response;
				break;
			}
		}

		return {
			success: true,
			response: mockResponse,
			timestamp: new Date().toISOString(),
			contextUsed: { type: 'mock', reason: 'API unavailable' },
			metadata: { model: 'mock', tokens: 0 }
		};
	}
}
