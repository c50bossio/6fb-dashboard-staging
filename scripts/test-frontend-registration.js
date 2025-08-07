#!/usr/bin/env node

const fetch = require('node-fetch')

async function testFrontendRegistration() {
  console.log('🌐 Testing Frontend Registration Flow')
  console.log('═'.repeat(50))
  
  const baseUrl = 'http://localhost:9999'
  
  // Step 1: Check if the app is running
  console.log('\n📡 STEP 1: Checking App Availability')
  console.log('─'.repeat(40))
  
  try {
    const response = await fetch(baseUrl)
    console.log('✅ App is running on', baseUrl)
    console.log('Status:', response.status, response.statusText)
  } catch (error) {
    console.log('❌ App is not accessible:', error.message)
    console.log('Make sure to run: npm run dev')
    return
  }
  
  // Step 2: Check register page
  console.log('\n📋 STEP 2: Checking Register Page')
  console.log('─'.repeat(40))
  
  try {
    const registerResponse = await fetch(`${baseUrl}/register`)
    console.log('✅ Register page accessible')
    console.log('Status:', registerResponse.status, registerResponse.statusText)
  } catch (error) {
    console.log('❌ Register page not accessible:', error.message)
    return
  }
  
  // Step 3: Check if there are any API routes
  console.log('\n🔌 STEP 3: Checking API Routes')
  console.log('─'.repeat(40))
  
  const apiRoutes = [
    '/api/auth/signup',
    '/api/auth/signin',
    '/api/auth/resend',
    '/api/health'
  ]
  
  for (const route of apiRoutes) {
    try {
      const apiResponse = await fetch(`${baseUrl}${route}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      console.log(`${route}: ${apiResponse.status} ${apiResponse.statusText}`)
    } catch (error) {
      console.log(`${route}: ❌ Not accessible`)
    }
  }
  
  // Step 4: Test actual registration (simulated)
  console.log('\n🧪 STEP 4: Simulating Registration')
  console.log('─'.repeat(40))
  
  console.log('Frontend registration uses client-side Supabase auth')
  console.log('This means:')
  console.log('✅ No custom API endpoints needed')
  console.log('✅ Direct connection to Supabase from browser')
  console.log('✅ Network requests go directly to supabase.co')
  
  console.log('\nTo test the full flow:')
  console.log('1. Open browser to: http://localhost:9999/register')
  console.log('2. Fill out the registration form')
  console.log('3. Open browser dev tools → Network tab')
  console.log('4. Monitor requests to supabase.co during submission')
  console.log('5. Check for any 4xx/5xx errors in network requests')
  
  // Step 5: Check environment configuration
  console.log('\n⚙️ STEP 5: Environment Configuration')
  console.log('─'.repeat(40))
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('Supabase URL configured:', !!supabaseUrl)
  console.log('Supabase Anon Key configured:', !!supabaseKey)
  
  if (supabaseUrl) {
    console.log('Supabase URL:', supabaseUrl)
  }
  
  // Step 6: Browser testing instructions
  console.log('\n🔍 STEP 6: Manual Browser Testing')
  console.log('─'.repeat(40))
  
  console.log('Complete testing instructions:')
  console.log('')
  console.log('1. Open Chrome/Firefox developer tools')
  console.log('2. Go to Network tab, clear existing requests')
  console.log('3. Navigate to: http://localhost:9999/register')
  console.log('4. Fill out the form with a real email address')
  console.log('5. Submit the form')
  console.log('6. Look for these network requests:')
  console.log('   - POST to dfhqjdoydihajmjxniee.supabase.co/auth/v1/signup')
  console.log('   - Status should be 200 OK')
  console.log('   - Response should contain user data')
  console.log('')
  console.log('7. If successful, you should be redirected to:')
  console.log('   http://localhost:9999/register/confirm?email=your@email.com')
  console.log('')
  console.log('8. On the confirm page, try clicking "Resend Verification Email"')
  console.log('9. Look for POST to dfhqjdoydihajmjxniee.supabase.co/auth/v1/resend')
  console.log('')
  console.log('10. Check your email (including spam folder)')
  console.log('    Look for: noreply@mail.supabase.io')
  
  console.log('\n🐛 Common Network Issues to Watch For:')
  console.log('─'.repeat(40))
  console.log('❌ CORS errors → Check Supabase allowed origins')
  console.log('❌ 429 Rate limit → Wait 60 seconds between attempts')
  console.log('❌ 400 Bad request → Check email format/validation')
  console.log('❌ 422 Validation error → Check password requirements')
  console.log('❌ 500 Server error → Supabase service issue')
  
  console.log('\n✅ Success Indicators:')
  console.log('─'.repeat(40))
  console.log('✅ 200 OK response from /auth/v1/signup')
  console.log('✅ Response contains user object with ID')
  console.log('✅ email_confirmed_at is null (confirmation required)')
  console.log('✅ confirmation_sent_at has timestamp')
  console.log('✅ Redirect to confirm page with email parameter')
}

// Load environment variables
require('dotenv').config({ path: '.env.local' })

testFrontendRegistration().catch(console.error)