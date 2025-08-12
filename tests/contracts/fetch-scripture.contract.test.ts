/**
 * Contract Tests for fetch-scripture Endpoint
 * 
 * These tests capture the EXACT behavior of the fetch-scripture endpoint
 * to prevent ANY regressions. This endpoint serves as the golden reference
 * for how all endpoints should behave.
 * 
 * CRITICAL: Do not modify these tests unless you intentionally want to 
 * change the API contract. All other endpoints must match this behavior.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';

// Import your SvelteKit app or server
// Note: You may need to adjust this import based on your setup
// import { app } from '../path/to/your/app';

const BASE_URL = 'http://localhost:8174';

/**
 * Expected headers that should be present in all responses
 */
const EXPECTED_HEADERS = [
  'cache-control',
  'content-type', 
  'x-cache-status',
  'x-response-time',
  'x-trace-id',
  'x-xray-trace',
  'x-xray-summary',
  'x-available-formats',
  'x-recommended-format-llm'
] as const;

/**
 * Static headers for golden snapshot (exclude dynamic values)
 */
const STATIC_HEADERS = [
  'cache-control',
  'content-type',
  'x-cache-status',
  'x-available-formats',
  'x-recommended-format-llm'
] as const;

/**
 * Headers that should NEVER contain diagnostic data in response body
 */
const _DIAGNOSTIC_HEADERS = [
  'x-xray-trace',
  'x-trace-id',
  'x-xray-summary'
] as const;

/**
 * Pick only allowed headers for golden snapshot
 */
function pickHeaders(headers: Record<string, unknown>, allowedHeaders: readonly string[]) {
  const picked: Record<string, string> = {};
  for (const header of allowedHeaders) {
    if (headers[header]) {
      picked[header] = headers[header] as string;
    }
  }
  return picked;
}

/**
 * Validate response body structure
 */
function validateScriptureResponse(body: unknown) {
  expect(body).toBeInstanceOf(Array);
  expect((body as unknown[]).length).toBeGreaterThan(0);
  
  for (const translation of body as unknown[]) {
    expect(translation).toHaveProperty('text');
    expect(translation).toHaveProperty('reference');
    expect(translation).toHaveProperty('resource');
    expect(translation).toHaveProperty('language');
    expect(translation).toHaveProperty('citation');
    expect(translation).toHaveProperty('organization');
    
    // CRITICAL: Response body must NEVER contain diagnostic fields
    expect(translation).not.toHaveProperty('xrayTrace');
    expect(translation).not.toHaveProperty('traceId');
    expect(translation).not.toHaveProperty('_metadata');
    expect(translation).not.toHaveProperty('debug');
  }
}

