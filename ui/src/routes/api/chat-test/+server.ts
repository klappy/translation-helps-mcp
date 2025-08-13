import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ platform, request }) => {
	try {
		const { message = 'Hello' } = await request.json();

		// Log everything for debugging
		console.log('=== CHAT TEST DEBUG ===');
		console.log('Platform exists:', !!platform);
		console.log('Platform.env exists:', !!platform?.env);
		console.log('Platform.env type:', typeof platform?.env);
		console.log('OPENAI_API_KEY exists:', !!platform?.env?.OPENAI_API_KEY);
		console.log('API Key type:', typeof platform?.env?.OPENAI_API_KEY);
		console.log('API Key starts with sk-:', platform?.env?.OPENAI_API_KEY?.startsWith('sk-'));

		const apiKey = platform?.env?.OPENAI_API_KEY;

		if (!apiKey) {
			return json(
				{
					success: false,
					error: 'No API key found',
					debug: {
						platform: !!platform,
						env: !!platform?.env,
						hasKey: !!platform?.env?.OPENAI_API_KEY
					}
				},
				{ status: 500 }
			);
		}

		// Try to call OpenAI directly
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [
					{ role: 'system', content: 'You are a helpful assistant. Keep responses brief.' },
					{ role: 'user', content: message }
				],
				max_tokens: 100
			})
		});

		if (!response.ok) {
			const error = await response.text();
			console.error('OpenAI API error:', error);
			return json(
				{
					success: false,
					error: 'OpenAI API error',
					status: response.status,
					details: error.substring(0, 200) // First 200 chars
				},
				{ status: response.status }
			);
		}

		const data = await response.json();

		return json({
			success: true,
			response: data.choices[0]?.message?.content || 'No response',
			model: data.model
		});
	} catch (error) {
		console.error('Chat test error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
			},
			{ status: 500 }
		);
	}
};
