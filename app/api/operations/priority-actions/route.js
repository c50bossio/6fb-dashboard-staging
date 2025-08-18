import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/operations/priority-actions
 * Generate AI-powered priority actions based on real business data
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    
    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'barbershop_id is required'
      }, { status: 400 })
    }

    // Get current date for time-based analysis
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    
    const oneWeekAgo = new Date(today)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0]

    // Parallel data fetching for performance
    const [
      { data: todayBookings },
      { data: recentBookings },
      { data: pendingBookings },
      { data: noShowBookings },
      { data: recentReviews },
      { data: unansweredReviews },
      { data: barbershopData },
      { data: staffData }
    ] = await Promise.all([
      // Today's appointments
      supabase
        .from('bookings')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('scheduled_at', todayStr)
        .lt('scheduled_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()),
      
      // Recent bookings for trend analysis
      supabase
        .from('bookings')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('scheduled_at', oneWeekAgoStr)
        .order('scheduled_at', { ascending: false }),
      
      // Tomorrow's pending appointments
      supabase
        .from('bookings')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'CONFIRMED')
        .gte('scheduled_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .lt('scheduled_at', new Date(today.getTime() + 48 * 60 * 60 * 1000).toISOString()),
      
      // Recent no-shows (last 7 days)
      supabase
        .from('bookings')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('status', 'NO_SHOW')
        .gte('scheduled_at', oneWeekAgoStr),
      
      // Recent Google reviews
      supabase
        .from('gmb_reviews')
        .select(`
          *,
          gmb_accounts!inner (barbershop_id)
        `)
        .eq('gmb_accounts.barbershop_id', barbershopId)
        .gte('review_date', oneWeekAgoStr)
        .order('review_date', { ascending: false }),
      
      // Unanswered reviews
      supabase
        .from('gmb_reviews')
        .select(`
          *,
          gmb_accounts!inner (barbershop_id),
          gmb_review_responses (id)
        `)
        .eq('gmb_accounts.barbershop_id', barbershopId)
        .is('gmb_review_responses.id', null)
        .gte('review_date', oneWeekAgoStr)
        .order('review_date', { ascending: false }),
      
      // Barbershop info
      supabase
        .from('barbershops')
        .select('*')
        .eq('id', barbershopId)
        .single(),
      
      // Staff info
      supabase
        .from('barbershop_staff')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
    ])

    // Generate intelligent priority actions based on real data
    const priorityActions = await generatePriorityActions({
      todayBookings: todayBookings || [],
      recentBookings: recentBookings || [],
      pendingBookings: pendingBookings || [],
      noShowBookings: noShowBookings || [],
      recentReviews: recentReviews || [],
      unansweredReviews: unansweredReviews || [],
      barbershopData,
      staffData: staffData || [],
      barbershopId
    })

    return NextResponse.json({
      success: true,
      data: {
        actions: priorityActions,
        metadata: {
          generated_at: new Date().toISOString(),
          data_sources: [
            `${todayBookings?.length || 0} today's appointments`,
            `${recentBookings?.length || 0} recent bookings analyzed`,
            `${unansweredReviews?.length || 0} unanswered reviews`,
            `${noShowBookings?.length || 0} recent no-shows`
          ],
          barbershop_id: barbershopId
        }
      }
    })

  } catch (error) {
    console.error('Error generating priority actions:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate priority actions'
    }, { status: 500 })
  }
}

/**
 * Generate AI-powered priority actions based on business data analysis
 */
