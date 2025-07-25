/**
 * Endpoint Configuration Index
 * 
 * Registers all endpoint configurations with the registry.
 */

import { EndpointRegistry } from '../EndpointRegistry';
import { ScriptureEndpoints } from './ScriptureEndpoints';
import { TranslationHelpsEndpoints } from './TranslationHelpsEndpoints';
import { TranslationAcademyEndpoints } from './TranslationAcademyEndpoints';
import { DiscoveryEndpoints } from './DiscoveryEndpoints';
import { ContextEndpoints } from './ContextEndpoints';

// Combine all endpoints
const allEndpoints = [
  ...ScriptureEndpoints,
  ...TranslationHelpsEndpoints,
  ...TranslationAcademyEndpoints,
  ...DiscoveryEndpoints,
  ...ContextEndpoints
];

// Register all endpoints
export function registerAllEndpoints(): void {
  for (const endpoint of allEndpoints) {
    EndpointRegistry.register(endpoint);
  }
}

// Export individual endpoint groups
export {
  ScriptureEndpoints,
  TranslationHelpsEndpoints,
  TranslationAcademyEndpoints,
  DiscoveryEndpoints,
  ContextEndpoints
};