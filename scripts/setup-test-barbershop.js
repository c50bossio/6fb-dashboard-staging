#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Setup Test Barbershop Script
 * Creates a complete test barbershop with real data structure for production validation
 */

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test barbershop data - realistic for production validation
const TEST_BARBERSHOP_DATA = {
  owner: {
    id: crypto.randomUUID(),
    email: 'testowner@6fb-demo.com',
    full_name: 'Mike Johnson',
    role: 'enterprise_owner'
  },
  barbershop: {
    id: crypto.randomUUID(),
    name: "Mike's Professional Barbershop",
    description: 'A modern barbershop focused on premium cuts and exceptional service',
    address: '123 Main Street',
    city: 'Demo City',
    state: 'CA',
    zip_code: '90210',
    country: 'US',
    phone: '555-CUTS-01',
    email: 'info@mikes-barbershop.com',
    website: 'https://mikes-barbershop.com',
    business_hours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '19:00' },
      friday: { open: '09:00', close: '19:00' },
      saturday: { open: '08:00', close: '17:00' },
      sunday: { open: '10:00', close: '15:00' }
    },
    booking_settings: {
      requireAuth: false,
      advanceBookingDays: 30,
      minNoticeHours: 2,
      maxDailyBookings: 20
    },
    business_type: 'barbershop',
    online_booking_enabled: true,
    accepts_online_payments: true
  },
  services: [
    {
      id: crypto.randomUUID(),
      name: 'Classic Haircut',
      description: 'Professional haircut with wash and style',
      duration_minutes: 30,
      price: 35.00,
      category: 'haircut',
      is_featured: true
    },
    {
      id: crypto.randomUUID(),
      name: 'Beard Trim & Shape',
      description: 'Precision beard trimming and styling',
      duration_minutes: 20,
      price: 25.00,
      category: 'beard',
    },
    {
      id: crypto.randomUUID(),
      name: 'The Full Experience',
      description: 'Haircut, beard trim, hot towel, and styling',
      duration_minutes: 60,
      price: 65.00,
      category: 'combo',
      is_featured: true
    },
    {
      id: crypto.randomUUID(),
      name: 'Kids Haircut',
      description: 'Haircut for children under 12',
      duration_minutes: 25,
      price: 20.00,
      category: 'haircut',
    },
    {
      id: crypto.randomUUID(),
      name: 'Traditional Hot Shave',
      description: 'Classic straight razor shave with hot towels',
      duration_minutes: 45,
      price: 40.00,
      category: 'shave',
    }
  ],
  staff: [
    {
      id: crypto.randomUUID(),
      email: 'barber1@6fb-demo.com',
      name: 'Alex Rodriguez',
      phone: '555-DEMO-02',
      role: 'enterprise_owner',
      commission_rate: 0.25
    },
    {
      id: crypto.randomUUID(),
      email: 'barber2@6fb-demo.com', 
      name: 'Sarah Chen',
      phone: '555-DEMO-03',
      role: 'enterprise_owner',
      commission_rate: 0.30
    }
  ],
  sampleBookings: [
    {
      scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      client_name: 'John Smith',
      client_phone: '555-CLIENT-01',
      client_email: 'john.smith@email.com'
    },
    {
      scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now  
      client_name: 'Michael Brown',
      client_phone: '555-CLIENT-02',
      client_email: 'mike.brown@email.com'
    }
  ]
}

// ==========================================
// SETUP FUNCTIONS
// ==========================================

async function createTestOwner() {

  // Check if test user already exists in auth
  const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingAuthUsers.users.find(user => user.email === TEST_BARBERSHOP_DATA.owner.email)
  
  if (existingUser) {
    
    TEST_BARBERSHOP_DATA.owner.id = existingUser.id
    return { success: true, userId: existingUser.id }
  }
  
  // Create auth user first
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_BARBERSHOP_DATA.owner.email,
    password: 'TempPassword123!',
    email_confirm: true,
    user_metadata: {
      full_name: TEST_BARBERSHOP_DATA.owner.full_name,
      role: TEST_BARBERSHOP_DATA.owner.role
    }
  })
  
  if (authError) {
    
    return { success: false, error: authError.message }
  }
  
  `)
  TEST_BARBERSHOP_DATA.owner.id = authUser.user.id
  
  // Create corresponding user in users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert([{
      id: authUser.user.id,
      email: TEST_BARBERSHOP_DATA.owner.email,
      full_name: TEST_BARBERSHOP_DATA.owner.full_name,
      role: TEST_BARBERSHOP_DATA.owner.role,
      onboarding_completed: true,
      subscription_tier: 'enterprise',
      is_active: true,
      email_verified: true
    }])
    .select()
    .single()
  
  if (userError) {
    
    // Continue anyway, user record might not be required
  } else {
    
  }
  
  // Update profile (likely created automatically by trigger)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert([{
      id: authUser.user.id,
      email: TEST_BARBERSHOP_DATA.owner.email,
      full_name: TEST_BARBERSHOP_DATA.owner.full_name,
      role: TEST_BARBERSHOP_DATA.owner.role,
      onboarding_completed: true,
      subscription_tier: 'enterprise'
    }])
    .select()
    .single()
  
  if (profileError) {
    
    // Clean up auth user if profile creation failed
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return { success: false, error: profileError.message }
  }
  
  `)
  return { success: true, userId: profile.id }
}

