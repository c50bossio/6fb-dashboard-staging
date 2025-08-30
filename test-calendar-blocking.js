// Test script to verify calendar slot blocking fix
const testBlockingEndpoint = async () => {
  const testBlockData = {
    barber_id: "test-barber-id",
    date: "2024-08-30", // YYYY-MM-DD format
    start_time: "10:00", // HH:MM format
    end_time: "11:00", // HH:MM format
    reason: "Test block - debugging",
    shop_id: "test-shop-id",
    barbershop_id: "test-shop-id"
  };

  console.log('🧪 Testing calendar slot blocking fix...');
  console.log('📤 Sending test data:', testBlockData);

  try {
    const response = await fetch('http://localhost:9999/api/calendar/appointments?action=block', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBlockData)
    });

    const data = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response data:', data);

    if (response.ok) {
      console.log('✅ SUCCESS: Calendar slot blocking is working!');
      console.log('✅ The 400 error has been fixed');
      return true;
    } else {
      console.log('❌ FAILED: Still getting error:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ ERROR: Network or other error:', error.message);
    return false;
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testBlockingEndpoint = testBlockingEndpoint;
  console.log('🔧 Test function available as window.testBlockingEndpoint()');
}

// Run test if in Node.js environment
if (typeof window === 'undefined') {
  testBlockingEndpoint();
}