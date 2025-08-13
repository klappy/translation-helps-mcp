/**
 * Edge-Compatible Translation Questions Fetcher
 *
 * Fetches translation questions from DCS API in edge runtime.
 * Parses TSV format and returns structured data.
 */

import { edgeLogger as logger } from './edgeLogger.js';
import { fetchFromDCS } from './dataFetchers.js';

interface TranslationQuestion {
	id: string;
	reference: string;
	question: string;
	answer?: string;
}

/**
 * Parse Bible reference to get book, chapter
 */
function parseReference(reference: string): {
	book: string;
	chapter: number;
} | null {
	// Match patterns like "John 3" or "1 John 3"
	const match = reference.match(/^(\d?\s*)?([A-Za-z]+)\s+(\d+)$/);

	if (!match) {
		return null;
	}

	const [, , bookName, chapter] = match;

	return {
		book: bookName.toLowerCase(),
		chapter: parseInt(chapter, 10)
	};
}

/**
 * Map book names to standard codes
 */
function getBookCode(bookName: string): string {
	const bookMap: Record<string, string> = {
		genesis: 'gen',
		gen: 'gen',
		exodus: 'exo',
		exo: 'exo',
		matthew: 'mat',
		mat: 'mat',
		mark: 'mrk',
		mrk: 'mrk',
		luke: 'luk',
		luk: 'luk',
		john: 'jhn',
		jhn: 'jhn',
		romans: 'rom',
		rom: 'rom',
		'1john': '1jn',
		'1jn': '1jn'
		// Add more as needed
	};

	const cleanBook = bookName.replace(/\s+/g, '').toLowerCase();
	return bookMap[cleanBook] || bookName.toLowerCase();
}

/**
 * Parse TSV line into question object
 */
function parseTSVLine(line: string, reference: string): TranslationQuestion | null {
	const columns = line.split('\t');

	// TSV columns: Reference, ID, Tags, Quote, Occurrence, Question, Response
	if (columns.length < 7) {
		return null;
	}

	const [ref, id, _tags, _quote, _occurrence, question, response] = columns;

	// Skip header or invalid lines
	if (!id || id === 'ID' || !question || question === 'Question') {
		return null;
	}

	// Parse the reference column (e.g., "1:1" for chapter:verse)
	const refParts = ref.split(':');
	const chapterNum = parseInt(refParts[0], 10);
	const verseNum = refParts[1] ? parseInt(refParts[1], 10) : undefined;

	// Build full reference
	const fullRef = verseNum
		? `${reference.split(' ')[0]} ${chapterNum}:${verseNum}`
		: `${reference.split(' ')[0]} ${chapterNum}`;

	return {
		id: id,
		reference: fullRef,
		question: question.trim(),
		answer: response && response.trim() ? response.trim() : undefined
	};
}

/**
 * Fetch translation questions from DCS
 */
export async function fetchTranslationQuestionsFromDCS(
	reference: string,
	language: string = 'en',
	organization: string = 'unfoldingword'
): Promise<TranslationQuestion[]> {
	logger.info('Fetching translation questions from DCS', { reference, language, organization });

	// Parse reference
	const parsed = parseReference(reference);
	if (!parsed) {
		throw new Error(`Invalid reference format: ${reference}`);
	}

	const { book, chapter } = parsed;
	const bookCode = getBookCode(book);

	try {
		// Search for translation questions resource
		const searchUrl = `/api/v1/catalog/search?lang=${language}&subject=TSV%20Translation%20Questions&limit=10`;
		logger.debug('Searching for translation questions', { url: searchUrl });

		const searchData = await fetchFromDCS(searchUrl);

		if (!searchData.data || searchData.data.length === 0) {
			logger.warn(`No translation questions found for language ${language}`);
			return [];
		}

		// Find the translation questions resource
		const catalog = searchData.data.find(
			(item: any) =>
				item.subject === 'TSV Translation Questions' &&
				item.owner?.toLowerCase() === organization.toLowerCase()
		);

		if (!catalog) {
			logger.warn(`No translation questions catalog found for ${organization}`);
			return [];
		}

		const repoName = catalog.name;
		const owner = catalog.owner;

		// Translation questions are organized by book
		const filePath = `${bookCode}.tsv`;
		const endpoint = `/api/v1/repos/${owner}/${repoName}/contents/${filePath}`;

		logger.info('Fetching TSV file', { endpoint, book: bookCode });

		const fileData = await fetchFromDCS(endpoint);

		if (!fileData.content) {
			logger.warn(`No translation questions content found for ${bookCode}`);
			return [];
		}

		// Decode base64 content
		const tsvContent = atob(fileData.content);

		// Parse TSV lines
		const lines = tsvContent.split('\n');
		const questions: TranslationQuestion[] = [];

		for (const line of lines) {
			// Skip empty lines
			if (!line.trim()) continue;

			// Check if this line matches our chapter
			const columns = line.split('\t');
			if (columns.length >= 1) {
				const ref = columns[0];
				const refMatch = ref.match(/^(\d+)(?::(\d+))?$/);
				if (refMatch) {
					const lineChapter = parseInt(refMatch[1], 10);

					// Match chapter
					if (lineChapter === chapter) {
						const question = parseTSVLine(line, reference);
						if (question) {
							questions.push(question);
						}
					}
				}
			}
		}

		logger.info(`Found ${questions.length} questions for ${reference}`);
		return questions;
	} catch (error) {
		logger.error('Failed to fetch translation questions', { error });
		throw error;
	}
}
