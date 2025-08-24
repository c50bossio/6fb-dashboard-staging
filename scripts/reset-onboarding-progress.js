const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetOnboardingProgress() {
  const email = 'c50bossio@gmail.com'
  
  console.log('🔍 Checking onboarding progress for:', email)
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single()
  
  if (profileError) {
    console.error('Error fetching profile:', profileError)
    return
  }
  
  console.log('Profile found:', {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    onboarding_completed: profile.onboarding_completed,
    shop_id: profile.shop_id,
    barbershop_id: profile.barbershop_id
  })
  
  // Check current onboarding progress
  const { data: progress, error: progressError } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('user_id', profile.id)
    .order('completed_at', { ascending: true })
  
  if (progressError) {
    console.error('Error fetching progress:', progressError)
    return
  }
  
  console.log('\n📊 Current onboarding progress:')
  console.log(`Found ${progress.length} completed steps:`)
  progress.forEach(step => {
    console.log(`  - ${step.step_name} (completed at: ${step.completed_at})`)
  })
  
  // Since user has no barbershop, these completions are false
  if (!profile.shop_id && !profile.barbershop_id) {
    console.log('\n⚠️  User has no barbershop but shows completed onboarding!')
    console.log('This is a false completion state.')
    
    // Reset the onboarding progress
    console.log('\n🧹 Clearing false onboarding progress...')
    
    const { error: deleteError } = await supabase
      .from('onboarding_progress')
      .delete()
      .eq('user_id', profile.id)
    
    if (deleteError) {
      console.error('Error deleting progress:', deleteError)
      return
    }
    
    // Also reset the profile onboarding flag
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: false,
        onboarding_completed_at: null,
        onboarding_step: 0,
        onboarding_progress_percentage: 0
      })
      .eq('id', profile.id)
    
    if (updateError) {
      console.error('Error updating profile:', updateError)
      return
    }
    
    console.log('✅ Onboarding progress reset successfully!')
    console.log('The OnboardingProgress widget should now appear when you refresh.')
  } else {
    console.log('\n✅ User has a barbershop, onboarding appears legitimate.')
  }
}

resetOnboardingProgress()