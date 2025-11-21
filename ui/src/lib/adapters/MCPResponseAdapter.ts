/**
 * MCPResponseAdapter - Provides robust data extraction from MCP tool responses
 *
 * This adapter handles various response formats from MCP tools and provides
 * safe extraction methods that prevent brittle failures due to data shape changes.
 */

export interface MCPContent {
	type: string;
	text: string;
}

export interface MCPResponse {
	content?: MCPContent[] | { [key: string]: any } | any;
	error?: string;
	[key: string]: any;
}

export class MCPResponseAdapter {
	/**
	 * Extract text content from an MCP response with multiple fallback strategies
	 */
	static extractText(response: MCPResponse, defaultText: string = ''): string {
		if (!response) return defaultText;

		// Strategy 1: Standard MCP content array format
		if (Array.isArray(response.content)) {
			const textContent = response.content
				.filter((item) => item.type === 'text' && item.text)
				.map((item) => item.text)
				.join('\n\n');

			if (textContent) return textContent;
		}

		// Strategy 2: Direct text field
		if (response.text && typeof response.text === 'string') {
			return response.text;
		}

		// Strategy 3: Content as a string
		if (typeof response.content === 'string') {
			return response.content;
		}

		// Strategy 4: Content as an object with text field
		if (
			response.content &&
			typeof response.content === 'object' &&
			!Array.isArray(response.content)
		) {
			if (response.content.text) return response.content.text;

			// Try to extract numbered items (like "1.", "2.", etc.)
			const numberedItems = this.extractNumberedItems(response.content);
			if (numberedItems) return numberedItems;
		}

		// Strategy 5: Look for any text-like fields in the response
		const textFields = ['message', 'data', 'result', 'output', 'value'];
		for (const field of textFields) {
			if (response[field] && typeof response[field] === 'string') {
				return response[field];
			}
		}

		// Strategy 6: If response has numbered properties, extract them
		const numberedResponse = this.extractNumberedItems(response);
		if (numberedResponse) return numberedResponse;

		return defaultText;
	}

	/**
	 * Extract numbered items from an object (e.g., {"1": "item1", "2": "item2"})
	 */
	private static extractNumberedItems(obj: any): string | null {
		if (!obj || typeof obj !== 'object') return null;

		const numberedKeys = Object.keys(obj)
			.filter((key) => /^\d+$/.test(key))
			.sort((a, b) => parseInt(a) - parseInt(b));

		if (numberedKeys.length > 0) {
			return numberedKeys.map((key) => `${key}. ${obj[key]}`).join('\n\n');
		}

		return null;
	}

	/**
	 * Extract structured data (like translation notes) with fallbacks
	 */
	static extractStructuredData(response: MCPResponse): any[] {
		if (!response) return [];

		// If content is already an array, return it
		if (Array.isArray(response.content)) {
			return response.content;
		}

		// If response has a data array
		if (Array.isArray(response.data)) {
			return response.data;
		}

		// If response has items
		if (Array.isArray(response.items)) {
			return response.items;
		}

		// If response has results
		if (Array.isArray(response.results)) {
			return response.results;
		}

		// If response has numbered properties, convert to array
		const numberedKeys = Object.keys(response)
			.filter((key) => /^\d+$/.test(key))
			.sort((a, b) => parseInt(a) - parseInt(b));

		if (numberedKeys.length > 0) {
			return numberedKeys.map((key) => ({
				index: key,
				content: response[key]
			}));
		}

		return [];
	}

	/**
	 * Format translation notes from various possible structures
	 */
	static formatTranslationNotes(response: MCPResponse, reference: string): string {
		const text = this.extractText(response);

		// If we got properly formatted text, use it
		if (text && text !== '' && !text.includes('No translation notes found')) {
			// Check if it's already formatted with numbered items
			if (text.includes('**1.**') || text.includes('1.')) {
				return text;
			}

			// If it's a single block of text, try to split it into numbered items
			const lines = text.split('\n').filter((line) => line.trim());
			if (lines.length > 1) {
				return lines.map((line, index) => `${index + 1}. ${line}`).join('\n\n');
			}

			return text;
		}

		// Try to extract structured data
		const structuredData = this.extractStructuredData(response);
		if (structuredData.length > 0) {
			return structuredData
				.map((item, index) => {
					const content =
						typeof item === 'string'
							? item
							: item.content || item.text || item.note || JSON.stringify(item);
					return `${index + 1}. ${content}`;
				})
				.join('\n\n');
		}

		return `No translation notes found for ${reference}.`;
	}

	/**
	 * Format translation questions
	 */
	static formatTranslationQuestions(response: MCPResponse, reference: string): string {
		const text = this.extractText(response);

		if (text && text !== '' && !text.includes('No translation questions found')) {
			return text;
		}

		const structuredData = this.extractStructuredData(response);
		if (structuredData.length > 0) {
			return structuredData
				.map((item, index) => {
					const question =
						typeof item === 'string'
							? item
							: item.question || item.text || item.content || JSON.stringify(item);
					return `${index + 1}. ${question}`;
				})
				.join('\n\n');
		}

		return `No translation questions found for ${reference}.`;
	}

	/**
	 * Extract scripture text with verse formatting
	 */
	static formatScripture(response: MCPResponse, reference: string): string {
		const text = this.extractText(response);

		if (text && text !== '' && !text.includes('Scripture not found')) {
			// Check if it already has verse numbers
			if (/\*\*\d+\*\*/.test(text) || /\b\d+\.\s/.test(text)) {
				return text;
			}

			// Try to add verse numbers if missing
			const lines = text.split('\n').filter((line) => line.trim());
			if (lines.length > 0 && reference.includes(':')) {
				const [, verseStart] = reference.split(':');
				const startVerse = parseInt(verseStart) || 1;
				return lines.map((line, index) => `**${startVerse + index}** ${line}`).join(' ');
			}

			return text;
		}

		return `Scripture not found for ${reference}.`;
	}

	/**
	 * Format translation word definition
	 */
	static formatTranslationWord(response: MCPResponse, term: string): string {
		const text = this.extractText(response);

		if (text && text !== '' && !text.includes('Word definition not found')) {
			return text;
		}

		// Try to extract structured data for word definition
		const structuredData = this.extractStructuredData(response);
		if (structuredData.length > 0) {
			// Look for definition-specific fields
			const wordData = structuredData[0];
			if (typeof wordData === 'object') {
				const definition =
					wordData.definition || wordData.content || wordData.text || wordData.meaning;
				const examples = wordData.examples || wordData.usage || [];

				let result = definition || '';
				if (Array.isArray(examples) && examples.length > 0) {
					result += '\n\nExamples:\n' + examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n');
				}

				if (result) return result;
			}
		}

		return `Word definition not found for ${term}.`;
	}

	/**
	 * Extract error message if present
	 */
	static extractError(response: MCPResponse): string | null {
		if (response.error) return response.error;
		if (response.message && response.status === 'error') return response.message;
		if (response.content?.[0]?.error) return response.content[0].error;
		return null;
	}

	/**
	 * Check if response indicates success
	 */
	static isSuccessResponse(response: MCPResponse): boolean {
		// Check for explicit error
		if (this.extractError(response)) return false;

		// Check for content
		const hasContent =
			this.extractText(response, '') !== '' || this.extractStructuredData(response).length > 0;

		return hasContent;
	}
}
