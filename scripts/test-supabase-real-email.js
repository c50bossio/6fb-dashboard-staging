#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testRealEmailRegistration() {
  console.log('🔍 Testing registration with real email domain...\n')
  
  // Use a gmail address for testing (this should be accepted)
  const testEmail = 'test.6fb.debug.' + Date.now() + '@gmail.com'
  
  console.log('Testing with email:', testEmail)
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Test User',
          shop_name: 'Test Shop'
        },
        emailRedirectTo: 'http://localhost:9999/dashboard'
      }
    })
    
    if (error) {
      console.log('❌ Registration error:', error.message)
      console.log('Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ Registration successful!')
      console.log('User ID:', data.user?.id)
      console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No')
      console.log('Session created:', !!data.session)
      
      if (data.user && !data.session) {
        console.log('\n📧 Email confirmation required - check the email inbox!')
        console.log('Expected behavior: User should receive an email with confirmation link')
        
        // Now test the resend functionality
        console.log('\n🔄 Testing resend functionality...')
        
        // Wait a moment then try to resend
        setTimeout(async () => {
          try {
            const { data: resendData, error: resendError } = await supabase.auth.resend({
              type: 'signup',
              email: testEmail,
              options: {
                emailRedirectTo: 'http://localhost:9999/dashboard'
              }
            })
            
            if (resendError) {
              console.log('❌ Resend error:', resendError.message)
            } else {
              console.log('✅ Resend successful!')
              console.log('Resend data:', JSON.stringify(resendData, null, 2))
            }
          } catch (resendErr) {
            console.log('❌ Resend failed:', resendErr.message)
          }
        }, 2000)
      }
    }
  } catch (error) {
    console.log('❌ Registration failed:', error.message)
  }
}

testRealEmailRegistration().catch(console.error)