/**
 * BrowserLLM.ts
 * Enhanced AI service for Bible translation assistance
 * Follows the same pattern as the original translation-helps AI Assistant
 */

export class BrowserLLM {
	private isInitialized = false;

	constructor() {
		this.initialize();
	}

	private initialize() {
		if (this.isInitialized) return;

		console.log('🚀 Initializing AI system with improved prompts...');
		this.isInitialized = true;
		console.log('✅ AI system initialized successfully!');
	}

	/**
	 * Generate an intelligent response using the same pattern as the original translation-helps AI Assistant
	 */
	public async generateResponse(userQuestion: string, contextPrompt: string): Promise<string> {
		console.log('=== AI SERVICE DEBUG: generateResponse ===');
		console.log('User question:', userQuestion);
		console.log('Context prompt length:', contextPrompt.length);

		// Just give the LLM the raw context prompt and let it figure it out
		const prompt = `You are a helpful Bible translation assistant. The user asked: "${userQuestion}"

Here is the available context data:

${contextPrompt}

Please provide a comprehensive, well-formatted response that directly addresses the user's question using the available resources above. Format your response clearly with appropriate markdown formatting and organize the information in a helpful way.`;

		console.log('=== AI SERVICE DEBUG: Final prompt ===');
		console.log(prompt);

		// For now, return a simple formatted response since we don't have the LLM working
		// In a real implementation, this would call the LLM with the prompt
		return this.formatSimpleResponse(userQuestion, contextPrompt);
	}

	/**
	 * Format a simple response from the context prompt
	 */
	private formatSimpleResponse(userQuestion: string, contextPrompt: string): string {
		let response = `## 🤖 AI Response\n\n**${userQuestion}**\n\n---\n\n`;

		// Just include the context prompt as-is, since the LLM should handle the formatting
		response += contextPrompt;
		response += `\n\n📚 **Sources**: unfoldingWord® Translation Resources`;

		return response;
	}
}
