/**
 * Netlify Function Wrapper for get-languages
 * Auto-generated from shared handler with Netlify Blobs caching
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { getLanguagesHandler } from '../../src/functions/handlers/get-languages';
import { NetlifyCacheAdapter } from '../../src/functions/caches/netlify-cache';

const cache = new NetlifyCacheAdapter();
export const handler = createNetlifyHandler(getLanguagesHandler, cache);
