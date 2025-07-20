/**
 * Netlify Function Wrapper for fetch-translation-notes
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { fetchTranslationNotesHandler } from '../../src/functions/handlers/fetch-translation-notes';

export const handler = createNetlifyHandler(fetchTranslationNotesHandler);
