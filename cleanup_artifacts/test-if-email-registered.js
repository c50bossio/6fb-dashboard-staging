// 🔍 Check if email is already registered in system
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = 'https://fksmlwifnzxsrkjmcajj.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Checking if c50bossio@gmail.com is registered')
console.log('==============================================')
console.log('')

async function checkEmailRegistration() {
  try {
    // Check if user exists in profiles table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'c50bossio@gmail.com')
    
    if (profileError) {
      console.log('❌ Error checking profiles:', profileError.message)
    } else {
      console.log(`📊 Profiles found: ${profiles?.length || 0}`)
      if (profiles && profiles.length > 0) {
        console.log('✅ Email is registered in profiles table')
        console.log('User data:', JSON.stringify(profiles[0], null, 2))
      } else {
        console.log('❌ Email not found in profiles table')
      }
    }
    
    console.log('')
    console.log('🎯 SOLUTIONS:')
    console.log('1. Try logging in with c50bossio@gmail.com (might already be registered)')
    console.log('2. Use a different email address like:')
    console.log('   - chrisbossio6fb@gmail.com')
    console.log('   - c50bossio+test@gmail.com (Gmail plus addressing)')
    console.log('   - Use Outlook/Yahoo instead of Gmail')
    console.log('3. Wait 15-30 minutes for rate limits to reset')
    console.log('')
    
    // Try to sign in to see if account exists
    console.log('🔐 Testing if login works with this email...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'c50bossio@gmail.com',
      password: 'wrongpassword123' // Intentionally wrong to check if user exists
    })
    
    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        console.log('✅ Account EXISTS but password is wrong')
        console.log('   → Try logging in with correct password')
        console.log('   → Or reset password if forgotten')
      } else if (authError.message.includes('Email not confirmed')) {
        console.log('✅ Account EXISTS but email not verified')
        console.log('   → Check Gmail for verification email')
        console.log('   → Try resend verification on login page')
      } else {
        console.log('❌ No account found or other error:', authError.message)
        console.log('   → Safe to try registering again')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkEmailRegistration()