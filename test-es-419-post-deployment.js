/**
 * Post-Deployment Test: Verify es-419 data retrieval works end-to-end
 * 
 * Run this test AFTER deploying the updated validators to verify:
 * 1. Validators accept es-419 parameters
 * 2. API endpoints return actual data (not 400 errors)
 * 3. SDK can successfully fetch data
 * 
 * Usage: node test-es-419-post-deployment.js
 */

import { TranslationHelpsClient } from '@translation-helps/mcp-client';

async function testPostDeployment() {
  console.log('🧪 Post-Deployment Test: es-419 Data Retrieval\n');
  console.log('This test verifies the complete flow works after validators are deployed.\n');
  console.log('Parameters:');
  console.log('  - language: "es-419"');
  console.log('  - organization: "es-419_gl"');
  console.log('  - reference: "Est 1:1"\n');

  const client = new TranslationHelpsClient({
    serverUrl: 'https://translation-helps-mcp-945.pages.dev/api/mcp',
  });

  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  try {
    await client.connect();
    console.log('✅ Connected to MCP server\n');

    // Test 1: Fetch Scripture
    console.log('Test 1: fetchScripture');
    try {
      const result = await client.fetchScripture({
        reference: 'Est 1:1',
        language: 'es-419',
        organization: 'es-419_gl',
      });

      if (result && result.length > 50 && !result.includes('Tool endpoint failed') && !result.includes('400')) {
        console.log('  ✅ SUCCESS - Got scripture data');
        console.log(`     Length: ${result.length} chars`);
        console.log(`     Preview: ${result.substring(0, 150)}...`);
        results.passed.push('fetchScripture');
      } else if (result && result.includes('400')) {
        console.log('  ❌ FAILED - Still getting 400 error (validators not deployed?)');
        console.log(`     Response: ${result}`);
        results.failed.push('fetchScripture');
      } else {
        console.log('  ⚠️  WARNING - Got response but may be empty');
        console.log(`     Response: ${result?.substring(0, 100)}...`);
        results.warnings.push('fetchScripture');
      }
    } catch (error) {
      console.log(`  ❌ FAILED - ${error.message}`);
      results.failed.push('fetchScripture');
    }
    console.log('');

    // Test 2: Fetch Translation Notes
    console.log('Test 2: fetchTranslationNotes');
    try {
      const result = await client.fetchTranslationNotes({
        reference: 'Est 1:1',
        language: 'es-419',
        organization: 'es-419_gl',
      });

      if (result && typeof result === 'object' && !result.error) {
        const notesCount = result.notes?.length || 0;
        if (notesCount > 0) {
          console.log('  ✅ SUCCESS - Got translation notes');
          console.log(`     Notes count: ${notesCount}`);
          results.passed.push('fetchTranslationNotes');
        } else {
          console.log('  ⚠️  WARNING - Got response but no notes found');
          console.log('     (This may be normal if passage has no notes)');
          results.warnings.push('fetchTranslationNotes');
        }
      } else {
        console.log('  ❌ FAILED - Invalid response');
        console.log(`     Response: ${JSON.stringify(result).substring(0, 200)}...`);
        results.failed.push('fetchTranslationNotes');
      }
    } catch (error) {
      console.log(`  ❌ FAILED - ${error.message}`);
      results.failed.push('fetchTranslationNotes');
    }
    console.log('');

    // Test 3: Fetch Translation Questions
    console.log('Test 3: fetchTranslationQuestions');
    try {
      const result = await client.fetchTranslationQuestions({
        reference: 'Est 1:1',
        language: 'es-419',
        organization: 'es-419_gl',
      });

      if (result && typeof result === 'object' && !result.error) {
        const questionsCount = result.questions?.length || 0;
        if (questionsCount > 0) {
          console.log('  ✅ SUCCESS - Got translation questions');
          console.log(`     Questions count: ${questionsCount}`);
          results.passed.push('fetchTranslationQuestions');
        } else {
          console.log('  ⚠️  WARNING - Got response but no questions found');
          console.log('     (This may be normal if passage has no questions)');
          results.warnings.push('fetchTranslationQuestions');
        }
      } else {
        console.log('  ❌ FAILED - Invalid response');
        results.failed.push('fetchTranslationQuestions');
      }
    } catch (error) {
      console.log(`  ❌ FAILED - ${error.message}`);
      results.failed.push('fetchTranslationQuestions');
    }
    console.log('');

    // Test 4: Fetch Translation Word Links
    console.log('Test 4: fetchTranslationWordLinks');
    try {
      const result = await client.fetchTranslationWordLinks({
        reference: 'Est 1:1',
        language: 'es-419',
        organization: 'es-419_gl',
      });

      if (result && typeof result === 'object' && !result.error) {
        const linksCount = result.links?.length || 0;
        if (linksCount > 0) {
          console.log('  ✅ SUCCESS - Got translation word links');
          console.log(`     Links count: ${linksCount}`);
          results.passed.push('fetchTranslationWordLinks');
        } else {
          console.log('  ⚠️  WARNING - Got response but no links found');
          results.warnings.push('fetchTranslationWordLinks');
        }
      } else {
        console.log('  ❌ FAILED - Invalid response');
        results.failed.push('fetchTranslationWordLinks');
      }
    } catch (error) {
      console.log(`  ❌ FAILED - ${error.message}`);
      results.failed.push('fetchTranslationWordLinks');
    }
    console.log('');

    // Test 5: Fetch Translation Word
    console.log('Test 5: fetchTranslationWord (term: "rey")');
    try {
      const result = await client.fetchTranslationWord({
        term: 'rey',
        language: 'es-419',
        organization: 'es-419_gl',
      });

      if (result && typeof result === 'object' && !result.error) {
        const articlesCount = result.articles?.length || 0;
        if (articlesCount > 0) {
          console.log('  ✅ SUCCESS - Got translation word articles');
          console.log(`     Articles count: ${articlesCount}`);
          results.passed.push('fetchTranslationWord');
        } else {
          console.log('  ⚠️  WARNING - Got response but no articles found');
          results.warnings.push('fetchTranslationWord');
        }
      } else {
        console.log('  ❌ FAILED - Invalid response');
        results.failed.push('fetchTranslationWord');
      }
    } catch (error) {
      console.log(`  ❌ FAILED - ${error.message}`);
      results.failed.push('fetchTranslationWord');
    }
    console.log('');

    // Summary
    console.log('\n📊 Test Summary\n');
    console.log(`✅ Passed: ${results.passed.length}`);
    if (results.passed.length > 0) {
      results.passed.forEach(name => console.log(`   - ${name}`));
    }
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    if (results.warnings.length > 0) {
      results.warnings.forEach(name => console.log(`   - ${name}`));
    }
    console.log(`\n❌ Failed: ${results.failed.length}`);
    if (results.failed.length > 0) {
      results.failed.forEach(name => console.log(`   - ${name}`));
    }

    // Overall status
    console.log('\n🎯 Overall Status:');
    if (results.failed.length === 0 && results.passed.length > 0) {
      console.log('   ✅ ALL TESTS PASSED - es-419 parameters are working!');
    } else if (results.failed.length > 0 && results.failed.some(f => f.includes('400'))) {
      console.log('   ❌ Validators not deployed yet - getting 400 errors');
      console.log('   💡 Deploy the updated validators and re-run this test');
    } else if (results.failed.length > 0) {
      console.log('   ⚠️  Some tests failed - check if resources exist in catalog');
    } else {
      console.log('   ⚠️  Tests passed but no data found - resources may not exist');
    }

  } catch (error) {
    console.error('❌ Test setup failed:', error);
    process.exit(1);
  }
}

testPostDeployment();

