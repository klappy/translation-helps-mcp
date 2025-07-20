/**
 * Netlify Function Wrapper for fetch-translation-words
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { fetchTranslationWordsHandler } from '../../src/functions/handlers/fetch-translation-words';

export const handler = createNetlifyHandler(fetchTranslationWordsHandler);
