#!/usr/bin/env node

/**
 * Test script to identify OAuth redirect URL mismatch
 * This checks if the redirectTo URL matches expected Supabase configuration
 */

require('dotenv').config({ path: '.env.local' })

console.log('🔍 Testing OAuth Redirect URL Configuration...\n')

// Current configuration from login page
const currentRedirectTo = 'https://bookedbarber.com/auth/callback'
const supabaseCallbackUrl = 'https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback'

console.log('📋 OAuth Flow Analysis:')
console.log('=====================================')
console.log(`1. Frontend redirectTo:    ${currentRedirectTo}`)
console.log(`2. Google Console config:  ${supabaseCallbackUrl}`)
console.log(`3. Expected Site URL:      https://bookedbarber.com`)
console.log('')

console.log('🚨 POTENTIAL ISSUES:')
console.log('=====================================')
console.log('❌ ISSUE #1: Redirect URL Mismatch')
console.log('   - Login page sets redirectTo: /auth/callback')  
console.log('   - But Google OAuth should redirect to Supabase first')
console.log('   - Then Supabase redirects to Site URL + specified path')
console.log('')

console.log('❌ ISSUE #2: Invalid Request Parameter')
console.log('   - "invalid%20request" in URL suggests OAuth request malformation')
console.log('   - This could be caused by:')
console.log('     • Wrong Client ID format')
console.log('     • Incorrect redirect_uri parameter')
console.log('     • Missing required OAuth scopes')
console.log('')

console.log('🔧 RECOMMENDED FIXES:')
console.log('=====================================')
console.log('1. VERIFY SUPABASE SITE URL:')
console.log('   Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/settings/api')
console.log('   Set Site URL to: https://bookedbarber.com')
console.log('')

console.log('2. VERIFY REDIRECT URLS:')
console.log('   Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/url-configuration')
console.log('   Add: https://bookedbarber.com/**')
console.log('')

console.log('3. CHECK GOOGLE OAUTH CLIENT ID:')
console.log('   - Ensure it ends with .apps.googleusercontent.com')
console.log('   - Verify it matches what\'s in Supabase Google provider config')
console.log('')

console.log('4. SIMPLIFY REDIRECT LOGIC:')
console.log('   - Instead of /auth/callback, try redirectTo: window.location.origin')
console.log('   - Or use /dashboard as the post-auth destination')
console.log('')

console.log('⚡ QUICK TEST:')
console.log('=====================================')
console.log('Try this modified redirectTo in login page:')
console.log('```javascript')
console.log('const { data, error } = await supabase.auth.signInWithOAuth({')
console.log('  provider: "google",')
console.log('  options: {')
console.log('    redirectTo: `${window.location.origin}/dashboard`')
console.log('  }')
console.log('})') 
console.log('```')
console.log('')

console.log('This bypasses the custom callback handler and uses Supabase\'s default flow.')