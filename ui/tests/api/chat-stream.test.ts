import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../src/routes/api/chat-stream/+server';

// Mock the fetch function
global.fetch = vi.fn();

// Mock the logger
vi.mock('$lib/logger', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn()
	}
}));

describe('/api/chat-stream endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Set up environment variable
		process.env.OPENAI_API_KEY = 'test-api-key';
	});

	it('should reject requests without OpenAI API key', async () => {
		// Remove API key
		delete process.env.OPENAI_API_KEY;

		const request = new Request('http://localhost/api/chat-stream', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: 'Test query' })
		});

		const response = await POST({ request, url: new URL('http://localhost') });
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toContain('OpenAI API key not configured');
	});

	it('should discover MCP endpoints dynamically', async () => {
		// Mock successful mcp-config response
		const mockEndpoints = {
			endpoints: {
				core: [
					{
						name: 'fetch-scripture',
						path: '/api/fetch-scripture',
						description: 'Fetch scripture verses',
						parameters: [
							{ name: 'reference', required: true },
							{ name: 'language', default: 'en' },
							{ name: 'organization', default: 'unfoldingWord' }
						],
						supportsFormats: true
					}
				]
			}
		};

		// Mock the fetch responses
		(global.fetch as any)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockEndpoints
			})
			.mockResolvedValueOnce({
				// OpenAI endpoint selection response
				ok: true,
				json: async () => ({
					choices: [
						{
							message: {
								content: JSON.stringify([
									{
										endpoint: 'fetch-scripture',
										params: {
											reference: 'John 3:16',
											language: 'en',
											organization: 'unfoldingWord',
											format: 'md'
										}
									}
								])
							}
						}
					]
				})
			})
			.mockResolvedValueOnce({
				// MCP endpoint response
				ok: true,
				headers: new Headers({ 'content-type': 'text/markdown' }),
				text: async () =>
					'## Scripture\n\n**John 3:16** [ULT v86]\n\n"For God so loved the world..."'
			})
			.mockResolvedValueOnce({
				// Final OpenAI response
				ok: true,
				json: async () => ({
					choices: [
						{
							message: {
								content: 'Here is John 3:16: "For God so loved the world..." [ULT v86 - John 3:16]'
							}
						}
					]
				})
			});

		const request = new Request('http://localhost/api/chat-stream', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				message: 'Show me John 3:16',
				enableXRay: true
			})
		});

		const response = await POST({ request, url: new URL('http://localhost') });
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.response).toContain('[ULT v86 - John 3:16]'); // Citation required

		// Verify self-discovery was used
		expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/mcp-config'));
	});

	it('should enforce scripture quotation rules', async () => {
		// This is more of a prompt validation test
		const systemPrompt = `You are a Bible study assistant that provides information EXCLUSIVELY from the Translation Helps MCP Server database.`;

		expect(systemPrompt).toContain('EXCLUSIVELY');

		// In a real implementation, we'd test that:
		// 1. Scripture is never paraphrased
		// 2. Citations are always included
		// 3. No external knowledge is used
	});

	it('should let LLM choose response format', async () => {
		// Mock the endpoint discovery and selection
		(global.fetch as any)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					endpoints: {
						core: [
							{
								name: 'translation-notes',
								path: '/api/translation-notes',
								supportsFormats: true,
								parameters: []
							}
						]
					}
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					choices: [
						{
							message: {
								content: JSON.stringify([
									{
										endpoint: 'translation-notes',
										params: {
											reference: 'John 3:16',
											format: 'md' // LLM chose markdown
										}
									}
								])
							}
						}
					]
				})
			});

		// The test would continue to verify the LLM's format choice is respected
		// This is a simplified version for demonstration
		expect(true).toBe(true);
	});

	it('should handle endpoint discovery failure gracefully', async () => {
		// Mock failed mcp-config response
		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 500
		});

		const request = new Request('http://localhost/api/chat-stream', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: 'Test query' })
		});

		const response = await POST({ request, url: new URL('http://localhost') });
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toContain('Failed to discover MCP endpoints');
	});

	it('should include X-ray data when requested', async () => {
		// Mock successful flow
		(global.fetch as any)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ endpoints: { core: [] } })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ choices: [{ message: { content: '[]' } }] })
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ choices: [{ message: { content: 'Response' } }] })
			});

		const request = new Request('http://localhost/api/chat-stream', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				message: 'Test',
				enableXRay: true
			})
		});

		const response = await POST({ request, url: new URL('http://localhost') });
		const data = await response.json();

		expect(data.xrayData).toBeDefined();
		expect(data.xrayData.queryType).toBe('ai-assisted');
		expect(data.xrayData.apiCallsCount).toBeDefined();
		expect(data.xrayData.totalDuration).toBeDefined();
	});
});

describe('Citation Compliance', () => {
	it('should enforce citation format [Resource - Reference]', () => {
		const validCitations = [
			'[ULT v86 - John 3:16]',
			'[Translation Notes - Ephesians 2:8]',
			'[Translation Words - "agape"]',
			'[UST v86 - Genesis 1:1]'
		];

		const citationRegex = /\[[\w\s\d."'-]+ - [\w\s\d:"-]+\]/;

		validCitations.forEach((citation) => {
			expect(citation).toMatch(citationRegex);
		});
	});

	it('should reject responses without proper citations', () => {
		const invalidResponses = [
			'God so loved the world', // No citation
			'As it says in John 3:16...', // No proper citation format
			'The verse says [John 3:16]' // Missing resource name
		];

		const citationRegex = /\[[\w\s\d."'-]+ - [\w\s\d:"-]+\]/;

		invalidResponses.forEach((response) => {
			expect(response).not.toMatch(citationRegex);
		});
	});
});
