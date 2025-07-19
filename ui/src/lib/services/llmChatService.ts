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
	 * Generate a response using OpenAI
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
	 * Generate a mock response for development/testing
	 */
	generateMockResponse(userQuestion: string) {
		const mockResponses = {
			'what is love':
				'According to the scripture text, "What does John 3:16 tell us about love?"\n\nResponse: /api/fetch-scripture\n\n```json\n{\n  "reference": "John 3:16",\n  "language": "en",\n  "organization": "unfoldingWord",\n  "translation": "all"\n}\n```\n\nThis would fetch multiple translations of John 3:16 to show how different versions express the concept of God\'s love.',
			'john 3:16':
				'John 3:16 is one of the most famous verses in the Bible. Let me fetch the scripture and translation notes for you.\n\nResponse: /api/fetch-scripture\n\n```json\n{\n  "reference": "John 3:16",\n  "language": "en",\n  "organization": "unfoldingWord",\n  "translation": "all"\n}\n```',
			grace:
				'Let me look up the translation word "grace" for you.\n\nResponse: /api/fetch-translation-words\n\n```json\n{\n  "word": "grace",\n  "language": "en",\n  "organization": "unfoldingWord"\n}\n```'
		};

		const lowerQuestion = userQuestion.toLowerCase();
		let mockResponse =
			"I understand you're asking about Bible translation. This is a mock response for development purposes. In production, I would provide a detailed answer based on scripture, translation notes, and word definitions.";

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
