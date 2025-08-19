#!/usr/bin/env node

/**
 * Quick fix script specifically for c50bossio@gmail.com
 * Run this with: node scripts/quick-fix-user.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixUser() {
  console.log('🔧 Fixing user c50bossio@gmail.com...\n')
  
  try {
    // Step 1: Get the user
    console.log('📊 Fetching user...')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'c50bossio@gmail.com')
      .single()
    
    if (userError) {
      console.error('❌ Error fetching user:', userError.message)
      return
    }
    
    if (!user) {
      console.error('❌ User not found!')
      return
    }
    
    console.log('✅ Found user:', {
      id: user.id,
      email: user.email,
      role: user.role,
      barbershop_id: user.barbershop_id
    })
    
    // Step 2: Update user role if needed
    if (user.role !== 'SHOP_OWNER' && user.role !== 'shop_owner') {
      console.log('\n🔄 Updating user role to SHOP_OWNER...')
      // Only update fields that exist
      // Note: role might be lowercase in the database
      const updateData = { 
        role: 'shop_owner',  // Using lowercase to match database constraint
        subscription_status: 'active'
      }
      
      // Check if onboarding fields exist before updating them
      if ('onboarding_completed' in user) {
        updateData.onboarding_completed = false
      }
      if ('onboarding_step' in user) {
        updateData.onboarding_step = 0
      }
      
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
      
      if (updateError) {
        console.error('❌ Error updating user role:', updateError.message)
        return
      }
      console.log('✅ User role updated to SHOP_OWNER')
    }
    
    // Step 3: Check for existing barbershop
    console.log('\n🏪 Checking for existing barbershop...')
    const { data: existingShop, error: shopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()
    
    if (shopError && shopError.code !== 'PGRST116') {
      console.error('❌ Error checking barbershop:', shopError.message)
      return
    }
    
    let barbershopId = existingShop?.id
    
    // Step 4: Create barbershop if needed
    if (!existingShop) {
      console.log('📝 Creating new barbershop...')
      const { data: newShop, error: createError } = await supabase
        .from('barbershops')
        .insert({
          owner_id: user.id,
          name: user.shop_name || user.business_name || user.full_name ? `${user.full_name}'s Barbershop` : 'My Barbershop',
          email: user.email,
          phone: user.phone || '',
          booking_enabled: true,
          online_booking_enabled: true,
          website_enabled: true
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating barbershop:', createError.message)
        return
      }
      
      barbershopId = newShop.id
      console.log('✅ Barbershop created:', {
        id: newShop.id,
        name: newShop.name
      })
    } else {
      console.log('✅ Found existing barbershop:', {
        id: existingShop.id,
        name: existingShop.name
      })
    }
    
    // Step 5: Update user with barbershop_id if needed
    if (!user.barbershop_id && barbershopId) {
      console.log('\n🔗 Linking barbershop to user...')
      const { error: linkError } = await supabase
        .from('users')
        .update({ barbershop_id: barbershopId })
        .eq('id', user.id)
      
      if (linkError) {
        console.error('❌ Error linking barbershop:', linkError.message)
        return
      }
      console.log('✅ Barbershop linked to user')
    }
    
    // Step 6: Final verification
    console.log('\n📊 Final verification...')
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select(`
        *,
        barbershops!barbershop_id (
          id,
          name,
          slug
        )
      `)
      .eq('email', 'c50bossio@gmail.com')
      .single()
    
    if (finalError) {
      // Try without the join
      const { data: simpleUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'c50bossio@gmail.com')
        .single()
      
      console.log('\n✨ User fixed successfully!')
      console.log('Final state:', {
        id: simpleUser.id,
        email: simpleUser.email,
        role: simpleUser.role,
        barbershop_id: simpleUser.barbershop_id,
        subscription_status: simpleUser.subscription_status,
        onboarding_completed: simpleUser.onboarding_completed
      })
    } else {
      console.log('\n✨ User fixed successfully!')
      console.log('Final state:', {
        id: finalUser.id,
        email: finalUser.email,
        role: finalUser.role,
        barbershop_id: finalUser.barbershop_id,
        barbershop_name: finalUser.barbershops?.name,
        subscription_status: finalUser.subscription_status,
        onboarding_completed: finalUser.onboarding_completed
      })
    }
    
    console.log('\n✅ All done! You can now log in and access the dashboard.')
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
  }
}

// Run the fix
fixUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })