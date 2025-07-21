import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		// Fetch the changelog from the root of the project
		const response = await fetch('/CHANGELOG.md');
		if (!response.ok) {
			throw new Error(`Failed to fetch changelog: ${response.status}`);
		}

		const changelog = await response.text();

		return {
			changelog
		};
	} catch (error) {
		console.error('Error loading changelog:', error);
		return {
			changelog: '# Changelog\n\nError loading changelog. Please check back later.',
			error: 'Failed to load changelog'
		};
	}
};
