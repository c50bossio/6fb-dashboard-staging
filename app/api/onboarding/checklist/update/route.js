import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    const body = await request.json()
    
    const { item_id, completed, points } = body

    if (!item_id || typeof completed !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'item_id and completed status required' },
        { status: 400 }
      )
    }

    // Validate item_id against known checklist items
    const validItemIds = [
      'profile', 'services', 'hours', 'photo', 'payment',
      'booking_rules', 'customize_page', 'test_booking'
    ]

    if (!validItemIds.includes(item_id)) {
      return NextResponse.json(
        { success: false, error: `Invalid item_id: ${item_id}` },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, onboarding_checklist_progress, onboarding_points')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // Update checklist progress
    const currentProgress = profile.onboarding_checklist_progress || {}
    const currentPoints = profile.onboarding_points || 0
    
    // Calculate points change
    let pointsChange = 0
    if (completed && !currentProgress[item_id]) {
      // Item being completed for the first time
      pointsChange = points || 0
    } else if (!completed && currentProgress[item_id]) {
      // Item being uncompleted
      pointsChange = -(points || 0)
    }

    const updatedProgress = {
      ...currentProgress,
      [item_id]: {
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        points: points || 0,
        manual_override: true,
        last_updated: new Date().toISOString()
      }
    }

    const updatedPoints = Math.max(0, currentPoints + pointsChange)

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_checklist_progress: updatedProgress,
        onboarding_points: updatedPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update progress' },
        { status: 500 }
      )
    }

    // Calculate overall completion
    const completedItems = Object.values(updatedProgress).filter(item => item.completed).length
    const totalItems = 8 // Total checklist items
    const completionPercentage = Math.round((completedItems / totalItems) * 100)

    return NextResponse.json({
      success: true,
      data: {
        item_id,
        completed,
        points_change: pointsChange,
        total_points: updatedPoints,
        completion_percentage: completionPercentage,
        manual_override: true,
        timestamp: new Date().toISOString(),
        message: `Item "${item_id}" manually ${completed ? 'completed' : 'uncompleted'}`
      }
    })

  } catch (error) {
    console.error('Checklist update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update checklist' },
      { status: 500 }
    )
  }
}