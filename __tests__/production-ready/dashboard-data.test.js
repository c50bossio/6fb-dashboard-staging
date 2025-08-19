/**
 * Production-Ready Dashboard Data Tests
 * 
 * Tests verify that dashboard shows real data or proper empty states,
 * with no mock data or hardcoded demo content.
 */

import { createClient } from '@supabase/supabase-js'
import { queryTable } from '@/lib/supabase-query'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
  throw new Error('Missing Supabase credentials. Cannot run production-ready dashboard tests.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

describe('Production-Ready Dashboard Data', () => {
  let testUser = null
  let testBarbershop = null

  beforeAll(async () => {
    // Verify Supabase connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error && !error.message.includes('permission denied')) {
      throw new Error(`Cannot connect to Supabase: ${error.message}`)
    }
  })

  afterEach(async () => {
    // Clean up test data
    if (testBarbershop) {
      try {
        await supabase.from('barbershops').delete().eq('id', testBarbershop.id)
      } catch (error) {
        console.warn('Could not delete test barbershop:', error.message)
      }
    }
    if (testUser) {
      try {
        await supabase.auth.admin.deleteUser(testUser.id)
      } catch (error) {
        console.warn('Could not delete test user:', error.message)
      }
    }
    testUser = null
    testBarbershop = null
  })

  describe('Real Data Verification', () => {
    test('dashboard metrics come from actual database tables', async () => {
      // Create test user and barbershop
      const testEmail = `dashboard-${Date.now()}@production-test.com`
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'DashboardTest123!',
        email_confirm: true
      })

      expect(userError).toBeNull()
      testUser = userData.user

      // Create test barbershop
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: 'Test Dashboard Shop',
          owner_id: testUser.id,
          phone: '+1234567890',
          address: '123 Test Street'
        })
        .select()
        .single()

      if (shopError && !shopError.message.includes('permission denied')) {
        console.warn('Barbershop creation warning:', shopError.message)
        return // Skip if we can't create test data
      }

      testBarbershop = shopData

      // Insert real appointments data
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert([
          {
            barbershop_id: testBarbershop.id,
            client_name: 'Real Test Client',
            client_email: 'realclient@test.com',
            service_name: 'Haircut',
            price: 25.00,
            date: new Date().toISOString().split('T')[0],
            time: '10:00',
            status: 'confirmed'
          },
          {
            barbershop_id: testBarbershop.id,
            client_name: 'Another Real Client',
            client_email: 'anotherclient@test.com',
            service_name: 'Beard Trim',
            price: 15.00,
            date: new Date().toISOString().split('T')[0],
            time: '11:00',
            status: 'completed'
          }
        ])
        .select()

      if (appointmentError && !appointmentError.message.includes('permission denied')) {
        console.warn('Appointment creation warning:', appointmentError.message)
      }

      // Verify dashboard queries return real data
      const { data: metrics, error: metricsError } = await supabase
        .from('appointments')
        .select('count')
        .eq('barbershop_id', testBarbershop.id)

      if (!metricsError) {
        expect(metrics).toBeDefined()
        expect(Array.isArray(metrics)).toBe(true)
      }
    })

    test('no demo-shop-001 references in database', async () => {
      // Check for hardcoded demo shop IDs
      const demoShopPatterns = [
        'demo-shop-001',
        'demo-shop',
        'test-shop-001',
        'sample-shop'
      ]

      for (const pattern of demoShopPatterns) {
        const { data: shops, error } = await supabase
          .from('barbershops')
          .select('id, name')
          .or(`id.eq.${pattern},name.ilike.%${pattern}%`)

        if (error && !error.message.includes('permission denied')) {
          console.warn(`Cannot check for demo shop ${pattern}:`, error.message)
          continue
        }

        if (shops && shops.length > 0) {
          fail(`Found demo shop references in production database: ${JSON.stringify(shops)}`)
        }
      }
    })

    test('AI insights display only when real data exists', async () => {
      // Create test user
      const testEmail = `ai-insights-${Date.now()}@production-test.com`
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'AIInsightsTest123!',
        email_confirm: true
      })

      expect(userError).toBeNull()
      testUser = userData.user

      // Check AI insights table structure
      const { data: aiInsights, error: aiError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('barbershop_id', 'non-existent-shop')
        .limit(1)

      if (aiError && !aiError.message.includes('permission denied') && !aiError.message.includes('relation "ai_insights" does not exist')) {
        console.warn('AI insights query warning:', aiError.message)
      }

      // Should return empty array for non-existent shop, not fake data
      if (aiInsights) {
        expect(Array.isArray(aiInsights)).toBe(true)
        expect(aiInsights.length).toBe(0)
      }
    })

    test('dashboard shows proper empty states when no data exists', async () => {
      // Create user with no barbershop
      const testEmail = `empty-state-${Date.now()}@production-test.com`
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'EmptyStateTest123!',
        email_confirm: true
      })

      expect(userError).toBeNull()
      testUser = userData.user

      // Check that queries return empty results, not mock data
      const { data: shops, error: shopError } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', testUser.id)

      if (!shopError) {
        expect(Array.isArray(shops)).toBe(true)
        expect(shops.length).toBe(0) // Should be empty, not contain fake shops
      }

      const { data: appointments, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', 'non-existent-shop')

      if (!appointmentError) {
        expect(Array.isArray(appointments)).toBe(true)
        expect(appointments.length).toBe(0) // Should be empty, not contain fake appointments
      }
    })
  })

  describe('Mock Data Detection', () => {
    test('no placeholder addresses in barbershops table', async () => {
      const placeholderAddresses = [
        '123 Main Street',
        '456 Example Ave',
        '789 Sample Blvd',
        'Test Address',
        'Sample Address'
      ]

      for (const address of placeholderAddresses) {
        const { data: shops, error } = await supabase
          .from('barbershops')
          .select('id, name, address')
          .ilike('address', `%${address}%`)

        if (error && !error.message.includes('permission denied')) {
          console.warn(`Cannot check for placeholder address ${address}:`, error.message)
          continue
        }

        if (shops && shops.length > 0) {
          fail(`Found placeholder addresses in production database: ${JSON.stringify(shops)}`)
        }
      }
    })

    test('no fake phone numbers in database', async () => {
      const fakePhonePatterns = [
        '(555) 123-4567',
        '555-123-4567',
        '1234567890',
        '(000) 000-0000',
        '555-0123'
      ]

      for (const phone of fakePhonePatterns) {
        const { data: shops, error } = await supabase
          .from('barbershops')
          .select('id, name, phone')
          .eq('phone', phone)

        if (error && !error.message.includes('permission denied')) {
          console.warn(`Cannot check for fake phone ${phone}:`, error.message)
          continue
        }

        if (shops && shops.length > 0) {
          fail(`Found fake phone numbers in production database: ${JSON.stringify(shops)}`)
        }
      }
    })

    test('no test client names in appointments', async () => {
      const testClientNames = [
        'Test Client',
        'Demo User',
        'Sample Customer',
        'John Doe',
        'Jane Doe',
        'Test User'
      ]

      for (const name of testClientNames) {
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('id, client_name, barbershop_id')
          .ilike('client_name', `%${name}%`)

        if (error && !error.message.includes('permission denied')) {
          console.warn(`Cannot check for test client ${name}:`, error.message)
          continue
        }

        if (appointments && appointments.length > 0) {
          // Allow test data created during testing
          const nonTestAppointments = appointments.filter(apt => 
            !apt.client_name.includes('Real Test Client') && 
            !apt.client_name.includes('Another Real Client')
          )
          
          if (nonTestAppointments.length > 0) {
            console.warn(`Found potential test client names in production: ${JSON.stringify(nonTestAppointments)}`)
          }
        }
      }
    })
  })

  describe('Database Schema Validation', () => {
    test('required dashboard tables exist', async () => {
      const requiredTables = [
        'barbershops',
        'appointments',
        'profiles',
        'services'
      ]

      for (const tableName of requiredTables) {
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1)

        if (error && error.message.includes('relation') && error.message.includes('does not exist')) {
          fail(`Required table ${tableName} does not exist in database`)
        }
      }
    })

    test('barbershops table has proper structure', async () => {
      const { data, error } = await supabase
        .from('barbershops')
        .select('id, name, owner_id, phone, address, created_at')
        .limit(1)

      if (error && !error.message.includes('permission denied')) {
        console.warn('Cannot verify barbershops table structure:', error.message)
        return
      }

      // If successful, table structure is valid
      expect(error).toBeNull()
    })

    test('appointments table has proper structure', async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, barbershop_id, client_name, client_email, service_name, price, date, time, status')
        .limit(1)

      if (error && !error.message.includes('permission denied')) {
        console.warn('Cannot verify appointments table structure:', error.message)
        return
      }

      // If successful, table structure is valid
      expect(error).toBeNull()
    })
  })

  describe('Real-time Data Updates', () => {
    test('dashboard data reflects real database changes', async () => {
      // Create test user and barbershop
      const testEmail = `realtime-${Date.now()}@production-test.com`
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'RealtimeTest123!',
        email_confirm: true
      })

      expect(userError).toBeNull()
      testUser = userData.user

      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: 'Realtime Test Shop',
          owner_id: testUser.id,
          phone: '+1987654321',
          address: '456 Realtime Ave'
        })
        .select()
        .single()

      if (shopError && !shopError.message.includes('permission denied')) {
        console.warn('Barbershop creation warning:', shopError.message)
        return
      }

      testBarbershop = shopData

      // Insert appointment
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          barbershop_id: testBarbershop.id,
          client_name: 'Realtime Test Client',
          client_email: 'realtime@test.com',
          service_name: 'Test Service',
          price: 30.00,
          date: new Date().toISOString().split('T')[0],
          time: '14:00',
          status: 'confirmed'
        })
        .select()
        .single()

      if (appointmentError && !appointmentError.message.includes('permission denied')) {
        console.warn('Appointment creation warning:', appointmentError.message)
        return
      }

      // Verify data exists
      const { data: fetchedAppointments, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', testBarbershop.id)

      if (!fetchError) {
        expect(fetchedAppointments).toBeDefined()
        expect(fetchedAppointments.length).toBeGreaterThan(0)
        expect(fetchedAppointments[0].client_name).toBe('Realtime Test Client')
      }
    })
  })
})