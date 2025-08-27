#!/usr/bin/env node

/**
 * Debug script to test staff saving functionality
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

console.log('🔍 Debugging staff saving functionality...')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugStaffSaving() {
  try {
    console.log('\n1️⃣ Checking barbershop_staff table structure...')
    
    // Get one record to check existing fields
    const { data: existingStaff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('*')
      .limit(1)
    
    if (staffError) {
      console.error('❌ Error accessing barbershop_staff table:', staffError.message)
      return
    }
    
    if (existingStaff && existingStaff.length > 0) {
      const fields = Object.keys(existingStaff[0])
      console.log('✅ Current barbershop_staff fields:')
      fields.forEach(field => {
        const hasNewField = ['arrangement_type', 'rent_frequency', 'hybrid_base_rent', 'hybrid_revenue_threshold', 'hybrid_commission_rate'].includes(field)
        console.log(`   ${hasNewField ? '🆕' : '📋'} ${field}`)
      })
      
      // Check if new fields exist
      const newFields = ['arrangement_type', 'rent_frequency', 'hybrid_base_rent', 'hybrid_revenue_threshold', 'hybrid_commission_rate']
      const missingFields = newFields.filter(field => !fields.includes(field))
      
      if (missingFields.length > 0) {
        console.log('\n❌ MISSING FIELDS (Database migration not applied):')
        missingFields.forEach(field => console.log(`   ❌ ${field}`))
        console.log('\n🔧 SOLUTION: Run the database migration!')
        console.log('   1. Go to Supabase Dashboard → SQL Editor')
        console.log('   2. Run the SQL from database/migrations/009_add_financial_arrangement_fields.sql')
        return
      } else {
        console.log('\n✅ All financial arrangement fields exist in database')
      }
    } else {
      console.log('⚠️  No staff records found to check structure')
    }
    
    console.log('\n2️⃣ Looking for "unnamed barber" record...')
    
    // Find unnamed barber record
    const { data: unnamedBarber, error: findError } = await supabase
      .from('barbershop_staff')
      .select('*')
      .or('user:profiles.full_name.is.null,user:profiles.full_name.eq.')
      .limit(5)
    
    if (findError) {
      // Try simpler query
      const { data: allStaff, error: allError } = await supabase
        .from('barbershop_staff')
        .select(`
          id,
          role,
          is_active,
          financial_model,
          commission_rate,
          user_id
        `)
        .limit(10)
      
      if (allError) {
        console.error('❌ Error querying staff records:', allError.message)
        return
      }
      
      console.log('📋 Found staff records:')
      allStaff.forEach(staff => {
        console.log(`   ID: ${staff.id}, Role: ${staff.role}, Active: ${staff.is_active}`)
      })
      
      if (allStaff.length > 0) {
        console.log('\n3️⃣ Testing update on first staff record...')
        const testStaffId = allStaff[0].id
        
        const testUpdateData = {
          commission_rate: 0.65,
          financial_model: 'commission'
        }
        
        const { data: updateResult, error: updateError } = await supabase
          .from('barbershop_staff')
          .update(testUpdateData)
          .eq('id', testStaffId)
          .select()
        
        if (updateError) {
          console.error('❌ Update failed:', updateError.message)
          console.log('💡 This confirms there is a database issue')
        } else {
          console.log('✅ Update successful:', updateResult)
        }
      }
    } else {
      console.log('Found unnamed barber records:', unnamedBarber)
    }
    
    console.log('\n4️⃣ Testing API endpoint simulation...')
    
    // Simulate what the frontend sends
    const testPayload = {
      full_name: 'Test Barber',
      commission_rate: 0.6,
      arrangement_type: 'commission',
      rent_frequency: 'monthly'
    }
    
    console.log('📤 Simulating frontend payload:', testPayload)
    
    // Test if we can make direct database call with new fields
    if (existingStaff && existingStaff.length > 0) {
      const testId = existingStaff[0].id
      
      const { data: directUpdate, error: directError } = await supabase
        .from('barbershop_staff')
        .update({ commission_rate: 0.55 })
        .eq('id', testId)
        .select()
      
      if (directError) {
        console.error('❌ Direct update failed:', directError.message)
      } else {
        console.log('✅ Direct update successful')
      }
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error.message)
  }
}

await debugStaffSaving()