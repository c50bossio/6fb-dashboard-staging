#!/usr/bin/env node

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const CONFIG = {
  shopId: 'demo-shop-001',
  numberOfBarbers: 4,
  numberOfServices: 6,
  numberOfCustomers: 20,
  daysToGenerate: 14,
  appointmentsPerBarberPerDay: 6,
  isTestData: true // Mark all data as test data
}

const BARBER_NAMES = [
  'John Smith',
  'Sarah Johnson',
  'Mike Brown',
  'Lisa Davis',
  'Tom Wilson',
  'Emma Garcia'
]

const BARBER_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4'  // cyan
]

const SERVICES = [
  { name: 'Haircut', duration: 30, price: 35, description: 'Classic haircut service' },
  { name: 'Beard Trim', duration: 20, price: 20, description: 'Professional beard grooming' },
  { name: 'Hair & Beard', duration: 45, price: 50, description: 'Complete grooming package' },
  { name: 'Fade Cut', duration: 35, price: 40, description: 'Modern fade haircut' },
  { name: 'Kids Cut', duration: 25, price: 25, description: 'Haircut for children under 12' },
  { name: 'Shave', duration: 30, price: 30, description: 'Traditional hot towel shave' }
]

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function generateTimeSlot(date, hour, minute) {
  const slot = new Date(date)
  slot.setHours(hour, minute, 0, 0)
  return slot
}

async function clearTestData() {
  console.log('🧹 Clearing existing test data...')
  
  try {
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .eq('is_test', true)
    
    if (bookingsError && bookingsError.code !== '42P01') {
      console.log('Note: bookings table not found or no test data to clear')
    }

    const { error: customersError } = await supabase
      .from('customers')
      .delete()
      .eq('is_test', true)
    
    if (customersError && customersError.code !== '42P01') {
      console.log('Note: customers table not found or no test data to clear')
    }

    const { error: servicesError } = await supabase
      .from('services')
      .delete()
      .eq('is_test', true)
    
    if (servicesError && servicesError.code !== '42P01') {
      console.log('Note: services table not found or no test data to clear')
    }

    const { error: barbersError } = await supabase
      .from('barbers')
      .delete()
      .eq('is_test', true)
    
    if (barbersError && barbersError.code !== '42P01') {
      console.log('Note: barbers table not found or no test data to clear')
    }

    console.log('✅ Test data cleared')
  } catch (error) {
    console.error('Error clearing test data:', error.message)
  }
}

async function seedBarbers() {
  console.log('👥 Creating test barbers...')
  
  const barbers = []
  for (let i = 0; i < CONFIG.numberOfBarbers; i++) {
    barbers.push({
      shop_id: CONFIG.shopId,
      name: BARBER_NAMES[i] || faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number('###-###-####'),
      color: BARBER_COLORS[i] || faker.internet.color(),
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
      bio: faker.lorem.sentence(),
      specialties: ['Haircut', 'Beard Trim', 'Fade Cut'],
      rating: (4 + Math.random()).toFixed(1),
      is_active: true,
      is_test: CONFIG.isTestData,
      created_at: new Date().toISOString()
    })
  }

  const { data, error } = await supabase
    .from('barbers')
    .insert(barbers)
    .select()

  if (error) {
    if (error.code === '42P01') {
      console.log('⚠️  Barbers table does not exist. Run the schema SQL first.')
      return []
    }
    console.error('Error seeding barbers:', error)
    return []
  }

  console.log(`✅ Created ${data.length} test barbers`)
  return data
}

