import { createClient } from '@/lib/supabase/server-client'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { step, stepData } = body
    
    // Save progress to onboarding_progress table
    const { data, error } = await supabase
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
    
    if (error) {
      console.error('Error saving onboarding progress:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Update profile with current step
    await supabase
      .from('profiles')
      .update({
        onboarding_step: getStepNumber(step),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Progress saved successfully' 
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
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get all saved progress for the user
    const { data: progress, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching progress:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step, user_goals, business_size')
      .eq('id', user.id)
      .single()
    
    // Combine all progress data
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
    'services': 2,
    'financial': 3,
    'preview': 4
  }
  return steps[stepName] || 0
}