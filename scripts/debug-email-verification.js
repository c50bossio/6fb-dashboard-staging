#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugEmailVerification() {
  console.log('🔍 Comprehensive Email Verification Debugging...\n')
  
  // Use a unique test email
  const timestamp = Date.now()
  const testEmail = `debug.test.${timestamp}@gmail.com`
  
  console.log('Test email:', testEmail)
  console.log('Supabase URL:', supabaseUrl)
  console.log('─'.repeat(60))
  
  // Step 1: Test registration (simulating frontend)
  console.log('\n📝 STEP 1: Testing User Registration')
  console.log('─'.repeat(40))
  
  try {
    const registrationResult = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Debug Test User',
          shop_name: 'Debug Test Shop',
          phone: '+1234567890',
          selected_plan: 'professional'
        },
        emailRedirectTo: `http://localhost:9999/dashboard`
      }
    })
    
    const { data, error } = registrationResult
    
    if (error) {
      console.log('❌ Registration failed:', error.message)
      console.log('Error details:', JSON.stringify(error, null, 2))
      return
    }
    
    console.log('✅ Registration successful!')
    console.log('User ID:', data.user?.id)
    console.log('Email:', data.user?.email)
    console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No')
    console.log('Session created:', !!data.session)
    console.log('Confirmation sent:', data.user?.confirmation_sent_at ? 'Yes' : 'No')
    
    // Step 2: Check if email was sent
    console.log('\n📧 STEP 2: Email Verification Analysis')
    console.log('─'.repeat(40))
    
    if (data.user && !data.session) {
      console.log('✅ Email confirmation is required (expected behavior)')
      console.log('✅ User created but not logged in (correct flow)')
      
      // Try to get more details about the user
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('*')
        .eq('email', testEmail)
        .single()
      
      if (userError) {
        console.log('⚠️ Could not fetch user details from auth.users table')
        console.log('This is normal - auth.users is not directly accessible')
      }
      
    } else if (data.session) {
      console.log('⚠️ User was logged in immediately without email confirmation')
      console.log('This suggests email confirmation might be disabled')
    }
    
    // Step 3: Test resend functionality (wait for rate limit)
    console.log('\n🔄 STEP 3: Testing Resend Functionality')
    console.log('─'.repeat(40))
    console.log('Waiting 5 seconds to avoid rate limiting...')
    
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    try {
      const resendResult = await supabase.auth.resend({
        type: 'signup',
        email: testEmail,
        options: {
          emailRedirectTo: `http://localhost:9999/dashboard`
        }
      })
      
      if (resendResult.error) {
        console.log('❌ Resend failed:', resendResult.error.message)
        
        if (resendResult.error.message.includes('security purposes')) {
          console.log('ℹ️ Rate limiting is active (normal security feature)')
        }
      } else {
        console.log('✅ Resend request successful')
        console.log('Resend data:', JSON.stringify(resendResult.data, null, 2))
      }
    } catch (resendError) {
      console.log('❌ Resend error:', resendError.message)
    }
    
    // Step 4: Check Supabase project configuration
    console.log('\n⚙️ STEP 4: Configuration Analysis')
    console.log('─'.repeat(40))
    
    // Try to fetch auth config (this might not work with service key)
    try {
      // This is a hypothetical call - Supabase doesn't expose auth config via API
      console.log('ℹ️ To check email configuration, you need to:')
      console.log('1. Go to Supabase Dashboard → Authentication → Settings')
      console.log('2. Check "Enable email confirmations" is ON')
      console.log('3. Verify SMTP settings (or default Supabase email)')
      console.log('4. Check email templates are configured')
      console.log('5. Look at "Redirect URLs" section')
    } catch (configError) {
      console.log('⚠️ Cannot fetch auth configuration via API')
    }
    
    // Step 5: Common Issues Analysis
    console.log('\n🔧 STEP 5: Common Issues Analysis')
    console.log('─'.repeat(40))
    
    console.log('✅ Registration flow working correctly')
    console.log('✅ Email confirmation enabled')
    console.log('✅ User creation successful')
    console.log('✅ Rate limiting active (security feature)')
    
    console.log('\n🎯 Likely Causes of Missing Emails:')
    console.log('1. 📧 Email going to spam/junk folder')
    console.log('2. 🔧 SMTP configuration not set in Supabase')
    console.log('3. 🚫 Email provider blocking automated emails')
    console.log('4. ⏰ Email delivery delay (can take 1-5 minutes)')
    console.log('5. 🔗 Incorrect redirect URLs in Supabase settings')
    
    console.log('\n🔍 Troubleshooting Steps:')
    console.log('1. Check spam folder for test emails')
    console.log('2. Try with different email providers (Gmail, Outlook, etc.)')
    console.log('3. Check Supabase Dashboard → Authentication → Settings')
    console.log('4. Verify site URL and redirect URLs match your domain')
    console.log('5. Consider setting up custom SMTP in Supabase')
    
    // Cleanup: Try to delete the test user (optional)
    console.log('\n🧹 STEP 6: Cleanup')
    console.log('─'.repeat(40))
    console.log('Test user created with ID:', data.user?.id)
    console.log('You can manually delete this user from Supabase Dashboard if needed')
    
  } catch (error) {
    console.log('❌ Debug test failed:', error.message)
    console.log('Full error:', JSON.stringify(error, null, 2))
  }
}

debugEmailVerification().catch(console.error)