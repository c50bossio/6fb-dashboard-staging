#!/usr/bin/env node

/**
 * Database Seed Script for Test Data
 * Populates the database with realistic test data for development
 * 
 * Usage: node database/seed-test-data.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function seedDatabase() {
  console.log('🌱 Starting database seed...')
  
  try {
    // 1. Create test shop owner
    console.log('Creating shop owner...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'shopowner@test.com',
      password: 'testpass123',
      email_confirm: true,
      user_metadata: {
        full_name: 'John Shop Owner',
        role: 'SHOP_OWNER'
      }
    })
    
    if (authError && !authError.message.includes('already been registered')) {
      throw authError
    }
    
    const shopOwnerId = authData?.user?.id || 'existing-owner-id'
    
    // 2. Create test barbershop
    console.log('Creating barbershop...')
    const { data: shop, error: shopError } = await supabase
      .from('barbershops')
      .upsert({
        owner_id: shopOwnerId,
        name: 'Premium Cuts Barbershop',
        email: 'contact@premiumcuts.com',
        phone: '(555) 123-4567',
        address: '123 Main Street',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'USA',
        description: 'A premium barbershop offering top-notch grooming services',
        business_hours: JSON.stringify({
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '17:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true }
        }),
        is_active: true
      }, {
        onConflict: 'owner_id'
      })
      .select()
      .single()
    
    if (shopError) {
      console.error('Shop creation error:', shopError)
    }
    
    const shopId = shop?.id || 'existing-shop-id'
    
    // 3. Create test barbers
    console.log('Creating barbers...')
    const barberEmails = [
      { email: 'barber1@test.com', name: 'Mike Barber' },
      { email: 'barber2@test.com', name: 'Sarah Stylist' },
      { email: 'barber3@test.com', name: 'Tom Trimmer' }
    ]
    
    const barberIds = []
    for (const barber of barberEmails) {
      const { data: barberAuth, error: barberError } = await supabase.auth.admin.createUser({
        email: barber.email,
        password: 'testpass123',
        email_confirm: true,
        user_metadata: {
          full_name: barber.name,
          role: 'BARBER'
        }
      })
      
      if (!barberError || barberError.message.includes('already been registered')) {
        const barberId = barberAuth?.user?.id || `barber-${barber.email}`
        barberIds.push(barberId)
        
        await supabase
          .from('barbershop_staff')
          .upsert({
            barbershop_id: shopId,
            user_id: barberId,
            role: 'BARBER',
            is_active: true,
            commission_rate: 60,
            financial_model: 'commission'
          }, {
            onConflict: 'barbershop_id,user_id'
          })
      }
    }
    
    // 4. Create test customers
    console.log('Creating customers...')
    const customerNames = [
      'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince',
      'Edward Norton', 'Fiona Apple', 'George Lucas', 'Helen Hunt',
      'Ian McKellen', 'Julia Roberts'
    ]
    
    const customerIds = []
    for (const name of customerNames) {
      const { data: customer, error: custError } = await supabase
        .from('customers')
        .upsert({
          barbershop_id: shopId,
          full_name: name,
          email: `${name.toLowerCase().replace(' ', '.')}@customer.com`,
          phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
        }, {
          onConflict: 'email'
        })
        .select()
        .single()
      
      if (customer) {
        customerIds.push(customer.id)
      }
    }
    
    // 5. Create test appointments
    console.log('Creating appointments...')
    const services = ['Haircut', 'Beard Trim', 'Hair & Beard', 'Fade', 'Line Up', 'Hot Shave']
    const statuses = ['completed', 'completed', 'completed', 'confirmed', 'cancelled']
    const appointments = []
    
    for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
      const appointmentDate = new Date()
      appointmentDate.setDate(appointmentDate.getDate() - daysAgo)
      appointmentDate.setHours(9, 0, 0, 0)
      
      // 3-8 appointments per day
      const appointmentsPerDay = Math.floor(Math.random() * 6) + 3
      
      for (let i = 0; i < appointmentsPerDay; i++) {
        const startTime = new Date(appointmentDate)
        startTime.setHours(9 + Math.floor(Math.random() * 9), Math.random() > 0.5 ? 0 : 30)
        
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + 30)
        
        const barberId = barberIds[Math.floor(Math.random() * barberIds.length)]
        const customerId = customerIds[Math.floor(Math.random() * customerIds.length)]
        const service = services[Math.floor(Math.random() * services.length)]
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        
        appointments.push({
          barbershop_id: shopId,
          barber_id: barberId,
          customer_id: customerId,
          service_name: service,
          service_duration: 30,
          service_price: Math.floor(Math.random() * 30) + 25,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: status,
          created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
        })
      }
    }
    
    const { error: apptError } = await supabase
      .from('appointments')
      .insert(appointments)
    
    if (apptError) {
      console.error('Appointment creation error:', apptError)
    }
    
    // 6. Create test transactions
    console.log('Creating transactions...')
    const transactions = []
    
    const completedAppointments = appointments.filter(a => a.status === 'completed')
    for (const appointment of completedAppointments) {
      const serviceAmount = appointment.service_price
      const tipAmount = Math.random() > 0.3 ? Math.floor(Math.random() * 15) + 5 : 0
      const totalAmount = serviceAmount + tipAmount
      
      transactions.push({
        barbershop_id: shopId,
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
        created_at: appointment.end_time
      })
    }
    
    const { error: transError } = await supabase
      .from('transactions')
      .insert(transactions)
    
    if (transError) {
      console.error('Transaction creation error:', transError)
    }
    
    // 7. Create some reviews
    console.log('Creating reviews...')
    const reviews = []
    const reviewComments = [
      'Great haircut, very professional!',
      'Always happy with the service',
      'Best barbershop in town',
      'Excellent attention to detail',
      'Quick and efficient service'
    ]
    
    for (let i = 0; i < 20; i++) {
      reviews.push({
        barbershop_id: shopId,
        barber_id: barberIds[Math.floor(Math.random() * barberIds.length)],
        customer_id: customerIds[Math.floor(Math.random() * customerIds.length)],
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
        comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
        created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
      })
    }
    
    const { error: reviewError } = await supabase
      .from('reviews')
      .insert(reviews)
    
    if (reviewError) {
      console.error('Review creation error:', reviewError)
    }
    
    console.log('✅ Database seeded successfully!')
    console.log('\n📊 Test Data Summary:')
    console.log(`- 1 Shop Owner (shopowner@test.com / testpass123)`)
    console.log(`- 1 Barbershop (Premium Cuts)`)
    console.log(`- ${barberIds.length} Barbers`)
    console.log(`- ${customerIds.length} Customers`)
    console.log(`- ${appointments.length} Appointments`)
    console.log(`- ${transactions.length} Transactions`)
    console.log(`- ${reviews.length} Reviews`)
    
  } catch (error) {
    console.error('❌ Seed error:', error)
    process.exit(1)
  }
}

seedDatabase()