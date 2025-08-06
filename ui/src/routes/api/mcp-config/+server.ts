/**
 * MCP Configuration API
 *
 * GET /api/mcp-config
 *
 * Returns endpoint configurations for the MCP Tools interface
 */

import { json } from '@sveltejs/kit';
import {
	endpointRegistry,
	initializeAllEndpoints
} from '../../../../../src/config/endpoints/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Initialize endpoints if not already done
		initializeAllEndpoints();

		// Get all registered endpoints and convert to array
		const endpointsObj = endpointRegistry.getAll();
		const endpoints = Object.values(endpointsObj);

		const categorizedEndpoints = {
			core: endpoints.filter((e) => e.category === 'core'),
			extended: endpoints.filter((e) => e.category === 'extended'),
			experimental: endpoints.filter((e) => e.category === 'experimental')
		};

		return json({
			success: true,
			data: categorizedEndpoints,
			timestamp: new Date().toISOString(),
			registry: {
				total: endpoints.length,
				byCategory: {
					core: categorizedEndpoints.core.length,
					extended: categorizedEndpoints.extended.length,
					experimental: categorizedEndpoints.experimental.length
				}
			}
		});
	} catch (error) {
		console.error('Failed to load MCP configuration:', error);

		return json(
			{
				success: false,
				error: 'Failed to load endpoint configurations',
				message: error instanceof Error ? error.message : String(error)
			},
			{ status: 500 }
		);
	}
};
