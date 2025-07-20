/**
 * Netlify Function Wrapper for get-context
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { getContextHandler } from '../../src/functions/handlers/get-context';

export const handler = createNetlifyHandler(getContextHandler);
