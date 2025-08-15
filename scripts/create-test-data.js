#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf8')
const envLines = envContent.split('\n')

envLines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key] = valueParts.join('=')
    }
  }
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const BARBERSHOP_NAMES = [
  'The Classic Cut', 'Modern Barber Co', 'Vintage Cuts & Styles', 
  'Sharp Edge Barbershop', 'Gentleman\'s Choice', 'Urban Style Lounge'
]

const BARBER_NAMES = [
  'Marcus Johnson', 'Tony Rodriguez', 'David Chen', 'Michael Brown',
  'Alex Thompson', 'Carlos Martinez', 'Kevin White', 'Ryan Davis',
  'Luis Garcia', 'James Wilson', 'Andre Jackson', 'Tommy Lee'
]

const SERVICE_TEMPLATES = [
  { name: 'Classic Haircut', description: 'Traditional haircut with scissors and clippers', price: 35, duration: 30, category: 'Hair' },
  { name: 'Fade Cut', description: 'Modern fade haircut with precise blending', price: 45, duration: 45, category: 'Hair' },
  { name: 'Buzz Cut', description: 'Quick and clean buzz cut', price: 25, duration: 20, category: 'Hair' },
  { name: 'Beard Trim', description: 'Professional beard shaping and trimming', price: 25, duration: 20, category: 'Beard' },
  { name: 'Hot Towel Shave', description: 'Luxury hot towel shave with straight razor', price: 50, duration: 45, category: 'Shave' },
  { name: 'Mustache Trim', description: 'Precise mustache grooming', price: 15, duration: 15, category: 'Beard' },
  { name: 'Hair & Beard Combo', description: 'Complete haircut and beard grooming package', price: 60, duration: 60, category: 'Package' },
  { name: 'Kids Haircut', description: 'Special haircut for children under 12', price: 20, duration: 25, category: 'Hair' },
  { name: 'Senior Haircut', description: 'Discounted haircut for seniors 65+', price: 28, duration: 30, category: 'Hair' },
  { name: 'Hair Wash & Style', description: 'Professional wash and styling', price: 35, duration: 30, category: 'Hair' }
]

