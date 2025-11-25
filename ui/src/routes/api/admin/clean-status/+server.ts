import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getR2Env } from '$lib/../../../src/functions/r2-env.js';
import { R2Storage } from '$lib/../../../src/functions/r2-storage.js';
import { logger } from '$lib/../../../src/utils/logger.js';

/**
 * Admin endpoint to check the status of clean content in R2
 *
 * Usage: GET /api/admin/clean-status?language=en&organization=unfoldingWord&limit=100
 *
 * Parameters:
 * - language: Language code (default: 'en')
 * - organization: Organization (default: 'unfoldingWord')
 * - limit: Maximum number of items to list (default: 100)
 * - prefix: Custom prefix to check (overrides language/organization)
 */
export const GET: RequestHandler = async ({ url }) => {
	const language = url.searchParams.get('language') || 'en';
	const organization = url.searchParams.get('organization') || 'unfoldingWord';
	const limit = parseInt(url.searchParams.get('limit') || '100', 10);
	const customPrefix = url.searchParams.get('prefix');

	const prefix = customPrefix || `clean/${language}/${organization}/`;

	logger.info('[CleanStatus] Checking R2 for clean content', {
		prefix,
		limit
	});

	try {
		const { bucket, caches } = getR2Env();
		if (!bucket) {
			return json(
				{
					error: 'R2 not available',
					message: 'R2 bucket is not configured or not available in this environment'
				},
				{ status: 503 }
			);
		}

		// Note: R2Storage instance created but not used directly
		// The bucket API is accessed directly for list operations
		const _r2 = new R2Storage(bucket as any, caches as any);

		// List objects with the given prefix
		const listResult = await bucket.list({
			prefix,
			limit
		});

		const items = listResult.objects || [];

		// Group by resource type
		const byResource: Record<string, number> = {};
		const byBook: Record<string, number> = {};
		const samples: string[] = [];

		for (const item of items) {
			const key = item.key;

			// Take first 10 as samples
			if (samples.length < 10) {
				samples.push(key);
			}

			// Parse resource type from path
			// Format: clean/{language}/{organization}/{repository}/{version}/{file}
			const parts = key.split('/');
			if (parts.length >= 4) {
				const repository = parts[3]; // e.g., 'en_ult', 'en_tn'
				const resourceMatch = repository.match(/_([a-z]+)$/);
				if (resourceMatch) {
					const resourceType = resourceMatch[1];
					byResource[resourceType] = (byResource[resourceType] || 0) + 1;
				}
			}

			// Try to extract book from filename
			const filename = parts[parts.length - 1];
			const bookMatch = filename.match(/^(\d?[A-Z]{2,3})/i);
			if (bookMatch) {
				const book = bookMatch[1].toUpperCase();
				byBook[book] = (byBook[book] || 0) + 1;
			}
		}

		const response = {
			status: 'ok',
			prefix,
			totalFiles: items.length,
			truncated: listResult.truncated || false,
			byResource,
			byBook,
			samples,
			message:
				items.length === 0
					? 'No clean content found. Run /api/admin/populate-scope first.'
					: `Found ${items.length} clean files`
		};

		logger.info('[CleanStatus] R2 check complete', {
			totalFiles: items.length,
			resourceTypes: Object.keys(byResource).length,
			books: Object.keys(byBook).length
		});

		return json(response);
	} catch (error) {
		logger.error('[CleanStatus] Error checking R2', { error });
		return json(
			{
				error: 'Failed to check R2',
				message: String(error)
			},
			{ status: 500 }
		);
	}
};
