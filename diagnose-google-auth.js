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

async function diagnoseGoogleAuth() {
  const userEmail = 'c50bossio@gmail.com'
  
  console.log('==========================================================')
  console.log('🔍 GOOGLE OAUTH DIAGNOSTIC FOR:', userEmail)
  console.log('==========================================================\n')
  
  try {
    // Step 1: Check if user exists in auth.users table
    console.log('📋 STEP 1: Checking Supabase Auth Users Table...')
    console.log('----------------------------------------------------------')
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message)
      return
    }
    
    const googleUser = authUsers.users.find(u => u.email === userEmail)
    
    if (googleUser) {
      console.log('✅ User found in auth.users:')
      console.log('   - Auth ID:', googleUser.id)
      console.log('   - Email:', googleUser.email)
      console.log('   - Provider:', googleUser.app_metadata?.provider || 'Unknown')
      console.log('   - Created:', new Date(googleUser.created_at).toLocaleString())
      console.log('   - Last Sign In:', googleUser.last_sign_in_at ? new Date(googleUser.last_sign_in_at).toLocaleString() : 'Never')
      console.log('   - Email Confirmed:', googleUser.email_confirmed_at ? '✅ Yes' : '❌ No')
      
      // Check identities
      if (googleUser.identities && googleUser.identities.length > 0) {
        console.log('   - OAuth Identities:')
        googleUser.identities.forEach(identity => {
          console.log(`     • ${identity.provider}: ${identity.identity_data?.email || 'No email'}`)
        })
      }
    } else {
      console.log('❌ User NOT found in auth.users table')
      console.log('   This means the user has never successfully authenticated with Supabase')
    }
    
    // Step 2: Check profiles table
    console.log('\n📋 STEP 2: Checking Profiles Table...')
    console.log('----------------------------------------------------------')
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()
    
    if (profile) {
      console.log('✅ Profile found:')
      console.log('   - Profile ID:', profile.id)
      console.log('   - Email:', profile.email)
      console.log('   - Full Name:', profile.full_name || 'Not set')
      console.log('   - Shop Name:', profile.shop_name || 'Not set')
      console.log('   - Role:', profile.role)
      console.log('   - Subscription Status:', profile.subscription_status || 'None')
      console.log('   - Stripe Customer ID:', profile.stripe_customer_id || 'None')
      console.log('   - Onboarding Completed:', profile.onboarding_completed ? '✅ Yes' : '❌ No')
      console.log('   - Created:', new Date(profile.created_at).toLocaleString())
      
      // Step 3: Cross-reference auth ID with profile ID
      if (googleUser && profile.id !== googleUser.id) {
        console.log('\n⚠️  WARNING: Profile ID does not match Auth User ID!')
        console.log(`   Auth ID: ${googleUser.id}`)
        console.log(`   Profile ID: ${profile.id}`)
        console.log('   This mismatch will cause authentication issues!')
      }
    } else if (profileError) {
      console.log('❌ Error fetching profile:', profileError.message)
    } else {
      console.log('❌ No profile found for this email')
    }
    
    // Step 4: Check subscriptions table
    console.log('\n📋 STEP 3: Checking Subscriptions Table...')
    console.log('----------------------------------------------------------')
    
    if (profile) {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('profile_id', profile.id)
        .single()
      
      if (subscription) {
        console.log('✅ Subscription found:')
        console.log('   - Subscription ID:', subscription.id)
        console.log('   - Stripe Subscription ID:', subscription.stripe_subscription_id)
        console.log('   - Status:', subscription.status)
        console.log('   - Current Period Start:', new Date(subscription.current_period_start).toLocaleString())
        console.log('   - Current Period End:', new Date(subscription.current_period_end).toLocaleString())
        console.log('   - Plan ID:', subscription.plan_id)
      } else if (subError) {
        console.log('⚠️  Subscription query error:', subError.message)
      } else {
        console.log('❌ No subscription found for this profile')
      }
    }
    
    // Step 5: Diagnose the issue
    console.log('\n🔍 DIAGNOSIS:')
    console.log('==========================================================')
    
    if (!googleUser) {
      console.log('❌ PRIMARY ISSUE: User has never successfully authenticated with Google OAuth')
      console.log('\nPOSSIBLE CAUSES:')
      console.log('1. OAuth callback is failing before creating the auth user')
      console.log('2. PKCE code verifier mismatch (seen in logs)')
      console.log('3. Google OAuth configuration issue in Supabase dashboard')
      console.log('4. Cookie handling issues between client and server')
      
      console.log('\n✅ RECOMMENDED FIXES:')
      console.log('1. Clear all browser cookies and localStorage')
      console.log('2. Check Supabase Dashboard > Authentication > Providers > Google')
      console.log('3. Verify redirect URL matches: http://localhost:9999/auth/callback')
      console.log('4. Update the OAuth callback handler to handle PKCE properly')
    } else if (!profile) {
      console.log('⚠️  User exists in auth but no profile')
      console.log('This means OAuth works but profile creation fails')
    } else if (googleUser.id !== profile.id) {
      console.log('❌ CRITICAL: Auth ID and Profile ID mismatch!')
      console.log('This prevents successful authentication')
    } else if (profile.subscription_status !== 'active') {
      console.log('⚠️  User authenticated but subscription is not active')
    } else if (!profile.onboarding_completed) {
      console.log('⚠️  User should be redirected to /welcome for onboarding')
    } else {
      console.log('✅ User setup looks correct - issue may be in session handling')
    }
    
    // Step 6: Check current cookies and session
    console.log('\n📋 STEP 4: Testing Direct Authentication...')
    console.log('----------------------------------------------------------')
    
    // Try to get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (session) {
      console.log('✅ Active session found:')
      console.log('   - User Email:', session.user.email)
      console.log('   - User ID:', session.user.id)
      console.log('   - Expires At:', new Date(session.expires_at * 1000).toLocaleString())
    } else {
      console.log('❌ No active session found')
      if (sessionError) {
        console.log('   Error:', sessionError.message)
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error during diagnosis:', error)
  }
  
  console.log('\n==========================================================')
  console.log('📊 DIAGNOSIS COMPLETE')
  console.log('==========================================================')
}

// Run the diagnosis
diagnoseGoogleAuth()