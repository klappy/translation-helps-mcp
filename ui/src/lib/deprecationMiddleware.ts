/**
 * Deprecation Middleware for V1 Endpoints
 *
 * Adds standard deprecation headers to V1 endpoints to guide migration to V2
 */

import type { RequestHandler } from '@sveltejs/kit';

export interface DeprecationConfig {
	version: string;
	sunsetDate: Date;
	successorPath: string;
	message?: string;
}

/**
 * Creates deprecation headers based on config
 */
export function createDeprecationHeaders(config: DeprecationConfig): Record<string, string> {
	const headers: Record<string, string> = {
		// Standard deprecation header
		Deprecation: `version="${config.version}"`,

		// Sunset date in RFC 7231 format
		Sunset: config.sunsetDate.toUTCString(),

		// Link to successor endpoint
		Link: `<${config.successorPath}>; rel="successor-version"`,

		// Custom deprecation message
		'X-Deprecation-Message':
			config.message ||
			`This endpoint is deprecated and will be removed after ${config.sunsetDate.toDateString()}. Please migrate to ${config.successorPath}`
	};

	return headers;
}

/**
 * Deprecation configurations for V1 endpoints
 */
export const V1_DEPRECATIONS: Record<string, DeprecationConfig> = {
	'/api/fetch-scripture': {
		version: '1.0',
		sunsetDate: new Date('2025-03-01'),
		successorPath: '/api/v2/fetch-scripture',
		message:
			'V1 scripture endpoint is deprecated. V2 offers better performance, real metadata, and working format support.'
	},
	'/api/fetch-translation-notes': {
		version: '1.0',
		sunsetDate: new Date('2025-03-01'),
		successorPath: '/api/v2/translation-notes',
		message:
			'V1 translation notes endpoint is deprecated. V2 uses consistent "items" array and ZIP-based fetching.'
	},
	'/api/fetch-translation-questions': {
		version: '1.0',
		sunsetDate: new Date('2025-03-01'),
		successorPath: '/api/v2/translation-questions',
		message:
			'V1 translation questions endpoint is deprecated. V2 offers better performance and consistent structure.'
	},
	'/api/fetch-translation-words': {
		version: '1.0',
		sunsetDate: new Date('2025-03-01'),
		successorPath: '/api/v2/fetch-translation-words',
		message:
			'V1 translation words endpoint is deprecated. V2 uses dynamic ingredient lookup instead of hardcoded words.'
	},
	'/api/get-translation-word': {
		version: '1.0',
		sunsetDate: new Date('2025-03-01'),
		successorPath: '/api/fetch-translation-word',
		message: 'Endpoint renamed to /api/fetch-translation-word for consistency with other endpoints.'
	},
	'/api/fetch-translation-academy': {
		version: '1.0',
		sunsetDate: new Date('2025-03-01'),
		successorPath: '/api/v2/fetch-translation-academy',
		message:
			'V1 translation academy endpoint is deprecated. V2 uses ZIP-based fetching for better performance.'
	}
};

/**
 * Middleware to add deprecation headers to V1 endpoints
 */
export function deprecationMiddleware(path: string): RequestHandler | null {
	const deprecationConfig = V1_DEPRECATIONS[path];

	if (!deprecationConfig) {
		return null;
	}

	return async ({ request, resolve }) => {
		const response = await resolve(request);

		// Add deprecation headers
		const deprecationHeaders = createDeprecationHeaders(deprecationConfig);
		Object.entries(deprecationHeaders).forEach(([key, value]) => {
			response.headers.set(key, value);
		});

		// Log deprecation usage for monitoring
		console.warn(`⚠️ Deprecated endpoint accessed: ${path}`, {
			userAgent: request.headers.get('user-agent'),
			timestamp: new Date().toISOString(),
			successor: deprecationConfig.successorPath
		});

		return response;
	};
}

/**
 * Helper to check if an endpoint is deprecated
 */
export function isDeprecated(path: string): boolean {
	return path in V1_DEPRECATIONS;
}

/**
 * Get migration information for deprecated endpoint
 */
export function getMigrationInfo(path: string): DeprecationConfig | null {
	return V1_DEPRECATIONS[path] || null;
}
