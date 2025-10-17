#!/usr/bin/env node

/**
 * Seed rich test data for AgentKit demonstration
 * Adds: appointments with tips, multiple barbers, real customer data
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const DEMO_BARBERSHOP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function seedRichData() {
  console.log('🌱 Seeding rich test data...\n')

  // Step 1: Create barber profiles
  console.log('👨‍🦲 Creating barber profiles...')

  const barbers = [
    {
      id: randomUUID(),
      email: `marcus.johnson@6fb.com`,
      name: 'Marcus Johnson',
      role: 'BARBER',
      commission_rate: 0.60 // 60% commission
    },
    {
      id: randomUUID(),
      email: `tony.martinez@6fb.com`,
      name: 'Tony Martinez',
      role: 'BARBER',
      commission_rate: 0.55 // 55% commission
    },
    {
      id: randomUUID(),
      email: `carlos.rodriguez@6fb.com`,
      name: 'Carlos Rodriguez',
      role: 'BARBER',
      commission_rate: 0.65 // 65% commission (senior barber)
    }
  ]

  console.log(`Creating ${barbers.length} barbers...`)

  // Note: Supabase users table might be managed by auth, so we'll skip user creation
  // and just use these IDs for appointments

  barbers.forEach(b => {
    console.log(`   - ${b.name} (${b.commission_rate * 100}% commission)`)
  })

  // Step 2: Get services
  console.log('\n💇 Fetching services...')

  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, price')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)

  if (servicesError) {
    console.error('❌ Error fetching services:', servicesError.message)
    return
  }

  console.log(`Found ${services.length} services:`)
  services.forEach(s => console.log(`   - ${s.name}: $${s.price}`))

  // Step 3: Create customers
  console.log('\n👥 Creating customer profiles...')

  const customers = [
    { id: randomUUID(), name: 'Michael Davis', phone: '555-0101', email: 'michael.davis@email.com' },
    { id: randomUUID(), name: 'James Wilson', phone: '555-0102', email: 'james.wilson@email.com' },
    { id: randomUUID(), name: 'Robert Taylor', phone: '555-0103', email: 'robert.taylor@email.com' },
    { id: randomUUID(), name: 'David Anderson', phone: '555-0104', email: 'david.anderson@email.com' },
    { id: randomUUID(), name: 'William Thomas', phone: '555-0105', email: 'william.thomas@email.com' }
  ]

  console.log(`Generated ${customers.length} customer profiles`)

  // Step 4: Create appointments with tips
  console.log('\n📅 Creating appointments with tips and commissions...')

  const appointmentsToCreate = []
  const today = new Date('2025-10-07')

  // Create appointments for the past 7 days with varying tips
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today)
    date.setDate(date.getDate() - dayOffset)

    // 2-4 appointments per day
    const appointmentsPerDay = 2 + Math.floor(Math.random() * 3)

    for (let i = 0; i < appointmentsPerDay; i++) {
      const hour = 9 + Math.floor(Math.random() * 9) // 9 AM to 6 PM
      date.setHours(hour, 0, 0, 0)

      const barber = barbers[Math.floor(Math.random() * barbers.length)]
      const customer = customers[Math.floor(Math.random() * customers.length)]
      const service = services[Math.floor(Math.random() * services.length)]

      const servicePrice = parseFloat(service.price)

      // Random tip: 0%, 10%, 15%, or 20%
      const tipPercentages = [0, 0, 0.10, 0.15, 0.20] // More likely to have no tip
      const tipPercent = tipPercentages[Math.floor(Math.random() * tipPercentages.length)]
      const tipAmount = Math.round(servicePrice * tipPercent * 100) / 100

      const totalAmount = servicePrice + tipAmount

      appointmentsToCreate.push({
        id: randomUUID(),
        barbershop_id: DEMO_BARBERSHOP_ID,
        client_id: customer.id,
        barber_id: barber.id,
        service_id: service.id,
        scheduled_at: date.toISOString(),
        duration_minutes: 30,
        status: dayOffset === 0 ? 'CONFIRMED' : 'COMPLETED',
        service_price: servicePrice,
        tip_amount: tipAmount,
        total_amount: totalAmount,
        client_name: customer.name,
        client_phone: customer.phone,
        client_email: customer.email,
        created_at: date.toISOString(),
        updated_at: date.toISOString()
      })
    }
  }

  console.log(`Generated ${appointmentsToCreate.length} appointments`)
  console.log(`\nSample appointments:`)
  appointmentsToCreate.slice(0, 5).forEach(apt => {
    const barber = barbers.find(b => b.id === apt.barber_id)
    const service = services.find(s => s.id === apt.service_id)
    console.log(`   - ${apt.client_name} → ${barber.name} (${service.name})`)
    console.log(`     Service: $${apt.service_price}, Tip: $${apt.tip_amount}, Total: $${apt.total_amount}`)
  })

  // Step 5: Insert appointments
  console.log(`\n💾 Inserting ${appointmentsToCreate.length} appointments into database...`)

  const { data: insertedAppointments, error: insertError } = await supabase
    .from('appointments')
    .insert(appointmentsToCreate)
    .select()

  if (insertError) {
    console.error('❌ Error inserting appointments:', insertError.message)
    return
  }

  console.log(`✅ Successfully inserted ${insertedAppointments.length} appointments`)

  // Step 6: Calculate summary statistics
  console.log('\n📊 Summary Statistics...')

  const { data: allAppointments, error: summaryError } = await supabase
    .from('appointments')
    .select('service_price, tip_amount, total_amount, status, barber_id')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)
    .gte('scheduled_at', '2025-10-01T00:00:00')
    .lte('scheduled_at', '2025-10-31T23:59:59')
    .in('status', ['CONFIRMED', 'COMPLETED'])

  if (!summaryError && allAppointments) {
    const totalRevenue = allAppointments.reduce((sum, a) => sum + parseFloat(a.total_amount || 0), 0)
    const totalTips = allAppointments.reduce((sum, a) => sum + parseFloat(a.tip_amount || 0), 0)
    const totalService = allAppointments.reduce((sum, a) => sum + parseFloat(a.service_price || 0), 0)

    console.log(`   Total Appointments: ${allAppointments.length}`)
    console.log(`   Service Revenue: $${totalService.toFixed(2)}`)
    console.log(`   Tips Revenue: $${totalTips.toFixed(2)}`)
    console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`)
    console.log(`   Average Tip: $${(totalTips / allAppointments.length).toFixed(2)}`)

    // Breakdown by barber
    console.log(`\n   Revenue by Barber:`)
    barbers.forEach(barber => {
      const barberAppointments = allAppointments.filter(a => a.barber_id === barber.id)
      if (barberAppointments.length > 0) {
        const barberRevenue = barberAppointments.reduce((sum, a) => sum + parseFloat(a.total_amount || 0), 0)
        const commission = barberRevenue * barber.commission_rate
        console.log(`   - ${barber.name}: $${barberRevenue.toFixed(2)} (Commission: $${commission.toFixed(2)})`)
      }
    })
  }

  console.log('\n✅ Rich test data seeding complete!')
  console.log('\n🎯 Next Steps:')
  console.log('   1. Restart FastAPI backend to pick up changes')
  console.log('   2. Test "Show me commission breakdown" query')
  console.log('   3. Test "How many customers do we have" query')
  console.log('   4. Test revenue queries with tip breakdowns')
  console.log('')
}

seedRichData().catch(console.error)
