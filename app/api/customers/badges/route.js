import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateBadgeProgress, groupBadgesByCategory } from '../../../../utils/badgeSystem'

export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/customers/badges
 * Fetch customer badges with progress tracking
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const barbershopId = searchParams.get('barbershop_id')
    const includeProgress = searchParams.get('include_progress') === 'true'
    
    if (!customerId) {
      return NextResponse.json({
        success: false,
        error: 'customer_id parameter is required'
      }, { status: 400 })
    }

    // Get customer data for badge calculations
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

    // Verify barbershop access if provided
    if (barbershopId && customer.barbershop_id !== barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'Access denied to customer badges'
      }, { status: 403 })
    }

    // Get earned badges with badge definitions
    const { data: earnedBadges, error: earnedError } = await supabase
      .from('customer_badges')
      .select(`
        id,
        earned_at,
        progress_data,
        notification_sent,
        badge_definitions (
          id,
          badge_key,
          name,
          description,
          icon,
          color,
          image_url,
          category,
          rarity,
          points
        )
      `)
      .eq('customer_id', customerId)
      .order('earned_at', { ascending: false })

    if (earnedError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch earned badges',
        details: earnedError.message
      }, { status: 500 })
    }

    // Format earned badges
    const formattedEarnedBadges = (earnedBadges || []).map(badge => ({
      id: badge.id,
      earned_at: badge.earned_at,
      progress_data: badge.progress_data,
      notification_sent: badge.notification_sent,
      ...badge.badge_definitions
    }))

    let response = {
      success: true,
      customer_id: customerId,
      earned_badges: formattedEarnedBadges,
      total_badges: formattedEarnedBadges.length,
      total_points: formattedEarnedBadges.reduce((sum, badge) => sum + badge.points, 0),
      badges_by_category: groupBadgesByCategory(formattedEarnedBadges)
    }

    // Include progress data if requested
    if (includeProgress) {
      // Get all badge definitions
      const { data: allBadges, error: allBadgesError } = await supabase
        .from('badge_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (allBadgesError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch badge definitions',
          details: allBadgesError.message
        }, { status: 500 })
      }

      // Get additional customer stats for badge calculations
      const { data: customerStats, error: statsError } = await supabase
        .rpc('get_customer_badge_stats', { p_customer_id: customerId })

      const customerData = {
        ...customer,
        ...(customerStats || {}),
        referral_count: 0, // Will be calculated if needed
        early_arrivals: 0, // Will be calculated if needed
        birthday_visits: 0, // Will be calculated if needed
        review_count: 0 // Will be calculated if needed
      }

      // Calculate progress for unearned badges
      const earnedBadgeIds = new Set(formattedEarnedBadges.map(b => b.id))
      const unearnedBadges = (allBadges || []).filter(badge => !earnedBadgeIds.has(badge.id))

      const badgeProgress = unearnedBadges.map(badge => {
        const progress = calculateBadgeProgress(customerData, badge)
        return {
          ...badge,
          progress
        }
      })

      response.badge_progress = badgeProgress
      response.available_badges = allBadges?.length || 0
      response.completion_percentage = formattedEarnedBadges.length / (allBadges?.length || 1) * 100
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching customer badges:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * POST /api/customers/badges
 * Manually award a badge to a customer (admin function)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { customer_id, badge_key, progress_data = {}, admin_awarded = true } = body

    if (!customer_id || !badge_key) {
      return NextResponse.json({
        success: false,
        error: 'customer_id and badge_key are required'
      }, { status: 400 })
    }

    // Get badge definition
    const { data: badgeDefinition, error: badgeError } = await supabase
      .from('badge_definitions')
      .select('*')
      .eq('badge_key', badge_key)
      .eq('is_active', true)
      .single()

    if (badgeError || !badgeDefinition) {
      return NextResponse.json({
        success: false,
        error: 'Badge definition not found'
      }, { status: 404 })
    }

    // Check if customer already has this badge
    const { data: existingBadge, error: existingError } = await supabase
      .from('customer_badges')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('badge_definition_id', badgeDefinition.id)
      .single()

    if (existingBadge) {
      return NextResponse.json({
        success: false,
        error: 'Customer already has this badge'
      }, { status: 409 })
    }

    // Award the badge
    const { data: newBadge, error: awardError } = await supabase
      .from('customer_badges')
      .insert([{
        customer_id,
        badge_definition_id: badgeDefinition.id,
        progress_data: {
          ...progress_data,
          admin_awarded
        }
      }])
      .select(`
        id,
        earned_at,
        progress_data,
        badge_definitions (
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
      .single()

    if (awardError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to award badge',
        details: awardError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Badge awarded successfully',
      badge: {
        id: newBadge.id,
        earned_at: newBadge.earned_at,
        progress_data: newBadge.progress_data,
        ...newBadge.badge_definitions
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error awarding badge:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}