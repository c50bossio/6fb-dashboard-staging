#!/usr/bin/env node

/**
 * Real-time debugging for staff save functionality
 * This script helps identify the exact failure point
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test the exact scenario that might be failing
async function debugUnnamedBarberSave() {
  try {

    // Get all staff records
    const { data: allStaff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        role,
        is_active,
        commission_rate,
        arrangement_type,
        financial_model
      `)
      .eq('is_active', true)
    
    if (staffError) {
      console.error('❌ Error fetching staff:', staffError)
      return
    }

    // Check each staff member's profile
    for (const staff of allStaff) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email, phone')
        .eq('id', staff.user_id)
        .single()
      
      const isUnnamed = !profile?.full_name || profile.full_name.trim() === ''
      const isIncomplete = !profile?.first_name && !profile?.last_name
      
      if (isUnnamed || isIncomplete) {

        // Test saving this specific record
        await testStaffSave(staff.id, staff, profile)
        break // Test only the first problematic record
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

async function testStaffSave(staffId, staffData, profileData) {

  // Simulate the exact data that would be sent from the frontend
  const testSaveData = {
    full_name: 'Test Updated Name',
    email: profileData?.email || 'test@example.com',
    phone: profileData?.phone || '',
    role: staffData.role || 'barber',
    arrangement_type: staffData.arrangement_type || staffData.financial_model || 'commission',
    commission_rate: staffData.commission_rate || 0.6,
    rent_frequency: 'monthly',
    booth_rent_amount: 0,
    hourly_rate: 0,
    is_active: true
  }

  )
  
  try {
    // Test direct database update (bypassing API)

    const { data: directUpdate, error: directError } = await supabase
      .from('barbershop_staff')
      .update({
        commission_rate: testSaveData.commission_rate,
        arrangement_type: testSaveData.arrangement_type,
        rent_frequency: testSaveData.rent_frequency
      })
      .eq('id', staffId)
      .select()
    
    if (directError) {
      console.error('❌ Direct database update failed:', directError)
      
      if (directError.code === 'PGRST301') {
         issue')
        
      }
    } else {
      
    }
    
    // Test profile update

    const { data: profileUpdate, error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: testSaveData.full_name
      })
      .eq('id', staffData.user_id)
      .select()
    
    if (profileError) {
      console.error('❌ Profile update failed:', profileError)
    } else {
      
    }
    
  } catch (error) {
    console.error('❌ Test save error:', error)
  }
}

// Provide debugging instructions for the user

')

')
')  
')
')

// Run the debugging
await debugUnnamedBarberSave()

