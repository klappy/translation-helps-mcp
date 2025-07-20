/**
 * Netlify Function Wrapper for extract-references
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { extractReferencesHandler } from '../../src/functions/handlers/extract-references';

export const handler = createNetlifyHandler(extractReferencesHandler);
