/**
 * Reference Parser for Edge Runtime
 * Parse Bible references into structured format compatible with ZipResourceFetcher2
 */

export interface ParsedReference {
	book: string;
	bookName?: string; // Some parts of ZIP fetcher use bookName
	chapter?: number;
	verse?: number;
	endChapter?: number;
	endVerse?: number;
	verseEnd?: number; // Some parts use verseEnd instead of endVerse
	originalText?: string;
	isValid: boolean;
}

/**
 * Parse a Bible reference string into structured data
 */
export function parseReference(referenceString: string): ParsedReference | null {
	if (!referenceString || typeof referenceString !== 'string') {
		return null;
	}

	const originalText = referenceString.trim();
	const normalizedInput = originalText
		.replace(/['']/g, "'")
		.replace(/[""]/g, '"')
		.replace(/\s+/g, ' ')
		.replace(/(\d)\s*-\s*(\d)/g, '$1-$2')
		.replace(/\u2013|\u2014/g, '-')
		.trim();

	// Patterns to match various reference formats
	const patterns = [
		// Cross-chapter verse range: "John 3:16-4:2"
		/^(.+?)\s+(\d+):(\d+)-(\d+):(\d+)$/,
		// Single chapter verse range: "John 3:16-18"
		/^(.+?)\s+(\d+):(\d+)-(\d+)$/,
		// Single verse: "John 3:16"
		/^(.+?)\s+(\d+):(\d+)$/,
		// Chapter range: "John 3-4"
		/^(.+?)\s+(\d+)-(\d+)$/,
		// Single chapter: "John 3"
		/^(.+?)\s+(\d+)$/,
		// Book only: "Genesis"
		/^(.+)$/
	];

	let result: ParsedReference | null = null;

	// Cross-chapter verse range
	const crossChapterMatch = normalizedInput.match(patterns[0]);
	if (crossChapterMatch) {
		const [, book, startChapter, startVerse, endChapter, endVerse] = crossChapterMatch;
		result = {
			book: book.trim(),
			bookName: book.trim(),
			chapter: parseInt(startChapter, 10),
			verse: parseInt(startVerse, 10),
			endChapter: parseInt(endChapter, 10),
			endVerse: parseInt(endVerse, 10),
			verseEnd: parseInt(endVerse, 10),
			originalText,
			isValid: true
		};
		return result;
	}

	// Single chapter verse range
	const verseRangeMatch = normalizedInput.match(patterns[1]);
	if (verseRangeMatch) {
		const [, book, chapter, startVerse, endVerse] = verseRangeMatch;
		result = {
			book: book.trim(),
			bookName: book.trim(),
			chapter: parseInt(chapter, 10),
			verse: parseInt(startVerse, 10),
			endVerse: parseInt(endVerse, 10),
			verseEnd: parseInt(endVerse, 10),
			originalText,
			isValid: true
		};
		return result;
	}

	// Single verse
	const singleVerseMatch = normalizedInput.match(patterns[2]);
	if (singleVerseMatch) {
		const [, book, chapter, verse] = singleVerseMatch;
		result = {
			book: book.trim(),
			bookName: book.trim(),
			chapter: parseInt(chapter, 10),
			verse: parseInt(verse, 10),
			originalText,
			isValid: true
		};
		return result;
	}

	// Chapter range
	const chapterRangeMatch = normalizedInput.match(patterns[3]);
	if (chapterRangeMatch) {
		const [, book, startChapter, endChapter] = chapterRangeMatch;
		result = {
			book: book.trim(),
			bookName: book.trim(),
			chapter: parseInt(startChapter, 10),
			endChapter: parseInt(endChapter, 10),
			// ZIP fetcher expects verseEnd for chapter ranges
			verseEnd: parseInt(endChapter, 10),
			originalText,
			isValid: true
		};
		return result;
	}

	// Single chapter
	const singleChapterMatch = normalizedInput.match(patterns[4]);
	if (singleChapterMatch) {
		const [, book, chapter] = singleChapterMatch;
		result = {
			book: book.trim(),
			bookName: book.trim(),
			chapter: parseInt(chapter, 10),
			originalText,
			isValid: true
		};
		return result;
	}

	// Book only
	const bookOnlyMatch = normalizedInput.match(patterns[5]);
	if (bookOnlyMatch) {
		const [, book] = bookOnlyMatch;
		result = {
			book: book.trim(),
			bookName: book.trim(),
			originalText,
			isValid: true
		};
		return result;
	}

	return null;
}
