/**
 * MCP Configuration API
 *
 * GET /api/mcp-config
 *
 * Returns endpoint configurations for the MCP Tools interface
 */

import { json } from '@sveltejs/kit';
import type {
	ResponseFieldDescription,
	ResponseShape
} from '../../../../../src/config/EndpointConfig.js';
import {
	endpointRegistry,
	initializeAllEndpoints
} from '../../../../../src/config/endpoints/index.js';
import type { RequestHandler } from './$types';

// Build a flattened view of field descriptions for LLM self-discovery
function buildSelfDiscovery(shape: ResponseShape) {
	const fields: Array<
		ResponseFieldDescription & {
			path: string;
		}
	> = [];

	function walk(current: ResponseShape, path: string) {
		// Collect any fieldDescriptions at this level
		if (current.structure.fieldDescriptions && current.structure.fieldDescriptions.length) {
			for (const fd of current.structure.fieldDescriptions) {
				fields.push({ ...fd, path: path ? `${path}.${fd.name}` : fd.name });
			}
		}

		// Walk nested shapes
		if (current.structure.nested) {
			for (const [key, nestedShape] of Object.entries(current.structure.nested)) {
				walk(nestedShape, path ? `${path}.${key}` : key);
			}
		}

		// Walk array item shapes
		if (current.structure.arrayItems) {
			const nextPath = path ? `${path}[]` : '[]';
			walk(current.structure.arrayItems, nextPath);
		}
	}

	walk(shape, '');

	return {
		dataType: shape.dataType,
		fields
	};
}

export const GET: RequestHandler = async () => {
	try {
		// Initialize endpoints if not already done
		initializeAllEndpoints();

		// Get all registered endpoints and convert to array
		const endpointsObj = endpointRegistry.getAll();
		const endpoints = Object.values(endpointsObj);

		// Attach self-discovery info without mutating registry objects
		const enhanced = endpoints.map((e) => ({
			...e,
			selfDiscovery: buildSelfDiscovery(e.responseShape)
		}));

		const categorizedEndpoints = {
			core: enhanced.filter((e) => e.category === 'core'),
			extended: enhanced.filter((e) => e.category === 'extended'),
			experimental: enhanced.filter((e) => e.category === 'experimental')
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
