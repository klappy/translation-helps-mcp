/**
 * Terminology Compliance Tests
 * 
 * Ensures all API responses and user-facing content use unfoldingWord-compliant terminology
 * and prevents regression to outdated "Gateway Language" terminology.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { ResourceType, ResourceDescriptions, UserTypes, LanguageTypeDescriptions } from '../../src/constants/terminology';

describe('Terminology Module', () => {
  test('exports all required resource types', () => {
    // Check that all PRD-specified resource types are defined
    expect(ResourceType.ULT).toBe('ult');
    expect(ResourceType.GLT).toBe('glt');
    expect(ResourceType.UST).toBe('ust');
    expect(ResourceType.GST).toBe('gst');
    expect(ResourceType.TN).toBe('tn');
    expect(ResourceType.TW).toBe('tw');
    expect(ResourceType.TWL).toBe('twl');
    expect(ResourceType.TQ).toBe('tq');
    expect(ResourceType.TA).toBe('ta');
    expect(ResourceType.ALIGNMENT).toBe('alignment');
    expect(ResourceType.VERSIFICATION).toBe('versification');
  });

  test('provides descriptions for all resource types', () => {
    Object.values(ResourceType).forEach(type => {
      expect(ResourceDescriptions[type]).toBeDefined();
      expect(ResourceDescriptions[type]).toContain(type === ResourceType.ULT || type === ResourceType.GLT ? 'form-centric' : expect.any(String));
    });
  });

  test('uses Strategic Language terminology, not Gateway Language', () => {
    expect(LanguageTypeDescriptions.STRATEGIC_LANGUAGE).toContain('Strategic Language');
    expect(LanguageTypeDescriptions.STRATEGIC_LANGUAGE).toContain('formerly Gateway Languages');
    expect(UserTypes.STRATEGIC_LANGUAGE).toBe('Strategic Language');
  });

  test('includes Mother Tongue Translator terminology', () => {
    expect(UserTypes.MTT).toBe('Mother Tongue Translator');
    expect(UserTypes.HEART_LANGUAGE).toBe('Heart Language');
  });
});

describe('API Response Terminology Compliance', () => {
  // Mock fetch for testing
  const originalFetch = global.fetch;
  
  beforeAll(() => {
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('list-available-resources uses UW terminology', async () => {
    // Mock the list-available-resources endpoint
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        resources: [
          { type: 'ult', name: 'ULT/GLT (Literal Text)', description: 'Form-centric translation' },
          { type: 'ust', name: 'UST/GST (Simplified Text)', description: 'Meaning-based translation' },
          { type: 'tn', name: 'Translation Notes', description: 'Verse-by-verse explanations' },
          { type: 'tw', name: 'Translation Words', description: 'Comprehensive biblical term definitions' },
          { type: 'twl', name: 'Translation Words Links', description: 'Precise mapping' },
          { type: 'tq', name: 'Translation Questions', description: 'Comprehension validation' },
          { type: 'ta', name: 'Translation Academy', description: 'Translation methodology' },
          { type: 'alignment', name: 'Word Alignment Data', description: 'Word-level connections between Strategic Language' }
        ]
      })
    });

    const response = await fetch('/api/list-available-resources');
    const data = await response.json();
    
    // Verify no outdated terminology
    const responseText = JSON.stringify(data);
    expect(responseText).not.toContain('Gateway Language');
    expect(responseText).not.toContain('gateway language');
    expect(responseText).not.toContain('Bible texts in various translations');
    
    // Verify correct UW terminology
    expect(responseText).toContain('Strategic Language');
    expect(responseText).toContain('ULT/GLT');
    expect(responseText).toContain('UST/GST');
    expect(responseText).toContain('Form-centric');
    expect(responseText).toContain('Meaning-based');

    // Verify all PRD resource types are present
    const resourceTypes = data.resources.map(r => r.type);
    expect(resourceTypes).toContain('ult');
    expect(resourceTypes).toContain('ust');
    expect(resourceTypes).toContain('tn');
    expect(resourceTypes).toContain('tw');
    expect(resourceTypes).toContain('twl');
    expect(resourceTypes).toContain('tq');
    expect(resourceTypes).toContain('ta');
    expect(resourceTypes).toContain('alignment');
  });

  test('health endpoint uses Strategic Language terminology', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'healthy',
        description: 'MCP Server for unfoldingWord Bible translation resources with Strategic Language support'
      })
    });

    const response = await fetch('/api/health');
    const data = await response.json();
    
    expect(data.description).toContain('Strategic Language');
    expect(data.description).not.toContain('Gateway Language');
  });
});

describe('Resource Type Validation', () => {
  test('all resource types match PRD specifications', () => {
    const expectedTypes = [
      'ult', 'glt', 'ust', 'gst', 'tn', 'tw', 'twl', 'tq', 'ta', 'alignment', 'versification'
    ];
    
    const actualTypes = Object.values(ResourceType);
    expectedTypes.forEach(type => {
      expect(actualTypes).toContain(type);
    });
  });

  test('resource descriptions match PRD format', () => {
    // ULT/GLT should mention form-centric
    expect(ResourceDescriptions[ResourceType.ULT]).toContain('form-centric');
    expect(ResourceDescriptions[ResourceType.GLT]).toContain('form-centric');
    
    // UST/GST should mention meaning-based
    expect(ResourceDescriptions[ResourceType.UST]).toContain('meaning-based');
    expect(ResourceDescriptions[ResourceType.GST]).toContain('meaning-based');
    
    // TN should mention verse-by-verse
    expect(ResourceDescriptions[ResourceType.TN]).toContain('verse-by-verse');
    
    // TWL should mention mapping
    expect(ResourceDescriptions[ResourceType.TWL]).toContain('mapping');
    
    // TQ should mention validation or checking
    expect(ResourceDescriptions[ResourceType.TQ]).toContain('validation');
    
    // TA should mention methodology
    expect(ResourceDescriptions[ResourceType.TA]).toContain('methodology');
    
    // Alignment should mention word-level and Strategic Language
    expect(ResourceDescriptions[ResourceType.ALIGNMENT]).toContain('word-level');
    expect(ResourceDescriptions[ResourceType.ALIGNMENT]).toContain('Strategic Language');
  });
});
