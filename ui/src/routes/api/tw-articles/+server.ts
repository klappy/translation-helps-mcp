import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
import { createTranslationHelpsResponse } from '$lib/standardResponses.js';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher.js';

async function fetchTWArticles(params: Record<string, any>, request: Request): Promise<any> {
	const { reference, language, organization } = params;

	const tracer = new EdgeXRayTracer(`twarts-${Date.now()}`, 'tw-articles');
	const fetcher = new UnifiedResourceFetcher(tracer);
	fetcher.setRequestHeaders(Object.fromEntries(request.headers.entries()));

	// 1) Get TW links
	const links = await fetcher.fetchTranslationWordLinks(reference, language, organization);

	// 2) Resolve each link to full article (best-effort, partial success allowed)
	const items: Array<any> = [];
	for (const row of links) {
		const rcLink = row.TWLink || row.rcLink || '';
		let term = '';
		let category: string | undefined;
		let pathHint: string | undefined;

		// Basic parse for rc://*/tw/dict/bible/<cat>/<term>
		const m = String(rcLink).match(/tw\/dict\/bible\/([^/]+)\/([^/\s]+)/i);
		if (m) {
			category = m[1];
			term = m[2];
			pathHint = `bible/${category}/${term}.md`;
		}

		try {
			const article = await fetcher.fetchTranslationWord(term || '', language, organization);
			if (article?.content) {
				items.push({
					id: `${category || 'kt'}:${term || 'unknown'}`,
					term: article.term || term,
					category: category || 'kt',
					path: article.path,
					content: article.content,
					rcLink,
					language,
					organization,
					source: 'TW'
				});
			}
		} catch (err: any) {
			items.push({
				id: `${category || 'unknown'}:${term || 'unknown'}`,
				term: term || 'unknown',
				category: category || 'unknown',
				error: err?.message || 'Failed to load article',
				rcLink,
				language,
				organization,
				source: 'TW'
			});
		}
	}

	const response = createTranslationHelpsResponse(items, reference, language, organization, 'tw');
	return { ...response, _trace: fetcher.getTrace() };
}

export const GET = createSimpleEndpoint({
	name: 'tw-articles',
	params: [COMMON_PARAMS.reference, COMMON_PARAMS.language, COMMON_PARAMS.organization],
	fetch: fetchTWArticles,
	onError: createStandardErrorHandler(),
	supportsFormats: true
});

export const OPTIONS = createCORSHandler();
