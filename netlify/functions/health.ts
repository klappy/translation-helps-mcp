/**
 * Netlify Function Wrapper for health
 * Auto-generated from shared handler
 */

import { createNetlifyHandler } from '../../src/functions/platform-adapter';
import { healthHandler } from '../../src/functions/handlers/health';

export const handler = createNetlifyHandler(healthHandler);
