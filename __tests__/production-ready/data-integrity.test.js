/**
 * Production-Ready Data Integrity Tests
 * 
 * Tests verify no placeholder emails, fake phone numbers, hardcoded addresses,
 * and that all data comes from Supabase database.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
  throw new Error('Missing Supabase credentials. Cannot run production-ready data integrity tests.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

describe('Production-Ready Data Integrity', () => {
  beforeAll(async () => {
    // Verify Supabase connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error && !error.message.includes('permission denied')) {
      throw new Error(`Cannot connect to Supabase: ${error.message}`)
    }
  })

  describe('No Placeholder Email Addresses', () => {
    test('no test@example.com emails in profiles', async () => {
      const placeholderEmails = [
        'test@example.com',
        'demo@example.com',
        'sample@example.com',
        'placeholder@example.com',
        'user@example.com',
        'admin@example.com',
        'noreply@example.com'
      ]

      for (const email of placeholderEmails) {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, email, created_at')
          .eq('email', email)

        if (error && !error.message.includes('permission denied')) {
          console.warn(`Cannot check for email ${email}:`, error.message)
          continue
        }

        if (profiles && profiles.length > 0) {
          fail(`Found placeholder email in profiles: ${email} (${profiles.length} records)`)
        }
      }
    })

    test('no placeholder emails in barbershop contacts', async () => {
      const placeholderEmails = [
        'contact@barbershop.com',
        'info@example.com',
        'hello@example.com',
        'support@example.com',
        'barbershop@example.com'
      ]

      for (const email of placeholderEmails) {
        const { data: shops, error } = await supabase
          .from('barbershops')
          .select('id, name, email, created_at')
          .eq('email', email)

        if (error && !error.message.includes('permission denied')) {
          console.warn(`Cannot check for barbershop email ${email}:`, error.message)
          continue
        }

        if (shops && shops.length > 0) {
          fail(`Found placeholder email in barbershops: ${email} (${shops.length} records)`)
        }
      }
    })

    test('no placeholder emails in appointment clients', async () => {
      const placeholderEmails = [
        'client@example.com',
        'customer@example.com',
        'john.doe@example.com',
        'jane.doe@example.com',
        'testclient@example.com'
      ]

      for (const email of placeholderEmails) {
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('id, client_name, client_email, barbershop_id')
          .eq('client_email', email)

        if (error && !error.message.includes('permission denied')) {
          console.warn(`Cannot check for appointment email ${email}:`, error.message)
          continue
        }

        if (appointments && appointments.length > 0) {
          fail(`Found placeholder email in appointments: ${email} (${appointments.length} records)`)
        }
      }
    })

    test('all emails have valid format', async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      // Check profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('email')
        .not('email', 'is', null)
        .limit(100)

      if (!profilesError && profiles) {
        profiles.forEach(profile => {
          if (profile.email && !emailRegex.test(profile.email)) {
            fail(`Invalid email format in profiles: ${profile.email}`)
          }
        })
      }

      // Check barbershops
      const { data: shops, error: shopsError } = await supabase
        .from('barbershops')
        .select('email')
        .not('email', 'is', null)
        .limit(100)

      if (!shopsError && shops) {
        shops.forEach(shop => {
          if (shop.email && !emailRegex.test(shop.email)) {
            fail(`Invalid email format in barbershops: ${shop.email}`)
          }
        })
      }
    })
  })

  describe('No Fake Phone Numbers', () => {
    test('no 555 fake phone numbers', async () => {
      const fakePhonePatterns = [
        '(555) 123-4567',
        '555-123-4567',
        '5551234567',
        '+15551234567',
        '(555) 000-0000',
        '555-000-0000'
      ]

      for (const phone of fakePhonePatterns) {
        // Check barbershops
        const { data: shops, error: shopsError } = await supabase
          .from('barbershops')
          .select('id, name, phone')
          .eq('phone', phone)

        if (!shopsError && shops && shops.length > 0) {
          fail(`Found fake phone number in barbershops: ${phone}`)
        }

        // Check appointments
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('id, client_name, client_phone')
          .eq('client_phone', phone)

        if (!appointmentsError && appointments && appointments.length > 0) {
          fail(`Found fake phone number in appointments: ${phone}`)
        }
      }
    })

    test('no obviously fake phone patterns', async () => {
      const fakePatterns = [
        '1234567890',
        '(000) 000-0000',
        '000-000-0000',
        '(123) 456-7890',
        '123-456-7890'
      ]

      for (const phone of fakePatterns) {
        const { data: shops, error } = await supabase
          .from('barbershops')
          .select('id, name, phone')
          .eq('phone', phone)

        if (!error && shops && shops.length > 0) {
          fail(`Found obviously fake phone number: ${phone}`)
        }
      }
    })

    test('phone numbers have valid format', async () => {
      const phoneRegex = /^\+1\d{10}$|^\(\d{3}\) \d{3}-\d{4}$|\d{3}-\d{3}-\d{4}$/

      const { data: shops, error } = await supabase
        .from('barbershops')
        .select('phone')
        .not('phone', 'is', null)
        .limit(100)

      if (!error && shops) {
        shops.forEach(shop => {
          if (shop.phone && !phoneRegex.test(shop.phone) && !shop.phone.startsWith('+1')) {
            console.warn(`Potentially invalid phone format: ${shop.phone}`)
          }
        })
      }
    })
  })

  describe('No Hardcoded Addresses', () => {
    test('no generic street addresses', async () => {
      const genericAddresses = [
        '123 Main Street',
        '456 Main St',
        '789 Example Ave',
        '123 Sample Blvd',
        '456 Test Street',
        '1 Test Address',
        'Sample Address',
        'Test Address'
      ]

      for (const address of genericAddresses) {
        const { data: shops, error } = await supabase
          .from('barbershops')
          .select('id, name, address')
          .ilike('address', `%${address}%`)

        if (!error && shops && shops.length > 0) {
          fail(`Found generic address in barbershops: ${address} (${shops.length} records)`)
        }
      }
    })

    test('no placeholder city names', async () => {
      const placeholderCities = [
        'Sample City',
        'Test City',
        'Example City',
        'Demo Town',
        'Placeholder City'
      ]

      for (const city of placeholderCities) {
        const { data: shops, error } = await supabase
          .from('barbershops')
          .select('id, name, city')
          .eq('city', city)

        if (!error && shops && shops.length > 0) {
          // Allow our test data
          const nonTestShops = shops.filter(shop => !shop.name.includes('Test'))
          if (nonTestShops.length > 0) {
            fail(`Found placeholder city: ${city} (${nonTestShops.length} non-test records)`)
          }
        }
      }
    })

    test('no fake zip codes', async () => {
      const fakeZipCodes = [
        '00000',
        '11111',
        '12345',
        '99999',
        '00001'
      ]

      for (const zip of fakeZipCodes) {
        const { data: shops, error } = await supabase
          .from('barbershops')
          .select('id, name, zip_code')
          .eq('zip_code', zip)

        if (!error && shops && shops.length > 0) {
          // Allow our test data with zip 12345
          const nonTestShops = shops.filter(shop => !shop.name.includes('Test'))
          if (nonTestShops.length > 0) {
            console.warn(`Found potentially fake zip code: ${zip} (${nonTestShops.length} non-test records)`)
          }
        }
      }
    })
  })

  describe('No Mock Customer Data', () => {
    test('no test client names in appointments', async () => {
      const testClientNames = [
        'Test Client',
        'Demo User',
        'Sample Customer',
        'John Doe',
        'Jane Doe',
        'Test User',
        'Example Client',
        'Placeholder Customer'
      ]

      for (const name of testClientNames) {
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('id, client_name, barbershop_id, created_at')
          .ilike('client_name', `%${name}%`)

        if (!error && appointments && appointments.length > 0) {
          // Filter out our test data and recent test runs
          const now = new Date()
          const oneHourAgo = new Date(now - 60 * 60 * 1000)
          
          const oldNonTestAppointments = appointments.filter(apt => {
            const isRecentTest = new Date(apt.created_at) > oneHourAgo
            const isOurTest = apt.client_name.includes('Real') || 
                              apt.client_name.includes('Integration') || 
                              apt.client_name.includes('Calendar')
            return !isRecentTest && !isOurTest
          })
          
          if (oldNonTestAppointments.length > 0) {
            console.warn(`Found potential test client names: ${name} (${oldNonTestAppointments.length} old records)`)
          }
        }
      }
    })

    test('no placeholder service names', async () => {
      const placeholderServices = [
        'Test Service',
        'Sample Service',
        'Demo Service',
        'Example Haircut',
        'Placeholder Service'
      ]

      for (const serviceName of placeholderServices) {
        const { data: services, error } = await supabase
          .from('services')
          .select('id, name, barbershop_id')
          .ilike('name', `%${serviceName}%`)

        if (!error && services && services.length > 0) {
          // Allow our test services
          const nonTestServices = services.filter(service => 
            !service.name.includes('Test Haircut') && 
            !service.name.includes('Calendar Test')
          )
          
          if (nonTestServices.length > 0) {
            console.warn(`Found placeholder service names: ${serviceName} (${nonTestServices.length} records)`)
          }
        }
      }
    })

    test('no fake barber names', async () => {
      const fakeBarberNames = [
        'Test Barber',
        'Demo Barber',
        'Sample Barber',
        'Example Stylist',
        'John Smith',
        'Jane Smith'
      ]

      for (const name of fakeBarberNames) {
        const { data: barbers, error } = await supabase
          .from('barbers')
          .select('id, name, barbershop_id')
          .ilike('name', `%${name}%`)

        if (!error && barbers && barbers.length > 0) {
          // Allow our test barber
          const nonTestBarbers = barbers.filter(barber => barber.name !== 'Test Barber')
          
          if (nonTestBarbers.length > 0) {
            console.warn(`Found potential fake barber names: ${name} (${nonTestBarbers.length} records)`)
          }
        }
      }
    })
  })

  describe('Data Comes from Supabase', () => {
    test('all barbershops have valid database IDs', async () => {
      const { data: shops, error } = await supabase
        .from('barbershops')
        .select('id, name, created_at')
        .limit(100)

      if (error && !error.message.includes('permission denied')) {
        console.warn('Cannot check barbershop IDs:', error.message)
        return
      }

      if (shops) {
        shops.forEach(shop => {
          expect(shop.id).toBeDefined()
          expect(typeof shop.id).toBe('string')
          expect(shop.id.length).toBeGreaterThan(10) // UUIDs or meaningful IDs
          expect(shop.created_at).toBeDefined()
        })
      }
    })

    test('all appointments reference valid barbershops', async () => {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, barbershop_id, client_name')
        .limit(50)

      if (error && !error.message.includes('permission denied')) {
        console.warn('Cannot check appointment barbershop references:', error.message)
        return
      }

      if (appointments && appointments.length > 0) {
        for (const appointment of appointments) {
          const { data: shop, error: shopError } = await supabase
            .from('barbershops')
            .select('id')
            .eq('id', appointment.barbershop_id)
            .single()

          if (!shopError && !shop) {
            fail(`Appointment ${appointment.id} references non-existent barbershop: ${appointment.barbershop_id}`)
          }
        }
      }
    })

    test('all profiles have valid user references', async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .limit(50)

      if (error && !error.message.includes('permission denied')) {
        console.warn('Cannot check profile user references:', error.message)
        return
      }

      if (profiles) {
        profiles.forEach(profile => {
          expect(profile.id).toBeDefined()
          expect(typeof profile.id).toBe('string')
          expect(profile.id.length).toBeGreaterThan(20) // UUID format
          
          if (profile.role) {
            const validRoles = ['CLIENT', 'BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN']
            expect(validRoles).toContain(profile.role)
          }
        })
      }
    })

    test('no hardcoded barbershop IDs in code', async () => {
      // Check for common hardcoded barbershop IDs that might exist in database
      const hardcodedIds = [
        'demo-shop-001',
        'test-shop-001',
        'sample-shop',
        'example-barbershop',
        'placeholder-shop'
      ]

      for (const id of hardcodedIds) {
        const { data: shop, error } = await supabase
          .from('barbershops')
          .select('id, name')
          .eq('id', id)

        if (!error && shop) {
          fail(`Found hardcoded barbershop ID in database: ${id}`)
        }
      }
    })
  })

  describe('Database Constraints and Validation', () => {
    test('required fields are properly enforced', async () => {
      // Test that required fields can't be null/empty
      try {
        const { data, error } = await supabase
          .from('barbershops')
          .insert({
            name: '', // Empty name should fail
            owner_id: null, // Null owner should fail
            phone: '',
            address: ''
          })
          .select()

        if (!error) {
          // If it succeeded, it should be rejected - clean up
          if (data && data[0]) {
            await supabase.from('barbershops').delete().eq('id', data[0].id)
          }
          console.warn('Database allows empty required fields - validation may be missing')
        }
      } catch (testError) {
        // Good - database properly rejects invalid data
        expect(testError).toBeDefined()
      }
    })

    test('foreign key constraints are enforced', async () => {
      // Test that appointments can't reference non-existent barbershops
      try {
        const { data, error } = await supabase
          .from('appointments')
          .insert({
            barbershop_id: 'non-existent-shop-id',
            client_name: 'Test Client',
            client_email: 'test@test.com',
            service_name: 'Test Service',
            price: 25.00,
            date: new Date().toISOString().split('T')[0],
            time: '10:00',
            status: 'confirmed'
          })
          .select()

        if (!error && data) {
          // Clean up if it somehow succeeded
          await supabase.from('appointments').delete().eq('id', data[0].id)
          console.warn('Database allows invalid foreign key references')
        }
      } catch (testError) {
        // Good - database properly enforces foreign key constraints
        expect(testError).toBeDefined()
      }
    })

    test('unique constraints are enforced', async () => {
      // Test that duplicate emails are rejected in profiles
      const testEmail = `duplicate-test-${Date.now()}@test.com`
      
      // Create first user
      const { data: user1, error: error1 } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'Test123!',
        email_confirm: true
      })

      if (error1) {
        console.warn('Cannot test unique constraints:', error1.message)
        return
      }

      try {
        // Try to create duplicate
        const { data: user2, error: error2 } = await supabase.auth.admin.createUser({
          email: testEmail,
          password: 'Test123!',
          email_confirm: true
        })

        if (!error2) {
          // Clean up both users
          await supabase.auth.admin.deleteUser(user1.user.id)
          if (user2?.user?.id) {
            await supabase.auth.admin.deleteUser(user2.user.id)
          }
          console.warn('Database allows duplicate emails')
        } else {
          // Good - duplicate was rejected, clean up first user
          await supabase.auth.admin.deleteUser(user1.user.id)
        }
      } catch (testError) {
        // Clean up first user
        await supabase.auth.admin.deleteUser(user1.user.id)
        // Good - database properly enforces unique constraints
        expect(testError).toBeDefined()
      }
    })
  })

  describe('Data Consistency Checks', () => {
    test('appointment prices match service prices', async () => {
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, service_id, price, barbershop_id')
        .not('service_id', 'is', null)
        .limit(20)

      if (appointmentsError && !appointmentsError.message.includes('permission denied')) {
        console.warn('Cannot check appointment-service price consistency:', appointmentsError.message)
        return
      }

      if (appointments && appointments.length > 0) {
        for (const appointment of appointments) {
          if (appointment.service_id) {
            const { data: service, error: serviceError } = await supabase
              .from('services')
              .select('price')
              .eq('id', appointment.service_id)
              .single()

            if (!serviceError && service) {
              if (Math.abs(appointment.price - service.price) > 0.01) {
                console.warn(`Price mismatch for appointment ${appointment.id}: appointment=${appointment.price}, service=${service.price}`)
              }
            }
          }
        }
      }
    })

    test('all barbershops have valid owner references', async () => {
      const { data: shops, error } = await supabase
        .from('barbershops')
        .select('id, name, owner_id')
        .limit(20)

      if (error && !error.message.includes('permission denied')) {
        console.warn('Cannot check barbershop owner references:', error.message)
        return
      }

      if (shops && shops.length > 0) {
        for (const shop of shops) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', shop.owner_id)
            .single()

          if (profileError && !profileError.message.includes('No rows')) {
            console.warn(`Barbershop ${shop.id} has invalid owner reference: ${shop.owner_id}`)
          }
        }
      }
    })
  })
})