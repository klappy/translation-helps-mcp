/**
 * Netlify Function Wrapper for fetch-scripture
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { fetchScriptureHandler } from '../../src/functions/handlers/fetch-scripture';

export const handler = createNetlifyHandler(fetchScriptureHandler);
