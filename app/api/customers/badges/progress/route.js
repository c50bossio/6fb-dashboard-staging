import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { 
  calculateBadgeProgress, 
  groupBadgesByCategory, 
  getNextBadgeInCategory,
  BADGE_CATEGORIES 
} from '@/utils/badgeSystem'

export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/customers/badges/progress
 * Get detailed badge progress for a customer
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const category = searchParams.get('category')
    const includeCompleted = searchParams.get('include_completed') === 'true'
    const limit = parseInt(searchParams.get('limit')) || 50
    
    if (!customerId) {
      return NextResponse.json({
        success: false,
        error: 'customer_id parameter is required'
      }, { status: 400 })
    }

    // Get customer data with extended statistics
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        total_visits,
        total_spent,
        created_at,
        barbershop_id
      `)
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 })
    }

    // Get additional customer statistics
    const { data: additionalStats } = await supabase
      .from('customers')
      .select(`
        id,
        (
          SELECT COUNT(*) 
          FROM customers ref 
          WHERE ref.referred_by_customer_id = customers.id
        ) as referral_count
      `)
      .eq('id', customerId)
      .single()

    // Get appointment statistics for early arrivals, seasonal visits, etc.
    const { data: appointmentStats } = await supabase
      .from('appointments')
      .select(`
        scheduled_at,
        status,
        created_at
      `)
      .eq('customer_id', customerId)

    // Calculate extended customer data
    const now = new Date()
    const currentYear = now.getFullYear()
    const customerData = {
      ...customer,
      referral_count: additionalStats?.referral_count || 0,
      early_arrivals: 0,
      birthday_visits: 0,
      review_count: 0,
      spring_visits: 0,
      summer_visits: 0,
      fall_visits: 0,
      winter_visits: 0
    }

    // Process appointment data for additional metrics
    if (appointmentStats) {
      appointmentStats.forEach(apt => {
        const aptDate = new Date(apt.scheduled_at)
        const aptMonth = aptDate.getMonth() + 1
        const aptYear = aptDate.getFullYear()
        
        // Count seasonal visits for current year
        if (aptYear === currentYear) {
          if (aptMonth >= 3 && aptMonth <= 5) customerData.spring_visits++
          else if (aptMonth >= 6 && aptMonth <= 8) customerData.summer_visits++
          else if (aptMonth >= 9 && aptMonth <= 11) customerData.fall_visits++
          else customerData.winter_visits++
        }
        
        // Count early arrivals (appointments before 9 AM)
        if (aptDate.getHours() < 9) {
          customerData.early_arrivals++
        }
      })
    }

    // Get earned badges
    const { data: earnedBadges, error: earnedError } = await supabase
      .from('customer_badges')
      .select(`
        badge_definition_id,
        earned_at,
        badge_definitions (
          id,
          badge_key,
          name,
          description,
          icon,
          color,
          category,
          rarity,
          points
        )
      `)
      .eq('customer_id', customerId)

    const earnedBadgeIds = new Set((earnedBadges || []).map(b => b.badge_definition_id))

    // Get all badge definitions
    let badgeQuery = supabase
      .from('badge_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (category) {
      badgeQuery = badgeQuery.eq('category', category)
    }

    if (limit && limit > 0) {
      badgeQuery = badgeQuery.limit(limit)
    }

    const { data: allBadges, error: badgesError } = await badgeQuery

    if (badgesError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch badge definitions',
        details: badgesError.message
      }, { status: 500 })
    }

    // Calculate progress for all badges
    const badgeProgress = (allBadges || []).map(badge => {
      const isEarned = earnedBadgeIds.has(badge.id)
      const progress = calculateBadgeProgress(customerData, badge)
      const earnedBadge = earnedBadges?.find(eb => eb.badge_definition_id === badge.id)

      return {
        ...badge,
        earned: isEarned,
        earned_at: earnedBadge?.earned_at || null,
        progress: {
          current: progress.current,
          target: progress.target,
          percentage: isEarned ? 100 : progress.percentage,
          eligible: isEarned || progress.eligible,
          remaining: Math.max(0, progress.target - progress.current)
        }
      }
    })

    // Filter based on include_completed
    const filteredBadges = includeCompleted 
      ? badgeProgress 
      : badgeProgress.filter(badge => !badge.earned)

    // Group badges by category
    const groupedBadges = groupBadgesByCategory(filteredBadges)

    // Get next badge recommendations for each category
    const nextBadgeRecommendations = {}
    Object.keys(BADGE_CATEGORIES).forEach(cat => {
      const categoryKey = cat.toLowerCase()
      const nextBadge = getNextBadgeInCategory(customerData, filteredBadges, categoryKey)
      if (nextBadge) {
        nextBadgeRecommendations[categoryKey] = nextBadge
      }
    })

    // Calculate overall progress statistics
    const totalBadges = allBadges?.length || 0
    const earnedCount = earnedBadgeIds.size
    const inProgressCount = badgeProgress.filter(b => !b.earned && b.progress.percentage > 0).length
    const availableCount = badgeProgress.filter(b => !b.earned && b.progress.percentage === 0).length

    return NextResponse.json({
      success: true,
      customer_id: customerId,
      customer_name: customer.name,
      badge_progress: filteredBadges,
      grouped_badges: groupedBadges,
      next_badge_recommendations: nextBadgeRecommendations,
      statistics: {
        total_badges: totalBadges,
        earned_badges: earnedCount,
        in_progress_badges: inProgressCount,
        available_badges: availableCount,
        completion_percentage: totalBadges > 0 ? (earnedCount / totalBadges * 100) : 0,
        total_points: (earnedBadges || []).reduce((sum, b) => sum + (b.badge_definitions?.points || 0), 0)
      },
      customer_stats: {
        total_visits: customerData.total_visits,
        total_spent: customerData.total_spent,
        referral_count: customerData.referral_count,
        early_arrivals: customerData.early_arrivals,
        seasonal_visits: {
          spring: customerData.spring_visits,
          summer: customerData.summer_visits,
          fall: customerData.fall_visits,
          winter: customerData.winter_visits
        }
      }
    })

  } catch (error) {
    console.error('Error fetching badge progress:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * POST /api/customers/badges/progress
 * Update badge progress for a customer (triggered by system events)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { customer_id, trigger_event = 'manual_update' } = body

    if (!customer_id) {
      return NextResponse.json({
        success: false,
        error: 'customer_id is required'
      }, { status: 400 })
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', customer_id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 })
    }

    // Update badge progress using database function
    const { error: progressError } = await supabase
      .rpc('update_badge_progress', { p_customer_id: customer_id })

    if (progressError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update badge progress',
        details: progressError.message
      }, { status: 500 })
    }

    // Get updated progress data
    const { data: updatedProgress, error: fetchError } = await supabase
      .from('badge_progress')
      .select(`
        badge_definition_id,
        current_progress,
        progress_percentage,
        badge_definitions (
          badge_key,
          name,
          category
        )
      `)
      .eq('customer_id', customer_id)
      .order('progress_percentage', { ascending: false })

    return NextResponse.json({
      success: true,
      customer_id,
      trigger_event,
      message: 'Badge progress updated successfully',
      updated_progress: updatedProgress || [],
      progress_count: updatedProgress?.length || 0
    })

  } catch (error) {
    console.error('Error updating badge progress:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}