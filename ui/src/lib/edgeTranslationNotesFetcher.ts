/**
 * Edge-Compatible Translation Notes Fetcher
 *
 * Fetches translation notes from DCS API in edge runtime.
 * Parses TSV format and returns structured data.
 */

import { edgeLogger as logger } from './edgeLogger.js';
import { fetchFromDCS } from './dataFetchers.js';

interface TranslationNote {
	id: string;
	reference: string;
	noteType: string;
	text: string;
	supportReference?: string;
	term?: string;
	quote?: string;
}

/**
 * Parse Bible reference to get book, chapter, verse
 */
function parseReference(reference: string): {
	book: string;
	chapter: number;
	verse?: number;
} | null {
	const match = reference.match(/^(\d?\s*)?([A-Za-z]+)\s+(\d+)(?::(\d+))?$/);

	if (!match) {
		return null;
	}

	const [, , bookName, chapter, verse] = match;

	return {
		book: bookName.toLowerCase(),
		chapter: parseInt(chapter, 10),
		verse: verse ? parseInt(verse, 10) : undefined
	};
}

/**
 * Get book code from book name
 */
function getBookCode(bookName: string): string {
	const bookMap: Record<string, string> = {
		titus: 'tit',
		tit: 'tit',
		john: 'jhn',
		jhn: 'jhn',
		matthew: 'mat',
		mat: 'mat',
		genesis: 'gen',
		gen: 'gen',
		romans: 'rom',
		rom: 'rom'
		// Add more as needed
	};

	return bookMap[bookName.toLowerCase()] || bookName.toLowerCase();
}

/**
 * Parse TSV line into note object
 */
function parseTSVLine(line: string, reference: string): TranslationNote | null {
	const columns = line.split('\t');

	// TSV columns: Book, Chapter, Verse, ID, SupportReference, OrigQuote, Occurrence, Quote, Note
	if (columns.length < 9) {
		return null;
	}

	const [_book, _chapter, _verse, id, supportReference, origQuote, _occurrence, quote, note] =
		columns;

	// Skip header or invalid lines
	if (!id || id === 'ID' || !note) {
		return null;
	}

	// Determine note type
	let noteType = 'general';
	if (supportReference.includes('/ta/man/translate/')) {
		noteType = 'translation';
	} else if (supportReference.includes('/tw/dict/')) {
		noteType = 'key-term';
	}

	return {
		id: id,
		reference: reference,
		noteType: noteType,
		text: note,
		supportReference: supportReference || undefined,
		quote: quote || undefined,
		term: origQuote || undefined
	};
}

/**
 * Fetch translation notes from DCS
 */
export async function fetchTranslationNotesFromDCS(
	reference: string,
	language: string,
	organization: string
): Promise<TranslationNote[]> {
	logger.info('Fetching translation notes from DCS', { reference, language, organization });

	// Parse reference
	const parsed = parseReference(reference);
	if (!parsed) {
		throw new Error(`Invalid reference format: ${reference}`);
	}

	const { book, chapter, verse } = parsed;
	const bookCode = getBookCode(book);

	try {
		// Search for translation notes resource
		const searchUrl = `/api/v1/catalog/search?lang=${language}&subject=TSV%20Translation%20Notes&limit=10`;
		logger.debug('Searching for translation notes', { url: searchUrl });

		const searchData = await fetchFromDCS(searchUrl);

		if (!searchData.data || searchData.data.length === 0) {
			logger.warn(`No translation notes found for language ${language}`);
			return [];
		}

		// Find the translation notes resource
		const catalog = searchData.data.find(
			(item: any) =>
				item.subject === 'TSV Translation Notes' &&
				item.owner?.toLowerCase() === organization.toLowerCase()
		);

		if (!catalog) {
			logger.warn(`No translation notes catalog found for ${organization}`);
			return [];
		}

		const repoName = catalog.name;
		const owner = catalog.owner;

		// Translation notes are organized by book
		const filePath = `${bookCode}.tsv`;
		const endpoint = `/api/v1/repos/${owner}/${repoName}/contents/${filePath}`;

		logger.info('Fetching TSV file', { endpoint, book: bookCode });

		const fileData = await fetchFromDCS(endpoint);

		if (!fileData.content) {
			logger.warn(`No translation notes content found for ${bookCode}`);
			return [];
		}

		// Decode base64 content
		const tsvContent = atob(fileData.content);

		// Parse TSV lines
		const lines = tsvContent.split('\n');
		const notes: TranslationNote[] = [];

		for (const line of lines) {
			// Skip empty lines
			if (!line.trim()) continue;

			// Check if this line matches our reference
			const columns = line.split('\t');
			if (columns.length >= 3) {
				const lineChapter = parseInt(columns[1], 10);
				const lineVerse = parseInt(columns[2], 10);

				// Match chapter (and verse if specified)
				if (lineChapter === chapter && (!verse || lineVerse === verse)) {
					const note = parseTSVLine(line, reference);
					if (note) {
						notes.push(note);
					}
				}
			}
		}

		logger.info(`Found ${notes.length} notes for ${reference}`);
		return notes;
	} catch (error) {
		logger.error('Failed to fetch translation notes', { error });
		return [];
	}
}
