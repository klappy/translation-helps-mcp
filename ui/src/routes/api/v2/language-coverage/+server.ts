/**
 * Language Coverage Endpoint v2
 *
 * Shows what resources are available for each language.
 * Useful for understanding translation progress and availability.
 */

import { createSimpleEndpoint, createCORSHandler } from '$lib/simpleEndpoint.js';
import { COMMON_PARAMS } from '$lib/commonValidators.js';
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
import { createListResponse } from '$lib/standardResponses.js';

// Mock language coverage data
const LANGUAGE_COVERAGE_DATA = [
	{
		code: 'en',
		name: 'English',
		nativeName: 'English',
		direction: 'ltr',
		coverage: {
			ult: { available: true, completion: 100, books: 66 },
			ust: { available: true, completion: 100, books: 66 },
			tn: { available: true, completion: 100, books: 66 },
			tw: { available: true, completion: 100, entries: 1000 },
			ta: { available: true, completion: 100, articles: 200 },
			tq: { available: true, completion: 100, books: 66 },
			obs: { available: true, completion: 100, stories: 50 }
		},
		totalResources: 7,
		overallCompletion: 100
	},
	{
		code: 'es',
		name: 'Spanish',
		nativeName: 'Español',
		direction: 'ltr',
		coverage: {
			ult: { available: true, completion: 85, books: 56 },
			ust: { available: true, completion: 85, books: 56 },
			tn: { available: true, completion: 70, books: 46 },
			tw: { available: true, completion: 80, entries: 800 },
			ta: { available: true, completion: 90, articles: 180 },
			tq: { available: true, completion: 65, books: 43 },
			obs: { available: true, completion: 100, stories: 50 }
		},
		totalResources: 7,
		overallCompletion: 82
	},
	{
		code: 'fr',
		name: 'French',
		nativeName: 'Français',
		direction: 'ltr',
		coverage: {
			ult: { available: true, completion: 75, books: 50 },
			ust: { available: true, completion: 75, books: 50 },
			tn: { available: true, completion: 60, books: 40 },
			tw: { available: true, completion: 70, entries: 700 },
			ta: { available: true, completion: 80, articles: 160 },
			tq: { available: true, completion: 55, books: 36 },
			obs: { available: true, completion: 100, stories: 50 }
		},
		totalResources: 7,
		overallCompletion: 74
	},
	{
		code: 'ar',
		name: 'Arabic',
		nativeName: 'العربية',
		direction: 'rtl',
		coverage: {
			ult: { available: true, completion: 60, books: 40 },
			ust: { available: true, completion: 60, books: 40 },
			tn: { available: false, completion: 0, books: 0 },
			tw: { available: true, completion: 50, entries: 500 },
			ta: { available: false, completion: 0, articles: 0 },
			tq: { available: false, completion: 0, books: 0 },
			obs: { available: true, completion: 100, stories: 50 }
		},
		totalResources: 4,
		overallCompletion: 39
	},
	{
		code: 'hi',
		name: 'Hindi',
		nativeName: 'हिन्दी',
		direction: 'ltr',
		coverage: {
			ult: { available: true, completion: 55, books: 36 },
			ust: { available: true, completion: 55, books: 36 },
			tn: { available: false, completion: 0, books: 0 },
			tw: { available: true, completion: 40, entries: 400 },
			ta: { available: false, completion: 0, articles: 0 },
			tq: { available: false, completion: 0, books: 0 },
			obs: { available: true, completion: 100, stories: 50 }
		},
		totalResources: 4,
		overallCompletion: 36
	},
	{
		code: 'sw',
		name: 'Swahili',
		nativeName: 'Kiswahili',
		direction: 'ltr',
		coverage: {
			ult: { available: true, completion: 45, books: 30 },
			ust: { available: true, completion: 45, books: 30 },
			tn: { available: false, completion: 0, books: 0 },
			tw: { available: true, completion: 35, entries: 350 },
			ta: { available: false, completion: 0, articles: 0 },
			tq: { available: false, completion: 0, books: 0 },
			obs: { available: true, completion: 100, stories: 50 }
		},
		totalResources: 4,
		overallCompletion: 32
	},
	{
		code: 'zh',
		name: 'Chinese',
		nativeName: '中文',
		direction: 'ltr',
		coverage: {
			ult: { available: true, completion: 70, books: 46 },
			ust: { available: true, completion: 70, books: 46 },
			tn: { available: true, completion: 50, books: 33 },
			tw: { available: true, completion: 60, entries: 600 },
			ta: { available: true, completion: 70, articles: 140 },
			tq: { available: true, completion: 45, books: 30 },
			obs: { available: true, completion: 100, stories: 50 }
		},
		totalResources: 7,
		overallCompletion: 66
	},
	{
		code: 'pt',
		name: 'Portuguese',
		nativeName: 'Português',
		direction: 'ltr',
		coverage: {
			ult: { available: true, completion: 65, books: 43 },
			ust: { available: true, completion: 65, books: 43 },
			tn: { available: false, completion: 0, books: 0 },
			tw: { available: true, completion: 55, entries: 550 },
			ta: { available: false, completion: 0, articles: 0 },
			tq: { available: false, completion: 0, books: 0 },
			obs: { available: true, completion: 100, stories: 50 }
		},
		totalResources: 4,
		overallCompletion: 41
	}
];

