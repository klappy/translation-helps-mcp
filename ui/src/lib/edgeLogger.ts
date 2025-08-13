/**
 * Edge-Compatible Logger
 *
 * Simple logger that works in edge runtime
 */

const LOG_LEVELS = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3
} as const;

const currentLevel = LOG_LEVELS.info;

export const edgeLogger = {
	debug: (message: string, data?: any) => {
		if (currentLevel <= LOG_LEVELS.debug) {
			console.log(`[DEBUG] ${message}`, data || '');
		}
	},

	info: (message: string, data?: any) => {
		if (currentLevel <= LOG_LEVELS.info) {
			console.log(`[INFO] ${message}`, data || '');
		}
	},

	warn: (message: string, data?: any) => {
		if (currentLevel <= LOG_LEVELS.warn) {
			console.warn(`[WARN] ${message}`, data || '');
		}
	},

	error: (message: string, data?: any) => {
		if (currentLevel <= LOG_LEVELS.error) {
			console.error(`[ERROR] ${message}`, data || '');
		}
	}
};
