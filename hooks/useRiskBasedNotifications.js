import { useState, useCallback } from 'react'

/**
 * useRiskBasedNotifications Hook
 * Integrates the risk-based notification system with React components
 * Provides easy-to-use functions for booking flow integration
 */
export function useRiskBasedNotifications() {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [lastResult, setLastResult] = useState(null)

  /**
   * Process notifications for a new booking
   * Call this immediately after booking confirmation
   */
  const processBookingNotifications = useCallback(async (bookingData) => {
    setProcessing(true)
    setError(null)
    
    try {
      console.log('Processing risk-based notifications for booking:', bookingData.booking_id)
      
      const response = await fetch('/api/customer-behavior/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_new_booking',
          booking_data: bookingData
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process booking notifications')
      }
      
      const result = await response.json()
      setLastResult(result)
      
      console.log(`Notification processing complete:`, {
        risk_tier: result.risk_assessment?.tier,
        scheduled_count: result.notifications_scheduled,
        strategy: result.strategy
      })
      
      return {
        success: true,
        risk_assessment: result.risk_assessment,
        notifications_scheduled: result.notifications_scheduled,
        strategy: result.strategy,
        message: result.message
      }
      
    } catch (err) {
      console.error('Error processing booking notifications:', err)
      setError(err.message)
      
      return {
        success: false,
        error: err.message
      }
    } finally {
      setProcessing(false)
    }
  }, [])

  /**
   * Update notification status (for webhook integrations)
   */
  const updateNotificationStatus = useCallback(async (notificationId, statusData) => {
    try {
      const response = await fetch('/api/customer-behavior/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_notification_status',
          notification_id: notificationId,
          booking_data: statusData
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update notification status')
      }
      
      return await response.json()
    } catch (err) {
      console.error('Error updating notification status:', err)
      throw err
    }
  }, [])

  /**
   * Reschedule notifications when appointment is rescheduled
   */
  const rescheduleNotifications = useCallback(async (rescheduleData) => {
    setProcessing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/customer-behavior/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reschedule_notifications',
          booking_data: rescheduleData
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reschedule notifications')
      }
      
      const result = await response.json()
      setLastResult(result)
      
      return result
    } catch (err) {
      console.error('Error rescheduling notifications:', err)
      setError(err.message)
      throw err
    } finally {
      setProcessing(false)
    }
  }, [])

  /**
   * Get communication history for a customer
   */
  const getCommunicationHistory = useCallback(async (customerId, barbershopId) => {
    try {
      const response = await fetch(
        `/api/customer-behavior/notifications?barbershop_id=${barbershopId}&customer_id=${customerId}&type=communication_history`
      )
      
      if (!response.ok) {
        throw new Error('Failed to get communication history')
      }
      
      return await response.json()
    } catch (err) {
      console.error('Error getting communication history:', err)
      throw err
    }
  }, [])

  /**
   * Get notification effectiveness metrics
   */
  const getEffectivenessMetrics = useCallback(async (barbershopId) => {
    try {
      const response = await fetch(
        `/api/customer-behavior/notifications?barbershop_id=${barbershopId}&type=effectiveness_metrics`
      )
      
      if (!response.ok) {
        throw new Error('Failed to get effectiveness metrics')
      }
      
      return await response.json()
    } catch (err) {
      console.error('Error getting effectiveness metrics:', err)
      throw err
    }
  }, [])

  /**
   * Helper function to format booking data for the notification system
   */
  const formatBookingData = useCallback((booking, customer, barbershop, service) => {
    return {
      booking_id: booking.id,
      customer_id: customer.id || booking.customer_id,
      barbershop_id: barbershop.id || booking.barbershop_id || booking.shop_id,
      appointment_time: booking.start_time || booking.appointment_time,
      service_name: service?.name || booking.service_name || 'Barbershop Service',
      customer_phone: customer.phone || booking.customer_phone,
      customer_email: customer.email || booking.customer_email,
      
      // Additional context that might be helpful
      duration_minutes: service?.duration_minutes || booking.duration_minutes || 30,
      price: service?.price || booking.price,
      barber_id: booking.barber_id,
      created_at: booking.created_at || new Date().toISOString()
    }
  }, [])

  /**
   * Integration helper for public booking flow
   * Simplifies the integration for the PublicBookingFlow component
   */
  const integrateWithPublicBooking = useCallback(async (bookingResult, customerData) => {
    if (!bookingResult || !bookingResult.booking || !customerData) {
      console.warn('Incomplete booking data provided to notification system')
      return { success: false, error: 'Incomplete booking data' }
    }

    try {
      // Extract data from booking result
      const { booking, barbershop, service } = bookingResult
      
      // Format for notification system
      const formattedData = formatBookingData(booking, customerData, barbershop, service)
      
      // Process notifications
      const result = await processBookingNotifications(formattedData)
      
      console.log('Public booking notification integration complete:', result)
      
      return result
    } catch (err) {
      console.error('Error in public booking notification integration:', err)
      return { success: false, error: err.message }
    }
  }, [formatBookingData, processBookingNotifications])

  /**
   * Get risk tier information for UI display
   */
  const getRiskTierInfo = useCallback((tier) => {
    const tierInfo = {
      green: {
        name: 'Reliable Customer',
        color: '#10B981',
        description: 'Low risk - minimal communication needed',
        strategy: 'Standard reminders to avoid over-communication'
      },
      yellow: {
        name: 'Moderate Risk',
        color: '#F59E0B', 
        description: 'Medium risk - enhanced confirmations',
        strategy: 'Multiple touchpoints with easy rescheduling options'
      },
      red: {
        name: 'High Risk',
        color: '#EF4444',
        description: 'High risk - white-glove treatment',
        strategy: 'Personal calls and detailed follow-up'
      }
    }
    
    return tierInfo[tier] || tierInfo.yellow
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setProcessing(false)
    setError(null)
    setLastResult(null)
  }, [])

  return {
    // State
    processing,
    error,
    lastResult,
    
    // Main functions
    processBookingNotifications,
    updateNotificationStatus,
    rescheduleNotifications,
    getCommunicationHistory,
    getEffectivenessMetrics,
    
    // Helper functions
    formatBookingData,
    integrateWithPublicBooking,
    getRiskTierInfo,
    
    // Utility functions
    clearError,
    reset
  }
}