/**
 * Get language coverage information
 */
async function getLanguageCoverage(params: Record<string, any>, _request: Request): Promise<any> {
	const { minCompletion, resource, direction, organization } = params;

	// Filter languages
	let languages = [...LANGUAGE_COVERAGE_DATA];

	// Filter by minimum completion percentage
	if (minCompletion) {
		const threshold = parseInt(minCompletion);
		languages = languages.filter((l) => l.overallCompletion >= threshold);
	}

	// Filter by specific resource availability
	if (resource) {
		languages = languages.filter(
			(l) => l.coverage[resource as keyof typeof l.coverage]?.available === true
		);
	}

	// Filter by text direction
	if (direction) {
		languages = languages.filter((l) => l.direction === direction);
	}

	// Sort by overall completion (descending)
	languages.sort((a, b) => b.overallCompletion - a.overallCompletion);

	// Calculate statistics
	const stats = {
		totalLanguages: languages.length,
		averageCompletion: Math.round(
			languages.reduce((sum, l) => sum + l.overallCompletion, 0) / languages.length
		),
		fullyTranslated: languages.filter((l) => l.overallCompletion === 100).length,
		rtlLanguages: languages.filter((l) => l.direction === 'rtl').length,
		resourceAvailability: {
			ult: languages.filter((l) => l.coverage.ult.available).length,
			ust: languages.filter((l) => l.coverage.ust.available).length,
			tn: languages.filter((l) => l.coverage.tn.available).length,
			tw: languages.filter((l) => l.coverage.tw.available).length,
			ta: languages.filter((l) => l.coverage.ta.available).length,
			tq: languages.filter((l) => l.coverage.tq.available).length,
			obs: languages.filter((l) => l.coverage.obs.available).length
		}
	};

	return createListResponse(languages, {
		organization,
		source: 'coverage-matrix',
		statistics: stats,
		...(minCompletion && { filteredBy: { minCompletion: `${minCompletion}%` } }),
		...(resource && {
			filteredBy: { ...(minCompletion ? { minCompletion: `${minCompletion}%` } : {}), resource }
		}),
		...(direction && {
			filteredBy: {
				...(minCompletion ? { minCompletion: `${minCompletion}%` } : {}),
				...(resource ? { resource } : {}),
				direction
			}
		})
	});
}

// Create the endpoint
export const GET = createSimpleEndpoint({
	name: 'language-coverage-v2',

	params: [
		COMMON_PARAMS.organization,
		{
			name: 'minCompletion',
			type: 'number',
			validate: (value) => {
				if (!value) return true;
				const num = parseInt(value);
				return num >= 0 && num <= 100;
			}
		},
		{
			name: 'resource',
			validate: (value) => {
				if (!value) return true;
				return ['ult', 'ust', 'tn', 'tw', 'ta', 'tq', 'obs'].includes(value);
			}
		},
		{
			name: 'direction',
			validate: (value) => {
				if (!value) return true;
				return ['ltr', 'rtl'].includes(value);
			}
		}
	],

	fetch: getLanguageCoverage,

	onError: createStandardErrorHandler()
});

// CORS handler
export const OPTIONS = createCORSHandler();
