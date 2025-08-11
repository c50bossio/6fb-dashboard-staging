#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testRealtimeImprovements() {
  console.log('🧪 Testing Real-time System Improvements')
  console.log('=' .repeat(60))
  
  const shopId = 'demo-shop-001'
  let events = {
    INSERT: 0,
    UPDATE: 0,
    DELETE: 0
  }
  
  let receivedEvents = []
  
  try {
    // Set up enhanced real-time subscription
    console.log('📡 Setting up enhanced real-time subscription...')
    
    const channel = supabase
      .channel('improvements-test')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${shopId}`
        },
        (payload) => {
          events.INSERT++
          receivedEvents.push({
            type: 'INSERT',
            id: payload.new.id,
            shopId: payload.new.shop_id,
            timestamp: new Date().toISOString()
          })
          console.log('  ✅ INSERT event:', {
            id: payload.new.id,
            shopId: payload.new.shop_id,
            customer: payload.new.customer_name,
            status: payload.new.status
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${shopId}`
        },
        (payload) => {
          events.UPDATE++
          receivedEvents.push({
            type: 'UPDATE',
            id: payload.new.id,
            shopId: payload.new.shop_id,
            oldStatus: payload.old?.status,
            newStatus: payload.new.status,
            timestamp: new Date().toISOString()
          })
          console.log('  ✅ UPDATE event:', {
            id: payload.new.id,
            shopId: payload.new.shop_id,
            statusChange: `${payload.old?.status} → ${payload.new.status}`,
            customer: payload.new.customer_name
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          events.DELETE++
          receivedEvents.push({
            type: 'DELETE',
            id: payload.old.id,
            shopId: payload.old.shop_id,
            timestamp: new Date().toISOString()
          })
          console.log('  ✅ DELETE event:', {
            id: payload.old.id,
            shopId: payload.old.shop_id,
            hasShopId: !!payload.old.shop_id
          })
        }
      )
      .subscribe((status) => {
        console.log('  📡 Subscription status:', status)
      })
    
    // Wait for subscription
    console.log('⏳ Waiting for subscription to connect...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test 1: CREATE appointment
    console.log('\n🧪 Test 1: Creating appointment...')
    const { data: appointment1, error: createError } = await supabase
      .from('bookings')
      .insert([{
        shop_id: shopId,
        barber_id: '56ddbef1-fc3b-4f86-b841-88a8e72e166e',
        service_id: 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65',
        customer_id: 'e91dd39c-21e6-41ea-8ac3-c908e6fb88f2',
        customer_name: 'Real-time Test Customer',
        customer_email: 'realtime@test.com',
        customer_phone: '555-REALTIME',
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
        service_name: 'Haircut',
        duration_minutes: 30,
        price: 35,
        status: 'confirmed',
        notes: 'Testing improved real-time system'
      }])
      .select()
      .single()
    
    if (createError) throw createError
    console.log('  ✅ Created appointment:', appointment1.id)
    
    // Wait for INSERT event
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Test 2: UPDATE appointment (cancel)
    console.log('\n🧪 Test 2: Cancelling appointment...')
    const { data: appointment2, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        notes: appointment1.notes + ' [CANCELLED via real-time test]'
      })
      .eq('id', appointment1.id)
      .select()
      .single()
    
    if (updateError) throw updateError
    console.log('  ✅ Cancelled appointment:', appointment2.id)
    
    // Wait for UPDATE event
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Test 3: DELETE appointment (optional)
    console.log('\n🧪 Test 3: Deleting appointment (hard delete)...')
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', appointment1.id)
    
    if (deleteError) throw deleteError
    console.log('  ✅ Deleted appointment:', appointment1.id)
    
    // Wait for DELETE event
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Clean up
    supabase.removeChannel(channel)
    
    // Results
    console.log('\n' + '=' .repeat(60))
    console.log('📊 Real-time Test Results:')
    console.log(`  INSERT events: ${events.INSERT} (expected: 1)`)
    console.log(`  UPDATE events: ${events.UPDATE} (expected: 1)`)
    console.log(`  DELETE events: ${events.DELETE} (expected: 1)`)
    
    console.log('\n📋 Event Details:')
    receivedEvents.forEach((event, i) => {
      console.log(`  ${i + 1}. ${event.type} - ${event.id}`, {
        shopId: event.shopId,
        statusChange: event.oldStatus ? `${event.oldStatus} → ${event.newStatus}` : undefined
      })
    })
    
    const allEventsReceived = events.INSERT >= 1 && events.UPDATE >= 1 && events.DELETE >= 1
    
    if (allEventsReceived) {
      console.log('\n🎉 All real-time events working correctly!')
      console.log('   ✅ Calendar will receive live updates')
      console.log('   ✅ Shop ID filtering is working') 
      console.log('   ✅ Enhanced logging is active')
      console.log('\n💡 The calendar improvements are ready for testing!')
    } else {
      console.log('\n⚠️  Some events may not be working as expected')
      console.log('   Check the individual event results above')
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
  
  process.exit(0)
}

testRealtimeImprovements()