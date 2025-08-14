#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testDeleteAfterFix() {
  console.log('🧪 Testing DELETE Events After REPLICA IDENTITY Fix')
  console.log('=' .repeat(60))
  console.log('⚠️  Make sure you\'ve run the SQL fix in Supabase Dashboard first!')
  console.log()
  
  const testShopId = 'demo-shop-001'
  let deleteWithShopId = false
  let deletePayload = null
  
  try {
    // Subscribe to DELETE events
    console.log('📡 Setting up DELETE subscription...')
    const channel = supabase
      .channel('delete-test-after-fix')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('  🎉 DELETE event received!')
          console.log('  Payload contains:', {
            id: payload.old?.id,
            shop_id: payload.old?.shop_id,
            customer_name: payload.old?.customer_name,
            hasAllFields: !!payload.old?.shop_id
          })
          
          if (payload.old?.shop_id === testShopId) {
            deleteWithShopId = true
            deletePayload = payload
            console.log('  ✅ shop_id matches our filter!')
          }
        }
      )
      .subscribe((status) => {
        console.log('  Subscription status:', status)
      })
    
    // Wait for subscription
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
        customer_name: 'REPLICA FIX Test',
        customer_email: 'replica@test.com',
        customer_phone: '555-FIX',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        end_time: new Date(Date.now() + 5400000).toISOString(),
        service_name: 'Test Service',
        duration_minutes: 30,
        price: 0,
        status: 'test',
        notes: 'Testing DELETE with REPLICA IDENTITY FULL'
      }])
      .select()
      .single()
    
    if (error) throw error
    console.log('  Created appointment:', {
      id: appointment.id,
      shop_id: appointment.shop_id,
      customer: appointment.customer_name
    })
    
    // Delete the appointment
    console.log('\n🗑️  Deleting appointment...')
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', appointment.id)
    
    if (deleteError) throw deleteError
    console.log('  Deleted successfully')
    
    // Wait for DELETE event
    console.log('\n⏳ Waiting for DELETE event (3 seconds)...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Clean up
    supabase.removeChannel(channel)
    
    // Results
    console.log('\n' + '=' .repeat(60))
    console.log('📊 Test Results:')
    
    if (deleteWithShopId) {
      console.log('✅ SUCCESS! DELETE events are working with full data!')
      console.log('   The shop_id was included in the DELETE payload')
      console.log('   Our real-time hook can now properly filter DELETE events')
      console.log('\n🎉 The fix has been applied successfully!')
    } else if (deletePayload) {
      console.log('⚠️  DELETE event received but shop_id is missing')
      console.log('   The REPLICA IDENTITY FULL fix needs to be applied')
      console.log('\n📝 Please run this SQL in Supabase Dashboard:')
      console.log('   ALTER TABLE public.bookings REPLICA IDENTITY FULL;')
    } else {
      console.log('❌ No DELETE event received')
      console.log('   Check if real-time replication is enabled for the bookings table')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  process.exit(0)
}

testDeleteAfterFix()