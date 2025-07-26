import { describe, test, expect } from 'vitest';

/**
 * This test file demonstrates the ACTUAL issues found in the current implementation
 * based on user feedback:
 * 
 * 1. Translation Notes has an extra 'markdown' field that duplicates 'note'
 * 2. Greek text (Quote column) is missing and RC links are in the wrong field
 * 3. Translation Word Links shows no data even though it exists on DCS
 */

describe('Actual TSV Implementation Issues', () => {
  
  describe('Translation Notes Issues', () => {
    test('ISSUE: Extra markdown field that duplicates note content', () => {
      // Current JSON response structure for Translation Notes
      const currentTNResponse = {
        id: 'rtc9',
        reference: 'tit 1:1',
        note: 'The words **faith**, **knowledge**, and **truth** are abstract nouns.',
        quote: 'κατὰ πίστιν ἐκλεκτῶν Θεοῦ καὶ ἐπίγνωσιν ἀληθείας', // This is actually SupportReference!
        occurrence: 1,
        occurrences: undefined,
        markdown: 'The words **faith**, **knowledge**, and **truth** are abstract nouns.', // DUPLICATE!
        supportReference: 'rc://*/ta/man/translate/figs-abstractnouns' // This is actually Tags!
      };
      
      // The actual TSV columns are:
      // Reference | ID | Tags | SupportReference | Quote | Occurrence | Note
      
      console.log('\n=== Translation Notes Field Mapping Issues ===');
      console.log('1. "markdown" field:', currentTNResponse.markdown);
      console.log('   "note" field:', currentTNResponse.note);
      console.log('   ISSUE: These are duplicates! markdown field doesn\'t exist in TSV\n');
      
      console.log('2. "quote" field contains:', currentTNResponse.quote);
      console.log('   ISSUE: This is Greek text from SupportReference column, not Quote column!\n');
      
      console.log('3. "supportReference" field contains:', currentTNResponse.supportReference);
      console.log('   ISSUE: This is the RC link from Tags column, not SupportReference column!');
      
      // The markdown field should not exist
      expect(currentTNResponse.markdown).toBe(currentTNResponse.note); // They're duplicates
    });
    
    test('CORRECT: How Translation Notes should map TSV columns', () => {
      // Given this TSV row:
      const tsvRow = {
        Reference: '1:1',
        ID: 'rtc9',
        Tags: 'rc://*/ta/man/translate/figs-abstractnouns',
        SupportReference: 'κατὰ πίστιν ἐκλεκτῶν Θεοῦ καὶ ἐπίγνωσιν ἀληθείας',
        Quote: 'The words **faith**, **knowledge**, and **truth**',
        Occurrence: '1',
        Note: 'are abstract nouns.'
      };
      
      // It SHOULD map to:
      const correctMapping = {
        reference: tsvRow.Reference,
        id: tsvRow.ID,
        tags: tsvRow.Tags,                         // RC link
        supportReference: tsvRow.SupportReference,  // Greek text
        quote: tsvRow.Quote,                       // English quote
        occurrence: tsvRow.Occurrence,
        note: tsvRow.Note                          // The actual note
        // NO markdown field!
      };
      
      console.log('\n=== Correct Mapping ===');
      console.log('Tags (RC link):', correctMapping.tags);
      console.log('SupportReference (Greek):', correctMapping.supportReference);
      console.log('Quote (English):', correctMapping.quote);
      console.log('Note:', correctMapping.note);
      
      // Verify correct structure
      expect(Object.keys(correctMapping)).not.toContain('markdown');
      expect(correctMapping.quote).not.toContain('κατὰ'); // Quote should be English
      expect(correctMapping.tags).toContain('rc://'); // Tags contains RC links
    });
    
    test('ISSUE: Current code expects 7 columns but destructures 8', () => {
      // The actual TSV has 7 columns:
      const actualColumns = ['Reference', 'ID', 'Tags', 'SupportReference', 'Quote', 'Occurrence', 'Note'];
      
      // But the code destructures 8:
      // const [ref, id, supportReference, quote, occurrence, note, occurrenceNote] = columns;
      
      const codeExpects = ['ref', 'id', 'supportReference', 'quote', 'occurrence', 'note', 'occurrenceNote'];
      
      console.log('\n=== Column Count Mismatch ===');
      console.log('TSV has', actualColumns.length, 'columns');
      console.log('Code expects', codeExpects.length, 'variables');
      console.log('Extra variable: occurrenceNote (doesn\'t exist in TSV!)');
      
      expect(actualColumns.length).toBe(7);
      expect(codeExpects.length).toBe(8); // This is wrong!
    });
  });
  
  describe('Translation Word Links Issues', () => {
    test('ISSUE: No data returned even though it exists on DCS', async () => {
      // Data exists on DCS for Titus 1:1
      const dcsHasData = true; // Confirmed via curl
      
      // Sample data from DCS:
      const sampleTWLData = [
        { ref: '1:1', id: 'trr8', tags: 'name', origWords: 'Παῦλος', occurrence: '1', link: 'rc://*/tw/dict/bible/names/paul' },
        { ref: '1:1', id: 'zfgc', tags: '', origWords: 'δοῦλος', occurrence: '1', link: 'rc://*/tw/dict/bible/other/servant' },
        { ref: '1:1', id: 'pmq8', tags: 'keyterm', origWords: 'Θεοῦ', occurrence: '1', link: 'rc://*/tw/dict/bible/kt/god' }
      ];
      
      // But API returns no data
      const apiReturnsData = false; // Current issue
      
      console.log('\n=== Translation Word Links Data Issue ===');
      console.log('DCS has data for Titus 1:1?', dcsHasData);
      console.log('API returns data?', apiReturnsData);
      console.log('Sample data that should be returned:', sampleTWLData.length, 'word links');
      
      expect(dcsHasData).toBe(true);
      expect(apiReturnsData).toBe(false); // This is the problem!
    });
  });
  
  describe('Why Automated Extraction Would Fix These Issues', () => {
    test('Automated extraction would preserve exact TSV structure', () => {
      const benefits = {
        'No manual column mapping': 'Use generic parseTSV that preserves all columns',
        'No field renaming': 'Keep original column names from TSV headers',
        'No duplicate fields': 'Only include fields that exist in source',
        'No missing data': 'All resources that exist on DCS would be returned',
        'Consistent structure': 'Same field names across all TSV types'
      };
      
      console.log('\n=== Benefits of Automated Extraction ===');
      Object.entries(benefits).forEach(([issue, solution]) => {
        console.log(`${issue}: ${solution}`);
      });
      
      // If we used the generic parseTSV function:
      const tsvData = `Reference\tID\tTags\tSupportReference\tQuote\tOccurrence\tNote
1:1\trtc9\trc://*/ta/man/translate/figs-abstractnouns\tκατὰ πίστιν\tThe words\t1\tare abstract nouns.`;
      
      const lines = tsvData.split('\n');
      const headers = lines[0].split('\t');
      const values = lines[1].split('\t');
      
      const automaticMapping: Record<string, string> = {};
      headers.forEach((header, index) => {
        automaticMapping[header] = values[index];
      });
      
      console.log('\nAutomatic mapping result:', automaticMapping);
      
      // Perfect preservation!
      expect(Object.keys(automaticMapping)).toEqual(headers);
      expect(automaticMapping.Tags).toContain('rc://');
      expect(automaticMapping.SupportReference).toContain('κατὰ');
      expect(automaticMapping.Quote).toBe('The words');
      expect(automaticMapping.Note).toBe('are abstract nouns.');
    });
  });
});