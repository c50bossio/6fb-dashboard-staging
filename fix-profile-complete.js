const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixProfileComplete() {
  console.log('🔧 Complete profile fix for c50bossio@gmail.com...\n')
  
  const userId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
  
  // First, add avatar_url column if it doesn't exist
  console.log('1️⃣ Checking/adding avatar_url column...')
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: `
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='profiles' AND column_name='avatar_url'
        ) THEN
          ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
        END IF;
      END $$;
    `
  }).catch(async (err) => {
    // If RPC doesn't exist, try direct SQL
    console.log('   RPC not available, trying alternative approach...')
    
    // Try to update without avatar_url first
    return { error: 'rpc_not_available' }
  })
  
  if (alterError && alterError !== 'rpc_not_available') {
    console.log('   ⚠️ Could not verify avatar_url column:', alterError.message)
  } else if (!alterError) {
    console.log('   ✅ Avatar URL column verified')
  }
  
  // Now update the profile - try with avatar_url first
  console.log('\n2️⃣ Updating profile data...')
  
  // First attempt: with avatar_url
  let { data, error } = await supabase
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
  
  // If avatar_url column doesn't exist, try without it
  if (error && error.message.includes('avatar_url')) {
    console.log('   Avatar URL column not available, updating without it...')
    
    const result = await supabase
      .from('profiles')
      .update({
        full_name: 'Chris Bossio',
        onboarding_completed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
    
    data = result.data
    error = result.error
  }
  
  if (error) {
    console.error('❌ Error updating profile:', error)
  } else {
    console.log('✅ Profile updated successfully!')
    console.log('\n📋 Updated profile:')
    console.log('  - Full Name:', data.full_name)
    console.log('  - Avatar URL:', data.avatar_url || 'Column not available')
    console.log('  - Onboarding Completed:', data.onboarding_completed)
    console.log('  - Role:', data.role)
    console.log('  - Updated:', data.updated_at)
    
    console.log('\n✨ Next steps:')
    console.log('  1. Sign in with Google (c50bossio@gmail.com)')
    console.log('  2. You should now be redirected to the welcome page')
    console.log('  3. Your name should show as "Chris Bossio" in the header')
    
    if (data.avatar_url) {
      console.log('  4. Your Google profile picture should appear in the top-right corner')
    } else {
      console.log('\n⚠️  Note: Avatar URL column may need to be added to the database.')
      console.log('   Run this SQL in Supabase SQL Editor:')
      console.log('   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;')
    }
  }
  
  process.exit(0)
}

fixProfileComplete()