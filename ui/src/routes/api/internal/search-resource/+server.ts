/**
 * Per-Resource Search Endpoint
 *
 * CPU-bound worker that processes a single resource:
 * 1. Gets file list (R2 cached - may skip ZIP entirely!)
 * 2. Filters files by extension/reference
 * 3. Gets indexed files with MiniSearch (R2-cached per-file - may skip ZIP!)
 * 4. Returns ranked hits
 *
 * KISS: One resource, one isolate
 * DRY: Uses ZipResourceFetcher2 for all caching (ZIP, files, file lists, AND indexes)
 * Performance: <100ms with all caches warm, sharing cache with all endpoints
 */

import { EdgeXRayTracer } from '$lib/../../../src/functions/edge-xray.js';
import { r2KeyFromUrl } from '$lib/../../../src/functions/r2-keys.js';
import { type SearchDocument } from '$lib/../../../src/services/SearchService.js';
import {
	ZipResourceFetcher2,
	type FileWithIndex
} from '$lib/../../../src/services/ZipResourceFetcher2.js';
import { logger } from '$lib/../../../src/utils/logger.js';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import MiniSearch from 'minisearch';

interface ResourceSearchRequest {
	resource: string;
	zipUrl: string;
	query: string;
	reference?: string;
	type: 'bible' | 'notes' | 'words' | 'academy' | 'questions' | 'obs';
	owner?: string;
}

/**
 * Parse ZIP URL to extract organization, repository, and ref
 * Handles formats like:
 * - https://git.door43.org/unfoldingWord/en_ult/archive/master.zip
 * - https://git.door43.org/unfoldingWord/en_ult/archive/v85.zip
 */
