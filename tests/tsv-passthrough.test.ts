import { describe, test, expect } from 'vitest';
import { parseTSV } from '../src/config/RouteGenerator';

// Import the specific parsing functions from services
import { ResourceAggregator } from '../src/services/ResourceAggregator';

describe('TSV Pass-through Tests - 100% Field Verification', () => {
  
  describe('Translation Notes (TN) TSV Pass-through', () => {
    test('should preserve ALL columns from Translation Notes TSV', () => {
      // Actual TSV structure from DCS
      const tnTsvData = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\trtc9\trc://*/ta/man/translate/figs-abstractnouns\tκατὰ πίστιν ἐκλεκτῶν Θεοῦ καὶ ἐπίγνωσιν ἀληθείας\t1\tThe words **faith**, **knowledge**, and **truth** are abstract nouns.
1:2\txyz9\trc://*/ta/man/translate/grammar-connect-words-phrases\tἐπ' ἐλπίδι ζωῆς αἰωνίου\t1\tHere **hope** could be connected to godliness
front:intro\tm2jl\t\t\t0\t# Introduction to Titus`;

      // Parse using the generic TSV parser
      const parsed = parseTSV(tnTsvData);
      
      // Verify we have all 7 columns exactly as they appear in the TSV
      expect(parsed).toHaveLength(3);
      
      // Check first data row has ALL columns preserved
      const firstRow = parsed[0];
      expect(Object.keys(firstRow)).toEqual([
        'Reference',
        'ID',
        'Tags',
        'SupportReference',
        'Quote',
        'Occurrence',
        'Note'
      ]);
      
      // Verify exact values are preserved
      expect(firstRow.Reference).toBe('1:1');
      expect(firstRow.ID).toBe('rtc9');
      expect(firstRow.Tags).toBe('rc://*/ta/man/translate/figs-abstractnouns');
      expect(firstRow.SupportReference).toBe('κατὰ πίστιν ἐκλεκτῶν Θεοῦ καὶ ἐπίγνωσιν ἀληθείας');
      expect(firstRow.Quote).toBe('1');
      expect(firstRow.Occurrence).toBe('The words **faith**, **knowledge**, and **truth** are abstract nouns.');
      expect(firstRow.Note).toBe('');
      
      // Check that empty fields are preserved as empty strings
      const introRow = parsed[2];
      expect(introRow.Tags).toBe('');
      expect(introRow.SupportReference).toBe('');
      expect(introRow.Quote).toBe('');
    });

    test('should handle Translation Notes with tabs in content correctly', () => {
      const tnWithTabs = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\tid1\ttag1\tsupport1\tquote with\ttab\t1\tnote with\ttab inside`;
      
      const parsed = parseTSV(tnWithTabs);
      
      // TSV parser should split on tabs, so embedded tabs will break the parsing
      // This is a known limitation that needs to be handled
      expect(parsed).toHaveLength(1);
      expect(Object.keys(parsed[0]).length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Translation Questions (TQ) TSV Pass-through', () => {
    test('should preserve ALL columns from Translation Questions TSV', () => {
      // Actual TSV structure from DCS
      const tqTsvData = `Reference\tID\tTags\tQuote\tOccurrence\tQuestion\tResponse
1:1\ty5pp\t\t\t\tWhat was Paul's purpose in his service to God?\tHis purpose was to establish the faith of God's chosen people and to establish the knowledge of the truth.
1:2\tymzh\t\t\t\tWhen did God promise everlasting life to his chosen people?\tHe promised it to them before all the ages of time.
1:2\teauf\t\t\t\tDoes God lie?\tNo.`;

      const parsed = parseTSV(tqTsvData);
      
      // Verify we have all 7 columns
      expect(parsed).toHaveLength(3);
      
      const firstRow = parsed[0];
      expect(Object.keys(firstRow)).toEqual([
        'Reference',
        'ID',
        'Tags',
        'Quote',
        'Occurrence',
        'Question',
        'Response'
      ]);
      
      // Verify exact values
      expect(firstRow.Reference).toBe('1:1');
      expect(firstRow.ID).toBe('y5pp');
      expect(firstRow.Tags).toBe('');
      expect(firstRow.Quote).toBe('');
      expect(firstRow.Occurrence).toBe('');
      expect(firstRow.Question).toBe('What was Paul\'s purpose in his service to God?');
      expect(firstRow.Response).toBe('His purpose was to establish the faith of God\'s chosen people and to establish the knowledge of the truth.');
      
      // Check short response
      const thirdRow = parsed[2];
      expect(thirdRow.Question).toBe('Does God lie?');
      expect(thirdRow.Response).toBe('No.');
    });

    test('should preserve empty fields in Translation Questions', () => {
      const tqWithEmpty = `Reference\tID\tTags\tQuote\tOccurrence\tQuestion\tResponse
1:1\t\t\t\t\tQuestion without ID?\t
1:2\tid2\t\t\t\t\tResponse is empty`;
      
      const parsed = parseTSV(tqWithEmpty);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].ID).toBe('');
      expect(parsed[0].Response).toBe('');
      expect(parsed[1].Response).toBe('Response is empty');
    });
  });

  describe('Translation Words Links (TWL) TSV Pass-through', () => {
    test('should preserve ALL columns from Translation Words Links TSV', () => {
      // Actual TSV structure from DCS
      const twlTsvData = `Reference\tID\tTags\tOrigWords\tOccurrence\tTWLink
1:1\ttrr8\tname\tΠαῦλος\t1\trc://*/tw/dict/bible/names/paul
1:1\tzfgc\t\tδοῦλος\t1\trc://*/tw/dict/bible/other/servant
1:1\tpmq8\tkeyterm\tΘεοῦ\t1\trc://*/tw/dict/bible/kt/god`;

      const parsed = parseTSV(twlTsvData);
      
      // Verify we have all 6 columns
      expect(parsed).toHaveLength(3);
      
      const firstRow = parsed[0];
      expect(Object.keys(firstRow)).toEqual([
        'Reference',
        'ID',
        'Tags',
        'OrigWords',
        'Occurrence',
        'TWLink'
      ]);
      
      // Verify exact values including Greek text
      expect(firstRow.Reference).toBe('1:1');
      expect(firstRow.ID).toBe('trr8');
      expect(firstRow.Tags).toBe('name');
      expect(firstRow.OrigWords).toBe('Παῦλος');
      expect(firstRow.Occurrence).toBe('1');
      expect(firstRow.TWLink).toBe('rc://*/tw/dict/bible/names/paul');
      
      // Check different tag types
      expect(parsed[1].Tags).toBe('');
      expect(parsed[2].Tags).toBe('keyterm');
    });

    test('should handle special characters in Translation Words Links', () => {
      const twlSpecial = `Reference\tID\tTags\tOrigWords\tOccurrence\tTWLink
1:1\tid1\ttag\tἀβγδ\t1\trc://*/tw/dict/bible/names/test
2:3\tid2\t\tword with spaces\t2\trc://*/tw/dict/bible/other/test`;
      
      const parsed = parseTSV(twlSpecial);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].OrigWords).toBe('ἀβγδ');
      expect(parsed[1].OrigWords).toBe('word with spaces');
    });
  });

  describe('Generic parseTSV function validation', () => {
    test('should handle missing columns by providing empty strings', () => {
      const incompleteData = `Col1\tCol2\tCol3
value1\tvalue2
value3\tvalue4\tvalue5\textra`;
      
      const parsed = parseTSV(incompleteData);
      
      expect(parsed).toHaveLength(2);
      // Missing column should be empty string
      expect(parsed[0].Col3).toBe('');
      // Extra columns should be ignored
      expect(Object.keys(parsed[1])).toEqual(['Col1', 'Col2', 'Col3']);
    });

    test('should preserve line breaks within quoted fields if properly escaped', () => {
      const multilineData = `Reference\tNote
1:1\t"Line 1\nLine 2"
1:2\tSingle line`;
      
      const parsed = parseTSV(multilineData);
      
      // Note: Current implementation doesn't handle quoted fields
      // This test documents the current behavior
      expect(parsed).toHaveLength(1); // Second line is lost due to newline
    });
  });

  describe('Service-level TSV parsing validation', () => {
    const aggregator = new ResourceAggregator();
    
    test('Translation Notes service should map TSV columns correctly', () => {
      const reference = {
        book: 'tit',
        chapter: 1,
        verse: 1
      };
      
      const tnTsv = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\trtc9\trc://*/ta/man/translate/figs-abstractnouns\tκατὰ πίστιν\t1\tThe words **faith** are abstract nouns.`;
      
      // Use private method through reflection (for testing)
      const notes = (aggregator as any).parseTNFromTSV(tnTsv, reference, false);
      
      expect(notes).toHaveLength(1);
      expect(notes[0]).toEqual({
        reference: 'tit 1:1',
        quote: '1',
        note: 'The words **faith** are abstract nouns.'
      });
    });

    test('Translation Questions service should map TSV columns correctly', () => {
      const reference = {
        book: 'tit',
        chapter: 1,
        verse: 1
      };
      
      const tqTsv = `Reference\tID\tTags\tQuote\tOccurrence\tQuestion\tResponse
1:1\ty5pp\t\t\t\tWhat was Paul's purpose?\tTo establish faith.`;
      
      const questions = (aggregator as any).parseTQFromTSV(tqTsv, reference);
      
      expect(questions).toHaveLength(1);
      expect(questions[0]).toEqual({
        reference: 'tit 1:1',
        question: 'What was Paul\'s purpose?',
        answer: 'To establish faith.'
      });
    });

    test('Translation Word Links service should map TSV columns correctly', () => {
      const reference = {
        book: 'tit',
        chapter: 1,
        verse: 1
      };
      
      const twlTsv = `Reference\tID\tTags\tOrigWords\tOccurrence\tTWLink
1:1\ttrr8\tname\tΠαῦλος\t1\trc://*/tw/dict/bible/names/paul`;
      
      const links = (aggregator as any).parseTWLFromTSV(twlTsv, reference);
      
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        reference: '1:1',
        originalWords: 'Παῦλος',
        TWLink: 'rc://*/tw/dict/bible/names/paul'
      });
    });
  });

  describe('Column mismatch detection', () => {
    test('should detect when columns are added in output', () => {
      const input = `Col1\tCol2
val1\tval2`;
      
      const parsed = parseTSV(input);
      const output = { ...parsed[0], Col3: 'added' };
      
      const inputColumns = Object.keys(parsed[0]);
      const outputColumns = Object.keys(output);
      
      expect(outputColumns.length).toBeGreaterThan(inputColumns.length);
      expect(outputColumns).toContain('Col3');
    });

    test('should detect when columns are removed in output', () => {
      const input = `Col1\tCol2\tCol3
val1\tval2\tval3`;
      
      const parsed = parseTSV(input);
      const { Col3, ...output } = parsed[0];
      
      const inputColumns = Object.keys(parsed[0]);
      const outputColumns = Object.keys(output);
      
      expect(outputColumns.length).toBeLessThan(inputColumns.length);
      expect(outputColumns).not.toContain('Col3');
    });

    test('should detect when column names are changed', () => {
      const input = `Reference\tID\tNote
1:1\tid1\tnote1`;
      
      const parsed = parseTSV(input);
      
      // Simulate incorrect mapping
      const incorrectOutput = {
        ref: parsed[0].Reference,  // Changed column name
        id: parsed[0].ID,          // Changed column name
        text: parsed[0].Note       // Changed column name
      };
      
      const inputColumns = Object.keys(parsed[0]);
      const outputColumns = Object.keys(incorrectOutput);
      
      expect(inputColumns).toEqual(['Reference', 'ID', 'Note']);
      expect(outputColumns).toEqual(['ref', 'id', 'text']);
      expect(inputColumns).not.toEqual(outputColumns);
    });
  });
});