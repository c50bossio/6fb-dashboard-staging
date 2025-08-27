#!/usr/bin/env node

// Script to ensure Chris Bossio user exists with proper name fields
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setChrisBossioName() {

  try {
    // First check if user exists
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'c50bossio@gmail.com')
    
    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError)
      return
    }
    
    if (!users || users.length === 0) {

      // Create the user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'c50bossio@gmail.com',
          full_name: 'Chris Bossio',
          role: 'owner',
          subscription_tier: 'premium'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating user:', createError)
        return
      }

    } else {
      const user = users[0]

      // Update only the full_name field (database doesn't have first_name/last_name columns yet)
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          full_name: 'Chris Bossio'
        })
        .eq('id', user.id)
        .select()
        .single()
      
      if (updateError) {
        console.error('❌ Error updating user:', updateError)
        return
      }

    }
    
    // Also check profiles table (if it exists separately)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'c50bossio@gmail.com')
    
    if (!profileError && profiles && profiles.length > 0) {
      const profile = profiles[0]

      // Update profile as well (only full_name field)
      const { data: updatedProfile, error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          full_name: 'Chris Bossio'
        })
        .eq('id', profile.id)
        .select()
        .single()
      
      if (updateProfileError) {
        :', updateProfileError.message)
      } else {
        
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
setChrisBossioName()