/**
 * Edge-Compatible Books Fetcher
 *
 * Fetches available books for a given language/resource from DCS API.
 * Returns book metadata including names and order.
 */

import { fetchFromDCS } from './dataFetchers.js';
import { edgeLogger as logger } from './edgeLogger.js';

interface Book {
	id: string;
	name: string;
	testament: 'ot' | 'nt';
	order: number;
}

// Standard book order and metadata
const BOOK_DATA: Record<string, { name: string; testament: 'ot' | 'nt'; order: number }> = {
	// Old Testament
	gen: { name: 'Genesis', testament: 'ot', order: 1 },
	exo: { name: 'Exodus', testament: 'ot', order: 2 },
	lev: { name: 'Leviticus', testament: 'ot', order: 3 },
	num: { name: 'Numbers', testament: 'ot', order: 4 },
	deu: { name: 'Deuteronomy', testament: 'ot', order: 5 },
	jos: { name: 'Joshua', testament: 'ot', order: 6 },
	jdg: { name: 'Judges', testament: 'ot', order: 7 },
	rut: { name: 'Ruth', testament: 'ot', order: 8 },
	'1sa': { name: '1 Samuel', testament: 'ot', order: 9 },
	'2sa': { name: '2 Samuel', testament: 'ot', order: 10 },
	'1ki': { name: '1 Kings', testament: 'ot', order: 11 },
	'2ki': { name: '2 Kings', testament: 'ot', order: 12 },
	'1ch': { name: '1 Chronicles', testament: 'ot', order: 13 },
	'2ch': { name: '2 Chronicles', testament: 'ot', order: 14 },
	ezr: { name: 'Ezra', testament: 'ot', order: 15 },
	neh: { name: 'Nehemiah', testament: 'ot', order: 16 },
	est: { name: 'Esther', testament: 'ot', order: 17 },
	job: { name: 'Job', testament: 'ot', order: 18 },
	psa: { name: 'Psalms', testament: 'ot', order: 19 },
	pro: { name: 'Proverbs', testament: 'ot', order: 20 },
	ecc: { name: 'Ecclesiastes', testament: 'ot', order: 21 },
	sng: { name: 'Song of Songs', testament: 'ot', order: 22 },
	isa: { name: 'Isaiah', testament: 'ot', order: 23 },
	jer: { name: 'Jeremiah', testament: 'ot', order: 24 },
	lam: { name: 'Lamentations', testament: 'ot', order: 25 },
	ezk: { name: 'Ezekiel', testament: 'ot', order: 26 },
	dan: { name: 'Daniel', testament: 'ot', order: 27 },
	hos: { name: 'Hosea', testament: 'ot', order: 28 },
	jol: { name: 'Joel', testament: 'ot', order: 29 },
	amo: { name: 'Amos', testament: 'ot', order: 30 },
	oba: { name: 'Obadiah', testament: 'ot', order: 31 },
	jon: { name: 'Jonah', testament: 'ot', order: 32 },
	mic: { name: 'Micah', testament: 'ot', order: 33 },
	nam: { name: 'Nahum', testament: 'ot', order: 34 },
	hab: { name: 'Habakkuk', testament: 'ot', order: 35 },
	zep: { name: 'Zephaniah', testament: 'ot', order: 36 },
	hag: { name: 'Haggai', testament: 'ot', order: 37 },
	zec: { name: 'Zechariah', testament: 'ot', order: 38 },
	mal: { name: 'Malachi', testament: 'ot', order: 39 },
	// New Testament
	mat: { name: 'Matthew', testament: 'nt', order: 40 },
	mrk: { name: 'Mark', testament: 'nt', order: 41 },
	luk: { name: 'Luke', testament: 'nt', order: 42 },
	jhn: { name: 'John', testament: 'nt', order: 43 },
	act: { name: 'Acts', testament: 'nt', order: 44 },
	rom: { name: 'Romans', testament: 'nt', order: 45 },
	'1co': { name: '1 Corinthians', testament: 'nt', order: 46 },
	'2co': { name: '2 Corinthians', testament: 'nt', order: 47 },
	gal: { name: 'Galatians', testament: 'nt', order: 48 },
	eph: { name: 'Ephesians', testament: 'nt', order: 49 },
	php: { name: 'Philippians', testament: 'nt', order: 50 },
	col: { name: 'Colossians', testament: 'nt', order: 51 },
	'1th': { name: '1 Thessalonians', testament: 'nt', order: 52 },
	'2th': { name: '2 Thessalonians', testament: 'nt', order: 53 },
	'1ti': { name: '1 Timothy', testament: 'nt', order: 54 },
	'2ti': { name: '2 Timothy', testament: 'nt', order: 55 },
	tit: { name: 'Titus', testament: 'nt', order: 56 },
	phm: { name: 'Philemon', testament: 'nt', order: 57 },
	heb: { name: 'Hebrews', testament: 'nt', order: 58 },
	jas: { name: 'James', testament: 'nt', order: 59 },
	'1pe': { name: '1 Peter', testament: 'nt', order: 60 },
	'2pe': { name: '2 Peter', testament: 'nt', order: 61 },
	'1jn': { name: '1 John', testament: 'nt', order: 62 },
	'2jn': { name: '2 John', testament: 'nt', order: 63 },
	'3jn': { name: '3 John', testament: 'nt', order: 64 },
	jud: { name: 'Jude', testament: 'nt', order: 65 },
	rev: { name: 'Revelation', testament: 'nt', order: 66 }
};

