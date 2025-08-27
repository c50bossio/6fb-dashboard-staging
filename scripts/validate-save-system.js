#!/usr/bin/env node

/**
 * Comprehensive validation of the staff save system
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function validateSaveSystem() {
  try {
    
    const { data: connectionTest, error: connectionError } = await supabase
      .from('barbershop_staff')
      .select('count', { count: 'exact' })
    
    if (connectionError) {
      console.error('❌ Supabase connection failed:', connectionError.message)
      return
    }

    const apiRoutePath = path.join(__dirname, '..', 'app', 'api', 'staff', '[staffId]', 'route.js')
    if (!fs.existsSync(apiRoutePath)) {
      console.error('❌ API route file missing:', apiRoutePath)
      return
    }

    const utilsPath = path.join(__dirname, '..', 'lib', 'financial-display-utils.js')
    if (!fs.existsSync(utilsPath)) {
      console.error('❌ Financial utils file missing:', utilsPath)
      return
    }

    const { data: schemaTest, error: schemaError } = await supabase
      .from('barbershop_staff')
      .select('id, arrangement_type, rent_frequency, commission_rate')
      .limit(1)
    
    if (schemaError) {
      console.error('❌ Schema validation failed:', schemaError.message)
      
      return
    }

    ...')
    
    // Get profile data separately to find unnamed barbers
    const { data: allStaff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('id, user_id, role, is_active')
      .eq('is_active', true)
      .limit(10)
    
    if (staffError) {
      console.error('❌ Error fetching staff:', staffError.message)
      return
    }
    
    // Check profiles for each staff member
    let unnamedBarber = null
    for (const staff of allStaff) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', staff.user_id)
        .single()
      
      if (!profileError && (!profile.full_name || profile.full_name.trim() === '')) {
        unnamedBarber = { ...staff, profile }
        break
      }
    }
    
    if (!unnamedBarber) {
      
      unnamedBarber = allStaff[0]
    } else {
      
    }

    const testUpdate = {
      commission_rate: Math.random() * 0.5 + 0.5, // Random between 0.5-1.0
      arrangement_type: 'commission',
      rent_frequency: 'monthly'
    }
    
    const { data: updateResult, error: updateError } = await supabase
      .from('barbershop_staff')
      .update(testUpdate)
      .eq('id', unnamedBarber.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Update test failed:', updateError.message)
      
      // Check if it's a permissions issue
      if (updateError.code === 'PGRST301') {
         may be blocking the update')
        
      }
      return
    }

    if (unnamedBarber.user_id) {
      const { data: profileUpdate, error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: 'Test Updated Name' })
        .eq('id', unnamedBarber.user_id)
        .select()
      
      if (profileError) {
        :', profileError.message)
      } else {
        
      }
    }

  } catch (error) {
    console.error('❌ Validation error:', error.message)
  }
}

await validateSaveSystem()