async function createTestBarbershop() {

  const barbershopData = {
    ...TEST_BARBERSHOP_DATA.barbershop,
    owner_id: TEST_BARBERSHOP_DATA.owner.id
  }
  
  const { data: existingShop, error: checkError } = await supabase
    .from('barbershops')
    .select('id')
    .eq('name', barbershopData.name)
    .single()
  
  if (existingShop) {
    
    TEST_BARBERSHOP_DATA.barbershop.id = existingShop.id
    return { success: true, shopId: existingShop.id }
  }
  
  const { data: barbershop, error: shopError } = await supabase
    .from('barbershops')
    .insert([barbershopData])
    .select()
    .single()
  
  if (shopError) {
    
    return { success: false, error: shopError.message }
  }

  // Update owner profile with shop_id
  await supabase
    .from('profiles')
    .update({ barbershop_id: barbershop.id })
    .eq('id', TEST_BARBERSHOP_DATA.owner.id)
  
  return { success: true, shopId: barbershop.id }
}

async function createTestServices() {

  const services = TEST_BARBERSHOP_DATA.services.map(service => ({
    ...service,
    barbershop_id: TEST_BARBERSHOP_DATA.barbershop.id
  }))
  
  // Clear existing services for this barbershop
  await supabase
    .from('services')
    .delete()
    .eq('barbershop_id', TEST_BARBERSHOP_DATA.barbershop.id)
  
  const { data: createdServices, error: servicesError } = await supabase
    .from('services')
    .insert(services)
    .select()
  
  if (servicesError) {
    
    return { success: false, error: servicesError.message }
  }

  createdServices.forEach(service => {
    const featured = service.is_featured ? '⭐' : '  '
    `)
  })
  
  return { success: true, services: createdServices }
}

async function createTestStaff() {

  let createdStaff = []
  
  for (const staffMember of TEST_BARBERSHOP_DATA.staff) {
    // Create auth user for staff
    const { data: staffAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email: staffMember.email,
      password: 'TempPassword123!',
      email_confirm: true,
      user_metadata: {
        full_name: staffMember.name,
        role: staffMember.role
      }
    })
    
    if (authError) {
      
      continue
    }
    
    staffMember.id = staffAuthUser.user.id
    
    // Create staff user record
    const { data: staffUser, error: userError } = await supabase
      .from('users')
      .insert([{
        id: staffAuthUser.user.id,
        email: staffMember.email,
        full_name: staffMember.name,
        role: staffMember.role,
        is_active: true,
        email_verified: true,
        subscription_tier: 'enterprise'
      }])
      .select()
      .single()
    
    if (userError) {
      
      // Continue anyway
    }
    
    // Update staff profile
    const { data: staffProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert([{
        id: staffAuthUser.user.id,
        email: staffMember.email,
        full_name: staffMember.name,
        role: staffMember.role,
        barbershop_id: TEST_BARBERSHOP_DATA.barbershop.id,
        subscription_tier: 'enterprise'
      }])
      .select()
      .single()
    
    if (profileError) {
      
      continue
    }
    
    // Create staff relationship
    const { data: staffRecord, error: staffError } = await supabase
      .from('barbershop_staff')
      .upsert([{
        barbershop_id: TEST_BARBERSHOP_DATA.barbershop.id,
        user_id: staffMember.id,
        role: staffMember.role,
        commission_rate: staffMember.commission_rate
      }], { onConflict: 'barbershop_id,user_id' })
      .select()
      .single()
    
    if (staffError) {
      
      continue
    }
    
    createdStaff.push({
      profile: staffProfile,
      staff: staffRecord
    })
    
    `)
  }
  
  return { success: createdStaff.length > 0, staff: createdStaff }
}

