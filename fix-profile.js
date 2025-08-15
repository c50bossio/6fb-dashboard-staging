const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixProfile() {
  console.log('🔧 Fixing profile for c50bossio@gmail.com...\n')
  
  const userId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
  
  // Update the profile with correct Google data and reset onboarding
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: 'Chris Bossio',
      avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocIcJoQvUmQMuLZMp-NNR_2xfXURd-B_e9pQ8ImPEoCRVpkD5apmzg=s96-c',
      onboarding_completed: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('❌ Error updating profile:', error)
  } else {
    console.log('✅ Profile updated successfully!')
    console.log('\n📋 Updated profile:')
    console.log('  - Full Name:', data.full_name)
    console.log('  - Avatar URL:', data.avatar_url ? 'Set ✓' : 'Not set')
    console.log('  - Onboarding Completed:', data.onboarding_completed)
    console.log('  - Updated:', data.updated_at)
    console.log('\n✨ Next steps:')
    console.log('  1. Sign in with Google (c50bossio@gmail.com)')
    console.log('  2. You should be redirected to the welcome page')
    console.log('  3. Your Google profile picture should appear in the top-right corner')
  }
  
  process.exit(0)
}

fixProfile()