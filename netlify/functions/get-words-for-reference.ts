/**
 * Netlify Function Wrapper for get-words-for-reference
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { getWordsForReferenceHandler } from '../../src/functions/handlers/get-words-for-reference';

export const handler = createNetlifyHandler(getWordsForReferenceHandler);
