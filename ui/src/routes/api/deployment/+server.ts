import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// Deployment marker - this should be updated by CI/CD
const DEPLOYMENT_ID = 'e255b21-2024-07-26-fix-twl';

export const GET: RequestHandler = async () => {
	return json({
		deployed: true,
		deploymentId: DEPLOYMENT_ID,
		timestamp: new Date().toISOString()
	});
};