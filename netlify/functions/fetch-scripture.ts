/**
 * Netlify Function Wrapper for fetch-scripture
 * Auto-generated from shared handler with Netlify Blobs caching
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { fetchScriptureHandler } from '../../src/functions/handlers/fetch-scripture';
import { NetlifyCacheAdapter } from '../../src/functions/caches/netlify-cache';

const cache = new NetlifyCacheAdapter();
export const handler = createNetlifyHandler(fetchScriptureHandler, cache);