async function generatePriorityActions(data) {
  const actions = []
  const {
    todayBookings,
    recentBookings,
    pendingBookings,
    noShowBookings,
    recentReviews,
    unansweredReviews,
    barbershopData,
    staffData
  } = data

  // Action 1: No-show follow-up (High Priority)
  if (noShowBookings.length > 0) {
    const recentNoShows = noShowBookings.filter(booking => {
      const bookingDate = new Date(booking.scheduled_at)
      const daysSince = (new Date() - bookingDate) / (1000 * 60 * 60 * 24)
      return daysSince <= 3 // Within last 3 days
    })

    if (recentNoShows.length > 0) {
      actions.push({
        id: 'follow_up_no_shows',
        title: 'Follow up with recent no-shows',
        description: `${recentNoShows.length} customers missed appointments in the last 3 days`,
        priority: 'high',
        estimatedTime: `${Math.max(15, recentNoShows.length * 3)} minutes`,
        icon: 'PhoneIcon',
        color: 'red',
        urgencyScore: 90,
        actions: ['Call customers', 'Send follow-up SMS', 'Reschedule appointments'],
        data: {
          count: recentNoShows.length,
          customers: recentNoShows.map(b => ({
            name: b.client_name,
            phone: b.client_phone,
            missed_date: b.scheduled_at,
            service: b.service_name
          }))
        }
      })
    }
  }

  // Action 2: Tomorrow's appointment confirmations (High Priority)
  if (pendingBookings.length > 0) {
    const needsConfirmation = pendingBookings.filter(booking => {
      // Check if booking was made more than 24 hours ago and not confirmed recently
      const bookingAge = (new Date() - new Date(booking.created_at)) / (1000 * 60 * 60)
      return bookingAge > 2 // Made more than 2 hours ago
    })

    if (needsConfirmation.length > 0) {
      actions.push({
        id: 'confirm_tomorrows_appointments',
        title: "Confirm tomorrow's appointments",
        description: `${needsConfirmation.length} appointments need confirmation calls`,
        priority: 'high',
        estimatedTime: `${Math.max(20, needsConfirmation.length * 2)} minutes`,
        icon: 'CalendarDaysIcon',
        color: 'amber',
        urgencyScore: 85,
        actions: ['Auto-confirm via SMS', 'Call customers', 'Send reminder emails'],
        data: {
          count: needsConfirmation.length,
          appointments: needsConfirmation.map(b => ({
            customer_name: b.client_name,
            time: new Date(b.scheduled_at).toLocaleTimeString(),
            service: b.service_name,
            barber: b.barber_name || 'Staff'
          }))
        }
      })
    }
  }

  // Action 3: Respond to recent reviews (Medium Priority)
  if (unansweredReviews.length > 0) {
    const highPriorityReviews = unansweredReviews.filter(review => 
      review.star_rating <= 3 || // Low ratings need immediate attention
      (new Date() - new Date(review.review_date)) / (1000 * 60 * 60 * 24) <= 2 // Recent reviews
    )

    const reviewCount = Math.max(unansweredReviews.length, highPriorityReviews.length)
    actions.push({
      id: 'respond_to_reviews',
      title: 'Respond to customer reviews',
      description: `${reviewCount} reviews need responses${highPriorityReviews.length > 0 ? ` (${highPriorityReviews.length} urgent)` : ''}`,
      priority: highPriorityReviews.length > 0 ? 'high' : 'medium',
      estimatedTime: `${Math.max(15, reviewCount * 3)} minutes`,
      icon: 'ChatBubbleLeftIcon',
      color: 'purple',
      urgencyScore: highPriorityReviews.length > 0 ? 75 : 50,
      actions: ['AI-generate responses', 'Review and edit', 'Publish responses'],
      data: {
        total_count: unansweredReviews.length,
        urgent_count: highPriorityReviews.length,
        avg_rating: unansweredReviews.length > 0 
          ? (unansweredReviews.reduce((sum, r) => sum + r.star_rating, 0) / unansweredReviews.length).toFixed(1)
          : 0,
        recent_reviews: unansweredReviews.slice(0, 3).map(r => ({
          customer: r.reviewer_name,
          rating: r.star_rating,
          text: r.review_text?.substring(0, 100) + '...',
          date: r.review_date
        }))
      }
    })
  }

  // Action 4: Social media content from successful services (Medium Priority)
  const completedBookingsToday = todayBookings.filter(b => b.status === 'COMPLETED')
  const recentCompletedBookings = recentBookings
    .filter(b => b.status === 'COMPLETED')
    .slice(0, 10)

  if (recentCompletedBookings.length > 0) {
    const hasRecentContent = recentCompletedBookings.some(booking => {
      const daysSince = (new Date() - new Date(booking.scheduled_at)) / (1000 * 60 * 60 * 24)
      return daysSince <= 1 // Within last day
    })

    actions.push({
      id: 'create_social_content',
      title: 'Share customer transformations',
      description: `${recentCompletedBookings.length} recent services ready for social media`,
      priority: hasRecentContent ? 'medium' : 'low',
      estimatedTime: '15 minutes',
      icon: 'CameraIcon',
      color: 'blue',
      urgencyScore: hasRecentContent ? 40 : 20,
      actions: ['Select best photos', 'Create Instagram post', 'Schedule content'],
      data: {
        recent_services: recentCompletedBookings.slice(0, 5).map(b => ({
          service: b.service_name,
          barber: b.barber_name || 'Staff',
          date: b.scheduled_at,
          customer_initials: b.client_name ? `${b.client_name.split(' ')[0]?.[0]}${b.client_name.split(' ')[1]?.[0] || ''}` : 'Client'
        })),
        suggested_hashtags: ['#barbershop', '#freshcut', '#transformation', '#barberlife']
      }
    })
  }

  // Action 5: Staff scheduling optimization (Low Priority)
  const todayScheduled = todayBookings.length
  const avgDailyBookings = recentBookings.length / 7
  
  if (todayScheduled < avgDailyBookings * 0.7) { // Less than 70% of average
    actions.push({
      id: 'optimize_scheduling',
      title: 'Fill scheduling gaps',
      description: `Today has ${todayScheduled} appointments vs ${Math.round(avgDailyBookings)} average`,
      priority: 'low',
      estimatedTime: '10 minutes',
      icon: 'ClockIcon',
      color: 'indigo',
      urgencyScore: 30,
      actions: ['Send promotional SMS', 'Call waitlist', 'Post availability'],
      data: {
        available_slots: Math.round(avgDailyBookings - todayScheduled),
        staff_count: staffData.length,
        suggested_times: ['2:00 PM', '3:30 PM', '5:00 PM']
      }
    })
  }

  // Action 6: Inventory or equipment check (based on patterns)
  const serviceTypes = recentBookings
    .filter(b => b.service_name)
    .reduce((acc, booking) => {
      acc[booking.service_name] = (acc[booking.service_name] || 0) + 1
      return acc
    }, {})

  const mostPopularService = Object.entries(serviceTypes)
    .sort(([,a], [,b]) => b - a)[0]

  if (mostPopularService && mostPopularService[1] > 10) { // Popular service with many bookings
    actions.push({
      id: 'check_supplies',
      title: 'Check supplies for popular services',
      description: `${mostPopularService[0]} is trending - verify supply levels`,
      priority: 'low',
      estimatedTime: '5 minutes',
      icon: 'WrenchScrewdriverIcon',
      color: 'gray',
      urgencyScore: 25,
      actions: ['Check inventory', 'Reorder supplies', 'Update service availability'],
      data: {
        trending_service: mostPopularService[0],
        recent_bookings: mostPopularService[1],
        suggested_supplies: ['Hair products', 'Cleaning supplies', 'Tools maintenance']
      }
    })
  }

  // Sort actions by priority and urgency
  return actions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    
    if (priorityDiff !== 0) return priorityDiff
    return b.urgencyScore - a.urgencyScore
  })
}