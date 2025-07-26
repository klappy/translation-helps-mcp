import { ResourceAggregator } from './src/services/ResourceAggregator.js';
import { parseReference } from './src/parsers/referenceParser.js';

async function testTWL() {
  try {
    console.log('Testing TWL fetch...');
    
    const aggregator = new ResourceAggregator('en', 'unfoldingWord');
    const reference = parseReference('Titus 1');
    
    console.log('Parsed reference:', reference);
    
    const result = await aggregator.aggregateResources(reference, {
      language: 'en',
      organization: 'unfoldingWord',
      resources: ['links']
    });
    
    console.log('Result:', {
      hasResult: !!result,
      hasTranslationWordLinks: !!result.translationWordLinks,
      linksCount: result.translationWordLinks?.length || 0,
      firstLink: result.translationWordLinks?.[0]
    });
    
    console.log('Full result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testTWL();