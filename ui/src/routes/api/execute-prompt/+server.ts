import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { EdgeXRayTracer } from '../../../../../src/functions/edge-xray.js';

export const POST: RequestHandler = async ({ request, fetch: eventFetch }) => {
	const startTime = Date.now();
	const { promptName, parameters } = await request.json();
	const { reference, language = 'en' } = parameters;

	// Create X-Ray tracer for this prompt execution
	const tracer = new EdgeXRayTracer(`execute-prompt:${promptName}`, `/api/execute-prompt`);

	// Create a tracked fetch wrapper that uses event.fetch (supports relative URLs)
	// This wrapper extracts X-Ray traces from responses and merges them into the main tracer
	const trackedFetchCall = async (url: string) => {
		const fetchStartTime =
			typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

		try {
			const response = await eventFetch(url);
			const now =
				typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
			const duration = Math.max(1, Math.round(now - fetchStartTime));

			// Extract X-Ray trace from response header if available
			const xrayTraceHeader = response.headers.get('X-XRay-Trace');
			if (xrayTraceHeader) {
				try {
					const cleaned = xrayTraceHeader.replace(/\s+/g, '');
					const nestedTrace = JSON.parse(atob(cleaned));

					// Merge only internal cache calls from the nested trace
					// HTTP calls to /api/fetch-* endpoints are just transport, not cache operations
					if (nestedTrace.apiCalls && Array.isArray(nestedTrace.apiCalls)) {
						for (const apiCall of nestedTrace.apiCalls) {
							// Only merge internal:// cache calls
							// Skip HTTP calls to /api/ endpoints as they're not cache operations
							if (apiCall.url && apiCall.url.startsWith('internal://')) {
								tracer.addApiCall({
									url: apiCall.url,
									duration: apiCall.duration || 0,
									status: apiCall.status || 200,
									size: apiCall.size || 0,
									cached: apiCall.cached === true // Only true if explicitly true
								});
							}
						}
					}
				} catch (e) {
					// If parsing fails, just log and continue
					console.warn('[execute-prompt] Failed to parse X-Ray trace from response:', e);
				}
			} else {
				// No X-Ray trace in response - add the HTTP call itself
				// Extract cache status from response headers
				const cacheStatus = response.headers.get('X-Cache-Status')?.toLowerCase();
				const isCached = cacheStatus === 'hit';

				tracer.addApiCall({
					url,
					duration,
					status: response.status,
					size: parseInt(response.headers.get('content-length') || '0', 10),
					cached: isCached
				});
			}

			return response;
		} catch (error) {
			const now =
				typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
			const duration = Math.max(1, Math.round(now - fetchStartTime));

			tracer.addApiCall({
				url,
				duration,
				status: 0, // Network error
				size: 0,
				cached: false
			});

			throw error;
		}
	};

	console.log(
		`[execute-prompt] Starting prompt execution: ${promptName} for ${reference} (${language})`
	);

	try {
		let result;
		switch (promptName) {
			case 'translation-helps-for-passage':
				console.log('[execute-prompt] Executing translation-helps-for-passage');
				result = await executeTranslationHelpsPrompt(reference, language, trackedFetchCall, tracer);
				break;

			case 'get-translation-words-for-passage':
				console.log('[execute-prompt] Executing get-translation-words-for-passage');
				result = await executeWordsPrompt(reference, language, trackedFetchCall, tracer);
				break;

			case 'get-translation-academy-for-passage':
				console.log('[execute-prompt] Executing get-translation-academy-for-passage');
				result = await executeAcademyPrompt(reference, language, trackedFetchCall, tracer);
				break;

			default:
				console.error('[execute-prompt] Unknown prompt:', promptName);
				return json({ error: 'Unknown prompt' }, { status: 400 });
		}

		// Trace is finalized when getTrace() is called

		// Add response time header
		const responseTime = Date.now() - startTime;
		// Extract data from Response if needed, otherwise use result directly
		let data = result;
		if (result instanceof Response) {
			data = await result.json();
		}

		// Build trace data for headers
		const traceData = tracer.getTrace();
		const headers: Record<string, string> = {
			'X-Response-Time': `${responseTime}ms`
		};

		// Add X-Ray trace headers if available
		if (traceData) {
			// Calculate cache status based on internal cache calls only
			const apiCalls = traceData.apiCalls || [];
			const internalCalls = apiCalls.filter((call: any) => call.url?.startsWith('internal://'));

			// Calculate cache stats for internal calls only
			const internalHits = internalCalls.filter((call: any) => call.cached).length;
			const internalMisses = internalCalls.filter((call: any) => call.cached === false).length;
			const totalInternal = internalCalls.length;

			// Recalculate cacheStats to only include internal calls
			const recalculatedCacheStats = {
				hits: internalHits,
				misses: internalMisses,
				total: totalInternal
			};

			// Update traceData with recalculated cache stats
			const updatedTraceData = {
				...traceData,
				cacheStats: recalculatedCacheStats
			};

			let cacheStatus = 'miss';
			if (totalInternal === 0) {
				// No internal cache calls - check overall stats
				if (recalculatedCacheStats.hits > 0 && recalculatedCacheStats.misses === 0) {
					cacheStatus = 'hit';
				} else if (recalculatedCacheStats.hits > 0 && recalculatedCacheStats.misses > 0) {
					cacheStatus = 'partial';
				}
			} else if (internalHits > 0 && internalMisses === 0) {
				// All internal cache calls were hits
				cacheStatus = 'hit';
			} else if (internalHits > 0 && internalMisses > 0) {
				// Some internal cache hits, some misses
				cacheStatus = 'partial';
			} else if (internalHits === 0 && totalInternal > 0) {
				// All internal cache calls were misses
				cacheStatus = 'miss';
			}

			headers['X-Cache-Status'] = cacheStatus;
			headers['X-XRay-Trace'] = btoa(JSON.stringify(updatedTraceData));
			if (traceData.traceId) {
				headers['X-Trace-Id'] = traceData.traceId;
			}
		}

		// Create new response with headers
		return json(data, { headers });
	} catch (error) {
		console.error('[execute-prompt] Prompt execution error:', error);
		const responseTime = Date.now() - startTime;

		const headers: Record<string, string> = {
			'X-Response-Time': `${responseTime}ms`
		};

		// Add trace even on error
		const traceData = tracer.getTrace();
		if (traceData) {
			// Recalculate cacheStats to only include internal calls
			const apiCalls = traceData.apiCalls || [];
			const internalCalls = apiCalls.filter((call: any) => call.url?.startsWith('internal://'));
			const internalHits = internalCalls.filter((call: any) => call.cached).length;
			const internalMisses = internalCalls.filter((call: any) => call.cached === false).length;
			const totalInternal = internalCalls.length;

			const updatedTraceData = {
				...traceData,
				cacheStats: {
					hits: internalHits,
					misses: internalMisses,
					total: totalInternal
				}
			};

			headers['X-XRay-Trace'] = btoa(JSON.stringify(updatedTraceData));
			if (traceData.traceId) {
				headers['X-Trace-Id'] = traceData.traceId;
			}
		}

		return json(
			{
				error: 'Failed to execute prompt',
				message: error instanceof Error ? error.message : String(error)
			},
			{
				status: 500,
				headers
			}
		);
	}
};

