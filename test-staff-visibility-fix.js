/**
 * Test script to verify the staff visibility fix
 */

async function testStaffEndpoints() {
  try {
    
    const authResponse = await fetch('http://localhost:9999/api/staff');

    if (authResponse.status === 401) {
      ');
    } else {
      
      const authData = await authResponse.json();
      
    }
    
    ...');
    // Test with a mock barbershop ID - in real usage this would come from URL params
    const publicResponse = await fetch('http://localhost:9999/api/public/barbershop/test-shop-123/barbers');

    const publicData = await publicResponse.json();
    
    if (!publicData.success) {

    } else {
      
    }

    ');

  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

testStaffEndpoints();