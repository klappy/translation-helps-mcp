import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { execSync } from 'child_process';

export const GET: RequestHandler = async () => {
	try {
		const commitHash = execSync('git rev-parse HEAD').toString().trim();
		const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
		const commitDate = execSync('git log -1 --pretty=%ci').toString().trim();
		
		return json({
			version: commitHash.substring(0, 7),
			fullHash: commitHash,
			message: commitMessage,
			date: commitDate,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return json({
			error: 'Could not determine version',
			timestamp: new Date().toISOString()
		});
	}
};