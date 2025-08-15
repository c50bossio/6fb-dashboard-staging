#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function populateTestAppointments() {
  console.log('📅 Populating Database with Real Test Appointments')
  console.log('=' .repeat(60))
  
  const shopId = 'demo-shop-001'
  
  const testCustomers = [
    { name: await getUserFromDatabase(), email: 'john@test.com', phone: '555-0101' },
    { name: 'Jane Smith', email: 'jane@test.com', phone: '555-0102' },
    { name: 'Bob Wilson', email: 'bob@test.com', phone: '555-0103' },
    { name: 'Alice Brown', email: 'alice@test.com', phone: '555-0104' },
    { name: 'Charlie Davis', email: 'charlie@test.com', phone: '555-0105' }
  ]
  
  const barberIds = [
    '56ddbef1-fc3b-4f86-b841-88a8e72e166e', // John Smith
    '610110ac-cc59-4a13-86f5-2803232c211b', // Lisa Davis  
    '86d82907-7149-400e-9a5e-938b56a8be95', // Mike Brown
    '8c1939eb-7474-4993-88e5-64f6ff6939a9'  // Sarah Johnson
  ]
  
  const serviceIds = [
    'cc438e84-fc35-49ec-903d-4ba4e7e2bc65', // Haircut
    '9df7c2fd-c476-4d9e-8634-0575c09efc2b', // Beard Trim
    'ab365f77-b2cc-4a8d-92d5-80fd1db3508c', // Hair & Beard
    '84a4d965-94c1-4bc2-ad3b-0dffe0b32d09'  // Kids Cut
  ]
  
  const serviceNames = ['Haircut', 'Beard Trim', 'Hair & Beard', 'Kids Cut']
  const prices = [35, 20, 50, 25]
  const durations = [30, 20, 45, 25]
  
  try {
    console.log('🧹 Clearing existing test appointments...')
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('shop_id', shopId)
      .like('customer_name', '%Test%')
    
    if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error clearing test data:', deleteError)
    }
    
    const appointments = []
    const now = new Date()
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const appointmentDate = new Date(now)
      appointmentDate.setDate(appointmentDate.getDate() + dayOffset)
      appointmentDate.setHours(9, 0, 0, 0) // Start at 9 AM
      
      const appointmentsPerDay = 3 + Math.floor(Math.random() * 2)
      
      for (let i = 0; i < appointmentsPerDay; i++) {
        const customer = testCustomers[Math.floor(Math.random() * testCustomers.length)]
        const barberId = barberIds[Math.floor(Math.random() * barberIds.length)]
        const serviceIndex = Math.floor(Math.random() * serviceIds.length)
        const serviceId = serviceIds[serviceIndex]
        
        const startTime = new Date(appointmentDate)
        startTime.setHours(9 + (i * 2), Math.random() > 0.5 ? 0 : 30, 0, 0)
        
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + durations[serviceIndex])
        
        const statuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled']
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        
        appointments.push({
          shop_id: shopId,
          barber_id: barberId,
          service_id: serviceId,
          customer_id: 'e91dd39c-21e6-41ea-8ac3-c908e6fb88f2', // Default test customer ID
          customer_name: `${customer.name} (Test)`,
          customer_email: customer.email,
          customer_phone: customer.phone,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          service_name: serviceNames[serviceIndex],
          duration_minutes: durations[serviceIndex],
          price: prices[serviceIndex],
          status: status,
          notes: `Test appointment - ${status === 'cancelled' ? 'Cancelled for testing' : 'Regular test customer'}`
        })
      }
    }
    
    console.log(`📝 Creating ${appointments.length} test appointments...`)
    
    const batchSize = 10
    let created = 0
    
    for (let i = 0; i < appointments.length; i += batchSize) {
      const batch = appointments.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('bookings')
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error)
        continue
      }
      
      created += data?.length || 0
      console.log(`  ✅ Created batch ${Math.floor(i/batchSize) + 1}: ${data?.length || 0} appointments`)
    }
    
    console.log('\n' + '=' .repeat(60))
    console.log(`🎉 Successfully created ${created} test appointments!`)
    console.log('\n📊 Test Data Summary:')
    
    const statusCounts = {}
    appointments.forEach(apt => {
      statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1
    })
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} appointments`)
    })
    
    console.log('\n📅 Calendar should now show:')
    console.log('  ✅ Real appointments from database')
    console.log('  ✅ Cancelled appointments with visual indicators')
    console.log('  ✅ Real-time updates when you create/cancel appointments')
    console.log('\n🔧 Test the cancel functionality:')
    console.log('  1. Click on any confirmed appointment')
    console.log('  2. Click "Cancel Appointment"')
    console.log('  3. Should immediately show red color with ❌ emoji')
    
  } catch (error) {
    console.error('❌ Error populating test data:', error.message)
  }
  
  process.exit(0)
}

populateTestAppointments()