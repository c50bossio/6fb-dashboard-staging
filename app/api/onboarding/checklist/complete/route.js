import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Mark onboarding as completed
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to complete onboarding' },
        { status: 500 }
      )
    }

    // TODO: Send completion email or trigger celebration effects
    
    return NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
        onboarding_completed: true,
        completed_at: new Date().toISOString(),
        message: 'Congratulations! Your onboarding is complete.'
      }
    })

  } catch (error) {
    console.error('Onboarding completion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}