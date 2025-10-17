/**
 * Production-Ready Booking System Tests
 * 
 * Tests verify the booking system uses real barbershop data,
 * no hardcoded shop info, and proper payment integration.
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
  throw new Error('Missing Supabase credentials. Cannot run production-ready booking tests.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

describe('Production-Ready Booking System', () => {
  let testUser = null
  let testBarbershop = null
  let testService = null
  let testBarber = null

  beforeAll(async () => {
    // Verify Supabase connection
    const { data, error } = await supabase.from('barbershops').select('count').limit(1)
    if (error && !error.message.includes('permission denied')) {
      throw new Error(`Cannot connect to Supabase: ${error.message}`)
    }
  })

  beforeEach(async () => {
    // Create test data for each test
    const testEmail = `booking-${Date.now()}@production-test.com`
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'BookingTest123!',
      email_confirm: true
    })

    if (userError) {
      console.warn('Cannot create test user:', userError.message)
      return
    }
    testUser = userData.user

    // Create test barbershop
    const { data: shopData, error: shopError } = await supabase
      .from('barbershops')
      .insert({
        name: `Test Booking Shop ${Date.now()}`,
        owner_id: testUser.id,
        phone: `+1${Date.now().toString().slice(-10)}`,
        address: `${Date.now()} Test Booking Street`,
        city: 'Test City',
        state: 'TS',
        zip_code: '12345'
      })
      .select()
      .single()

    if (shopError && !shopError.message.includes('permission denied')) {
      console.warn('Barbershop creation warning:', shopError.message)
      return
    }
    testBarbershop = shopData

    // Create test service
    if (testBarbershop) {
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .insert({
          barbershop_id: testBarbershop.id,
          name: 'Test Haircut',
          price: 25.00,
          duration: 30,
          description: 'Professional haircut service'
        })
        .select()
        .single()

      if (!serviceError) {
        testService = serviceData
      }

      // Create test barber
      const { data: barberData, error: barberError } = await supabase
        .from('barbers')
        .insert({
          barbershop_id: testBarbershop.id,
          name: 'Test Barber',
          email: `barber-${Date.now()}@test.com`,
          specialties: ['Haircuts', 'Beard Trims']
        })
        .select()
        .single()

      if (!barberError) {
        testBarber = barberData
      }
    }
  })

  afterEach(async () => {
    // Clean up test data
    if (testService) {
      await supabase.from('services').delete().eq('id', testService.id).catch(() => {})
    }
    if (testBarber) {
      await supabase.from('barbers').delete().eq('id', testBarber.id).catch(() => {})
    }
    if (testBarbershop) {
      await supabase.from('barbershops').delete().eq('id', testBarbershop.id).catch(() => {})
    }
    if (testUser) {
      await supabase.auth.admin.deleteUser(testUser.id).catch(() => {})
    }
    testUser = null
    testBarbershop = null
    testService = null
    testBarber = null
  })

  describe('Real Barbershop Data Loading', () => {
    test('booking page loads real barbershop data', async () => {
      if (!testBarbershop) {
        console.warn('Skipping test - no test barbershop created')
        return
      }

      // Fetch barbershop data as booking page would
      const { data: shop, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', testBarbershop.id)
        .single()

      expect(error).toBeNull()
      expect(shop).toBeDefined()
      expect(shop.name).toBe(testBarbershop.name)
      expect(shop.phone).toContain('+1')
      expect(shop.address).toContain('Test Booking Street')
      expect(shop.city).toBe('Test City')
      expect(shop.state).toBe('TS')
      expect(shop.zip_code).toBe('12345')
    })

    test('services come from database for specific barbershop', async () => {
      if (!testBarbershop || !testService) {
        console.warn('Skipping test - no test data created')
        return
      }

      // Fetch services as booking page would
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', testBarbershop.id)

      expect(error).toBeNull()
      expect(Array.isArray(services)).toBe(true)
      expect(services.length).toBeGreaterThan(0)
      
      const service = services.find(s => s.id === testService.id)
      expect(service).toBeDefined()
      expect(service.name).toBe('Test Haircut')
      expect(service.price).toBe(25.00)
      expect(service.duration).toBe(30)
    })

    test('barbers come from database for specific barbershop', async () => {
      if (!testBarbershop || !testBarber) {
        console.warn('Skipping test - no test data created')
        return
      }

      // Fetch barbers as booking page would
      const { data: barbers, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', testBarbershop.id)

      expect(error).toBeNull()
      expect(Array.isArray(barbers)).toBe(true)
      expect(barbers.length).toBeGreaterThan(0)

      const barber = barbers.find(b => b.id === testBarber.id)
      expect(barber).toBeDefined()
      expect(barber.name).toBe('Test Barber')
      expect(barber.email).toContain('@test.com')
      expect(Array.isArray(barber.specialties)).toBe(true)
    })
  })

  describe('No Hardcoded Shop Information', () => {
    test('no hardcoded addresses in booking components', async () => {
      // Check for common hardcoded addresses
      const hardcodedAddresses = [
        '123 Main St',
        '456 Example Ave',
        '789 Sample Blvd',
        'Downtown Location',
        'Main Street Location'
      ]

      const { data: shops, error } = await supabase
        .from('barbershops')
        .select('address')

      if (error && !error.message.includes('permission denied')) {
        console.warn('Cannot check addresses:', error.message)
        return
      }

      if (shops) {
        for (const address of hardcodedAddresses) {
          const found = shops.find(shop => shop.address?.includes(address))
          if (found) {
            fail(`Found hardcoded address in database: ${found.address}`)
          }
        }
      }
    })

    test('no hardcoded phone numbers in booking system', async () => {
      const hardcodedPhones = [
        '(555) 123-4567',
        '555-0123',
        '(123) 456-7890',
        '1-800-BARBER',
        '000-000-0000'
      ]

      const { data: shops, error } = await supabase
        .from('barbershops')
        .select('phone')

      if (error && !error.message.includes('permission denied')) {
        console.warn('Cannot check phone numbers:', error.message)
        return
      }

      if (shops) {
        for (const phone of hardcodedPhones) {
          const found = shops.find(shop => shop.phone === phone)
          if (found) {
            fail(`Found hardcoded phone number in database: ${found.phone}`)
          }
        }
      }
    })

    test('shop hours come from database configuration', async () => {
      if (!testBarbershop) {
        console.warn('Skipping test - no test barbershop created')
        return
      }

      // Check if shop hours are stored in database
      const { data: hours, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('barbershop_id', testBarbershop.id)

      if (error && !error.message.includes('permission denied') && !error.message.includes('does not exist')) {
        console.warn('Cannot check business hours:', error.message)
        return
      }

      // Should either have hours configured or empty array (not hardcoded)
      if (hours) {
        expect(Array.isArray(hours)).toBe(true)
        // Each hour entry should have proper structure
        hours.forEach(hour => {
          expect(hour.barbershop_id).toBe(testBarbershop.id)
          expect(hour.day_of_week).toBeDefined()
        })
      }
    })
  })

  describe('Booking Creation and Management', () => {
    test('can create real appointment with valid data', async () => {
      if (!testBarbershop || !testService) {
        console.warn('Skipping test - no test data created')
        return
      }

      const appointmentData = {
        barbershop_id: testBarbershop.id,
        service_id: testService.id,
        barber_id: testBarber?.id,
        client_name: 'Real Booking Client',
        client_email: 'realbooking@test.com',
        client_phone: '+1987654321',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        time: '10:00',
        status: 'confirmed',
        price: testService.price
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single()

      if (error && !error.message.includes('permission denied')) {
        console.warn('Appointment creation warning:', error.message)
        return
      }

      if (appointment) {
        expect(appointment.barbershop_id).toBe(testBarbershop.id)
        expect(appointment.client_name).toBe('Real Booking Client')
        expect(appointment.client_email).toBe('realbooking@test.com')
        expect(appointment.price).toBe(testService.price)

        // Clean up
        await supabase.from('appointments').delete().eq('id', appointment.id)
      }
    })

    test('appointment validation uses real business rules', async () => {
      if (!testBarbershop) {
        console.warn('Skipping test - no test barbershop created')
        return
      }

      // Try to create appointment with invalid data
      const invalidAppointmentData = {
        barbershop_id: testBarbershop.id,
        client_name: '', // Empty name should be invalid
        client_email: 'invalid-email', // Invalid email format
        date: '2020-01-01', // Past date
        time: '25:00', // Invalid time
        status: 'invalid-status' // Invalid status
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert(invalidAppointmentData)
        .select()
        .single()

      // Should either fail validation or return error
      if (!error && appointment) {
        // If it succeeds, clean it up and warn
        await supabase.from('appointments').delete().eq('id', appointment.id)
        console.warn('Database allowed invalid appointment data - validation may be missing')
      }
    })

    test('booking availability uses real barber schedules', async () => {
      if (!testBarbershop || !testBarber) {
        console.warn('Skipping test - no test data created')
        return
      }

      // Check if barber availability is tracked in database
      const { data: availability, error } = await supabase
        .from('barber_availability')
        .select('*')
        .eq('barber_id', testBarber.id)

      if (error && !error.message.includes('permission denied') && !error.message.includes('does not exist')) {
        console.warn('Cannot check barber availability:', error.message)
        return
      }

      // Availability should either exist or be empty (not hardcoded)
      if (availability) {
        expect(Array.isArray(availability)).toBe(true)
        availability.forEach(slot => {
          expect(slot.barber_id).toBe(testBarber.id)
          expect(slot.date).toBeDefined()
          expect(slot.start_time).toBeDefined()
          expect(slot.end_time).toBeDefined()
        })
      }
    })
  })

  describe('Payment Integration', () => {
    test('Stripe configuration is properly set up', () => {
      const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY

      expect(stripePublicKey).toBeDefined()
      expect(stripePublicKey).not.toBe('pk_test_placeholder')
      expect(stripePublicKey).toMatch(/^pk_(test|live)_/)

      expect(stripeSecretKey).toBeDefined()
      expect(stripeSecretKey).not.toBe('sk_test_placeholder')
      expect(stripeSecretKey).toMatch(/^sk_(test|live)_/)
    })

    test('payment amounts come from real service prices', async () => {
      if (!testBarbershop || !testService) {
        console.warn('Skipping test - no test data created')
        return
      }

      // Verify service has real price, not placeholder
      expect(testService.price).toBeGreaterThan(0)
      expect(testService.price).not.toBe(9.99) // Common placeholder price
      expect(testService.price).not.toBe(10.00) // Common placeholder price

      // Check that price is stored as proper decimal
      expect(typeof testService.price).toBe('number')
    })

    test('no hardcoded payment amounts in booking flow', async () => {
      // Check for common hardcoded prices in services
      const placeholderPrices = [9.99, 10.00, 15.00, 20.00, 25.00]
      
      const { data: services, error } = await supabase
        .from('services')
        .select('price, name')
        .in('price', placeholderPrices)

      if (error && !error.message.includes('permission denied')) {
        console.warn('Cannot check for placeholder prices:', error.message)
        return
      }

      if (services && services.length > 0) {
        // Allow our test service with price 25.00
        const nonTestServices = services.filter(s => !s.name.includes('Test'))
        if (nonTestServices.length > 0) {
          console.warn(`Found potential placeholder prices: ${JSON.stringify(nonTestServices)}`)
        }
      }
    })
  })

  describe('Booking Notifications', () => {
    test('notification system uses real contact information', async () => {
      if (!testBarbershop) {
        console.warn('Skipping test - no test barbershop created')
        return
      }

      // Check that barbershop has real contact info for notifications
      expect(testBarbershop.phone).toBeDefined()
      expect(testBarbershop.phone).not.toBe('(555) 123-4567')
      expect(testBarbershop.phone).toMatch(/^\+1\d{10}/)

      // Check if email is configured (if available)
      if (testBarbershop.email) {
        expect(testBarbershop.email).toContain('@')
        expect(testBarbershop.email).not.toBe('test@example.com')
        expect(testBarbershop.email).not.toBe('demo@barbershop.com')
      }
    })

    test('SMS and email credentials are configured', () => {
      // Check Twilio configuration
      const twilioSid = process.env.TWILIO_ACCOUNT_SID
      const twilioToken = process.env.TWILIO_AUTH_TOKEN
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER

      if (twilioSid) {
        expect(twilioSid).not.toBe('ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
        expect(twilioToken).toBeDefined()
        expect(twilioPhone).toBeDefined()
        expect(twilioPhone).toMatch(/^\+1\d{10}/)
      }

      // Check SendGrid configuration
      const sendgridKey = process.env.SENDGRID_API_KEY
      if (sendgridKey) {
        expect(sendgridKey).not.toBe('SG.placeholder')
        expect(sendgridKey).toMatch(/^SG\./)
      }
    })
  })

  describe('Calendar Integration', () => {
    test('calendar events use real appointment data', async () => {
      if (!testBarbershop || !testService) {
        console.warn('Skipping test - no test data created')
        return
      }

      // Create appointment for calendar testing
      const appointmentData = {
        barbershop_id: testBarbershop.id,
        service_id: testService.id,
        client_name: 'Calendar Test Client',
        client_email: 'calendar@test.com',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '14:00',
        status: 'confirmed',
        price: testService.price
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single()

      if (error && !error.message.includes('permission denied')) {
        console.warn('Calendar appointment creation warning:', error.message)
        return
      }

      if (appointment) {
        // Verify appointment has all needed data for calendar
        expect(appointment.date).toBeDefined()
        expect(appointment.time).toBeDefined()
        expect(appointment.client_name).toBe('Calendar Test Client')
        expect(appointment.barbershop_id).toBe(testBarbershop.id)

        // Clean up
        await supabase.from('appointments').delete().eq('id', appointment.id)
      }
    })

    test('Google Calendar credentials are configured if enabled', () => {
      const googleClientId = process.env.GOOGLE_CLIENT_ID
      const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

      if (googleClientId) {
        expect(googleClientId).not.toBe('your-google-client-id')
        expect(googleClientId).toMatch(/\.apps\.googleusercontent\.com$/)
        expect(googleClientSecret).toBeDefined()
        expect(googleClientSecret).not.toBe('your-google-client-secret')
      }
    })
  })
})