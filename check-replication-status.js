#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkReplicationStatus() {
  console.log('🔍 Checking Real-time Replication Status')
  console.log('=' .repeat(60))
  
  try {
    // Test with a simpler subscription first
    console.log('\n📡 Test 1: Basic subscription to ALL changes')
    let anyEventReceived = false
    
    const channel = supabase
      .channel('test-all-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          anyEventReceived = true
          console.log('  ✅ Event received:', {
            type: payload.eventType,
            table: payload.table,
            hasNew: !!payload.new,
            hasOld: !!payload.old
          })
        }
      )
      .subscribe((status) => {
        console.log('  Subscription status:', status)
      })
    
    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Create and immediately delete a test record
    console.log('\n📝 Creating test record...')
    const { data: created, error: createError } = await supabase
      .from('bookings')
      .insert([{
        shop_id: 'replication-test',
        barber_id: '56ddbef1-fc3b-4f86-b841-88a8e72e166e',
        service_id: 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65',
        customer_id: 'e91dd39c-21e6-41ea-8ac3-c908e6fb88f2',
        customer_name: 'Replication Test',
        customer_email: process.env.TEST_EMAIL || "dev@barbershop.com",
        customer_phone: '555-TEST',
        start_time: new Date(Date.now() + 86400000).toISOString(),
        end_time: new Date(Date.now() + 88200000).toISOString(),
        service_name: 'Test',
        duration_minutes: 30,
        price: 0,
        status: 'test',
        notes: 'Testing replication'
      }])
      .select()
      .single()
    
    if (createError) throw createError
    console.log('  Created:', created.id)
    
    // Wait for INSERT event
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update the record
    console.log('\n✏️  Updating test record...')
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ notes: 'Updated: ' + new Date().toISOString() })
      .eq('id', created.id)
    
    if (updateError) throw updateError
    console.log('  Updated')
    
    // Wait for UPDATE event
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Delete the record
    console.log('\n🗑️  Deleting test record...')
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', created.id)
    
    if (deleteError) throw deleteError
    console.log('  Deleted')
    
    // Wait for DELETE event
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Clean up
    supabase.removeChannel(channel)
    
    // Results
    console.log('\n' + '=' .repeat(60))
    console.log('📊 Results:')
    
    if (anyEventReceived) {
      console.log('✅ Real-time replication is ENABLED for bookings table')
      console.log('\n💡 If DELETE events aren\'t working, possible causes:')
      console.log('  1. The REPLICA IDENTITY fix may need time to propagate')
      console.log('  2. Try refreshing the Supabase real-time server:')
      console.log('     - Go to Settings > Database > Replication')
      console.log('     - Toggle bookings table OFF then ON again')
      console.log('  3. Check Supabase Dashboard > Logs for any errors')
    } else {
      console.log('❌ No real-time events received!')
      console.log('\n🔧 To enable real-time:')
      console.log('  1. Go to Supabase Dashboard')
      console.log('  2. Navigate to Database > Replication')
      console.log('  3. Enable replication for "bookings" table')
      console.log('  4. Select events: INSERT, UPDATE, DELETE')
    }
    
    // Additional SQL to check in Supabase
    console.log('\n📝 Run this SQL in Supabase to check publication:')
    console.log(`
SELECT 
    schemaname,
    tablename,
    pubinsert,
    pubupdate,
    pubdelete
FROM pg_publication_tables 
WHERE tablename = 'bookings';
    `)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  process.exit(0)
}

checkReplicationStatus()