#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDeleteEvents() {
  console.log('🔍 Testing DELETE Event Configuration')
  console.log('=' .repeat(60))
  
  const testShopId = 'demo-shop-001'
  let deleteReceived = false
  let deletePayload = null
  
  try {
    // Test 1: Subscribe WITHOUT filter for DELETE
    console.log('\n📡 Test 1: DELETE subscription WITHOUT filter')
    const channel1 = supabase
      .channel('delete-test-no-filter')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookings'
          // NO filter - should receive all DELETE events
        },
        (payload) => {
          console.log('  ✅ DELETE event received (no filter):', {
            id: payload.old?.id,
            shop_id: payload.old?.shop_id
          })
          if (payload.old?.shop_id === testShopId) {
            deleteReceived = true
            deletePayload = payload
          }
        }
      )
      .subscribe((status) => {
        console.log('  Channel 1 status:', status)
      })
    
    // Test 2: Subscribe WITH filter for DELETE (may not work)
    console.log('\n📡 Test 2: DELETE subscription WITH filter')
    const channel2 = supabase
      .channel('delete-test-with-filter')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookings',
          filter: `shop_id=eq.${testShopId}` // This might not work for DELETE
        },
        (payload) => {
          console.log('  ✅ DELETE event received (with filter):', {
            id: payload.old?.id,
            shop_id: payload.old?.shop_id
          })
        }
      )
      .subscribe((status) => {
        console.log('  Channel 2 status:', status)
      })
    
    // Wait for subscriptions
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Create test appointment
    console.log('\n📝 Creating test appointment...')
    const { data: appointment, error } = await supabase
      .from('bookings')
      .insert([{
        shop_id: testShopId,
        barber_id: '56ddbef1-fc3b-4f86-b841-88a8e72e166e',
        service_id: 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65',
        customer_id: 'e91dd39c-21e6-41ea-8ac3-c908e6fb88f2',
        customer_name: 'DELETE Test',
        customer_email: 'delete@test.com',
        customer_phone: '555-0000',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        end_time: new Date(Date.now() + 5400000).toISOString(),
        service_name: 'Test Service',
        duration_minutes: 30,
        price: 0,
        status: 'test',
        notes: 'Testing DELETE events'
      }])
      .select()
      .single()
    
    if (error) throw error
    console.log('  Created:', appointment.id)
    
    // Delete the appointment
    console.log('\n🗑️  Deleting appointment...')
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', appointment.id)
    
    if (deleteError) throw deleteError
    console.log('  Deleted:', appointment.id)
    
    // Wait for events
    console.log('\n⏳ Waiting for DELETE events (5 seconds)...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Clean up
    supabase.removeChannel(channel1)
    supabase.removeChannel(channel2)
    
    // Results
    console.log('\n' + '=' .repeat(60))
    console.log('📊 Results:')
    
    if (deleteReceived) {
      console.log('✅ DELETE events ARE working!')
      console.log('   Payload contains:', {
        hasOldData: !!deletePayload?.old,
        oldFields: deletePayload?.old ? Object.keys(deletePayload.old).slice(0, 5) : []
      })
      
      console.log('\n💡 Solution: Use DELETE subscription WITHOUT filter')
      console.log('   Then manually check shop_id in the handler')
    } else {
      console.log('❌ DELETE events were NOT received')
      console.log('\n🔧 Troubleshooting Steps:')
      console.log('1. Run this SQL in Supabase Dashboard:')
      console.log('   ALTER TABLE public.bookings REPLICA IDENTITY FULL;')
      console.log('\n2. Check Supabase Dashboard > Database > Replication')
      console.log('   Ensure "bookings" table is enabled for replication')
      console.log('\n3. Consider using soft deletes instead:')
      console.log('   UPDATE bookings SET status = "deleted" WHERE id = ...')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  process.exit(0)
}

testDeleteEvents()