/**
 * Test script to verify automatic user setup after OAuth + payment
 * This simulates what should happen when a user signs up and pays
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for testing
const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
)

async function testAutoSetup(email, plan) {
  console.log(`\n=== Testing Auto Setup for ${plan} Plan ===`)
  console.log(`Email: ${email}`)
  console.log(`Plan: ${plan}`)
  
  try {
    // 1. Check if user exists and get their ID
    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
    
    let userId = null
    
    if (users && users.length > 0) {
      userId = users[0].id
      console.log(`✅ Found existing user: ${userId}`)
    } else {
      // Create a test user if doesn't exist
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Test User',
          first_name: 'Test',
          last_name: 'User'
        }
      })
      
      if (authError) {
        console.error('❌ Failed to create auth user:', authError)
        return
      }
      
      userId = authData.user.id
      console.log(`✅ Created new user: ${userId}`)
    }
    
    // 2. Map plan to role
    let role = 'SHOP_OWNER'
    if (plan === 'barber') {
      role = 'BARBER'
    } else if (plan === 'shop') {
      role = 'SHOP_OWNER'
    } else if (plan === 'enterprise') {
      role = 'ENTERPRISE_OWNER'
    }
    
    console.log(`📋 Mapped plan "${plan}" to role "${role}"`)
    
    // 3. Create/update profile
    const profileData = {
      id: userId,
      email: email,
      first_name: 'Test',
      last_name: 'User',
      full_name: 'Test User',
      role: role,
      subscription_status: 'active',
      subscription_tier: plan
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single()
    
    if (profileError) {
      console.error('❌ Failed to create profile:', profileError)
      return
    }
    
    console.log('✅ Profile created/updated')
    
    // 4. Create barbershop for barbers and shop owners
    if (role === 'BARBER' || role === 'SHOP_OWNER') {
      // Check if barbershop already exists
      const { data: existingShops } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', userId)
      
      if (existingShops && existingShops.length > 0) {
        console.log('✅ Barbershop already exists:', existingShops[0].name)
        
        // Update profile with shop_id if missing
        if (!profile.shop_id) {
          await supabase
            .from('profiles')
            .update({ shop_id: existingShops[0].id })
            .eq('id', userId)
          console.log('✅ Updated profile with shop_id')
        }
      } else {
        // Create new barbershop
        const shopName = role === 'BARBER' 
          ? `${profile.first_name}'s Chair` 
          : `${profile.first_name}'s Barbershop`
        
        const { data: barbershop, error: shopError } = await supabase
          .from('barbershops')
          .insert({
            owner_id: userId,
            name: shopName,
            email: email,
            booking_enabled: true,
            online_booking_enabled: true,
            website_enabled: true
          })
          .select()
          .single()
        
        if (shopError) {
          console.error('❌ Failed to create barbershop:', shopError)
          return
        }
        
        console.log(`✅ Created barbershop: "${barbershop.name}" (${barbershop.id})`)
        
        // Update profile with shop_id
        await supabase
          .from('profiles')
          .update({ shop_id: barbershop.id })
          .eq('id', userId)
        
        console.log('✅ Updated profile with shop_id')
      }
    }
    
    // 5. For enterprise owners, create organization
    if (role === 'ENTERPRISE_OWNER') {
      // Check if organization exists
      const { data: existingOrgs } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', userId)
      
      if (existingOrgs && existingOrgs.length > 0) {
        console.log('✅ Organization already exists:', existingOrgs[0].name)
      } else {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: `${profile.first_name}'s Organization`,
            owner_id: userId,
            tier: 'enterprise'
          })
          .select()
          .single()
        
        if (orgError) {
          console.error('❌ Failed to create organization:', orgError)
        } else {
          console.log(`✅ Created organization: "${org.name}" (${org.id})`)
          
          // Create first barbershop under organization
          const { data: barbershop } = await supabase
            .from('barbershops')
            .insert({
              owner_id: userId,
              name: `${org.name} - Main Location`,
              organization_id: org.id,
              email: email,
              booking_enabled: true,
              online_booking_enabled: true,
              website_enabled: true
            })
            .select()
            .single()
          
          if (barbershop) {
            console.log(`✅ Created first barbershop under organization: "${barbershop.name}"`)
          }
        }
      }
    }
    
    // 6. Final verification
    const { data: finalProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    console.log('\n📊 Final Profile State:')
    console.log({
      email: finalProfile.email,
      role: finalProfile.role,
      shop_id: finalProfile.shop_id,
      subscription_status: finalProfile.subscription_status,
      subscription_tier: finalProfile.subscription_tier
    })
    
    console.log('\n✅ Auto-setup test completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
  }
}

// Test all three subscription types
async function runTests() {
  console.log('🧪 Testing Automatic User Setup After OAuth + Payment\n')
  console.log('This simulates what should happen when users sign up and pay.\n')
  
  // Test individual barber (they ARE the barbershop)
  await testAutoSetup('test-barber@example.com', 'barber')
  
  // Test shop owner
  await testAutoSetup('test-shop@example.com', 'shop')
  
  // Test enterprise owner
  await testAutoSetup('test-enterprise@example.com', 'enterprise')
  
  console.log('\n✅ All tests completed!')
}

// Run the tests
runTests().catch(console.error)