/**
 * Netlify Function Wrapper for fetch-resources
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { fetchResourcesHandler } from '../../src/functions/handlers/fetch-resources';

export const handler = createNetlifyHandler(fetchResourcesHandler);
