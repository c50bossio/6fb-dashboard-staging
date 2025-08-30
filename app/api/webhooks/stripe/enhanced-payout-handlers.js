/**
 * Enhanced Payout Webhook Handlers Integration
 * This module integrates the enhanced payout webhook handlers with the existing Stripe webhook system
 * It extends the current webhook route with comprehensive payout history tracking
 */

import {
  enhancedHandleTransferCreated,
  enhancedHandleTransferPaid,
  enhancedHandleTransferFailed,
  enhancedHandleTransferReversed
} from '@/lib/enhanced-payout-webhook-handlers'

/**
 * Enhanced Transfer Event Handlers
 * These replace/augment the existing transfer handlers in the main webhook route
 */

export async function handleEnhancedTransferCreated(transfer) {
  try {

    // Call the enhanced handler
    const result = await enhancedHandleTransferCreated(transfer)
    
    if (result.success) {

      // Trigger real-time updates if needed
      await triggerRealTimeUpdate('transfer_created', {
        transfer_id: transfer.id,
        payout_record_id: result.payout_record_id,
        status: 'processing',
        amount: transfer.amount / 100
      })
      
      return result
    } else {
      console.warn(`⚠️ Enhanced transfer.created processing failed: ${result.reason}`)
      return result
    }
    
  } catch (error) {
    console.error('Error in enhanced transfer.created handler:', error)
    return { success: false, error: error.message }
  }
}

export async function handleEnhancedTransferPaid(transfer) {
  try {

    // Call the enhanced handler
    const result = await enhancedHandleTransferPaid(transfer)
    
    if (result.success) {

      // Trigger real-time updates and notifications
      await triggerRealTimeUpdate('transfer_paid', {
        transfer_id: transfer.id,
        payout_record_id: result.payout_record_id,
        status: 'completed',
        amount: result.completed_amount
      })
      
      // Trigger performance metrics update
      await triggerPerformanceUpdate(result.payout_record_id)
      
      return result
    } else {
      console.warn(`⚠️ Enhanced transfer.paid processing failed: ${result.reason}`)
      return result
    }
    
  } catch (error) {
    console.error('Error in enhanced transfer.paid handler:', error)
    return { success: false, error: error.message }
  }
}

export async function handleEnhancedTransferFailed(transfer) {
  try {

    // Call the enhanced handler
    const result = await enhancedHandleTransferFailed(transfer)
    
    if (result.success) {

      // Trigger real-time updates and failure notifications
      await triggerRealTimeUpdate('transfer_failed', {
        transfer_id: transfer.id,
        payout_record_id: result.payout_record_id,
        status: 'failed',
        failure_code: result.failure_code,
        retry_eligible: result.retry_eligible
      })
      
      // Schedule retry if eligible
      if (result.retry_eligible) {
        await schedulePayoutRetry(result.payout_record_id)
      }
      
      return result
    } else {
      console.warn(`⚠️ Enhanced transfer.failed processing failed: ${result.reason}`)
      return result
    }
    
  } catch (error) {
    console.error('Error in enhanced transfer.failed handler:', error)
    return { success: false, error: error.message }
  }
}

