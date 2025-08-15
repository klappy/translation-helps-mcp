import type { RequestHandler } from './$types';
import { createSimpleEndpoint } from '$lib/simpleEndpoint';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher';
import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';

// Map book codes to full names
const BOOK_CODE_MAP: Record<string, string> = {
	gen: 'Genesis',
	exo: 'Exodus',
	lev: 'Leviticus',
	num: 'Numbers',
	deu: 'Deuteronomy',
	jos: 'Joshua',
	jdg: 'Judges',
	rut: 'Ruth',
	'1sa': '1 Samuel',
	'2sa': '2 Samuel',
	'1ki': '1 Kings',
	'2ki': '2 Kings',
	'1ch': '1 Chronicles',
	'2ch': '2 Chronicles',
	ezr: 'Ezra',
	neh: 'Nehemiah',
	est: 'Esther',
	job: 'Job',
	psa: 'Psalms',
	pro: 'Proverbs',
	ecc: 'Ecclesiastes',
	sng: 'Song of Solomon',
	isa: 'Isaiah',
	jer: 'Jeremiah',
	lam: 'Lamentations',
	ezk: 'Ezekiel',
	dan: 'Daniel',
	hos: 'Hosea',
	jol: 'Joel',
	amo: 'Amos',
	oba: 'Obadiah',
	jon: 'Jonah',
	mic: 'Micah',
	nam: 'Nahum',
	hab: 'Habakkuk',
	zep: 'Zephaniah',
	hag: 'Haggai',
	zec: 'Zechariah',
	mal: 'Malachi',
	mat: 'Matthew',
	mrk: 'Mark',
	luk: 'Luke',
	jhn: 'John',
	act: 'Acts',
	rom: 'Romans',
	'1co': '1 Corinthians',
	'2co': '2 Corinthians',
	gal: 'Galatians',
	eph: 'Ephesians',
	php: 'Philippians',
	col: 'Colossians',
	'1th': '1 Thessalonians',
	'2th': '2 Thessalonians',
	'1ti': '1 Timothy',
	'2ti': '2 Timothy',
	tit: 'Titus',
	phm: 'Philemon',
	heb: 'Hebrews',
	jas: 'James',
	'1pe': '1 Peter',
	'2pe': '2 Peter',
	'1jn': '1 John',
	'2jn': '2 John',
	'3jn': '3 John',
	jud: 'Jude',
	rev: 'Revelation'
};

/**
 * Resolve RC (Resource Container) links to their actual content
 *
 * RC Link Format: rc://language/resource/type/project/chapter/chunk
 */

