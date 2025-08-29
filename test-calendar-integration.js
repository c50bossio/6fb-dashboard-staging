#!/usr/bin/env node

/**
 * Calendar Integration Test Script
 * Tests the calendar integration infrastructure without requiring a running Next.js server
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🧪 Testing Google Calendar Integration Infrastructure...\n')

async function testDatabaseSchema() {
  console.log('📊 Testing Database Schema...')
  
  const tables = [
    'calendar_integrations',
    'calendar_sync_history', 
    'calendar_conflicts'
  ]
  
  const results = {}
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      results[table] = !error
      console.log(`  ✅ ${table}: ${!error ? 'EXISTS' : 'MISSING'}`)
      if (error) console.log(`     Error: ${error.message}`)
    } catch (e) {
      results[table] = false
      console.log(`  ❌ ${table}: ERROR - ${e.message}`)
    }
  }
  
  return results
}

async function testEnvironmentConfig() {
  console.log('\n🔧 Testing Environment Configuration...')
  
  const requiredEnv = {
    'NEXT_PUBLIC_SUPABASE_URL': !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    'GOOGLE_CLIENT_ID': !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id',
    'GOOGLE_CLIENT_SECRET': !!process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret',
    'CALENDAR_ENCRYPTION_KEY': !!process.env.CALENDAR_ENCRYPTION_KEY
  }
  
  for (const [key, exists] of Object.entries(requiredEnv)) {
    console.log(`  ${exists ? '✅' : '❌'} ${key}: ${exists ? 'CONFIGURED' : 'MISSING'}`)
  }
  
  return requiredEnv
}

async function testServices() {
  console.log('\n⚙️ Testing Service Imports...')
  
  const services = {}
  
  // Test calendar service
  try {
    const { calendarIntegrationService } = await import('./services/calendar-integration-service.js')
    services.calendarIntegrationService = !!calendarIntegrationService
    console.log(`  ✅ calendarIntegrationService: IMPORTED`)
  } catch (e) {
    services.calendarIntegrationService = false
    console.log(`  ❌ calendarIntegrationService: ERROR - ${e.message}`)
  }
  
  // Test encryption service
  try {
    const { encryptionService } = await import('./services/encryption-service.js')
    services.encryptionService = !!encryptionService
    console.log(`  ✅ encryptionService: IMPORTED`)
  } catch (e) {
    services.encryptionService = false
    console.log(`  ❌ encryptionService: ERROR - ${e.message}`)
  }
  
  return services
}

async function testEncryption() {
  console.log('\n🔐 Testing Encryption Service...')
  
  try {
    const { encryptionService } = await import('./services/encryption-service.js')
    
    const testData = 'test-calendar-token-12345-' + Date.now()
    const encrypted = encryptionService.encrypt(testData)
    const decrypted = encryptionService.decrypt(encrypted)
    
    const success = decrypted === testData
    console.log(`  ${success ? '✅' : '❌'} Encryption/Decryption: ${success ? 'WORKING' : 'FAILED'}`)
    
    if (!success) {
      console.log(`    Expected: ${testData}`)
      console.log(`    Got: ${decrypted}`)
    } else {
      console.log(`    Encrypted length: ${encrypted.length} chars`)
    }
    
    return success
  } catch (e) {
    console.log(`  ❌ Encryption Test: ERROR - ${e.message}`)
    return false
  }
}

async function testDatabaseWrite() {
  console.log('\n📝 Testing Database Write Operations...')
  
  try {
    const testIntegration = {
      user_id: '00000000-0000-0000-0000-000000000000',
      barbershop_id: '00000000-0000-0000-0000-000000000000', 
      provider: 'google',
      display_name: 'Test Integration - DELETE ME',
      access_token: 'encrypted-test-token-' + Date.now(),
      refresh_token: 'encrypted-test-refresh-' + Date.now(),
      token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      sync_direction: 'push_only',
      is_active: false
    }
    
    // Test INSERT
    const { data: inserted, error: insertError } = await supabase
      .from('calendar_integrations')
      .insert(testIntegration)
      .select('id')
      .single()
      
    if (insertError) throw insertError
    console.log(`  ✅ INSERT: SUCCESS (id: ${inserted.id})`)
    
    // Test UPDATE
    const { error: updateError } = await supabase
      .from('calendar_integrations')
      .update({ display_name: 'Test Integration - UPDATED' })
      .eq('id', inserted.id)
      
    if (updateError) throw updateError
    console.log(`  ✅ UPDATE: SUCCESS`)
    
    // Test DELETE (cleanup)
    const { error: deleteError } = await supabase
      .from('calendar_integrations')
      .delete()
      .eq('id', inserted.id)
      
    if (deleteError) throw deleteError
    console.log(`  ✅ DELETE: SUCCESS`)
    
    return true
  } catch (e) {
    console.log(`  ❌ Database Write Test: ERROR - ${e.message}`)
    return false
  }
}

async function testCalendarServiceInit() {
  console.log('\n📅 Testing Calendar Service Initialization...')
  
  try {
    const { calendarIntegrationService } = await import('./services/calendar-integration-service.js')
    
    // Test service initialization (without Google OAuth)
    const hasServiceMethods = [
      'buildAppointmentData',
      'buildEventDescription',
      'getAuthUrl',
      'exchangeCodeForTokens'
    ].every(method => typeof calendarIntegrationService[method] === 'function')
    
    console.log(`  ${hasServiceMethods ? '✅' : '❌'} Service Methods: ${hasServiceMethods ? 'AVAILABLE' : 'MISSING'}`)
    
    // Test appointment data building (mock data)
    const mockAppointment = {
      id: 'test-123',
      customers: { name: 'John Doe', email: 'john@test.com' },
      service_name: 'Haircut',
      appointment_date: new Date().toISOString(),
      appointment_time: '10:00',
      barbershops: { name: 'Test Barbershop', address: '123 Test St' },
      barbershop_staff: { full_name: 'Test Barber' }
    }
    
    try {
      const appointmentData = calendarIntegrationService.buildAppointmentData(mockAppointment)
      const hasRequiredFields = appointmentData.customerName && appointmentData.serviceName && appointmentData.startDateTime
      console.log(`  ${hasRequiredFields ? '✅' : '❌'} Data Building: ${hasRequiredFields ? 'WORKING' : 'FAILED'}`)
    } catch (buildError) {
      console.log(`  ❌ Data Building: ERROR - ${buildError.message}`)
    }
    
    return hasServiceMethods
  } catch (e) {
    console.log(`  ❌ Calendar Service Test: ERROR - ${e.message}`)
    return false
  }
}

async function checkTestData() {
  console.log('\n📋 Checking Test Data Availability...')
  
  const dataChecks = {}
  
  try {
    const { data: barbershops } = await supabase.from('barbershops').select('id, name').limit(3)
    dataChecks.barbershops = barbershops ? barbershops.length : 0
    console.log(`  📈 Barbershops: ${dataChecks.barbershops} found`)
  } catch (e) {
    console.log(`  ❌ Barbershops: ERROR - ${e.message}`)
    dataChecks.barbershops = 0
  }
  
  try {
    const { data: bookings } = await supabase.from('bookings').select('id').limit(3)
    dataChecks.appointments = bookings ? bookings.length : 0
    console.log(`  📅 Appointments: ${dataChecks.appointments} found`)
  } catch (e) {
    console.log(`  ❌ Appointments: ERROR - ${e.message}`)
    dataChecks.appointments = 0
  }
  
  try {
    const { data: profiles } = await supabase.from('profiles').select('id').limit(3)
    dataChecks.users = profiles ? profiles.length : 0
    console.log(`  👥 Users: ${dataChecks.users} found`)
  } catch (e) {
    console.log(`  ❌ Users: ERROR - ${e.message}`)
    dataChecks.users = 0
  }
  
  return dataChecks
}

async function main() {
  try {
    const dbResults = await testDatabaseSchema()
    const envResults = await testEnvironmentConfig()
    const serviceResults = await testServices()
    const encryptionResult = await testEncryption()
    const dbWriteResult = await testDatabaseWrite()
    const calendarServiceResult = await testCalendarServiceInit()
    const testDataResults = await checkTestData()
    
    console.log('\n📊 FINAL ASSESSMENT:')
    console.log('==================')
    
    const allDbTables = Object.values(dbResults).every(Boolean)
    const criticalEnv = envResults['NEXT_PUBLIC_SUPABASE_URL'] && envResults['SUPABASE_SERVICE_ROLE_KEY']
    const googleConfigured = envResults['GOOGLE_CLIENT_ID'] && envResults['GOOGLE_CLIENT_SECRET'] && envResults['CALENDAR_ENCRYPTION_KEY']
    const servicesWorking = Object.values(serviceResults).every(Boolean)
    
    const readyForTesting = allDbTables && criticalEnv && servicesWorking && encryptionResult && dbWriteResult && calendarServiceResult
    const readyForProduction = readyForTesting && googleConfigured
    
    console.log(`🗄️  Database Schema: ${allDbTables ? '✅ READY' : '❌ INCOMPLETE'}`)
    console.log(`⚙️  Core Services: ${servicesWorking ? '✅ WORKING' : '❌ BROKEN'}`)
    console.log(`🔐 Encryption: ${encryptionResult ? '✅ WORKING' : '❌ BROKEN'}`)
    console.log(`📝 Database Write: ${dbWriteResult ? '✅ WORKING' : '❌ BROKEN'}`)
    console.log(`🔧 Environment: ${criticalEnv ? '✅ CONFIGURED' : '❌ MISSING'}`)
    console.log(`🌐 Google OAuth: ${googleConfigured ? '✅ CONFIGURED' : '⚠️  NOT CONFIGURED'}`)
    console.log(`📊 Test Data: ${Object.values(testDataResults).some(Boolean) ? '✅ AVAILABLE' : '⚠️  MISSING'}`)
    
    console.log(`\n🎯 OVERALL STATUS:`)
    if (readyForProduction) {
      console.log(`   ✅ PRODUCTION READY - All systems operational!`)
    } else if (readyForTesting) {
      console.log(`   🧪 TEST READY - Core infrastructure complete, needs Google OAuth for production`)
    } else {
      console.log(`   ❌ NEEDS SETUP - Critical components missing`)
    }
    
    if (!readyForProduction) {
      console.log(`\n📝 NEXT STEPS:`)
      if (!allDbTables) console.log(`   • Run database migration: database/migrations/008_add_calendar_integrations.sql`)
      if (!servicesWorking) console.log(`   • Fix service import errors (check file paths and dependencies)`)
      if (!encryptionResult || !dbWriteResult) console.log(`   • Check database permissions and encryption key configuration`)
      if (!googleConfigured) console.log(`   • Configure Google OAuth credentials in .env file`)
      if (!Object.values(testDataResults).some(Boolean)) console.log(`   • Consider creating test data for full integration testing`)
    }
    
    console.log('\n' + '='.repeat(50))
    
    // Update todo status based on test results
    if (readyForTesting) {
      console.log('\n✅ Phase 1: Core Infrastructure - COMPLETE')
      console.log('Ready to proceed to Phase 2: Production Polish')
    } else {
      console.log('\n⚠️ Phase 1: Core Infrastructure - INCOMPLETE') 
      console.log('Address issues above before proceeding')
    }
    
  } catch (error) {
    console.error('\n❌ Test script error:', error)
    process.exit(1)
  }
}

main()