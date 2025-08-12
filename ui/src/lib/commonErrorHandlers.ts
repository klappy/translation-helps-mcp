/**
 * Common Error Handlers
 *
 * Consistent error handling across all endpoints.
 * Users get the same experience no matter which endpoint fails!
 */

interface ErrorResponse {
	status: number;
	message: string;
}

/**
 * Map common errors to user-friendly responses
 */
export function handleCommonErrors(error: Error): ErrorResponse | null {
	const message = error.message.toLowerCase();

	// Circuit breaker errors
	if (message.includes('circuit breaker is open')) {
		return {
			status: 503,
			message: 'Service temporarily unavailable. Please try again in a few moments.'
		};
	}

	// External API errors
	if (message.includes('dcs api error')) {
		return {
			status: 502,
			message: 'Unable to reach the catalog service. Please try again later.'
		};
	}

	// Network errors
	if (message.includes('fetch failed') || message.includes('network')) {
		return {
			status: 503,
			message: 'Network error. Please check your connection and try again.'
		};
	}

	// Timeout errors
	if (message.includes('timeout')) {
		return {
			status: 504,
			message: 'Request timed out. The service may be experiencing high load.'
		};
	}

	// Invalid reference errors
	if (message.includes('invalid reference') || message.includes('passage could not be found')) {
		return {
			status: 400,
			message: 'Invalid Bible reference. Please check the format (e.g., "John 3:16").'
		};
	}

	// Resource not found
	if (message.includes('not found') || message.includes('404')) {
		return {
			status: 404,
			message: 'The requested resource was not found.'
		};
	}

	// No specific handler found
	return null;
}

/**
 * Standard error handler factory
 */
export function createStandardErrorHandler(
	customHandlers?: Record<string, ErrorResponse>
): (error: Error) => ErrorResponse {
	return (error: Error) => {
		// Check custom handlers first
		if (customHandlers) {
			for (const [key, response] of Object.entries(customHandlers)) {
				if (error.message.includes(key)) {
					return response;
				}
			}
		}

		// Then check common handlers
		const commonResponse = handleCommonErrors(error);
		if (commonResponse) {
			return commonResponse;
		}

		// Default error
		return {
			status: 500,
			message: 'An unexpected error occurred. Please try again later.'
		};
	};
}
