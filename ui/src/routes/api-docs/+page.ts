// This page is for static generation
export const prerender = true;

// Add metadata for the API documentation page
export const load = async () => {
	return {
		title: 'API Documentation | Translation Helps Platform',
		description: 'Interactive API documentation with live testing capabilities for the Translation Helps Platform.',
		keywords: 'API documentation, Translation Helps, unfoldingWord, Bible translation, MCP, interactive docs'
	};
};
