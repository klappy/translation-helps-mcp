/**
 * Netlify Function Wrapper for fetch-translation-questions
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { fetchTranslationQuestionsHandler } from '../../src/functions/handlers/fetch-translation-questions';

export const handler = createNetlifyHandler(fetchTranslationQuestionsHandler);
