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
	
	// Biblical/archaic forms (KJV style)
	stems.add(base + 'eth');       // love → loveth
	stems.add(base + 'est');       // love → lovest
	
	// Handle words ending in 'e' (love → loving, not loveing)
	if (base.endsWith('e')) {
		const noE = base.slice(0, -1);
		stems.add(noE + 'ing');      // love → loving
		stems.add(noE + 'ed');       // love → loved
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
	}
	
	// Build pattern with word boundaries
	// Sort by length descending so longer matches are tried first
	const sortedStems = [...stems].sort((a, b) => b.length - a.length);
	const pattern = sortedStems.join('|');
	
	return new RegExp(`\\b(${pattern})\\b`, 'gi');
}
