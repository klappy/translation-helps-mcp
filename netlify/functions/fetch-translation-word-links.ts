/**
 * Netlify Function Wrapper for fetch-translation-word-links
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { fetchTranslationWordLinksHandler } from '../../src/functions/handlers/fetch-translation-word-links';

export const handler = createNetlifyHandler(fetchTranslationWordLinksHandler);
