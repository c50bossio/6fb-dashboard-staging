// 🔍 Debug Login Redirect Issue
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Debug Login Redirect Issue')
console.log('============================')
console.log('')
console.log('🔗 Supabase URL:', supabaseUrl)
console.log('🗝️  Key starts with:', supabaseKey?.substring(0, 20) + '...')
console.log('')

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugLogin() {
  const testEmail = 'c50bossio@gmail.com'
  
  try {
    console.log(`🔐 Testing login scenarios for: ${testEmail}`)
    console.log('')
    
    // 1. Test with wrong password to see what error we get
    console.log('1️⃣ Testing with wrong password...')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'wrongpassword123'
      })
      
      if (error) {
        console.log('❌ Login error:', error.message)
        
        if (error.message.includes('Invalid login credentials')) {
          console.log('✅ ACCOUNT EXISTS but password is wrong')
        } else if (error.message.includes('Email not confirmed')) {
          console.log('✅ ACCOUNT EXISTS but email not verified')
        } else if (error.message.includes('not found')) {
          console.log('❌ Account does not exist')
        } else {
          console.log('❓ Unknown error:', error.message)
        }
      } else {
        console.log('🤔 Unexpected success with wrong password:', data)
      }
    } catch (err) {
      console.log('❌ Network error:', err.message)
    }
    
    console.log('')
    console.log('2️⃣ Checking user management...')
    
    // 2. Try to get session info
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message)
    } else {
      console.log('📱 Current session:', session.session ? 'Active' : 'None')
      if (session.session) {
        console.log('👤 User:', session.session.user.email)
        console.log('✅ Verified:', session.session.user.email_confirmed_at ? 'Yes' : 'No')
      }
    }
    
    console.log('')
    console.log('🎯 LIKELY CAUSES OF LOGIN REDIRECT:')
    console.log('')
    console.log('1. Email not verified yet:')
    console.log('   → Check Gmail inbox/spam for verification email')
    console.log('   → Look for email from noreply@6fbmentorship.com')
    console.log('')
    console.log('2. Account created but wrong password:')
    console.log('   → Try common passwords you might have used')
    console.log('   → Use "Forgot Password" feature')
    console.log('')
    console.log('3. Account created with different email format:')
    console.log('   → Check if you used a different variation')
    console.log('   → Try chrisbossio instead of c50bossio')
    console.log('')
    console.log('4. Browser session issues:')
    console.log('   → Clear browser cache/cookies')
    console.log('   → Try in incognito mode')
    console.log('')
    
    console.log('📧 NEXT STEPS:')
    console.log('1. Check your Gmail for ANY emails from 6fbmentorship.com')
    console.log('2. If found, click the verification link')
    console.log('3. Try logging in again')
    console.log('4. If no email found, try registering with +test@gmail.com')
    
  } catch (error) {
    console.error('❌ Debug error:', error.message)
  }
}

debugLogin()