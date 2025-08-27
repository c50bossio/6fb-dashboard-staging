/**
 * Cache Invalidation Service for Client Care System
 * 
 * Automatically invalidates cached client care results when data changes
 * that could affect client care recommendations (appointments, customer data, etc.)
 */

import { invalidateClientCareCache } from '@/lib/redis-client'

/**
 * Invalidate cache when appointment status changes
 */
export async function invalidateOnAppointmentChange(barbershopId, appointmentData, reason = 'appointment_change') {
  if (!barbershopId) {
    console.warn('⚠️ Cannot invalidate cache - missing barbershop ID')
    return false
  }

  try {
    // Determine if this change affects client care recommendations
    const affectingStatuses = ['no_show', 'cancelled', 'completed', 'rescheduled']
    const currentStatus = appointmentData?.status
    const previousStatus = appointmentData?.previous_status
    
    // Invalidate if status changed to/from affecting statuses
    if (affectingStatuses.includes(currentStatus) || affectingStatuses.includes(previousStatus)) {
      await invalidateClientCareCache(barbershopId, `${reason}: ${currentStatus}`)
      console.log(`🗑️ Cache invalidated for shop ${barbershopId} due to appointment ${reason}`)
      return true
    }
    
    return false
    
  } catch (error) {
    console.error('❌ Cache invalidation failed on appointment change:', error.message)
    return false
  }
}

/**
 * Invalidate cache when customer data changes
 */
export async function invalidateOnCustomerChange(barbershopId, customerData, reason = 'customer_change') {
  if (!barbershopId) {
    console.warn('⚠️ Cannot invalidate cache - missing barbershop ID')
    return false
  }

  try {
    // Check if changes affect client care scoring
    const affectingFields = ['total_visits', 'total_spent', 'last_visit_at', 'status']
    const hasAffectingChanges = affectingFields.some(field => 
      customerData.hasOwnProperty(field) || customerData.hasOwnProperty(`new_${field}`)
    )
    
    if (hasAffectingChanges) {
      await invalidateClientCareCache(barbershopId, `${reason}: customer data updated`)
      console.log(`🗑️ Cache invalidated for shop ${barbershopId} due to customer ${reason}`)
      return true
    }
    
    return false
    
  } catch (error) {
    console.error('❌ Cache invalidation failed on customer change:', error.message)
    return false
  }
}

/**
 * Scheduled cache refresh (for background jobs)
 */
export async function scheduledCacheRefresh(barbershopId, reason = 'scheduled_refresh') {
  if (!barbershopId) {
    console.warn('⚠️ Cannot refresh cache - missing barbershop ID')
    return false
  }

  try {
    await invalidateClientCareCache(barbershopId, reason)
    console.log(`🔄 Scheduled cache refresh for shop ${barbershopId}`)
    return true
    
  } catch (error) {
    console.error('❌ Scheduled cache refresh failed:', error.message)
    return false
  }
}

/**
 * Bulk cache invalidation for multiple shops (for system maintenance)
 */
export async function bulkCacheInvalidation(barbershopIds, reason = 'bulk_invalidation') {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  }

  for (const barbershopId of barbershopIds) {
    try {
      const success = await invalidateClientCareCache(barbershopId, reason)
      if (success) {
        results.successful++
      } else {
        results.failed++
      }
    } catch (error) {
      results.failed++
      results.errors.push({
        barbershop_id: barbershopId,
        error: error.message
      })
    }
  }

  console.log(`🗑️ Bulk cache invalidation completed: ${results.successful} successful, ${results.failed} failed`)
  return results
}

/**
 * Cache warming - preload cache with fresh data
 */
export async function warmClientCareCache(barbershopId, priorities = ['high', 'medium', 'low']) {
  if (!barbershopId) {
    console.warn('⚠️ Cannot warm cache - missing barbershop ID')
    return false
  }

  try {
    console.log(`🔥 Warming cache for shop ${barbershopId}...`)
    
    // Make requests to populate cache for different priority levels
    const warmingRequests = priorities.map(priority => {
      const url = `${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/client-care/needs-attention?priority=${priority}&limit=50`
      
      // Note: In a real implementation, we'd need to handle authentication properly
      // This is a simplified version for the warming concept
      return fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Would need proper authentication headers here
        }
      }).catch(error => {
        console.error(`❌ Cache warming failed for priority ${priority}:`, error.message)
      })
    })
    
    await Promise.allSettled(warmingRequests)
    console.log(`🔥 Cache warming completed for shop ${barbershopId}`)
    return true
    
  } catch (error) {
    console.error('❌ Cache warming failed:', error.message)
    return false
  }
}

