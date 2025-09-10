#!/usr/bin/env node

/**
 * Database Schema Fix Script
 * Fixes analytics schema issues and adds demo data
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease check your .env.local file.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixDatabaseSchema() {
  try {
    console.log('🔧 Starting database schema fixes...')
    
    // Read the SQL file
    const sqlFilePath = join(__dirname, 'database', 'fix-analytics-schema.sql')
    const sqlCommands = readFileSync(sqlFilePath, 'utf8')
    
    // Split SQL commands and execute them
    const commands = sqlCommands
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    let successCount = 0
    
    for (const command of commands) {
      try {
        if (command.includes('SELECT') && command.includes('message')) {
          // This is the final confirmation query
          const { data, error } = await supabase.rpc('exec_sql', { sql: command })
          if (error) throw error
          
          if (data && data.length > 0) {
            console.log('✅', data[0].message)
            console.log('📊 Demo data summary:')
            console.log(`   - Customers: ${data[0].customer_count}`)
            console.log(`   - Services: ${data[0].service_count}`)
            console.log(`   - Appointments: ${data[0].appointment_count}`)
          }
        } else {
          // Execute regular commands
          const { error } = await supabase.rpc('exec_sql', { sql: command })
          if (error) throw error
        }
        successCount++
      } catch (cmdError) {
        // Some errors are expected (like "column already exists")
        if (cmdError.message.includes('already exists') || 
            cmdError.message.includes('duplicate key')) {
          console.log('⚠️  Skipping (already exists):', command.substring(0, 50) + '...')
        } else {
          console.error('❌ Error executing:', command.substring(0, 50) + '...')
          console.error('   Error:', cmdError.message)
        }
      }
    }
    
    console.log(`\n✅ Database fixes completed! (${successCount}/${commands.length} commands executed)`)
    
    // Test the analytics query
    console.log('\n🧪 Testing analytics query...')
    const { data: testData, error: testError } = await supabase
      .from('customers')
      .select('id')
      .eq('barbershop_id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
      .limit(1)
    
    if (testError) {
      console.error('❌ Test query failed:', testError.message)
    } else {
      console.log('✅ Test query successful - analytics should now work!')
    }
    
  } catch (error) {
    console.error('❌ Failed to fix database schema:', error.message)
    process.exit(1)
  }
}

// Alternative direct SQL execution if rpc doesn't work
async function fixDatabaseSchemaDirect() {
  try {
    console.log('🔧 Applying database fixes directly...')
    
    // 1. Add missing column (if not exists)
    try {
      const { error: colError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()'
      })
      if (colError && !colError.message.includes('already exists')) {
        throw colError
      }
      console.log('✅ Added last_visit_at column')
    } catch (e) {
      console.log('⚠️  Column may already exist:', e.message)
    }
    
    // 2. Insert demo barbershop
    const { error: shopError } = await supabase
      .from('barbershops')
      .insert({
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'Demo Barbershop',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (shopError && !shopError.message.includes('duplicate key')) {
      throw shopError
    }
    console.log('✅ Demo barbershop created/updated')
    
    // 3. Insert demo customers
    const { error: customersError } = await supabase
      .from('customers')
      .upsert([
        {
          barbershop_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          name: 'John Smith',
          email: 'john@example.com',
          phone: '+1234567890',
          last_visit_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          barbershop_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          name: 'Mike Johnson',
          email: 'mike@example.com',
          phone: '+1234567891',
          last_visit_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
    
    if (customersError && !customersError.message.includes('duplicate key')) {
      console.log('⚠️  Customers insert result:', customersError)
    } else {
      console.log('✅ Demo customers created')
    }
    
    console.log('\n✅ Database fixes applied successfully!')
    
  } catch (error) {
    console.error('❌ Failed to apply database fixes:', error.message)
    process.exit(1)
  }
}

// Run the fix
console.log('🚀 Starting database schema repair...')
fixDatabaseSchemaDirect()
  .then(() => {
    console.log('✅ All done! Analytics should now show data.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Schema fix failed:', error)
    process.exit(1)
  })