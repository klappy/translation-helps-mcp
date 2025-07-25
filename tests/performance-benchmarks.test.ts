/**
 * Performance Benchmark Tests
 * 
 * Ensures all endpoints meet performance requirements:
 * - Single verse: <200ms
 * - Verse range: <300ms
 * - Chapter: <500ms
 * - With caching: <100ms
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Test utilities
async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  maxMs: number
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;
  
  console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms (limit: ${maxMs}ms)`);
  
  expect(duration).toBeLessThan(maxMs);
  return result;
}

// Mock API endpoints for benchmarking
const API_BASE = process.env.API_URL || 'http://localhost:5173/api';

async function fetchEndpoint(path: string, params: Record<string, string> = {}) {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  const response = await fetch(url.toString());
  return response.json();
}

describe('Performance Benchmarks', () => {
  let cacheWarm = false;
  
  beforeAll(async () => {
    console.log('🚀 Running performance benchmarks...');
    console.log(`API Base: ${API_BASE}`);
    
    // Warm up cache with a few requests
    console.log('Warming up cache...');
    await fetchEndpoint('/fetch-scripture', { reference: 'John 3:16' });
    await fetchEndpoint('/fetch-translation-notes', { reference: 'John 3:16' });
    await fetchEndpoint('/fetch-translation-words', { word: 'faith' });
    cacheWarm = true;
    console.log('Cache warmed up ✓');
  });

  describe('Scripture Endpoints', () => {
    it('should fetch single verse in <200ms', async () => {
      await measurePerformance(
        'Single verse (John 3:16)',
        () => fetchEndpoint('/fetch-scripture', { reference: 'John 3:16' }),
        200
      );
    });

    it('should fetch verse range in <300ms', async () => {
      await measurePerformance(
        'Verse range (Romans 1:1-5)',
        () => fetchEndpoint('/fetch-scripture', { reference: 'Romans 1:1-5' }),
        300
      );
    });

    it('should fetch entire chapter in <500ms', async () => {
      await measurePerformance(
        'Full chapter (Psalm 23)',
        () => fetchEndpoint('/fetch-scripture', { reference: 'Psalm 23' }),
        500
      );
    });

    it('should fetch cached verse in <100ms', async () => {
      if (!cacheWarm) {
        console.log('Skipping cache test - cache not warmed');
        return;
      }
      
      // Request same verse twice, second should be cached
      await fetchEndpoint('/fetch-scripture', { reference: 'Genesis 1:1' });
      
      await measurePerformance(
        'Cached verse (Genesis 1:1)',
        () => fetchEndpoint('/fetch-scripture', { reference: 'Genesis 1:1' }),
        100
      );
    });
  });

  describe('Translation Notes', () => {
    it('should fetch verse notes in <300ms', async () => {
      await measurePerformance(
        'Verse notes (John 3:16)',
        () => fetchEndpoint('/fetch-translation-notes', { reference: 'John 3:16' }),
        300
      );
    });

    it('should fetch chapter notes in <500ms', async () => {
      await measurePerformance(
        'Chapter notes (John 3)',
        () => fetchEndpoint('/fetch-translation-notes', { reference: 'John 3' }),
        500
      );
    });
  });

  describe('Translation Words', () => {
    it('should fetch word definition in <200ms', async () => {
      await measurePerformance(
        'Word definition (love)',
        () => fetchEndpoint('/fetch-translation-words', { word: 'love' }),
        200
      );
    });

    it('should browse words in <300ms', async () => {
      await measurePerformance(
        'Browse words',
        () => fetchEndpoint('/browse-translation-words', {}),
        300
      );
    });

    it('should fetch word links in <250ms', async () => {
      await measurePerformance(
        'Word links (John 3:16)',
        () => fetchEndpoint('/fetch-translation-word-links', { reference: 'John 3:16' }),
        250
      );
    });
  });

  describe('Context Aggregation', () => {
    it('should fetch full context in <800ms', async () => {
      await measurePerformance(
        'Full context (John 3:16)',
        () => fetchEndpoint('/get-context', { reference: 'John 3:16' }),
        800
      );
    });

    it('should fetch multiple resources in <1000ms', async () => {
      await measurePerformance(
        'Multiple resources',
        () => fetchEndpoint('/fetch-resources', { 
          reference: 'John 3:16',
          resources: 'scripture,notes,words'
        }),
        1000
      );
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 10 concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        fetchEndpoint('/fetch-scripture', { reference: `John 3:${i + 1}` })
      );
      
      await measurePerformance(
        '10 concurrent requests',
        () => Promise.all(requests),
        2000 // Should complete all 10 in under 2 seconds
      );
    });

    it('should handle mixed concurrent requests', async () => {
      const requests = [
        fetchEndpoint('/fetch-scripture', { reference: 'John 1:1' }),
        fetchEndpoint('/fetch-translation-notes', { reference: 'John 1:1' }),
        fetchEndpoint('/fetch-translation-words', { word: 'word' }),
        fetchEndpoint('/browse-translation-words', {}),
        fetchEndpoint('/get-context', { reference: 'John 1:1' })
      ];
      
      await measurePerformance(
        '5 mixed concurrent requests',
        () => Promise.all(requests),
        1500
      );
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory under load', async () => {
      if (typeof global.gc !== 'function') {
        console.log('Skipping memory test - GC not exposed');
        return;
      }
      
      // Force garbage collection
      global.gc();
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        await fetchEndpoint('/fetch-scripture', { 
          reference: `John ${(i % 21) + 1}:${(i % 30) + 1}` 
        });
      }
      
      // Force garbage collection again
      global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      console.log(`Memory increase after 100 requests: ${memoryIncrease.toFixed(2)}MB`);
      
      // Should not increase by more than 50MB
      expect(memoryIncrease).toBeLessThan(50);
    });
  });

  describe('Cache Performance', () => {
    it('should show significant speedup with caching', async () => {
      const reference = 'Romans 8:28';
      
      // First request (cache miss)
      const start1 = performance.now();
      await fetchEndpoint('/fetch-scripture', { reference });
      const uncachedTime = performance.now() - start1;
      
      // Second request (cache hit)
      const start2 = performance.now();
      await fetchEndpoint('/fetch-scripture', { reference });
      const cachedTime = performance.now() - start2;
      
      console.log(`Uncached: ${uncachedTime.toFixed(2)}ms`);
      console.log(`Cached: ${cachedTime.toFixed(2)}ms`);
      console.log(`Speedup: ${(uncachedTime / cachedTime).toFixed(2)}x`);
      
      // Cached should be at least 2x faster
      expect(cachedTime).toBeLessThan(uncachedTime / 2);
    });
  });
});