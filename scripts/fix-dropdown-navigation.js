#!/usr/bin/env node

/**
 * Fix Dropdown Navigation Issues
 * This script diagnoses and fixes the dropdown navigation that's not working
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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseAndFix() {

  try {
    // Step 1: Check for authenticated user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
      return
    }

    // Step 2: Check barbershops table
    const { data: barbershops, error: barbershopsError } = await supabase
      .from('barbershops')
      .select('*')
    
    if (barbershopsError) {
      console.error('❌ Error fetching barbershops:', barbershopsError.message)
      return
    }

    // Step 3: If no barbershops exist, create a demo one
    if (!barbershops || barbershops.length === 0) {

      const { data: newBarbershop, error: createError } = await supabase
        .from('barbershops')
        .insert([
          {
            name: '6FB Premium Barbershop',
            address: '123 Main Street, Suite 100',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90001',
            phone: '(555) 123-4567',
            email: 'info@6fbbarbershop.com',
            website: 'https://6fbbarbershop.com',
            description: 'Premium barbershop delivering Six Figure Barber excellence',
            business_hours: JSON.stringify({
              monday: { open: '09:00', close: '18:00', enabled: true },
              tuesday: { open: '09:00', close: '18:00', enabled: true },
              wednesday: { open: '09:00', close: '18:00', enabled: true },
              thursday: { open: '09:00', close: '18:00', enabled: true },
              friday: { open: '09:00', close: '20:00', enabled: true },
              saturday: { open: '10:00', close: '16:00', enabled: true },
              sunday: { open: '10:00', close: '14:00', enabled: false }
            }),
            settings: JSON.stringify({
              appointment_duration: 60,
              buffer_time: 15,
              advance_booking_days: 30,
              cancellation_hours: 24,
              enable_online_booking: true,
              enable_walk_ins: false
            }),
            owner_id: users[0]?.id // Assign to first user
          }
        ])
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating barbershop:', createError.message)
        return
      }

      // Update the user's profile to be a SHOP_OWNER with this barbershop
      if (users[0]?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            role: 'SHOP_OWNER',
            barbershop_id: newBarbershop.id,
            barbershop_id: newBarbershop.id
          })
          .eq('id', users[0].id)
        
        if (profileError) {
          console.error('⚠️  Warning: Could not update user profile:', profileError.message)
        } else {
          
        }
      }
    }
    
    // Step 4: Check user profiles and their associations

    for (const user of users.slice(0, 5)) { // Check first 5 users
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {

        // Check staff associations
        const { data: staffData } = await supabase
          .from('barbershop_staff')
          .select('barbershop_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true)
        
        if (staffData && staffData.length > 0) {
          
        }
        
        // Fix missing associations for SHOP_OWNERs
        if (profile.role === 'SHOP_OWNER' && !profile.barbershop_id && !profile.barbershop_id && barbershops?.[0]) {

          await supabase
            .from('profiles')
            .update({ 
              barbershop_id: barbershops[0].id,
              barbershop_id: barbershops[0].id
            })
            .eq('id', user.id)

        }
      }
      
    }
    
    // Step 5: Check for multi-location setup

    if (barbershops && barbershops.length > 1) {
      `)
      
    } else {

      // Create additional demo locations for testing multi-location
      if (barbershops?.length === 1) {

        const additionalLocations = [
          {
            name: '6FB Beverly Hills',
            address: '456 Rodeo Drive',
            city: 'Beverly Hills',
            state: 'CA',
            zipCode: '90210',
            phone: '(555) 234-5678',
            email: 'beverlyhills@6fbbarbershop.com'
          },
          {
            name: '6FB Manhattan Beach',
            address: '789 Beach Boulevard',
            city: 'Manhattan Beach',
            state: 'CA',
            zipCode: '90266',
            phone: '(555) 345-6789',
            email: 'manhattan@6fbbarbershop.com'
          }
        ]
        
        for (const location of additionalLocations) {
          const { error } = await supabase
            .from('barbershops')
            .insert({
              ...location,
              owner_id: barbershops[0].owner_id,
              website: 'https://6fbbarbershop.com',
              description: 'Premium barbershop location',
              business_hours: barbershops[0].business_hours,
              settings: barbershops[0].settings
            })
          
          if (!error) {
            
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

// Run the diagnosis and fix
diagnoseAndFix()