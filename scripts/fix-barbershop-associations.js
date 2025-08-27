#!/usr/bin/env node

/**
 * Script to fix barbershop associations for existing users
 * This will:
 * 1. Add barbershop_id column to users table if missing
 * 2. Create barbershops for shop owners who don't have one
 * 3. Link employee barbers to their shops via barbershop_staff
 * 4. Set up proper associations based on roles
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixBarbershopAssociations() {

  try {
    // Step 1: Check if columns exist
    
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' })
    
    if (columnsError && columnsError.message.includes('function')) {
      // RPC doesn't exist, try direct query
      
    }
    
    // Step 2: Get all users
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }

    // Step 3: Process each user based on role
    let shopOwnersFixed = 0
    let barbersLinked = 0
    let enterpriseOwnersProcessed = 0
    
    for (const user of users) {
      `)
      
      if (user.role === 'SHOP_OWNER' && !user.barbershop_id) {
        // Check if they already own a barbershop
        const { data: existingShop } = await supabase
          .from('barbershops')
          .select('id, name')
          .eq('owner_id', user.id)
          .maybeSingle()
        
        if (existingShop) {
          // Update user with existing barbershop_id
          
          await supabase
            .from('users')
            .update({ barbershop_id: existingShop.id })
            .eq('id', user.id)
          shopOwnersFixed++
        } else {
          // Create new barbershop
          
          const { data: newShop, error: createError } = await supabase
            .from('barbershops')
            .insert({
              owner_id: user.id,
              name: user.shop_name || user.business_name || `${user.full_name}'s Barbershop`,
              email: user.email,
              phone: user.phone || '',
              booking_enabled: true,
              online_booking_enabled: true,
              website_enabled: true
            })
            .select()
            .single()
          
          if (newShop && !createError) {
            await supabase
              .from('users')
              .update({ barbershop_id: newShop.id })
              .eq('id', user.id)
            
            shopOwnersFixed++
          } else if (createError) {
            console.error(`  ❌ Error creating barbershop:`, createError.message)
          }
        }
      } else if (user.role === 'BARBER' && !user.barbershop_id) {
        // Employee barber - check if they're in barbershop_staff
        const { data: staffLink } = await supabase
          .from('barbershop_staff')
          .select('barbershop_id, barbershops!inner(name)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()
        
        if (staffLink) {
          
          barbersLinked++
        } else {
          // Try to find a barber record by email
          const { data: barberRecord } = await supabase
            .from('barbers')
            .select('shop_id, name')
            .eq('email', user.email)
            .maybeSingle()
          
          if (barberRecord && barberRecord.shop_id) {
            // Create staff link
            
            await supabase
              .from('barbershop_staff')
              .upsert({
                user_id: user.id,
                barbershop_id: barberRecord.shop_id,
                role: 'BARBER',
                is_active: true,
                hire_date: new Date().toISOString().split('T')[0]
              }, {
                onConflict: 'user_id,barbershop_id'
              })
            barbersLinked++
          } else {
            
          }
        }
      } else if (user.role === 'ENTERPRISE_OWNER') {
        // Check for organization
        if (user.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', user.organization_id)
            .maybeSingle()
          
          if (org) {
            
            enterpriseOwnersProcessed++
          }
        } else {
          
        }
      }
    }
    
    // Step 4: Summary
    )
    
    )

  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
  }
}

// Run the fix
fixBarbershopAssociations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })