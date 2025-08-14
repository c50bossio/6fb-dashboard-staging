#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBookingFlow() {
  console.log('🧪 Testing Complete Booking and Deletion Flow')
  console.log('=' .repeat(60))
  
  const testShopId = 'demo-shop-001'
  const testBarberId = '56ddbef1-fc3b-4f86-b841-88a8e72e166e' // John Smith
  const testServiceId = 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65' // Haircut
  const testCustomerId = 'e91dd39c-21e6-41ea-8ac3-c908e6fb88f2' // Christopher Bossio
  
  let createdAppointmentId = null
  let updateEventReceived = false
  let deleteEventReceived = false
  
  try {
    // 1. Set up real-time subscription first
    console.log('\n📡 Setting up real-time subscription...')
    const channel = supabase
      .channel('test-booking-flow')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${testShopId}`
        },
        (payload) => {
          const eventType = payload.eventType
          const appointmentId = payload.new?.id || payload.old?.id
          
          console.log(`  📨 Real-time ${eventType} event:`, {
            id: appointmentId,
            customer: payload.new?.customer_name || payload.old?.customer_name,
            timestamp: new Date().toISOString()
          })
          
          if (eventType === 'INSERT' && appointmentId === createdAppointmentId) {
            console.log('  ✅ INSERT event received for our appointment')
          }
          
          if (eventType === 'UPDATE' && appointmentId === createdAppointmentId) {
            updateEventReceived = true
            console.log('  ✅ UPDATE event received for our appointment')
          }
          
          if (eventType === 'DELETE' && appointmentId === createdAppointmentId) {
            deleteEventReceived = true
            console.log('  ✅ DELETE event received for our appointment')
          }
        }
      )
      .subscribe((status) => {
        console.log('  Subscription status:', status)
      })
    
    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 2. Create appointment (simulating booking modal)
    console.log('\n📝 Creating new appointment...')
    const appointmentData = {
      shop_id: testShopId,
      barber_id: testBarberId,
      service_id: testServiceId,
      customer_id: testCustomerId,
      customer_name: 'Test Flow Customer',
      customer_email: 'flow.test@example.com',
      customer_phone: '555-0000',
      start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      end_time: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(), // 30 min duration
      service_name: 'Test Haircut',
      duration_minutes: 30,
      price: 35.00,
      status: 'confirmed',
      notes: 'Test booking flow appointment'
    }
    
    const { data: newAppointment, error: createError } = await supabase
      .from('bookings')
      .insert([appointmentData])
      .select()
      .single()
    
    if (createError) throw createError
    
    createdAppointmentId = newAppointment.id
    console.log('  ✅ Appointment created:', {
      id: createdAppointmentId,
      customer: newAppointment.customer_name,
      time: new Date(newAppointment.start_time).toLocaleString()
    })
    
    // 3. Wait for real-time INSERT event
    console.log('\n⏳ Waiting for real-time INSERT event...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 4. Update appointment (simulating edit)
    console.log('\n✏️  Updating appointment...')
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        notes: 'Updated notes - ' + new Date().toISOString(),
        status: 'rescheduled'
      })
      .eq('id', createdAppointmentId)
    
    if (updateError) throw updateError
    console.log('  ✅ Appointment updated')
    
    // 5. Wait for real-time UPDATE event
    console.log('\n⏳ Waiting for real-time UPDATE event...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (!updateEventReceived) {
      console.log('  ⚠️  UPDATE event not received yet, waiting more...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    
    // 6. Verify appointment exists in database
    console.log('\n🔍 Verifying appointment in database...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', createdAppointmentId)
      .single()
    
    if (verifyError) throw verifyError
    console.log('  ✅ Appointment verified in database:', {
      id: verifyData.id,
      status: verifyData.status,
      notes: verifyData.notes
    })
    
    // 7. Delete appointment (simulating cancellation)
    console.log('\n🗑️  Deleting appointment...')
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', createdAppointmentId)
    
    if (deleteError) throw deleteError
    console.log('  ✅ Appointment deleted')
    
    // 8. Wait for real-time DELETE event
    console.log('\n⏳ Waiting for real-time DELETE event...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (!deleteEventReceived) {
      console.log('  ⚠️  DELETE event not received yet, waiting more...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    
    // 9. Verify appointment is deleted
    console.log('\n🔍 Verifying appointment is deleted...')
    const { data: checkDeleted, error: checkError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', createdAppointmentId)
      .single()
    
    if (checkDeleted) {
      console.log('  ⚠️  Appointment still exists in database!')
    } else {
      console.log('  ✅ Appointment successfully deleted from database')
    }
    
    // 10. Unsubscribe from real-time
    supabase.removeChannel(channel)
    console.log('\n📡 Unsubscribed from real-time channel')
    
    // Summary
    console.log('\n' + '=' .repeat(60))
    console.log('📊 Test Results:')
    console.log('  ✅ Appointment created successfully')
    console.log('  ' + (updateEventReceived ? '✅' : '❌') + ' UPDATE event received via real-time')
    console.log('  ' + (deleteEventReceived ? '✅' : '❌') + ' DELETE event received via real-time')
    console.log('  ✅ Appointment deleted successfully')
    
    if (updateEventReceived && deleteEventReceived) {
      console.log('\n🎉 All tests passed! Real-time booking flow is working correctly.')
    } else {
      console.log('\n⚠️  Some real-time events were not received. Check subscription configuration.')
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    
    // Clean up if appointment was created
    if (createdAppointmentId) {
      console.log('\n🧹 Cleaning up test appointment...')
      await supabase
        .from('bookings')
        .delete()
        .eq('id', createdAppointmentId)
    }
    
    process.exit(1)
  }
  
  process.exit(0)
}

// Run the test
testBookingFlow()