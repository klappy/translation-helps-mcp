export const config = {
	runtime: 'edge'
};

/**
 * SvelteKit API Route for browse-translation-academy
 * Configuration-based endpoint using the new system
 */

import { endpointRegistry, initializeAllEndpoints } from '$lib/../../../src/config/endpoints/index';
import { browseTranslationAcademyHandler } from '$lib/../../../src/functions/handlers/browse-translation-academy';
import { createSvelteKitHandler } from '$lib/../../../src/functions/platform-adapter';

// Initialize endpoints
try {
	initializeAllEndpoints();
} catch (error) {
	console.error('Failed to initialize endpoints:', error);
}

// Get the endpoint configuration
const endpointConfig = endpointRegistry.get('browse-translation-academy');

if (!endpointConfig) {
	throw new Error('browse-translation-academy endpoint configuration not found');
}

if (!endpointConfig.enabled) {
	throw new Error('browse-translation-academy endpoint is disabled');
}

// Use custom handler instead of generated one
const configuredHandler = browseTranslationAcademyHandler;

// Export handlers
export const GET = createSvelteKitHandler(configuredHandler);
export const POST = createSvelteKitHandler(configuredHandler);
export const OPTIONS = createSvelteKitHandler(configuredHandler);
