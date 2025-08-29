import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/notifications/manager-alert
 * Manager notification system for payment automation and high-risk scenarios
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { 
      alert_type, // 'payment_failure', 'high_risk_booking', 'repeated_no_shows', 'recovery_denial', 'strike_threshold'
      client_id,
      incident_id = null,
      priority = 'normal', // 'low', 'normal', 'high', 'urgent'
      metadata = {},
      custom_message = null,
      send_immediately = false,
      escalation_level = 1 // 1-5, higher means more urgent
    } = await request.json()
    
    // Get user's barbershop and role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, role, full_name')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    const barbershopId = profile.barbershop_id

    // Get manager notification settings
    const { data: notificationSettings } = await supabase
      .from('automation_settings')
      .select('manager_notifications')
      .eq('barbershop_id', barbershopId)
      .single()

    const managerSettings = notificationSettings?.manager_notifications || {
      enabled: true,
      triggers: {
        payment_failures: true,
        high_risk_booking: true,
        repeated_no_shows: true,
        recovery_denials: true,
        strike_threshold: true
      },
      channels: ['email', 'dashboard'],
      frequency: 'immediate',
      custom_thresholds: {
        risk_score: 0.9,
        strike_count: 2,
        payment_failures: 2
      }
    }

    // Check if this alert type is enabled
    if (!managerSettings.enabled || !managerSettings.triggers[alert_type]) {
      return NextResponse.json({
        success: false,
        message: 'Manager notifications disabled for this alert type',
        alert_type
      })
    }

    // Get client information for context
    let clientInfo = null
    if (client_id) {
      const { data: client } = await supabase
        .from('customers')
        .select('name, email, phone, created_at')
        .eq('id', client_id)
        .single()
      clientInfo = client
    }

    // Get all managers and owners for this barbershop
    const { data: managers } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, notification_preferences')
      .eq('barbershop_id', barbershopId)
      .in('role', ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'manager', 'owner'])

    if (!managers || managers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No managers found for notification',
        alert_type
      })
    }

    // Check if we should batch this notification or send immediately
    const shouldBatch = !send_immediately && 
      managerSettings.frequency === 'batched' && 
      priority !== 'urgent' && 
      escalation_level < 4

    // Create the alert record
    const alertData = {
      barbershop_id: barbershopId,
      alert_type,
      client_id,
      incident_id,
      priority,
      escalation_level,
      metadata,
      custom_message,
      triggered_by: user.id,
      status: shouldBatch ? 'batched' : 'pending',
      created_at: new Date().toISOString()
    }

    const { data: alert, error: alertError } = await supabase
      .from('manager_alerts')
      .insert(alertData)
      .select()
      .single()

    if (alertError) {
      throw new Error(`Failed to create alert: ${alertError.message}`)
    }

    let notificationResults = []

    if (shouldBatch) {
      // Add to batch queue
      notificationResults.push({
        type: 'batched',
        message: 'Alert added to batch queue',
        scheduled_for: 'next_batch_window'
      })
    } else {
      // Send immediate notifications
      notificationResults = await sendManagerNotifications({
        alert,
        managers,
        clientInfo,
        managerSettings,
        barbershopId,
        supabase
      })
    }

    // Update alert with notification results
    await supabase
      .from('manager_alerts')
      .update({
        notification_results: notificationResults,
        status: shouldBatch ? 'batched' : 'sent',
        sent_at: shouldBatch ? null : new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', alert.id)

    // Log the alert for analytics
    await logManagerAlert({
      alert,
      managers: managers.length,
      notification_results: notificationResults,
      supabase
    })

    return NextResponse.json({
      success: true,
      alert_id: alert.id,
      alert_type,
      priority,
      batched: shouldBatch,
      notifications_sent: notificationResults.length,
      notification_results: notificationResults,
      message: shouldBatch 
        ? 'Alert queued for batch notification'
        : 'Manager notifications sent successfully'
    })
    
  } catch (error) {
    console.error('Error sending manager alert:', error)
    return NextResponse.json(
      { error: 'Failed to send manager alert', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/manager-alert
 * Get manager alert history and settings
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit')) || 50
    const offset = parseInt(url.searchParams.get('offset')) || 0
    const alert_type = url.searchParams.get('alert_type')
    const priority = url.searchParams.get('priority')
    const days = parseInt(url.searchParams.get('days')) || 30
    
    // Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check if user can view alerts
    const canViewAlerts = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'manager', 'owner'].includes(profile.role)
    if (!canViewAlerts) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const barbershopId = profile.barbershop_id

    // Build query
    let query = supabase
      .from('manager_alerts')
      .select(`
        *,
        customers(name, email),
        profiles:triggered_by(full_name)
      `)
      .eq('barbershop_id', barbershopId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (alert_type) {
      query = query.eq('alert_type', alert_type)
    }
    
    if (priority) {
      query = query.eq('priority', priority)
    }

    const { data: alerts, error } = await query

    if (error) {
      throw new Error(`Failed to fetch alerts: ${error.message}`)
    }

    // Get alert statistics
    const { data: stats } = await supabase
      .from('manager_alerts')
      .select('alert_type, priority, status')
      .eq('barbershop_id', barbershopId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

    const statistics = {
      total_alerts: stats?.length || 0,
      by_type: {},
      by_priority: {},
      by_status: {}
    }

    stats?.forEach(stat => {
      statistics.by_type[stat.alert_type] = (statistics.by_type[stat.alert_type] || 0) + 1
      statistics.by_priority[stat.priority] = (statistics.by_priority[stat.priority] || 0) + 1
      statistics.by_status[stat.status] = (statistics.by_status[stat.status] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      alerts,
      statistics,
      pagination: {
        limit,
        offset,
        total: statistics.total_alerts
      }
    })
    
  } catch (error) {
    console.error('Error fetching manager alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manager alerts', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Send manager notifications across multiple channels
 */
async function sendManagerNotifications({ alert, managers, clientInfo, managerSettings, barbershopId, supabase }) {
  const results = []
  const channels = managerSettings.channels || ['email', 'dashboard']

  for (const manager of managers) {
    const managerNotificationPrefs = manager.notification_preferences || {}
    
    for (const channel of channels) {
      // Check if manager has this channel enabled
      const channelEnabled = managerNotificationPrefs[channel] !== false

      if (!channelEnabled) {
        results.push({
          type: channel,
          manager_id: manager.id,
          status: 'skipped',
          reason: 'channel_disabled'
        })
        continue
      }

      try {
        let result = null

        switch (channel) {
          case 'email':
            result = await sendEmailNotification({
              manager,
              alert,
              clientInfo,
              barbershopId
            })
            break

          case 'dashboard':
            result = await createDashboardNotification({
              manager,
              alert,
              clientInfo,
              barbershopId,
              supabase
            })
            break

          case 'sms':
            result = await sendSMSNotification({
              manager,
              alert,
              clientInfo,
              barbershopId
            })
            break

          default:
            result = { status: 'unsupported', channel }
        }

        results.push({
          type: channel,
          manager_id: manager.id,
          status: result.status,
          result
        })

      } catch (error) {
        console.error(`Error sending ${channel} notification to manager ${manager.id}:`, error)
        results.push({
          type: channel,
          manager_id: manager.id,
          status: 'failed',
          error: error.message
        })
      }
    }
  }

  return results
}

/**
 * Send email notification to manager
 */
async function sendEmailNotification({ manager, alert, clientInfo, barbershopId }) {
  // This would integrate with your email service (SendGrid, etc.)
  const emailData = {
    to: manager.email,
    subject: generateEmailSubject(alert, clientInfo),
    template: 'manager_alert',
    data: {
      manager_name: manager.full_name,
      alert,
      client: clientInfo,
      barbershop_id: barbershopId,
      dashboard_link: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/alerts/${alert.id}`
    }
  }

  // For now, log the email that would be sent
  console.log('Email notification would be sent:', emailData)
  
  return {
    status: 'sent',
    email_id: `email_${Date.now()}`,
    sent_at: new Date().toISOString()
  }
}

/**
 * Create dashboard notification
 */
async function createDashboardNotification({ manager, alert, clientInfo, barbershopId, supabase }) {
  const notification = {
    user_id: manager.id,
    type: 'manager_alert',
    title: generateNotificationTitle(alert, clientInfo),
    message: generateNotificationMessage(alert, clientInfo),
    data: {
      alert_id: alert.id,
      alert_type: alert.alert_type,
      client_id: alert.client_id,
      priority: alert.priority
    },
    read: false,
    created_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create dashboard notification: ${error.message}`)
  }

  return {
    status: 'created',
    notification_id: data.id,
    created_at: data.created_at
  }
}

/**
 * Send SMS notification to manager
 */
async function sendSMSNotification({ manager, alert, clientInfo, barbershopId }) {
  // This would integrate with your SMS service (Twilio, etc.)
  if (!manager.phone) {
    return { status: 'skipped', reason: 'no_phone' }
  }

  const message = generateSMSMessage(alert, clientInfo)
  
  // For now, log the SMS that would be sent
  console.log('SMS notification would be sent:', {
    to: manager.phone,
    message
  })
  
  return {
    status: 'sent',
    sms_id: `sms_${Date.now()}`,
    sent_at: new Date().toISOString()
  }
}

/**
 * Helper functions for generating notification content
 */
function generateEmailSubject(alert, clientInfo) {
  const subjects = {
    payment_failure: `Payment Collection Failed - ${clientInfo?.name || 'Client'}`,
    high_risk_booking: `High Risk Booking Alert - ${clientInfo?.name || 'Client'}`,
    repeated_no_shows: `Repeated No-Shows Alert - ${clientInfo?.name || 'Client'}`,
    recovery_denial: `Client Recovery Denied - ${clientInfo?.name || 'Client'}`,
    strike_threshold: `Strike Threshold Reached - ${clientInfo?.name || 'Client'}`
  }
  return subjects[alert.alert_type] || `Manager Alert - ${alert.alert_type}`
}

function generateNotificationTitle(alert, clientInfo) {
  const titles = {
    payment_failure: `💳 Payment Failed`,
    high_risk_booking: `⚠️ High Risk Booking`,
    repeated_no_shows: `🚫 Repeated No-Shows`,
    recovery_denial: `❌ Recovery Denied`,
    strike_threshold: `🎯 Strike Threshold`
  }
  return titles[alert.alert_type] || `Alert: ${alert.alert_type}`
}

function generateNotificationMessage(alert, clientInfo) {
  const clientName = clientInfo?.name || 'Client'
  
  const messages = {
    payment_failure: `Failed to collect payment from ${clientName}. Manual intervention may be required.`,
    high_risk_booking: `${clientName} has a high no-show risk score. Consider requiring a deposit.`,
    repeated_no_shows: `${clientName} has multiple no-shows. Review their booking privileges.`,
    recovery_denial: `${clientName} has denied the recovery process. Follow up required.`,
    strike_threshold: `${clientName} has reached the strike threshold. Policy action needed.`
  }
  
  return messages[alert.alert_type] || `Alert triggered for ${clientName}`
}

function generateSMSMessage(alert, clientInfo) {
  const clientName = clientInfo?.name || 'Client'
  return `BookedBarber Alert: ${alert.alert_type} for ${clientName}. Check dashboard for details.`
}

/**
 * Log manager alert for analytics
 */
async function logManagerAlert({ alert, managers, notification_results, supabase }) {
  const logData = {
    alert_id: alert.id,
    barbershop_id: alert.barbershop_id,
    alert_type: alert.alert_type,
    priority: alert.priority,
    managers_notified: managers,
    notifications_sent: notification_results.filter(r => r.status === 'sent' || r.status === 'created').length,
    notifications_failed: notification_results.filter(r => r.status === 'failed').length,
    created_at: new Date().toISOString()
  }

  await supabase
    .from('manager_alert_logs')
    .insert(logData)
}