async function createSampleBookings() {

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('barbershop_id', TEST_BARBERSHOP_DATA.barbershop.id)
    .limit(2)
  
  if (!services || services.length === 0) {
    
    return { success: false, error: 'No services available' }
  }
  
  const { data: staff } = await supabase
    .from('barbershop_staff')
    .select('user_id')
    .eq('barbershop_id', TEST_BARBERSHOP_DATA.barbershop.id)
    .limit(1)
  
  const bookings = TEST_BARBERSHOP_DATA.sampleBookings.map((booking, index) => ({
    barbershop_id: TEST_BARBERSHOP_DATA.barbershop.id,
    service_id: services[index % services.length].id,
    barber_id: staff && staff.length > 0 ? staff[0].user_id : null,
    start_time: booking.scheduled_at,
    end_time: new Date(new Date(booking.scheduled_at).getTime() + services[index % services.length].duration_minutes * 60000).toISOString(),
    duration_minutes: services[index % services.length].duration_minutes,
    price: services[index % services.length].price,
    status: 'CONFIRMED',
    customer_name: booking.client_name,
    customer_phone: booking.client_phone,
    customer_email: booking.client_email,
    service_name: services[index % services.length].name,
    is_test: true
  }))
  
  const { data: createdBookings, error: bookingsError } = await supabase
    .from('bookings')
    .insert(bookings)
    .select()
  
  if (bookingsError) {
    
    return { success: false, error: bookingsError.message }
  }

  createdBookings.forEach(booking => {
    const date = new Date(booking.start_time).toLocaleDateString()
    const time = new Date(booking.start_time).toLocaleTimeString()
    
  })
  
  return { success: true, bookings: createdBookings }
}

// ==========================================
// MAIN SETUP FUNCTION
// ==========================================

async function setupTestBarbershop() {

  const results = {
    owner: { success: false },
    barbershop: { success: false },
    services: { success: false },
    staff: { success: false },
    bookings: { success: false }
  }
  
  try {
    // Step 1: Create test owner
    results.owner = await createTestOwner()
    if (!results.owner.success) {
      throw new Error('Failed to create test owner')
    }
    
    // Step 2: Create barbershop
    results.barbershop = await createTestBarbershop()
    if (!results.barbershop.success) {
      throw new Error('Failed to create test barbershop')
    }
    
    // Step 3: Create services
    results.services = await createTestServices()
    if (!results.services.success) {
      throw new Error('Failed to create test services')
    }
    
    // Step 4: Create staff (optional)
    results.staff = await createTestStaff()
    
    // Step 5: Create sample bookings (optional)
    results.bookings = await createSampleBookings()
    
    // Summary

    // Essential data for testing
    const essentialSuccess = results.owner.success && results.barbershop.success && results.services.success

    if (essentialSuccess) {

      return true
    } else {

      return false
    }
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message)
    
    return false
  }
}

// ==========================================
// CLEANUP FUNCTION
// ==========================================

async function cleanupTestData() {

  try {
    // Delete in reverse dependency order
    await supabase.from('bookings').delete().eq('is_test', true)
    await supabase.from('barbershop_staff').delete().eq('barbershop_id', TEST_BARBERSHOP_DATA.barbershop.id)
    await supabase.from('services').delete().eq('barbershop_id', TEST_BARBERSHOP_DATA.barbershop.id)
    await supabase.from('barbershops').delete().eq('name', TEST_BARBERSHOP_DATA.barbershop.name)
    await supabase.from('profiles').delete().like('email', '%@6fb-demo.com')
    await supabase.from('users').delete().like('email', '%@6fb-demo.com')
    
    // Clean up auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const testAuthUsers = authUsers.users.filter(user => user.email?.includes('@6fb-demo.com'))
    
    for (const authUser of testAuthUsers) {
      await supabase.auth.admin.deleteUser(authUser.id)
      
    }

  } catch (error) {
    
  }
}

// ==========================================
// EXECUTION
// ==========================================

// Check if this script is being run directly
if (process.argv[1] && process.argv[1].endsWith('setup-test-barbershop.js')) {
  
  const args = process.argv.slice(2)
  
  if (args.includes('--cleanup')) {
    cleanupTestData()
      .then(() => {
        
        process.exit(0)
      })
      .catch(error => {
        console.error('💥 Cleanup failed:', error.message)
        process.exit(1)
      })
  } else {
    setupTestBarbershop()
      .then(success => {
        if (success) {

          process.exit(0)
        } else {

          process.exit(1)
        }
      })
      .catch(error => {
        console.error('\n💥 Fatal setup error:', error.message)
        process.exit(1)
      })
  }
}

export { setupTestBarbershop, cleanupTestData }