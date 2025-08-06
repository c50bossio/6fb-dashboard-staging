#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDemoUser() {
  console.log('🔧 Setting up demo user...')
  
  try {
    // First, check if user exists
    const { data: existingUser, error: checkError } = await supabase.auth.admin.getUserByEmail('demo@barbershop.com')
    
    if (existingUser?.user) {
      console.log('✅ Demo user already exists')
      console.log('User ID:', existingUser.user.id)
      console.log('Email:', existingUser.user.email)
      
      // Update password to ensure it's correct
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.user.id,
        { password: 'demo123' }
      )
      
      if (updateError) {
        console.error('❌ Error updating password:', updateError)
      } else {
        console.log('✅ Password updated to: demo123')
      }
      
      return existingUser.user
    }
    
    // Create user if doesn't exist
    console.log('📝 Creating new demo user...')
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'demo@barbershop.com',
      password: 'demo123',
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: 'Demo User',
        role: 'SHOP_OWNER'
      }
    })
    
    if (createError) {
      console.error('❌ Error creating user:', createError)
      return null
    }
    
    console.log('✅ Demo user created successfully!')
    console.log('User ID:', newUser.user.id)
    console.log('Email:', newUser.user.email)
    
    // Create profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: 'demo@barbershop.com',
        full_name: 'Demo User',
        role: 'SHOP_OWNER',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (profileError) {
      console.error('⚠️ Error creating profile:', profileError)
    } else {
      console.log('✅ Profile created successfully!')
    }
    
    return newUser.user
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return null
  }
}

// Test login after setup
async function testLogin() {
  console.log('\n🧪 Testing login with demo credentials...')
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo@barbershop.com',
    password: 'demo123'
  })
  
  if (error) {
    console.error('❌ Login test failed:', error.message)
  } else {
    console.log('✅ Login test successful!')
    console.log('Session:', data.session ? 'Active' : 'None')
    console.log('User:', data.user?.email)
  }
}

// Run setup
async function main() {
  console.log('🚀 Supabase Demo User Setup')
  console.log('URL:', supabaseUrl)
  console.log('----------------------------\n')
  
  const user = await setupDemoUser()
  
  if (user) {
    await testLogin()
  }
  
  console.log('\n✨ Setup complete!')
  console.log('You can now login with:')
  console.log('Email: demo@barbershop.com')
  console.log('Password: demo123')
}

main().catch(console.error)