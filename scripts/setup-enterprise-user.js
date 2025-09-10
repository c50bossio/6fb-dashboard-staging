#!/usr/bin/env node

/**
 * Setup Enterprise User Script
 * Creates organization structure for c50bossio@gmail.com
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupEnterpriseUser() {
  console.log('🚀 Setting up enterprise user: c50bossio@gmail.com')
  
  try {
    // 1. Find the user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) throw new Error(`Failed to list users: ${userError.message}`)
    
    const enterpriseUser = users.users.find(user => user.email === 'c50bossio@gmail.com')
    if (!enterpriseUser) {
      throw new Error('User c50bossio@gmail.com not found')
    }
    
    const userId = enterpriseUser.id
    console.log('✓ Found user:', userId)
    
    // 2. Create or update organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert({
        name: '6FB Enterprise',
        description: 'Enterprise-level barbershop management organization',
        owner_id: userId,
        settings: {
          tier: 'ENTERPRISE',
          contextSystem: 'enabled',
          multiLocation: true,
          autoCreated: false
        }
      }, {
        onConflict: 'name,owner_id',
        ignoreDuplicates: false
      })
      .select()
      .single()
    
    if (orgError) {
      console.log('Organization might exist, trying to fetch...')
      const { data: existingOrg, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', '6FB Enterprise')
        .eq('owner_id', userId)
        .single()
      
      if (fetchError) throw new Error(`Failed to create/find organization: ${orgError.message}`)
      console.log('✓ Using existing organization:', existingOrg.id)
      var organizationId = existingOrg.id
    } else {
      console.log('✓ Created/Updated organization:', org.id)
      var organizationId = org.id
    }
    
    // 3. Update user profile with organization and role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        organization_id: organizationId,
        role: 'ENTERPRISE_OWNER',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (profileError) {
      console.warn('⚠️ Could not update user profile:', profileError.message)
    } else {
      console.log('✓ Updated user profile with organization and role')
    }
    
    // 4. Create organization membership
    try {
      const { error: memberError } = await supabase
        .from('organization_members')
        .upsert({
          organization_id: organizationId,
          user_id: userId,
          role: 'OWNER',
          permissions: ['all'],
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,user_id'
        })
      
      if (memberError) {
        console.warn('⚠️ Could not create organization membership:', memberError.message)
      } else {
        console.log('✓ Created organization membership')
      }
    } catch (err) {
      console.warn('⚠️ Organization membership table may not exist:', err.message)
    }
    
    // 5. Create user context preferences
    try {
      const { error: prefError } = await supabase
        .from('user_context_preferences')
        .upsert({
          user_id: userId,
          default_context_level: 'organization',
          auto_switch: true,
          preferences: {
            showContextBanner: true,
            rememberLastContext: true,
            autoElevateToOrg: true
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
      
      if (prefError) {
        console.warn('⚠️ Could not create context preferences:', prefError.message)
      } else {
        console.log('✓ Created user context preferences')
      }
    } catch (err) {
      console.warn('⚠️ User context preferences table may not exist:', err.message)
    }
    
    // 7. Find user's barbershop(s) for verification
    const { data: userBarbershops } = await supabase
      .from('barbershops')
      .select('*')
      .eq('owner_id', userId)

    // 8. Verify setup
    console.log('\n🔍 VERIFYING SETUP:')
    
    const { data: verifyOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    
    const { data: verifyProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    const { data: verifyPrefs } = await supabase
      .from('user_context_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    console.log('User ID:', userId)
    console.log('Organization ID:', organizationId)
    console.log('Organization exists:', !!verifyOrg)
    console.log('Organization name:', verifyOrg?.name)
    console.log('User barbershops found:', userBarbershops?.length || 0)
    console.log('User role:', verifyProfile?.role)
    console.log('User organization_id:', verifyProfile?.organization_id)
    console.log('Context preferences exist:', !!verifyPrefs)
    
    console.log('\n🎉 SETUP COMPLETE!')
    console.log('The context system should now be visible for c50bossio@gmail.com')
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    process.exit(1)
  }
}

// Run the setup
setupEnterpriseUser()