async function seedServices() {
  console.log('✂️  Creating test services...')
  
  const services = SERVICES.map((service, index) => ({
    shop_id: CONFIG.shopId,
    name: service.name,
    description: service.description,
    duration_minutes: service.duration,
    price: service.price,
    category: 'Hair Services',
    is_active: true,
    is_test: CONFIG.isTestData,
    created_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('services')
    .insert(services)
    .select()

  if (error) {
    if (error.code === '42P01') {
      console.log('⚠️  Services table does not exist. Run the schema SQL first.')
      return []
    }
    console.error('Error seeding services:', error)
    return []
  }

  console.log(`✅ Created ${data.length} test services`)
  return data
}

async function seedCustomers() {
  console.log('👤 Creating test customers...')
  
  const customers = []
  for (let i = 0; i < CONFIG.numberOfCustomers; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    
    customers.push({
      shop_id: CONFIG.shopId,
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number('###-###-####'),
      notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
      preferences: {
        preferred_service: getRandomElement(SERVICES).name
      },
      is_vip: Math.random() > 0.9,
      is_test: CONFIG.isTestData,
      created_at: new Date().toISOString()
    })
  }

  const { data, error } = await supabase
    .from('customers')
    .insert(customers)
    .select()

  if (error) {
    if (error.code === '42P01') {
      console.log('⚠️  Customers table does not exist. Run the schema SQL first.')
      return []
    }
    console.error('Error seeding customers:', error)
    return []
  }

  console.log(`✅ Created ${data.length} test customers`)
  return data
}

async function seedRecurringAppointments(barbers, services, customers) {
  console.log('🔄 Creating recurring appointments...')
  
  if (!barbers.length || !services.length || !customers.length) {
    console.log('⚠️  Missing required data. Skipping recurring appointments.')
    return []
  }

  const recurringAppointments = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const recurringPatterns = [
    {
      name: 'Weekly Friday haircut',
      rrule: 'FREQ=WEEKLY;BYDAY=FR;COUNT=8',
      description: 'Every Friday for 8 weeks'
    },
    {
      name: 'Bi-weekly Monday grooming',
      rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;COUNT=6',
      description: 'Every other Monday, 6 times'
    },
    {
      name: 'Monthly beard trim',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=15;COUNT=4',
      description: 'On the 15th of each month, 4 times'
    }
  ]
  
  for (let i = 0; i < recurringPatterns.length && i < barbers.length; i++) {
    const pattern = recurringPatterns[i]
    const barber = barbers[i]
    const service = services[i % services.length]
    const customer = customers[i % customers.length]
    
    const startDate = new Date()
    if (pattern.name.includes('Friday')) {
      const daysUntilFriday = (5 - startDate.getDay() + 7) % 7 || 7
      startDate.setDate(startDate.getDate() + daysUntilFriday)
      startDate.setHours(14, 0, 0, 0)
    } else if (pattern.name.includes('Monday')) {
      const daysUntilMonday = (1 - startDate.getDay() + 7) % 7 || 7
      startDate.setDate(startDate.getDate() + daysUntilMonday)
      startDate.setHours(10, 0, 0, 0)
    } else {
      // 15th of next month at 3pm
      startDate.setMonth(startDate.getMonth() + 1)
      startDate.setDate(15)
      startDate.setHours(15, 0, 0, 0)
    }
    
    const endDate = new Date(startDate)
    endDate.setMinutes(endDate.getMinutes() + service.duration_minutes)
    
    recurringAppointments.push({
      shop_id: CONFIG.shopId,
      barber_id: barber.id,
      customer_id: customer.id,
      service_id: service.id,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      status: 'confirmed',
      price: service.price,
      notes: `${pattern.description} - Created by seed script`,
      is_recurring: true,
      recurring_pattern: {
        rrule: pattern.rrule,
        frequency: pattern.rrule.includes('MONTHLY') ? 'monthly' : 'weekly',
        interval: pattern.rrule.includes('INTERVAL=2') ? 2 : 1,
        count: parseInt(pattern.rrule.match(/COUNT=(\d+)/)?.[1] || '4'),
        until: null,
        byweekday: pattern.rrule.match(/BYDAY=([A-Z]{2})/)?.[1] || null,
        bymonthday: pattern.rrule.match(/BYMONTHDAY=(\d+)/)?.[1] || null,
        cancelled_dates: []
      },
      is_test: CONFIG.isTestData,
      created_at: new Date().toISOString()
    })
  }
  
  if (recurringAppointments.length > 0) {
    const { data, error } = await supabase
      .from('bookings')
      .insert(recurringAppointments)
      .select()
    
    if (error) {
      console.error('Error creating recurring appointments:', error)
      return []
    }
    
    console.log(`✅ Created ${data.length} recurring appointments`)
    return data
  }
  
  return []
}

async function seedAppointments(barbers, services, customers) {
  console.log('📅 Creating test appointments...')
  
  if (!barbers.length || !services.length || !customers.length) {
    console.log('⚠️  Missing required data (barbers, services, or customers). Skipping appointments.')
    return []
  }

  const appointments = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let day = 0; day < CONFIG.daysToGenerate; day++) {
    const currentDate = new Date(today)
    currentDate.setDate(today.getDate() + day - 7) // Start from 7 days ago
    
    if (currentDate.getDay() === 0) continue
    
    for (const barber of barbers) {
      const appointmentCount = Math.floor(Math.random() * 3) + CONFIG.appointmentsPerBarberPerDay - 2
      const timeSlots = generateDayTimeSlots(currentDate)
      
      for (let i = 0; i < appointmentCount && i < timeSlots.length; i++) {
        const service = getRandomElement(services)
        const customer = getRandomElement(customers)
        const timeSlot = timeSlots[i]
        
        const startTime = new Date(timeSlot)
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + service.duration_minutes)
        
        let status = 'confirmed'
        if (currentDate < today) {
          status = Math.random() > 0.1 ? 'completed' : 'cancelled'
        } else if (currentDate.getTime() === today.getTime()) {
          const now = new Date()
          if (startTime < now) {
            status = Math.random() > 0.2 ? 'completed' : 'in_progress'
          }
        }
        
        appointments.push({
          shop_id: CONFIG.shopId,
          barber_id: barber.id,
          customer_id: customer.id,
          service_id: service.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: status,
          price: service.price,
          notes: Math.random() > 0.8 ? faker.lorem.sentence() : null,
          is_recurring: false,
          is_test: CONFIG.isTestData,
          created_at: new Date().toISOString()
        })
      }
    }
  }

  const batchSize = 50
  let totalInserted = 0
  
  for (let i = 0; i < appointments.length; i += batchSize) {
    const batch = appointments.slice(i, i + batchSize)
    const { data, error } = await supabase
      .from('bookings')
      .insert(batch)
      .select()

    if (error) {
      if (error.code === '42P01') {
        console.log('⚠️  Bookings table does not exist. Run the schema SQL first.')
        return []
      }
      console.error('Error seeding appointments batch:', error)
      continue
    }

    totalInserted += data.length
    process.stdout.write(`\r  Inserted ${totalInserted}/${appointments.length} appointments...`)
  }

  console.log(`\n✅ Created ${totalInserted} test appointments`)
  return appointments
}

function generateDayTimeSlots(date) {
  const slots = []
  const workHours = [
    { hour: 9, minute: 0 },
    { hour: 9, minute: 30 },
    { hour: 10, minute: 0 },
    { hour: 10, minute: 30 },
    { hour: 11, minute: 0 },
    { hour: 11, minute: 30 },
    { hour: 12, minute: 0 },
    { hour: 14, minute: 0 }, // After lunch
    { hour: 14, minute: 30 },
    { hour: 15, minute: 0 },
    { hour: 15, minute: 30 },
    { hour: 16, minute: 0 },
    { hour: 16, minute: 30 },
    { hour: 17, minute: 0 }
  ]
  
  const selectedSlots = []
  for (const slot of workHours) {
    if (Math.random() > 0.3) { // 70% chance of having an appointment at this time
      selectedSlots.push(generateTimeSlot(date, slot.hour, slot.minute))
    }
  }
  
  return selectedSlots
}

async function main() {
  console.log('🚀 Starting calendar test data seeding...')
  console.log(`📍 Supabase URL: ${supabaseUrl}`)
  console.log(`🏪 Shop ID: ${CONFIG.shopId}`)
  console.log(`📊 Configuration:`)
  console.log(`   - Barbers: ${CONFIG.numberOfBarbers}`)
  console.log(`   - Services: ${CONFIG.numberOfServices}`)
  console.log(`   - Customers: ${CONFIG.numberOfCustomers}`)
  console.log(`   - Days to generate: ${CONFIG.daysToGenerate}`)
  console.log(`   - Test data flag: ${CONFIG.isTestData}`)
  console.log('')

  try {
    await clearTestData()
    
    const barbers = await seedBarbers()
    const services = await seedServices()
    const customers = await seedCustomers()
    const appointments = await seedAppointments(barbers, services, customers)
    const recurringAppointments = await seedRecurringAppointments(barbers, services, customers)
    
    console.log('\n🎉 Test data seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   - ${barbers.length} barbers created`)
    console.log(`   - ${services.length} services created`)
    console.log(`   - ${customers.length} customers created`)
    console.log(`   - ${appointments.length} regular appointments created`)
    console.log(`   - ${recurringAppointments.length} recurring appointments created`)
    console.log('\n💡 To remove test data, run: npm run cleanup-test-data')
    
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    process.exit(1)
  }
}

main().catch(console.error)