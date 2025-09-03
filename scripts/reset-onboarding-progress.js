const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetOnboardingProgress() {
  const email = null /* hardcoded ID removed for production */

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

  progress.forEach(step => {
    `)
  })
  
  // Since user has no barbershop, these completions are false
  if (!profile.barbershop_id && !profile.barbershop_id) {

    // Reset the onboarding progress

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

  } else {
    
  }
}

resetOnboardingProgress()