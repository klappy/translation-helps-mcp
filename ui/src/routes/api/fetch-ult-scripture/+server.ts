export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for fetch-ult-scripture
 * Generated from EndpointConfig using the new configuration system
 */

import { routeGenerator } from '$lib/../../../src/config/RouteGenerator';
import { getEndpointConfig } from '$lib/../../../src/config/endpoints/index';
import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';

// Get the endpoint configuration
const endpointConfig = getEndpointConfig('fetch-ult-scripture');

if (!endpointConfig) {
	throw new Error('fetch-ult-scripture endpoint configuration not found');
}

if (!endpointConfig.enabled) {
	throw new Error('fetch-ult-scripture endpoint is disabled');
}

// Generate the handler from configuration
const { handler: configuredHandler } = routeGenerator.generateHandler(endpointConfig);

// Wrap with SvelteKit adapter
export const GET = createSvelteKitHandler(configuredHandler);
export const POST = createSvelteKitHandler(configuredHandler);
export const OPTIONS = createSvelteKitHandler(configuredHandler);