/**
 * Smart cache invalidation - only invalidate if data significantly changed
 */
export async function smartCacheInvalidation(barbershopId, changeData) {
  if (!barbershopId) return false

  try {
    // Analyze the significance of changes
    let shouldInvalidate = false
    let reason = 'smart_invalidation'
    
    // High-impact changes that definitely need cache invalidation
    const highImpactChanges = [
      'new_no_show',
      'appointment_cancelled',
      'customer_returned',
      'bulk_data_import'
    ]
    
    // Medium-impact changes that might need invalidation
    const mediumImpactChanges = [
      'appointment_completed',
      'customer_updated',
      'service_price_changed'
    ]
    
    if (highImpactChanges.some(change => changeData.type === change)) {
      shouldInvalidate = true
      reason = `high_impact: ${changeData.type}`
    } else if (mediumImpactChanges.some(change => changeData.type === change)) {
      // For medium-impact changes, consider timing and frequency
      const hoursAgo = changeData.timestamp ? (Date.now() - new Date(changeData.timestamp)) / (1000 * 60 * 60) : 0
      
      // If it's recent (within last hour) or affects many records, invalidate
      if (hoursAgo <= 1 || (changeData.affected_count && changeData.affected_count > 5)) {
        shouldInvalidate = true
        reason = `medium_impact: ${changeData.type} (${changeData.affected_count || 1} affected)`
      }
    }
    
    if (shouldInvalidate) {
      await invalidateClientCareCache(barbershopId, reason)
      console.log(`🧠 Smart cache invalidation triggered for shop ${barbershopId}: ${reason}`)
    } else {
      console.log(`🧠 Smart cache invalidation skipped for shop ${barbershopId}: change not significant enough`)
    }
    
    return shouldInvalidate
    
  } catch (error) {
    console.error('❌ Smart cache invalidation failed:', error.message)
    return false
  }
}

// Webhook handlers for real-time invalidation
export const webhookHandlers = {
  /**
   * Handle Supabase real-time updates
   */
  supabaseRealtime: (payload) => {
    const { table, eventType, new: newRecord, old: oldRecord } = payload
    
    switch (table) {
      case 'appointments':
        if (eventType === 'UPDATE' && newRecord?.barbershop_id) {
          invalidateOnAppointmentChange(
            newRecord.barbershop_id, 
            { status: newRecord.status, previous_status: oldRecord?.status },
            'realtime_appointment_update'
          )
        }
        break
        
      case 'customers':
        if ((eventType === 'UPDATE' || eventType === 'INSERT') && newRecord?.barbershop_id) {
          invalidateOnCustomerChange(
            newRecord.barbershop_id,
            newRecord,
            'realtime_customer_update'
          )
        }
        break
    }
  },

  /**
   * Handle external webhook notifications
   */
  externalWebhook: async (source, data) => {
    try {
      switch (source) {
        case 'stripe':
          // Handle payment-related changes that might affect client status
          if (data.type === 'payment_intent.succeeded' && data.metadata?.barbershop_id) {
            await invalidateOnCustomerChange(
              data.metadata.barbershop_id,
              { payment_completed: true },
              'stripe_payment_success'
            )
          }
          break
          
        case 'calendar_sync':
          // Handle external calendar changes
          if (data.barbershop_id && data.appointment_changes) {
            await invalidateOnAppointmentChange(
              data.barbershop_id,
              data.appointment_changes,
              'calendar_sync_update'
            )
          }
          break
      }
    } catch (error) {
      console.error(`❌ External webhook cache invalidation failed for ${source}:`, error.message)
    }
  }
}

export default {
  invalidateOnAppointmentChange,
  invalidateOnCustomerChange,
  scheduledCacheRefresh,
  bulkCacheInvalidation,
  warmClientCareCache,
  smartCacheInvalidation,
  webhookHandlers
}