function parseRCLink(rcLink: string) {
	// Remove rc:// prefix and split into parts
	const cleanLink = rcLink.replace(/^rc:\/\//, '');
	const parts = cleanLink.split('/');

	// Basic validation
	if (parts.length < 3) {
		throw new Error(`Invalid RC link format: ${rcLink}`);
	}

	const [language, resource, ...pathParts] = parts;

	return {
		language: language === '*' ? 'en' : language, // Default to English for wildcards
		resource,
		path: pathParts.join('/')
	};
}

export const GET: RequestHandler = ({ url, platform }) =>
	createSimpleEndpoint({
		name: 'resolve-rc-link',
		category: 'extended',
		description: 'Resolve RC (Resource Container) links to their actual content',
		dataSourceType: 'zip-cached',
		params: [
			{
				name: 'rcLink',
				type: 'string',
				required: true,
				description: 'RC link to resolve (e.g., "rc://*/tw/dict/bible/kt/love")'
			},
			{
				name: 'organization',
				type: 'string',
				required: false,
				default: 'unfoldingWord',
				description: 'Organization to use for resolving the link'
			}
		],
		supportsFormats: ['json', 'md', 'markdown'],
		disableInProduction: false,
		handler: async (params: Record<string, any>) => {
			const fetcher = new UnifiedResourceFetcher(platform?.env);
			const tracer = new EdgeXRayTracer('resolve-rc-link');

			try {
				const { rcLink, organization = 'unfoldingWord' } = params;

				if (!rcLink) {
					throw new Error('Missing required parameter: rcLink');
				}

				// Parse the RC link
				const { language, resource, path } = parseRCLink(rcLink);

				console.log('[rc-link] Parsed RC link:', {
					original: rcLink,
					language,
					resource,
					path
				});

				// Route to appropriate resource type
				let result: any;

				switch (resource) {
					case 'tw': {
						// Translation Words: rc://*/tw/dict/bible/kt/love
						// Extract the term from the path (e.g., "dict/bible/kt/love" -> "love")
						const pathSegments = path.split('/');
						const term = pathSegments[pathSegments.length - 1];

						console.log('[rc-link] Fetching Translation Word:', term);
						result = await fetcher.fetchTranslationWord(term, language, organization, path);
						break;
					}

					case 'ta': {
						// Translation Academy: rc://*/ta/man/translate/figs-metaphor
						// Extract module ID from path (e.g., "man/translate/figs-metaphor" -> "translate/figs-metaphor")
						const moduleId = path.replace(/^man\//, '');

						console.log('[rc-link] Fetching Translation Academy:', moduleId);
						const taResult = await fetcher.fetchTranslationAcademy(
							language,
							organization,
							moduleId
						);

						// For TA, we need to extract the specific module from the result
						if (taResult.modules && taResult.modules.length > 0) {
							result = taResult.modules[0];
						} else {
							result = taResult;
						}
						break;
					}

					case 'tn': {
						// Translation Notes: rc://*/tn/help/gen/01/02
						// Extract reference from path (e.g., "help/gen/01/02" -> "Genesis 1:2")
						const pathParts = path.replace(/^help\//, '').split('/');
						if (pathParts.length >= 3) {
							const [bookCode, chapter, verse] = pathParts;
							const bookName = BOOK_CODE_MAP[bookCode];
							if (!bookName) {
								throw new Error(`Unknown book code: ${bookCode}`);
							}
							const reference = `${bookName} ${chapter}:${verse}`;

							console.log('[rc-link] Fetching Translation Notes:', reference);
							const notes = await fetcher.fetchTranslationNotes(reference, language, organization);
							result = {
								reference,
								notes
							};
						} else {
							throw new Error(`Invalid Translation Notes path: ${path}`);
						}
						break;
					}

					case 'ult':
					case 'ust': {
						// Scripture: rc://*/ult/book/gen/01/02
						// Extract reference from path (e.g., "book/gen/01/02" -> "Genesis 1:2")
						const pathParts = path.replace(/^book\//, '').split('/');
						if (pathParts.length >= 3) {
							const [bookCode, chapter, verse] = pathParts;
							const bookName = BOOK_CODE_MAP[bookCode];
							if (!bookName) {
								throw new Error(`Unknown book code: ${bookCode}`);
							}
							const reference = `${bookName} ${chapter}:${verse}`;

							console.log('[rc-link] Fetching Scripture:', reference, resource);
							const scripture = await fetcher.fetchScripture(
								reference,
								language,
								organization,
								resource
							);
							result = scripture;
						} else {
							throw new Error(`Invalid Scripture path: ${path}`);
						}
						break;
					}

					default:
						throw new Error(`Unsupported resource type: ${resource}`);
				}

				return {
					rcLink,
					language,
					resource,
					path,
					content: result,
					metadata: {
						organization,
						resolvedAt: new Date().toISOString()
					},
					_trace: tracer.getTrace()
				};
			} catch (error) {
				console.error('[rc-link] Error resolving RC link:', error);
				throw error;
			}
		},
		examples: [
			{
				name: 'Translation Words Link',
				description: 'Resolve a Translation Words RC link',
				params: {
					rcLink: 'rc://*/tw/dict/bible/kt/love'
				},
				expectedContent: {
					contains: ['agape', 'love', 'God'],
					minLength: 100,
					fields: {
						content: 'object',
						language: 'string',
						resource: 'string'
					}
				}
			},
			{
				name: 'Translation Academy Link',
				description: 'Resolve a Translation Academy RC link',
				params: {
					rcLink: 'rc://*/ta/man/translate/figs-metaphor'
				},
				expectedContent: {
					contains: ['metaphor', 'figure of speech'],
					minLength: 100,
					fields: {
						content: 'object',
						language: 'string',
						resource: 'string'
					}
				}
			}
		]
	})(url, platform);
