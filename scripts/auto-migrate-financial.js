#!/usr/bin/env node

/**
 * Automated Financial Fields Migration using Supabase REST API
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🚀 Attempting automated financial fields migration...')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addFieldsDirectly() {
  try {
    console.log('🔍 Checking current table structure...')
    
    // Test if new fields already exist
    const { data: testFields, error: testError } = await supabase
      .from('barbershop_staff')
      .select('id, arrangement_type, rent_frequency, hybrid_base_rent')
      .limit(1)
    
    if (!testError) {
      console.log('✅ Financial arrangement fields already exist!')
      console.log('📋 Migration has already been completed.')
      console.log('\n🎉 CRUD functionality should now work properly!')
      return true
    }
    
    console.log('📝 New fields not detected, attempting to add them...')
    
    // Since we can't run DDL directly through the client, we'll create a workaround
    // by attempting to insert a record that would fail without the fields
    console.log('⚠️  Cannot execute DDL statements through Supabase client.')
    console.log('🔧 The database schema needs to be updated manually.')
    
    return false
    
  } catch (error) {
    console.error('❌ Error during migration check:', error.message)
    return false
  }
}

const migrationSuccess = await addFieldsDirectly()

if (!migrationSuccess) {
  console.log('\n📋 NEXT STEPS TO COMPLETE MIGRATION:')
  console.log('\n1. 🌐 Go to your Supabase Dashboard:')
  console.log('   https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee')
  
  console.log('\n2. 🔧 Navigate to SQL Editor (left sidebar)')
  
  console.log('\n3. 📝 Create a new query and paste this SQL:')
  console.log('\n   -- Add financial arrangement fields')
  console.log('   ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS arrangement_type VARCHAR(50) DEFAULT \'commission\';')
  console.log('   ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS rent_frequency VARCHAR(20) DEFAULT \'monthly\';')
  console.log('   ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS hybrid_base_rent DECIMAL(8,2);')
  console.log('   ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS hybrid_revenue_threshold DECIMAL(10,2);')
  console.log('   ALTER TABLE barbershop_staff ADD COLUMN IF NOT EXISTS hybrid_commission_rate DECIMAL(5,4);')
  
  console.log('\n4. ▶️  Click "Run" to execute')
  
  console.log('\n5. ✅ After running, test the staff management UI - saving should work!')
  
  console.log('\n💡 Alternative: If you have database admin access, you can also:')
  console.log('   - Use a PostgreSQL client like pgAdmin or psql')
  console.log('   - Connect directly to your Supabase database')
  console.log('   - Run the full migration SQL from 009_add_financial_arrangement_fields.sql')
}