function parseZipUrl(zipUrl: string): { org: string; repo: string; ref: string } | null {
	// Match: /org/repo/archive/ref.zip or .tar.gz
	const match = zipUrl.match(
		/git\.door43\.org\/([^/]+)\/([^/]+)\/archive\/([^/.]+)\.(zip|tar\.gz)/i
	);
	if (match) {
		return {
			org: match[1],
			repo: match[2],
			ref: match[3]
		};
	}

	// Fallback: try to extract from any URL with /org/repo pattern
	const fallbackMatch = zipUrl.match(/\/([^/]+)\/([^/]+)\/archive\//);
	if (fallbackMatch) {
		return {
			org: fallbackMatch[1],
			repo: fallbackMatch[2],
			ref: 'master'
		};
	}

	return null;
}

/**
 * Book name to 3-letter code mapping
 */
const BOOK_CODES: Record<string, string> = {
	genesis: 'GEN',
	gen: 'GEN',
	exodus: 'EXO',
	exod: 'EXO',
	exo: 'EXO',
	leviticus: 'LEV',
	lev: 'LEV',
	numbers: 'NUM',
	num: 'NUM',
	deuteronomy: 'DEU',
	deut: 'DEU',
	deu: 'DEU',
	joshua: 'JOS',
	josh: 'JOS',
	jos: 'JOS',
	judges: 'JDG',
	judg: 'JDG',
	jdg: 'JDG',
	ruth: 'RUT',
	rut: 'RUT',
	'1samuel': '1SA',
	'1sam': '1SA',
	'1sa': '1SA',
	'2samuel': '2SA',
	'2sam': '2SA',
	'2sa': '2SA',
	'1kings': '1KI',
	'1kgs': '1KI',
	'1ki': '1KI',
	'2kings': '2KI',
	'2kgs': '2KI',
	'2ki': '2KI',
	'1chronicles': '1CH',
	'1chr': '1CH',
	'1ch': '1CH',
	'2chronicles': '2CH',
	'2chr': '2CH',
	'2ch': '2CH',
	ezra: 'EZR',
	ezr: 'EZR',
	nehemiah: 'NEH',
	neh: 'NEH',
	esther: 'EST',
	esth: 'EST',
	est: 'EST',
	job: 'JOB',
	psalms: 'PSA',
	psalm: 'PSA',
	psa: 'PSA',
	ps: 'PSA',
	proverbs: 'PRO',
	prov: 'PRO',
	pro: 'PRO',
	ecclesiastes: 'ECC',
	eccl: 'ECC',
	ecc: 'ECC',
	songofsolomon: 'SNG',
	song: 'SNG',
	sos: 'SNG',
	sng: 'SNG',
	isaiah: 'ISA',
	isa: 'ISA',
	jeremiah: 'JER',
	jer: 'JER',
	lamentations: 'LAM',
	lam: 'LAM',
	ezekiel: 'EZK',
	ezek: 'EZK',
	ezk: 'EZK',
	daniel: 'DAN',
	dan: 'DAN',
	hosea: 'HOS',
	hos: 'HOS',
	joel: 'JOL',
	joe: 'JOL',
	jol: 'JOL',
	amos: 'AMO',
	amo: 'AMO',
	obadiah: 'OBA',
	obad: 'OBA',
	oba: 'OBA',
	jonah: 'JON',
	jon: 'JON',
	micah: 'MIC',
	mic: 'MIC',
	nahum: 'NAM',
	nah: 'NAM',
	nam: 'NAM',
	habakkuk: 'HAB',
	hab: 'HAB',
	zephaniah: 'ZEP',
	zeph: 'ZEP',
	zep: 'ZEP',
	haggai: 'HAG',
	hag: 'HAG',
	zechariah: 'ZEC',
	zech: 'ZEC',
	zec: 'ZEC',
	malachi: 'MAL',
	mal: 'MAL',
	matthew: 'MAT',
	matt: 'MAT',
	mat: 'MAT',
	mark: 'MRK',
	mrk: 'MRK',
	luke: 'LUK',
	luk: 'LUK',
	john: 'JHN',
	jhn: 'JHN',
	acts: 'ACT',
	act: 'ACT',
	romans: 'ROM',
	rom: 'ROM',
	'1corinthians': '1CO',
	'1cor': '1CO',
	'1co': '1CO',
	'2corinthians': '2CO',
	'2cor': '2CO',
	'2co': '2CO',
	galatians: 'GAL',
	gal: 'GAL',
	ephesians: 'EPH',
	eph: 'EPH',
	philippians: 'PHP',
	phil: 'PHP',
	php: 'PHP',
	colossians: 'COL',
	col: 'COL',
	'1thessalonians': '1TH',
	'1thess': '1TH',
	'1th': '1TH',
	'2thessalonians': '2TH',
	'2thess': '2TH',
	'2th': '2TH',
	'1timothy': '1TI',
	'1tim': '1TI',
	'1ti': '1TI',
	'2timothy': '2TI',
	'2tim': '2TI',
	'2ti': '2TI',
	titus: 'TIT',
	tit: 'TIT',
	philemon: 'PHM',
	phlm: 'PHM',
	phm: 'PHM',
	hebrews: 'HEB',
	heb: 'HEB',
	james: 'JAS',
	jas: 'JAS',
	'1peter': '1PE',
	'1pet': '1PE',
	'1pe': '1PE',
	'2peter': '2PE',
	'2pet': '2PE',
	'2pe': '2PE',
	'1john': '1JN',
	'1jn': '1JN',
	'2john': '2JN',
	'2jn': '2JN',
	'3john': '3JN',
	'3jn': '3JN',
	jude: 'JUD',
	jud: 'JUD',
	revelation: 'REV',
	rev: 'REV'
};

/**
 * Get book code from reference
 */
function getBookCodeFromReference(reference: string): string | null {
	// Extract book name from reference (handles "1 John 3:16", "John 3:16", etc.)
	const match = reference.match(/^(\d?\s*[A-Za-z]+)/);
	if (!match) return null;

	// Normalize: remove spaces, lowercase
	const bookName = match[1].replace(/\s+/g, '').toLowerCase();
	return BOOK_CODES[bookName] || null;
}

/**
 * Determine file extensions to search based on resource type
 */
function getFileExtensions(type: string): string[] {
	switch (type) {
		case 'bible':
			return ['.usfm', '.usfm3'];
		case 'notes':
			return ['.tsv', '.md'];
		case 'words':
		case 'academy':
			return ['.md'];
		case 'questions':
			return ['.tsv', '.md'];
		case 'obs':
			return ['.md'];
		default:
			return ['.usfm', '.tsv', '.md'];
	}
}

/**
 * Priority books for broad searches (no reference provided)
 * These are commonly searched/referenced books
 */
const PRIORITY_BOOKS = [
	'GEN',
	'EXO',
	'PSA',
	'PRO',
	'ISA', // OT highlights
	'MAT',
	'MRK',
	'LUK',
	'JHN',
	'ACT', // Gospels + Acts
	'ROM',
	'GAL',
	'EPH',
	'PHP',
	'HEB', // Key epistles
	'JAS',
	'1PE',
	'1JN',
	'REV' // General epistles + Revelation
];

/**
 * Extract book code from file path
 */
function extractBookCode(path: string): string | null {
	// Match patterns like "44-JHN.usfm" or "01-GEN.tsv"
	const match = path.toUpperCase().match(/(\d{2,3})-([A-Z]{3})\./);
	if (match) return match[2];

	// Match patterns like "_JHN_" or "/JHN."
	const altMatch = path.toUpperCase().match(/[/_-]([A-Z]{3})[._/]/);
	if (altMatch) return altMatch[1];

	return null;
}

/**
 * Filter files by extension and optional reference
 */
function filterFiles(
	entries: Record<string, any>,
	extensions: string[],
	reference?: string,
	resourceType?: string
): string[] {
	const filtered: string[] = [];
	const priorityFiles: string[] = [];
	const otherFiles: string[] = [];

	// Get book code from reference if provided
	const targetBookCode = reference ? getBookCodeFromReference(reference) : null;

	// entries is an object from fflate.unzipSync
	for (const path of Object.keys(entries)) {
		// Skip directories
		if (path.endsWith('/')) {
			continue;
		}

		// Check extension
		const hasValidExt = extensions.some((ext) => path.toLowerCase().endsWith(ext));
		if (!hasValidExt) {
			continue;
		}

		// If we have a target book code, filter to just that book
		if (targetBookCode) {
			const pathUpper = path.toUpperCase();
			// Match patterns like "44-JHN.usfm" or "JHN.usfm" or "_JHN_" or "-JHN-"
			const hasTargetBook =
				pathUpper.includes(`-${targetBookCode}.`) ||
				pathUpper.includes(`-${targetBookCode}/`) ||
				pathUpper.includes(`/${targetBookCode}.`) ||
				pathUpper.includes(`_${targetBookCode}_`) ||
				pathUpper.includes(`_${targetBookCode}.`);

			if (!hasTargetBook) {
				continue;
			}
			filtered.push(path);
		} else {
			// No reference - categorize by priority for broad searches
			const bookCode = extractBookCode(path);
			if (bookCode && PRIORITY_BOOKS.includes(bookCode)) {
				priorityFiles.push(path);
			} else {
				otherFiles.push(path);
			}
		}
	}

	// If we had a reference, return filtered files
	if (targetBookCode) {
		return filtered.slice(0, 500);
	}

	// For broad searches, return ALL files (priority first, then others)
	// Caching handles performance - don't artificially limit results
	return [...priorityFiles, ...otherFiles];
}

/**
 * POST /internal/search-resource
 * Per-resource search worker
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	const startTime = Date.now();

	try {
		// Initialize R2 env from platform bindings (required for index caching)
		const r2 = (platform as any)?.env?.ZIP_FILES;
		const caches: CacheStorage | undefined = (platform as any)?.caches;
		if (r2 || caches) {
			const { initializeR2Env } = await import('$lib/../../../src/functions/r2-env.js');
			initializeR2Env(r2, caches);
			logger.debug('[Search:Resource] R2 env initialized', {
				hasBucket: !!r2,
				hasCaches: !!caches
			});
		}

		// Parse request
		const body: ResourceSearchRequest = await request.json();
		const { resource, zipUrl, query, reference, type, owner: _owner } = body;

		logger.info('[Search:Resource] Processing resource', {
			resource,
			type,
			query
		});

		// Step 1: Fetch ZIP using shared cache infrastructure
		// Parse ZIP URL to get org/repo/ref for consistent cache keys
		const parsed = parseZipUrl(zipUrl);
		if (!parsed) {
			throw new Error(`Invalid ZIP URL format: ${zipUrl}`);
		}

		// Use ZipResourceFetcher2 which shares cache with all other endpoints
		const tracer = new EdgeXRayTracer(`search-${Date.now()}`, 'search-resource');
		const zipFetcher = new ZipResourceFetcher2(tracer);

		// Generate zipCacheKey FIRST for R2 lookups
		const { key: zipCacheKey } = r2KeyFromUrl(zipUrl);

		// LAZY ZIP LOADING: Only fetch/unzip if caches miss
		let zipData: Uint8Array | null = null;
		let fetchTime = startTime;
		let unzipTime = startTime;
		let fileListFromCache = false;

		// Step 2: Get file list with caching (may skip ZIP entirely!)
		const fileListResult = await zipFetcher.getZipFileList(
			parsed.org,
			parsed.repo,
			parsed.ref,
			zipUrl,
			zipCacheKey
		);

		fileListFromCache = fileListResult.fromCache;
		if (fileListResult.zipData) {
			zipData = fileListResult.zipData; // Reuse ZIP if we had to unzip
		}

		// Filter to relevant files
		const extensions = getFileExtensions(type);

		// Convert file list to minimal entries for filterFiles (only need keys)
		const fileEntries: Record<string, Uint8Array> = {};
		for (const path of fileListResult.files) {
			fileEntries[path] = new Uint8Array(0); // Dummy - filterFiles only uses keys
		}
		const filePaths = filterFiles(fileEntries, extensions, reference, type);

		if (!fileListFromCache) {
			fetchTime = Date.now(); // Approximate - ZIP was fetched and unzipped
			unzipTime = Date.now();
		}
		const filterTime = Date.now();
		logger.debug('[Search:Resource] Files filtered', {
			resource,
			fileListFromCache,
			totalFiles: fileListResult.files.length,
			filteredFiles: filePaths.length,
			elapsed: filterTime - unzipTime
		});

		if (filePaths.length === 0) {
			return json({
				resource,
				hits: [],
				message: 'No matching files found in resource'
			});
		}

		// Step 3: Get indexed files with LAZY ZIP loading
		// If indexes are cached in R2, the ZIP won't be touched at all!
		const BATCH_SIZE = 10;
		const indexedFiles: (FileWithIndex | null)[] = [];
		let cacheHits = 0;
		let cacheBuilds = 0;
		let zipSkipped = fileListFromCache; // True if we got file list from cache

		// Lazy ZIP provider - reuses ZIP data if we already have it from file list
		const getZipData = async (): Promise<Uint8Array | null> => {
			if (zipData) return zipData;

			zipData = await zipFetcher.getOrDownloadZip(parsed.org, parsed.repo, parsed.ref, zipUrl);
			if (!zipData) {
				throw new Error(`Failed to get ZIP for ${resource} from ${zipUrl}`);
			}
			fetchTime = Date.now();
			logger.debug('[Search:Resource] ZIP fetched (on-demand for content)', {
				resource,
				bytes: zipData.byteLength,
				elapsed: fetchTime - startTime
			});
			return zipData;
		};

		for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
			const batch = filePaths.slice(i, i + BATCH_SIZE);
			const batchResults = await Promise.all(
				batch.map((filePath) =>
					zipFetcher.getIndexedFile(
						filePath,
						resource,
						zipCacheKey,
						{ buildIndex: true, resourceType: type === 'obs' ? 'bible' : type },
						// Lazy provider - returns ZIP data only if needed
						async () => {
							zipSkipped = false;
							return await getZipData();
						}
					)
				)
			);
			indexedFiles.push(...batchResults);
		}

		logger.debug('[Search:Resource] Index fetch complete', {
			resource,
			zipSkipped,
			message: zipSkipped
				? 'All indexes from cache - ZIP not needed for content!'
				: 'ZIP was used for some files'
		});

		// Count cache stats and collect documents
		const allDocuments: SearchDocument[] = [];
		let fileIndex = 0;
		for (const result of indexedFiles) {
			if (!result) continue;

			if (result.indexSource === 'cache') {
				cacheHits++;
			} else if (result.indexSource === 'built') {
				cacheBuilds++;
			}

			// Extract documents from the index to merge into master search
			if (result.index) {
				// Get all indexed document IDs
				const indexJson = result.index.toJSON() as any;
				if (indexJson.storedFields) {
					for (const [docId, storedFields] of Object.entries(indexJson.storedFields)) {
						const fields = storedFields as any;
						// Use unique ID: combine fileIndex with docId to avoid duplicates across files
						const uniqueId = `${fileIndex}-${docId}`;
						allDocuments.push({
							id: uniqueId,
							content: fields.content || '',
							path: fields.path || '',
							resource: fields.resource || resource,
							type: fields.type || type
						});
					}
				}
			}
			fileIndex++;
		}

		// Create master index from all documents
		const miniSearch = new MiniSearch<SearchDocument>({
			fields: ['content'],
			storeFields: ['path', 'resource', 'type', 'content'],
			searchOptions: {
				fuzzy: 0.2,
				prefix: true,
				boost: { content: 2 },
				combineWith: 'AND'
			}
		});

		if (allDocuments.length > 0) {
			miniSearch.addAll(allDocuments);
		}

		const indexTime = Date.now();
		logger.info('[Search:Resource] Per-file indexes loaded/built', {
			resource,
			fileCount: filePaths.length,
			documentCount: allDocuments.length,
			cacheHits,
			cacheBuilds,
			elapsed: indexTime - filterTime
		});

		// Step 5: Search using miniSearch directly
		const rawResults = miniSearch.search(query, {
			fuzzy: 0.2,
			prefix: true,
			boost: { content: 2 }
		});

		// Transform and limit results
		const maxResults = 50;
		const contextLength = 150;
		const results = rawResults.slice(0, maxResults).map((result: any) => {
			const content = result.content || '';
			// Extract preview around query terms
			let preview = '';
			const queryTerms = query
				.toLowerCase()
				.split(/\s+/)
				.filter((t: string) => t.length > 2);
			let matchIndex = -1;
			for (const term of queryTerms) {
				const idx = content.toLowerCase().indexOf(term);
				if (idx !== -1) {
					matchIndex = idx;
					break;
				}
			}
			if (matchIndex !== -1) {
				const start = Math.max(0, matchIndex - contextLength / 2);
				const end = Math.min(content.length, matchIndex + contextLength / 2);
				preview =
					(start > 0 ? '...' : '') +
					content.substring(start, end).replace(/\s+/g, ' ') +
					(end < content.length ? '...' : '');
			} else {
				preview =
					content.substring(0, contextLength).replace(/\s+/g, ' ') +
					(content.length > contextLength ? '...' : '');
			}

			return {
				id: result.id,
				score: result.score,
				path: result.path || '',
				resource: result.resource || resource,
				type: result.type || type,
				preview,
				match: {
					terms: result.terms || []
				}
			};
		});

		const searchTime = Date.now();
		logger.info('[Search:Resource] Search completed', {
			query,
			resultsCount: results.length,
			elapsed: searchTime - indexTime
		});

		// Return results
		const indexSource = cacheHits > 0 ? 'r2-cache' : 'built';
		const response = {
			resource,
			type,
			query,
			took_ms: searchTime - startTime,
			hits: results,
			stats: {
				zipBytes: zipData?.byteLength ?? 0,
				totalFiles: fileListResult.files.length,
				filteredFiles: filePaths.length,
				indexedDocs: allDocuments.length,
				indexSource,
				zipSkipped,
				fileListFromCache,
				cacheStats: {
					hits: cacheHits,
					builds: cacheBuilds
				},
				timing: {
					fetch: fetchTime - startTime,
					unzip: unzipTime - fetchTime,
					filter: filterTime - unzipTime,
					index: indexTime - filterTime,
					search: searchTime - indexTime
				}
			}
		};

		logger.info('[Search:Resource] Resource search completed', {
			resource,
			took_ms: response.took_ms,
			hitCount: results.length,
			indexSource,
			cacheHits,
			cacheBuilds
		});

		return json(response);
	} catch (error) {
		logger.error('[Search:Resource] Resource search failed', {
			error: error instanceof Error ? error.message : String(error)
		});

		return json(
			{
				error: 'Resource search failed',
				message: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
