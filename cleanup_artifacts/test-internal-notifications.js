/**
 * Test Internal Notification System
 * Simple test script to verify email and SMS notifications
 */

// Test the API endpoint directly
async function testNotificationAPI() {
  console.log('🧪 Testing Internal Notification System');
  console.log('======================================\n');

  const testData = {
    customerName: 'John Smith',
    customerEmail: 'test@example.com',
    customerPhone: '+1234567890',
    appointmentDate: '2025-08-08',
    appointmentTime: '2:00 PM',
    serviceName: 'Haircut & Style',
    barberName: 'Mike Johnson',
    shopName: '6FB Premium Barbershop',
    shopPhone: '(555) 123-4567',
    totalPrice: '$35.00',
    confirmationNumber: 'TEST-001',
    paymentAmount: '$35.00',
    paymentMethod: 'Visa ****1234',
    transactionId: 'txn_test123'
  };

  const baseURL = 'http://localhost:9999';
  
  // Test each notification type
  const tests = [
    { type: 'test', description: 'Test notification system' },
    { type: 'appointment-confirmation', description: 'Appointment confirmation' },
    { type: 'booking-reminder', description: 'Booking reminder' },
    { type: 'payment-confirmation', description: 'Payment confirmation' }
  ];

  for (const test of tests) {
    console.log(`🚀 Testing: ${test.description}`);
    
    try {
      const response = await fetch(`${baseURL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: test.type,
          data: testData
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`✅ ${test.description} - SUCCESS`);
        if (result.details) {
          if (result.details.email?.success) console.log(`   📧 Email sent`);
          if (result.details.sms?.success) console.log(`   📱 SMS sent`);
        }
      } else {
        console.log(`❌ ${test.description} - FAILED`);
        console.log(`   Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${test.description} - ERROR`);
      console.log(`   ${error.message}`);
    }
    
    console.log('');
  }

  // Test API health
  console.log('🏥 Testing API Health');
  try {
    const response = await fetch(`${baseURL}/api/notifications`);
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ API Health - OK`);
      console.log(`   Service: ${result.service}`);
      console.log(`   Status: ${result.status}`);
    } else {
      console.log(`❌ API Health - FAILED`);
    }
  } catch (error) {
    console.log(`❌ API Health - ERROR: ${error.message}`);
  }

  console.log('\n📊 Test Complete!');
  console.log('💡 To configure email/SMS:');
  console.log('   📧 Email: Set SMTP_USER, SMTP_PASS in .env');
  console.log('   📱 SMS: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env');
}

// Run the test
if (typeof window === 'undefined') {
  // Node.js environment
  testNotificationAPI().catch(console.error);
} else {
  // Browser environment
  console.log('Run this script with: node test-internal-notifications.js');
}