export async function handleEnhancedTransferReversed(transfer) {
  try {

    // Call the enhanced handler
    const result = await enhancedHandleTransferReversed(transfer)
    
    if (result.success) {

      // Trigger real-time updates and reversal notifications
      await triggerRealTimeUpdate('transfer_reversed', {
        transfer_id: transfer.id,
        payout_record_id: result.payout_record_id,
        status: 'reversed',
        reversed_amount: result.reversed_amount
      })
      
      // Alert admin about reversal
      await triggerAdminAlert('payout_reversed', {
        payout_record_id: result.payout_record_id,
        transfer_id: transfer.id,
        amount: result.reversed_amount
      })
      
      return result
    } else {
      console.warn(`⚠️ Enhanced transfer.reversed processing failed: ${result.reason}`)
      return result
    }
    
  } catch (error) {
    console.error('Error in enhanced transfer.reversed handler:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Enhanced Payout Event Handlers
 * Handle Stripe payout events (different from transfers - these are platform payouts)
 */

export async function handleEnhancedPayoutCreated(payout) {
  try {

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Find connected account
    const { data: account } = await supabase
      .from('stripe_connected_accounts')
      .select('id, user_id, barberbarbershop_id')
      .eq('stripe_account_id', payout.account)
      .single()
    
    if (!account) {
      console.warn(`No connected account found for payout: ${payout.id}`)
      return { success: false, reason: 'no_connected_account' }
    }
    
    // Create comprehensive payout tracking record
    const { data: payoutTracking, error: trackingError } = await supabase
      .from('stripe_payout_tracking')
      .insert({
        stripe_payout_id: payout.id,
        connected_account_id: account.id,
        barberbarbershop_id: account.barberbarbershop_id,
        amount: payout.amount / 100,
        currency: payout.currency,
        payout_type: payout.type,
        method: payout.method,
        status: payout.status,
        description: payout.description,
        statement_descriptor: payout.statement_descriptor,
        arrival_date: new Date(payout.arrival_date * 1000),
        created_at: new Date(payout.created * 1000),
        metadata: {
          automatic: payout.automatic,
          method_details: payout.method_details,
          failure_details: payout.failure_code ? {
            code: payout.failure_code,
            message: payout.failure_message
          } : null
        }
      })
      .select()
      .single()
    
    if (trackingError) {
      console.error('Error creating payout tracking record:', trackingError)
      return { success: false, error: trackingError.message }
    }
    
    // Update performance metrics
    await updateBarberPayoutMetrics(account.barberbarbershop_id, {
      payout_initiated: true,
      amount: payout.amount / 100,
      expected_arrival: new Date(payout.arrival_date * 1000)
    })

    return {
      success: true,
      payout_tracking_id: payoutTracking.id,
      expected_arrival: new Date(payout.arrival_date * 1000)
    }
    
  } catch (error) {
    console.error('Error in enhanced payout.created handler:', error)
    return { success: false, error: error.message }
  }
}

export async function handleEnhancedPayoutPaid(payout) {
  try {

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Update payout tracking record
    const { error: updateError } = await supabase
      .from('stripe_payout_tracking')
      .update({
        status: 'paid',
        paid_at: new Date(),
        metadata: supabase.raw(`
          COALESCE(metadata, '{}') || '${JSON.stringify({
            paid_at: new Date().toISOString(),
            processing_time_hours: Math.round(((new Date().getTime() - (payout.created * 1000)) / (1000 * 60 * 60)) * 100) / 100
          })}'::jsonb
        `)
      })
      .eq('stripe_payout_id', payout.id)
    
    if (updateError) {
      console.error('Error updating payout tracking:', updateError)
    }
    
    // Update barbershop payout statistics
    const { data: account } = await supabase
      .from('stripe_connected_accounts')
      .select('barberbarbershop_id')
      .eq('stripe_account_id', payout.account)
      .single()
    
    if (account) {
      await updateBarberPayoutMetrics(account.barberbarbershop_id, {
        payout_completed: true,
        amount: payout.amount / 100,
        completion_time: new Date()
      })
    }

    return { success: true, amount: payout.amount / 100 }
    
  } catch (error) {
    console.error('Error in enhanced payout.paid handler:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Integration Helper Functions
 */

async function triggerRealTimeUpdate(eventType, data) {
  try {
    // In production, this would trigger WebSocket updates or Server-Sent Events
    // For now, we'll log the update and could trigger push notifications

    // Could integrate with services like:
    // - WebSocket server for real-time dashboard updates
    // - Push notification service for mobile apps
    // - Slack/Discord notifications for admin alerts
    // - Email notifications for critical events
    
    // Example: Send to WebSocket server
    if (process.env.WEBSOCKET_SERVER_URL) {
      try {
        const response = await fetch(`${process.env.WEBSOCKET_SERVER_URL}/broadcast`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WEBSOCKET_API_KEY}`
          },
          body: JSON.stringify({
            event: eventType,
            data: data,
            timestamp: new Date().toISOString()
          })
        })
        
        if (!response.ok) {
          console.warn('WebSocket broadcast failed:', response.status)
        }
      } catch (wsError) {
        console.warn('WebSocket error:', wsError.message)
      }
    }
    
  } catch (error) {
    console.error('Error triggering real-time update:', error)
  }
}

async function triggerPerformanceUpdate(payoutRecordId) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Get barbershop ID from payout record
    const { data: payout } = await supabase
      .from('commission_payout_records')
      .select('barberbarbershop_id')
      .eq('id', payoutRecordId)
      .single()
    
    if (payout) {
      // Calculate today's metrics
      const today = new Date().toISOString().split('T')[0]
      
      await supabase.rpc('calculate_payout_performance_metrics', {
        p_barberbarbershop_id: payout.barberbarbershop_id,
        p_metric_date: today,
        p_metric_period: 'daily'
      })
    }
    
  } catch (error) {
    console.error('Error triggering performance update:', error)
  }
}

async function schedulePayoutRetry(payoutRecordId) {
  try {
    // In production, this would integrate with a job queue system
    // For now, we'll mark the payout as retry-eligible
    
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    await supabase
      .from('commission_payout_records')
      .update({
        metadata: supabase.raw(`
          COALESCE(metadata, '{}') || '${JSON.stringify({
            retry_scheduled: true,
            next_retry_at: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(), // 24 hours
            retry_reason: 'automatic_retry_after_failure'
          })}'::jsonb
        `)
      })
      .eq('id', payoutRecordId)

  } catch (error) {
    console.error('Error scheduling payout retry:', error)
  }
}

async function triggerAdminAlert(alertType, data) {
  try {
    // Integration with admin notification system

    // Could integrate with:
    // - Slack webhook
    // - Discord webhook  
    // - Email notification
    // - SMS alert
    // - Dashboard notification
    
    const alertMessage = generateAlertMessage(alertType, data)
    
    // Example: Send to Slack
    if (process.env.SLACK_ADMIN_WEBHOOK) {
      try {
        const response = await fetch(process.env.SLACK_ADMIN_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: alertMessage,
            username: '6FB Payout System',
            icon_emoji: ':warning:',
            attachments: [{
              color: 'danger',
              fields: [
                {
                  title: 'Payout ID',
                  value: data.payout_record_id,
                  short: true
                },
                {
                  title: 'Amount',
                  value: `$${data.amount}`,
                  short: true
                }
              ],
              timestamp: Math.floor(Date.now() / 1000)
            }]
          })
        })
        
        if (!response.ok) {
          console.warn('Slack alert failed:', response.status)
        }
      } catch (slackError) {
        console.warn('Slack error:', slackError.message)
      }
    }
    
  } catch (error) {
    console.error('Error triggering admin alert:', error)
  }
}

function generateAlertMessage(alertType, data) {
  const messages = {
    payout_reversed: `🔄 **Payout Reversed Alert**\nPayout ${data.payout_record_id} for $${data.amount} has been reversed by Stripe. Immediate attention required.`,
    payout_failed: `❌ **Payout Failed Alert**\nPayout ${data.payout_record_id} for $${data.amount} has failed. Review required.`,
    reconciliation_discrepancy: `⚠️ **Reconciliation Discrepancy**\nDiscrepancy detected in payout reconciliation. Amount: $${data.amount}`
  }
  
  return messages[alertType] || `Alert: ${alertType}`
}

async function updateBarberPayoutMetrics(barberbarbershopId, metrics) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Update daily metrics
    const today = new Date().toISOString().split('T')[0]
    
    const updateData = {}
    
    if (metrics.payout_initiated) {
      updateData.total_payouts_count = supabase.raw('total_payouts_count + 1')
      updateData.total_payouts_amount = supabase.raw(`total_payouts_amount + ${metrics.amount}`)
    }
    
    if (metrics.payout_completed) {
      updateData.successful_payouts_count = supabase.raw('successful_payouts_count + 1')
      
      if (metrics.completion_time && metrics.expected_arrival) {
        const processingHours = (metrics.completion_time - metrics.expected_arrival) / (1000 * 60 * 60)
        updateData.average_processing_time_hours = supabase.raw(
          `(COALESCE(average_processing_time_hours, 0) * GREATEST(successful_payouts_count - 1, 0) + ${processingHours}) / successful_payouts_count`
        )
      }
    }
    
    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('payout_performance_metrics')
        .upsert({
          barberbarbershop_id: barberbarbershopId,
          metric_date: today,
          metric_period: 'daily',
          ...updateData,
          calculated_at: new Date().toISOString()
        }, {
          onConflict: 'barberbarbershop_id,metric_date,metric_period'
        })
    }
    
  } catch (error) {
    console.error('Error updating barber payout metrics:', error)
  }
}

// Export all enhanced handlers for use in the main webhook route
export {
  handleEnhancedTransferCreated as handleTransferCreated,
  handleEnhancedTransferPaid as handleTransferPaid,  
  handleEnhancedTransferFailed as handleTransferFailed,
  handleEnhancedTransferReversed as handleTransferReversed,
  handleEnhancedPayoutCreated as handlePayoutCreated,
  handleEnhancedPayoutPaid as handlePayoutPaid
}