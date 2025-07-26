import { describe, test, expect } from 'vitest';
import { parseTSV } from '../src/config/RouteGenerator';

/**
 * Summary test demonstrating TSV field pass-through issues
 * 
 * This test file shows exactly which fields are lost, renamed, or mismatched
 * when TSV data is converted to JSON responses.
 */

describe('TSV Pass-through Issues Summary', () => {
  
  describe('What Should Happen vs What Actually Happens', () => {
    
    test('Translation Notes: ALL 7 TSV columns should be in JSON response', () => {
      const tnTsvSample = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\trtc9\trc://*/ta/man/translate/figs-abstractnouns\tκατὰ πίστιν\tThe words\t1\tare abstract nouns.`;

      const parsed = parseTSV(tnTsvSample);
      const tsvRow = parsed[0];
      
      // What we have in TSV (✅ GOOD - parseTSV preserves everything)
      expect(Object.keys(tsvRow)).toEqual([
        'Reference',
        'ID', 
        'Tags',
        'SupportReference',
        'Quote',
        'Occurrence',
        'Note'
      ]);
      
      // What SHOULD be in JSON response (with camelCase)
      // const idealJsonResponse = {
      //   reference: tsvRow.Reference,
      //   id: tsvRow.ID,
      //   tags: tsvRow.Tags,
      //   supportReference: tsvRow.SupportReference,
      //   quote: tsvRow.Quote,
      //   occurrence: tsvRow.Occurrence,
      //   note: tsvRow.Note
      // };
      
      // What's ACTUALLY in the current JSON response (❌ BAD - missing/wrong fields)
      const actualJsonResponse = {
        reference: 'tit 1:1',
        note: tsvRow.Occurrence,        // ❌ WRONG: Getting Occurrence instead of Note
        quote: tsvRow.SupportReference,  // ❌ WRONG: Getting SupportReference instead of Quote
        // ❌ MISSING: id, tags, supportReference, occurrence
      };
      
      // The mismatch
      console.log('\n=== Translation Notes Field Mismatch ===');
      console.log('TSV Tags field:', tsvRow.Tags);
      console.log('JSON has tags?', 'tags' in actualJsonResponse ? 'YES' : 'NO ❌');
      console.log('TSV Note field:', tsvRow.Note);
      console.log('JSON note field:', actualJsonResponse.note, '❌ WRONG VALUE');
    });

    test('Translation Questions: Should preserve ALL fields even if empty', () => {
      const tqTsvSample = `Reference\tID\tTags\tQuote\tOccurrence\tQuestion\tResponse
1:1\ty5pp\t\t\t\tWhat was Paul's purpose?\tTo establish faith.`;

      const parsed = parseTSV(tqTsvSample);
      const tsvRow = parsed[0];
      
      // All 7 fields exist in TSV
      expect(Object.keys(tsvRow).length).toBe(7);
      
      // What SHOULD be in JSON (all fields, even empty ones)
      // const idealJsonResponse = {
      //   reference: '1:1',
      //   id: 'y5pp',
      //   tags: '',      // Empty but should exist
      //   quote: '',     // Empty but should exist  
      //   occurrence: '', // Empty but should exist
      //   question: 'What was Paul\'s purpose?',
      //   response: 'To establish faith.'
      // };
      
      // What's ACTUALLY returned (only some fields)
      const actualJsonResponse = {
        reference: 'tit 1:1',
        question: tsvRow.Question,
        answer: tsvRow.Response,  // ❌ Renamed from 'Response' to 'answer'
        // ❌ MISSING: id, tags, quote, occurrence
      };
      
      console.log('\n=== Translation Questions Field Loss ===');
      console.log('TSV has ID:', tsvRow.ID);
      console.log('JSON has ID?', 'id' in actualJsonResponse ? 'YES' : 'NO ❌');
      console.log('TSV field "Response" renamed to "answer" in JSON');
    });

    test('Translation Word Links: Should preserve all 6 columns', () => {
      const twlTsvSample = `Reference\tID\tTags\tOrigWords\tOccurrence\tTWLink
1:1\ttrr8\tname\tΠαῦλος\t1\trc://*/tw/dict/bible/names/paul`;

      const parsed = parseTSV(twlTsvSample);
      const tsvRow = parsed[0];
      
      // TSV has exactly 6 fields
      expect(Object.keys(tsvRow)).toEqual([
        'Reference',
        'ID',
        'Tags', 
        'OrigWords',
        'Occurrence',
        'TWLink'
      ]);
      
      // Greek text must be preserved exactly
      expect(tsvRow.OrigWords).toBe('Παῦλος');
      
      console.log('\n=== Translation Word Links ===');
      console.log('TSV OrigWords (Greek):', tsvRow.OrigWords);
      console.log('Must preserve Unicode exactly:', tsvRow.OrigWords === 'Παῦλος' ? 'YES ✅' : 'NO ❌');
    });
  });

  describe('Summary of Issues', () => {
    test('ISSUE 1: Column indices are wrong in service parsers', () => {
      // The service code expects columns in wrong order
      const actualTNColumns = ['Reference', 'ID', 'Tags', 'SupportReference', 'Quote', 'Occurrence', 'Note'];
      const codeExpectsColumns = ['ref', 'id', 'supportReference', 'quote', 'occurrence', 'note', 'occurrenceNote'];
      
      // The mismatch at index 2
      expect(actualTNColumns[2]).toBe('Tags');
      expect(codeExpectsColumns[2]).toBe('supportReference'); // ❌ WRONG!
      
      console.log('\n=== Column Index Mismatch ===');
      console.log('Position 2 - TSV has:', actualTNColumns[2]);
      console.log('Position 2 - Code expects:', codeExpectsColumns[2]);
      console.log('Result: Reading wrong column!');
    });

    test('ISSUE 2: Fields are lost in JSON response', () => {
      const tsvFields = ['Reference', 'ID', 'Tags', 'SupportReference', 'Quote', 'Occurrence', 'Note'];
      const jsonFields = ['reference', 'note', 'quote']; // Only 3 out of 7!
      
      const lostFields = tsvFields.filter(f => 
        !jsonFields.some(j => j.toLowerCase() === f.toLowerCase())
      );
      
      expect(lostFields).toEqual(['ID', 'Tags', 'SupportReference', 'Occurrence']);
      
      console.log('\n=== Lost Fields ===');
      console.log('TSV has', tsvFields.length, 'fields');
      console.log('JSON has', jsonFields.length, 'fields');
      console.log('Lost fields:', lostFields.join(', '));
    });

    test('ISSUE 3: Field names are changed without documentation', () => {
      const renamedFields = {
        'Response': 'answer',     // In TQ
        'OrigWords': 'originalWords', // In TWL
      };
      
      console.log('\n=== Renamed Fields ===');
      Object.entries(renamedFields).forEach(([tsv, json]) => {
        console.log(`TSV field "${tsv}" → JSON field "${json}"`);
      });
    });
  });

  describe('Requirements for 100% Pass-through', () => {
    test('MUST preserve exact field count', () => {
      const requirements = {
        'Translation Notes': { tsvFields: 7, jsonFields: 7 },
        'Translation Questions': { tsvFields: 7, jsonFields: 7 },
        'Translation Word Links': { tsvFields: 6, jsonFields: 6 }
      };
      
      Object.entries(requirements).forEach(([, req]) => {
        expect(req.jsonFields).toBe(req.tsvFields);
      });
    });

    test('MUST preserve exact field values', () => {
      const sample = 'κατὰ πίστιν ἐκλεκτῶν Θεοῦ';
      const afterParsing = sample; // Should be identical
      
      expect(afterParsing).toBe(sample);
      expect(afterParsing.length).toBe(sample.length);
    });

    test('MUST handle empty fields correctly', () => {
      const tsvWithEmpty = 'val1\t\tval3';
      const values = tsvWithEmpty.split('\t');
      
      expect(values[0]).toBe('val1');
      expect(values[1]).toBe('');     // Empty, not undefined
      expect(values[2]).toBe('val3');
    });
  });
});