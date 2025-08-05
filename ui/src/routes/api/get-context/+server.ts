export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for get-context
 * Extended tier configuration-based endpoint
 */

import { routeGenerator } from '$lib/../../../src/config/RouteGenerator';
import { endpointRegistry, initializeAllEndpoints } from '$lib/../../../src/config/endpoints/index';
import {
	createSvelteKitHandler,
	type PlatformHandler
} from '$lib/../../../src/functions/platform-adapter';

// Initialize endpoints including Extended tier Context endpoints
try {
	initializeAllEndpoints();
} catch (error) {
	console.error('Failed to initialize endpoints:', error);
}

// Get the endpoint configuration
const endpointConfig = endpointRegistry.get('get-context');

if (!endpointConfig) {
	throw new Error('get-context endpoint configuration not found');
}

if (!endpointConfig.enabled) {
	throw new Error('get-context endpoint is disabled');
}

console.log(`🧠 get-context endpoint category: ${endpointConfig.category}`);

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
