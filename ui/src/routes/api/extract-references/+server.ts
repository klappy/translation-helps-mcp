/**
 * Extract References Endpoint v2
 *
 * Extracts Bible references from text input.
 * Useful for finding and linking scripture citations in documents.
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';

// Bible book names and their abbreviations
const BOOK_PATTERNS = {
	// Old Testament
	Genesis: ['Gen', 'Ge', 'Gn'],
	Exodus: ['Exod', 'Ex', 'Exo'],
	Leviticus: ['Lev', 'Le', 'Lv'],
	Numbers: ['Num', 'Nu', 'Nm', 'Nb'],
	Deuteronomy: ['Deut', 'Dt', 'De'],
	Joshua: ['Josh', 'Jos', 'Jsh'],
	Judges: ['Judg', 'Jdg', 'Jg', 'Jdgs'],
	Ruth: ['Rth', 'Ru'],
	'1 Samuel': ['1 Sam', '1 Sa', '1Sam', '1Sa', '1 Sm', '1Sm', 'I Sam', 'I Sa'],
	'2 Samuel': ['2 Sam', '2 Sa', '2Sam', '2Sa', '2 Sm', '2Sm', 'II Sam', 'II Sa'],
	'1 Kings': ['1 Kgs', '1 Ki', '1Kgs', '1Ki', '1 Kgs', '1Kgs', 'I Kgs', 'I Ki'],
	'2 Kings': ['2 Kgs', '2 Ki', '2Kgs', '2Ki', '2 Kgs', '2Kgs', 'II Kgs', 'II Ki'],
	'1 Chronicles': ['1 Chron', '1 Chr', '1 Ch', '1Chron', '1Chr', '1Ch', 'I Chr', 'I Ch'],
	'2 Chronicles': ['2 Chron', '2 Chr', '2 Ch', '2Chron', '2Chr', '2Ch', 'II Chr', 'II Ch'],
	Ezra: ['Ezr', 'Ez'],
	Nehemiah: ['Neh', 'Ne'],
	Esther: ['Esth', 'Es', 'Est'],
	Job: ['Jb'],
	Psalms: ['Ps', 'Psalm', 'Psa', 'Psm', 'Pss'],
	Proverbs: ['Prov', 'Pr', 'Prv'],
	Ecclesiastes: ['Eccles', 'Ecc', 'Ec', 'Qoh'],
	'Song of Solomon': ['Song', 'So', 'SS', 'Song of Songs', 'SOS'],
	Isaiah: ['Isa', 'Is'],
	Jeremiah: ['Jer', 'Je', 'Jr'],
	Lamentations: ['Lam', 'La'],
	Ezekiel: ['Ezek', 'Eze', 'Ezk'],
	Daniel: ['Dan', 'Da', 'Dn'],
	Hosea: ['Hos', 'Ho'],
	Joel: ['Jl'],
	Amos: ['Am'],
	Obadiah: ['Obad', 'Ob'],
	Jonah: ['Jnh', 'Jon'],
	Micah: ['Mic', 'Mc'],
	Nahum: ['Nah', 'Na'],
	Habakkuk: ['Hab', 'Hb'],
	Zephaniah: ['Zeph', 'Zep', 'Zp'],
	Haggai: ['Hag', 'Hg'],
	Zechariah: ['Zech', 'Zec', 'Zc'],
	Malachi: ['Mal', 'Ml'],
	// New Testament
	Matthew: ['Matt', 'Mt'],
	Mark: ['Mrk', 'Mk', 'Mr'],
	Luke: ['Luk', 'Lk'],
	John: ['Jn', 'Jhn'],
	Acts: ['Ac', 'Act'],
	Romans: ['Rom', 'Ro', 'Rm'],
	'1 Corinthians': ['1 Cor', '1 Co', '1Cor', '1Co', 'I Cor', 'I Co'],
	'2 Corinthians': ['2 Cor', '2 Co', '2Cor', '2Co', 'II Cor', 'II Co'],
	Galatians: ['Gal', 'Ga'],
	Ephesians: ['Eph', 'Ephes'],
	Philippians: ['Phil', 'Php', 'Pp'],
	Colossians: ['Col', 'Co'],
	'1 Thessalonians': ['1 Thess', '1 Th', '1Thess', '1Th', 'I Thess', 'I Th'],
	'2 Thessalonians': ['2 Thess', '2 Th', '2Thess', '2Th', 'II Thess', 'II Th'],
	'1 Timothy': ['1 Tim', '1 Ti', '1Tim', '1Ti', 'I Tim', 'I Ti'],
	'2 Timothy': ['2 Tim', '2 Ti', '2Tim', '2Ti', 'II Tim', 'II Ti'],
	Titus: ['Tit'],
	Philemon: ['Philem', 'Phm', 'Pm'],
	Hebrews: ['Heb', 'He'],
	James: ['Jas', 'Jm'],
	'1 Peter': ['1 Pet', '1 Pe', '1Pet', '1Pe', '1 Pt', '1Pt', 'I Pet', 'I Pe'],
	'2 Peter': ['2 Pet', '2 Pe', '2Pet', '2Pe', '2 Pt', '2Pt', 'II Pet', 'II Pe'],
	'1 John': ['1 Jn', '1Jn', '1 Jhn', '1Jhn', '1 Jo', '1Jo', 'I Jn', 'I Jo'],
	'2 John': ['2 Jn', '2Jn', '2 Jhn', '2Jhn', '2 Jo', '2Jo', 'II Jn', 'II Jo'],
	'3 John': ['3 Jn', '3Jn', '3 Jhn', '3Jhn', '3 Jo', '3Jo', 'III Jn', 'III Jo'],
	Jude: ['Jud', 'Jd'],
	Revelation: ['Rev', 'Re', 'Rv', 'Apocalypse', 'Apoc']
};

// Build regex pattern from book names
function buildBookPattern(): string {
	const allPatterns: string[] = [];

	for (const [book, abbrevs] of Object.entries(BOOK_PATTERNS)) {
		// Add full book name
		allPatterns.push(book.replace(/\s+/g, '\\s+'));

		// Add abbreviations
		for (const abbrev of abbrevs) {
			allPatterns.push(abbrev.replace(/\s+/g, '\\s+'));
		}
	}

	// Sort by length (longest first) to match longer patterns first
	allPatterns.sort((a, b) => b.length - a.length);

	return allPatterns.join('|');
}

// Normalize book names
function normalizeBookName(bookName: string): string {
	const normalized = bookName.trim();

	// Check exact match first
	if (BOOK_PATTERNS[normalized]) {
		return normalized;
	}

	// Check abbreviations
	for (const [fullName, abbrevs] of Object.entries(BOOK_PATTERNS)) {
		if (abbrevs.some((abbrev) => abbrev.toLowerCase() === normalized.toLowerCase())) {
			return fullName;
		}
	}

	// Check case-insensitive match
	for (const fullName of Object.keys(BOOK_PATTERNS)) {
		if (fullName.toLowerCase() === normalized.toLowerCase()) {
			return fullName;
		}
	}

	return normalized; // Return as-is if no match
}

/**
 * Extract Bible references from text
 */
