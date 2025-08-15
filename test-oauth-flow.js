import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testOAuthFlow() {
  const userEmail = 'c50bossio@gmail.com'
  
  console.log('==========================================================')
  console.log('🧪 OAUTH FLOW TEST FOR:', userEmail)
  console.log('==========================================================\n')
  
  try {
    // Step 1: Verify user exists and is properly configured
    console.log('📋 STEP 1: Verifying user configuration...')
    console.log('----------------------------------------------------------')
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()
    
    if (!profile) {
      console.error('❌ User profile not found')
      return
    }
    
    console.log('✅ User profile verified:')
    console.log('   - Email:', profile.email)
    console.log('   - Name:', profile.full_name)
    console.log('   - Subscription:', profile.subscription_status)
    console.log('   - Onboarding Complete:', profile.onboarding_completed ? '✅' : '❌')
    
    // Step 2: Check Supabase OAuth configuration
    console.log('\n📋 STEP 2: OAuth Configuration Check...')
    console.log('----------------------------------------------------------')
    
    console.log('✅ OAuth should be configured in Supabase Dashboard:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/[your-project]/auth/providers')
    console.log('   2. Ensure Google OAuth is enabled')
    console.log('   3. Redirect URLs should include:')
    console.log('      - http://localhost:9999/auth/callback')
    console.log('      - http://localhost:9999/**')
    console.log('   4. Client ID and Secret must be configured')
    
    // Step 3: Test instructions
    console.log('\n📋 STEP 3: Manual Testing Instructions...')
    console.log('----------------------------------------------------------')
    
    console.log('🧪 TEST PROCEDURE:')
    console.log('\n1️⃣  Clear browser state:')
    console.log('   - Open Chrome DevTools (F12)')
    console.log('   - Go to Application tab → Storage')
    console.log('   - Click "Clear site data"')
    console.log('   - OR use an Incognito/Private window')
    
    console.log('\n2️⃣  Start the OAuth flow:')
    console.log('   - Navigate to: http://localhost:9999/login')
    console.log('   - Click "Sign in with Google"')
    console.log('   - Watch the browser console for:')
    console.log('     • "🚀 Starting Google OAuth with client-side callback..."')
    console.log('     • "📍 OAuth callback URL: http://localhost:9999/auth/callback"')
    
    console.log('\n3️⃣  Complete Google authentication:')
    console.log('   - Sign in with:', userEmail)
    console.log('   - Grant permissions if prompted')
    
    console.log('\n4️⃣  Monitor the callback:')
    console.log('   - You should see a loading screen: "Completing Sign In"')
    console.log('   - Check browser console for:')
    console.log('     • "🔐 Client-side OAuth Callback Started"')
    console.log('     • "✅ Authentication successful!"')
    
    console.log('\n5️⃣  Expected outcome:')
    if (profile.onboarding_completed) {
      console.log('   ✅ You should be redirected to: /dashboard')
    } else {
      console.log('   ⚠️ You should be redirected to: /welcome')
      console.log('   (Because onboarding is not complete)')
    }
    
    // Step 4: Common issues and solutions
    console.log('\n📋 STEP 4: Troubleshooting Guide...')
    console.log('----------------------------------------------------------')
    
    console.log('🔧 If authentication fails:')
    console.log('\n❌ "No authorization code received":')
    console.log('   → Google OAuth is not properly configured in Supabase')
    console.log('   → Check Client ID and Secret in Supabase Dashboard')
    
    console.log('\n❌ "Authentication failed - no user session":')
    console.log('   → PKCE cookies are not being preserved')
    console.log('   → Try using a different browser')
    console.log('   → Check for browser extensions blocking cookies')
    
    console.log('\n❌ Redirected back to login immediately:')
    console.log('   → Session is not being established')
    console.log('   → Check browser console for specific errors')
    console.log('   → Verify localStorage is not disabled')
    
    console.log('\n❌ Error: "oauth_retry_needed":')
    console.log('   → Server-side callback is still active')
    console.log('   → Ensure route.js is renamed to route.js.bak')
    console.log('   → Restart the Next.js server')
    
  } catch (error) {
    console.error('💥 Test setup error:', error)
  }
  
  console.log('\n==========================================================')
  console.log('📊 TEST PREPARATION COMPLETE')
  console.log('==========================================================')
  console.log('\n👉 Follow the manual testing instructions above')
  console.log('👉 Monitor both browser console and server logs')
  console.log('👉 Report any errors you encounter')
}

// Run the test
testOAuthFlow()