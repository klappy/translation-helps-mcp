/**
 * Full flow test: Validators -> API Endpoints -> Data Retrieval
 * Tests both the validators and actual data retrieval
 */

// Import validators (simulate the actual validators)
function isValidLanguageCode(value) {
	if (!value || typeof value !== 'string') return false;
	const bcp47Pattern = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-([A-Z]{2}|\d{3}))?(-[a-z0-9-]+)?$/i;
	const simplePattern = /^[a-z]{2,3}$/i;
	return bcp47Pattern.test(value) || simplePattern.test(value);
}

function isValidOrganization(value) {
	if (!value || typeof value !== 'string') return false;
	const orgPattern = /^[a-zA-Z0-9._-]{2,100}$/;
	return orgPattern.test(value);
}

async function testFullFlow() {
  console.log('🧪 Full Flow Test: Validators → API → Data Retrieval\n');
  console.log('Parameters:');
  console.log('  - language: "es-419"');
  console.log('  - organization: "es-419_gl"');
  console.log('  - reference: "Est 1:1"\n');

  // Step 1: Test Validators
  console.log('Step 1: Testing Validators\n');
  const langValid = isValidLanguageCode('es-419');
  const orgValid = isValidOrganization('es-419_gl');
  
  console.log(`Language "es-419": ${langValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Organization "es-419_gl": ${orgValid ? '✅ VALID' : '❌ INVALID'}\n`);

  if (!langValid || !orgValid) {
    console.log('❌ Validators failed - cannot proceed with API tests\n');
    return;
  }

  // Step 2: Test API Endpoints Directly
  console.log('Step 2: Testing API Endpoints Directly\n');
  const baseUrl = 'https://translation-helps-mcp-945.pages.dev/api';
  const params = new URLSearchParams({
    reference: 'Est 1:1',
    language: 'es-419',
    organization: 'es-419_gl',
    format: 'json',
  });

  const endpoints = [
    { name: 'fetch-scripture', path: '/fetch-scripture' },
    { name: 'fetch-translation-notes', path: '/fetch-translation-notes' },
    { name: 'fetch-translation-questions', path: '/fetch-translation-questions' },
    { name: 'fetch-translation-word-links', path: '/fetch-translation-word-links' },
  ];

  const apiResults = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.name}...`);
      const url = `${baseUrl}${endpoint.path}?${params.toString()}`;
      const response = await fetch(url);
      const text = await response.text();
      
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        parsed = { raw: text };
      }

      const result = {
        name: endpoint.name,
        status: response.status,
        success: response.ok,
        hasData: response.ok && !parsed.error && !text.includes('Tool endpoint failed'),
        dataLength: text.length,
        error: parsed.error || (response.ok ? null : text.substring(0, 200)),
      };

      apiResults.push(result);

      if (result.success && result.hasData) {
        console.log(`  ✅ Status: ${result.status}`);
        console.log(`     Data length: ${result.dataLength} chars`);
        if (parsed.scripture) console.log(`     Scriptures: ${parsed.scripture.length}`);
        if (parsed.notes) console.log(`     Notes: ${parsed.notes.length}`);
        if (parsed.questions) console.log(`     Questions: ${parsed.questions.length}`);
        if (parsed.links) console.log(`     Links: ${parsed.links.length}`);
      } else if (result.status === 400) {
        console.log(`  ❌ Status: ${result.status} (Validation Error)`);
        console.log(`     Error: ${result.error}`);
        console.log(`     ⚠️  This means validators need to be deployed!`);
      } else {
        console.log(`  ⚠️  Status: ${result.status}`);
        console.log(`     Response: ${result.error || 'No data'}`);
      }
      console.log('');
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      apiResults.push({ name: endpoint.name, success: false, error: error.message });
    }
  }

  // Step 3: Test with SDK (if API works)
  console.log('Step 3: Testing with SDK\n');
  if (apiResults.some(r => r.success && r.hasData)) {
    console.log('✅ API endpoints are working! Testing SDK...\n');
    
    try {
      const { TranslationHelpsClient } = await import('@translation-helps/mcp-client');
      const client = new TranslationHelpsClient({
        serverUrl: 'https://translation-helps-mcp-945.pages.dev/api/mcp',
      });

      await client.connect();
      
      const sdkResult = await client.fetchScripture({
        reference: 'Est 1:1',
        language: 'es-419',
        organization: 'es-419_gl',
      });

      if (sdkResult && sdkResult.length > 0 && !sdkResult.includes('Tool endpoint failed')) {
        console.log('✅ SDK test: SUCCESS');
        console.log(`   Response length: ${sdkResult.length} chars`);
        console.log(`   Preview: ${sdkResult.substring(0, 200)}...`);
      } else {
        console.log('⚠️  SDK test: No data returned');
        console.log(`   Response: ${sdkResult?.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ SDK test: ERROR - ${error.message}`);
    }
  } else {
    console.log('⚠️  Skipping SDK test - API endpoints not working yet');
    console.log('   (This is expected until validators are deployed)\n');
  }

  // Summary
  console.log('\n📊 Test Summary\n');
  console.log('Validators:');
  console.log(`  Language: ${langValid ? '✅' : '❌'}`);
  console.log(`  Organization: ${orgValid ? '✅' : '❌'}\n`);

  console.log('API Endpoints:');
  const working = apiResults.filter(r => r.success && r.hasData).length;
  const total = apiResults.length;
  console.log(`  Working: ${working}/${total}`);
  
  apiResults.forEach(r => {
    const status = r.success && r.hasData ? '✅' : r.status === 400 ? '❌ (400)' : '⚠️';
    console.log(`  ${status} ${r.name}`);
  });

  console.log('\n💡 Next Steps:');
  if (apiResults.some(r => r.status === 400)) {
    console.log('  1. Deploy the updated validators to Cloudflare Pages');
    console.log('  2. Re-run this test to verify data retrieval');
  } else if (working > 0) {
    console.log('  ✅ Validators are working! Data retrieval is functional.');
  } else {
    console.log('  ⚠️  Check if resources exist in catalog for es-419/es-419_gl');
  }
}

testFullFlow();