const CLIENT_NAMES = [
  'John Smith', 'Michael Johnson', 'Robert Williams', 'David Brown', 'James Davis',
  'William Miller', 'Richard Wilson', 'Joseph Moore', 'Thomas Taylor', 'Christopher Anderson',
  'Daniel Thomas', 'Matthew Jackson', 'Anthony White', 'Mark Harris', 'Donald Martin',
  'Steven Thompson', 'Paul Garcia', 'Joshua Martinez', 'Kenneth Robinson', 'Kevin Clark'
]

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function generateEmail(name) {
  return name.toLowerCase().replace(/\s+/g, '.') + '@' + randomChoice(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'])
}

function generatePhone() {
  return `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
}

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function createTestData() {
  try {
    console.log('🏪 6FB AI Agent System - Creating test barbershop data...')
    console.log('================================================================\n')
    
    console.log('🔍 Environment check:')
    console.log('   Supabase URL:', supabaseUrl ? '✅ Connected' : '❌ Missing')
    console.log('   Service Key:', supabaseServiceKey ? '✅ Available' : '❌ Missing')
    console.log('')

    console.log('1. Creating barbershops...')
    const barbershops = []
    
    for (let i = 0; i < 3; i++) {
      const name = BARBERSHOP_NAMES[i]
      const barbershopData = {
        name,
        slug: generateSlug(name) + '-' + Math.floor(Math.random() * 1000),
        address: `${Math.floor(Math.random() * 9999) + 1} Main St`,
        city: randomChoice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
        state: randomChoice(['NY', 'CA', 'IL', 'TX', 'AZ']),
        postal_code: `${Math.floor(Math.random() * 90000) + 10000}`,
        phone: generatePhone(),
        email: generateEmail(name),
        timezone: 'America/New_York',
        is_active: true
      }

      const { data, error } = await supabase
        .from('barbershops')
        .insert(barbershopData)
        .select()
        .single()

      if (error) {
        console.error(`Error creating barbershop ${name}:`, error)
        continue
      }

      barbershops.push(data)
      console.log(`  ✅ Created: ${name} (${data.id})`)
    }

    console.log('\n2. Creating barbers...')
    const barbers = []
    
    for (const barbershop of barbershops) {
      const numBarbers = Math.floor(Math.random() * 3) + 2 // 2-4 barbers per shop
      
      for (let i = 0; i < numBarbers; i++) {
        const name = BARBER_NAMES[Math.floor(Math.random() * BARBER_NAMES.length)]
        const barberData = {
          barbershop_id: barbershop.id,
          name,
          email: generateEmail(name),
          phone: generatePhone(),
          bio: `Professional barber with ${Math.floor(Math.random() * 15) + 2} years of experience.`,
          skills: randomChoice([
            ['Fade Cuts', 'Beard Trimming'],
            ['Classic Cuts', 'Straight Razor Shaves'],
            ['Modern Styles', 'Hair Washing'],
            ['Kids Cuts', 'Senior Cuts']
          ]),
          hourly_rate: Math.floor(Math.random() * 30) + 25, // $25-55/hour
          commission_rate: Math.floor(Math.random() * 20) + 40, // 40-60%
          hire_date: randomDate(new Date(2020, 0, 1), new Date(2024, 0, 1)),
          status: 'active',
          is_available: true
        }

        const { data, error } = await supabase
          .from('barbers')
          .insert(barberData)
          .select()
          .single()

        if (error) {
          console.error(`Error creating barber ${name}:`, error)
          continue
        }

        barbers.push(data)
        console.log(`  ✅ Created: ${name} at ${barbershop.name}`)
      }
    }

    console.log('\n3. Creating services...')
    const services = []
    
    for (const barbershop of barbershops) {
      const numServices = Math.floor(Math.random() * 4) + 3 // 3-6 services per shop
      const selectedServices = [...SERVICE_TEMPLATES]
        .sort(() => 0.5 - Math.random())
        .slice(0, numServices)
      
      for (const serviceTemplate of selectedServices) {
        const serviceData = {
          barbershop_id: barbershop.id,
          name: serviceTemplate.name,
          description: serviceTemplate.description,
          duration_minutes: serviceTemplate.duration,
          price: serviceTemplate.price + (Math.floor(Math.random() * 11) - 5), // ±$5 variation
          category: serviceTemplate.category,
          requires_consultation: serviceTemplate.category === 'Package',
          deposit_required: serviceTemplate.price > 40,
          deposit_percentage: serviceTemplate.price > 40 ? 20 : 0,
          is_active: true,
          sort_order: Math.floor(Math.random() * 10)
        }

        const { data, error } = await supabase
          .from('services')
          .insert(serviceData)
          .select()
          .single()

        if (error) {
          console.error(`Error creating service ${serviceTemplate.name}:`, error)
          continue
        }

        services.push(data)
        console.log(`  ✅ Created: ${serviceTemplate.name} at ${barbershop.name} - $${data.price}`)
      }
    }

    console.log('\n4. Creating clients...')
    const clients = []
    
    for (const barbershop of barbershops) {
      const numClients = Math.floor(Math.random() * 8) + 12 // 12-19 clients per shop
      
      for (let i = 0; i < numClients; i++) {
        const name = CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)]
        const clientData = {
          barbershop_id: barbershop.id,
          name,
          email: generateEmail(name),
          phone: generatePhone(),
          date_of_birth: randomDate(new Date(1950, 0, 1), new Date(2010, 0, 1)),
          preferences: {
            preferred_time: randomChoice(['morning', 'afternoon', 'evening']),
            communication: randomChoice(['email', 'text', 'call'])
          },
          notes: randomChoice([
            'Regular customer, prefers Tony',
            'Always on time, great tipper',
            'Likes to chat about sports',
            'Prefers quiet service',
            'New customer, first visit'
          ]),
          last_visit_date: randomDate(new Date(2024, 0, 1), new Date()),
          total_visits: Math.floor(Math.random() * 20) + 1,
          total_spent: Math.floor(Math.random() * 500) + 50,
          status: 'active'
        }

        const { data, error } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single()

        if (error) {
          console.error(`Error creating client ${name}:`, error)
          continue
        }

        clients.push(data)
        console.log(`  ✅ Created: ${name} (${data.total_visits} visits, $${data.total_spent} spent)`)
      }
    }

    console.log('\n5. Creating appointments...')
    const appointments = []
    
    const now = new Date()
    const futureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    
    for (let day = 0; day < 30; day++) {
      const appointmentDate = new Date(now.getTime() + (day * 24 * 60 * 60 * 1000))
      
      if (appointmentDate.getDay() === 0 && Math.random() > 0.3) continue
      
      for (const barbershop of barbershops) {
        const shopBarbers = barbers.filter(b => b.barbershop_id === barbershop.id)
        const shopServices = services.filter(s => s.barbershop_id === barbershop.id)
        const shopClients = clients.filter(c => c.barbershop_id === barbershop.id)
        
        const numAppointments = Math.floor(Math.random() * 6) + 3
        
        for (let i = 0; i < numAppointments; i++) {
          const barber = randomChoice(shopBarbers)
          const service = randomChoice(shopServices)
          const client = randomChoice(shopClients)
          
          const hour = Math.floor(Math.random() * 9) + 9
          const minute = randomChoice([0, 15, 30, 45])
          
          const scheduledAt = new Date(appointmentDate)
          scheduledAt.setHours(hour, minute, 0, 0)
          
          if (scheduledAt < now) continue
          
          const appointmentData = {
            barbershop_id: barbershop.id,
            client_id: client.id,
            barber_id: barber.id,
            service_id: service.id,
            scheduled_at: scheduledAt.toISOString(),
            duration_minutes: service.duration_minutes,
            client_name: client.name,
            client_phone: client.phone,
            client_email: client.email,
            service_price: service.price,
            tip_amount: Math.random() > 0.7 ? Math.floor(Math.random() * 15) + 5 : 0,
            status: randomChoice(['PENDING', 'CONFIRMED', 'CONFIRMED', 'CONFIRMED']), // More confirmed than pending
            booking_source: randomChoice(['online', 'phone', 'walk_in']),
            confirmation_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            reminder_sent: Math.random() > 0.5,
            is_walk_in: Math.random() > 0.8,
            payment_status: randomChoice(['UNPAID', 'PAID', 'PAID']) // More paid than unpaid
          }

          const { data, error } = await supabase
            .from('appointments')
            .insert(appointmentData)
            .select()
            .single()

          if (error) {
            if (error.code === '23P01') continue
            console.error(`Error creating appointment:`, error)
            continue
          }

          appointments.push(data)
          console.log(`  ✅ Created: ${client.name} → ${barber.name} (${service.name}) on ${scheduledAt.toLocaleDateString()}`)
        }
      }
    }

    console.log('\n🎉 Test data creation completed!')
    console.log('=====================================')
    console.log(`📊 Summary:`)
    console.log(`   • Barbershops: ${barbershops.length}`)
    console.log(`   • Barbers: ${barbers.length}`)
    console.log(`   • Services: ${services.length}`)
    console.log(`   • Clients: ${clients.length}`)
    console.log(`   • Appointments: ${appointments.length}`)
    console.log('')
    console.log('🔗 Test your calendar system at: http://localhost:9999/dashboard/calendar')
    console.log('🗑️  To remove test data later: node scripts/cleanup-test-data.js')
    console.log('')

    return {
      barbershops,
      barbers,
      services,
      clients,
      appointments
    }

  } catch (error) {
    console.error('❌ Fatal error creating test data:', error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createTestData().catch(console.error)
}

export default createTestData