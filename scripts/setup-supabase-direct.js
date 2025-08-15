#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '../.env.local')
try {
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
} catch (error) {
  console.log('Warning: Could not load .env.local file')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🚀 Setting up Supabase database directly...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupSupabase() {
  console.log('\n📋 Step 1: Creating barbershops table...')
  
  
  try {
    const testBarbershop = {
      name: 'The Classic Cut',
      slug: 'classic-cut-demo-' + Date.now(),
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      phone: '(555) 123-4567',
      email: 'info@classiccut.com',
      is_active: true
    }

    console.log('🔍 Testing barbershop insertion...')
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .insert(testBarbershop)
      .select()
      .single()

    if (barbershopError) {
      if (barbershopError.message.includes('does not exist')) {
        console.log('❌ Tables do not exist yet. Please create them manually in Supabase dashboard.')
        console.log('📋 Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee')
        console.log('📋 Open SQL Editor and run: database/setup-calendar-tables.sql')
        return false
      } else {
        console.log('⚠️  Barbershop creation error:', barbershopError.message)
        return false
      }
    }

    console.log('✅ Successfully created barbershop:', barbershop.name)

    console.log('\n👨‍💼 Step 2: Creating test barber...')
    const testBarber = {
      barbershop_id: barbershop.id,
      name: 'Tony Rodriguez',
      email: 'tony@classiccut.com',
      phone: '(555) 123-4568',
      is_available: true
    }

    const { data: barber, error: barberError } = await supabase
      .from('barbers')
      .insert(testBarber)
      .select()
      .single()

    if (barberError) {
      console.log('⚠️  Barber creation error:', barberError.message)
      return false
    }

    console.log('✅ Successfully created barber:', barber.name)

    console.log('\n✂️  Step 3: Creating test service...')
    const testService = {
      barbershop_id: barbershop.id,
      name: 'Classic Haircut',
      description: 'Traditional haircut with scissors and clippers',
      price: 35.00,
      duration_minutes: 30,
      category: 'Hair',
      is_active: true
    }

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert(testService)
      .select()
      .single()

    if (serviceError) {
      console.log('⚠️  Service creation error:', serviceError.message)
      return false
    }

    console.log('✅ Successfully created service:', service.name)

    console.log('\n👤 Step 4: Creating test client...')
    const testClient = {
      barbershop_id: barbershop.id,
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '(555) 987-6543',
      status: 'active'
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert(testClient)
      .select()
      .single()

    if (clientError) {
      console.log('⚠️  Client creation error:', clientError.message)
      return false
    }

    console.log('✅ Successfully created client:', client.name)

    console.log('\n📅 Step 5: Creating test appointment...')
    const appointmentTime = new Date()
    appointmentTime.setHours(appointmentTime.getHours() + 24) // Tomorrow at same time

    const testAppointment = {
      barbershop_id: barbershop.id,
      client_id: client.id,
      barber_id: barber.id,
      service_id: service.id,
      scheduled_at: appointmentTime.toISOString(),
      duration_minutes: service.duration_minutes,
      client_name: client.name,
      client_phone: client.phone,
      service_price: service.price,
      status: 'CONFIRMED'
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert(testAppointment)
      .select()
      .single()

    if (appointmentError) {
      console.log('⚠️  Appointment creation error:', appointmentError.message)
      return false
    }

    console.log('✅ Successfully created appointment for:', appointment.client_name)

    console.log('\n🎉 Database setup successful!')
    console.log('=====================================')
    console.log('📊 Created test data:')
    console.log(`   • Barbershop: ${barbershop.name}`)
    console.log(`   • Barber: ${barber.name}`)
    console.log(`   • Service: ${service.name} ($${service.price})`)
    console.log(`   • Client: ${client.name}`)
    console.log(`   • Appointment: ${appointmentTime.toLocaleDateString()}`)
    console.log('')
    console.log('🔗 Test your calendar: http://localhost:9999/dashboard/calendar')
    console.log('📈 Generate more data: node scripts/create-test-data.js')
    console.log('')

    return true

  } catch (error) {
    console.error('❌ Setup failed:', error)
    return false
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupSupabase().then(success => {
    if (!success) {
      console.log('\n💡 Next steps:')
      console.log('1. Create tables manually in Supabase dashboard')
      console.log('2. Copy/paste database/setup-calendar-tables.sql')
      console.log('3. Run this script again: node scripts/setup-supabase-direct.js')
      process.exit(1)
    }
  }).catch(console.error)
}

export default setupSupabase