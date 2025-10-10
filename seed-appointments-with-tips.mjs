#!/usr/bin/env node

/**
 * Seed appointments with tips using existing users
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

async function seedAppointmentsWithTips() {
  console.log('🌱 Seeding appointments with tips...\n')

  // Get existing users
  console.log('👥 Fetching existing users...')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .limit(20)

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError.message)
    return
  }

  // Separate barbers and clients
  const barbers = profiles.filter(p => p.role === 'BARBER' || p.role === 'SHOP_OWNER').slice(0, 3)
  const clients = profiles.slice(0, 5)

  console.log(`Found ${barbers.length} barbers:`)
  barbers.forEach(b => console.log(`   - ${b.full_name} (${b.role})`))

  console.log(`\nUsing ${clients.length} clients:`)
  clients.forEach(c => console.log(`   - ${c.full_name}`))

  // Get services
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

  // Create appointments with tips
  console.log('\n📅 Creating appointments with tips...')

  const appointmentsToCreate = []
  const today = new Date('2025-10-07')

  // Create 15-20 appointments over past 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today)
    date.setDate(date.getDate() - dayOffset)

    // 2-3 appointments per day
    const appointmentsPerDay = 2 + Math.floor(Math.random() * 2)

    for (let i = 0; i < appointmentsPerDay; i++) {
      const hour = 9 + Math.floor(Math.random() * 9) // 9 AM to 6 PM
      date.setHours(hour, 0, 0, 0)

      const barber = barbers[Math.floor(Math.random() * barbers.length)]
      const client = clients[Math.floor(Math.random() * clients.length)]
      const service = services[Math.floor(Math.random() * services.length)]

      const servicePrice = parseFloat(service.price)

      // Tips: 50% chance of tip, then random 10%, 15%, or 20%
      let tipAmount = 0
      if (Math.random() > 0.5) {
        const tipPercents = [0.10, 0.15, 0.20]
        const tipPercent = tipPercents[Math.floor(Math.random() * tipPercents.length)]
        tipAmount = Math.round(servicePrice * tipPercent * 100) / 100
      }

      const totalAmount = servicePrice + tipAmount

      appointmentsToCreate.push({
        id: randomUUID(),
        barbershop_id: DEMO_BARBERSHOP_ID,
        client_id: client.id,
        barber_id: barber.id,
        service_id: service.id,
        scheduled_at: date.toISOString(),
        duration_minutes: 30,
        status: dayOffset === 0 ? 'CONFIRMED' : 'COMPLETED',
        service_price: servicePrice,
        tip_amount: tipAmount,
        total_amount: totalAmount,
        client_name: client.full_name,
        client_phone: '555-0100',
        client_email: 'client@example.com',
        created_at: date.toISOString(),
        updated_at: date.toISOString()
      })
    }
  }

  console.log(`Generated ${appointmentsToCreate.length} appointments`)
  console.log(`\n📊 Sample appointments:`)
  appointmentsToCreate.slice(0, 5).forEach(apt => {
    const barber = barbers.find(b => b.id === apt.barber_id)
    const service = services.find(s => s.id === apt.service_id)
    const tipInfo = apt.tip_amount > 0 ? `+ $${apt.tip_amount} tip` : '(no tip)'
    console.log(`   - ${apt.client_name} → ${barber.full_name}`)
    console.log(`     ${service.name}: $${apt.service_price} ${tipInfo} = $${apt.total_amount}`)
  })

  // Insert appointments
  console.log(`\n💾 Inserting ${appointmentsToCreate.length} appointments...`)

  const { data: insertedAppointments, error: insertError } = await supabase
    .from('appointments')
    .insert(appointmentsToCreate)
    .select()

  if (insertError) {
    console.error('❌ Error inserting appointments:', insertError.message)
    console.error('Details:', insertError)
    return
  }

  console.log(`✅ Successfully inserted ${insertedAppointments.length} appointments`)

  // Calculate summary
  console.log('\n📊 Revenue Summary (October 2025)...')

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
    const appointmentsWithTips = allAppointments.filter(a => parseFloat(a.tip_amount || 0) > 0)

    console.log(`   Total Appointments: ${allAppointments.length}`)
    console.log(`   Service Revenue: $${totalService.toFixed(2)}`)
    console.log(`   Tips Revenue: $${totalTips.toFixed(2)}`)
    console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`)
    console.log(`   Appointments with Tips: ${appointmentsWithTips.length} (${Math.round(appointmentsWithTips.length / allAppointments.length * 100)}%)`)
    console.log(`   Average Tip (when given): $${(totalTips / appointmentsWithTips.length).toFixed(2)}`)
  }

  console.log('\n✅ Seeding complete!')
  console.log('\n🎯 Test Queries:')
  console.log('   - "How much revenue did we make this month?"')
  console.log('   - "What\'s our tip revenue breakdown?"')
  console.log('   - "Show me commission summary for our barbers"')
  console.log('   - "How many customers do we have?"')
  console.log('')
}

seedAppointmentsWithTips().catch(console.error)
