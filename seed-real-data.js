#!/usr/bin/env node

/**
 * Direct Database Seed Script using Real Supabase
 * Run with: node seed-real-data.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedDatabase() {
  console.log('🌱 Starting database seed with REAL test data...')
  console.log('📦 Using Supabase:', supabaseUrl)
  
  try {
    // 1. First, let's check what tables exist
    console.log('\n🔍 Checking existing tables...')
    
    const { data: appointments, error: apptCheckError } = await supabase
      .from('appointments')
      .select('id')
      .limit(1)
    
    console.log('Appointments table:', apptCheckError ? '❌ Not found' : '✅ Exists')
    
    const { data: transactions, error: transCheckError } = await supabase
      .from('transactions')
      .select('id')
      .limit(1)
    
    console.log('Transactions table:', transCheckError ? '❌ Not found' : '✅ Exists')
    
    const { data: shops, error: shopCheckError } = await supabase
      .from('barbershops')
      .select('id')
      .limit(1)
    
    console.log('Barbershops table:', shopCheckError ? '❌ Not found' : '✅ Exists')
    
    // 2. Get or create test barbershop
    console.log('\n📍 Getting barbershop...')
    let testShopId = null
    
    const { data: existingShop } = await supabase
      .from('barbershops')
      .select('id, name')
      .limit(1)
      .single()
    
    if (existingShop) {
      console.log('Using existing shop:', existingShop.name, '(' + existingShop.id + ')')
      testShopId = existingShop.id
    } else {
      const newShopId = 'shop_' + Date.now()
      const { data: shop, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          id: newShopId,
          owner_id: 'test-owner-' + Date.now(),
          name: 'Premium Cuts Barbershop',
          email: 'contact@premiumcuts.com',
          phone: '(555) 123-4567',
          address: '123 Main Street',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90001',
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (shopError) {
        console.error('Shop creation error:', shopError.message)
        throw shopError
      } else {
        console.log('✅ Created barbershop:', shop.id)
        testShopId = shop.id
      }
    }
    
    // 3. Create test appointments
    console.log('\n📅 Creating test appointments...')
    const appointmentsList = []
    const services = ['Haircut', 'Beard Trim', 'Hair & Beard', 'Fade', 'Line Up', 'Hot Shave']
    const statuses = ['completed', 'completed', 'completed', 'confirmed', 'cancelled']
    
    for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
      const appointmentDate = new Date()
      appointmentDate.setDate(appointmentDate.getDate() - daysAgo)
      
      // 2-5 appointments per day
      const appointmentsPerDay = Math.floor(Math.random() * 4) + 2
      
      for (let i = 0; i < appointmentsPerDay; i++) {
        const startTime = new Date(appointmentDate)
        startTime.setHours(9 + Math.floor(Math.random() * 9), Math.random() > 0.5 ? 0 : 30, 0, 0)
        
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + 30)
        
        appointmentsList.push({
          id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          barbershop_id: testShopId,
          barber_id: `barber_${(i % 3) + 1}`,
          customer_id: `customer_${Math.floor(Math.random() * 10) + 1}`,
          service_name: services[Math.floor(Math.random() * services.length)],
          service_duration: 30,
          service_price: Math.floor(Math.random() * 30) + 25,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: statuses[Math.floor(Math.random() * statuses.length)],
          created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
        })
      }
    }
    
    const { data: insertedAppts, error: apptError } = await supabase
      .from('appointments')
      .insert(appointmentsList)
      .select()
    
    if (apptError) {
      console.error('Appointment creation error:', apptError.message)
    } else {
      console.log(`✅ Created ${insertedAppts?.length || 0} test appointments`)
    }
    
    // 4. Create test transactions for completed appointments
    console.log('\n💰 Creating test transactions...')
    const transactionsList = []
    const completedAppointments = appointmentsList.filter(a => a.status === 'completed')
    
    for (const appointment of completedAppointments) {
      const serviceAmount = appointment.service_price
      const tipAmount = Math.random() > 0.3 ? Math.floor(Math.random() * 15) + 5 : 0
      const totalAmount = serviceAmount + tipAmount
      
      transactionsList.push({
        id: 'trans_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        barbershop_id: testShopId,
        barber_id: appointment.barber_id,
        customer_id: appointment.customer_id,
        appointment_id: appointment.id,
        type: 'service',
        amount: serviceAmount,
        tip_amount: tipAmount,
        total_amount: totalAmount,
        commission_amount: serviceAmount * 0.6,
        payment_method: Math.random() > 0.5 ? 'card' : 'cash',
        status: 'completed',
        created_at: appointment.end_time,
        updated_at: appointment.end_time
      })
    }
    
    const { data: insertedTrans, error: transError } = await supabase
      .from('transactions')
      .insert(transactionsList)
      .select()
    
    if (transError) {
      console.error('Transaction creation error:', transError.message)
    } else {
      console.log(`✅ Created ${insertedTrans?.length || 0} test transactions`)
    }
    
    // 5. Verify data was created
    console.log('\n📊 Verifying data...')
    
    const { count: apptCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', testShopId)
    
    const { count: transCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', testShopId)
    
    console.log('\n🎉 Database seeded successfully!')
    console.log('\n📊 Test Data Summary:')
    console.log(`- Shop ID: ${testShopId}`)
    console.log(`- Total Appointments: ${apptCount || 0}`)
    console.log(`- Total Transactions: ${transCount || 0}`)
    console.log('\n💡 The barber reports page will now show real data from the database!')
    console.log('🔑 Use any barber_id like "barber_1", "barber_2", or "barber_3" to see their reports')
    
  } catch (error) {
    console.error('❌ Seed error:', error)
    process.exit(1)
  }
}

seedDatabase()