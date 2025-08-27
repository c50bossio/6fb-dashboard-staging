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
  
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupSupabase() {

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

    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .insert(testBarbershop)
      .select()
      .single()

    if (barbershopError) {
      if (barbershopError.message.includes('does not exist')) {

        return false
      } else {
        
        return false
      }
    }

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
      
      return false
    }

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
      
      return false
    }

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
      
      return false
    }

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
      
      return false
    }

    `)
    
    }`)

    return true

  } catch (error) {
    console.error('❌ Setup failed:', error)
    return false
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupSupabase().then(success => {
    if (!success) {

      process.exit(1)
    }
  }).catch(console.error)
}

export default setupSupabase