describe('fetch-scripture Contract Tests', () => {
  
  describe('Golden Reference Behavior', () => {
    
    it('John 3:16 - matches golden snapshot', async () => {
      const response = await request(BASE_URL)
        .get('/api/fetch-scripture')
        .query({
          reference: 'John 3:16',
          language: 'en',
          organization: 'unfoldingWord'
        });
      
      expect(response.status).toBe(200);
      
      // Validate response structure
      validateScriptureResponse(response.body);
      
      // Extract static headers for snapshot (exclude dynamic values)
      const staticHeaders = pickHeaders(response.headers, STATIC_HEADERS);
      
      // Validate dynamic headers exist but don't snapshot them
      expect(response.headers['x-response-time']).toBeDefined();
      expect(response.headers['x-trace-id']).toBeDefined();
      expect(response.headers['x-xray-trace']).toBeDefined();
      
      // Golden snapshot (commit this!)
      expect({
        status: response.status,
        staticHeaders,
        bodyStructure: {
          type: 'array',
          length: response.body.length,
          firstTranslation: {
            hasText: !!response.body[0]?.text,
            hasReference: !!response.body[0]?.reference,
            hasResource: !!response.body[0]?.resource,
            language: response.body[0]?.language,
            organization: response.body[0]?.organization
          }
        }
      }).toMatchSnapshot();
    });
    
    it('Genesis 1:1 - validates consistent structure', async () => {
      const response = await request(BASE_URL)
        .get('/api/fetch-scripture')
        .query({
          reference: 'Genesis 1:1',
          language: 'en',
          organization: 'unfoldingWord'
        });
      
      expect(response.status).toBe(200);
      validateScriptureResponse(response.body);
      
      // Headers must be consistent
      for (const header of EXPECTED_HEADERS) {
        expect(response.headers).toHaveProperty(header);
      }
    });
    
    it('Multi-verse passage - Psalm 23:1-4', async () => {
      const response = await request(BASE_URL)
        .get('/api/fetch-scripture')
        .query({
          reference: 'Psalm 23:1-4',
          language: 'en',
          organization: 'unfoldingWord'
        });
      
      expect(response.status).toBe(200);
      validateScriptureResponse(response.body);
      
      // Should contain multiple verses
      expect(response.body[0]?.text?.length).toBeGreaterThan(100);
    });
    
    it('Spanish translation - validates i18n support', async () => {
      const response = await request(BASE_URL)
        .get('/api/fetch-scripture')
        .query({
          reference: 'Romans 8:28',
          language: 'es',
          organization: 'unfoldingWord'
        });
      
      // Spanish may not be available for all resources, so check both cases
      if (response.status === 200) {
        validateScriptureResponse(response.body);
        expect(response.body[0]?.language).toBe('es');
      } else {
        // Should return proper error structure if language unavailable
        expect(response.status).toBe(400);
        expect(response.headers['content-type']).toContain('application/json');
      }
    });
  });
  
  describe('Header Behavior Validation', () => {
    
    it('ensures x-ray traces stay in headers only', async () => {
      const response = await request(BASE_URL)
        .get('/api/fetch-scripture')
        .query({
          reference: 'John 3:16',
          language: 'en',
          organization: 'unfoldingWord'
        });
      
      // X-ray data MUST be in headers
      expect(response.headers['x-xray-trace']).toBeDefined();
      expect(response.headers['x-trace-id']).toBeDefined();
      
      // X-ray data must NEVER be in response body
      const bodyStr = JSON.stringify(response.body);
      expect(bodyStr).not.toContain('xrayTrace');
      expect(bodyStr).not.toContain('traceId');
      expect(bodyStr).not.toContain('_metadata');
    });
    
    it('validates cache headers', async () => {
      const response = await request(BASE_URL)
        .get('/api/fetch-scripture')
        .query({
          reference: 'John 3:16',
          language: 'en',
          organization: 'unfoldingWord'
        });
      
      expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate');
      expect(response.headers['x-cache-status']).toMatch(/hit|miss/);
      expect(response.headers['x-response-time']).toBeDefined();
    });
    
    it('validates CORS headers', async () => {
      const response = await request(BASE_URL)
        .get('/api/fetch-scripture')
        .query({
          reference: 'John 3:16',
          language: 'en',
          organization: 'unfoldingWord'
        });
      
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-expose-headers']).toContain('X-Xray-Trace');
    });
  });
  
  describe('Error Handling Contract', () => {
    
    it('handles invalid reference gracefully', async () => {
      const response = await request(BASE_URL)
        .get('/api/fetch-scripture')
        .query({
          reference: 'InvalidBook 999:999',
          language: 'en',
          organization: 'unfoldingWord'
        });
      
      // Should return error but still have proper headers
      // Note: Error responses may not have all headers depending on where error occurs
      expect(response.headers['content-type']).toContain('application/json');
      
      // Status could be 400 (bad request) or 404 (not found)
      expect([400, 404, 500]).toContain(response.status);
    }, 10000); // Increase timeout for slow responses
    
    it('handles missing parameters', async () => {
      const response = await request(BASE_URL)
        .get('/api/fetch-scripture');
      
      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });
  
  describe('Performance Contract', () => {
    
    it('meets response time expectations', async () => {
      const response = await request(BASE_URL)
        .get('/api/fetch-scripture')
        .query({
          reference: 'John 3:16',
          language: 'en',
          organization: 'unfoldingWord'
        });
      
      const responseTime = parseInt(response.headers['x-response-time'], 10);
      
      // Response should be fast (under 1 second for cached content)
      expect(responseTime).toBeLessThan(1000);
      expect(responseTime).toBeGreaterThan(0);
    });
  });
});

/**
 * Anti-Regression Test: What NOT to have
 * 
 * This test specifically validates that we DON'T have the problems
 * that other endpoints currently suffer from.
 */
describe('fetch-scripture Anti-Regression Tests', () => {
  
  it('NEVER allows diagnostic data in response body', async () => {
    const response = await request(BASE_URL)
      .get('/api/fetch-scripture')
      .query({
        reference: 'John 3:16',
        language: 'en',
        organization: 'unfoldingWord'
      });
    
    const bodyStr = JSON.stringify(response.body);
    
    // These should NEVER appear in response body
    const forbiddenTerms = [
      'xrayTrace',
      'traceId', 
      '_metadata',
      'debug',
      'diagnostic',
      'trace',
      'internal:',
      'cache:cached:',
      'kv/catalog'
    ];
    
    for (const term of forbiddenTerms) {
      expect(bodyStr).not.toContain(term, 
        `Response body contains forbidden diagnostic term: ${term}`);
    }
  });
});
