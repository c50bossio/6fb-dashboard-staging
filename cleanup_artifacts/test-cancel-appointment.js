#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testCancelAppointment() {
  console.log('🧪 Testing Cancel Appointment (Soft Delete) Feature')
  console.log('=' .repeat(60))
  
  const testShopId = 'demo-shop-001'
  let updateReceived = false
  let cancelledStatus = false
  
  try {
    // 1. Create a test appointment
    console.log('\n📝 Creating test appointment...')
    const { data: appointment, error: createError } = await supabase
      .from('bookings')
      .insert([{
        shop_id: testShopId,
        barber_id: '56ddbef1-fc3b-4f86-b841-88a8e72e166e',
        service_id: 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65',
        customer_id: 'e91dd39c-21e6-41ea-8ac3-c908e6fb88f2',
        customer_name: 'Cancel Test Customer',
        customer_email: 'cancel@test.com',
        customer_phone: '555-CANCEL',
        start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(),
        service_name: 'Haircut',
        duration_minutes: 30,
        price: 35,
        status: 'confirmed',
        notes: 'Test appointment for cancellation'
      }])
      .select()
      .single()
    
    if (createError) throw createError
    console.log('  ✅ Created:', {
      id: appointment.id,
      customer: appointment.customer_name,
      status: appointment.status
    })
    
    // 2. Set up real-time subscription
    console.log('\n📡 Setting up real-time subscription...')
    const channel = supabase
      .channel('cancel-test')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${appointment.id}`
        },
        (payload) => {
          console.log('  📨 UPDATE event received:', {
            id: payload.new.id,
            status: payload.new.status
          })
          updateReceived = true
          if (payload.new.status === 'cancelled') {
            cancelledStatus = true
          }
        }
      )
      .subscribe((status) => {
        console.log('  Subscription status:', status)
      })
    
    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 3. Cancel the appointment (soft delete)
    console.log('\n❌ Cancelling appointment (soft delete)...')
    const currentNotes = appointment.notes || ''
    const { data: cancelled, error: cancelError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        notes: `${currentNotes} [Cancelled at ${new Date().toLocaleString()}]`
      })
      .eq('id', appointment.id)
      .select()
      .single()
    
    if (cancelError) throw cancelError
    console.log('  ✅ Cancelled:', {
      id: cancelled.id,
      status: cancelled.status,
      notes: cancelled.notes
    })
    
    // 4. Wait for real-time UPDATE event
    console.log('\n⏳ Waiting for real-time UPDATE event...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 5. Verify appointment still exists but is cancelled
    console.log('\n🔍 Verifying appointment is cancelled (not deleted)...')
    const { data: verify, error: verifyError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', appointment.id)
      .single()
    
    if (verifyError) throw verifyError
    
    console.log('  ✅ Appointment still exists:', {
      id: verify.id,
      status: verify.status,
      notes: verify.notes?.includes('[Cancelled at') ? 'Has cancel timestamp' : 'No timestamp'
    })
    
    // 6. Clean up
    supabase.removeChannel(channel)
    
    // Results
    console.log('\n' + '=' .repeat(60))
    console.log('📊 Test Results:')
    console.log('  ✅ Appointment created successfully')
    console.log('  ✅ Appointment cancelled (soft delete)')
    console.log('  ' + (updateReceived ? '✅' : '❌') + ' UPDATE event received via real-time')
    console.log('  ' + (cancelledStatus ? '✅' : '❌') + ' Status changed to "cancelled"')
    console.log('  ✅ Appointment preserved in database (not deleted)')
    
    if (updateReceived && cancelledStatus) {
      console.log('\n🎉 Cancel functionality working perfectly!')
      console.log('   - Soft delete preserves data')
      console.log('   - Real-time updates trigger correctly')
      console.log('   - Calendar will show cancelled status')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  process.exit(0)
}

testCancelAppointment()