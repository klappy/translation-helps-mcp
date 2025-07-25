import { discoverAvailableResources, getResourceForBook } from './resource-detector';

async function debug() {
  console.log('🔍 Testing resource discovery for Titus...\n');
  
  // Test discovery
  const availability = await discoverAvailableResources('Titus 1:1', 'en', 'unfoldingWord');
  console.log('📦 Resources discovered:');
  console.log('  - Scripture:', availability.scripture.length);
  console.log('  - Notes:', availability.notes.length);
  console.log('  - Questions:', availability.questions.length);
  console.log('  - Words:', availability.words.length);
  console.log('  - WordLinks:', availability.wordLinks.length);
  
  console.log('\n🔍 Questions resources:');
  availability.questions.forEach(q => {
    console.log(`  - ${q.name} (${q.title})`);
    console.log('    Ingredients:', q.ingredients?.length || 0);
    console.log('    First ingredient:', q.ingredients?.[0]);
  });
  
  // Test getResourceForBook
  console.log('\n🔍 Testing getResourceForBook...');
  const resource = await getResourceForBook('Titus 1:1', 'questions', 'en', 'unfoldingWord');
  console.log('Resource:', resource);
  
  if (resource?.ingredients) {
    console.log('\n📦 All ingredients:');
    resource.ingredients.forEach((ing: any) => {
      console.log(`  - ${ing.identifier}: ${ing.path}`);
    });
    
    console.log('\n🔍 Looking for "tit" or "TIT"...');
    const titus = resource.ingredients.find((ing: any) => 
      ing.identifier?.toLowerCase() === 'tit'
    );
    console.log('Found Titus ingredient:', titus);
  }
}

debug().catch(console.error);