async function extractReferences(params: Record<string, any>, _request: Request): Promise<any> {
	const { text, includeContext = true, contextWords = 10 } = params;

	// Create tracer for this request
	const tracer = new EdgeXRayTracer(`extract-${Date.now()}`, 'extract-references');

	if (!text) {
		throw new Error('Text parameter is required');
	}

	const bookPattern = buildBookPattern();

	// Regex pattern for Bible references
	// Matches patterns like: John 3:16, 1 Cor 13:4-8, Genesis 1:1-5,8
	const referencePattern = new RegExp(
		`\\b(${bookPattern})\\s+(\\d{1,3})(?::(\\d{1,3})(?:-(\\d{1,3}))?(?:,\\s*\\d{1,3}(?:-(\\d{1,3}))?)*)?`,
		'gi'
	);

	const references: any[] = [];
	let match;

	while ((match = referencePattern.exec(text)) !== null) {
		const fullMatch = match[0];
		const bookName = normalizeBookName(match[1]);
		const chapter = parseInt(match[2]);
		const verseStart = match[3] ? parseInt(match[3]) : undefined;
		const verseEnd = match[4] ? parseInt(match[4]) : undefined;

		const reference: any = {
			reference: fullMatch.trim(),
			normalized: verseStart
				? `${bookName} ${chapter}:${verseStart}${verseEnd ? `-${verseEnd}` : ''}`
				: `${bookName} ${chapter}`,
			book: bookName,
			chapter,
			verseStart,
			verseEnd,
			position: {
				start: match.index,
				end: match.index + fullMatch.length
			}
		};

		// Add context if requested
		if (includeContext) {
			const contextStart = Math.max(0, match.index - contextWords * 6); // Rough estimate
			const contextEnd = Math.min(text.length, match.index + fullMatch.length + contextWords * 6);

			// Find word boundaries
			let actualStart = contextStart;
			let actualEnd = contextEnd;

			// Move to word boundary at start
			while (actualStart > 0 && text[actualStart - 1] !== ' ') {
				actualStart--;
			}

			// Move to word boundary at end
			while (actualEnd < text.length && text[actualEnd] !== ' ') {
				actualEnd++;
			}

			reference.context = {
				before: text.substring(actualStart, match.index).trim(),
				text: fullMatch,
				after: text.substring(match.index + fullMatch.length, actualEnd).trim()
			};
		}

		references.push(reference);
	}

	// Remove duplicates based on normalized reference
	const uniqueReferences = references.reduce((acc, ref) => {
		if (!acc.some((r) => r.normalized === ref.normalized)) {
			acc.push(ref);
		}
		return acc;
	}, []);

	return {
		text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
		references: uniqueReferences,
		metadata: {
			totalFound: uniqueReferences.length,
			includesContext: includeContext,
			contextWords,
			textLength: text.length,
			uniqueBooks: [...new Set(uniqueReferences.map((r) => r.book))].length
		},
		_trace: tracer.getTrace()
	};
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'extract-references-v2',

	params: [
		{
			name: 'text',
			required: true,
			validate: (value) => {
				return value && value.length > 0;
			}
		},
		{
			name: 'includeContext',
			type: 'boolean',
			default: true
		},
		{
			name: 'contextWords',
			type: 'number',
			default: 10,
			validate: (value) => {
				if (!value) return true;
				const num = parseInt(value);
				return num >= 0 && num <= 50;
			}
		}
	],

	fetch: extractReferences,

	onError: createStandardErrorHandler({
		'Text parameter is required': {
			status: 400,
			message: 'Please provide text to extract Bible references from.'
		}
	})
});

// CORS handler
export const OPTIONS = createCORSHandler();
