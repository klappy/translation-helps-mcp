export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for fetch-scripture
 * Configuration-based endpoint - debugging runtime issues
 */

import { routeGenerator } from '$lib/../../../src/config/RouteGenerator';
import { endpointRegistry, initializeAllEndpoints } from '$lib/../../../src/config/endpoints/index';
import {
	createSvelteKitHandler,
	type PlatformHandler
} from '$lib/../../../src/functions/platform-adapter';

// Debug: Log initialization process
console.log('🔧 Initializing fetch-scripture endpoint...');

// Manually initialize endpoints
try {
	console.log('📝 Calling initializeAllEndpoints...');
	initializeAllEndpoints();
	console.log('✅ Endpoints initialized successfully');
} catch (error) {
	console.error('❌ Failed to initialize endpoints:', error);
	throw error;
}

// Get the endpoint configuration
console.log('📖 Getting fetch-scripture configuration...');
const endpointConfig = endpointRegistry.get('fetch-scripture');

if (!endpointConfig) {
	console.error('❌ fetch-scripture configuration not found');
	throw new Error('fetch-scripture endpoint configuration not found');
}

console.log('✅ Found endpoint config:', endpointConfig.name);

if (!endpointConfig.enabled) {
	console.error('❌ fetch-scripture endpoint is disabled');
	throw new Error('fetch-scripture endpoint is disabled');
}

// Generate the handler from configuration
console.log('🏭 Generating handler from configuration...');
let configuredHandler: PlatformHandler;

try {
	const generatedHandler = routeGenerator.generateHandler(endpointConfig);
	console.log('✅ Handler generated successfully');
	configuredHandler = generatedHandler.handler;
	console.log('✅ SvelteKit handlers ready');
} catch (error) {
	console.error('❌ Failed to generate handler:', error);
	throw error;
}

// Export handlers
export const GET = createSvelteKitHandler(configuredHandler);
export const POST = createSvelteKitHandler(configuredHandler);
export const OPTIONS = createSvelteKitHandler(configuredHandler);
