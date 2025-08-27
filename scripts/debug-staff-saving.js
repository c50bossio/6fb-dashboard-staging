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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugStaffSaving() {
  try {

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
      
      fields.forEach(field => {
        const hasNewField = ['arrangement_type', 'rent_frequency', 'hybrid_base_rent', 'hybrid_revenue_threshold', 'hybrid_commission_rate'].includes(field)
        
      })
      
      // Check if new fields exist
      const newFields = ['arrangement_type', 'rent_frequency', 'hybrid_base_rent', 'hybrid_revenue_threshold', 'hybrid_commission_rate']
      const missingFields = newFields.filter(field => !fields.includes(field))
      
      if (missingFields.length > 0) {
        :')
        missingFields.forEach(field => )

        return
      } else {
        
      }
    } else {
      
    }

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

      allStaff.forEach(staff => {
        
      })
      
      if (allStaff.length > 0) {
        
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
          
        } else {
          
        }
      }
    } else {
      
    }

    // Simulate what the frontend sends
    const testPayload = {
      full_name: 'Test Barber',
      commission_rate: 0.6,
      arrangement_type: 'commission',
      rent_frequency: 'monthly'
    }

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
        
      }
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error.message)
  }
}

await debugStaffSaving()