/**
 * Extract books from catalog data
 */
function extractBooksFromIngredients(ingredients: any[]): Book[] {
	const books: Book[] = [];
	const bookSet = new Set<string>();

	for (const ingredient of ingredients) {
		const bookId = ingredient.identifier;
		if (bookId && BOOK_DATA[bookId] && !bookSet.has(bookId)) {
			bookSet.add(bookId);
			books.push({
				id: bookId,
				name: BOOK_DATA[bookId].name,
				testament: BOOK_DATA[bookId].testament,
				order: BOOK_DATA[bookId].order
			});
		}
	}

	// Sort by canonical order
	books.sort((a, b) => a.order - b.order);

	return books;
}

/**
 * Fetch available books from DCS
 */
export async function fetchBooksFromDCS(
	language: string = 'en',
	resource?: string,
	testament?: 'ot' | 'nt' | 'both',
	organization: string = 'unfoldingword'
): Promise<Book[]> {
	logger.info('Fetching books from DCS', { language, resource, testament, organization });

	try {
		// Build search query
		let searchUrl = `/api/v1/catalog/search?lang=${language}&owner=${organization}&limit=50`;

		// Add resource filter if specified
		if (resource) {
			// Map common resource names to DCS subjects
			const resourceMap: Record<string, string> = {
				ult: 'Bible',
				ust: 'Bible',
				tn: 'TSV Translation Notes',
				tw: 'Translation Words',
				tq: 'TSV Translation Questions',
				ta: 'Translation Academy'
			};

			const subject = resourceMap[resource.toLowerCase()] || 'Bible';
			searchUrl += `&subject=${encodeURIComponent(subject)}`;
		} else {
			searchUrl += `&subject=Bible`;
		}

		logger.debug('Searching catalog for books', { url: searchUrl });

		const searchData = await fetchFromDCS(searchUrl);

		if (!searchData.data || searchData.data.length === 0) {
			logger.warn(`No resources found for ${language}`);
			return [];
		}

		// Extract books from all matching resources
		const allBooks: Book[] = [];
		const bookSet = new Set<string>();

		for (const item of searchData.data) {
			// Filter by specific resource if requested
			if (
				resource &&
				item.abbreviation !== resource &&
				!item.title?.toLowerCase().includes(resource)
			) {
				continue;
			}

			if (item.ingredients && Array.isArray(item.ingredients)) {
				const books = extractBooksFromIngredients(item.ingredients);
				for (const book of books) {
					if (!bookSet.has(book.id)) {
						bookSet.add(book.id);
						allBooks.push(book);
					}
				}
			}
		}

		// Filter by testament if specified
		let filteredBooks = allBooks;
		if (testament && testament !== 'both') {
			filteredBooks = allBooks.filter((book) => book.testament === testament);
		}

		// Sort by canonical order
		filteredBooks.sort((a, b) => a.order - b.order);

		logger.info(`Found ${filteredBooks.length} books for ${language}/${resource || 'all'}`);
		return filteredBooks;
	} catch (error) {
		logger.error('Failed to fetch books', { error });
		throw error;
	}
}
