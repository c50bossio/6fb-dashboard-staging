import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { riskBasedNotifications } from '@/services/RiskBasedNotificationEngine'

/**
 * Risk-Based Notification API
 * Handles scheduling and management of intelligent customer communications
 * Integrates with booking flow for immediate post-booking risk assessment
 */

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { action, booking_data, notification_id } = await request.json()
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'process_new_booking':
        return await processNewBookingNotifications(booking_data)
      case 'update_notification_status':
        return await updateNotificationStatus(supabase, notification_id, booking_data)
      case 'get_customer_communication_history':
        return await getCommunicationHistory(supabase, booking_data.customer_id, booking_data.barbershop_id)
      case 'reschedule_notifications':
        return await rescheduleNotifications(supabase, booking_data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Risk-based notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to process notification request' },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(request.url)
    
    const barbershop_id = searchParams.get('barbershop_id')
    const type = searchParams.get('type') || 'summary'
    const customer_id = searchParams.get('customer_id')
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (type) {
      case 'effectiveness_metrics':
        return await getNotificationEffectiveness(supabase, barbershop_id)
      case 'upcoming_notifications':
        return await getUpcomingNotifications(supabase, barbershop_id)
      case 'communication_history':
        return await getCommunicationHistory(supabase, customer_id, barbershop_id)
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Notification retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve notification data' },
      { status: 500 }
    )
  }
}

/**
 * Process new booking through the risk-based notification engine
 * Called immediately after booking confirmation
 */
async function processNewBookingNotifications(bookingData) {
  try {
    // Validate required booking data
    const requiredFields = ['customer_id', 'barbershop_id', 'appointment_time', 'booking_id']
    const missingFields = requiredFields.filter(field => !bookingData[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`Processing risk-based notifications for booking ${bookingData.booking_id}`)

    // Process through the notification engine
    const result = await riskBasedNotifications.processNewBooking(bookingData)

    if (!result.success) {
      console.error('Notification processing failed:', result.error)
      
      if (result.fallback_applied) {
        return NextResponse.json({
          success: true,
          message: 'Basic notifications scheduled (risk assessment failed)',
          fallback_applied: true
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to process booking notifications' },
        { status: 500 }
      )
    }

    // Log successful processing for analytics
    await logNotificationMetrics(bookingData.barbershop_id, {
      risk_tier: result.risk_tier,
      scheduled_count: result.scheduled_count,
      communication_strategy: result.communication_strategy
    })

    return NextResponse.json({
      success: true,
      risk_assessment: {
        tier: result.risk_tier,
        score: result.risk_score
      },
      notifications_scheduled: result.scheduled_count,
      strategy: result.communication_strategy,
      message: `${result.scheduled_count} notifications scheduled for ${result.risk_tier}-tier customer`
    })

  } catch (error) {
    console.error('Error in processNewBookingNotifications:', error)
    return NextResponse.json(
      { error: 'Internal server error processing notifications' },
      { status: 500 }
    )
  }
}

/**
 * Update notification status (delivered, clicked, responded, etc.)
 */
async function updateNotificationStatus(supabase, notificationId, statusData) {
  try {
    const { error } = await supabase
      .from('scheduled_notifications')
      .update({
        status: statusData.status,
        delivered_at: statusData.delivered_at,
        clicked_at: statusData.clicked_at,
        responded_at: statusData.responded_at,
        response_data: statusData.response_data,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId)

    if (error) {
      throw new Error(`Failed to update notification status: ${error.message}`)
    }

    // If customer responded, update their engagement score
    if (statusData.status === 'responded') {
      await updateCustomerEngagementScore(supabase, statusData.customer_id, statusData.barbershop_id)
    }

    return NextResponse.json({
      success: true,
      message: 'Notification status updated successfully'
    })

  } catch (error) {
    console.error('Error updating notification status:', error)
    return NextResponse.json(
      { error: 'Failed to update notification status' },
      { status: 500 }
    )
  }
}

/**
 * Get communication history for a customer
 */
async function getCommunicationHistory(supabase, customerId, barbershopId) {
  try {
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select(`
        *,
        booking_notification_plans(communication_strategy)
      `)
      .eq('customer_id', customerId)
      .eq('barbershop_id', barbershopId)
      .order('scheduled_time', { ascending: false })
      .limit(20)

    if (error) {
      throw new Error(`Failed to get communication history: ${error.message}`)
    }

    // Calculate engagement metrics
    const totalNotifications = data.length
    const delivered = data.filter(n => n.status === 'delivered' || n.status === 'responded').length
    const responded = data.filter(n => n.status === 'responded').length
    
    const engagementRate = totalNotifications > 0 ? (responded / totalNotifications * 100).toFixed(1) : 0
    const deliveryRate = totalNotifications > 0 ? (delivered / totalNotifications * 100).toFixed(1) : 0

    return NextResponse.json({
      success: true,
      communication_history: data,
      metrics: {
        total_notifications: totalNotifications,
        delivery_rate: `${deliveryRate}%`,
        engagement_rate: `${engagementRate}%`,
        last_communication: data[0]?.scheduled_time || null
      }
    })

  } catch (error) {
    console.error('Error getting communication history:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve communication history' },
      { status: 500 }
    )
  }
}

/**
 * Reschedule notifications when appointment is rescheduled
 */
async function rescheduleNotifications(supabase, rescheduleData) {
  try {
    const { booking_id, new_appointment_time, customer_id, barbershop_id } = rescheduleData

    // Get existing notification plan
    const { data: existingPlan } = await supabase
      .from('booking_notification_plans')
      .select('*')
      .eq('booking_id', booking_id)
      .single()

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'No existing notification plan found' },
        { status: 404 }
      )
    }

    // Cancel pending notifications
    await supabase
      .from('scheduled_notifications')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('booking_id', booking_id)
      .eq('status', 'pending')

    // Generate new communication plan with updated timing
    const newBookingData = {
      ...rescheduleData,
      appointment_time: new_appointment_time
    }

    // Re-process through notification engine
    const result = await riskBasedNotifications.processNewBooking(newBookingData)

    return NextResponse.json({
      success: true,
      message: 'Notifications rescheduled successfully',
      new_schedule: {
        notifications_cancelled: 'pending notifications cancelled',
        notifications_scheduled: result.scheduled_count,
        strategy: result.communication_strategy
      }
    })

  } catch (error) {
    console.error('Error rescheduling notifications:', error)
    return NextResponse.json(
      { error: 'Failed to reschedule notifications' },
      { status: 500 }
    )
  }
}

