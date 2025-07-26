import { describe, it, expect } from 'vitest';
import { MCPResponseAdapter } from './MCPResponseAdapter';

describe('MCPResponseAdapter', () => {
	describe('extractText', () => {
		it('should extract text from standard MCP content array', () => {
			const response = {
				content: [
					{ type: 'text', text: 'Hello world' },
					{ type: 'text', text: 'Second paragraph' }
				]
			};
			
			const result = MCPResponseAdapter.extractText(response);
			expect(result).toBe('Hello world\n\nSecond paragraph');
		});

		it('should extract text from direct text field', () => {
			const response = { text: 'Direct text content' };
			const result = MCPResponseAdapter.extractText(response);
			expect(result).toBe('Direct text content');
		});

		it('should extract text from content string', () => {
			const response = { content: 'String content' };
			const result = MCPResponseAdapter.extractText(response);
			expect(result).toBe('String content');
		});

		it('should extract numbered items from object', () => {
			const response = {
				content: {
					"1": "First item",
					"2": "Second item",
					"3": "Third item"
				}
			};
			
			const result = MCPResponseAdapter.extractText(response);
			expect(result).toBe('1. First item\n\n2. Second item\n\n3. Third item');
		});

		it('should return default text when no content found', () => {
			const response = {};
			const result = MCPResponseAdapter.extractText(response, 'Default text');
			expect(result).toBe('Default text');
		});

		it('should handle null response', () => {
			const result = MCPResponseAdapter.extractText(null as any, 'Default');
			expect(result).toBe('Default');
		});
	});

	describe('formatTranslationNotes', () => {
		it('should format pre-formatted translation notes', () => {
			const response = {
				content: [{
					type: 'text',
					text: '**1.** First note\n\n**2.** Second note'
				}]
			};
			
			const result = MCPResponseAdapter.formatTranslationNotes(response, 'Titus 1:1');
			expect(result).toBe('**1.** First note\n\n**2.** Second note');
		});

		it('should format unformatted multiline text into numbered items', () => {
			const response = {
				content: [{
					type: 'text',
					text: 'First note\nSecond note\nThird note'
				}]
			};
			
			const result = MCPResponseAdapter.formatTranslationNotes(response, 'Titus 1:1');
			expect(result).toContain('1. First note');
			expect(result).toContain('2. Second note');
			expect(result).toContain('3. Third note');
		});

		it('should handle structured data array', () => {
			const response = {
				data: [
					{ note: 'First translation note' },
					{ note: 'Second translation note' }
				]
			};
			
			const result = MCPResponseAdapter.formatTranslationNotes(response, 'Titus 1:1');
			expect(result).toContain('1. First translation note');
			expect(result).toContain('2. Second translation note');
		});

		it('should return not found message when no content', () => {
			const response = {};
			const result = MCPResponseAdapter.formatTranslationNotes(response, 'Titus 1:1');
			expect(result).toBe('No translation notes found for Titus 1:1.');
		});
	});

	describe('formatScripture', () => {
		it('should preserve pre-formatted scripture with verse numbers', () => {
			const response = {
				content: [{
					type: 'text',
					text: '**1** In the beginning God created the heavens and the earth.'
				}]
			};
			
			const result = MCPResponseAdapter.formatScripture(response, 'Genesis 1:1');
			expect(result).toBe('**1** In the beginning God created the heavens and the earth.');
		});

		it('should add verse numbers to unformatted scripture', () => {
			const response = {
				content: [{
					type: 'text',
					text: 'Paul, a servant of God\nand an apostle of Jesus Christ'
				}]
			};
			
			const result = MCPResponseAdapter.formatScripture(response, 'Titus 1:1');
			expect(result).toContain('**1** Paul, a servant of God');
			expect(result).toContain('**2** and an apostle of Jesus Christ');
		});

		it('should handle scripture without verse reference', () => {
			const response = {
				content: [{
					type: 'text',
					text: 'Some scripture text'
				}]
			};
			
			const result = MCPResponseAdapter.formatScripture(response, 'Titus 1');
			expect(result).toBe('Some scripture text');
		});
	});

	describe('formatTranslationWord', () => {
		it('should format word definition with examples', () => {
			const response = {
				content: [{
					definition: 'A person who serves',
					examples: ['servant of God', 'servant of Christ']
				}]
			};
			
			const result = MCPResponseAdapter.formatTranslationWord(response, 'servant');
			expect(result).toContain('A person who serves');
			expect(result).toContain('Examples:');
			expect(result).toContain('1. servant of God');
			expect(result).toContain('2. servant of Christ');
		});

		it('should extract simple text definition', () => {
			const response = {
				content: [{
					type: 'text',
					text: 'Definition: A person who serves another'
				}]
			};
			
			const result = MCPResponseAdapter.formatTranslationWord(response, 'servant');
			expect(result).toBe('Definition: A person who serves another');
		});
	});

	describe('isSuccessResponse', () => {
		it('should return true for response with content', () => {
			const response = {
				content: [{ type: 'text', text: 'Some content' }]
			};
			
			expect(MCPResponseAdapter.isSuccessResponse(response)).toBe(true);
		});

		it('should return false for response with error', () => {
			const response = {
				error: 'Something went wrong'
			};
			
			expect(MCPResponseAdapter.isSuccessResponse(response)).toBe(false);
		});

		it('should return false for empty response', () => {
			const response = {};
			expect(MCPResponseAdapter.isSuccessResponse(response)).toBe(false);
		});
	});

	describe('extractError', () => {
		it('should extract error from error field', () => {
			const response = { error: 'Error message' };
			expect(MCPResponseAdapter.extractError(response)).toBe('Error message');
		});

		it('should extract error from message with error status', () => {
			const response = {
				status: 'error',
				message: 'Something failed'
			};
			expect(MCPResponseAdapter.extractError(response)).toBe('Something failed');
		});

		it('should return null when no error', () => {
			const response = { content: 'Success' };
			expect(MCPResponseAdapter.extractError(response)).toBe(null);
		});
	});
});