#!/usr/bin/env node

/**
 * Comprehensive Test Data Generator for 6FB AI Agent System
 * Generates realistic barbershop data including appointments, services, and barbers
 */

import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables manually
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

// Initialize Supabase client with service role key for full access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Set faker seed for consistent but varied data
faker.seed(12345)

console.log('🚀 Starting comprehensive test data generation...')

async function generateTestData() {
  try {
    // Step 1: Create a realistic barbershop
    console.log('📍 Creating barbershop...')
    
    const barbershopData = {
      id: 'demo-shop-001',
      name: 'Elite Cuts & Grooming',
      slug: 'elite-cuts-grooming',
      address: '1234 Main Street, Downtown',
      city: 'San Francisco',
      state: 'CA',
      postal_code: '94102',
      phone: '+1 (415) 555-0123',
      email: 'booking@elitecuts.com',
      website: 'https://elitecuts.com',
      description: 'Premium barbershop specializing in modern cuts, traditional shaves, and executive grooming services.',
      business_hours: {
        monday: { open: '09:00', close: '19:00' },
        tuesday: { open: '09:00', close: '19:00' },
        wednesday: { open: '09:00', close: '19:00' },
        thursday: { open: '09:00', close: '20:00' },
        friday: { open: '09:00', close: '20:00' },
        saturday: { open: '08:00', close: '18:00' },
        sunday: { open: '10:00', close: '16:00' }
      },
      timezone: 'America/Los_Angeles',
      is_active: true,
      created_at: new Date().toISOString()
    }

    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .upsert([barbershopData])
      .select()
      .single()

    if (barbershopError && barbershopError.code !== '23505') {
      console.error('Error creating barbershop:', barbershopError)
      throw barbershopError
    }
    console.log('✅ Barbershop created/updated')

    // Step 2: Create 4 professional barbers
    console.log('✂️ Creating professional barbers...')
    
    const barbers = [
      {
        id: 'barber-1',
        barbershop_id: 'demo-shop-001',
        name: 'John Smith',
        email: 'john@elitecuts.com',
        phone: '+1 (415) 555-0124',
        bio: 'Master barber with 15+ years experience. Specializes in classic cuts, fades, and beard grooming.',
        skills: ['Classic Cuts', 'Fade Cuts', 'Beard Grooming', 'Hot Towel Shaves'],
        years_experience: 15,
        hourly_rate: 85.00,
        commission_rate: 60,
        status: 'active',
        is_available: true,
        hire_date: '2010-01-15',
        schedule: {
          monday: { start: '09:00', end: '18:00' },
          tuesday: { start: '09:00', end: '18:00' },
          wednesday: { start: '09:00', end: '18:00' },
          thursday: { start: '09:00', end: '19:00' },
          friday: { start: '09:00', end: '19:00' },
          saturday: { start: '08:00', end: '17:00' }
        }
      },
      {
        id: 'barber-2',
        barbershop_id: 'demo-shop-001',
        name: 'Sarah Johnson',
        email: 'sarah@elitecuts.com',
        phone: '+1 (415) 555-0125',
        bio: 'Creative stylist with expertise in modern trends and color treatments.',
        skills: ['Modern Styles', 'Hair Color', 'Texture Treatments', 'Creative Cuts'],
        years_experience: 8,
        hourly_rate: 75.00,
        commission_rate: 55,
        status: 'active',
        is_available: true,
        hire_date: '2018-03-20',
        schedule: {
          tuesday: { start: '10:00', end: '19:00' },
          wednesday: { start: '10:00', end: '19:00' },
          thursday: { start: '10:00', end: '20:00' },
          friday: { start: '10:00', end: '20:00' },
          saturday: { start: '09:00', end: '18:00' },
          sunday: { start: '10:00', end: '16:00' }
        }
      },
      {
        id: 'barber-3',
        barbershop_id: 'demo-shop-001',
        name: 'Mike Brown',
        email: 'mike@elitecuts.com',
        phone: '+1 (415) 555-0126',
        bio: 'Traditional barber focusing on timeless styles and precision cuts.',
        skills: ['Traditional Cuts', 'Pompadours', 'Business Cuts', 'Straight Razor Shaves'],
        years_experience: 12,
        hourly_rate: 80.00,
        commission_rate: 58,
        status: 'active',
        is_available: true,
        hire_date: '2014-07-10',
        schedule: {
          monday: { start: '08:00', end: '17:00' },
          tuesday: { start: '08:00', end: '17:00' },
          wednesday: { start: '08:00', end: '17:00' },
          thursday: { start: '08:00', end: '17:00' },
          friday: { start: '08:00', end: '17:00' },
          saturday: { start: '08:00', end: '16:00' }
        }
      },
      {
        id: 'barber-4',
        barbershop_id: 'demo-shop-001',
        name: 'Lisa Davis',
        email: 'lisa@elitecuts.com',
        phone: '+1 (415) 555-0127',
        bio: 'Specialist in children\'s cuts and family-friendly grooming services.',
        skills: ['Kids Cuts', 'Family Services', 'Gentle Cuts', 'First Haircuts'],
        years_experience: 6,
        hourly_rate: 65.00,
        commission_rate: 50,
        status: 'active',
        is_available: true,
        hire_date: '2020-09-01',
        schedule: {
          wednesday: { start: '11:00', end: '19:00' },
          thursday: { start: '11:00', end: '19:00' },
          friday: { start: '11:00', end: '19:00' },
          saturday: { start: '09:00', end: '17:00' },
          sunday: { start: '10:00', end: '16:00' }
        }
      }
    ]

    const { error: barbersError } = await supabase
      .from('barbers')
      .upsert(barbers)

    if (barbersError && barbersError.code !== '23505') {
      console.error('Error creating barbers:', barbersError)
    }
    console.log('✅ 4 barbers created/updated')

    // Step 3: Create comprehensive service menu
    console.log('💼 Creating service menu...')
    
    const services = [
      {
        id: 'service-1',
        barbershop_id: 'demo-shop-001',
        name: 'Classic Haircut',
        description: 'Traditional scissor cut with styling. Includes wash and finish.',
        price: 45.00,
        duration_minutes: 45,
        category: 'Haircuts',
        is_active: true,
        requires_consultation: false,
        sort_order: 1
      },
      {
        id: 'service-2',
        barbershop_id: 'demo-shop-001',
        name: 'Fade Cut',
        description: 'Modern fade haircut with precise blending. Choice of high, mid, or low fade.',
        price: 50.00,
        duration_minutes: 50,
        category: 'Haircuts',
        is_active: true,
        requires_consultation: false,
        sort_order: 2
      },
      {
        id: 'service-3',
        barbershop_id: 'demo-shop-001',
        name: 'Beard Trim & Shape',
        description: 'Professional beard trimming and shaping with hot towel treatment.',
        price: 30.00,
        duration_minutes: 30,
        category: 'Beard Services',
        is_active: true,
        requires_consultation: false,
        sort_order: 3
      },
      {
        id: 'service-4',
        barbershop_id: 'demo-shop-001',
        name: 'Hot Towel Shave',
        description: 'Traditional straight razor shave with hot towel treatment and aftercare.',
        price: 55.00,
        duration_minutes: 60,
        category: 'Shaving',
        is_active: true,
        requires_consultation: true,
        sort_order: 4
      },
      {
        id: 'service-5',
        barbershop_id: 'demo-shop-001',
        name: 'Hair & Beard Combo',
        description: 'Complete grooming package with haircut and beard service.',
        price: 70.00,
        duration_minutes: 75,
        category: 'Packages',
        is_active: true,
        requires_consultation: false,
        sort_order: 5
      },
      {
        id: 'service-6',
        barbershop_id: 'demo-shop-001',
        name: 'Kids Cut (12 & Under)',
        description: 'Gentle haircut for children with patience and care.',
        price: 25.00,
        duration_minutes: 30,
        category: 'Kids',
        is_active: true,
        requires_consultation: false,
        sort_order: 6
      },
      {
        id: 'service-7',
        barbershop_id: 'demo-shop-001',
        name: 'Executive Package',
        description: 'Premium service including cut, shave, styling, and grooming consultation.',
        price: 120.00,
        duration_minutes: 90,
        category: 'Premium',
        is_active: true,
        requires_consultation: true,
        sort_order: 7
      },
      {
        id: 'service-8',
        barbershop_id: 'demo-shop-001',
        name: 'Hair Wash & Style',
        description: 'Deep cleansing wash with professional styling.',
        price: 20.00,
        duration_minutes: 20,
        category: 'Styling',
        is_active: true,
        requires_consultation: false,
        sort_order: 8
      }
    ]

    const { error: servicesError } = await supabase
      .from('services')
      .upsert(services)

    if (servicesError && servicesError.code !== '23505') {
      console.error('Error creating services:', servicesError)
    }
    console.log('✅ 8 services created/updated')

    // Step 4: Generate realistic appointments for the next 7 days
    console.log('📅 Generating realistic appointments...')
    
    const appointments = []
    const today = new Date()
    
    // Client name pools for realistic variety
    const clientNames = [
      'James Wilson', 'Robert Taylor', 'Michael Johnson', 'David Brown', 'Christopher Davis',
      'Matthew Miller', 'Anthony Wilson', 'Mark Anderson', 'Donald Thomas', 'Steven Jackson',
      'Andrew White', 'Kenneth Harris', 'Paul Martin', 'Joshua Garcia', 'Kevin Martinez',
      'Brian Robinson', 'George Clark', 'Edward Rodriguez', 'Ronald Lewis', 'Timothy Lee',
      'Jason Walker', 'Jeffrey Hall', 'Ryan Allen', 'Jacob Young', 'Gary Hernandez'
    ]

    // Generate appointments for each day
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const appointmentDate = new Date(today)
      appointmentDate.setDate(today.getDate() + dayOffset)
      
      // Skip past appointments for today
      const minHour = dayOffset === 0 ? Math.max(9, new Date().getHours() + 1) : 9
      const maxHour = dayOffset === 6 ? 16 : 19 // Sunday ends at 4 PM
      
      // Generate 8-12 appointments per day
      const appointmentsPerDay = faker.number.int({ min: 8, max: 12 })
      
      for (let i = 0; i < appointmentsPerDay; i++) {
        // Random time between business hours
        const hour = faker.number.int({ min: minHour, max: maxHour })
        const minute = faker.helpers.arrayElement([0, 15, 30, 45])
        
        const scheduledAt = new Date(appointmentDate)
        scheduledAt.setHours(hour, minute, 0, 0)
        
        // Skip if appointment is in the past
        if (scheduledAt <= new Date()) continue
        
        const selectedService = faker.helpers.arrayElement(services)
        const selectedBarber = faker.helpers.arrayElement(barbers)
        const clientName = faker.helpers.arrayElement(clientNames)
        
        // Calculate end time based on service duration
        const endTime = new Date(scheduledAt)
        endTime.setMinutes(endTime.getMinutes() + selectedService.duration_minutes)
        
        const appointment = {
          id: `apt-${dayOffset}-${i}-${Date.now()}`,
          barbershop_id: 'demo-shop-001',
          barber_id: selectedBarber.id,
          service_id: selectedService.id,
          client_name: clientName,
          client_email: `${clientName.toLowerCase().replace(' ', '.')}@example.com`,
          client_phone: faker.phone.number('+1 (###) ###-####'),
          scheduled_at: scheduledAt.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: selectedService.duration_minutes,
          service_price: selectedService.price,
          status: faker.helpers.arrayElement(['CONFIRMED', 'PENDING', 'CONFIRMED', 'CONFIRMED']), // Mostly confirmed
          booking_source: faker.helpers.arrayElement(['online', 'phone', 'walk_in']),
          notes: faker.helpers.arrayElement([
            'Regular client',
            'First time visit',
            'Referred by friend',
            'Special occasion cut',
            'Wedding preparation',
            'Job interview prep',
            null,
            null, // Many appointments have no notes
            null
          ]),
          confirmation_code: faker.string.alphanumeric(6).toUpperCase(),
          reminder_sent: faker.datatype.boolean(),
          payment_status: 'UNPAID',
          created_at: faker.date.recent({ days: 7 }).toISOString()
        }
        
        appointments.push(appointment)
      }
    }

    // Insert appointments in batches to avoid overwhelming the database
    console.log(`📝 Inserting ${appointments.length} appointments...`)
    
    const batchSize = 10
    let insertedCount = 0
    
    for (let i = 0; i < appointments.length; i += batchSize) {
      const batch = appointments.slice(i, i + batchSize)
      const { error: appointmentError } = await supabase
        .from('appointments')
        .upsert(batch)
      
      if (appointmentError && appointmentError.code !== '23505') {
        console.error(`Error inserting appointment batch ${i}-${i + batchSize}:`, appointmentError)
      } else {
        insertedCount += batch.length
      }
    }

    console.log('✅ Test data generation completed successfully!')
    console.log('\n📊 Summary:')
    console.log('• 1 Elite barbershop created')
    console.log('• 4 Professional barbers with specialties')  
    console.log('• 8 Service categories ($20-$120 range)')
    console.log(`• ${insertedCount} Realistic appointments over 7 days`)
    console.log('\n🎯 Your calendar is now populated with professional demo data!')
    console.log('🔗 Test at: http://localhost:9999/dashboard/calendar')

  } catch (error) {
    console.error('❌ Error generating test data:', error)
    process.exit(1)
  }
}

// Run the data generation
generateTestData()