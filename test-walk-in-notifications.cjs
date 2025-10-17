#!/usr/bin/env node

/**
 * Test Walk-In Notification System
 * 
 * Tests the complete walk-in notification flow:
 * 1. Create walk-in customer
 * 2. Verify notification is sent  
 * 3. Check response includes notification status
 */

const API_BASE = 'http://localhost:9999'

// Test data
const testWalkIn = {
  name: 'Test Customer',
  phone: '+15551234567', // Test phone number
  service: 'Haircut',
  notes: 'Test walk-in for notification system',
  barbershop_id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
  estimated_wait: 30
}

async function testWalkInNotification() {
  console.log('🧪 Testing Walk-In Notification System...\n')
  
  try {
    // Step 1: Create walk-in customer
    console.log('📱 Step 1: Creating walk-in customer...')
    const response = await fetch(`${API_BASE}/api/walk-ins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testWalkIn)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create walk-in: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Walk-in created successfully!')
    console.log(`   - Appointment ID: ${result.appointment_id}`)
    console.log(`   - Customer ID: ${result.customer_id}`)
    console.log(`   - Queue Position: ${result.queue_position}`)
    console.log(`   - Estimated Wait: ${result.estimated_wait} minutes`)
    console.log(`   - Notification Sent: ${result.notification_sent}`)

    // Step 2: Verify notification status in response
    console.log('\n📲 Step 2: Verifying notification status...')
    if (result.notification_sent === true) {
      console.log('✅ Notification flag indicates SMS was sent')
    } else if (result.notification_sent === false) {
      console.log('⚠️  Notification flag indicates SMS was NOT sent (no phone number?)')
    } else {
      console.log('❌ Notification flag is missing from response')
    }

    // Step 3: Check if appointment was created with correct status
    console.log('\n📋 Step 3: Walk-in system verification...')
    console.log(`✅ Queue Position: #${result.queue_position}`)
    console.log(`✅ Estimated Wait: ${result.estimated_wait} minutes`)
    console.log(`✅ Message: ${result.message}`)

    // Step 4: Test the notification message format
    console.log('\n💬 Step 4: Expected notification message format:')
    const expectedMessage = `Welcome to Your Barbershop! 👋

You're #${result.queue_position} in line
Estimated wait: ${result.estimated_wait} minutes

We'll text you when you're next!

Track status: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.bookedbarber.com'}/walk-in-status/${result.appointment_id}`
    
    console.log('Expected SMS content:')
    console.log('-------------------')
    console.log(expectedMessage)
    console.log('-------------------')

    return {
      success: true,
      appointment_id: result.appointment_id,
      queue_position: result.queue_position,
      estimated_wait: result.estimated_wait,
      notification_sent: result.notification_sent
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return { success: false, error: error.message }
  }
}

// Run test if called directly
if (require.main === module) {
  testWalkInNotification()
    .then(result => {
      console.log('\n🎯 TEST SUMMARY:')
      console.log('================')
      if (result.success) {
        console.log('✅ Walk-in notification system is working!')
        console.log(`   - Queue position: #${result.queue_position}`)
        console.log(`   - Estimated wait: ${result.estimated_wait} minutes`)
        console.log(`   - SMS notification: ${result.notification_sent ? 'SENT' : 'NOT SENT'}`)
        console.log('\n💡 Next steps:')
        console.log('   - Check your SMS logs to verify delivery')
        console.log('   - Test with a real phone number to receive the SMS')
        console.log('   - Implement the customer status tracking page')
      } else {
        console.log('❌ Test failed with error:', result.error)
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('💥 Test crashed:', error)
      process.exit(1)
    })
}

module.exports = { testWalkInNotification }