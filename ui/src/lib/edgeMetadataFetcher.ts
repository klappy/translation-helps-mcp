/**
 * Edge-Compatible Metadata Fetcher
 *
 * Fetches real metadata from DCS including licenses, copyrights,
 * contributors, and other resource information.
 */

import { fetchFromDCS } from './dataFetchers.js';
import { edgeLogger as logger } from './edgeLogger.js';

export interface ResourceMetadata {
	title: string;
	subject: string;
	description?: string;
	license: string;
	copyright?: string;
	contributors?: string[];
	creator?: string;
	publisher?: string;
	issued?: string;
	modified?: string;
	language: {
		code: string;
		name: string;
		direction: 'ltr' | 'rtl';
	};
	version?: string;
	checkingLevel?: string;
	ingredients?: any[];
}

/**
 * Fetch metadata for a specific resource
 */
export async function fetchResourceMetadata(
	owner: string,
	repo: string,
	tag?: string
): Promise<ResourceMetadata | null> {
	logger.info('Fetching resource metadata', { owner, repo, tag });

	try {
		// First try to get repository metadata
		const repoUrl = `/api/v1/repos/${owner}/${repo}`;
		const repoData = await fetchFromDCS(repoUrl);

		// Get the latest release or tag
		let releaseData = null;
		if (tag) {
			const tagUrl = `/api/v1/repos/${owner}/${repo}/releases/tags/${tag}`;
			try {
				releaseData = await fetchFromDCS(tagUrl);
			} catch (_error) {
				logger.warn(`Tag ${tag} not found, using latest release`);
			}
		}

		if (!releaseData) {
			// Get latest release
			const releasesUrl = `/api/v1/repos/${owner}/${repo}/releases?limit=1`;
			const releases = await fetchFromDCS(releasesUrl);
			if (releases && releases.length > 0) {
				releaseData = releases[0];
			}
		}

		// Get manifest.yaml content
		let manifest = null;
		const manifestUrl = `/api/v1/repos/${owner}/${repo}/contents/manifest.yaml`;
		try {
			const manifestFile = await fetchFromDCS(manifestUrl);
			if (manifestFile && manifestFile.content) {
				// Decode base64 content
				const content = atob(manifestFile.content);
				manifest = parseYAML(content);
			}
		} catch (_error) {
			logger.warn('No manifest.yaml found');
		}

		// Build metadata object
		const metadata: ResourceMetadata = {
			title: manifest?.dublin_core?.title || repoData.name || repo,
			subject: manifest?.dublin_core?.subject || repoData.topic || 'Bible',
			description: manifest?.dublin_core?.description || repoData.description,
			license: manifest?.dublin_core?.rights || 'CC BY-SA 4.0',
			copyright: manifest?.dublin_core?.copyright,
			contributors: manifest?.dublin_core?.contributor
				? Array.isArray(manifest.dublin_core.contributor)
					? manifest.dublin_core.contributor
					: [manifest.dublin_core.contributor]
				: [],
			creator: manifest?.dublin_core?.creator || owner,
			publisher: manifest?.dublin_core?.publisher || 'unfoldingWord',
			issued: manifest?.dublin_core?.issued || releaseData?.created_at,
			modified: manifest?.dublin_core?.modified || repoData.updated_at,
			language: {
				code: manifest?.dublin_core?.language?.identifier || repoData.language || 'en',
				name: manifest?.dublin_core?.language?.title || 'English',
				direction: manifest?.dublin_core?.language?.direction || 'ltr'
			},
			version: manifest?.dublin_core?.version || releaseData?.tag_name || '1',
			checkingLevel: manifest?.checking?.checking_level,
			ingredients: manifest?.projects?.[0]?.ingredients || []
		};

		logger.info('Fetched metadata successfully', {
			title: metadata.title,
			license: metadata.license
		});

		return metadata;
	} catch (error) {
		logger.error('Failed to fetch metadata', { error });
		return null;
	}
}

/**
 * Simple YAML parser for manifest files
 * This is a very basic implementation - in production you'd use a proper YAML library
 */
function parseYAML(content: string): any {
	const result: any = {};
	const lines = content.split('\n');
	let currentObject = result;
	const stack: any[] = [result];
	const indentStack: number[] = [0];

	for (const line of lines) {
		// Skip empty lines and comments
		if (!line.trim() || line.trim().startsWith('#')) continue;

		// Calculate indent level
		const indent = line.search(/\S/);
		const trimmed = line.trim();

		// Handle key-value pairs
		const colonIndex = trimmed.indexOf(':');
		if (colonIndex > 0) {
			const key = trimmed.substring(0, colonIndex).trim();
			const value = trimmed.substring(colonIndex + 1).trim();

			// Adjust stack based on indentation
			while (indentStack.length > 1 && indent <= indentStack[indentStack.length - 1]) {
				stack.pop();
				indentStack.pop();
			}

			currentObject = stack[stack.length - 1];

			if (value) {
				// Simple value
				currentObject[key] = value.replace(/^["']|["']$/g, ''); // Remove quotes
			} else {
				// New object
				currentObject[key] = {};
				stack.push(currentObject[key]);
				indentStack.push(indent);
			}
		} else if (trimmed.startsWith('- ')) {
			// Array item
			const value = trimmed.substring(2).trim();
			const parent = stack[stack.length - 2];
			const lastKey = Object.keys(parent).pop();
			if (lastKey && !Array.isArray(parent[lastKey])) {
				parent[lastKey] = [];
			}
			if (lastKey && Array.isArray(parent[lastKey])) {
				parent[lastKey].push(value.replace(/^["']|["']$/g, ''));
			}
		}
	}

	return result;
}

/**
 * Get catalog entry with full metadata
 */
export async function fetchCatalogMetadata(
	language: string,
	resource: string,
	organization: string = 'unfoldingword'
): Promise<ResourceMetadata | null> {
	logger.info('Fetching catalog metadata', { language, resource, organization });

	try {
		// Search catalog for the resource
		const searchUrl = `/api/v1/catalog/search?lang=${language}&owner=${organization}&subject=${resource}&limit=1`;
		const searchData = await fetchFromDCS(searchUrl);

		if (!searchData.data || searchData.data.length === 0) {
			logger.warn('No catalog entry found');
			return null;
		}

		const catalogEntry = searchData.data[0];

		// Build metadata from catalog entry
		const metadata: ResourceMetadata = {
			title: catalogEntry.title,
			subject: catalogEntry.subject,
			description: catalogEntry.description,
			license: catalogEntry.rights || 'CC BY-SA 4.0',
			contributors: catalogEntry.contributor
				? Array.isArray(catalogEntry.contributor)
					? catalogEntry.contributor
					: [catalogEntry.contributor]
				: [],
			creator: catalogEntry.creator || organization,
			publisher: catalogEntry.publisher || 'unfoldingWord',
			issued: catalogEntry.issued,
			modified: catalogEntry.modified,
			language: {
				code: catalogEntry.language || language,
				name: catalogEntry.language_title || 'Unknown',
				direction: catalogEntry.language_direction || 'ltr'
			},
			version: catalogEntry.version,
			checkingLevel: catalogEntry.checking_level,
			ingredients: catalogEntry.ingredients || []
		};

		return metadata;
	} catch (error) {
		logger.error('Failed to fetch catalog metadata', { error });
		return null;
	}
}
