/**
 * Robust Data Extractor
 * A utility to safely extract data from various API responses with multiple fallback strategies
 */

export class RobustDataExtractor {
	/**
	 * Extract value from object with case-insensitive key matching
	 */
	static getFieldCaseInsensitive(obj: any, ...fieldNames: string[]): any {
		if (!obj || typeof obj !== 'object') return null;

		for (const fieldName of fieldNames) {
			// Try exact match first
			if (obj[fieldName] !== undefined) return obj[fieldName];

			// Try case-insensitive match
			const lowerFieldName = fieldName.toLowerCase();
			for (const key in obj) {
				if (key.toLowerCase() === lowerFieldName) {
					return obj[key];
				}
			}
		}

		return null;
	}

	/**
	 * Extract nested value with dot notation support
	 */
	static getNestedField(obj: any, path: string): any {
		const parts = path.split('.');
		let current = obj;

		for (const part of parts) {
			current = this.getFieldCaseInsensitive(current, part);
			if (current === null || current === undefined) return null;
		}

		return current;
	}

	/**
	 * Extract array from various response formats
	 */
	static extractArray(data: any, ...possiblePaths: string[]): any[] {
		// Direct array
		if (Array.isArray(data)) return data;

		// Try each possible path
		for (const path of possiblePaths) {
			const value = this.getNestedField(data, path);
			if (Array.isArray(value)) return value;
		}

		// Check common wrapper patterns
		if (data?.data && Array.isArray(data.data)) return data.data;
		if (data?.items && Array.isArray(data.items)) return data.items;
		if (data?.results && Array.isArray(data.results)) return data.results;
		if (data?.content && Array.isArray(data.content)) return data.content;

		return [];
	}

	/**
	 * Extract text content from various formats
	 */
	static extractText(obj: any, ...fieldNames: string[]): string {
		// Direct string
		if (typeof obj === 'string') return obj;

		// Try field names
		const defaultFields = ['content', 'text', 'message', 'value', 'data', 'body', 'description'];
		const allFields = [...fieldNames, ...defaultFields];

		for (const field of allFields) {
			const value = this.getFieldCaseInsensitive(obj, field);
			if (typeof value === 'string' && value.trim()) return value;
		}

		// Try nested common patterns
		if (obj?.data?.content) return String(obj.data.content);
		if (obj?.content?.[0]?.text) return String(obj.content[0].text);

		return '';
	}

	/**
	 * Extract and convert RC links from content
	 */
	static extractRCLinks(content: string): {
		text: string;
		links: Array<{ original: string; articleId: string; display: string }>;
	} {
		const links: Array<{ original: string; articleId: string; display: string }> = [];

		// Pattern to match rc:// links in various formats
		const patterns = [
			/\[\[rc:\/\/\*?\/ta\/man\/([^\]]+)\]\]/g, // [[rc://*/ta/man/translate/figs-metaphor]]
			/\(rc:\/\/\*?\/ta\/man\/([^\)]+)\)/g, // (rc://*/ta/man/translate/figs-metaphor)
			/rc:\/\/\*?\/ta\/man\/(\S+)/g, // rc://*/ta/man/translate/figs-metaphor
			/\[([^\]]+)\]\(rc:\/\/[^\)]+\/([^\)]+)\)/g // [text](rc://*/ta/man/translate/figs-metaphor)
		];

		let processedContent = content;

		for (const pattern of patterns) {
			processedContent = processedContent.replace(pattern, (match, ...groups) => {
				const articleId = groups[groups.length - 2] || groups[0];
				const displayText =
					groups.length > 2
						? groups[0]
						: articleId.split('/').pop()?.replace(/-/g, ' ') || articleId;

				links.push({
					original: match,
					articleId: articleId.replace(/^translate\//, ''),
					display: displayText
				});

				// Return markdown link format
				return `[${displayText}](rc://${articleId})`;
			});
		}

		return { text: processedContent, links };
	}

	/**
	 * Validate and sanitize data
	 */
	static validate<T>(data: any, schema: { [K in keyof T]: (value: any) => boolean }): T | null {
		const result: any = {};

		for (const [key, validator] of Object.entries(schema)) {
			const value = this.getFieldCaseInsensitive(data, key as string);
			if (!validator(value)) return null;
			result[key] = value;
		}

		return result as T;
	}

	/**
	 * Merge multiple data sources with priority
	 */
	static merge(...sources: any[]): any {
		const result: any = {};

		for (const source of sources) {
			if (!source || typeof source !== 'object') continue;

			for (const key in source) {
				if (source[key] !== null && source[key] !== undefined) {
					if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
						result[key] = this.merge(result[key] || {}, source[key]);
					} else {
						result[key] = source[key];
					}
				}
			}
		}

		return result;
	}
}
