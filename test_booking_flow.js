#!/usr/bin/env node
/**
 * Test the complete booking flow end-to-end
 */

const TEST_BOOKING_DATA = {
  barbershop_id: "1ca6138d-eae8-46ed-abff-5d6e52fbd21b", // Tomb45 Channelside (real barbershop ID)
  service_id: "219317ff-0f17-486e-8cc4-2eeb391fc2fe", // Use existing service ID
  service_name: "Classic Haircut", // Required field for public booking
  scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  duration_minutes: 30,
  price: 35.00,
  customer_name: "Test Customer",
  customer_phone: "+1234567890",
  customer_email: "test@example.com",
  customer_notes: "Test booking from automated test",
  sms_opt_in: true,
  email_opt_in: true,
  addOns: [] // Required array for public booking
};

async function testBookingCreation() {
  console.log("🧪 Testing Booking Creation Flow...\n");
  
  try {
    // Test 1: Create a booking
    console.log("📝 Test 1: Creating booking...");
    const response = await fetch('http://localhost:9999/api/public/bookings/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_BOOKING_DATA)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("❌ Booking creation failed:", result);
      return false;
    }
    
    console.log("✅ Booking created successfully!");
    console.log("   Booking ID:", result.booking?.id);
    console.log("   Status:", result.booking?.status);
    console.log("   Confirmation:", result.booking?.confirmation_code);
    
    // Test 2: Fetch appointments to verify
    console.log("\n📝 Test 2: Fetching appointments...");
    const appointmentsResponse = await fetch('http://localhost:9999/api/calendar/appointments');
    
    if (!appointmentsResponse.ok) {
      console.error("❌ Failed to fetch appointments");
      return false;
    }
    
    const appointments = await appointmentsResponse.json();
    console.log("✅ Fetched", appointments.count || 0, "appointments");
    
    // Test 3: Check health endpoints
    console.log("\n📝 Test 3: Checking system health...");
    const healthEndpoints = [
      '/api/health/supabase',
      '/api/health/ai',
      '/api/health/stripe'
    ];
    
    for (const endpoint of healthEndpoints) {
      const healthResponse = await fetch(`http://localhost:9999${endpoint}`);
      const health = await healthResponse.json();
      console.log(`   ${endpoint}:`, health.status === 'ok' || health.status === 'healthy' ? '✅' : '❌');
    }
    
    // Test 4: Check FastAPI backend
    console.log("\n📝 Test 4: Checking FastAPI backend...");
    const backendResponse = await fetch('http://localhost:8000/health');
    const backendHealth = await backendResponse.json();
    console.log("   FastAPI Status:", backendHealth.status === 'healthy' ? '✅' : '❌');
    
    // Count available endpoints
    const openApiResponse = await fetch('http://localhost:8000/openapi.json');
    const openApi = await openApiResponse.json();
    const endpointCount = Object.keys(openApi.paths).length;
    console.log("   Available endpoints:", endpointCount);
    
    console.log("\n🎉 All tests completed successfully!");
    return true;
    
  } catch (error) {
    console.error("\n❌ Test failed with error:", error.message);
    return false;
  }
}

// Run the test
testBookingCreation().then(success => {
  process.exit(success ? 0 : 1);
});