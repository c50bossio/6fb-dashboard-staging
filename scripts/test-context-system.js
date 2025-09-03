#!/usr/bin/env node

/**
 * Test Context System
 * Verifies that the UnifiedContextProvider works correctly with the database setup
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Mock the UnifiedContextProvider logic
const CONTEXT_LEVELS = {
  ORGANIZATION: 'ORGANIZATION',
  LOCATION: 'LOCATION', 
  RESOURCE: 'RESOURCE'
}

const CONTEXT_PERMISSIONS = {
  ENTERPRISE_OWNER: [CONTEXT_LEVELS.ORGANIZATION, CONTEXT_LEVELS.LOCATION, CONTEXT_LEVELS.RESOURCE],
  SHOP_OWNER: [CONTEXT_LEVELS.LOCATION, CONTEXT_LEVELS.RESOURCE],
  BARBER: [CONTEXT_LEVELS.RESOURCE]
}

async function testContextSystem() {
  console.log('🧪 Testing Context System for c50bossio@gmail.com')
  
  try {
    // 1. Get user data
    const { data: users } = await supabase.auth.admin.listUsers()
    const enterpriseUser = users.users.find(user => user.email === 'c50bossio@gmail.com')
    
    if (!enterpriseUser) {
      console.log('❌ User c50bossio@gmail.com not found')
      return false
    }
    
    const userId = enterpriseUser.id
    console.log('✓ Found user:', userId)
    
    // 2. Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (!profile) {
      console.log('❌ Profile not found for user')
      return false
    }
    
    console.log('✓ Profile found:', {
      role: profile.role,
      organization_id: profile.organization_id,
      shop_id: profile.shop_id
    })
    
    const userRole = profile.role || 'CLIENT'
    const permittedLevels = CONTEXT_PERMISSIONS[userRole] || []
    
    console.log('✓ User role:', userRole)
    console.log('✓ Permitted levels:', permittedLevels)
    
    // 3. Test context loading logic (mimicking UnifiedContextProvider)
    const contexts = []
    
    // Organization level contexts
    if (permittedLevels.includes(CONTEXT_LEVELS.ORGANIZATION)) {
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, name, description')
        .eq('owner_id', userId)

      console.log('✓ Organizations found:', organizations?.length || 0)
      
      if (organizations?.length > 0) {
        organizations.forEach(org => {
          contexts.push({
            level: CONTEXT_LEVELS.ORGANIZATION,
            organizationId: org.id,
            displayName: org.name,
            metadata: {
              organizationName: org.name,
              description: org.description
            },
            permissions: permittedLevels
          })
        })
        console.log('✓ Added organization contexts:', organizations.length)
      }
    }
    
    // Location level contexts
    if (permittedLevels.includes(CONTEXT_LEVELS.LOCATION)) {
      let locationQuery = supabase
        .from('barbershops')
        .select('id, name, organization_id, organizations(name)')

      if (userRole === 'SHOP_OWNER') {
        locationQuery = locationQuery.eq('owner_id', userId)
      } else if (userRole === 'ENTERPRISE_OWNER') {
        const { data: userOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', userId)
          .single()
        
        if (userOrg) {
          locationQuery = locationQuery.eq('organization_id', userOrg.id)
        }
      }

      const { data: locations } = await locationQuery
      console.log('✓ Locations found:', locations?.length || 0)

      if (locations?.length > 0) {
        locations.forEach(location => {
          contexts.push({
            level: CONTEXT_LEVELS.LOCATION,
            locationId: location.id,
            organizationId: location.organization_id,
            displayName: location.name,
            metadata: {
              locationName: location.name,
              organizationName: location.organizations?.name
            },
            permissions: permittedLevels
          })
        })
        console.log('✓ Added location contexts:', locations.length)
      }
      
      // FALLBACK: Check for barbershops without organization
      if (contexts.length === 0 && ['SHOP_OWNER', 'ENTERPRISE_OWNER'].includes(userRole)) {
        const { data: fallbackLocations } = await supabase
          .from('barbershops')
          .select('id, name, owner_id')
          .eq('owner_id', userId)

        console.log('✓ Fallback locations found:', fallbackLocations?.length || 0)

        if (fallbackLocations?.length > 0) {
          fallbackLocations.forEach(location => {
            contexts.push({
              level: CONTEXT_LEVELS.LOCATION,
              locationId: location.id,
              organizationId: null,
              displayName: location.name,
              metadata: {
                locationName: location.name,
                organizationName: null,
                fallback: true
              },
              permissions: permittedLevels
            })
          })
          console.log('✓ Added fallback location contexts:', fallbackLocations.length)
        }
      }
    }
    
    // 4. Test results
    console.log('\n📊 CONTEXT SYSTEM TEST RESULTS:')
    console.log('Total contexts available:', contexts.length)
    
    if (contexts.length === 0) {
      console.log('❌ FAILED: No contexts found - UI would show empty state')
      return false
    }
    
    contexts.forEach((ctx, index) => {
      console.log(`${index + 1}. [${ctx.level}] ${ctx.displayName}`)
      console.log(`   - Organization ID: ${ctx.organizationId || 'None'}`)
      console.log(`   - Location ID: ${ctx.locationId || 'None'}`)
      console.log(`   - Fallback: ${ctx.metadata.fallback || false}`)
    })
    
    // 5. Test default context selection
    let defaultContext = null
    
    switch (userRole) {
      case 'ENTERPRISE_OWNER':
        defaultContext = contexts.find(ctx => ctx.level === CONTEXT_LEVELS.ORGANIZATION)
        if (!defaultContext) {
          defaultContext = contexts.find(ctx => ctx.level === CONTEXT_LEVELS.LOCATION)
        }
        break
      case 'SHOP_OWNER':
        defaultContext = contexts.find(ctx => ctx.level === CONTEXT_LEVELS.LOCATION)
        break
      case 'BARBER':
        defaultContext = contexts.find(ctx => ctx.level === CONTEXT_LEVELS.RESOURCE)
        break
    }
    
    if (!defaultContext && contexts.length > 0) {
      defaultContext = contexts[0]
    }
    
    console.log('\n🎯 DEFAULT CONTEXT:')
    if (defaultContext) {
      console.log('✓ Default context selected:', defaultContext.displayName)
      console.log('✓ Context level:', defaultContext.level)
      console.log('✓ Context system would be VISIBLE in UI')
    } else {
      console.log('❌ No default context available')
      console.log('❌ Context system would be HIDDEN in UI')
    }
    
    return contexts.length > 0
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

// Run the test
testContextSystem().then(success => {
  console.log('\n🏁 TEST COMPLETE')
  if (success) {
    console.log('✅ Context system is working correctly!')
    console.log('💡 The user should see context switching UI when logged in')
  } else {
    console.log('❌ Context system has issues')
    console.log('💡 The user would see empty state or no context UI')
  }
  process.exit(success ? 0 : 1)
})