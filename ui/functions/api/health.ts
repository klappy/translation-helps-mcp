export async function onRequest(context: { request: Request }) {
	const { request } = context;

	// Handle CORS
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type'
			}
		});
	}

	// Health check response
	const healthData = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		version: '4.5.0',
		environment: 'production',
		message: 'Translation Helps MCP Server is operational'
	};

	return new Response(JSON.stringify(healthData), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
