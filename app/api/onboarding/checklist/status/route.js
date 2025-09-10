import { NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

export async function GET(request) {
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

    // Get user profile with onboarding progress
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        avatar_url,
        onboarding_completed,
        onboarding_checklist_progress,
        onboarding_points,
        created_at
      `)
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    // Get additional data for checklist items
    const [servicesResult, barbershopResult] = await Promise.all([
      // Check services
      supabase
        .from('services')
        .select('id')
        .eq('barber_id', user.id)
        .limit(3),
      
      // Check barbershop/business info
      supabase
        .from('barbershops')
        .select('id, name, business_hours, payment_settings')
        .eq('owner_id', user.id)
        .single()
    ])

    const services = servicesResult.data || []
    const barbershop = barbershopResult.data

    // Calculate checklist completion status
    const checklistItems = [
      {
        id: 'profile',
        title: 'Complete your profile',
        completed: !!(profile.first_name && profile.last_name && profile.phone),
        points: 20
      },
      {
        id: 'services',
        title: 'Add your services',
        completed: services.length >= 3,
        points: 15
      },
      {
        id: 'hours',
        title: 'Set business hours',
        completed: !!(barbershop?.business_hours),
        points: 10
      },
      {
        id: 'photo',
        title: 'Upload profile photo',
        completed: !!(profile.avatar_url),
        points: 10
      },
      {
        id: 'payment',
        title: 'Configure payment settings',
        completed: !!(barbershop?.payment_settings),
        points: 15
      },
      {
        id: 'booking_rules',
        title: 'Set up booking rules',
        completed: false, // TODO: Check booking rules when implemented
        points: 10
      },
      {
        id: 'customize_page',
        title: 'Customize booking page',
        completed: !!(barbershop?.name),
        points: 10
      },
      {
        id: 'test_booking',
        title: 'Test first booking',
        completed: false, // TODO: Check if user has test bookings
        points: 10
      }
    ]

    const completedItems = checklistItems.filter(item => item.completed)
    const totalItems = checklistItems.length
    const completedCount = completedItems.length
    const totalPoints = checklistItems.reduce((sum, item) => sum + item.points, 0)
    const earnedPoints = completedItems.reduce((sum, item) => sum + item.points, 0)
    const completionPercentage = Math.round((completedCount / totalItems) * 100)
    const isFullyCompleted = completedCount === totalItems

    return NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
        onboarding_completed: profile.onboarding_completed || isFullyCompleted,
        items: checklistItems,
        progress: {
          completed_count: completedCount,
          total_count: totalItems,
          completion_percentage: completionPercentage,
          earned_points: earnedPoints,
          total_points: totalPoints,
          is_fully_completed: isFullyCompleted
        },
        last_updated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Checklist status error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get checklist status' },
      { status: 500 }
    )
  }
}