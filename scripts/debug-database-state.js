#!/usr/bin/env node
/**
 * Debug the current database state to understand why user-locations service returns 0 locations
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function debugDatabaseState() {
  console.log('🔍 Debugging Current Database State')
  console.log('==================================\n')

  const userId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
  const userEmail = 'c50bossio@gmail.com'

  try {
    // 1. Check user profile
    console.log('1. Checking user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id, shop_id, barbershop_id')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.log('❌ Profile error:', profileError.message)
      return
    }

    console.log('✅ Profile:', {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      organization_id: profile.organization_id,
      shop_id: profile.shop_id,
      barbershop_id: profile.barbershop_id
    })

    // 2. Check barbershops owned directly
    console.log('\n2. Checking barbershops owned directly...')
    const { data: ownedShops, error: ownedError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, is_active, organization_id')
      .eq('owner_id', userId)

    if (ownedError) {
      console.log('❌ Owned shops error:', ownedError.message)
    } else {
      console.log(`✅ Found ${ownedShops.length} directly owned shops:`)
      ownedShops.forEach(shop => {
        console.log(`   - ${shop.name} (${shop.id}) - Active: ${shop.is_active}, Org: ${shop.organization_id}`)
      })
    }

    // 3. Check barbershops in organization
    if (profile.organization_id) {
      console.log('\n3. Checking barbershops in organization...')
      const { data: orgShops, error: orgError } = await supabase
        .from('barbershops')
        .select('id, name, owner_id, is_active, organization_id')
        .eq('organization_id', profile.organization_id)

      if (orgError) {
        console.log('❌ Org shops error:', orgError.message)
      } else {
        console.log(`✅ Found ${orgShops.length} shops in organization ${profile.organization_id}:`)
        orgShops.forEach(shop => {
          console.log(`   - ${shop.name} (${shop.id}) - Owner: ${shop.owner_id}, Active: ${shop.is_active}`)
        })
      }
    }

    // 4. Check specific Tomb45 Channelside barbershop
    console.log('\n4. Checking specific Tomb45 Channelside barbershop...')
    const tomb45Id = 'c5a58548-8f23-426c-bedc-49a83d238724'
    const { data: tomb45, error: tomb45Error } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', tomb45Id)
      .single()

    if (tomb45Error) {
      console.log('❌ Tomb45 error:', tomb45Error.message)
    } else {
      console.log('✅ Tomb45 Channelside details:')
      console.log('   - ID:', tomb45.id)
      console.log('   - Name:', tomb45.name)
      console.log('   - Owner ID:', tomb45.owner_id)
      console.log('   - Organization ID:', tomb45.organization_id)
      console.log('   - is_active:', tomb45.is_active)
      console.log('   - Created:', tomb45.created_at)
    }

    // 5. Check if user should have access based on our logic
    console.log('\n5. Access Analysis:')
    console.log('========================')
    
    if (profile.role === 'ENTERPRISE_OWNER') {
      console.log('✓ User is ENTERPRISE_OWNER')
      
      // Direct ownership check
      const isDirectOwner = ownedShops && ownedShops.some(shop => shop.id === tomb45Id)
      console.log(`- Direct owner of Tomb45: ${isDirectOwner}`)
      
      // Organization access check
      if (profile.organization_id && tomb45.organization_id) {
        const hasOrgAccess = profile.organization_id === tomb45.organization_id
        console.log(`- Organization access: ${hasOrgAccess} (user org: ${profile.organization_id}, shop org: ${tomb45.organization_id})`)
      }
      
      // Profile fallback checks
      const profileBarbershopMatch = profile.barbershop_id === tomb45Id
      const profileShopMatch = profile.shop_id === tomb45Id
      console.log(`- Profile barbershop_id match: ${profileBarbershopMatch}`)
      console.log(`- Profile shop_id match: ${profileShopMatch}`)
    }

    console.log('\n🎯 CONCLUSION:')
    if (profile.role === 'ENTERPRISE_OWNER' && tomb45) {
      const shouldHaveAccess = 
        (ownedShops && ownedShops.some(shop => shop.id === tomb45Id)) ||
        (profile.organization_id === tomb45.organization_id) ||
        (profile.barbershop_id === tomb45Id) ||
        (profile.shop_id === tomb45Id)
      
      console.log(`User SHOULD have access: ${shouldHaveAccess}`)
      console.log('If the user-locations service returns 0 locations, there is a bug in the service logic.')
    }

  } catch (error) {
    console.error('💥 Error:', error.message)
    console.error(error.stack)
  }
}

debugDatabaseState().catch(console.error)