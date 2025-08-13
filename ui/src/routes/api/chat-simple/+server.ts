import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	console.log('=== CHAT SIMPLE START ===');
	console.log('1. Platform exists:', !!platform);
	console.log('2. Platform.env exists:', !!platform?.env);
	
	try {
		const body = await request.json();
		console.log('3. Request parsed successfully');
		
		const apiKey = platform?.env?.OPENAI_API_KEY;
		console.log('4. API Key found:', !!apiKey);
		
		if (!apiKey) {
			console.log('5. No API key - returning error');
			return json({
				success: false,
				error: 'No API key found in chat-simple',
				platform: !!platform,
				env: !!platform?.env
			}, { status: 500 });
		}
		
		console.log('6. Calling OpenAI...');
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [
					{ role: 'user', content: body.message || 'Hello' }
				],
				max_tokens: 50
			})
		});
		
		console.log('7. OpenAI response status:', response.status);
		
		if (!response.ok) {
			return json({
				success: false,
				error: 'OpenAI API error',
				status: response.status
			}, { status: 500 });
		}
		
		const data = await response.json();
		console.log('8. Success!');
		
		return json({
			success: true,
			response: data.choices[0]?.message?.content || 'No response'
		});
		
	} catch (error) {
		console.error('ERROR in chat-simple:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
