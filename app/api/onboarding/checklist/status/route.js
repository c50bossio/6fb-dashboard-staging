import { createClient } from '../../../../../lib/supabase/server'
import { withAuth, getUserProfile } from '../../../../../lib/auth-middleware'
import { success, unauthorized, serverError } from '../../../../../lib/api-response'

export const GET = withAuth(async function(request) {
  try {
    const user = request.user
    const supabase = await createClient()

    // Skip auth validation if already handled by middleware
    if (!user) {
      return unauthorized('Authentication required')
    }

    // Get user profile with robust error handling
    let profile
    try {
      profile = await getUserProfile(user.id)
    } catch (error) {
      console.error('Profile fetch error:', error)

      // For development user, create a mock profile to test the service logic
      if (user.id === '00000000-0000-0000-0000-000000000001') {
        console.log('🔧 Using mock profile for development testing')
        profile = {
          id: '00000000-0000-0000-0000-000000000001',
          first_name: 'Development',
          last_name: 'User',
          phone: '+1234567890',
          avatar_url: null,
          onboarding_completed: false,
          onboarding_checklist_progress: {}
        }
      } else {
        // Return a basic response if profile fetch fails for real users
        return NextResponse.json({
          success: true,
          data: {
            user_id: user.id,
            onboarding_completed: false,
            items: [],
            progress: {
              completed_count: 0,
              total_count: 8,
              completion_percentage: 0,
              earned_points: 0,
              total_points: 100,
              is_fully_completed: false
            },
            error: 'Profile data temporarily unavailable',
            last_updated: new Date().toISOString()
          }
        })
      }
    }

    // Get stored manual completion data
    const manualCompletions = profile.onboarding_checklist_progress || {}

    // Get barbershop info first, then check services for that barbershop
    const barbershopResult = await supabase
      .from('barbershops')
      .select('id, name, business_hours, payment_settings')
      .eq('owner_id', user.id)
      .single()

    const barbershop = barbershopResult.data

    // If user has a barbershop, check services for that barbershop
    let services = []
    if (barbershop) {
      const servicesResult = await supabase
        .from('services')
        .select('id')
        .eq('barbershop_id', barbershop.id)
        .eq('is_active', true) // Only count active services

      services = servicesResult.data || []
    } else {
      // If no barbershop, check for services associated with the demo barbershop
      // This handles the case where services are added before barbershop is created
      const servicesResult = await supabase
        .from('services')
        .select('id')
        .eq('barbershop_id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') // Demo barbershop ID
        .eq('is_active', true)

      services = servicesResult.data || []
    }

    // Helper function to determine completion status with hybrid logic
    const getCompletionStatus = (itemId, automaticDetection) => {
      // Priority 1: Check manual completion status
      if (manualCompletions[itemId]) {
        return manualCompletions[itemId].completed || false
      }

      // Priority 2: Fall back to automatic detection
      return automaticDetection
    }

    // Calculate automatic detection status (for fallback)
    const automaticDetection = {
      profile: !!(profile.first_name && profile.last_name && profile.phone),
      services: services.length >= 3,
      hours: !!(barbershop?.business_hours && Object.keys(barbershop.business_hours).length > 0),
      photo: !!(profile.avatar_url),
      payment: !!(barbershop?.payment_settings),
      booking_rules: false, // TODO: Check booking rules when implemented
      customize_page: !!(barbershop?.name && barbershop.name !== 'Demo Barbershop'),
      test_booking: false // TODO: Check if user has test bookings
    }

    // Calculate checklist completion status with hybrid logic
    const checklistItems = [
      {
        id: 'profile',
        title: 'Complete business information',
        completed: getCompletionStatus('profile', automaticDetection.profile),
        points: 20,
        manual_override: !!manualCompletions.profile
      },
      {
        id: 'services',
        title: 'Add your services',
        completed: getCompletionStatus('services', automaticDetection.services),
        points: 15,
        manual_override: !!manualCompletions.services
      },
      {
        id: 'hours',
        title: 'Set business hours',
        completed: getCompletionStatus('hours', automaticDetection.hours),
        points: 10,
        manual_override: !!manualCompletions.hours
      },
      {
        id: 'photo',
        title: 'Upload profile photo',
        completed: getCompletionStatus('photo', automaticDetection.photo),
        points: 10,
        manual_override: !!manualCompletions.photo
      },
      {
        id: 'payment',
        title: 'Configure payment settings',
        completed: getCompletionStatus('payment', automaticDetection.payment),
        points: 15,
        manual_override: !!manualCompletions.payment
      },
      {
        id: 'booking_rules',
        title: 'Set up booking rules',
        completed: getCompletionStatus('booking_rules', automaticDetection.booking_rules),
        points: 10,
        manual_override: !!manualCompletions.booking_rules
      },
      {
        id: 'customize_page',
        title: 'Customize booking page',
        completed: getCompletionStatus('customize_page', automaticDetection.customize_page),
        points: 10,
        manual_override: !!manualCompletions.customize_page
      },
      {
        id: 'test_booking',
        title: 'Test first booking',
        completed: getCompletionStatus('test_booking', automaticDetection.test_booking),
        points: 10,
        manual_override: !!manualCompletions.test_booking
      }
    ]

    const completedItems = checklistItems.filter(item => item.completed)
    const totalItems = checklistItems.length
    const completedCount = completedItems.length
    const totalPoints = checklistItems.reduce((sum, item) => sum + item.points, 0)
    const earnedPoints = completedItems.reduce((sum, item) => sum + item.points, 0)
    const completionPercentage = Math.round((completedCount / totalItems) * 100)
    const isFullyCompleted = completedCount === totalItems

    return success({
      user_id: user.id,
      onboarding_completed: profile.onboarding_completed || false,
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
    })

  } catch (error) {
    console.error('Checklist status error:', error)
    return serverError('Failed to get checklist status', error)
  }
})