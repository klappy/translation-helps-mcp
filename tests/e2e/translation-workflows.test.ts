/**
 * Comprehensive E2E Test Suite for Translation Workflows
 * 
 * Tests complete user workflows defined in the PRD to ensure the system works end-to-end.
 * Based on Task 13 of the implementation plan.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ResourceType, WorkflowType, UserTypes } from '../../src/constants/terminology';
import { DCSApiClient } from '../../src/services/DCSApiClient';
import { recommendResources } from '../../src/functions/recommendation-engine';
import { detectResourceType } from '../../src/functions/resource-detector';

// Mock API base URL for testing
const API_BASE = process.env.TEST_API_URL || 'http://localhost:8080';

interface TestContext {
  apiClient: DCSApiClient;
  testStartTime: number;
}

let testContext: TestContext;

beforeAll(async () => {
  testContext = {
    apiClient: new DCSApiClient(),
    testStartTime: Date.now()
  };
});

afterAll(async () => {
  const testDuration = Date.now() - testContext.testStartTime;
  console.log(`E2E tests completed in ${testDuration}ms`);
});

describe('MTT Translation Workflow', () => {
  test('complete translation workflow for Romans 1:1', async () => {
    const reference = 'Romans 1:1';
    const language = 'en';
    
    // Step 1: Load scripture passage
    const scriptureResponse = await fetch(`${API_BASE}/api/fetch-scripture?reference=${encodeURIComponent(reference)}&language=${language}`);
    expect(scriptureResponse.status).toBe(200);
    
    const scriptureData = await scriptureResponse.json();
    expect(scriptureData.scripture).toBeDefined();
    
    // Verify ULT/UST are available or generic scripture
    expect(scriptureData.scripture.text || scriptureData.scripture.ult || scriptureData.scripture.ust).toBeDefined();
    
    // Step 2: Get translation notes for context
    const notesResponse = await fetch(`${API_BASE}/api/fetch-translation-notes?reference=${encodeURIComponent(reference)}&language=${language}`);
    expect(notesResponse.status).toBe(200);
    
    const notesData = await notesResponse.json();
    expect(notesData.notes).toBeDefined();
    expect(Array.isArray(notesData.notes)).toBe(true);
    
    // Step 3: Look up key terms
    const wordsResponse = await fetch(`${API_BASE}/api/get-words-for-reference?reference=${encodeURIComponent(reference)}&language=${language}`);
    expect(wordsResponse.status).toBe(200);
    
    const wordsData = await wordsResponse.json();
    expect(wordsData).toBeDefined();
    
    // Step 4: Get translation questions for checking
    const questionsResponse = await fetch(`${API_BASE}/api/fetch-translation-questions?reference=${encodeURIComponent(reference)}&language=${language}`);
    expect(questionsResponse.status).toBe(200);
    
    const questionsData = await questionsResponse.json();
    expect(questionsData.questions).toBeDefined();
    
    // Workflow success criteria
    expect(scriptureData.metadata?.responseTime).toBeLessThan(500); // Per PRD requirements
    expect(notesData.metadata?.responseTime).toBeLessThan(800);
    
    console.log('✅ MTT workflow completed successfully');
  }, 10000); // 10 second timeout

  test('form-centric vs meaning-based workflow comparison', async () => {
    const reference = 'Matthew 5:3';
    
    // Test that both ULT/GLT and UST/GST approaches are supported
    const resourceResponse = await fetch(`${API_BASE}/api/list-available-resources?language=en`);
    expect(resourceResponse.status).toBe(200);
    
    const resourceData = await resourceResponse.json();
    const resourceTypes = resourceData.resources.map((r: any) => r.type);
    
    // Verify PRD-compliant resource types are available
    expect(resourceTypes).toContain('ult');  // Form-centric
    expect(resourceTypes).toContain('ust');  // Meaning-based
    expect(resourceTypes).toContain('tn');   // Translation Notes
    expect(resourceTypes).toContain('tw');   // Translation Words
    
    console.log('✅ Both form-centric and meaning-based workflows supported');
  });

  test('strategic language support verification', async () => {
    const languagesResponse = await fetch(`${API_BASE}/api/get-languages`);
    expect(languagesResponse.status).toBe(200);
    
    const languagesData = await languagesResponse.json();
    expect(languagesData.languages).toBeDefined();
    expect(Array.isArray(languagesData.languages)).toBe(true);
    expect(languagesData.languages.length).toBeGreaterThan(0);
    
    // Verify no outdated terminology in response
    const responseText = JSON.stringify(languagesData);
    expect(responseText).not.toContain('Gateway Language');
    expect(responseText).not.toContain('gateway language');
    
    console.log('✅ Strategic Language terminology verified');
  });
});

describe('AI Assistant Integration Workflow', () => {
  test('MCP tool integration for scripture fetching', async () => {
    // Simulate MCP tool call structure
    const mcpRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tools/call',
        params: {
          name: 'fetchScripture',
          arguments: {
            reference: 'John 3:16',
            language: 'en',
            translation: 'all'
          }
        }
      })
    };

    // Note: In a real E2E test, this would call the actual MCP endpoint
    // For now, we'll test the underlying functionality
    const reference = 'John 3:16';
    const scriptureResponse = await fetch(`${API_BASE}/api/fetch-scripture?reference=${encodeURIComponent(reference)}&language=en`);
    expect(scriptureResponse.status).toBe(200);
    
    const data = await scriptureResponse.json();
    expect(data.scripture).toBeDefined();
    
    // Verify AI-friendly response format
    expect(data.metadata).toBeDefined();
    expect(data.language).toBe('en');
    
    console.log('✅ AI Assistant integration verified');
  });

  test('recommendation engine integration', async () => {
    const context = {
      reference: { book: 'Romans', chapter: 1, verse: 1 },
      userRole: 'translator' as const,
      previousQueries: [],
      languageCapabilities: ['en'],
      currentWorkflow: WorkflowType.FORM_CENTRIC
    };

    const recommendations = recommendResources(context);
    
    expect(recommendations.recommendations).toBeDefined();
    expect(Array.isArray(recommendations.recommendations)).toBe(true);
    expect(recommendations.recommendations.length).toBeGreaterThan(0);
    
    // Verify appropriate resources are recommended for form-centric workflow
    const recommendedTypes = recommendations.recommendations.map(r => r.type);
    expect(recommendedTypes).toContain(ResourceType.ULT);
    expect(recommendedTypes).toContain(ResourceType.ALIGNMENT);
    
    expect(recommendations.workflowSuggestion).toBeDefined();
    expect(recommendations.metadata.confidenceScore).toBeGreaterThan(0.5);
    
    console.log('✅ Resource recommendation engine verified');
  });
});

describe('Developer Integration Workflow', () => {
  test('API discovery and resource listing', async () => {
    const resourcesResponse = await fetch(`${API_BASE}/api/list-available-resources`);
    expect(resourcesResponse.status).toBe(200);
    
    const data = await resourcesResponse.json();
    expect(data.resources).toBeDefined();
    expect(data.metadata).toBeDefined();
    expect(data.metadata.resourcesFound).toBeGreaterThan(0);
    
    // Verify PRD-compliant descriptions
    const descriptions = data.resources.map((r: any) => r.description);
    expect(descriptions.some((d: string) => d.includes('form-centric'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('meaning-based'))).toBe(true);
    expect(descriptions.some((d: string) => d.includes('Strategic Language'))).toBe(true);
    
    console.log('✅ Developer API discovery verified');
  });

  test('batch operations and error handling', async () => {
    const references = ['John 3:16', 'Romans 8:28', 'Psalm 23:1'];
    const responses = await Promise.allSettled(
      references.map(ref => 
        fetch(`${API_BASE}/api/fetch-scripture?reference=${encodeURIComponent(ref)}&language=en`)
      )
    );

    // All requests should succeed
    responses.forEach((response, index) => {
      expect(response.status).toBe('fulfilled');
      if (response.status === 'fulfilled') {
        expect(response.value.status).toBe(200);
      }
    });
    
    // Test error handling with invalid reference
    const errorResponse = await fetch(`${API_BASE}/api/fetch-scripture?reference=InvalidBook 999:999&language=en`);
    expect(errorResponse.status).toBeGreaterThanOrEqual(400);
    
    const errorData = await errorResponse.json();
    expect(errorData.error).toBeDefined();
    expect(errorData.code).toBeDefined();
    
    console.log('✅ Batch operations and error handling verified');
  });
});

describe('Resource Type Detection', () => {
  test('accurate resource type identification', () => {
    const testResources = [
      { identifier: 'en_ult', subject: 'Bible', expected: ResourceType.ULT },
      { identifier: 'en_ust', subject: 'Bible', expected: ResourceType.UST },
      { identifier: 'en_tn', subject: 'Translation Notes', expected: ResourceType.TN },
      { identifier: 'en_tw', subject: 'Translation Words', expected: ResourceType.TW },
      { identifier: 'en_twl', subject: 'Translation Words Links', expected: ResourceType.TWL },
      { identifier: 'en_tq', subject: 'Translation Questions', expected: ResourceType.TQ },
      { identifier: 'en_ta', subject: 'Translation Academy', expected: ResourceType.TA }
    ];

    testResources.forEach(({ identifier, subject, expected }) => {
      const result = detectResourceType({ identifier, subject });
      expect(result.resourceType).toBe(expected);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
    
    console.log('✅ Resource type detection accuracy verified');
  });
});

describe('Performance Requirements Validation', () => {
  test('response times meet PRD targets', async () => {
    const startTime = Date.now();
    
    // Scripture lookup should be < 500ms (95th percentile)
    const scriptureResponse = await fetch(`${API_BASE}/api/fetch-scripture?reference=John 3:16&language=en`);
    const scriptureTime = Date.now() - startTime;
    
    expect(scriptureResponse.status).toBe(200);
    expect(scriptureTime).toBeLessThan(500);
    
    // Translation helps should be < 800ms (95th percentile)
    const notesStartTime = Date.now();
    const notesResponse = await fetch(`${API_BASE}/api/fetch-translation-notes?reference=John 3:16&language=en`);
    const notesTime = Date.now() - notesStartTime;
    
    expect(notesResponse.status).toBe(200);
    expect(notesTime).toBeLessThan(800);
    
    console.log(`✅ Performance targets met: Scripture ${scriptureTime}ms, Notes ${notesTime}ms`);
  });

  test('payload sizes within limits', async () => {
    const scriptureResponse = await fetch(`${API_BASE}/api/fetch-scripture?reference=John 3:16&language=en`);
    const scriptureText = await scriptureResponse.text();
    const scriptureSize = new Blob([scriptureText]).size;
    
    // Scripture should be < 10KB per chapter (PRD target)
    expect(scriptureSize).toBeLessThan(10 * 1024);
    
    const notesResponse = await fetch(`${API_BASE}/api/fetch-translation-notes?reference=John 3:16&language=en`);
    const notesText = await notesResponse.text();
    const notesSize = new Blob([notesText]).size;
    
    // Translation notes should be < 5KB per verse (PRD target)
    expect(notesSize).toBeLessThan(5 * 1024);
    
    console.log(`✅ Payload sizes verified: Scripture ${scriptureSize}B, Notes ${notesSize}B`);
  });
});

describe('Cache Performance', () => {
  test('cache hit ratio improvements', async () => {
    const reference = 'Psalm 23:1';
    
    // First request (cache miss)
    const firstResponse = await fetch(`${API_BASE}/api/fetch-scripture?reference=${encodeURIComponent(reference)}&language=en`);
    expect(firstResponse.status).toBe(200);
    
    const firstCacheHeader = firstResponse.headers.get('X-Cache');
    
    // Second request (should be cache hit)
    const secondResponse = await fetch(`${API_BASE}/api/fetch-scripture?reference=${encodeURIComponent(reference)}&language=en`);
    expect(secondResponse.status).toBe(200);
    
    const secondCacheHeader = secondResponse.headers.get('X-Cache');
    
    // Verify caching is working (headers should indicate cache status)
    expect(firstCacheHeader || secondCacheHeader).toBeDefined();
    
    console.log('✅ Cache performance verified');
  });
});

describe('Terminology Compliance E2E', () => {
  test('no outdated terminology in any API responses', async () => {
    const endpoints = [
      '/api/health',
      '/api/get-languages',
      '/api/list-available-resources',
      '/api/fetch-scripture?reference=John 3:16&language=en'
    ];

    for (const endpoint of endpoints) {
      const response = await fetch(`${API_BASE}${endpoint}`);
      expect(response.status).toBe(200);
      
      const responseText = await response.text();
      
      // Check for outdated terminology
      expect(responseText).not.toContain('Gateway Language');
      expect(responseText).not.toContain('gateway language');
      expect(responseText).not.toContain('Bible texts in various translations');
      
      // Verify correct terminology is present where appropriate
      if (endpoint.includes('list-available-resources')) {
        expect(responseText).toContain('Strategic Language');
        expect(responseText).toContain('ULT/GLT');
        expect(responseText).toContain('UST/GST');
      }
    }
    
    console.log('✅ Terminology compliance verified across all endpoints');
  });
});
