import { useState, useEffect, useCallback, useRef } from 'react'
import { cacheManager } from '@/lib/booking-rules-engine/RuleCache'
import { getRuleRealtimeSync } from '@/lib/booking-rules-engine/RuleRealtimeSync'
import { FieldNormalizer } from '@/lib/booking-rules-engine/FieldNormalizer'

/**
 * Hook for integrating booking rules engine with React components
 * 
 * Features:
 * - Automatic rule loading and caching
 * - Real-time rule evaluation
 * - Available slot calculation
 * - Error handling and retry logic
 * - Supabase Realtime synchronization
 * - Automatic field name normalization
 */
export function useBookingRules(barbershopId) {
  const [rules, setRules] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState([])
  const [syncStatus, setSyncStatus] = useState('disconnected')
  const cache = useRef(null)
  const realtimeSync = useRef(null)
  const retryCount = useRef(0)
  const maxRetries = 3

  // Initialize cache and realtime sync on mount
  useEffect(() => {
    if (barbershopId) {
      cache.current = cacheManager.getCache(barbershopId)
      realtimeSync.current = getRuleRealtimeSync()
    }
  }, [barbershopId])

  // Load rules
  const loadRules = useCallback(async (force = false) => {
    if (!barbershopId) return

    try {
      setLoading(true)
      setError(null)

      // Check cache first unless force reload
      if (!force && cache.current) {
        const cachedRules = await cache.current.get()
        if (cachedRules) {
          setRules(cachedRules)
          setLoading(false)
          return
        }
      }

      // Fetch from API
      const response = await fetch(`/api/booking-rules?barbershop_id=${barbershopId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load rules: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Normalize rules to snake_case for consistency
        const normalizedRules = FieldNormalizer.normalizeObject(data.rules, true)
        setRules(normalizedRules)
        
        // Cache the normalized rules
        if (cache.current) {
          await cache.current.set(normalizedRules)
        }
        
        retryCount.current = 0
      } else {
        throw new Error(data.error || 'Failed to load rules')
      }
    } catch (err) {
      console.error('Error loading booking rules:', err)
      setError(err.message)
      
      // Retry logic
      if (retryCount.current < maxRetries) {
        retryCount.current++
        setTimeout(() => loadRules(force), 1000 * Math.pow(2, retryCount.current))
      }
    } finally {
      setLoading(false)
    }
  }, [barbershopId])

  // Load rules on mount and when barbershopId changes
  useEffect(() => {
    loadRules()
  }, [barbershopId, loadRules])

  /**
   * Evaluate a booking request against the rules
   */
  const evaluateBooking = useCallback(async (bookingRequest) => {
    if (!barbershopId) {
      return {
        allowed: false,
        violations: [{ code: 'NO_BARBERSHOP', message: 'No barbershop selected' }],
        warnings: []
      }
    }

    try {
      setEvaluating(true)

      const response = await fetch('/api/booking-rules/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...bookingRequest,
          barbershop_id: barbershopId
        })
      })

      if (!response.ok) {
        throw new Error(`Evaluation failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        return data.evaluation
      } else {
        throw new Error(data.error || 'Evaluation failed')
      }
    } catch (err) {
      console.error('Error evaluating booking:', err)
      
      // Return a safe default that blocks the booking
      return {
        allowed: false,
        violations: [{ 
          code: 'EVALUATION_ERROR', 
          message: 'Unable to validate booking at this time' 
        }],
        warnings: [],
        error: err.message
      }
    } finally {
      setEvaluating(false)
    }
  }, [barbershopId])

  /**
   * Get available time slots for a specific date
   */
  const getAvailableSlots = useCallback(async (date, barberId, serviceId, duration) => {
    if (!rules || !date) return []

    try {
      // Convert camelCase to snake_case for consistency
      const businessHours = rules.business_hours || rules.businessHours || {}
      const slotIntervals = rules.slot_intervals || rules.slotIntervals || [30]
      const bufferTime = rules.buffer_between_appointments || rules.bufferBetweenAppointments || 0

      const dayOfWeek = new Date(date).toLocaleLowerCase('en-US', { weekday: 'long' }).toLowerCase()
      const dayHours = businessHours[dayOfWeek]

      if (!dayHours || dayHours.closed) {
        return []
      }

      // Generate base slots
      const slots = []
      const [openHour, openMin] = dayHours.open.split(':').map(Number)
      const [closeHour, closeMin] = dayHours.close.split(':').map(Number)

      let currentTime = new Date(date)
      currentTime.setHours(openHour, openMin, 0, 0)

      const closeTime = new Date(date)
      closeTime.setHours(closeHour, closeMin, 0, 0)

      const slotInterval = slotIntervals[0] || 30
      const slotDuration = (duration || 30) + bufferTime

      while (currentTime.getTime() + slotDuration * 60 * 1000 <= closeTime.getTime()) {
        // Check if this slot passes rule evaluation
        const evaluation = await evaluateBooking({
          date: date,
          time: `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`,
          barber_id: barberId,
          service_id: serviceId,
          duration: duration || 30
        })

        slots.push({
          time: `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`,
          available: evaluation.allowed,
          violations: evaluation.violations,
          warnings: evaluation.warnings
        })

        currentTime = new Date(currentTime.getTime() + slotInterval * 60 * 1000)
      }

      return slots
    } catch (err) {
      console.error('Error getting available slots:', err)
      return []
    }
  }, [rules, evaluateBooking])

  /**
   * Update a specific rule field
   */
  const updateRule = useCallback(async (field, value) => {
    if (!barbershopId) return false

    try {
      const response = await fetch('/api/booking-rules/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          field,
          value
        })
      })

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Invalidate cache and reload
        if (cache.current) {
          await cache.current.invalidate()
        }
        await loadRules(true)
        return true
      } else {
        throw new Error(data.error || 'Update failed')
      }
    } catch (err) {
      console.error('Error updating rule:', err)
      setError(err.message)
      return false
    }
  }, [barbershopId, loadRules])

  /**
   * Subscribe to real-time rule updates via Supabase Realtime
   */
  useEffect(() => {
    if (!barbershopId || !realtimeSync.current) return

    // Subscribe to real-time updates
    const subscription = realtimeSync.current.subscribe(barbershopId, {
      onSubscribed: () => {
        setSyncStatus('connected')
        console.log('Connected to real-time rule updates')
      },
      onRuleUpdate: async (update) => {
        console.log('Real-time rule update received:', update)
        
        // Normalize the updated rules
        const normalizedRules = FieldNormalizer.normalizeObject(update.rules, true)
        setRules(normalizedRules)
        
        // Update cache
        if (cache.current) {
          await cache.current.set(normalizedRules)
        }
      },
      onRemoteUpdate: async (data) => {
        console.log('Remote rule update received:', data)
        // Reload rules to ensure consistency
        await loadRules(true)
      },
      onPresenceSync: (state) => {
        // Update connected users list
        const users = Object.values(state).map(presence => presence[0])
        setConnectedUsers(users)
      },
      onError: (error) => {
        console.error('Realtime sync error:', error)
        setError(`Realtime sync error: ${error.message}`)
        setSyncStatus('error')
      },
      onClosed: () => {
        setSyncStatus('disconnected')
        setConnectedUsers([])
      },
      onMaxReconnectFailed: () => {
        setSyncStatus('failed')
        setError('Failed to maintain real-time connection. Please refresh the page.')
      }
    })

    return () => {
      if (realtimeSync.current) {
        realtimeSync.current.unsubscribe(barbershopId)
      }
    }
  }, [barbershopId, loadRules])

  /**
   * Get rule analytics
   */
  const getAnalytics = useCallback(async (metric = 'summary', startDate = null, endDate = null) => {
    if (!barbershopId) return null

    try {
      const params = new URLSearchParams({
        barbershop_id: barbershopId,
        metric
      })

      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const response = await fetch(`/api/booking-rules/analytics?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        return data.data
      } else {
        throw new Error(data.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      return null
    }
  }, [barbershopId])

  /**
   * Convert field names between camelCase and snake_case
   */
  const normalizeFieldName = useCallback((field) => {
    // Convert camelCase to snake_case
    return field.replace(/([A-Z])/g, '_$1').toLowerCase()
  }, [])

  /**
   * Get a specific rule value with fallback
   */
  const getRuleValue = useCallback((path, defaultValue = null) => {
    if (!rules) return defaultValue

    // Handle both camelCase and snake_case
    const snakePath = normalizeFieldName(path)
    const pathParts = snakePath.split('.')
    
    let value = rules
    for (const part of pathParts) {
      // Try snake_case first, then camelCase
      value = value?.[part] || value?.[part.replace(/_([a-z])/g, (_, char) => char.toUpperCase())]
      if (value === undefined) return defaultValue
    }
    
    return value
  }, [rules, normalizeFieldName])

  return {
    // State
    rules,
    loading,
    error,
    evaluating,
    syncStatus,
    connectedUsers,
    
    // Methods
    loadRules,
    evaluateBooking,
    getAvailableSlots,
    updateRule,
    getAnalytics,
    getRuleValue,
    
    // Utilities
    normalizeFieldName,
    
    // Cache management
    invalidateCache: async () => {
      if (cache.current) {
        await cache.current.invalidate()
        await loadRules(true)
      }
    },
    getCacheStats: () => cache.current?.getStats() || null,
    
    // Realtime sync management
    isConnected: () => syncStatus === 'connected',
    reconnect: () => {
      if (realtimeSync.current && barbershopId) {
        realtimeSync.current.unsubscribe(barbershopId)
        realtimeSync.current.subscribe(barbershopId)
      }
    },
    getPresenceState: () => {
      if (realtimeSync.current && barbershopId) {
        return realtimeSync.current.getPresenceState(barbershopId)
      }
      return {}
    }
  }
}

export default useBookingRules