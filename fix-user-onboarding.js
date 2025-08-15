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

async function fixUserOnboarding() {
  const userEmail = 'c50bossio@gmail.com'
  
  console.log('==========================================================')
  console.log('🔧 FIXING ONBOARDING STATUS FOR:', userEmail)
  console.log('==========================================================\n')
  
  try {
    // Step 1: Get the user's current profile
    console.log('📋 STEP 1: Fetching current profile...')
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()
    
    if (fetchError) {
      console.error('❌ Error fetching profile:', fetchError.message)
      return
    }
    
    if (!profile) {
      console.error('❌ No profile found for email:', userEmail)
      return
    }
    
    console.log('✅ Profile found:')
    console.log('   - ID:', profile.id)
    console.log('   - Email:', profile.email)
    console.log('   - Name:', profile.full_name)
    console.log('   - Shop Name:', profile.shop_name)
    console.log('   - Current Onboarding Status:', profile.onboarding_completed ? '✅ Complete' : '❌ Incomplete')
    console.log('   - Subscription Status:', profile.subscription_status)
    
    // Step 2: Update onboarding status
    console.log('\n📋 STEP 2: Updating onboarding status...')
    
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('email', userEmail)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Error updating profile:', updateError.message)
      return
    }
    
    console.log('✅ Profile updated successfully!')
    console.log('   - Onboarding Status: ✅ Complete')
    console.log('   - Updated At:', new Date(updatedProfile.updated_at).toLocaleString())
    
    // Step 3: Verify the update
    console.log('\n📋 STEP 3: Verifying update...')
    
    const { data: verifiedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, onboarding_completed, subscription_status')
      .eq('email', userEmail)
      .single()
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError.message)
      return
    }
    
    console.log('✅ Update verified:')
    console.log('   - Onboarding Completed:', verifiedProfile.onboarding_completed ? '✅ YES' : '❌ NO')
    console.log('   - Subscription Status:', verifiedProfile.subscription_status)
    
    console.log('\n==========================================================')
    console.log('✅ SUCCESS! User onboarding has been marked as complete.')
    console.log('==========================================================')
    console.log('\n📌 NEXT STEPS:')
    console.log('1. Clear your browser cookies and cache')
    console.log('2. Go to http://localhost:9999/login')
    console.log('3. Click "Sign in with Google"')
    console.log('4. You should now be redirected to the dashboard')
    console.log('\nIf you still have issues:')
    console.log('- Try opening in an incognito/private browser window')
    console.log('- Check the browser console for any errors')
    console.log('- Look at the server logs for OAuth callback details')
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

// Run the fix
fixUserOnboarding()