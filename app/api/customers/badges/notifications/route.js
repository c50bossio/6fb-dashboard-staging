import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getBadgeNotificationMessage } from '../../../../../utils/badgeSystem'

export const runtime = 'edge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/customers/badges/notifications
 * Get pending badge notifications for customers
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const barbershopId = searchParams.get('barbershop_id')
    const unsentOnly = searchParams.get('unsent_only') === 'true'
    const limit = parseInt(searchParams.get('limit')) || 50

    // Build query for badge notifications
    let query = supabase
      .from('customer_badges')
      .select(`
        id,
        customer_id,
        earned_at,
        notification_sent,
        notification_sent_at,
        progress_data,
        customers (
          id,
          name,
          email,
          phone,
          notification_preferences,
          barbershop_id
        ),
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
      .order('earned_at', { ascending: false })
      .limit(limit)

    // Filter by customer if specified
    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    // Filter by unsent notifications if specified
    if (unsentOnly) {
      query = query.eq('notification_sent', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch badge notifications',
        details: error.message
      }, { status: 500 })
    }

    // Filter by barbershop if specified
    const filteredNotifications = barbershopId 
      ? notifications?.filter(n => 
          n.customers?.barbershop_id === barbershopId || 
          n.customers?.shop_id === barbershopId
        ) 
      : notifications

    // Format notifications with enhanced data
    const formattedNotifications = (filteredNotifications || []).map(notification => {
      const badge = notification.badge_definitions
      const customer = notification.customers
      const notificationMessage = getBadgeNotificationMessage(badge)

      return {
        id: notification.id,
        customer_id: notification.customer_id,
        customer_name: customer?.name || 'Unknown Customer',
        customer_email: customer?.email,
        customer_phone: customer?.phone,
        notification_preferences: customer?.notification_preferences || {},
        badge: {
          id: badge.id,
          key: badge.badge_key,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          color: badge.color,
          category: badge.category,
          rarity: badge.rarity,
          points: badge.points
        },
        earned_at: notification.earned_at,
        notification_sent: notification.notification_sent,
        notification_sent_at: notification.notification_sent_at,
        progress_data: notification.progress_data,
        notification_message: notificationMessage,
        delivery_methods: getDeliveryMethods(customer?.notification_preferences || {})
      }
    })

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
      total_count: formattedNotifications.length,
      unsent_count: formattedNotifications.filter(n => !n.notification_sent).length,
      filters: {
        customer_id: customerId,
        barbershop_id: barbershopId,
        unsent_only: unsentOnly
      }
    })

  } catch (error) {
    console.error('Error fetching badge notifications:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * POST /api/customers/badges/notifications
 * Send badge notifications to customers
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { 
      notification_ids = [], 
      customer_id = null, 
      delivery_method = 'email', 
      send_all_unsent = false,
      barbershop_id = null
    } = body

    let notificationsToSend = []

    if (send_all_unsent) {
      // Get all unsent notifications
      let query = supabase
        .from('customer_badges')
        .select(`
          id,
          customer_id,
          customers (
            id,
            name,
            email,
            phone,
            notification_preferences,
            barbershop_id
          ),
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
        .eq('notification_sent', false)

      if (customer_id) {
        query = query.eq('customer_id', customer_id)
      }

      const { data: unsentNotifications, error: fetchError } = await query

      if (fetchError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch unsent notifications',
          details: fetchError.message
        }, { status: 500 })
      }

      notificationsToSend = unsentNotifications || []
    } else if (notification_ids.length > 0) {
      // Get specific notifications
      const { data: specificNotifications, error: fetchError } = await supabase
        .from('customer_badges')
        .select(`
          id,
          customer_id,
          customers (
            id,
            name,
            email,
            phone,
            notification_preferences,
            barbershop_id
          ),
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
        .in('id', notification_ids)
        .eq('notification_sent', false)

      if (fetchError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch specific notifications',
          details: fetchError.message
        }, { status: 500 })
      }

      notificationsToSend = specificNotifications || []
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either notification_ids or send_all_unsent must be specified'
      }, { status: 400 })
    }

    // Filter by barbershop if specified
    if (barbershopId) {
      notificationsToSend = notificationsToSend.filter(n => 
        n.customers?.barbershop_id === barbershopId || 
        n.customers?.shop_id === barbershopId
      )
    }

    if (notificationsToSend.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No notifications to send',
        sent_count: 0,
        failed_count: 0
      })
    }

    const sendResults = []
    const notificationIds = []

    // Process each notification
    for (const notification of notificationsToSend) {
      const customer = notification.customers
      const badge = notification.badge_definitions
      const notificationMessage = getBadgeNotificationMessage(badge)

      try {
        // Prepare notification data
        const notificationData = {
          customer_id: customer.id,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          badge_name: badge.name,
          badge_description: badge.description,
          badge_icon: badge.icon,
          badge_points: badge.points,
          notification_title: notificationMessage.title,
          notification_message: notificationMessage.message,
          delivery_method
        }

        // Here you would integrate with your actual notification service
        // For now, we'll simulate sending the notification
        const sendResult = await simulateNotificationSend(notificationData)
        
        if (sendResult.success) {
          notificationIds.push(notification.id)
          sendResults.push({
            notification_id: notification.id,
            customer_id: customer.id,
            customer_name: customer.name,
            badge_name: badge.name,
            success: true,
            delivery_method: sendResult.delivery_method
          })
        } else {
          sendResults.push({
            notification_id: notification.id,
            customer_id: customer.id,
            customer_name: customer.name,
            badge_name: badge.name,
            success: false,
            error: sendResult.error
          })
        }

      } catch (error) {
        sendResults.push({
          notification_id: notification.id,
          customer_id: customer.id,
          customer_name: customer.name,
          badge_name: badge.name,
          success: false,
          error: error.message
        })
      }
    }

    // Mark successful notifications as sent
    if (notificationIds.length > 0) {
      const { error: updateError } = await supabase
        .from('customer_badges')
        .update({
          notification_sent: true,
          notification_sent_at: new Date().toISOString()
        })
        .in('id', notificationIds)

      if (updateError) {
        console.error('Error marking notifications as sent:', updateError)
      }
    }

    const successCount = sendResults.filter(r => r.success).length
    const failedCount = sendResults.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} notification(s), ${failedCount} failed`,
      sent_count: successCount,
      failed_count: failedCount,
      results: sendResults
    })

  } catch (error) {
    console.error('Error sending badge notifications:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Helper function to determine delivery methods based on customer preferences
 */
function getDeliveryMethods(preferences) {
  const methods = []
  
  if (preferences.email !== false) {
    methods.push('email')
  }
  
  if (preferences.sms === true) {
    methods.push('sms')
  }
  
  if (preferences.push === true) {
    methods.push('push')
  }
  
  return methods.length > 0 ? methods : ['email'] // Default to email
}

/**
 * Simulate notification sending (replace with actual notification service)
 */
async function simulateNotificationSend(notificationData) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Simulate success/failure (90% success rate)
  const success = Math.random() > 0.1
  
  if (success) {
    return {
      success: true,
      delivery_method: notificationData.delivery_method,
      message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  } else {
    return {
      success: false,
      error: 'Simulated delivery failure'
    }
  }
}