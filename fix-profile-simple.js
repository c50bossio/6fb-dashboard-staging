const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixProfileSimple() {
  console.log('🔧 Fixing profile for c50bossio@gmail.com...\n')
  
  const userId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
  
  // Update just the fields we know exist
  console.log('📝 Updating profile data (without avatar_url)...')
  
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: 'Chris Bossio',
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
    console.log('  - Onboarding Completed:', data.onboarding_completed)
    console.log('  - Role:', data.role)
    console.log('  - Updated:', data.updated_at)
    
    console.log('\n✨ Next steps:')
    console.log('  1. Sign in with Google (c50bossio@gmail.com)')
    console.log('  2. You should now be redirected to the welcome page')
    console.log('  3. Your name should show as "Chris Bossio" in the header')
    
    console.log('\n⚠️  Important: To enable Google profile pictures, run this SQL in Supabase:')
    console.log('\n  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;')
    console.log('\n  Then sign in again to sync your Google profile picture.')
  }
  
  process.exit(0)
}

fixProfileSimple()