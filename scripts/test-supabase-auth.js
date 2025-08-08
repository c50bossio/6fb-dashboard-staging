#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '[CONFIGURED]' : '[MISSING]')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSupabaseAuth() {
  console.log('🔍 Testing Supabase Authentication and Email Configuration...\n')
  
  // Test 1: Check auth settings
  console.log('1. Testing auth settings...')
  try {
    // Test basic connection by trying to get auth user (will fail gracefully)
    const { data: authData, error: authError } = await supabase.auth.getUser()
    console.log('✅ Supabase connection established')
  } catch (error) {
    console.log('✅ Supabase connection established (no active session expected)')
  }

  // Test 2: Try to register a test user to see what happens
  console.log('\n2. Testing user registration...')
  const testEmail = 'test-' + Date.now() + '@example.com'
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    })
    
    if (error) {
      console.log('❌ Registration error:', error.message)
      if (error.message.includes('email')) {
        console.log('🔍 This might be an email configuration issue')
      }
    } else {
      console.log('✅ Registration attempt successful')
      console.log('Data:', JSON.stringify(data, null, 2))
      
      if (data.user && !data.session) {
        console.log('📧 Email confirmation required - this is expected')
      } else if (data.session) {
        console.log('⚠️  User was logged in immediately without email confirmation')
      }
    }
  } catch (error) {
    console.log('❌ Registration failed:', error.message)
  }

  // Test 3: Try to resend email for the test user
  console.log('\n3. Testing email resend functionality...')
  try {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail
    })
    
    if (error) {
      console.log('❌ Resend email error:', error.message)
    } else {
      console.log('✅ Resend email request successful')
      console.log('Data:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.log('❌ Resend email failed:', error.message)
  }

  console.log('\n🔧 Debug Information:')
  console.log('Supabase URL:', supabaseUrl)
  console.log('Service Role Key configured:', !!supabaseServiceKey)
  
  console.log('\n📋 Next Steps:')
  console.log('1. Check your Supabase dashboard → Authentication → Settings')
  console.log('2. Ensure "Enable email confirmations" is turned on')
  console.log('3. Check if SMTP is configured or using Supabase default')
  console.log('4. Verify email templates are configured')
  console.log('5. Check spam folder for test emails')
}

testSupabaseAuth().catch(console.error)