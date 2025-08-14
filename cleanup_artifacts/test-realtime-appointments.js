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

async function testRealtimeAppointments() {
  console.log('🧪 Testing Real-time Appointments System')
  console.log('=' .repeat(50))
  
  const testShopId = 'demo-shop-001'
  const testBarberId = '56ddbef1-fc3b-4f86-b841-88a8e72e166e' // John Smith
  
  try {
    // 1. Check current appointments
    console.log('\n📊 Current appointments in database:')
    const { data: existingAppointments, error: fetchError } = await supabase
      .from('bookings')
      .select('id, shop_id, start_time, customer_name, status')
      .eq('shop_id', testShopId)
      .order('start_time')
      .limit(5)
    
    if (fetchError) throw fetchError
    
    console.log(`Found ${existingAppointments?.length || 0} appointments for shop ${testShopId}`)
    if (existingAppointments?.length > 0) {
      existingAppointments.forEach(apt => {
        console.log(`  - ${apt.id}: ${apt.customer_name} at ${new Date(apt.start_time).toLocaleString()}`)
      })
    }
    
    // 2. Create a test appointment
    console.log('\n✨ Creating test appointment...')
    const testAppointment = {
      shop_id: testShopId,
      barber_id: testBarberId,
      service_id: 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65', // Haircut
      customer_id: 'e91dd39c-21e6-41ea-8ac3-c908e6fb88f2', // Christopher Bossio
      customer_name: 'Realtime Test Customer',
      customer_email: 'realtime.test@example.com',
      customer_phone: '555-9999',
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // 30 min duration
      service_name: 'Test Haircut',
      duration_minutes: 30,
      price: 35.00,
      status: 'confirmed',
      notes: 'Created by real-time test script'
    }
    
    const { data: newAppointment, error: createError } = await supabase
      .from('bookings')
      .insert([testAppointment])
      .select()
      .single()
    
    if (createError) throw createError
    
    console.log('✅ Test appointment created:', newAppointment.id)
    console.log('   Customer:', newAppointment.customer_name)
    console.log('   Time:', new Date(newAppointment.start_time).toLocaleString())
    
    // 3. Set up real-time subscription to verify
    console.log('\n📡 Setting up real-time subscription...')
    let eventReceived = false
    
    const channel = supabase
      .channel('test-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${testShopId}`
        },
        (payload) => {
          console.log('🎉 Real-time event received:', {
            type: payload.eventType,
            id: payload.new?.id || payload.old?.id,
            customer: payload.new?.customer_name || payload.old?.customer_name
          })
          eventReceived = true
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
      })
    
    // 4. Update the appointment to trigger an event
    console.log('\n🔄 Updating appointment to trigger real-time event...')
    await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for subscription
    
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ notes: 'Updated by real-time test - ' + new Date().toISOString() })
      .eq('id', newAppointment.id)
    
    if (updateError) throw updateError
    
    // 5. Wait for real-time event
    console.log('⏳ Waiting for real-time event (5 seconds)...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    if (eventReceived) {
      console.log('✅ Real-time system is working correctly!')
    } else {
      console.log('⚠️  No real-time event received - check subscription configuration')
    }
    
    // 6. Clean up test appointment
    console.log('\n🧹 Cleaning up test appointment...')
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', newAppointment.id)
    
    if (deleteError) throw deleteError
    console.log('✅ Test appointment deleted')
    
    // 7. Unsubscribe
    supabase.removeChannel(channel)
    console.log('📡 Unsubscribed from real-time channel')
    
    console.log('\n' + '=' .repeat(50))
    console.log('🎉 Real-time appointment test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
  
  process.exit(0)
}

// Run the test
testRealtimeAppointments()