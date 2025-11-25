import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { UnifiedResourceFetcher } from '$lib/unifiedResourceFetcher';
import { logger } from '$lib/../../../src/utils/logger.js';

/**
 * Admin endpoint to trigger clean content population for a specific language/organization
 *
 * Usage: GET /api/admin/populate-scope?language=en&organization=unfoldingWord&test=true
 *
 * Parameters:
 * - language: Language code (default: 'en')
 * - organization: Organization (default: 'unfoldingWord')
 * - test: If true, only populate a few test items (default: true)
 * - full: If true, populate all books (default: false)
 */
export const GET: RequestHandler = async ({ url, platform }) => {
	const language = url.searchParams.get('language') || 'en';
	const organization = url.searchParams.get('organization') || 'unfoldingWord';
	const test = url.searchParams.get('test') !== 'false';
	const full = url.searchParams.get('full') === 'true';

	logger.info('[PopulateScope] Starting population', {
		language,
		organization,
		test,
		full
	});

	// Create a promise that will populate content
	const populatePromise = async () => {
		const fetcher = new UnifiedResourceFetcher();
		const results = {
			attempted: 0,
			succeeded: 0,
			failed: 0,
			errors: [] as string[]
		};

		try {
			if (test) {
				// Test mode: Just populate a few key items
				logger.info('[PopulateScope] Running in test mode - limited population');

				const testQueries = [
					{ type: 'scripture', reference: 'John 3:16', resources: ['ult'] },
					{ type: 'scripture', reference: 'Genesis 1:1', resources: ['ult'] },
					{ type: 'notes', reference: 'John 3:16' },
					{ type: 'words', term: 'god' },
					{ type: 'words', term: 'love' },
					{ type: 'academy', moduleId: 'translate' }
				];

				for (const query of testQueries) {
					results.attempted++;
					try {
						logger.info(`[PopulateScope] Processing ${query.type}`, query);

						switch (query.type) {
							case 'scripture':
								await fetcher.fetchScripture(
									query.reference,
									language,
									organization,
									query.resources
								);
								break;
							case 'notes':
								await fetcher.fetchTranslationNotes(query.reference, language, organization);
								break;
							case 'words':
								await fetcher.fetchTranslationWord(query.term, language, organization);
								break;
							case 'academy':
								await fetcher.fetchTranslationAcademy(language, organization, query.moduleId);
								break;
						}
						results.succeeded++;
					} catch (err) {
						results.failed++;
						const errorMsg = `${query.type} failed: ${String(err)}`;
						results.errors.push(errorMsg);
						logger.warn(`[PopulateScope] ${errorMsg}`, { query });
					}
				}
			} else if (full) {
				// Full mode: Populate all books
				logger.info('[PopulateScope] Running in full mode - complete population');

				const books = [
					'Genesis',
					'Exodus',
					'Leviticus',
					'Numbers',
					'Deuteronomy',
					'Joshua',
					'Judges',
					'Ruth',
					'1 Samuel',
					'2 Samuel',
					'1 Kings',
					'2 Kings',
					'1 Chronicles',
					'2 Chronicles',
					'Ezra',
					'Nehemiah',
					'Esther',
					'Job',
					'Psalms',
					'Proverbs',
					'Ecclesiastes',
					'Song of Songs',
					'Isaiah',
					'Jeremiah',
					'Lamentations',
					'Ezekiel',
					'Daniel',
					'Hosea',
					'Joel',
					'Amos',
					'Obadiah',
					'Jonah',
					'Micah',
					'Nahum',
					'Habakkuk',
					'Zephaniah',
					'Haggai',
					'Zechariah',
					'Malachi',
					'Matthew',
					'Mark',
					'Luke',
					'John',
					'Acts',
					'Romans',
					'1 Corinthians',
					'2 Corinthians',
					'Galatians',
					'Ephesians',
					'Philippians',
					'Colossians',
					'1 Thessalonians',
					'2 Thessalonians',
					'1 Timothy',
					'2 Timothy',
					'Titus',
					'Philemon',
					'Hebrews',
					'James',
					'1 Peter',
					'2 Peter',
					'1 John',
					'2 John',
					'3 John',
					'Jude',
					'Revelation'
				];

				// Process in batches to avoid timeout
				const batchSize = 5;
				for (let i = 0; i < books.length; i += batchSize) {
					const batch = books.slice(i, i + batchSize);
					const batchPromises = batch.map(async (book) => {
						results.attempted++;
						try {
							// Fetch first chapter of each book
							await fetcher.fetchScripture(`${book} 1:1-5`, language, organization, ['ult', 'ust']);
							results.succeeded++;
						} catch (err) {
							results.failed++;
							results.errors.push(`${book}: ${String(err)}`);
						}
					});

					await Promise.allSettled(batchPromises);

					// Log progress
					logger.info(`[PopulateScope] Batch ${Math.floor(i / batchSize) + 1} complete`, {
						processed: Math.min(i + batchSize, books.length),
						total: books.length
					});
				}
			} else {
				// Default: Populate a reasonable subset
				logger.info('[PopulateScope] Running in default mode - key books population');

				const keyBooks = ['John', 'Genesis', 'Matthew', 'Romans', 'Psalms'];

				for (const book of keyBooks) {
					results.attempted++;
					try {
						// Fetch first 3 chapters of each key book
						for (let chapter = 1; chapter <= 3; chapter++) {
							await fetcher.fetchScripture(`${book} ${chapter}`, language, organization, ['ult']);
						}
						results.succeeded++;
					} catch (err) {
						results.failed++;
						results.errors.push(`${book}: ${String(err)}`);
					}
				}
			}
		} catch (error) {
			logger.error('[PopulateScope] Unexpected error', { error });
			results.errors.push(`Unexpected: ${String(error)}`);
		}

		logger.info('[PopulateScope] Population complete', results);
		return results;
	};

	// If we have platform context, use waitUntil for background processing
	if (platform?.context) {
		logger.info('[PopulateScope] Using waitUntil for background processing');
		platform.context.waitUntil(populatePromise());

		return json({
			status: 'started',
			message: `Population started for ${language}/${organization}. Check back in 30-60 seconds.`,
			scope: {
				language,
				organization,
				mode: test ? 'test' : full ? 'full' : 'default'
			}
		});
	} else {
		// No platform context - run synchronously (may timeout)
		logger.info('[PopulateScope] Running synchronously - no platform context');
		const results = await populatePromise();

		return json({
			status: 'completed',
			message: `Population completed for ${language}/${organization}`,
			scope: {
				language,
				organization,
				mode: test ? 'test' : full ? 'full' : 'default'
			},
			results
		});
	}
};
