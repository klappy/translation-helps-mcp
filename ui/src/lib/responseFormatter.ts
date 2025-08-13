/**
 * Response Formatter Utility
 *
 * Transforms API responses into different formats (JSON, Markdown, Text)
 * optimized for LLM consumption and human readability.
 */

export type ResponseFormat = 'json' | 'md' | 'text';

interface FormatterOptions {
	format: ResponseFormat;
	includeMetadata?: boolean;
	verbose?: boolean;
}

/**
 * Format scripture response
 */
export function formatScriptureResponse(data: any, options: FormatterOptions): string | object {
	const { format, includeMetadata = true } = options;

	if (format === 'json') {
		return data; // Return as-is for JSON
	}

	const scripture = Array.isArray(data.scripture) ? data.scripture : [data.scripture];

	if (format === 'md') {
		let markdown = '';

		// Add header
		if (includeMetadata && data.citation) {
			markdown += `# ${typeof data.citation === 'string' ? data.citation : data.citation.reference || 'Scripture'}\n\n`;
		}

		// Add metadata section
		if (includeMetadata && data.metadata) {
			markdown += `## Metadata\n\n`;
			markdown += `- **Language**: ${data.language || data.metadata.language}\n`;
			markdown += `- **Organization**: ${data.organization || data.metadata.organization}\n`;
			if (data.metadata.resources?.length) {
				markdown += `- **Resources**: ${data.metadata.resources.join(', ')}\n`;
			}
			if (data.metadata.license) {
				markdown += `- **License**: ${data.metadata.license}\n`;
			}
			if (data.metadata.copyright) {
				markdown += `- **Copyright**: ${data.metadata.copyright}\n`;
			}
			if (data.metadata.publisher) {
				markdown += `- **Publisher**: ${data.metadata.publisher}\n`;
			}
			if (data.metadata.contributors?.length) {
				markdown += `- **Contributors**: ${data.metadata.contributors.join(', ')}\n`;
			}
			if (data.metadata.checkingLevel) {
				markdown += `- **Checking Level**: ${data.metadata.checkingLevel}\n`;
			}
			markdown += '\n';
		}

		// Add scripture content
		markdown += `## Scripture Text\n\n`;

		for (const verse of scripture) {
			if (verse.reference) {
				markdown += `### ${verse.reference}\n\n`;
			}
			if (verse.resource) {
				markdown += `**${verse.resource.toUpperCase()}**: `;
			}
			markdown += `${verse.text}\n\n`;
		}

		return markdown;
	}

	if (format === 'text') {
		let text = '';

		// Add header
		if (includeMetadata && data.citation) {
			const citation = typeof data.citation === 'string' ? data.citation : data.citation.reference;
			text += `${citation}\n${'='.repeat(citation.length)}\n\n`;
		}

		// Add scripture content
		for (const verse of scripture) {
			if (verse.reference) {
				text += `${verse.reference}: `;
			}
			text += `${verse.text}\n`;
			if (verse.resource) {
				text += `(${verse.resource.toUpperCase()})\n`;
			}
			text += '\n';
		}

		// Add metadata footer
		if (includeMetadata && data.metadata) {
			text += '\n---\n';
			text += `Language: ${data.language || data.metadata.language}\n`;
			text += `Organization: ${data.organization || data.metadata.organization}\n`;
		}

		return text;
	}

	return data; // Fallback to JSON
}

/**
 * Format translation helps response (notes, questions, words)
 */
export function formatTranslationHelpsResponse(
	data: any,
	options: FormatterOptions
): string | object {
	const { format, includeMetadata = true } = options;

	if (format === 'json') {
		return data; // Return as-is for JSON
	}

	const items = data.items || data.helps || [];
	const resourceType = data.metadata?.resourceType || 'helps';

	if (format === 'md') {
		let markdown = '';

		// Add header
		markdown += `# Translation ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}\n\n`;

		if (includeMetadata && data.reference) {
			markdown += `**Reference**: ${data.reference}\n\n`;
		}

		// Add items
		items.forEach((item: any, index: number) => {
			// Determine title based on item type
			let title = item.title || item.question || item.word;
			if (!title && item.noteType) {
				title = `Note (${item.noteType})`;
			}
			if (!title) {
				title = `Item ${index + 1}`;
			}

			markdown += `## ${index + 1}. ${title}\n\n`;

			// Main content
			const content = item.content || item.answer || item.definition || item.text;
			if (content) {
				markdown += `${content}\n\n`;
			}

			// Additional fields for translation notes
			if (item.reference && item.reference !== data.reference) {
				markdown += `**Reference**: ${item.reference}\n\n`;
			}

			if (item.supportReference) {
				markdown += `**Support Reference**: ${item.supportReference}\n\n`;
			}

			if (item.examples?.length) {
				markdown += `### Examples\n\n`;
				item.examples.forEach((example: string) => {
					markdown += `- ${example}\n`;
				});
				markdown += '\n';
			}

			if (item.references?.length) {
				markdown += `### References\n\n`;
				item.references.forEach((ref: string) => {
					markdown += `- ${ref}\n`;
				});
				markdown += '\n';
			}
		});

		return markdown;
	}

	if (format === 'text') {
		let text = '';

		// Add header
		text += `TRANSLATION ${resourceType.toUpperCase()}\n`;
		text += `${'='.repeat(20)}\n\n`;

		if (includeMetadata && data.reference) {
			text += `Reference: ${data.reference}\n\n`;
		}

		// Add items
		items.forEach((item: any, index: number) => {
			// Determine title based on item type
			let title = item.title || item.question || item.word;
			if (!title && item.noteType) {
				title = `Note (${item.noteType})`;
			}
			if (!title) {
				title = `Item ${index + 1}`;
			}

			text += `${index + 1}. ${title}\n`;
			text += `${'-'.repeat(40)}\n`;

			// Main content
			const content = item.content || item.answer || item.definition || item.text;
			if (content) {
				text += `${content}\n`;
			}

			// Additional fields for translation notes
			if (item.supportReference) {
				text += `Support: ${item.supportReference}\n`;
			}

			if (item.examples?.length) {
				text += `\nExamples:\n`;
				item.examples.forEach((example: string) => {
					text += `  * ${example}\n`;
				});
			}

			text += '\n';
		});

		return text;
	}

	return data; // Fallback to JSON
}

