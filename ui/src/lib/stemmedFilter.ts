/**
 * Stemmed Filter Utility
 * 
 * Generates stemmed regex patterns for comprehensive keyword filtering.
 * Used across all resource endpoints for the `filter` parameter.
 */

/**
 * Generate a stemmed regex pattern from a search term.
 * Handles common English word variations including biblical/archaic forms.
 * 
 * @param term - The search term to stem
 * @returns RegExp that matches the term and its variations
 * 
 * @example
 * generateStemmedPattern('love')
 * // Returns: /\b(love|loves|loved|loving|loveth|lovest)\b/gi
 */
export function generateStemmedPattern(term: string): RegExp {
	const stems = new Set<string>();
	const base = term.toLowerCase().trim();
	
	if (!base) {
		throw new Error('Filter term cannot be empty');
	}
	
	// Add the base term
	stems.add(base);
	
	// Common English suffixes
	stems.add(base + 's');         // love → loves
	stems.add(base + 'es');        // search → searches
	stems.add(base + 'd');         // love → loved
	stems.add(base + 'ed');        // call → called
	stems.add(base + 'ing');       // call → calling
	stems.add(base + 'er');        // love → lover
	stems.add(base + 'ers');       // love → lovers
	stems.add(base + 'ly');        // love → lovely
	
	// Biblical/archaic forms (KJV style)
	stems.add(base + 'eth');       // love → loveth
	stems.add(base + 'est');       // love → lovest
	stems.add(base + 'edst');      // love → lovedst
	
	// Handle words ending in 'e' (love → loving, not loveing)
	if (base.endsWith('e')) {
		const noE = base.slice(0, -1);
		stems.add(noE + 'ing');      // love → loving
		stems.add(noE + 'ed');       // love → loved (already covered but safe)
		stems.add(noE + 'er');       // love → lover
		stems.add(noE + 'ers');      // love → lovers
		stems.add(noE + 'eth');      // love → loveth
		stems.add(noE + 'est');      // love → lovest
	}
	
	// Handle words ending in 'y' (glory → glories)
	if (base.endsWith('y') && base.length > 2) {
		const noY = base.slice(0, -1);
		stems.add(noY + 'ies');      // glory → glories
		stems.add(noY + 'ied');      // glory → gloried
		stems.add(noY + 'ier');      // glory → glorier
		stems.add(noY + 'iest');     // glory → gloriest
	}
	
	// Handle double consonants for short words (stop → stopping)
	if (base.length <= 4 && /[aeiou][bcdfghjklmnpqrstvwxz]$/.test(base)) {
		const lastChar = base[base.length - 1];
		stems.add(base + lastChar + 'ing');  // stop → stopping
		stems.add(base + lastChar + 'ed');   // stop → stopped
		stems.add(base + lastChar + 'er');   // stop → stopper
	}
	
	// Build pattern with word boundaries
	// Sort by length descending so longer matches are tried first
	const sortedStems = [...stems].sort((a, b) => b.length - a.length);
	const pattern = sortedStems.join('|');
	
	return new RegExp(`\\b(${pattern})\\b`, 'gi');
}

/**
 * Result of a filter match
 */
export interface FilterMatch {
	/** The matched text/content */
	text: string;
	/** Reference (e.g., "JHN 3:16" or article ID) */
	reference: string;
	/** Resource type (ult, ust, tn, tw, etc.) */
	resource: string;
	/** Language code */
	language: string;
	/** The matched terms found */
	matchedTerms: string[];
	/** Match score (number of matches) */
	matchCount: number;
}

/**
 * Apply stemmed filter to text content and extract matching segments.
 * 
 * @param content - The full content to search
 * @param pattern - The stemmed regex pattern
 * @param segmentParser - Function to parse content into searchable segments
 * @returns Array of matching segments with metadata
 */
export function applyFilter<T>(
	content: string,
	pattern: RegExp,
	segmentParser: (content: string) => T[],
	segmentToFilterMatch: (segment: T, matches: string[]) => FilterMatch | null
): FilterMatch[] {
	const segments = segmentParser(content);
	const results: FilterMatch[] = [];
	
	for (const segment of segments) {
		// Reset regex lastIndex for each segment
		pattern.lastIndex = 0;
		
		// Get segment text for matching
		const segmentText = typeof segment === 'string' ? segment : JSON.stringify(segment);
		const matches: string[] = [];
		let match;
		
		while ((match = pattern.exec(segmentText)) !== null) {
			matches.push(match[0]);
		}
		
		if (matches.length > 0) {
			const filterMatch = segmentToFilterMatch(segment, matches);
			if (filterMatch) {
				results.push(filterMatch);
			}
		}
	}
	
	return results;
}

/**
 * Parse scripture content into verses.
 * Handles markdown format: "chapter:verse text"
 */
export function parseScriptureIntoVerses(
	content: string,
	book: string,
	resource: string,
	language: string
): Array<{ text: string; reference: string; chapter: number; verse: number }> {
	const verses: Array<{ text: string; reference: string; chapter: number; verse: number }> = [];
	const lines = content.split('\n');
	
	for (const line of lines) {
		// Match verse format: "3:16 For God so loved..."
		const verseMatch = line.match(/^(\d+):(\d+)\s+(.+)$/);
		if (verseMatch) {
			const [, chapter, verse, text] = verseMatch;
			verses.push({
				text: text.trim(),
				reference: `${book} ${chapter}:${verse}`,
				chapter: parseInt(chapter, 10),
				verse: parseInt(verse, 10)
			});
		}
	}
	
	return verses;
}

/**
 * Create an NDJSON streaming response
 */
export function createNDJSONStream(): {
	stream: ReadableStream;
	writer: {
		write: (data: any) => void;
		close: () => void;
	};
} {
	let controller: ReadableStreamDefaultController;
	const encoder = new TextEncoder();
	
	const stream = new ReadableStream({
		start(c) {
			controller = c;
		}
	});
	
	return {
		stream,
		writer: {
			write: (data: any) => {
				controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
			},
			close: () => {
				controller.close();
			}
		}
	};
}

/**
 * Create streaming response headers
 */
export function getStreamingHeaders(): HeadersInit {
	return {
		'Content-Type': 'application/x-ndjson',
		'Transfer-Encoding': 'chunked',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive'
	};
}
