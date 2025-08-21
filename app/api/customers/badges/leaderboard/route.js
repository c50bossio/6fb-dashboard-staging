import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateBadgeLeaderboard } from '../../../../../utils/badgeSystem'

export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/customers/badges/leaderboard
 * Get badge leaderboard for customers
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    const limit = parseInt(searchParams.get('limit')) || 20
    const category = searchParams.get('category') // Filter by badge category
    const timeframe = searchParams.get('timeframe') || 'all' // all, month, week
    
    // Build base query for customers
    let customerQuery = supabase
      .from('customers')
      .select(`
        id,
        name,
        total_visits,
        total_spent,
        barbershop_id
      `)
      .eq('is_active', true)
      .limit(limit * 2) // Get more customers to account for filtering

    if (barbershopId) {
      customerQuery = customerQuery.or(`shop_id.eq.${barbershopId},barbershop_id.eq.${barbershopId}`)
    }

    const { data: customers, error: customerError } = await customerQuery

    if (customerError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch customers',
        details: customerError.message
      }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        success: true,
        leaderboard: [],
        total_customers: 0,
        timeframe,
        category: category || 'all'
      })
    }

    // Get badge data for each customer
    const customerIds = customers.map(c => c.id)
    
    // Build badge query with timeframe filtering
    let badgeQuery = supabase
      .from('customer_badges')
      .select(`
        customer_id,
        earned_at,
        badge_definitions (
          id,
          name,
          category,
          rarity,
          points
        )
      `)
      .in('customer_id', customerIds)

    // Apply timeframe filter
    if (timeframe === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      badgeQuery = badgeQuery.gte('earned_at', monthAgo.toISOString())
    } else if (timeframe === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      badgeQuery = badgeQuery.gte('earned_at', weekAgo.toISOString())
    }

    const { data: badgeData, error: badgeError } = await badgeQuery

    if (badgeError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch badge data',
        details: badgeError.message
      }, { status: 500 })
    }

    // Group badges by customer
    const customerBadges = {}
    
    customers.forEach(customer => {
      customerBadges[customer.id] = {
        ...customer,
        badges: []
      }
    })

    if (badgeData) {
      badgeData.forEach(badge => {
        if (customerBadges[badge.customer_id]) {
          // Apply category filter if specified
          if (!category || category === 'all' || badge.badge_definitions.category === category) {
            customerBadges[badge.customer_id].badges.push({
              ...badge.badge_definitions,
              earned_at: badge.earned_at
            })
          }
        }
      })
    }

    // Calculate leaderboard using utility function
    const customersArray = Object.values(customerBadges)
    const leaderboard = calculateBadgeLeaderboard(customersArray)

    // Apply limit after sorting
    const limitedLeaderboard = leaderboard.slice(0, limit)

    // Calculate additional statistics
    const statistics = {
      total_customers: customers.length,
      total_badges_earned: badgeData?.length || 0,
      total_points_awarded: leaderboard.reduce((sum, customer) => sum + customer.totalPoints, 0),
      average_badges_per_customer: customers.length > 0 
        ? Math.round((badgeData?.length || 0) / customers.length * 10) / 10 
        : 0,
      top_performer: leaderboard[0] || null,
      category_breakdown: {}
    }

    // Calculate category breakdown
    if (badgeData) {
      badgeData.forEach(badge => {
        const cat = badge.badge_definitions.category
        if (!statistics.category_breakdown[cat]) {
          statistics.category_breakdown[cat] = 0
        }
        statistics.category_breakdown[cat]++
      })
    }

    return NextResponse.json({
      success: true,
      leaderboard: limitedLeaderboard,
      statistics,
      timeframe,
      category: category || 'all',
      limit,
      filters: {
        barbershop_id: barbershopId,
        category,
        timeframe
      }
    })

  } catch (error) {
    console.error('Error generating badge leaderboard:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * POST /api/customers/badges/leaderboard
 * Refresh leaderboard data and trigger notifications for achievements
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { barbershop_id, trigger_notifications = false } = body

    // Get fresh leaderboard data
    const leaderboardResponse = await GET(request)
    const leaderboardData = await leaderboardResponse.json()

    if (!leaderboardData.success) {
      return leaderboardResponse
    }

    let notifications = []

    // Trigger notifications for top performers if requested
    if (trigger_notifications) {
      const topPerformers = leaderboardData.leaderboard.slice(0, 3)
      
      notifications = topPerformers.map((customer, index) => ({
        customer_id: customer.customer_id,
        customer_name: customer.name,
        rank: customer.rank,
        total_badges: customer.totalBadges,
        total_points: customer.totalPoints,
        message: index === 0 
          ? `🏆 Congratulations! You're #1 on the badge leaderboard with ${customer.totalBadges} badges!`
          : `🌟 Amazing! You're #${customer.rank} on the badge leaderboard! Keep earning badges to climb higher!`
      }))

      // Here you would integrate with your notification system
      // For now, we'll just return the notification data
    }

    return NextResponse.json({
      success: true,
      message: 'Leaderboard refreshed successfully',
      leaderboard: leaderboardData.leaderboard,
      statistics: leaderboardData.statistics,
      notifications_sent: notifications.length,
      notifications: trigger_notifications ? notifications : null
    })

  } catch (error) {
    console.error('Error refreshing badge leaderboard:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}