#!/usr/bin/env node

/**
 * Database Table Verification Script
 * Checks which tables exist in Supabase before creating any new ones
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyTables() {
  console.log('🔍 Database Table Verification')
  console.log('=' .repeat(50))
  console.log('📦 Supabase URL:', supabaseUrl)
  console.log('')

  const tablesToCheck = [
    'appointments',
    'transactions',
    'barbershops',
    'barbershop_staff',
    'customers',
    'profiles',
    'reviews',
    'services',
    'barber_availability',
    'barber_customizations',
    'bookings',
    'payments',
    'users',
    'agents',
    'tenants',
    'notifications'
  ]

  const existingTables = []
  const missingTables = []

  console.log('Checking tables...\n')

  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0) // Don't fetch any data, just check if table exists
      
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ ${tableName.padEnd(25)} - DOES NOT EXIST`)
          missingTables.push(tableName)
        } else if (error.message.includes('permission denied')) {
          console.log(`🔒 ${tableName.padEnd(25)} - EXISTS (permission denied)`)
          existingTables.push(tableName)
        } else {
          console.log(`⚠️  ${tableName.padEnd(25)} - UNKNOWN (${error.message})`)
        }
      } else {
        console.log(`✅ ${tableName.padEnd(25)} - EXISTS`)
        existingTables.push(tableName)
      }
    } catch (err) {
      console.log(`❓ ${tableName.padEnd(25)} - ERROR (${err.message})`)
    }
  }

  console.log('\n' + '=' .repeat(50))
  console.log('📊 SUMMARY')
  console.log('=' .repeat(50))
  console.log(`\n✅ Existing Tables (${existingTables.length}):`)
  existingTables.forEach(t => console.log(`   - ${t}`))
  
  console.log(`\n❌ Missing Tables (${missingTables.length}):`)
  missingTables.forEach(t => console.log(`   - ${t}`))

  if (existingTables.includes('barbershops')) {
    console.log('\n📋 Barbershops Table Schema:')
    const { data, error } = await supabase
      .from('barbershops')
      .select('*')
      .limit(1)
    
    if (!error && data && data[0]) {
      const columns = Object.keys(data[0])
      console.log('   Columns:', columns.join(', '))
    }
  }

  console.log('\n' + '=' .repeat(50))
  console.log('🔧 RECOMMENDATIONS')
  console.log('=' .repeat(50))
  
  if (missingTables.includes('appointments')) {
    console.log('\n⚠️  APPOINTMENTS table does NOT exist and needs to be created')
    console.log('   This table is required for:')
    console.log('   - Barber reports page')
    console.log('   - Booking management')
    console.log('   - Schedule tracking')
  }

  if (missingTables.includes('transactions')) {
    console.log('\n⚠️  TRANSACTIONS table does NOT exist and needs to be created')
    console.log('   This table is required for:')
    console.log('   - Financial reporting')
    console.log('   - Commission calculations')
    console.log('   - Payment tracking')
  }

  console.log('\n🔍 Checking alternative table names...')
  const alternativeNames = [
    'appointment',
    'booking',
    'bookings',
    'reservation',
    'reservations',
    'transaction',
    'payment',
    'payments',
    'invoice',
    'invoices'
  ]

  for (const altName of alternativeNames) {
    const { error } = await supabase
      .from(altName)
      .select('*')
      .limit(0)
    
    if (!error) {
      console.log(`   ✅ Found alternative table: ${altName}`)
    }
  }

  return { existingTables, missingTables }
}

verifyTables().then(result => {
  console.log('\n✨ Verification complete!')
}).catch(err => {
  console.error('❌ Verification failed:', err)
})