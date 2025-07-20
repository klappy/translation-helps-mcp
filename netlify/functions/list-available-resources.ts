/**
 * Netlify Function Wrapper for list-available-resources
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { listAvailableResourcesHandler } from '../../src/functions/handlers/list-available-resources';

export const handler = createNetlifyHandler(listAvailableResourcesHandler);
