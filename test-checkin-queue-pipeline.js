#!/usr/bin/env node

/**
 * Check-in to Queue Pipeline Test
 * Tests the complete flow: customer check-in → appear in queue with correct position
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function testCheckInToQueuePipeline() {
  console.log('🔍 Testing Check-in to Queue Pipeline\n');
  
  try {
    // Get test parameters
    const baseUrl = await askQuestion('Enter base URL (default: http://localhost:9999): ') || 'http://localhost:9999';
    const barbershopId = await askQuestion('Enter barbershop ID (default: 1): ') || '1';
    const phoneNumber = await askQuestion('Enter test phone number (e.g., 555-123-4567): ');
    
    if (!phoneNumber) {
      console.log('❌ Phone number is required for testing');
      process.exit(1);
    }

    console.log(`\n📱 Testing with phone: ${phoneNumber}`);
    console.log(`🏪 Barbershop ID: ${barbershopId}`);
    console.log(`🌐 Base URL: ${baseUrl}\n`);

    // Step 1: Search for appointments by phone
    console.log('📋 Step 1: Searching for appointments...');
    const searchResponse = await fetch(
      `${baseUrl}/api/appointments/search-by-phone?phone=${encodeURIComponent(phoneNumber)}&barbershop_id=${barbershopId}`
    );
    const searchData = await searchResponse.json();
    
    if (!searchResponse.ok) {
      console.log('❌ Search failed:', searchData.error);
      process.exit(1);
    }

    console.log(`✅ Found ${searchData.appointments?.length || 0} appointments`);
    
    if (!searchData.appointments || searchData.appointments.length === 0) {
      console.log('⚠️  No appointments found. Cannot test check-in flow.');
      console.log('💡 Please create a test appointment first or use a phone number with existing appointments.');
      process.exit(1);
    }

    // Show available appointments
    console.log('\n📅 Available appointments:');
    searchData.appointments.forEach((apt, index) => {
      console.log(`  ${index + 1}. ${apt.customer_name} - ${apt.service_name} - ${apt.date} ${apt.start_time} (${apt.status})`);
    });

    const appointmentIndex = await askQuestion('\nWhich appointment to check-in (enter number, default: 1): ') || '1';
    const selectedAppointment = searchData.appointments[parseInt(appointmentIndex) - 1];
    
    if (!selectedAppointment) {
      console.log('❌ Invalid appointment selection');
      process.exit(1);
    }

    if (selectedAppointment.status !== 'confirmed') {
      console.log(`⚠️  Appointment status is '${selectedAppointment.status}', not 'confirmed'. Check-in may fail.`);
    }

    // Step 2: Check-in the customer
    console.log(`\n✋ Step 2: Checking in ${selectedAppointment.customer_name}...`);
    const checkinResponse = await fetch(
      `${baseUrl}/api/appointments/${selectedAppointment.id}/check-in`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    const checkinData = await checkinResponse.json();

    if (!checkinResponse.ok) {
      console.log('❌ Check-in failed:', checkinData.error);
      process.exit(1);
    }

    console.log('✅ Check-in successful!');
    console.log(`📍 Queue position: ${checkinData.queue_position}`);
    console.log(`💬 Message: ${checkinData.message}`);

    // Step 3: Verify customer appears in unified queue
    console.log('\n📝 Step 3: Verifying customer appears in unified queue...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for data consistency
    
    const queueResponse = await fetch(
      `${baseUrl}/api/queue/unified?barbershop_id=${barbershopId}`
    );
    const queueData = await queueResponse.json();

    if (!queueResponse.ok) {
      console.log('❌ Queue fetch failed:', queueData.error);
      process.exit(1);
    }

    console.log(`✅ Queue loaded with ${queueData.queue?.length || 0} items`);
    console.log('📊 Queue summary:', queueData.summary);

    // Find our checked-in customer in the queue
    const checkedInCustomer = queueData.queue?.find(item => 
      item.id === selectedAppointment.id && item.status === 'checked_in'
    );

    if (checkedInCustomer) {
      console.log('\n🎉 SUCCESS: Customer found in queue!');
      console.log(`👤 Customer: ${checkedInCustomer.customer_name}`);
      console.log(`📱 Phone: ${checkedInCustomer.customer_phone}`);
      console.log(`🕐 Time: ${checkedInCustomer.time}`);
      console.log(`🎯 Type: ${checkedInCustomer.type}`);
      console.log(`📊 Status: ${checkedInCustomer.status}`);
      console.log(`🔢 Priority: ${checkedInCustomer.priority}`);
      
      // Verify queue position matches
      const actualPosition = queueData.queue.findIndex(item => item.id === selectedAppointment.id) + 1;
      console.log(`🏁 Actual queue position: ${actualPosition}`);
      
      if (actualPosition === checkinData.queue_position) {
        console.log('✅ Queue position matches!');
      } else {
        console.log(`⚠️  Queue position mismatch! Expected: ${checkinData.queue_position}, Actual: ${actualPosition}`);
      }
      
    } else {
      console.log('\n❌ FAILURE: Customer NOT found in queue');
      console.log('🔍 Available queue items:');
      queueData.queue?.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.customer_name} - ${item.status} - ${item.type} (ID: ${item.id})`);
      });
    }

    // Step 4: Test queue interface data structure
    console.log('\n🔧 Step 4: Validating queue data structure...');
    let validationPassed = true;
    
    queueData.queue?.forEach((item, index) => {
      const requiredFields = ['id', 'customer_name', 'service_name', 'status', 'type', 'time'];
      const missingFields = requiredFields.filter(field => !item[field]);
      
      if (missingFields.length > 0) {
        console.log(`❌ Item ${index + 1} missing fields: ${missingFields.join(', ')}`);
        validationPassed = false;
      }
      
      // Check phone field consistency
      if (item.customer_phone) {
        console.log(`✅ Item ${index + 1} has phone: ${item.customer_phone}`);
      } else if (item.phone) {
        console.log(`⚠️  Item ${index + 1} uses old 'phone' field instead of 'customer_phone'`);
      }
    });

    if (validationPassed) {
      console.log('✅ All queue items have required fields');
    }

    console.log('\n🏁 Test completed!');
    console.log('\n📋 Summary:');
    console.log(`  • Phone search: ✅`);
    console.log(`  • Customer check-in: ✅`);
    console.log(`  • Queue position assignment: ${checkinData.queue_position ? '✅' : '❌'}`);
    console.log(`  • Unified queue display: ${checkedInCustomer ? '✅' : '❌'}`);
    console.log(`  • Data structure validation: ${validationPassed ? '✅' : '⚠️'}`);

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the test
testCheckInToQueuePipeline().catch(console.error);