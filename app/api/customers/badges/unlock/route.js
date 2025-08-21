import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * POST /api/customers/badges/unlock
 * Check for and unlock new badges for a customer based on their current stats
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { customer_id, trigger_event = 'manual_check' } = body

    if (!customer_id) {
      return NextResponse.json({
        success: false,
        error: 'customer_id is required'
      }, { status: 400 })
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, barbershop_id')
      .eq('id', customer_id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found'
      }, { status: 404 })
    }

    // Call the database function to check and award badges
    const { data: result, error: badgeError } = await supabase
      .rpc('check_and_award_badges', { p_customer_id: customer_id })

    if (badgeError) {
      console.error('Error checking badges:', badgeError)
      return NextResponse.json({
        success: false,
        error: 'Failed to check for new badges',
        details: badgeError.message
      }, { status: 500 })
    }

    const newlyEarnedBadges = result?.[0]?.newly_earned_badges || []

    // If badges were earned, mark them for notification
    if (newlyEarnedBadges.length > 0) {
      // Get the badge IDs that were just awarded
      const { data: recentBadges, error: recentError } = await supabase
        .from('customer_badges')
        .select('id, badge_definition_id')
        .eq('customer_id', customer_id)
        .eq('notification_sent', false)

      if (!recentError && recentBadges) {
        // Mark badges as needing notification
        const badgeIds = recentBadges.map(b => b.id)
        if (badgeIds.length > 0) {
          await supabase
            .from('customer_badges')
            .update({ notification_sent: false })
            .in('id', badgeIds)
        }
      }
    }

    // Update badge progress for all unearned badges
    const { error: progressError } = await supabase
      .rpc('update_badge_progress', { p_customer_id: customer_id })

    if (progressError) {
      console.warn('Failed to update badge progress:', progressError)
    }

    return NextResponse.json({
      success: true,
      customer_id,
      newly_earned_badges: newlyEarnedBadges,
      badges_earned_count: newlyEarnedBadges.length,
      trigger_event,
      message: newlyEarnedBadges.length > 0 
        ? `Congratulations! ${newlyEarnedBadges.length} new badge(s) earned!`
        : 'No new badges earned at this time.'
    })

  } catch (error) {
    console.error('Error unlocking badges:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * GET /api/customers/badges/unlock
 * Get badges ready to be unlocked for a customer (preview mode)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    
    if (!customerId) {
      return NextResponse.json({
        success: false,
        error: 'customer_id parameter is required'
      }, { status: 400 })
    }

    // Get customer data
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

    // Get already earned badges
    const { data: earnedBadgeIds, error: earnedError } = await supabase
      .from('customer_badges')
      .select('badge_definition_id')
      .eq('customer_id', customerId)

    const earnedIds = (earnedBadgeIds || []).map(b => b.badge_definition_id)

    // Get all active badge definitions not yet earned
    let query = supabase
      .from('badge_definitions')
      .select('*')
      .eq('is_active', true)

    if (earnedIds.length > 0) {
      query = query.not('id', 'in', `(${earnedIds.join(',')})`)
    }

    const { data: availableBadges, error: badgesError } = await query

    if (badgesError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch available badges',
        details: badgesError.message
      }, { status: 500 })
    }

    // Calculate progress for each badge and find eligible ones
    const { data: badgeProgress, error: progressError } = await supabase
      .rpc('calculate_badge_progress', { p_customer_id: customerId })

    const eligibleBadges = []
    const progressData = []

    if (!progressError && badgeProgress) {
      for (const progress of badgeProgress) {
        const badge = availableBadges?.find(b => b.id === progress.badge_definition_id)
        if (badge) {
          const progressInfo = {
            badge_definition_id: progress.badge_definition_id,
            badge_key: progress.badge_key,
            current_value: progress.current_value,
            target_value: progress.target_value,
            progress_percentage: progress.progress_percentage,
            ...badge
          }

          progressData.push(progressInfo)

          if (progress.progress_percentage >= 100) {
            eligibleBadges.push(progressInfo)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      customer_id: customerId,
      eligible_badges: eligibleBadges,
      eligible_count: eligibleBadges.length,
      progress_data: progressData.sort((a, b) => b.progress_percentage - a.progress_percentage),
      can_unlock: eligibleBadges.length > 0
    })

  } catch (error) {
    console.error('Error getting unlock preview:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}