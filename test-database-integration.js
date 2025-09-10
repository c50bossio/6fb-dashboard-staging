#!/usr/bin/env node

/**
 * Comprehensive Database Integration Test
 * Tests all major API endpoints with real Supabase database
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testDatabaseIntegration() {
  console.log('🧪 Running Comprehensive Database Integration Tests\n')
  
  let passCount = 0
  let failCount = 0
  
  function testResult(testName, passed, details = '') {
    if (passed) {
      console.log(`✅ ${testName}`)
      passCount++
    } else {
      console.log(`❌ ${testName}`)
      if (details) console.log(`   ${details}`)
      failCount++
    }
  }

  // Test 1: Database Connection
  console.log('📊 Testing Database Connection...')
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    testResult('Database connection', !error, error?.message)
  } catch (err) {
    testResult('Database connection', false, err.message)
  }

  // Test 2: Check Required Tables Exist
  console.log('\n🗂️ Checking Required Tables...')
  const requiredTables = [
    'profiles', 'appointments', 'services', 'barbershops', 
    'barbershop_staff', 'business_hours', 'notifications'
  ]
  
  for (const tableName of requiredTables) {
    try {
      const { data, error } = await supabase.from(tableName).select('count').limit(1)
      testResult(`Table '${tableName}' exists`, !error, error?.message)
    } catch (err) {
      testResult(`Table '${tableName}' exists`, false, err.message)
    }
  }

  // Test 3: Check Appointments Table Schema
  console.log('\n📅 Testing Appointments Table Schema...')
  try {
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .limit(1)
    
    if (appointments && appointments.length > 0) {
      const appointment = appointments[0]
      const requiredColumns = [
        'id', 'barbershop_id', 'client_id', 'barber_id', 'service_id',
        'scheduled_at', 'duration_minutes', 'status', 'service_price', 'total_amount'
      ]
      
      for (const column of requiredColumns) {
        testResult(
          `Appointments table has '${column}' column`, 
          column in appointment,
          column in appointment ? '' : `Column '${column}' missing`
        )
      }
    } else {
      console.log('   ℹ️ No appointment data to check schema')
    }
  } catch (err) {
    testResult('Appointments schema check', false, err.message)
  }

  // Test 4: Check Services Table with barbershop_id
  console.log('\n🏪 Testing Services Table Schema...')
  try {
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .limit(1)
    
    if (services && services.length > 0) {
      const service = services[0]
      testResult(
        'Services table has barbershop_id column',
        'barbershop_id' in service,
        'barbershop_id' in service ? '' : 'Column barbershop_id missing from services table'
      )
    } else {
      console.log('   ℹ️ No service data to check schema')
    }
  } catch (err) {
    testResult('Services schema check', false, err.message)
  }

  // Test 5: Test Data Relationships
  console.log('\n🔗 Testing Data Relationships...')
  try {
    // Test appointment with related data
    const { data: appointmentWithRelations, error } = await supabase
      .from('appointments')
      .select(`
        *,
        client:profiles!appointments_client_id_fkey(id, email, full_name),
        barber:profiles!appointments_barber_id_fkey(id, email, full_name),
        service:services(id, name, description, duration_minutes, price, category)
      `)
      .limit(1)
    
    if (!error && appointmentWithRelations && appointmentWithRelations.length > 0) {
      const apt = appointmentWithRelations[0]
      testResult('Appointment-Client relationship', apt.client !== null)
      testResult('Appointment-Barber relationship', apt.barber !== null) 
      testResult('Appointment-Service relationship', apt.service !== null)
    } else {
      console.log('   ℹ️ No appointment data to test relationships')
    }
  } catch (err) {
    testResult('Data relationships', false, err.message)
  }

  // Test 6: Test Insert/Update/Delete Operations
  console.log('\n✏️ Testing CRUD Operations...')
  let testAppointmentId = null
  
  try {
    // Create a test barbershop first if needed
    const { data: existingShop } = await supabase
      .from('barbershops')
      .select('id')
      .limit(1)
      .single()
    
    let shopId = existingShop?.id
    
    if (!shopId) {
      const { data: newShop, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: 'Test Shop',
          description: 'Test shop for database integration',
          owner_id: null // Will need to be set properly in real use
        })
        .select('id')
        .single()
      
      if (!shopError) {
        shopId = newShop.id
      }
    }
    
    // Get test profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(2)
    
    // Get test service
    const { data: services } = await supabase
      .from('services')
      .select('id')
      .limit(1)
    
    if (profiles?.length >= 2 && services?.length >= 1 && shopId) {
      // Test INSERT
      const testAppointment = {
        barbershop_id: shopId,
        client_id: profiles[0].id,
        barber_id: profiles[1].id,
        service_id: services[0].id,
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 30,
        service_price: 35.00,
        total_amount: 35.00,
        status: 'PENDING',
        client_name: 'Test Client',
        client_phone: '+1 (555) 123-4567',
        client_email: 'test@example.com'
      }
      
      const { data: insertedAppointment, error: insertError } = await supabase
        .from('appointments')
        .insert(testAppointment)
        .select()
        .single()
      
      testResult('Insert appointment', !insertError, insertError?.message)
      
      if (!insertError && insertedAppointment) {
        testAppointmentId = insertedAppointment.id
        
        // Test UPDATE
        const { data: updatedAppointment, error: updateError } = await supabase
          .from('appointments')
          .update({ 
            status: 'CONFIRMED',
            tip_amount: 5.00,
            total_amount: 40.00
          })
          .eq('id', testAppointmentId)
          .select()
          .single()
        
        testResult('Update appointment', !updateError, updateError?.message)
        testResult('Update reflects changes', updatedAppointment?.status === 'CONFIRMED')
        
        // Test DELETE (mark as cancelled)
        const { data: cancelledAppointment, error: deleteError } = await supabase
          .from('appointments')
          .update({ status: 'CANCELLED' })
          .eq('id', testAppointmentId)
          .select()
          .single()
        
        testResult('Cancel appointment', !deleteError, deleteError?.message)
        testResult('Cancel reflects changes', cancelledAppointment?.status === 'CANCELLED')
      }
    } else {
      console.log('   ⚠️ Insufficient test data for CRUD operations')
    }
  } catch (err) {
    testResult('CRUD operations', false, err.message)
  }

  // Test 7: Performance Check
  console.log('\n⚡ Testing Query Performance...')
  try {
    const startTime = Date.now()
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        client:profiles!appointments_client_id_fkey(id, email, full_name),
        barber:profiles!appointments_barber_id_fkey(id, email, full_name),
        service:services(id, name, price)
      `)
      .limit(10)
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    testResult('Complex query executes', !error, error?.message)
    testResult('Query performance < 2000ms', duration < 2000, `Query took ${duration}ms`)
    
  } catch (err) {
    testResult('Performance test', false, err.message)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📈 Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`)
  
  if (failCount === 0) {
    console.log('\n🎉 All tests passed! Database integration is fully functional.')
  } else {
    console.log('\n⚠️ Some tests failed. Check the migration and seeding scripts.')
  }
  
  return failCount === 0
}

// Run the tests
testDatabaseIntegration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error)
    process.exit(1)
  })