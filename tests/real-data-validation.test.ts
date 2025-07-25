/**
 * Real Data Validation Tests
 * 
 * These tests validate actual content, not just status codes.
 * Every test checks that the data returned is correct and complete.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { fetchScripture } from '../src/functions/fetch-scripture';
import { fetchTranslationNotes } from '../src/tools/fetchTranslationNotes';
import { fetchTranslationWords } from '../src/tools/fetchTranslationWords';
import { fetchTranslationWordLinks } from '../src/tools/fetchTranslationWordLinks';
import { getContext } from '../src/tools/getContext';

describe('Real Data Validation Tests', () => {
  beforeAll(() => {
    console.log('🔍 Running real data validation tests with actual Bible content...');
  });

  describe('Scripture Endpoints', () => {
    it('should return actual John 3:16 text', async () => {
      const result = await fetchScripture({
        reference: 'John 3:16',
        language: 'en',
        version: 'ult'
      });

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.text).toContain('God');
      expect(result.text).toContain('loved');
      expect(result.text).toContain('world');
      expect(result.text).toContain('Son');
      expect(result.text).toMatch(/eternal\s+life/i);
      
      // Validate it's not just placeholder text
      expect(result.text).not.toContain('Lorem ipsum');
      expect(result.text).not.toContain('TODO');
      expect(result.text).not.toContain('placeholder');
    });

    it('should handle verse ranges correctly', async () => {
      const result = await fetchScripture({
        reference: 'Romans 1:1-5',
        language: 'en',
        version: 'ult'
      });

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      
      // Should contain content from multiple verses
      expect(result.text).toContain('Paul');
      expect(result.text).toContain('servant');
      expect(result.text).toContain('apostle');
      expect(result.text).toContain('gospel');
      
      // Should be longer than a single verse
      expect(result.text.length).toBeGreaterThan(200);
    });

    it('should return entire chapter when requested', async () => {
      const result = await fetchScripture({
        reference: 'Psalm 23',
        language: 'en',
        version: 'ult'
      });

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      
      // Validate key phrases from different parts of the psalm
      expect(result.text).toContain('shepherd');
      expect(result.text).toContain('green pastures');
      expect(result.text).toContain('valley');
      expect(result.text).toContain('death');
      expect(result.text).toContain('goodness');
      expect(result.text).toContain('mercy');
      
      // Should be a complete chapter
      expect(result.text.length).toBeGreaterThan(500);
    });

    it('should preserve verse numbers when requested', async () => {
      const result = await fetchScripture({
        reference: 'Genesis 1:1-3',
        language: 'en',
        version: 'ult',
        includeVerseNumbers: true
      });

      expect(result.text).toMatch(/\b1\b/); // Verse 1
      expect(result.text).toMatch(/\b2\b/); // Verse 2
      expect(result.text).toMatch(/\b3\b/); // Verse 3
    });
  });

  describe('Translation Notes', () => {
    it('should return actual notes for John 3:16', async () => {
      const result = await fetchTranslationNotes({
        reference: 'John 3:16',
        language: 'en'
      });

      expect(result).toBeDefined();
      expect(result.notes).toBeDefined();
      expect(Array.isArray(result.notes)).toBe(true);
      expect(result.notes.length).toBeGreaterThan(0);
      
      // Validate note structure
      const firstNote = result.notes[0];
      expect(firstNote).toHaveProperty('reference');
      expect(firstNote).toHaveProperty('quote');
      expect(firstNote).toHaveProperty('note');
      
      // Validate note content relates to the verse
      const hasRelevantNote = result.notes.some(note => 
        note.note.toLowerCase().includes('love') ||
        note.note.toLowerCase().includes('world') ||
        note.note.toLowerCase().includes('son')
      );
      expect(hasRelevantNote).toBe(true);
    });

    it('should handle chapter-level notes', async () => {
      const result = await fetchTranslationNotes({
        reference: 'John 3',
        language: 'en'
      });

      expect(result.notes.length).toBeGreaterThan(10); // Chapter should have many notes
      
      // Should have notes from different verses
      const verses = new Set(result.notes.map(n => n.reference));
      expect(verses.size).toBeGreaterThan(5);
    });
  });

  describe('Translation Words', () => {
    it('should return actual definition for faith', async () => {
      const result = await fetchTranslationWords({
        word: 'faith',
        language: 'en'
      });

      expect(result).toBeDefined();
      expect(result.term).toBe('faith');
      expect(result.definition).toBeDefined();
      expect(result.definition.length).toBeGreaterThan(50);
      
      // Validate it contains expected content
      expect(result.definition.toLowerCase()).toContain('trust');
      expect(result.definition).not.toContain('TODO');
      expect(result.definition).not.toContain('placeholder');
    });

    it('should handle word variations', async () => {
      const result = await fetchTranslationWords({
        word: 'love',
        language: 'en'
      });

      expect(result).toBeDefined();
      expect(result.definition).toBeDefined();
      
      // Should discuss different aspects of love
      const content = result.definition.toLowerCase();
      expect(
        content.includes('god') ||
        content.includes('action') ||
        content.includes('care')
      ).toBe(true);
    });
  });

  describe('Translation Word Links', () => {
    it('should return correct word links for John 3:16', async () => {
      const result = await fetchTranslationWordLinks({
        reference: 'John 3:16',
        language: 'en'
      });

      expect(result).toBeDefined();
      expect(result.wordLinks).toBeDefined();
      expect(Array.isArray(result.wordLinks)).toBe(true);
      
      // Should link to key theological terms
      const linkedWords = result.wordLinks.map(link => link.word);
      expect(linkedWords).toContain('love');
      expect(linkedWords).toContain('believe');
      
      // Each link should have occurrence info
      result.wordLinks.forEach(link => {
        expect(link).toHaveProperty('word');
        expect(link).toHaveProperty('occurrence');
        expect(link).toHaveProperty('quote');
      });
    });

    it('should handle verses with many word links', async () => {
      const result = await fetchTranslationWordLinks({
        reference: 'Romans 1:1',
        language: 'en'
      });

      expect(result.wordLinks.length).toBeGreaterThan(3);
      
      // Should include key terms
      const words = result.wordLinks.map(l => l.word);
      expect(words).toContain('apostle');
      expect(words).toContain('servant');
    });
  });

  describe('Context Endpoint', () => {
    it('should aggregate multiple resources correctly', async () => {
      const result = await getContext({
        reference: 'John 3:16',
        language: 'en'
      });

      expect(result).toBeDefined();
      
      // Should have scripture
      expect(result.scripture).toBeDefined();
      expect(result.scripture.ult).toContain('God');
      expect(result.scripture.ult).toContain('loved');
      
      // Should have notes
      expect(result.notes).toBeDefined();
      expect(result.notes.length).toBeGreaterThan(0);
      
      // Should have linked words
      expect(result.words).toBeDefined();
      expect(result.words.length).toBeGreaterThan(0);
      
      // Metadata should be accurate
      expect(result.metadata.notesFound).toBe(result.notes.length);
      expect(result.metadata.wordsFound).toBe(result.words.length);
    });

    it('should handle deep analysis requests', async () => {
      const result = await getContext({
        reference: 'Romans 9:1-5',
        language: 'en',
        deepAnalysis: true
      });

      // Should include surrounding context
      expect(result.bookIntro).toBeDefined();
      expect(result.chapterIntro).toBeDefined();
      
      // Should have comprehensive data
      expect(result.notes.length).toBeGreaterThan(5);
      expect(result.words.length).toBeGreaterThan(5);
    });
  });

  describe('Edge Cases with Real Data', () => {
    it('should handle single-chapter books', async () => {
      const result = await fetchScripture({
        reference: 'Jude 1:1-5',
        language: 'en'
      });

      expect(result).toBeDefined();
      expect(result.text).toContain('Jude');
      expect(result.text).toContain('servant');
    });

    it('should handle books with different naming', async () => {
      const result1 = await fetchScripture({
        reference: '1 John 1:1',
        language: 'en'
      });
      
      const result2 = await fetchScripture({
        reference: '1John 1:1',
        language: 'en'
      });
      
      // Both formats should work
      expect(result1.text).toBeDefined();
      expect(result2.text).toBeDefined();
      expect(result1.text).toBe(result2.text);
    });

    it('should handle last verse of a book', async () => {
      const result = await fetchScripture({
        reference: 'Revelation 22:21',
        language: 'en'
      });

      expect(result).toBeDefined();
      expect(result.text).toContain('grace');
      expect(result.text).toContain('Amen');
    });
  });
});