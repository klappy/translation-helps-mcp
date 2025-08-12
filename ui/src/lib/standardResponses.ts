/**
 * Standard Response Shapes
 *
 * Consistent response formats across all endpoints.
 * Every endpoint returns data in predictable shapes!
 */

/**
 * Standard metadata that all responses should include
 */
export interface StandardMetadata {
	/** Total count of items returned */
	totalCount?: number;
	/** Source of the data */
	source?: string;
	/** Language of the content */
	language?: string;
	/** Organization providing the content */
	organization?: string;
	/** Resources included */
	resources?: string[];
	/** Any filtering applied */
	filteredBy?: Record<string, any>;
	/** Circuit breaker state if applicable */
	circuitBreakerState?: string;
}

/**
 * Scripture response shape
 */
export interface ScriptureResponse {
	scripture: Array<{
		text: string;
		reference: string;
		resource: string;
		language: string;
		citation: string;
		organization: string;
		[key: string]: any; // Allow additional fields
	}>;
	language: string;
	organization: string;
	citation: any; // Can be string or object
	metadata: StandardMetadata;
}

/**
 * Translation helps response shape
 */
export interface TranslationHelpsResponse {
	reference: string;
	language: string;
	organization: string;
	items: Array<any>; // Specific to each help type
	metadata: StandardMetadata;
}

/**
 * List response shape (for languages, resources, etc)
 */
export interface ListResponse<T> {
	items: T[];
	metadata: StandardMetadata;
}

/**
 * Create standard scripture response
 */
export function createScriptureResponse(
	scripture: any[],
	additionalMetadata?: Partial<StandardMetadata>
): ScriptureResponse {
	const language = scripture[0]?.language || 'en';
	const organization = scripture[0]?.organization || 'unfoldingWord';
	const reference = scripture[0]?.reference || '';

	return {
		scripture,
		language,
		organization,
		citation: additionalMetadata || reference,
		metadata: {
			totalCount: scripture.length,
			resources: [...new Set(scripture.map((s) => s.resource || s.translation))].filter(Boolean),
			language,
			organization,
			...additionalMetadata
		}
	};
}

/**
 * Create standard translation helps response
 */
export function createTranslationHelpsResponse(
	items: any[],
	reference: string,
	language: string = 'en',
	organization: string = 'unfoldingWord',
	resourceType: string
): TranslationHelpsResponse {
	return {
		reference,
		language,
		organization,
		items,
		metadata: {
			totalCount: items.length,
			source: resourceType.toUpperCase(),
			language,
			organization
		}
	};
}

/**
 * Create standard list response
 */
export function createListResponse<T>(
	items: T[],
	metadata?: Partial<StandardMetadata>
): ListResponse<T> {
	return {
		items,
		metadata: {
			totalCount: items.length,
			...metadata
		}
	};
}
