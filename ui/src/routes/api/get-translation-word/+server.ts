export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for get-translation-word
 * Configuration-based endpoint using the unified system
 */

import { routeGenerator } from '$lib/../../../src/config/RouteGenerator.js';
import {
	endpointRegistry,
	initializeAllEndpoints
} from '$lib/../../../src/config/endpoints/index.js';
import {
	createSvelteKitHandler,
	type PlatformHandler
} from '$lib/../../../src/functions/platform-adapter.js';

// Initialize endpoints
try {
	initializeAllEndpoints();
} catch (error) {
	console.error('Failed to initialize endpoints:', error);
}

// Get the endpoint configuration
const endpointConfig = endpointRegistry.get('get-translation-word');

if (!endpointConfig) {
	throw new Error('get-translation-word endpoint configuration not found');
}

if (!endpointConfig.enabled) {
	throw new Error('get-translation-word endpoint is disabled');
}

// Generate the handler from configuration
let configuredHandler: PlatformHandler;

try {
	const generatedHandler = routeGenerator.generateHandler(endpointConfig);
	configuredHandler = generatedHandler.handler;
} catch (error) {
	console.error('Failed to generate handler:', error);
	throw error;
}

// Export handlers
export const GET = createSvelteKitHandler(configuredHandler);
export const POST = createSvelteKitHandler(configuredHandler);
export const OPTIONS = createSvelteKitHandler(configuredHandler);
