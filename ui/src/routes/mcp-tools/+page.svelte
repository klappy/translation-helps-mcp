<script>
	// @ts-nocheck
	import ApiTester from '$lib/components/ApiTester.svelte';
	import { healthData, isLoading, refreshHealth } from '$lib/services/healthService';
	import {
		Activity,
		AlertCircle,
		Beaker,
		BookOpen,
		CheckCircle,
		Code,
		Database,
		ExternalLink,
		Globe,
		Info,
		Languages,
		Link,
		Search,
		Terminal,
		Zap
	} from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';

	// Default health indicators to prevent reactive loops
	let defaultHealthIndicator = {
		status: 'loading',
		label: 'Loading',
		tooltip: 'Status loading...',
		color: 'text-gray-400',
		badgeColor: 'bg-gray-400/20 text-gray-400'
	};

	// Current selection state
	let selectedCategory = 'overview';
	let selectedTool = null;

	// API testing state
	let responses = {}; // Track responses per endpoint
	let loadingStates = {}; // Track loading per endpoint

	// Categories with organized endpoints
	const categories = {
		overview: {
			name: 'Overview',
			icon: Info,
			description: 'MCP via HTTP/Web API Documentation'
		},
		health: {
			name: 'Health Status',
			icon: Activity,
			description: 'Real-time API endpoint monitoring',
			healthKey: 'overall'
		},
		core: {
			name: 'Core Endpoints',
			icon: Database,
			description: 'Fetch files and filter data to smaller, relevant chunks for specific use cases',
			healthKey: 'core'
		},
		translation: {
			name: 'Translation Endpoints',
			icon: Languages,
			description: 'Translation-specific resources and specialized content',
			healthKey: 'translation'
		},
		linguistics: {
			name: 'Linguistics & Words',
			icon: BookOpen,
			description: 'Word-level analysis, translation words, and linguistic resources',
			healthKey: 'linguistics'
		},
		metadata: {
			name: 'Metadata & Discovery',
			icon: Search,
			description: 'Resource discovery, language coverage, and availability information',
			healthKey: 'metadata'
		},
		comprehensive: {
			name: 'Comprehensive & Aggregated',
			icon: Link,
			description: 'Bring multiple sources together, handle complex chained events, or merge data',
			healthKey: 'comprehensive'
		},
		experimental: {
			name: 'Experimental',
			icon: Beaker,
			description: 'Value-added endpoints that may change',
			healthKey: 'experimental'
		}
	};

	// Complete endpoint data merged from api-docs with MCP tool mappings
	const mcpTools = {
		core: [
			{
				name: 'Fetch Scripture',
				tool: 'translation_helps_fetch_scripture',
				description:
					'Retrieves Scripture text in ULT/GLT and/or UST/GST translations with embedded word alignment data for precise translation work.',
				apiEndpoint: '/api/fetch-scripture',
				method: 'GET',
				category: 'core',
				parameters: [
					{
						name: 'reference',
						required: true,
						type: 'string',
						example: 'Genesis 1:1',
						description: 'Bible reference (e.g., "Genesis 1:1", "Romans 1:1-5")'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Target language code (ISO 639-1)'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization/publisher'
					},
					{
						name: 'includeVerseNumbers',
						required: false,
						type: 'boolean',
						example: true,
						description: 'Include verse numbers in response'
					},
					{
						name: 'format',
						required: false,
						type: 'string',
						example: 'text',
						options: ['text', 'usfm'],
						description: 'Response format (text or usfm)'
					},
					{
						name: 'includeAlignment',
						required: false,
						type: 'boolean',
						example: false,
						description: 'Include word alignment data for translation work'
					}
				],
				example: {
					request: {
						reference: 'Genesis 1:1',
						language: 'en',
						organization: 'unfoldingWord',
						includeVerseNumbers: true,
						format: 'text'
					}
				}
			},
			{
				name: 'Fetch ULT Scripture',
				tool: 'translation_helps_fetch_ult_scripture',
				description:
					'Fetches ULT (Unlocked Literal Text) Scripture with precise word alignment data for translation teams.',
				apiEndpoint: '/api/fetch-ult-scripture',
				method: 'GET',
				category: 'core',
				parameters: [
					{
						name: 'reference',
						required: true,
						type: 'string',
						example: 'Genesis 1:1',
						description: 'Bible reference'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					},
					{
						name: 'includeAlignment',
						required: false,
						type: 'boolean',
						example: false,
						description: 'Include word alignment data'
					}
				],
				example: {
					request: {
						reference: 'Genesis 1:1',
						language: 'en',
						organization: 'unfoldingWord'
					}
				}
			},
			{
				name: 'Fetch UST Scripture',
				tool: 'translation_helps_fetch_ust_scripture',
				description:
					'Fetches UST (Unlocked Simplified Text) Scripture optimized for clarity and comprehension.',
				apiEndpoint: '/api/fetch-ust-scripture',
				method: 'GET',
				category: 'core',
				parameters: [
					{
						name: 'reference',
						required: true,
						type: 'string',
						example: 'Genesis 1:1',
						description: 'Bible reference'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				example: {
					request: {
						reference: 'Genesis 1:1',
						language: 'en',
						organization: 'unfoldingWord'
					}
				}
			}
		],
		translation: [
			{
				name: 'Fetch Translation Notes',
				tool: 'translation_helps_fetch_translation_notes',
				description:
					'Retrieves detailed translation notes providing cultural context, linguistic insights, and translation guidance.',
				apiEndpoint: '/api/fetch-translation-notes',
				method: 'GET',
				category: 'translation',
				parameters: [
					{
						name: 'reference',
						required: true,
						type: 'string',
						example: 'Genesis 1:1',
						description: 'Bible reference'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					},
					{
						name: 'includeIntro',
						required: false,
						type: 'boolean',
						example: true,
						description: 'Include book/chapter introductory notes'
					},
					{
						name: 'includeContext',
						required: false,
						type: 'boolean',
						example: true,
						description: 'Include contextual background notes'
					}
				],
				example: {
					request: {
						reference: 'Genesis 1:1',
						language: 'en',
						organization: 'unfoldingWord',
						includeIntro: true
					}
				}
			},
			{
				name: 'Fetch Translation Questions',
				tool: 'translation_helps_fetch_translation_questions',
				description:
					'Provides comprehension and accuracy-checking questions for translation validation and quality assurance.',
				apiEndpoint: '/api/fetch-translation-questions',
				method: 'GET',
				category: 'translation',
				parameters: [
					{
						name: 'reference',
						required: true,
						type: 'string',
						example: 'Genesis 1:1',
						description: 'Bible reference'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				example: {
					request: {
						reference: 'Genesis 1:1',
						language: 'en',
						organization: 'unfoldingWord'
					}
				}
			},
			{
				name: 'Fetch Translation Academy',
				tool: 'translation_helps_fetch_translation_academy',
				description:
					'Access Translation Academy articles explaining translation principles, techniques, and best practices.',
				apiEndpoint: '/api/fetch-translation-academy',
				method: 'GET',
				category: 'translation',
				parameters: [
					{
						name: 'article',
						required: false,
						type: 'string',
						example: 'translate-unknown',
						description: 'Specific article identifier'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					},
					{
						name: 'manual',
						required: false,
						type: 'string',
						example: 'translate',
						description: 'Manual type (translate, checking, etc.)'
					}
				],
				example: {
					request: {
						article: 'translate-unknown',
						language: 'en',
						organization: 'unfoldingWord'
					}
				}
			}
		],
		linguistics: [
			{
				name: 'Fetch Translation Words',
				tool: 'translation_helps_fetch_translation_words',
				description:
					'Retrieves key term definitions, cultural context, and translation recommendations for important biblical concepts.',
				apiEndpoint: '/api/fetch-translation-words',
				method: 'GET',
				category: 'linguistics',
				parameters: [
					{
						name: 'reference',
						required: true,
						type: 'string',
						example: 'Genesis 1:1',
						description: 'Bible reference'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				example: {
					request: {
						reference: 'Genesis 1:1',
						language: 'en',
						organization: 'unfoldingWord'
					}
				}
			},
			{
				name: 'Fetch Translation Word Links',
				tool: 'translation_helps_fetch_translation_word_links',
				description:
					'Gets word-level linking data connecting translation words to specific verse locations and occurrences.',
				apiEndpoint: '/api/fetch-translation-word-links',
				method: 'GET',
				category: 'linguistics',
				parameters: [
					{
						name: 'reference',
						required: true,
						type: 'string',
						example: 'Genesis 1:1',
						description: 'Bible reference'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				example: {
					request: {
						reference: 'Genesis 1:1',
						language: 'en',
						organization: 'unfoldingWord'
					}
				}
			},
			{
				name: 'Get Translation Word',
				tool: 'translation_helps_get_translation_word',
				description:
					'Retrieves detailed information for a specific translation word including definitions, examples, and related terms.',
				apiEndpoint: '/api/get-translation-word',
				method: 'GET',
				category: 'linguistics',
				parameters: [
					{
						name: 'term',
						required: true,
						type: 'string',
						example: 'faith',
						description: 'Translation word identifier'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				example: {
					request: {
						term: 'faith',
						language: 'en',
						organization: 'unfoldingWord'
					}
				}
			},
			{
				name: 'Browse Translation Words',
				tool: 'translation_helps_browse_translation_words',
				description:
					'Browse and search through available translation words with filtering and categorization options.',
				apiEndpoint: '/api/browse-translation-words',
				method: 'GET',
				category: 'linguistics',
				parameters: [
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					},
					{
						name: 'category',
						required: false,
						type: 'string',
						example: 'kt',
						options: ['kt', 'names', 'other'],
						description: 'Word category filter'
					},
					{
						name: 'search',
						required: false,
						type: 'string',
						example: 'faith',
						description: 'Search term'
					},
					{
						name: 'limit',
						required: false,
						type: 'number',
						example: 50,
						description: 'Maximum number of results'
					}
				],
				example: {
					request: {
						language: 'en',
						organization: 'unfoldingWord',
						category: 'kt',
						limit: 50
					}
				}
			},
			{
				name: 'Get Words for Reference',
				tool: 'translation_helps_get_words_for_reference',
				description:
					'Finds all translation words associated with a specific Bible reference for comprehensive word study.',
				apiEndpoint: '/api/get-words-for-reference',
				method: 'GET',
				category: 'linguistics',
				parameters: [
					{
						name: 'reference',
						required: true,
						type: 'string',
						example: 'Genesis 1:1',
						description: 'Bible reference'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				example: {
					request: {
						reference: 'Genesis 1:1',
						language: 'en',
						organization: 'unfoldingWord'
					}
				}
			}
		],
		metadata: [
			{
				name: 'Get Languages',
				tool: 'translation_helps_get_languages',
				description:
					'Lists all available languages with their codes, names, and resource availability information.',
				apiEndpoint: '/api/get-languages',
				method: 'GET',
				category: 'metadata',
				parameters: [
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Filter by organization'
					}
				],
				example: {
					request: {
						organization: 'unfoldingWord'
					}
				}
			},
			{
				name: 'Get Available Books',
				tool: 'translation_helps_get_available_books',
				description:
					'Returns list of Bible books available for a specific language and organization with resource counts.',
				apiEndpoint: '/api/get-available-books',
				method: 'GET',
				category: 'metadata',
				parameters: [
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				example: {
					request: {
						language: 'en',
						organization: 'unfoldingWord'
					}
				}
			},
			{
				name: 'Language Coverage',
				tool: 'translation_helps_language_coverage',
				description:
					'Provides comprehensive coverage analysis showing resource availability across languages and content types.',
				apiEndpoint: '/api/language-coverage',
				method: 'GET',
				category: 'metadata',
				parameters: [
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Organization filter'
					},
					{
						name: 'detailed',
						required: false,
						type: 'boolean',
						example: false,
						description: 'Include detailed resource breakdown'
					}
				],
				example: {
					request: {
						organization: 'unfoldingWord',
						detailed: true
					}
				}
			},
			{
				name: 'List Available Resources',
				tool: 'translation_helps_list_available_resources',
				description:
					'Discovers and lists all available resources for a language/organization combination with metadata.',
				apiEndpoint: '/api/list-available-resources',
				method: 'GET',
				category: 'metadata',
				parameters: [
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					},
					{
						name: 'resourceType',
						required: false,
						type: 'string',
						example: 'scripture',
						options: ['scripture', 'notes', 'questions', 'words', 'academy'],
						description: 'Filter by resource type'
					}
				],
				example: {
					request: {
						language: 'en',
						organization: 'unfoldingWord'
					}
				}
			},
			{
				name: 'Resource Recommendations',
				tool: 'translation_helps_resource_recommendations',
				description:
					'Provides intelligent resource recommendations based on content analysis and translation needs.',
				apiEndpoint: '/api/resource-recommendations',
				method: 'GET',
				category: 'metadata',
				parameters: [
					{
						name: 'book',
						required: true,
						type: 'string',
						example: 'Romans',
						description: 'Bible book name for context-specific recommendations'
					},
					{
						name: 'chapter',
						required: true,
						type: 'string',
						example: '9',
						description: 'Chapter number'
					},
					{
						name: 'userRole',
						required: true,
						type: 'string',
						example: 'translator',
						options: ['translator', 'checker', 'consultant', 'facilitator'],
						description: 'User role for targeted recommendations'
					},
					{
						name: 'verse',
						required: false,
						type: 'string',
						example: '1',
						description: 'Specific verse number for targeted recommendations'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Target language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					}
				],
				defaultValues: {
					book: 'Romans',
					chapter: '9',
					userRole: 'translator',
					language: 'en',
					organization: 'unfoldingWord'
				}
			},
			{
				name: 'Extract References',
				tool: 'translation_helps_extract_references',
				description:
					'Extracts and normalizes Bible references from text with validation and formatting options.',
				apiEndpoint: '/api/extract-references',
				method: 'GET',
				category: 'metadata',
				parameters: [
					{
						name: 'text',
						required: true,
						type: 'string',
						example: 'See Genesis 1:1 and Psalm 23:1 for examples',
						description: 'Text containing Bible references'
					},
					{
						name: 'format',
						required: false,
						type: 'string',
						example: 'standard',
						options: ['standard', 'short', 'long'],
						description: 'Reference format preference'
					}
				],
				example: {
					request: {
						text: 'See Genesis 1:1 and Psalm 23:1 for examples',
						format: 'standard'
					}
				}
			}
		],
		comprehensive: [
			{
				name: 'Fetch Resources',
				tool: 'translation_helps_fetch_resources',
				description:
					'One-stop endpoint that aggregates multiple resource types (scripture, notes, questions, words) for comprehensive content delivery.',
				apiEndpoint: '/api/fetch-resources',
				method: 'GET',
				category: 'comprehensive',
				parameters: [
					{
						name: 'reference',
						required: true,
						type: 'string',
						example: 'Genesis 1:1',
						description: 'Bible reference'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					},
					{
						name: 'resources',
						required: false,
						type: 'array',
						example: ['scripture', 'notes', 'questions'],
						description: 'Specific resources to include'
					}
				],
				example: {
					request: {
						reference: 'Genesis 1:1',
						language: 'en',
						organization: 'unfoldingWord',
						resources: ['scripture', 'notes', 'questions', 'words']
					}
				}
			},
			{
				name: 'Get Context',
				tool: 'translation_helps_get_context',
				description:
					'Provides rich contextual information including cultural background, historical context, and cross-references for enhanced understanding.',
				apiEndpoint: '/api/get-context',
				method: 'GET',
				category: 'comprehensive',
				parameters: [
					{
						name: 'reference',
						required: true,
						type: 'string',
						example: 'Genesis 1:1',
						description: 'Bible reference'
					},
					{
						name: 'language',
						required: false,
						type: 'string',
						example: 'en',
						description: 'Language code'
					},
					{
						name: 'organization',
						required: false,
						type: 'string',
						example: 'unfoldingWord',
						description: 'Content organization'
					},
					{
						name: 'deepAnalysis',
						required: false,
						type: 'boolean',
						example: true,
						description: 'Include deep contextual analysis'
					}
				],
				example: {
					request: {
						reference: 'Genesis 1:1',
						language: 'en',
						organization: 'unfoldingWord',
						deepAnalysis: true
					}
				}
			}
		],
		experimental: [
			{
				name: 'Health Check',
				tool: 'translation_helps_health',
				description:
					'Comprehensive API health monitoring with endpoint-specific status, performance metrics, and system diagnostics.',
				apiEndpoint: '/api/health',
				method: 'GET',
				category: 'experimental',
				parameters: [
					{
						name: 'detailed',
						required: false,
						type: 'boolean',
						example: true,
						description: 'Include detailed endpoint diagnostics'
					},
					{
						name: 'include',
						required: false,
						type: 'array',
						example: ['core', 'translation'],
						description: 'Specific endpoint categories to check'
					}
				],
				example: {
					request: {
						detailed: true,
						include: ['core', 'translation', 'linguistics']
					}
				}
			}
		]
	};

	// Load health check data - REMOVED: Now handled by health service
	// The health service manages all health data fetching and state

	// Get all tools for easy access
	function getAllTools() {
		return [...mcpTools.core, ...mcpTools.linked, ...mcpTools.experimental];
	}

	// Select a category or tool
	function selectCategory(category) {
		selectedCategory = category;
		selectedTool = null;
	}

	function selectTool(tool) {
		selectedTool = tool;
		selectedCategory = 'tool';
	}

	// Get health status for an endpoint
	function getEndpointHealth(apiEndpoint, healthData) {
		if (!healthData?.endpoints) return null;
		const endpointName = apiEndpoint.replace('/api/', '');
		return healthData.endpoints.find((ep) => ep.name === endpointName);
	}

	// Get status color class
	function getStatusClass(status) {
		switch (status) {
			case 'healthy':
				return 'text-green-500';
			case 'warning':
				return 'text-yellow-500';
			case 'error':
				return 'text-red-500';
			default:
				return 'text-gray-500';
		}
	}

	// Handle API endpoint testing
	async function handleTest(event) {
		const { endpoint, formData } = event.detail;
		const endpointKey = endpoint.path || endpoint;

		loadingStates[endpointKey] = true;
		responses[endpointKey] = null;

		// Start timing
		const startTime = performance.now();
		let responseTime = null;
		let cacheStatus = 'unknown';

		try {
			// Build URL with parameters
			const functionName = endpointKey.replace('/api/', '');
			const url = new URL(`/api/${functionName}`, window.location.origin);

			// Add parameters to URL
			Object.entries(formData || {}).forEach(([key, value]) => {
				if (value) {
					url.searchParams.append(key, value);
				}
			});

			const response = await fetch(url.toString());
			
			// Calculate response time
			responseTime = Math.round(performance.now() - startTime);

			// Detect cache status from various possible header indicators
			const cacheControl = response.headers.get('cache-control');
			const cfCacheStatus = response.headers.get('cf-cache-status');
			const xCacheStatus = response.headers.get('x-cache-status');
			const xCache = response.headers.get('x-cache');
			const age = response.headers.get('age');
			
			// Determine cache status from headers
			if (cfCacheStatus) {
				cacheStatus = cfCacheStatus.toLowerCase() === 'hit' ? 'hit' : 'miss';
			} else if (xCacheStatus) {
				cacheStatus = xCacheStatus.toLowerCase().includes('hit') ? 'hit' : 'miss';
			} else if (xCache) {
				cacheStatus = xCache.toLowerCase().includes('hit') ? 'hit' : 'miss';
			} else if (age && parseInt(age) > 0) {
				cacheStatus = 'hit';
			} else if (cacheControl && cacheControl.includes('no-cache')) {
				cacheStatus = 'miss';
			} else {
				// Check if response has our custom cache indicators
				try {
					const tempData = await response.clone().json();
					if (tempData.metadata?.cacheHit !== undefined) {
						cacheStatus = tempData.metadata.cacheHit ? 'hit' : 'miss';
					}
				} catch (e) {
					// Ignore JSON parsing errors
				}
			}

			const data = await response.json();

			// Store the actual API response as the main response
			// Keep metadata separate for debugging
			responses[endpointKey] = {
				// The actual API response data (what developers need to see)
				...data,
				// Enhanced metadata about the request (for debugging and performance display)
				_metadata: {
					success: response.ok,
					status: response.status,
					url: url.toString(),
					responseTime,
					cacheStatus,
					headers: {
						cacheControl,
						cfCacheStatus,
						xCacheStatus,
						xCache,
						age
					},
					note: 'The data above is the actual API response. This _metadata section is for debugging only.'
				}
			};
		} catch (error) {
			responseTime = Math.round(performance.now() - startTime);
			
			responses[endpointKey] = {
				error: error.message,
				_metadata: {
					success: false,
					status: 0,
					url: 'Error occurred',
					responseTime,
					cacheStatus: 'error',
					note: 'The error above is the actual API response. This _metadata section is for debugging only.'
				}
			};
		} finally {
			loadingStates[endpointKey] = false;
		}
	}

	onMount(() => {
		// Health monitoring disabled to prevent CORS and infinite loop issues
		// startHealthMonitoring();
	});

	onDestroy(() => {
		// stopHealthMonitoring();
	});
</script>

<svelte:head>
	<title>MCP Tools API - The Aqueduct</title>
	<meta
		name="description"
		content="Complete documentation for Translation Helps MCP over HTTP/Web API endpoints. Test and explore our Model Context Protocol tools."
	/>
</svelte:head>

<!-- Page Content -->
<section class="relative min-h-screen px-4 py-16 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-7xl">
		<!-- Header -->
		<div class="mb-16 text-center">
			<div
				class="mb-8 inline-flex animate-pulse items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-medium text-blue-300 backdrop-blur-xl"
			>
				<Code class="mr-2 h-4 w-4" />
				Model Context Protocol • HTTP/Web API
			</div>
			<h1 class="mb-8 text-5xl font-bold text-white md:text-6xl">
				<span class="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
					MCP Tools API
				</span>
			</h1>
			<p class="mx-auto max-w-4xl text-xl leading-relaxed text-gray-300 md:text-2xl">
				<strong class="text-blue-300">Complete documentation and testing interface</strong>
				for our Translation Helps MCP server endpoints. Explore tools, test responses, and integrate
				with ease.
			</p>
		</div>
		<div class="flex flex-col gap-8 lg:flex-row">
			<!-- Sidebar Navigation -->
			<div class="lg:w-1/4">
				<div
					class="sticky top-8 rounded-3xl border border-blue-500/30 bg-white/5 p-6 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:border-blue-500/40"
				>
					<h2 class="mb-6 flex items-center gap-3 text-xl font-bold text-white">
						<div class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20">
							<Terminal class="h-4 w-4 text-blue-400" />
						</div>
						Documentation
					</h2>

					<nav class="space-y-2">
						<!-- Overview & Health -->
						{#each Object.entries(categories) as [key, category]}
							<button
								class="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all {selectedCategory ===
								key
									? 'bg-purple-600 text-white'
									: 'text-gray-300 hover:bg-gray-700'}"
								on:click={() => selectCategory(key)}
							>
								<!-- Simple status indicator (health monitoring disabled) -->
								<div class="h-3 w-3 rounded-full bg-gray-400"></div>

								<svelte:component this={category.icon} class="h-4 w-4" />
								{category.name}
							</button>
						{/each}

						<!-- Tool Categories -->
						{#each Object.entries(mcpTools) as [categoryKey, tools]}
							<div class="mt-4">
								<div class="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">
									{categories[categoryKey]?.name || categoryKey}
								</div>
								{#each tools as tool}
									<button
										class="flex w-full items-center gap-2 rounded-lg p-2 pl-3 text-left text-sm transition-all {selectedTool?.name ===
										tool.name
											? 'bg-purple-600 text-white'
											: 'text-gray-300 hover:bg-gray-700'}"
										on:click={() => selectTool(tool)}
									>
										<!-- Simple tool status indicator (health monitoring disabled) -->
										<div class="h-2 w-2 rounded-full bg-gray-400"></div>
										<span class="flex-1">{tool.name}</span>
									</button>
								{/each}
							</div>
						{/each}
					</nav>
				</div>
			</div>

			<!-- Main Content -->
			<div class="lg:w-3/4">
				<div
					class="rounded-3xl border border-blue-500/30 bg-white/5 p-8 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:border-blue-500/40"
				>
					<!-- Overview -->
					{#if selectedCategory === 'overview'}
						<div class="space-y-6">
							<div class="text-center">
								<h1 class="mb-4 text-4xl font-bold text-white">Translation Helps MCP</h1>
								<p class="mb-8 text-xl text-gray-300">Model Context Protocol via HTTP/Web API</p>
							</div>

							<div class="grid gap-6 md:grid-cols-2">
								<div class="rounded-lg bg-gray-700/50 p-6">
									<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
										<Zap class="h-5 w-5 text-yellow-500" />
										HTTP-Based MCP
									</h3>
									<p class="text-sm text-gray-300">
										Access all MCP tools via standard HTTP requests. Perfect for stateless
										environments like Cloudflare Workers.
									</p>
								</div>

								<div class="rounded-lg bg-gray-700/50 p-6">
									<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
										<Database class="h-5 w-5 text-blue-500" />
										Bible Translation Resources
									</h3>
									<p class="text-sm text-gray-300">
										Comprehensive access to Scripture, translation notes, comprehension questions,
										and word studies.
									</p>
								</div>

								<div class="rounded-lg bg-gray-700/50 p-6">
									<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
										<Globe class="h-5 w-5 text-green-500" />
										Multi-Language Support
									</h3>
									<p class="text-sm text-gray-300">
										Access resources in multiple languages from the Door43 catalog with unified API
										endpoints.
									</p>
								</div>

								<div class="rounded-lg bg-gray-700/50 p-6">
									<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
										<Activity class="h-5 w-5 text-purple-500" />
										Real-time Monitoring
									</h3>
									<p class="text-sm text-gray-300">
										Comprehensive health monitoring with performance metrics and status tracking for
										all endpoints.
									</p>
								</div>
							</div>

							<div class="rounded-lg bg-gray-700/30 p-6">
								<h3 class="mb-4 text-lg font-semibold text-white">Usage Methods</h3>
								<div class="space-y-4">
									<div>
										<h4 class="mb-2 font-medium text-white">🔌 Local MCP Server</h4>
										<code class="rounded bg-gray-900 px-3 py-1 text-sm text-green-400">
											npm start
										</code>
										<p class="mt-1 text-sm text-gray-400">
											Traditional MCP server with WebSocket connection
										</p>
									</div>
									<div>
										<h4 class="mb-2 font-medium text-white">🌐 HTTP/Web API</h4>
										<code class="rounded bg-gray-900 px-3 py-1 text-sm text-blue-400">
											https://translation-helps-mcp.pages.dev/api/mcp
										</code>
										<p class="mt-1 text-sm text-gray-400">
											Stateless HTTP endpoint for all MCP tools
										</p>
									</div>
									<div>
										<h4 class="mb-2 font-medium text-white">⚡ Direct API Endpoints</h4>
										<code class="rounded bg-gray-900 px-3 py-1 text-sm text-purple-400">
											https://translation-helps-mcp.pages.dev/api/fetch-scripture
										</code>
										<p class="mt-1 text-sm text-gray-400">
											Direct access to individual endpoint functionality
										</p>
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!-- Health Status -->
					{#if selectedCategory === 'health'}
						<div class="space-y-6">
							<h2 class="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
								<Activity class="h-6 w-6" />
								API Health Status
							</h2>

							{#if $isLoading}
								<div class="py-8 text-center">
									<div
										class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"
									></div>
									<p class="mt-4 text-gray-400">Loading health status...</p>
								</div>
							{:else if $healthData && $healthData.summary}
								<!-- Summary Cards -->
								<div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
									<div class="rounded-lg bg-gray-700/50 p-4 text-center">
										<div class="text-2xl font-bold text-white">
											{$healthData.summary.totalEndpoints || 0}
										</div>
										<div class="text-sm text-gray-400">Total Endpoints</div>
									</div>
									<div class="rounded-lg bg-gray-700/50 p-4 text-center">
										<div class="text-2xl font-bold text-green-500">
											{$healthData.summary.healthyEndpoints || 0}
										</div>
										<div class="text-sm text-gray-400">Healthy</div>
									</div>
									<div class="rounded-lg bg-gray-700/50 p-4 text-center">
										<div class="text-2xl font-bold text-yellow-500">
											{$healthData.summary.warningEndpoints || 0}
										</div>
										<div class="text-sm text-gray-400">Warnings</div>
									</div>
									<div class="rounded-lg bg-gray-700/50 p-4 text-center">
										<div class="text-2xl font-bold text-red-500">
											{$healthData.summary.errorEndpoints || 0}
										</div>
										<div class="text-sm text-gray-400">Errors</div>
									</div>
								</div>

								<!-- Endpoint Details -->
								<div class="space-y-3">
									{#each $healthData.endpoints as endpoint}
										<div class="rounded-lg bg-gray-700/30 p-4">
											<!-- Main endpoint status -->
											<div class="mb-3 flex items-center justify-between">
												<div class="flex items-center gap-3">
													{#if endpoint.status === 'healthy'}
														<CheckCircle class="h-5 w-5 text-green-500" />
													{:else if endpoint.status === 'warning'}
														<AlertCircle class="h-5 w-5 text-yellow-500" />
													{:else}
														<AlertCircle class="h-5 w-5 text-red-500" />
													{/if}
													<div>
														<div class="font-medium text-white">{endpoint.name}</div>
														<div class="text-sm text-gray-400">/api/{endpoint.name}</div>
													</div>
												</div>
												<div class="text-right">
													<div class="text-sm font-medium {getStatusClass(endpoint.status)}">
														{endpoint.status.toUpperCase()}
													</div>
													<div class="text-xs text-gray-400">
														avg {endpoint.responseTime}ms
													</div>
												</div>
											</div>

											<!-- Cache vs Bypass Details -->
											{#if endpoint.cached && endpoint.bypassed}
												<div class="grid grid-cols-2 gap-3 border-t border-gray-600 pt-3">
													<!-- Cached Result -->
													<div class="rounded bg-gray-800/50 p-3">
														<div class="mb-2 flex items-center justify-between">
															<div class="flex items-center gap-2">
																<div
																	class="h-2 w-2 rounded-full {endpoint.cached.status === 'healthy'
																		? 'bg-green-500'
																		: endpoint.cached.status === 'warning'
																			? 'bg-yellow-500'
																			: 'bg-red-500'}"
																></div>
																<span class="text-sm font-medium text-gray-300">Cached</span>
															</div>
															<span class="text-xs text-gray-400"
																>{endpoint.cached.responseTime}ms</span
															>
														</div>
														{#if endpoint.cached.cacheStatus}
															<div class="text-xs text-gray-500">
																{endpoint.cached.cacheStatus}
															</div>
														{/if}
														{#if endpoint.cached.error}
															<div class="mt-1 text-xs text-red-400">
																{endpoint.cached.error}
															</div>
														{/if}
													</div>

													<!-- Bypassed Result -->
													<div class="rounded bg-gray-800/50 p-3">
														<div class="mb-2 flex items-center justify-between">
															<div class="flex items-center gap-2">
																<div
																	class="h-2 w-2 rounded-full {endpoint.bypassed.status ===
																	'healthy'
																		? 'bg-green-500'
																		: endpoint.bypassed.status === 'warning'
																			? 'bg-yellow-500'
																			: 'bg-red-500'}"
																></div>
																<span class="text-sm font-medium text-gray-300">Bypassed</span>
															</div>
															<span class="text-xs text-gray-400"
																>{endpoint.bypassed.responseTime}ms</span
															>
														</div>
														{#if endpoint.bypassed.cacheStatus}
															<div class="text-xs text-gray-500">
																{endpoint.bypassed.cacheStatus}
															</div>
														{/if}
														{#if endpoint.bypassed.error}
															<div class="mt-1 text-xs text-red-400">
																{endpoint.bypassed.error}
															</div>
														{/if}
													</div>
												</div>
											{/if}
										</div>
									{/each}
								</div>

								<div class="mt-6 text-center">
									<button
										class="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
										on:click={refreshHealth}
									>
										Refresh Status
									</button>
								</div>
							{:else}
								<div class="py-8 text-center">
									<AlertCircle class="mx-auto mb-4 h-12 w-12 text-red-500" />
									<p class="text-gray-400">Failed to load health status</p>
									<button
										class="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
										on:click={refreshHealth}
									>
										Retry
									</button>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Category Overview -->
					{#if selectedCategory === 'core' || selectedCategory === 'linked' || selectedCategory === 'experimental'}
						<div class="space-y-6">
							<h2 class="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
								<svelte:component this={categories[selectedCategory].icon} class="h-6 w-6" />
								{categories[selectedCategory].name}
							</h2>

							<p class="mb-8 text-gray-300">
								{categories[selectedCategory].description}
							</p>

							<div class="grid gap-4">
								{#each mcpTools[selectedCategory] as tool}
									<div
										class="cursor-pointer rounded-lg bg-gray-700/30 p-6 transition-all hover:bg-gray-700/50"
										on:click={() => selectTool(tool)}
									>
										<div class="flex items-start justify-between">
											<div class="flex items-start gap-3">
												<!-- Health Status Bullet Point -->
												{#if $healthData}
													{@const health = getEndpointHealth(tool.apiEndpoint, $healthData)}
													{#if health}
														<div
															class="mt-1 h-4 w-4 rounded-full {health.status === 'healthy'
																? 'bg-emerald-400'
																: health.status === 'warning'
																	? 'bg-yellow-400'
																	: 'bg-red-400'}"
														></div>
													{:else}
														<div class="mt-1 h-4 w-4 rounded-full bg-gray-400"></div>
													{/if}
												{:else}
													<div class="mt-1 h-4 w-4 animate-pulse rounded-full bg-gray-400"></div>
												{/if}

												<svelte:component this={tool.icon} class="mt-1 h-5 w-5 text-purple-400" />
												<div>
													<h3 class="mb-2 font-semibold text-white">{tool.name}</h3>
													<p class="mb-3 text-sm text-gray-300">{tool.description}</p>
													<div class="flex items-center gap-4 text-xs">
														<span class="rounded bg-gray-600 px-2 py-1 text-gray-300">
															{tool.apiEndpoint}
														</span>
													</div>
												</div>
											</div>
											<ExternalLink class="h-4 w-4 text-gray-400" />
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Individual Tool Documentation -->
					{#if selectedTool}
						<div class="space-y-6">
							<div class="mb-6 flex items-center gap-3">
								<svelte:component this={selectedTool.icon} class="h-6 w-6 text-purple-400" />
								<h2 class="text-2xl font-bold text-white">{selectedTool.name}</h2>
								<!-- Temporarily disabled health display to fix infinite loop -->
								{#if false && $healthData}
									{@const health = getEndpointHealth(selectedTool.apiEndpoint, $healthData)}
									{#if health}
										<span class="flex items-center gap-1 text-sm {getStatusClass(health.status)}">
											{#if health.status === 'healthy'}
												<CheckCircle class="h-4 w-4" />
											{:else}
												<AlertCircle class="h-4 w-4" />
											{/if}
											{health.status} ({health.responseTime}ms)
										</span>
									{/if}
								{/if}
							</div>

							<p class="text-lg text-gray-300">{selectedTool.description}</p>

							<!-- API Endpoint -->
							<div class="rounded-lg bg-gray-700/30 p-4">
								<h3 class="mb-2 font-semibold text-white">API Endpoint</h3>
								<code class="block rounded bg-gray-900 px-3 py-2 text-green-400">
									{selectedTool.apiEndpoint}
								</code>
							</div>

							<!-- Parameters -->
							{#if selectedTool.parameters && selectedTool.parameters.length > 0}
								<div class="rounded-lg bg-gray-700/30 p-4">
									<h3 class="mb-4 font-semibold text-white">Parameters</h3>
									<div class="space-y-3">
										{#each selectedTool.parameters as param}
											<div class="flex items-start gap-3">
												<div class="flex-1">
													<div class="mb-1 flex items-center gap-2">
														<code class="font-mono text-purple-400">{param.name}</code>
														<span class="rounded bg-gray-600 px-2 py-1 text-xs text-gray-300">
															{param.type}
														</span>
														{#if param.required}
															<span class="rounded bg-red-600 px-2 py-1 text-xs text-white"
																>required</span
															>
														{:else}
															<span class="rounded bg-gray-500 px-2 py-1 text-xs text-gray-300"
																>optional</span
															>
														{/if}
													</div>
													<p class="text-sm text-gray-300">{param.description}</p>
													{#if param.default}
														<p class="mt-1 text-xs text-gray-400">Default: {param.default}</p>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Interactive Tester -->
							<div class="rounded-lg bg-gray-700/30 p-6">
								<h3 class="mb-4 flex items-center gap-2 font-semibold text-white">
									<Zap class="h-5 w-5" />
									Try It Out
								</h3>
								<ApiTester
									endpoint={{
										name: selectedTool.name,
										path: selectedTool.apiEndpoint,
										parameters: selectedTool.parameters || [],
										example: selectedTool.example
									}}
									loading={loadingStates[selectedTool.apiEndpoint]}
									result={responses[selectedTool.apiEndpoint]}
									on:test={handleTest}
								/>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>
