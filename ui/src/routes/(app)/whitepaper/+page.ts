import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		// Fetch the whitepaper from the static directory
		const response = await fetch('/WHITEPAPER.md');
		if (!response.ok) {
			throw new Error(`Failed to fetch whitepaper: ${response.status}`);
		}

		const whitepaper = await response.text();

		return {
			whitepaper
		};
	} catch (error) {
		console.error('Error loading whitepaper:', error);
		return {
			whitepaper: '# Whitepaper\n\nError loading whitepaper. Please check back later.',
			error: 'Failed to load whitepaper'
		};
	}
};
