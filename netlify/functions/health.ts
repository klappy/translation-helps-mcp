/**
 * Netlify Function Wrapper for health
 * Auto-generated from shared handler with Netlify Blobs caching
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { healthHandler } from '../../src/functions/handlers/health';
import { NetlifyCacheAdapter } from '../../src/functions/caches/netlify-cache';

const cache = new NetlifyCacheAdapter();
export const handler = createNetlifyHandler(healthHandler, cache);
