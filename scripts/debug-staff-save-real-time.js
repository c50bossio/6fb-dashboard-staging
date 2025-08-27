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

console.log('🔍 Real-time Staff Save Debugging')
console.log('=================================')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test the exact scenario that might be failing
async function debugUnnamedBarberSave() {
  try {
    console.log('\n1️⃣ Finding unnamed/incomplete staff records...')
    
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
    
    console.log(`📊 Found ${allStaff.length} active staff members`)
    
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
        console.log(`\n🎯 Found problematic record: ${staff.id}`)
        console.log(`   Staff Role: ${staff.role}`)
        console.log(`   Profile Name: "${profile?.full_name || ''}"`)
        console.log(`   First Name: "${profile?.first_name || ''}"`)
        console.log(`   Last Name: "${profile?.last_name || ''}"`)
        console.log(`   Commission Rate: ${staff.commission_rate}`)
        
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
  console.log(`\n2️⃣ Testing save functionality for staff ID: ${staffId}`)
  
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
  
  console.log('📤 Test save payload:')
  console.log(JSON.stringify(testSaveData, null, 2))
  
  try {
    // Test direct database update (bypassing API)
    console.log('\n3️⃣ Testing direct database update...')
    
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
        console.log('💡 This is likely a Row Level Security (RLS) issue')
        console.log('   The update requires proper user authentication context')
      }
    } else {
      console.log('✅ Direct database update successful!')
    }
    
    // Test profile update
    console.log('\n4️⃣ Testing profile update...')
    
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
      console.log('✅ Profile update successful!')
    }
    
  } catch (error) {
    console.error('❌ Test save error:', error)
  }
}

// Provide debugging instructions for the user
console.log('\n📋 DEBUGGING INSTRUCTIONS FOR BROWSER:')
console.log('=====================================')
console.log('\nTo debug the frontend save issue:')
console.log('\n1. 🌐 Open: http://localhost:9999')
console.log('2. 🔧 Open Dev Tools (F12)')
console.log('3. 📋 Go to Console tab')
console.log('4. 🧑‍💼 Navigate to Staff Management')
console.log('5. ✏️  Try to edit and save the unnamed barber')
console.log('\n👀 Watch for these specific errors:')
console.log('   • Authentication errors (401)')
console.log('   • Validation errors (400)')  
console.log('   • Network errors (failed requests)')
console.log('   • JavaScript errors (red text in console)')
console.log('\n📝 Copy any error messages and report back!')

// Run the debugging
await debugUnnamedBarberSave()

console.log('\n🎯 Next: Please test the frontend and report any errors you see!')