/**
 * Netlify Function Wrapper for browse-translation-words
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { browseTranslationWordsHandler } from '../../src/functions/handlers/browse-translation-words';

export const handler = createNetlifyHandler(browseTranslationWordsHandler);