/**
 * Get notification effectiveness metrics for barbershop dashboard
 */
async function getNotificationEffectiveness(supabase, barbershopId) {
  try {
    // Query notification performance by tier
    const { data: performance, error } = await supabase
      .from('notification_effectiveness_view')
      .select('*')
      .eq('barbershop_id', barbershopId)

    if (error) {
      console.error('Performance query error:', error)
    }

    // Fallback: Calculate metrics from base tables
    const { data: notifications } = await supabase
      .from('scheduled_notifications')
      .select(`
        *,
        booking_notification_plans(customer_risk_tier)
      `)
      .eq('barbershop_id', barbershopId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No notification data available',
        metrics: {
          total_notifications: 0,
          delivery_rate: 0,
          engagement_rate: 0,
          effectiveness_by_tier: {}
        }
      })
    }

    // Calculate effectiveness by tier
    const tierMetrics = {}
    const tiers = ['green', 'yellow', 'red']

    for (const tier of tiers) {
      const tierNotifications = notifications.filter(n => 
        n.booking_notification_plans?.customer_risk_tier === tier
      )
      
      const delivered = tierNotifications.filter(n => 
        ['delivered', 'responded'].includes(n.status)
      ).length
      
      const responded = tierNotifications.filter(n => 
        n.status === 'responded'
      ).length

      tierMetrics[tier] = {
        total: tierNotifications.length,
        delivery_rate: tierNotifications.length > 0 ? (delivered / tierNotifications.length * 100).toFixed(1) : 0,
        engagement_rate: tierNotifications.length > 0 ? (responded / tierNotifications.length * 100).toFixed(1) : 0
      }
    }

    // Overall metrics
    const totalDelivered = notifications.filter(n => 
      ['delivered', 'responded'].includes(n.status)
    ).length
    
    const totalResponded = notifications.filter(n => 
      n.status === 'responded'
    ).length

    return NextResponse.json({
      success: true,
      metrics: {
        total_notifications: notifications.length,
        delivery_rate: `${(totalDelivered / notifications.length * 100).toFixed(1)}%`,
        engagement_rate: `${(totalResponded / notifications.length * 100).toFixed(1)}%`,
        effectiveness_by_tier: tierMetrics,
        period: 'Last 30 days'
      }
    })

  } catch (error) {
    console.error('Error getting notification effectiveness:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve effectiveness metrics' },
      { status: 500 }
    )
  }
}

/**
 * Get upcoming notifications for barbershop dashboard
 */
async function getUpcomingNotifications(supabase, barbershopId) {
  try {
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select(`
        *,
        customers(name, phone),
        booking_notification_plans(customer_risk_tier, communication_strategy)
      `)
      .eq('barbershop_id', barbershopId)
      .eq('status', 'pending')
      .gte('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true })
      .limit(20)

    if (error) {
      throw new Error(`Failed to get upcoming notifications: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      upcoming_notifications: data,
      count: data.length
    })

  } catch (error) {
    console.error('Error getting upcoming notifications:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve upcoming notifications' },
      { status: 500 }
    )
  }
}

/**
 * Helper functions
 */

async function logNotificationMetrics(barbershopId, metrics) {
  // Implementation would log to analytics system
  console.log(`Notification metrics for ${barbershopId}:`, metrics)
}

async function updateCustomerEngagementScore(supabase, customerId, barbershopId) {
  // Update customer behavior score based on notification engagement
  try {
    const { error } = await supabase.rpc('update_customer_engagement_score', {
      p_customer_id: customerId,
      p_barbershop_id: barbershopId,
      p_engagement_improvement: 5 // Points for responding to notifications
    })

    if (error) {
      console.error('Failed to update engagement score:', error)
    }
  } catch (error) {
    console.error('Error updating engagement score:', error)
  }
}