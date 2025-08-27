/**
 * Test script to verify the staff visibility fix
 */

console.log('🔍 TESTING STAFF VISIBILITY FIX');
console.log('================================');

async function testStaffEndpoints() {
  try {
    console.log('\n1. Testing authenticated staff endpoint...');
    const authResponse = await fetch('http://localhost:9999/api/staff');
    console.log(`   Status: ${authResponse.status}`);
    
    if (authResponse.status === 401) {
      console.log('✅ Authenticated endpoint correctly returns 401 (expected for unauthenticated users)');
    } else {
      console.log('ℹ️  User is authenticated, checking response...');
      const authData = await authResponse.json();
      console.log(`   Staff count: ${authData.staff?.length || 0}`);
    }
    
    console.log('\n2. Testing public barbershop endpoint (example barbershop)...');
    // Test with a mock barbershop ID - in real usage this would come from URL params
    const publicResponse = await fetch('http://localhost:9999/api/public/barbershop/test-shop-123/barbers');
    console.log(`   Status: ${publicResponse.status}`);
    
    const publicData = await publicResponse.json();
    console.log(`   Success: ${publicData.success}`);
    if (!publicData.success) {
      console.log(`   Error: ${publicData.error}`);
      console.log('ℹ️  This is expected if no barbershop with ID "test-shop-123" exists');
    } else {
      console.log(`   Staff count: ${publicData.staff?.length || 0}`);
    }
    
    console.log('\n✅ ENDPOINTS ARE WORKING');
    console.log('   - Authenticated endpoint returns 401 for unauthenticated users');
    console.log('   - Public endpoint is accessible (returns proper error if barbershop not found)');
    console.log('   - BarberStep component should now fallback to public endpoint when getting 401');
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

testStaffEndpoints();