#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createVisibleAppointment() {
  console.log('🧪 Creating appointment visible in calendar')
  console.log('=' .repeat(60))
  
  const shopId = 'demo-shop-001' // Same as calendar
  
  try {
    const now = new Date()
    const startTime = new Date(now)
    startTime.setHours(14, 0, 0, 0) // 2 PM today
    
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + 30) // 30 minute appointment
    
    console.log('Creating appointment for:', {
      startTime: startTime.toLocaleString(),
      endTime: endTime.toLocaleString(),
      shopId: shopId
    })
    
    const { data: appointment, error } = await supabase
      .from('bookings')
      .insert([{
        shop_id: shopId,
        barber_id: '56ddbef1-fc3b-4f86-b841-88a8e72e166e', // John Smith
        service_id: 'cc438e84-fc35-49ec-903d-4ba4e7e2bc65', // Haircut
        customer_id: 'e91dd39c-21e6-41ea-8ac3-c908e6fb88f2',
        customer_name: 'UI Test Customer',
        customer_email: 'uitest@example.com',
        customer_phone: '555-UI-TEST',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        service_name: 'Haircut',
        duration_minutes: 30,
        price: 35,
        status: 'confirmed',
        notes: 'Test appointment for UI cancel testing'
      }])
      .select()
      .single()
    
    if (error) throw error
    
    console.log('✅ Created visible appointment:', {
      id: appointment.id,
      customer: appointment.customer_name,
      start: new Date(appointment.start_time).toLocaleString(),
      status: appointment.status
    })
    
    console.log('\n🎯 Appointment should now be visible in calendar!')
    console.log('   - Refresh the calendar to see it')
    console.log('   - Click on it to test cancel functionality')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  process.exit(0)
}

createVisibleAppointment()