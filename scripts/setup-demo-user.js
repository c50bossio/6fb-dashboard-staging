#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDemoUser() {

  try {
    const { data: existingUser, error: checkError } = await supabase.auth.admin.getUserByEmail('demo@barbershop.com')
    
    if (existingUser?.user) {

      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.user.id,
        { password: 'demo123' }
      )
      
      if (updateError) {
        console.error('❌ Error updating password:', updateError)
      } else {
        
      }
      
      return existingUser.user
    }

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
      
    }
    
    return newUser.user
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return null
  }
}

async function testLogin() {

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo@barbershop.com',
    password: 'demo123'
  })
  
  if (error) {
    console.error('❌ Login test failed:', error.message)
  } else {

  }
}

async function main() {

  const user = await setupDemoUser()
  
  if (user) {
    await testLogin()
  }

}

main().catch(console.error)