import dotenv from 'dotenv';
dotenv.config();

async function testLocationCreation() {
  try {
    console.log('Testing Location Creation API...\n');
    
    // Test without auth (should return 401)
    console.log('1. Testing without authentication:');
    const response1 = await fetch('http://localhost:9999/api/locations/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Location',
        address: '123 Test St'
      })
    });
    
    const result1 = await response1.json();
    console.log(`   Status: ${response1.status}`);
    console.log(`   Response: ${JSON.stringify(result1, null, 2)}\n`);
    
    // Check if we get the expected enterprise upgrade response
    if (response1.status === 403 && result1.requiresUpgrade) {
      console.log('✅ Enterprise upgrade prompt working correctly!');
      console.log('   Upgrade info provided:');
      console.log(`   - Title: ${result1.upgradeInfo?.title}`);
      console.log(`   - Features: ${result1.upgradeInfo?.features?.length} features listed`);
      console.log(`   - Benefits: ${result1.upgradeInfo?.benefits?.length} benefits listed`);
      console.log(`   - CTAs: ${result1.upgradeInfo?.ctas?.length} call-to-action buttons\n`);
      
      console.log('🎉 Location creation API correctly handles non-enterprise users!');
    } else if (response1.status === 401) {
      console.log('⚠️  Got 401 Unauthorized (expected for unauthenticated request)');
      console.log('   The API requires authentication to check enterprise status');
    }
    
  } catch (error) {
    console.error('Error testing location API:', error);
  }
  
  process.exit(0);
}

testLocationCreation();
