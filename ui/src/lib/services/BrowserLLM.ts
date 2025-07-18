import { pipeline } from '@xenova/transformers';

export interface LLMResponse {
	text: string;
	tokens: number;
	time: number;
}

export class BrowserLLM {
	private generator: unknown = null;
	private isInitialized = false;
	private isInitializing = false;

	async initialize() {
		if (this.isInitialized || this.isInitializing) {
			return;
		}

		this.isInitializing = true;
		console.log('Initializing browser LLM...');

		try {
			// Use a small, fast model suitable for browser
			// TinyLlama is about 1.1GB and runs well in browsers
			this.generator = await pipeline('text-generation', 'Xenova/TinyLlama-1.1B-Chat-v1.0', {
				quantized: true // Use quantized model for smaller size
			});

			this.isInitialized = true;
			console.log('Browser LLM initialized successfully!');
		} catch (error) {
			console.error('Failed to initialize browser LLM:', error);
			this.isInitializing = false;
			throw error;
		}
	}

	async generateResponse(
		prompt: string,
		maxLength: number = 512,
		temperature: number = 0.7
	): Promise<LLMResponse> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const startTime = performance.now();

		try {
			// Format prompt for chat model
			const formattedPrompt = this.formatPrompt(prompt);

			// Generate response using the pipeline
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result = await (this.generator as any)(formattedPrompt, {
				max_new_tokens: maxLength,
				temperature: temperature,
				do_sample: true
			});

			const response = result[0].generated_text.substring(formattedPrompt.length).trim();
			const endTime = performance.now();
			const time = endTime - startTime;

			return {
				text: response,
				tokens: result[0].generated_text.length,
				time
			};
		} catch (error) {
			console.error('Error generating response:', error);
			throw error;
		}
	}

	private formatPrompt(userMessage: string): string {
		// Format for TinyLlama chat model
		return `<|system|>
You are a helpful AI assistant specialized in Bible translation and scripture analysis. You have access to Bible resources and can help with:
- Scripture interpretation and context
- Translation questions and challenges
- Word studies and definitions
- Cross-references and connections

Provide helpful, accurate, and respectful responses about biblical topics.
<|user|>
${userMessage}
<|assistant|>`;
	}

	async isReady(): Promise<boolean> {
		return this.isInitialized;
	}

	getStatus(): 'uninitialized' | 'initializing' | 'ready' {
		if (this.isInitialized) return 'ready';
		if (this.isInitializing) return 'initializing';
		return 'uninitialized';
	}
}

// Create a singleton instance
export const browserLLM = new BrowserLLM();
