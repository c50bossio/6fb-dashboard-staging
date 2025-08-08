#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import { createInterface } from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
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

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Interactive confirmation
function askConfirmation(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase().trim())
    })
  })
}

async function cleanupTestData() {
  try {
    console.log('🗑️  6FB AI Agent System - Test Data Cleanup')
    console.log('==========================================\n')
    
    // Step 1: Show what will be deleted
    console.log('📊 Checking existing test data...\n')
    
    const tables = ['appointments', 'clients', 'services', 'barbers', 'barbershops']
    const counts = {}
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`   📋 ${table}: Could not count (${error.message})`)
        counts[table] = 0
      } else {
        console.log(`   📋 ${table}: ${count || 0} records`)
        counts[table] = count || 0
      }
    }
    
    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0)
    
    if (totalRecords === 0) {
      console.log('\n✅ No test data found to clean up.')
      return
    }
    
    console.log(`\n📊 Total records to delete: ${totalRecords}`)
    console.log('\n⚠️  WARNING: This will permanently delete all data in the following tables:')
    tables.forEach(table => {
      if (counts[table] > 0) {
        console.log(`   • ${table}: ${counts[table]} records`)
      }
    })
    
    // Step 2: Confirmation
    console.log('\n🚨 THIS ACTION CANNOT BE UNDONE!')
    const confirmation = await askConfirmation('\nAre you sure you want to delete ALL test data? (yes/no): ')
    
    if (confirmation !== 'yes' && confirmation !== 'y') {
      console.log('\n❌ Cleanup cancelled.')
      return
    }
    
    const doubleConfirm = await askConfirmation('\nDouble confirmation - type "DELETE" to proceed: ')
    
    if (doubleConfirm !== 'delete') {
      console.log('\n❌ Cleanup cancelled.')
      return
    }
    
    // Step 3: Delete data in reverse order (to respect foreign key constraints)
    console.log('\n🗑️  Starting cleanup...\n')
    
    const deleteOrder = ['appointment_history', 'barber_availability', 'booking_preferences', 'appointments', 'clients', 'services', 'barbers', 'barbershops']
    
    for (const table of deleteOrder) {
      try {
        console.log(`⚡ Deleting from ${table}...`)
        
        const { count, error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using impossible condition to delete all)
        
        if (error) {
          // Try alternative deletion method
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .gte('created_at', '1900-01-01') // Delete all records created after 1900
          
          if (deleteError) {
            console.log(`   └─ ⚠️  Could not delete from ${table}: ${deleteError.message}`)
          } else {
            console.log(`   └─ ✅ Deleted from ${table}`)
          }
        } else {
          console.log(`   └─ ✅ Deleted from ${table}`)
        }
        
      } catch (err) {
        console.log(`   └─ ⚠️  Error deleting from ${table}: ${err.message}`)
      }
    }
    
    // Step 4: Verify cleanup
    console.log('\n🔍 Verifying cleanup...\n')
    
    let remainingRecords = 0
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        const remaining = count || 0
        remainingRecords += remaining
        if (remaining > 0) {
          console.log(`   📋 ${table}: ${remaining} records remaining`)
        } else {
          console.log(`   📋 ${table}: ✅ Clean`)
        }
      }
    }
    
    // Step 5: Summary
    console.log('\n🎉 Cleanup completed!')
    console.log('===================')
    
    if (remainingRecords === 0) {
      console.log('✅ All test data has been successfully removed.')
      console.log('🚀 Your database is now clean and ready for fresh data.')
    } else {
      console.log(`⚠️  ${remainingRecords} records could not be deleted.`)
      console.log('   This might be due to foreign key constraints or permissions.')
      console.log('   You may need to run this script again or manually clean up.')
    }
    
    console.log('\n📝 Next steps:')
    console.log('1. Create fresh test data: node scripts/create-test-data.js')
    console.log('2. Set up the database: node scripts/setup-database.js')
    console.log('3. Test your calendar: http://localhost:9999/dashboard/calendar\n')
    
  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error)
    process.exit(1)
  }
}

// Alternative: Selective cleanup functions
async function cleanupAppointmentsOnly() {
  console.log('🗑️  Cleaning up appointments only...')
  
  const { error } = await supabase
    .from('appointments')
    .delete()
    .gte('created_at', '1900-01-01')
  
  if (error) {
    console.error('Error cleaning appointments:', error)
  } else {
    console.log('✅ Appointments cleaned successfully')
  }
}

async function cleanupOldAppointments(daysOld = 30) {
  console.log(`🗑️  Cleaning up appointments older than ${daysOld} days...`)
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)
  
  const { error } = await supabase
    .from('appointments')
    .delete()
    .lt('scheduled_at', cutoffDate.toISOString())
  
  if (error) {
    console.error('Error cleaning old appointments:', error)
  } else {
    console.log('✅ Old appointments cleaned successfully')
  }
}

// Command line argument handling
const args = process.argv.slice(2)
const command = args[0]

if (command === 'appointments-only') {
  cleanupAppointmentsOnly().catch(console.error)
} else if (command === 'old-appointments') {
  const days = parseInt(args[1]) || 30
  cleanupOldAppointments(days).catch(console.error)
} else if (import.meta.url === `file://${process.argv[1]}`) {
  // Run full cleanup if called directly without arguments
  cleanupTestData().catch(console.error)
}

export { cleanupTestData, cleanupAppointmentsOnly, cleanupOldAppointments }
export default cleanupTestData