/**
 * Netlify Function Wrapper for get-languages
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { getLanguagesHandler } from '../../src/functions/handlers/get-languages';

export const handler = createNetlifyHandler(getLanguagesHandler);