/**
 * Format list response (languages, books, resources)
 */
export function formatListResponse(data: any, options: FormatterOptions): string | object {
	const { format, includeMetadata = true } = options;

	if (format === 'json') {
		return data; // Return as-is for JSON
	}

	const items = data.items || [];

	if (format === 'md') {
		let markdown = '';

		// Add header based on content
		const title = data.metadata?.resource
			? `Available ${data.metadata.resource}`
			: 'Available Items';
		markdown += `# ${title}\n\n`;

		if (includeMetadata && data.metadata) {
			markdown += `## Summary\n\n`;
			markdown += `- **Total Count**: ${data.metadata.totalCount || items.length}\n`;
			if (data.metadata.language) {
				markdown += `- **Language**: ${data.metadata.language}\n`;
			}
			if (data.metadata.filteredBy) {
				markdown += `- **Filtered By**: ${JSON.stringify(data.metadata.filteredBy)}\n`;
			}
			markdown += '\n';
		}

		// Add items as table for structured data
		if (items.length > 0 && typeof items[0] === 'object') {
			const keys = Object.keys(items[0]);
			markdown += `## Items\n\n`;
			markdown += `| ${keys.join(' | ')} |\n`;
			markdown += `| ${keys.map(() => '---').join(' | ')} |\n`;

			items.forEach((item: any) => {
				const values = keys.map((key) => {
					const value = item[key];
					return typeof value === 'object' ? JSON.stringify(value) : value;
				});
				markdown += `| ${values.join(' | ')} |\n`;
			});
		} else {
			// Simple list
			markdown += `## Items\n\n`;
			items.forEach((item: any) => {
				markdown += `- ${typeof item === 'object' ? JSON.stringify(item) : item}\n`;
			});
		}

		return markdown;
	}

	if (format === 'text') {
		let text = '';

		// Add header
		const title = data.metadata?.resource
			? `AVAILABLE ${data.metadata.resource.toUpperCase()}`
			: 'AVAILABLE ITEMS';
		text += `${title}\n`;
		text += `${'='.repeat(title.length)}\n\n`;

		if (includeMetadata && data.metadata) {
			text += `Total: ${data.metadata.totalCount || items.length}\n`;
			if (data.metadata.language) {
				text += `Language: ${data.metadata.language}\n`;
			}
			text += '\n';
		}

		// Add items
		items.forEach((item: any, index: number) => {
			if (typeof item === 'object') {
				text += `${index + 1}. `;
				const mainValue = item.name || item.title || item.code || item.id;
				text += `${mainValue}`;

				// Add key details
				const details = [];
				if (item.code && item.code !== mainValue) details.push(`Code: ${item.code}`);
				if (item.testament) details.push(`Testament: ${item.testament.toUpperCase()}`);
				if (item.direction) details.push(`Direction: ${item.direction.toUpperCase()}`);
				if (item.chapters) details.push(`Chapters: ${item.chapters}`);

				if (details.length > 0) {
					text += ` (${details.join(', ')})`;
				}
				text += '\n';
			} else {
				text += `${index + 1}. ${item}\n`;
			}
		});

		return text;
	}

	return data; // Fallback to JSON
}

/**
 * Main formatter function that delegates to specific formatters
 */
export function formatResponse(data: any, options: FormatterOptions): string | object {
	// Determine response type and delegate
	if (data.scripture || (Array.isArray(data) && data[0]?.text)) {
		return formatScriptureResponse(data, options);
	}

	// Check for translation helps (notes, questions, words)
	if (data.items && data.metadata?.resourceType) {
		return formatTranslationHelpsResponse(data, options);
	}

	// Check for translation helps by content structure
	if (
		data.items &&
		data.items[0] &&
		('noteType' in data.items[0] || // Translation notes
			'question' in data.items[0] || // Translation questions
			'definition' in data.items[0] || // Translation words
			'content' in data.items[0]) // Generic helps
	) {
		return formatTranslationHelpsResponse(data, options);
	}

	if (data.items) {
		return formatListResponse(data, options);
	}

	// Generic formatting for unknown types
	if (options.format === 'md') {
		return '# Response\n\n```json\n' + JSON.stringify(data, null, 2) + '\n```';
	}

	if (options.format === 'text') {
		return JSON.stringify(data, null, 2);
	}

	return data;
}