async function executeTranslationHelpsPrompt(
	reference: string,
	language: string,
	trackedFetchCall: (url: string) => Promise<Response>,
	tracer: EdgeXRayTracer
) {
	const results: any = {
		scripture: null,
		questions: null,
		words: [],
		notes: null,
		academyArticles: []
	};

	// Step 1: Fetch scripture
	try {
		const scriptureRes = await trackedFetchCall(
			`/api/fetch-scripture?reference=${encodeURIComponent(reference)}&language=${language}`
		);
		if (scriptureRes.ok) {
			const scriptureData = await scriptureRes.json();
			console.log('Scripture response keys:', Object.keys(scriptureData));

			// Extract the actual verse text from the response
			// Structure is: { scripture: [{text, translation}] }
			let text = '';
			if (scriptureData.scripture && Array.isArray(scriptureData.scripture)) {
				console.log(`Found ${scriptureData.scripture.length} translations`);
				if (scriptureData.scripture.length > 0) {
					text = scriptureData.scripture[0].text;
				}
			} else if (scriptureData.versions) {
				const versions = Object.values(scriptureData.versions);
				if (versions.length > 0) {
					const firstVersion: any = versions[0];
					if (firstVersion.verses && firstVersion.verses.length > 0) {
						text = firstVersion.verses.map((v: any) => v.text).join(' ');
					}
				}
			}
			console.log(`Extracted scripture text: "${text.substring(0, 100)}..."`);
			results.scripture = { text };
		}
	} catch (e) {
		console.error('Failed to fetch scripture:', e);
	}

	// Step 2: Fetch questions
	try {
		const questionsRes = await trackedFetchCall(
			`/api/fetch-translation-questions?reference=${encodeURIComponent(reference)}&language=${language}`
		);
		if (questionsRes.ok) {
			const questionsData = await questionsRes.json();
			results.questions = {
				...questionsData,
				count: questionsData.items?.length || questionsData.metadata?.totalCount || 0
			};
		}
	} catch (e) {
		console.error('Failed to fetch questions:', e);
	}

	// Step 3: Fetch word links
	let wordLinks: any[] = [];
	try {
		const linksRes = await trackedFetchCall(
			`/api/fetch-translation-word-links?reference=${encodeURIComponent(reference)}&language=${language}`
		);
		if (linksRes.ok) {
			const linksData = await linksRes.json();
			wordLinks = linksData.translationWordLinks || linksData.items || [];
			console.log(`Found ${wordLinks.length} word links for ${reference}`);
		}
	} catch (e) {
		console.error('Failed to fetch word links:', e);
	}

	// Step 4: Fetch word articles for each term (extract titles)
	console.log(`Fetching word articles for ${wordLinks.length} terms (limiting to 10)`);
	for (const link of wordLinks.slice(0, 10)) {
		// Limit to first 10
		try {
			// Log the word link structure
			console.log(`Word link for ${link.term}:`, {
				term: link.term,
				path: link.path,
				rcLink: link.rcLink,
				category: link.category
			});

			// Use the path parameter from the link (it has category and .md extension)
			const url = `/api/fetch-translation-word?path=${encodeURIComponent(link.path)}&language=${language}`;
			console.log(`Fetching word article: ${url}`);
			const wordRes = await trackedFetchCall(url);
			if (wordRes.ok) {
				const wordData = await wordRes.json();

				// Check if it's an error response
				if (wordData.error) {
					console.error(
						`Word fetch with path returned error for ${link.term}. Trying rcLink fallback...`
					);
					// Try fetching using rcLink instead as fallback
					try {
						const fallbackRes = await trackedFetchCall(
							`/api/fetch-translation-word?rcLink=${encodeURIComponent(link.rcLink)}&language=${language}`
						);
						if (fallbackRes.ok) {
							const fallbackData = await fallbackRes.json();
							if (!fallbackData.error && fallbackData.content) {
								const titleMatch = fallbackData.content.match(/^#\s+(.+)$/m);
								const title = titleMatch ? titleMatch[1].trim() : link.term;
								console.log(`✅ rcLink fallback succeeded: ${link.term} → "${title}"`);
								results.words.push({
									term: link.term,
									title: title,
									category: link.category,
									content: fallbackData.content || '',
									path: link.path,
									rcLink: link.rcLink
								});
								continue;
							}
						}
					} catch (fallbackError) {
						console.error(`rcLink fallback also failed for ${link.term}`);
					}

					// Both failed - add with term as title
					results.words.push({
						term: link.term,
						title: link.term,
						category: link.category,
						content: '',
						path: link.path,
						rcLink: link.rcLink,
						error: true
					});
					continue;
				}

				// Extract title from markdown content (first H1)
				let title = link.term;

				// API now returns direct article format with title field
				if (wordData.title) {
					title = wordData.title;
					console.log(`✅ Extracted title from wordData.title: "${title}"`);
				} else if (wordData.content) {
					// Fallback to extracting from content
					const titleMatch = wordData.content.match(/^#\s+(.+)$/m);
					if (titleMatch) {
						title = titleMatch[1].trim();
						console.log(`✅ Extracted title from H1: "${title}"`);
					}
				}

				console.log(`Fetched word: ${link.term} → title: "${title}"`);
				results.words.push({
					term: link.term,
					title: title,
					category: link.category,
					content: wordData.content || '',
					path: link.path,
					rcLink: link.rcLink
				});
			} else {
				// HTTP error - still add term
				results.words.push({
					term: link.term,
					title: link.term,
					category: link.category,
					content: '',
					path: link.path,
					rcLink: link.rcLink,
					error: true
				});
			}
		} catch (e) {
			console.error(`Failed to fetch word article for ${link.term}:`, e);
		}
	}
	console.log(`Total words fetched: ${results.words.length}`);

	// Step 5: Fetch notes
	try {
		const notesRes = await trackedFetchCall(
			`/api/fetch-translation-notes?reference=${encodeURIComponent(reference)}&language=${language}`
		);
		if (notesRes.ok) {
			results.notes = await notesRes.json();
		}
	} catch (e) {
		console.error('Failed to fetch notes:', e);
	}

	// Step 6: Fetch academy articles from supportReferences
	const supportRefs = extractSupportReferences(results.notes);
	console.log(`Found ${supportRefs.length} support references (limiting to 5)`);
	for (const ref of supportRefs.slice(0, 5)) {
		// Limit to first 5
		try {
			const academyRes = await trackedFetchCall(
				`/api/fetch-translation-academy?rcLink=${encodeURIComponent(ref)}&language=${language}`
			);
			if (academyRes.ok) {
				const academyData = await academyRes.json();

				// Check if it's an error response
				if (academyData.error) {
					console.error(
						`Academy fetch with rcLink returned error for ${ref}. Trying moduleId fallback...`
					);
					// Try fetching using just the moduleId as fallback
					const moduleId = ref.split('/').pop() || '';
					if (moduleId) {
						try {
							const fallbackRes = await trackedFetchCall(
								`/api/fetch-translation-academy?moduleId=${encodeURIComponent(moduleId)}&language=${language}`
							);
							if (fallbackRes.ok) {
								const fallbackData = await fallbackRes.json();
								if (!fallbackData.error && fallbackData.content) {
									const titleMatch = fallbackData.content.match(/^#\s+(.+)$/m);
									const title = titleMatch ? titleMatch[1].trim() : moduleId;
									console.log(`✅ moduleId fallback succeeded: ${moduleId} → "${title}"`);
									results.academyArticles.push({
										moduleId: moduleId,
										title: title,
										rcLink: ref,
										content: fallbackData.content || '',
										path: fallbackData.path || '',
										category: fallbackData.category || ''
									});
									continue;
								}
							}
						} catch (fallbackError) {
							console.error(`moduleId fallback also failed for ${moduleId}`);
						}
					}

					// Both failed - add with error flag
					results.academyArticles.push({
						moduleId: moduleId,
						title: moduleId,
						rcLink: ref,
						content: '',
						path: '',
						category: '',
						error: true
					});
					continue;
				}

				// API now returns direct article format with title field
				const moduleId = academyData.moduleId || ref.split('/').pop() || ref;
				let title = moduleId;

				if (academyData.title) {
					title = academyData.title;
					console.log(`✅ Extracted title from academyData.title: "${title}"`);
				} else if (academyData.content) {
					// Fallback to extracting from content
					const titleMatch = academyData.content.match(/^#\s+(.+)$/m);
					if (titleMatch) {
						title = titleMatch[1].trim();
						console.log(`✅ Extracted title from H1: "${title}"`);
					}
				}

				console.log(`Fetched academy article: ${ref} → title: "${title}"`);
				results.academyArticles.push({
					moduleId: moduleId,
					title: title,
					rcLink: ref,
					content: academyData.content || '',
					path: academyData.path || '',
					category: academyData.category || ''
				});
			} else {
				// HTTP error - still add with moduleId from RC link
				const moduleId = ref.split('/').pop() || ref;
				results.academyArticles.push({
					moduleId: moduleId,
					title: moduleId,
					rcLink: ref,
					content: '',
					path: '',
					category: '',
					error: true
				});
			}
		} catch (e) {
			console.error(`Failed to fetch academy article for ${ref}:`, e);
		}
	}
	console.log(`Total academy articles fetched: ${results.academyArticles.length}`);

	return json(results);
}

async function executeWordsPrompt(
	reference: string,
	language: string,
	trackedFetchCall: (url: string) => Promise<Response>,
	tracer: EdgeXRayTracer
) {
	console.log('[executeWordsPrompt] Reusing translation-helps logic for word links and articles');

	const results: any = {
		words: []
	};

	// Step 1: Fetch word links (same as main prompt)
	let wordLinks: any[] = [];
	try {
		const linksRes = await trackedFetchCall(
			`/api/fetch-translation-word-links?reference=${encodeURIComponent(reference)}&language=${language}`
		);
		if (linksRes.ok) {
			const linksData = await linksRes.json();
			wordLinks = linksData.translationWordLinks || linksData.items || [];
			console.log(`Found ${wordLinks.length} word links for ${reference}`);
		}
	} catch (e) {
		console.error('Failed to fetch word links:', e);
	}

	// Step 2: Fetch word articles (same logic as main prompt)
	console.log(`Fetching word articles for ${wordLinks.length} terms (limiting to 10)`);
	for (const link of wordLinks.slice(0, 10)) {
		try {
			console.log(`Word link for ${link.term}:`, {
				term: link.term,
				path: link.path,
				rcLink: link.rcLink,
				category: link.category
			});

			const url = `/api/fetch-translation-word?path=${encodeURIComponent(link.path)}&language=${language}`;
			console.log(`Fetching word article: ${url}`);
			const wordRes = await trackedFetchCall(url);
			if (wordRes.ok) {
				const wordData = await wordRes.json();

				if (wordData.error) {
					console.error(
						`Word fetch with path returned error for ${link.term}. Trying rcLink fallback...`
					);
					try {
						const fallbackRes = await trackedFetchCall(
							`/api/fetch-translation-word?rcLink=${encodeURIComponent(link.rcLink)}&language=${language}`
						);
						if (fallbackRes.ok) {
							const fallbackData = await fallbackRes.json();
							if (!fallbackData.error && fallbackData.content) {
								const titleMatch = fallbackData.content.match(/^#\s+(.+)$/m);
								const title = titleMatch ? titleMatch[1].trim() : link.term;
								console.log(`✅ rcLink fallback succeeded: ${link.term} → "${title}"`);
								results.words.push({
									term: link.term,
									title: title,
									category: link.category,
									content: fallbackData.content || '',
									path: link.path,
									rcLink: link.rcLink
								});
								continue;
							}
						}
					} catch (fallbackError) {
						console.error(`rcLink fallback also failed for ${link.term}`);
					}

					results.words.push({
						term: link.term,
						title: link.term,
						category: link.category,
						content: '',
						path: link.path,
						rcLink: link.rcLink,
						error: true
					});
					continue;
				}

				let title = link.term;
				if (wordData.title) {
					title = wordData.title;
					console.log(`✅ Extracted title from wordData.title: "${title}"`);
				} else if (wordData.content) {
					const titleMatch = wordData.content.match(/^#\s+(.+)$/m);
					if (titleMatch) {
						title = titleMatch[1].trim();
						console.log(`✅ Extracted title from H1: "${title}"`);
					}
				}

				console.log(`Fetched word: ${link.term} → title: "${title}"`);
				results.words.push({
					term: link.term,
					title: title,
					category: link.category,
					content: wordData.content || '',
					path: link.path,
					rcLink: link.rcLink
				});
			} else {
				results.words.push({
					term: link.term,
					title: link.term,
					category: link.category,
					content: '',
					path: link.path,
					rcLink: link.rcLink,
					error: true
				});
			}
		} catch (e) {
			console.error(`Failed to fetch word article for ${link.term}:`, e);
		}
	}
	console.log(`Total words fetched: ${results.words.length}`);

	return json(results);
}

async function executeAcademyPrompt(
	reference: string,
	language: string,
	trackedFetchCall: (url: string) => Promise<Response>,
	tracer: EdgeXRayTracer
) {
	console.log(
		'[executeAcademyPrompt] Reusing translation-helps logic for notes and academy articles'
	);

	const results: any = {
		academyArticles: []
	};

	// Internal variable for fetching notes (not included in results)
	let notesData: any = null;

	// Step 1: Fetch notes (same as main prompt, but not included in results)
	try {
		const notesRes = await trackedFetchCall(
			`/api/fetch-translation-notes?reference=${encodeURIComponent(reference)}&language=${language}`
		);
		if (notesRes.ok) {
			notesData = await notesRes.json();
		}
	} catch (e) {
		console.error('Failed to fetch notes:', e);
	}

	// Step 2: Fetch academy articles from supportReferences (same logic as main prompt)
	const supportRefs = extractSupportReferences(notesData);
	console.log(`Found ${supportRefs.length} support references (limiting to 5)`);
	for (const ref of supportRefs.slice(0, 5)) {
		try {
			const academyRes = await trackedFetchCall(
				`/api/fetch-translation-academy?rcLink=${encodeURIComponent(ref)}&language=${language}`
			);
			if (academyRes.ok) {
				const academyData = await academyRes.json();

				if (academyData.error) {
					console.error(
						`Academy fetch with rcLink returned error for ${ref}. Trying moduleId fallback...`
					);
					const moduleId = ref.split('/').pop() || '';
					if (moduleId) {
						try {
							const fallbackRes = await trackedFetchCall(
								`/api/fetch-translation-academy?moduleId=${encodeURIComponent(moduleId)}&language=${language}`
							);
							if (fallbackRes.ok) {
								const fallbackData = await fallbackRes.json();
								if (!fallbackData.error && fallbackData.content) {
									const titleMatch = fallbackData.content.match(/^#\s+(.+)$/m);
									const title = titleMatch ? titleMatch[1].trim() : moduleId;
									console.log(`✅ moduleId fallback succeeded: ${moduleId} → "${title}"`);
									results.academyArticles.push({
										moduleId: moduleId,
										title: title,
										rcLink: ref,
										content: fallbackData.content || '',
										path: fallbackData.path || '',
										category: fallbackData.category || ''
									});
									continue;
								}
							}
						} catch (fallbackError) {
							console.error(`moduleId fallback also failed for ${moduleId}`);
						}
					}

					results.academyArticles.push({
						moduleId: moduleId,
						title: moduleId,
						rcLink: ref,
						content: '',
						path: '',
						category: '',
						error: true
					});
					continue;
				}

				const moduleId = academyData.moduleId || ref.split('/').pop() || ref;
				let title = moduleId;

				if (academyData.title) {
					title = academyData.title;
					console.log(`✅ Extracted title from academyData.title: "${title}"`);
				} else if (academyData.content) {
					const titleMatch = academyData.content.match(/^#\s+(.+)$/m);
					if (titleMatch) {
						title = titleMatch[1].trim();
						console.log(`✅ Extracted title from H1: "${title}"`);
					}
				}

				console.log(`Fetched academy article: ${ref} → title: "${title}"`);
				results.academyArticles.push({
					moduleId: moduleId,
					title: title,
					rcLink: ref,
					content: academyData.content || '',
					path: academyData.path || '',
					category: academyData.category || ''
				});
			} else {
				const moduleId = ref.split('/').pop() || ref;
				results.academyArticles.push({
					moduleId: moduleId,
					title: moduleId,
					rcLink: ref,
					content: '',
					path: '',
					category: '',
					error: true
				});
			}
		} catch (e) {
			console.error(`Failed to fetch academy article for ${ref}:`, e);
		}
	}
	console.log(`Total academy articles fetched: ${results.academyArticles.length}`);

	return json(results);
}

function extractSupportReferences(notesData: any): string[] {
	const refs = new Set<string>();

	if (!notesData) {
		console.log('No notes data provided');
		return [];
	}

	// Check both notes and items arrays
	const notes = notesData.notes || notesData.items || [];
	console.log(`Checking ${notes.length} notes for support references`);

	// Log first note structure to debug
	if (notes.length > 0) {
		console.log('First note keys:', Object.keys(notes[0]));
		console.log('First note sample:', JSON.stringify(notes[0], null, 2).substring(0, 300));
	}

	for (const note of notes) {
		// Use SupportReference (capital S) as shown in logs line 836
		const supportRef = note.SupportReference || note.supportReference;
		if (supportRef && supportRef.startsWith('rc://')) {
			console.log(`Found support reference: ${supportRef}`);
			refs.add(supportRef);
		}
	}

	console.log(`Total support references found: ${refs.size}`);
	return Array.from(refs);
}
