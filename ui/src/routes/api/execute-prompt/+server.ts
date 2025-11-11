import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
	const { promptName, parameters } = await request.json();
	const { reference, language = 'en' } = parameters;

	try {
		switch (promptName) {
			case 'translation-helps-for-passage':
				return await executeTranslationHelpsPrompt(reference, language, fetch);

			case 'get-translation-words-for-passage':
				return await executeWordsPrompt(reference, language, fetch);

			case 'get-translation-academy-for-passage':
				return await executeAcademyPrompt(reference, language, fetch);

			default:
				return json({ error: 'Unknown prompt' }, { status: 400 });
		}
	} catch (error) {
		console.error('Prompt execution error:', error);
		return json(
			{
				error: 'Failed to execute prompt',
				message: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};

async function executeTranslationHelpsPrompt(
	reference: string,
	language: string,
	fetch: typeof global.fetch
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
		const scriptureRes = await fetch(
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
		const questionsRes = await fetch(
			`/api/translation-questions?reference=${encodeURIComponent(reference)}&language=${language}`
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
		const linksRes = await fetch(
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
			const wordRes = await fetch(url);
			if (wordRes.ok) {
				const wordData = await wordRes.json();

				// Check if it's an error response
				if (wordData.error) {
					console.error(`Word fetch with path returned error for ${link.term}. Trying rcLink fallback...`);
					// Try fetching using rcLink instead as fallback
					try {
						const fallbackRes = await fetch(
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
		const notesRes = await fetch(
			`/api/translation-notes?reference=${encodeURIComponent(reference)}&language=${language}`
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
			const academyRes = await fetch(
				`/api/fetch-translation-academy?rcLink=${encodeURIComponent(ref)}&language=${language}`
			);
			if (academyRes.ok) {
				const academyData = await academyRes.json();

				// Check if it's an error response
				if (academyData.error) {
					console.error(`Academy fetch with rcLink returned error for ${ref}. Trying moduleId fallback...`);
					// Try fetching using just the moduleId as fallback
					const moduleId = ref.split('/').pop() || '';
					if (moduleId) {
						try {
							const fallbackRes = await fetch(
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

async function executeWordsPrompt(reference: string, language: string, fetch: typeof global.fetch) {
	const results: any = {
		words: []
	};

	// Step 1: Fetch word links
	let wordLinks: any[] = [];
	try {
		const linksRes = await fetch(
			`/api/fetch-translation-word-links?reference=${encodeURIComponent(reference)}&language=${language}`
		);
		if (linksRes.ok) {
			const linksData = await linksRes.json();
			wordLinks = linksData.translationWordLinks || [];
		}
	} catch (e) {
		console.error('Failed to fetch word links:', e);
	}

	// Step 2: Fetch word articles for each term (extract titles)
	for (const link of wordLinks) {
		try {
			// Use the path parameter from the link (it has category and .md extension)
			const wordRes = await fetch(
				`/api/fetch-translation-word?path=${encodeURIComponent(link.path)}&language=${language}`
			);
			if (wordRes.ok) {
				const wordData = await wordRes.json();

				// Check if it's an error response
				if (wordData.error) {
					// Try fetching using rcLink instead as fallback
					try {
						const fallbackRes = await fetch(
							`/api/fetch-translation-word?rcLink=${encodeURIComponent(link.rcLink)}&language=${language}`
						);
						if (fallbackRes.ok) {
							const fallbackData = await fallbackRes.json();
							if (!fallbackData.error && fallbackData.content) {
								const titleMatch = fallbackData.content.match(/^#\s+(.+)$/m);
								const title = titleMatch ? titleMatch[1].trim() : link.term;
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
						// Fallback failed
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

				// API now returns direct article format with title field
				let title = link.term;
				
				if (wordData.title) {
					title = wordData.title;
				} else if (wordData.content) {
					// Fallback to extracting from content
					const titleMatch = wordData.content.match(/^#\s+(.+)$/m);
					if (titleMatch) {
						title = titleMatch[1].trim();
					}
				}

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

	return json(results);
}

async function executeAcademyPrompt(
	reference: string,
	language: string,
	fetch: typeof global.fetch
) {
	const results: any = {
		notes: null,
		academyArticles: []
	};

	// Step 1: Fetch notes
	try {
		const notesRes = await fetch(
			`/api/translation-notes?reference=${encodeURIComponent(reference)}&language=${language}`
		);
		if (notesRes.ok) {
			results.notes = await notesRes.json();
		}
	} catch (e) {
		console.error('Failed to fetch notes:', e);
	}

	// Step 2: Fetch academy articles from supportReferences
	const supportRefs = extractSupportReferences(results.notes);
	for (const ref of supportRefs) {
		try {
			const academyRes = await fetch(
				`/api/fetch-translation-academy?rcLink=${encodeURIComponent(ref)}&language=${language}`
			);
			if (academyRes.ok) {
				const academyData = await academyRes.json();

				// Check if it's an error response
				if (academyData.error) {
					// Try fetching using just the moduleId as fallback
					const moduleId = ref.split('/').pop() || '';
					if (moduleId) {
						try {
							const fallbackRes = await fetch(
								`/api/fetch-translation-academy?moduleId=${encodeURIComponent(moduleId)}&language=${language}`
							);
							if (fallbackRes.ok) {
								const fallbackData = await fallbackRes.json();
								if (!fallbackData.error && fallbackData.content) {
									const titleMatch = fallbackData.content.match(/^#\s+(.+)$/m);
									const title = titleMatch ? titleMatch[1].trim() : moduleId;
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
							// Fallback failed
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
				} else if (academyData.content) {
					// Fallback to extracting from content
					const titleMatch = academyData.content.match(/^#\s+(.+)$/m);
					if (titleMatch) {
						title = titleMatch[1].trim();
					}
				}

				results.academyArticles.push({
					moduleId: moduleId,
					title: title,
					rcLink: ref,
					content: academyData.content || '',
					path: academyData.path || '',
					category: academyData.category || ''
				});
			} else {
				// HTTP error - still add with moduleId
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
