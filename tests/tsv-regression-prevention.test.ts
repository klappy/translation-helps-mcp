import { describe, test, expect, vi } from 'vitest';
import { parseTSV } from '../src/config/RouteGenerator';

/**
 * Regression Prevention Tests for TSV Auto-Discovery
 * 
 * These tests ensure that:
 * 1. TSV columns pass through without mapping
 * 2. No fields are renamed
 * 3. No fields are added
 * 4. No fields are removed
 * 5. The structure matches exactly what's in DCS
 */

describe('TSV Auto-Discovery Regression Prevention', () => {
  
  describe('Core Principle: No Mapping Allowed', () => {
    test('TSV columns must pass through exactly as they are', () => {
      const tsvData = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\trtc9\trc://*/ta/man/translate/figs-abstractnouns\tκατὰ πίστιν\tThe words\t1\tare abstract nouns.`;

      const result = parseTSV(tsvData);
      
      // Fields must have exact same names as TSV headers
      expect(result[0]).toHaveProperty('Reference');
      expect(result[0]).toHaveProperty('ID');
      expect(result[0]).toHaveProperty('Tags');
      expect(result[0]).toHaveProperty('SupportReference');
      expect(result[0]).toHaveProperty('Quote');
      expect(result[0]).toHaveProperty('Occurrence');
      expect(result[0]).toHaveProperty('Note');
      
      // Should NOT have renamed fields
      expect(result[0]).not.toHaveProperty('reference'); // lowercase
      expect(result[0]).not.toHaveProperty('id'); // lowercase
      expect(result[0]).not.toHaveProperty('supportReference'); // camelCase
      expect(result[0]).not.toHaveProperty('quote'); // lowercase
    });
    
    test('No extra fields should be added', () => {
      const tsvData = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\trtc9\trc://link\tGreek\tEnglish\t1\tNote text`;

      const result = parseTSV(tsvData);
      const fields = Object.keys(result[0]);
      
      // Exactly 7 fields from TSV
      expect(fields).toHaveLength(7);
      
      // No invented fields
      expect(result[0]).not.toHaveProperty('markdown');
      expect(result[0]).not.toHaveProperty('occurrences');
      expect(result[0]).not.toHaveProperty('occurrenceNote');
      expect(result[0]).not.toHaveProperty('type');
      expect(result[0]).not.toHaveProperty('category');
    });
    
    test('Field values must not be swapped or misplaced', () => {
      const tsvData = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\tabc123\trc://*/ta/link\tκατὰ πίστιν Θεοῦ\tThe words of faith\t2\tThis is the note`;

      const result = parseTSV(tsvData);
      
      // Each field contains its correct value
      expect(result[0].Reference).toBe('1:1');
      expect(result[0].ID).toBe('abc123');
      expect(result[0].Tags).toBe('rc://*/ta/link');
      expect(result[0].SupportReference).toBe('κατὰ πίστιν Θεοῦ');
      expect(result[0].Quote).toBe('The words of faith');
      expect(result[0].Occurrence).toBe('2');
      expect(result[0].Note).toBe('This is the note');
      
      // Common mistakes to check:
      // Tags should NOT be in supportReference
      expect(result[0].SupportReference).not.toContain('rc://');
      // Greek should NOT be in quote
      expect(result[0].Quote).not.toContain('κατὰ');
      // RC link should be in Tags
      expect(result[0].Tags).toContain('rc://');
    });
  });
  
  describe('Preventing Common Mistakes', () => {
    test('PREVENT: Manual destructuring with wrong column count', () => {
      const tsvLine = '1:1\tid\ttags\tsupport\tquote\t1\tnote';
      const columns = tsvLine.split('\t');
      
      // This is WRONG and should be caught
      expect(columns).toHaveLength(7); // TSV has 7 columns
      
      // If someone tries to destructure 8 values:
      const attemptWrongDestructure = () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [ref, id, supportReference, quote, occurrence, note, occurrenceNote] = columns;
        return occurrenceNote; // This would be undefined!
      };
      
      expect(attemptWrongDestructure()).toBeUndefined();
    });
    
    test('PREVENT: Renaming fields during parsing', () => {
      // This is how it should NOT be done
      const wrongParser = (tsv: string) => {
        const lines = tsv.split('\n');
        const dataLine = lines[1].split('\t');
        
        // WRONG: Manual mapping with renamed fields
        return {
          reference: dataLine[0],     // Renamed!
          id: dataLine[1],           // Renamed!
          supportReference: dataLine[2], // Wrong position!
          quote: dataLine[3],        // Wrong position!
          // etc.
        };
      };
      
      // This is how it SHOULD be done
      const rightParser = (tsv: string) => {
        return parseTSV(tsv)[0];
      };
      
      const tsv = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\tid\ttags\tsupport\tquote\t1\tnote`;
      
      const wrong = wrongParser(tsv);
      const right = rightParser(tsv);
      
      // The right way preserves exact field names
      expect(right).toHaveProperty('Reference');
      expect(right).toHaveProperty('Tags');
      
      // The wrong way renames them
      expect(wrong).toHaveProperty('reference');
      expect(wrong).not.toHaveProperty('Reference');
    });
  });
  
  describe('Real DCS Data Structure Validation', () => {
    test('Translation Notes must have exactly these 7 columns', () => {
      const expectedTNColumns = [
        'Reference',
        'ID',
        'Tags',
        'SupportReference',
        'Quote',
        'Occurrence',
        'Note'
      ];
      
      const tnTsv = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\tid\ttags\tsupport\tquote\t1\tnote`;
      
      const parsed = parseTSV(tnTsv);
      const actualColumns = Object.keys(parsed[0]);
      
      expect(actualColumns).toEqual(expectedTNColumns);
      expect(actualColumns).toHaveLength(7);
    });
    
    test('Translation Questions must have exactly these 7 columns', () => {
      const expectedTQColumns = [
        'Reference',
        'ID',
        'Tags',
        'Quote',
        'Occurrence',
        'Question',
        'Response'
      ];
      
      const tqTsv = `Reference\tID\tTags\tQuote\tOccurrence\tQuestion\tResponse
1:1\tid\t\t\t\tWhy?\tBecause.`;
      
      const parsed = parseTSV(tqTsv);
      const actualColumns = Object.keys(parsed[0]);
      
      expect(actualColumns).toEqual(expectedTQColumns);
    });
    
    test('Translation Word Links must have exactly these 6 columns', () => {
      const expectedTWLColumns = [
        'Reference',
        'ID',
        'Tags',
        'OrigWords',
        'Occurrence',
        'TWLink'
      ];
      
      const twlTsv = `Reference\tID\tTags\tOrigWords\tOccurrence\tTWLink
1:1\tid\tname\tΠαῦλος\t1\trc://*/tw/dict/bible/names/paul`;
      
      const parsed = parseTSV(twlTsv);
      const actualColumns = Object.keys(parsed[0]);
      
      expect(actualColumns).toEqual(expectedTWLColumns);
      expect(actualColumns).toHaveLength(6);
    });
  });
  
  describe('TypeScript Interface Alignment', () => {
    test('Interfaces should match TSV structure exactly', () => {
      // The WRONG way (current interfaces):
      interface WrongTranslationNote {
        note: string;      // lowercase
        quote?: string;    // lowercase
        supportReference?: string; // camelCase
        markdown?: string; // doesn't exist in TSV!
      }
      
      // The RIGHT way (matching TSV):
      interface RightTranslationNote {
        Reference: string;
        ID: string;
        Tags: string;
        SupportReference: string;
        Quote: string;
        Occurrence: string;
        Note: string;
      }
      
      // Test that the right interface matches TSV
      const tsv = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\tid\ttags\tsupport\tquote\t1\tnote`;
      
      const parsed = parseTSV(tsv)[0];
      const rightNote: RightTranslationNote = parsed as RightTranslationNote;
      
      // This should work without any mapping
      expect(rightNote.Reference).toBe('1:1');
      expect(rightNote.Tags).toBe('tags');
      expect(rightNote.Note).toBe('note');
    });
  });
  
  describe('Auto-Discovery Benefits', () => {
    test('New TSV columns automatically appear in output', () => {
      // Simulate DCS adding a new column
      const futureTS  = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote\tNewColumn
1:1\tid\ttags\tsupport\tquote\t1\tnote\tnew value`;
      
      const parsed = parseTSV(futureTS );
      
      // The new column automatically appears!
      expect(parsed[0]).toHaveProperty('NewColumn');
      expect(parsed[0].NewColumn).toBe('new value');
      
      // No code changes needed!
    });
    
    test('Column order changes are handled automatically', () => {
      // Original order
      const tsv1 = `Reference\tID\tTags\tNote
1:1\tid\ttags\tnote`;
      
      // Changed order (hypothetical)
      const tsv2 = `ID\tReference\tNote\tTags
id\t1:1\tnote\ttags`;
      
      const parsed1 = parseTSV(tsv1)[0];
      const parsed2 = parseTSV(tsv2)[0];
      
      // Both work correctly despite different order
      expect(parsed1.Reference).toBe('1:1');
      expect(parsed2.Reference).toBe('1:1');
      
      // Fields are where the headers say they are
      expect(Object.keys(parsed1)).toEqual(['Reference', 'ID', 'Tags', 'Note']);
      expect(Object.keys(parsed2)).toEqual(['ID', 'Reference', 'Note', 'Tags']);
    });
  });
  
  describe('Golden Rule Enforcement', () => {
    test('TSV structure IS the API structure', () => {
      const tsvData = `FieldOne\tFieldTwo\tFieldThree
value1\tvalue2\tvalue3`;
      
      const apiOutput = parseTSV(tsvData);
      
      // API output structure matches TSV exactly
      expect(apiOutput[0]).toEqual({
        FieldOne: 'value1',
        FieldTwo: 'value2',
        FieldThree: 'value3'
      });
      
      // No transformations, no mappings, no changes
      const tsvStructure = ['FieldOne', 'FieldTwo', 'FieldThree'];
      const apiStructure = Object.keys(apiOutput[0]);
      
      expect(apiStructure).toEqual(tsvStructure);
    });
  });
});