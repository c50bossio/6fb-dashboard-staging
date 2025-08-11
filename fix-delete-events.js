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

async function checkAndFixDeleteEvents() {
  console.log('🔧 Checking and Fixing DELETE Events for Real-time')
  console.log('=' .repeat(60))
  
  try {
    // Check current replication settings
    console.log('\n📋 Current Configuration:')
    console.log('  - Table: bookings')
    console.log('  - Schema: public')
    console.log('  - Events: INSERT, UPDATE, DELETE')
    
    // For Supabase, we need to ensure the table has REPLICA IDENTITY FULL
    // This is required for DELETE events to include the old record data
    console.log('\n🔍 Checking REPLICA IDENTITY setting...')
    
    let replicaCheck = null
    let checkError = null
    try {
      const result = await supabase.rpc('check_replica_identity', {
        table_name: 'bookings',
        schema_name: 'public'
      })
      replicaCheck = result.data
      checkError = result.error
    } catch (e) {
      checkError = 'Function not found'
    }
    
    if (checkError || !replicaCheck) {
      console.log('  ⚠️  Cannot directly check REPLICA IDENTITY (requires admin access)')
      console.log('\n📝 Manual Fix Instructions:')
      console.log('  1. Go to Supabase Dashboard')
      console.log('  2. Navigate to SQL Editor')
      console.log('  3. Run this command:')
      console.log('\n  ALTER TABLE public.bookings REPLICA IDENTITY FULL;')
      console.log('\n  This enables DELETE events to include full row data')
    }
    
    // Test DELETE event propagation
    console.log('\n🧪 Testing DELETE event propagation...')
    
    // Create a test appointment
    const testAppointment = {
      shop_id: 'test-delete-shop',
      barber_id: '56ddbef1-fc3b-4f86-b841-88a8e72e166e',
      service_id: 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65',
      customer_id: 'e91dd39c-21e6-41ea-8ac3-c908e6fb88f2',
      customer_name: 'DELETE Test',
      customer_email: 'delete.test@example.com',
      customer_phone: '555-DELETE',
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      service_name: 'Delete Test Service',
      duration_minutes: 30,
      price: 0,
      status: 'test',
      notes: 'Testing DELETE events'
    }
    
    const { data: newAppointment, error: createError } = await supabase
      .from('bookings')
      .insert([testAppointment])
      .select()
      .single()
    
    if (createError) throw createError
    console.log('  ✅ Test appointment created:', newAppointment.id)
    
    // Set up subscription to catch DELETE event
    let deleteReceived = false
    let deletePayload = null
    
    const channel = supabase
      .channel('delete-test-channel')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('  🎉 DELETE event received!')
          deleteReceived = true
          deletePayload = payload
        }
      )
      .subscribe((status) => {
        console.log('  Subscription status:', status)
      })
    
    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Delete the test appointment
    console.log('  🗑️  Deleting test appointment...')
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', newAppointment.id)
    
    if (deleteError) throw deleteError
    console.log('  ✅ Test appointment deleted')
    
    // Wait for DELETE event
    console.log('  ⏳ Waiting for DELETE event (5 seconds)...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Unsubscribe
    supabase.removeChannel(channel)
    
    // Results
    console.log('\n📊 Test Results:')
    if (deleteReceived) {
      console.log('  ✅ DELETE events are working!')
      console.log('  Payload received:', {
        hasOldData: !!deletePayload?.old,
        oldId: deletePayload?.old?.id
      })
    } else {
      console.log('  ❌ DELETE events are NOT being received')
      console.log('\n🔧 Recommended Solutions:')
      console.log('\n  Option 1: Enable REPLICA IDENTITY FULL (Recommended)')
      console.log('  -----------------------------------------')
      console.log('  Run in Supabase SQL Editor:')
      console.log('  ALTER TABLE public.bookings REPLICA IDENTITY FULL;')
      console.log('\n  Option 2: Use Soft Deletes Instead')
      console.log('  ------------------------------------')
      console.log('  Instead of DELETE, use UPDATE to set status = "cancelled"')
      console.log('  This way you get UPDATE events which work reliably')
      console.log('\n  Option 3: Manual Refresh After Delete')
      console.log('  --------------------------------------')
      console.log('  After deleting, manually remove from local state')
      console.log('  or trigger a full refresh of appointments')
    }
    
    // Alternative approach using soft deletes
    console.log('\n💡 Implementing Soft Delete Workaround:')
    console.log('  Instead of DELETE, update status to "deleted" or "cancelled"')
    console.log('  This triggers UPDATE events which are reliably received')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  process.exit(0)
}

// Run the check
checkAndFixDeleteEvents()