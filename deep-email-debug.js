// 🔍 Deep Email Debug - Check actual email sending vs API responses
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Deep Email Debug - 6FB AI Agent System')
console.log('=========================================')
console.log('')

const supabase = createClient(supabaseUrl, supabaseKey)
const supabaseAdmin = createClient(supabaseUrl, serviceKey)

async function deepEmailDebug() {
  const testEmail = process.argv[2] || 'test@gmail.com'
  
  console.log(`📧 Testing email delivery to: ${testEmail}`)
  console.log('')
  
  try {
    // Test 1: Check if user already exists
    console.log('🔍 Test 1: Checking if user exists...')
    const { data: existingUsers, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('email, email_confirmed_at, confirmation_sent_at')
      .eq('email', testEmail)
    
    if (userError) {
      console.log('❌ Could not check existing users:', userError.message)
    } else if (existingUsers && existingUsers.length > 0) {
      console.log('⚠️  User already exists with this email!')
      console.log('   Email confirmed:', existingUsers[0].email_confirmed_at ? 'Yes' : 'No')
      console.log('   Last confirmation sent:', existingUsers[0].confirmation_sent_at || 'Never')
      console.log('')
    } else {
      console.log('✅ Email is available for registration')
    }
    
    // Test 2: Try to resend confirmation (this should work even for existing users)
    console.log('🔍 Test 2: Testing resend confirmation...')
    const { data: resendData, error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail,
      options: {
        emailRedirectTo: `${supabaseUrl}/dashboard`
      }
    })
    
    if (resendError) {
      console.log('❌ Resend failed:', resendError.message)
      
      if (resendError.message.includes('rate limit')) {
        console.log('⏰ Rate limited - wait 60 seconds and try again')
      } else if (resendError.message.includes('User not found')) {
        console.log('💡 User doesn\'t exist - try registering first')
      } else if (resendError.message.includes('signup disabled')) {
        console.log('🔧 Signup is disabled in Supabase settings')
      } else {
        console.log('🔧 Possible SMTP configuration issue')
      }
    } else {
      console.log('✅ Resend API call successful')
      console.log('📤 Email should be queued for delivery')
    }
    
    // Test 3: Try actual signup (will fail if user exists, but shows email behavior)
    console.log('')
    console.log('🔍 Test 3: Testing signup (to see email behavior)...')
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TempPassword123!',
      options: {
        emailRedirectTo: `${supabaseUrl}/dashboard`
      }
    })
    
    if (signupError) {
      console.log('❌ Signup failed:', signupError.message)
      
      if (signupError.message.includes('already registered')) {
        console.log('✅ This confirms the email system is working')
        console.log('💡 User already exists - use resend instead')
      }
    } else {
      console.log('✅ Signup successful!')
      console.log('📤 Confirmation email should be sent')
      if (signupData.user && !signupData.user.email_confirmed_at) {
        console.log('⏳ Email confirmation required')
      }
    }
    
    console.log('')
    console.log('🎯 DIAGNOSIS SUMMARY:')
    console.log('====================')
    
    if (resendError && resendError.message.includes('rate limit')) {
      console.log('❌ ISSUE: Rate limiting is preventing email sends')
      console.log('🔧 SOLUTION: Wait 60 seconds between attempts')
    } else if (resendError && resendError.message.includes('User not found')) {
      console.log('❌ ISSUE: User doesn\'t exist in system')
      console.log('🔧 SOLUTION: Register first, then resend')
    } else if (!resendError) {
      console.log('✅ API CALLS: Working correctly')
      console.log('❌ EMAIL DELIVERY: Not reaching inbox')
      console.log('')
      console.log('🔍 POSSIBLE CAUSES:')
      console.log('1. SMTP settings in Supabase are incorrect')
      console.log('2. SendGrid API key is invalid/expired')
      console.log('3. Email is going to spam folder')
      console.log('4. SendGrid domain not verified')
      console.log('5. Email provider blocking automated emails')
      console.log('')
      console.log('🔧 NEXT STEPS:')
      console.log('1. Check spam folder thoroughly')
      console.log('2. Verify SendGrid dashboard for delivery logs')
      console.log('3. Try different email provider (gmail vs outlook)')
      console.log('4. Check Supabase auth logs')
    }
    
  } catch (err) {
    console.error('❌ Deep debug error:', err.message)
  }
}

deepEmailDebug()