import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { step, stepData } = body
    
    // Special handling for staff step - save staff data immediately if present
    if (step === 'staff' && stepData?.staff && stepData.staff.length > 0) {
      // Get the user's barbershop
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      
      if (barbershop) {
        // Clear existing staff and insert new ones
        await supabase
          .from('barbers')
          .delete()
          .eq('shop_id', barbershop.id)
        
        const staffData = stepData.staff.map(member => ({
          shop_id: barbershop.id,
          name: member.name || `${member.firstName} ${member.lastName}`,
          email: member.email,
          phone: member.phone,
          bio: member.bio || '',
          specialties: member.specialty ? [member.specialty] : [],
          experience_years: member.experience || 0,
          is_active: true,
          avatar_url: member.profileImage || null,
          chair_number: member.chairNumber || null,
          instagram_handle: member.instagram || null,
          languages: member.languages || ['English'],
          availability: member.availability || 'full_time'
        }))
        
        const { error: staffError } = await supabase
          .from('barbers')
          .insert(staffData)
        
        if (staffError) {
          console.error('Error saving staff during progress save:', staffError)
        }
      }
    }
    
    // Save to onboarding_progress table
    const { data: progressData, error: progressError } = await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        step_name: step,
        step_data: stepData,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,step_name'
      })
      .select()
      .single()
    
    if (progressError) {
      console.error('Error saving onboarding progress:', progressError)
      // Continue even if this fails - we'll still update the profile
    }
    
    // Also save analytics event for tracking
    const { error: analyticsError } = await supabase
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_name: 'onboarding_progress_saved',
        event_properties: {
          step_name: step,
          timestamp: new Date().toISOString(),
          data_keys: Object.keys(stepData || {})
        },
        user_properties: {
          user_id: user.id
        },
        session_id: request.headers.get('x-session-id') || null
      })
    
    if (analyticsError) {
      console.error('Error saving analytics:', analyticsError)
      // Continue even if analytics fails
    }
    
    // Update profile with current progress
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: getStepNumber(step),
        onboarding_last_step: step,
        onboarding_data: stepData,
        onboarding_progress_percentage: calculateProgressPercentage(step),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: progressData,
      message: 'Progress saved successfully',
      step: step,
      progress: calculateProgressPercentage(step)
    })
    
  } catch (error) {
    console.error('Error in save-progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: progress, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching progress:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step, user_goals, business_size')
      .eq('id', user.id)
      .single()
    
    const combinedData = {
      completed: profile?.onboarding_completed || false,
      currentStep: profile?.onboarding_step || 0,
      userGoals: profile?.user_goals || [],
      businessSize: profile?.business_size || '',
      steps: progress || []
    }
    
    return NextResponse.json(combinedData)
    
  } catch (error) {
    console.error('Error in get progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getStepNumber(stepName) {
  const steps = {
    'role': 0,
    'business': 1,
    'schedule': 2,
    'services': 3,
    'staff': 4,
    'financial': 5,
    'booking': 6,
    'branding': 7,
    'profile': 0,
    'goals': 1,
    'domain': 8
  }
  return steps[stepName] || 0
}

function calculateProgressPercentage(stepName) {
  const stepNumber = getStepNumber(stepName)
  const totalSteps = 8 // Adjust based on role
  return Math.round(((stepNumber + 1) / totalSteps) * 100)
}