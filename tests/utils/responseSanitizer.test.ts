/**
 * Response Sanitizer Tests
 * 
 * Ensures the response sanitizer correctly removes diagnostic data
 * while preserving business data.
 */

import { describe, it, expect } from 'vitest';
import { 
  sanitizeResponseBody, 
  validateResponseBody, 
  isResponseBodyClean 
} from '../../src/utils/responseSanitizer.js';

describe('Response Sanitizer', () => {
  describe('sanitizeResponseBody', () => {
    it('removes xrayTrace from response body', () => {
      const dirtyResponse = {
        data: [{ text: 'John 3:16', language: 'en' }],
        metadata: { cached: true },
        xrayTrace: 'eyJzdGFydFRpbWUiOjE5NDU5fQ==',
        debug: { internal: 'info' }
      };
      
      const cleaned = sanitizeResponseBody(dirtyResponse);
      
      expect(cleaned).toEqual({
        data: [{ text: 'John 3:16', language: 'en' }],
        metadata: { cached: true }
      });
      expect(cleaned).not.toHaveProperty('xrayTrace');
      expect(cleaned).not.toHaveProperty('debug');
    });
    
    it('removes nested diagnostic data', () => {
      const dirtyResponse = {
        scripture: [
          {
            text: 'For God so loved the world...',
            citation: { resource: 'ULT' },
            _metadata: { xrayTrace: 'internal-trace' }
          }
        ],
        metadata: {
          cached: true,
          diagnostic: { traceId: 'abc123' }
        }
      };
      
      const cleaned = sanitizeResponseBody(dirtyResponse);
      
      expect(cleaned).toEqual({
        scripture: [
          {
            text: 'For God so loved the world...',
            citation: { resource: 'ULT' }
          }
        ],
        metadata: {
          cached: true
        }
      });
    });
    
    it('preserves all business data', () => {
      const businessResponse = {
        data: [
          {
            text: 'Scripture text',
            reference: 'John 3:16',
            resource: 'ULT',
            language: 'en',
            citation: 'John 3:16 (ULT)',
            organization: 'unfoldingWord'
          }
        ],
        metadata: {
          responseTime: 45,
          cached: true,
          timestamp: '2025-08-12T18:00:00Z'
        }
      };
      
      const cleaned = sanitizeResponseBody(businessResponse);
      
      expect(cleaned).toEqual(businessResponse);
    });
    
    it('handles arrays of objects', () => {
      const arrayResponse = [
        {
          text: 'Scripture 1',
          xrayTrace: 'trace1'
        },
        {
          text: 'Scripture 2', 
          debug: { internal: true }
        }
      ];
      
      const cleaned = sanitizeResponseBody(arrayResponse);
      
      expect(cleaned).toEqual([
        { text: 'Scripture 1' },
        { text: 'Scripture 2' }
      ]);
    });
    
    it('handles null and undefined', () => {
      expect(sanitizeResponseBody(null)).toBeNull();
      expect(sanitizeResponseBody(undefined)).toBeUndefined();
      expect(sanitizeResponseBody('')).toBe('');
      expect(sanitizeResponseBody(0)).toBe(0);
    });
    
    it('handles primitive values', () => {
      expect(sanitizeResponseBody('string')).toBe('string');
      expect(sanitizeResponseBody(123)).toBe(123);
      expect(sanitizeResponseBody(true)).toBe(true);
    });
  });
  
  describe('validateResponseBody', () => {
    it('detects forbidden diagnostic keys', () => {
      const dirtyResponse = {
        data: { text: 'content' },
        xrayTrace: 'trace-data',
        metadata: {
          cached: true,
          debug: { internal: true }
        }
      };
      
      const violations = validateResponseBody(dirtyResponse);
      
      expect(violations).toContain('xrayTrace');
      expect(violations).toContain('metadata.debug');
      expect(violations.length).toBe(2);
    });
    
    it('returns empty array for clean response', () => {
      const cleanResponse = {
        data: { text: 'content' },
        metadata: { cached: true }
      };
      
      const violations = validateResponseBody(cleanResponse);
      
      expect(violations).toEqual([]);
    });
    
    it('provides detailed paths for nested violations', () => {
      const nestedDirtyResponse = {
        data: [
          {
            content: 'text',
            _metadata: { xrayTrace: 'nested-trace' }
          }
        ]
      };
      
      const violations = validateResponseBody(nestedDirtyResponse);
      
      expect(violations).toContain('data[0]._metadata');
    });
  });
  
  describe('isResponseBodyClean', () => {
    it('returns true for clean response', () => {
      const cleanResponse = {
        data: { text: 'content' },
        metadata: { cached: true }
      };
      
      expect(isResponseBodyClean(cleanResponse)).toBe(true);
    });
    
    it('returns false for dirty response', () => {
      const dirtyResponse = {
        data: { text: 'content' },
        xrayTrace: 'trace-data'
      };
      
      expect(isResponseBodyClean(dirtyResponse)).toBe(false);
    });
  });
  
  describe('Real-world contamination scenarios', () => {
    it('cleans RouteGenerator xrayTrace contamination', () => {
      // This is the actual contamination pattern from RouteGenerator
      const contaminated = {
        data: [{ text: 'scripture' }],
        metadata: {
          responseTime: 45,
          cached: true,
          xrayTrace: 'eyJzdGFydFRpbWUiOjE5NDU5fQ=='
        }
      };
      
      const cleaned = sanitizeResponseBody(contaminated);
      
      expect(cleaned).toEqual({
        data: [{ text: 'scripture' }],
        metadata: {
          responseTime: 45,
          cached: true
        }
      });
      expect(isResponseBodyClean(cleaned)).toBe(true);
    });
    
    it('cleans handler-level trace injection', () => {
      // Pattern from various handlers that add xrayTrace to response
      const contaminated = {
        verseNotes: [{ note: 'content' }],
        citation: { resource: 'TN' },
        metadata: {
          sourceNotesCount: 15,
          verseNotesCount: 10,
          responseTime: 23,
          cached: true
        },
        xrayTrace: 'handler-injected-trace'
      };
      
      const cleaned = sanitizeResponseBody(contaminated);
      
      expect(cleaned).not.toHaveProperty('xrayTrace');
      expect(cleaned).toHaveProperty('verseNotes');
      expect(cleaned).toHaveProperty('metadata');
      expect(isResponseBodyClean(cleaned)).toBe(true);
    });
  });
});
