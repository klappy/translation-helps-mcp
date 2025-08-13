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
	/** License information */
	license?: string;
	/** Copyright information */
	copyright?: string;
	/** Publisher information */
	publisher?: string;
	/** Contributors list */
	contributors?: string[];
	/** Date issued */
	issued?: string;
	/** Date modified */
	modified?: string;
	/** Checking level */
	checkingLevel?: string;
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
		translation: string;
		reference?: string; // Only included if different from parent reference
	}>;
	reference: string;
	language: string;
	organization: string;
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
	const reference = additionalMetadata?.reference || scripture[0]?.reference || '';

	// Extract real metadata from first scripture with metadata
	const firstWithMetadata = scripture.find((s) => s.metadata);
	const realMetadata = firstWithMetadata?.metadata || {};

	// Clean up scripture items - remove redundant fields
	const cleanScripture = scripture.map((s) => ({
		text: s.text,
		translation: s.translation,
		...(s.reference !== reference && { reference: s.reference })
	}));

	return {
		scripture: cleanScripture,
		reference,
		language,
		organization,
		metadata: {
			totalCount: scripture.length,
			resources: [...new Set(scripture.map((s) => s.resource || s.translation))].filter(Boolean),
			// Include real metadata
			license: realMetadata.license || 'CC BY-SA 4.0',
			...(realMetadata.copyright && { copyright: realMetadata.copyright }),
			...(realMetadata.publisher && { publisher: realMetadata.publisher }),
			...(realMetadata.contributors && { contributors: realMetadata.contributors }),
			...(realMetadata.issued && { issued: realMetadata.issued }),
			...(realMetadata.modified && { modified: realMetadata.modified }),
			...(realMetadata.checkingLevel && { checkingLevel: realMetadata.checkingLevel }),
			...(additionalMetadata?.requestedResources && {
				requestedResources: additionalMetadata.requestedResources
			}),
			...(additionalMetadata?.foundResources && {
				foundResources: additionalMetadata.foundResources
			})
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
	resourceType: string,
	additionalMetadata?: Partial<StandardMetadata>
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
			organization,
			resourceType,
			...additionalMetadata
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
