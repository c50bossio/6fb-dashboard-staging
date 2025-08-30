'use client'

import { 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

export default function RealtimeAvailabilityChecker({
  barberbarbershopId,
  barberId,
  serviceId,
  selectedDate,
  duration = 30,
  onSlotsUpdate,
  children
}) {
  const [availableSlots, setAvailableSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [conflictedSlots, setConflictedSlots] = useState([])
  const [error, setError] = useState(null)
  
  const supabase = createClient()
  const checkIntervalRef = useRef(null)
  const subscriptionRef = useRef(null)

  // Real-time slot generation with conflict detection
  const generateRealTimeSlots = useCallback(async () => {
    if (!barberbarbershopId || !selectedDate) return []

    try {
      setLoading(true)
      setError(null)

      // Get business hours for the selected date
      const { data: shopData } = await supabase
        .from('barbershops')
        .select(`
          business_hours,
          timezone,
          booking_settings (
            min_advance_booking,
            max_advance_booking,
            slot_duration,
            buffer_time,
            business_hours_override
          )
        `)
        .eq('id', barberbarbershopId)
        .single()

      const businessHours = shopData?.business_hours || {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '09:00', close: '16:00' },
        sunday: null
      }

      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'lowercase' })
      const dayHours = businessHours[dayOfWeek]

      if (!dayHours) {
        setAvailableSlots([])
        onSlotsUpdate?.([])
        return
      }

      // Get existing bookings for the selected date and barber
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('scheduled_at, duration_minutes, status, id')
        .eq('barberbarbershop_id', barberbarbershopId)
        .eq('barber_id', barberId || 'any')
        .gte('scheduled_at', startOfDay.toISOString())
        .lt('scheduled_at', endOfDay.toISOString())
        .in('status', ['CONFIRMED', 'CHECKED_IN'])

      // Generate time slots based on business hours
      const slots = []
      const now = new Date()
      const targetDate = new Date(selectedDate)
      
      const [openHour, openMinute] = dayHours.open.split(':').map(Number)
      const [closeHour, closeMinute] = dayHours.close.split(':').map(Number)
      
      const openTime = new Date(targetDate)
      openTime.setHours(openHour, openMinute, 0, 0)
      
      const closeTime = new Date(targetDate)
      closeTime.setHours(closeHour, closeMinute, 0, 0)

      // Generate slots every 30 minutes (or custom slot duration)
      const slotDuration = shopData?.booking_settings?.slot_duration || 30
      const bufferTime = shopData?.booking_settings?.buffer_time || 0

      let currentSlot = new Date(openTime)
      
      while (currentSlot < closeTime) {
        const slotEnd = new Date(currentSlot.getTime() + duration * 60000)
        
        // Skip past times (with 30 min buffer for same-day bookings)
        const minimumBookingTime = new Date(now.getTime() + 30 * 60000)
        if (currentSlot <= minimumBookingTime) {
          currentSlot = new Date(currentSlot.getTime() + slotDuration * 60000)
          continue
        }

        // Check for conflicts with existing bookings
        const hasConflict = existingBookings?.some(booking => {
          const bookingStart = new Date(booking.scheduled_at)
          const bookingEnd = new Date(bookingStart.getTime() + booking.duration_minutes * 60000)
          
          // Add buffer time
          const bufferStart = new Date(bookingStart.getTime() - bufferTime * 60000)
          const bufferEnd = new Date(bookingEnd.getTime() + bufferTime * 60000)
          
          return (currentSlot < bufferEnd && slotEnd > bufferStart)
        })

        const slotInfo = {
          time: currentSlot.toISOString(),
          endTime: slotEnd.toISOString(),
          available: !hasConflict,
          display: currentSlot.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          displayEnd: slotEnd.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          duration: duration,
          isPopular: isPopularTime(currentSlot),
          hasBuffer: bufferTime > 0,
          conflictsWith: hasConflict ? existingBookings.filter(booking => {
            const bookingStart = new Date(booking.scheduled_at)
            const bookingEnd = new Date(bookingStart.getTime() + booking.duration_minutes * 60000)
            return (currentSlot < bookingEnd && slotEnd > bookingStart)
          }).map(b => b.id) : []
        }

        slots.push(slotInfo)
        currentSlot = new Date(currentSlot.getTime() + slotDuration * 60000)
      }

      // Filter available slots and track conflicts
      const availableSlots = slots.filter(slot => slot.available)
      const conflictedSlots = slots.filter(slot => !slot.available)
      
      setAvailableSlots(availableSlots)
      setConflictedSlots(conflictedSlots)
      setLastUpdated(new Date())
      
      onSlotsUpdate?.(availableSlots)

      return availableSlots

    } catch (error) {
      console.error('Error generating real-time slots:', error)
      setError('Failed to load available times. Please try refreshing.')
      return []
    } finally {
      setLoading(false)
    }
  }, [barberbarbershopId, barberId, serviceId, selectedDate, duration, onSlotsUpdate])

  // Helper function to determine popular times
  const isPopularTime = (time) => {
    const hour = time.getHours()
    const dayOfWeek = time.getDay()
    
    // Weekday lunch hours and weekend afternoons are popular
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return hour >= 12 && hour <= 14 // Lunch hours
    } else {
      return hour >= 13 && hour <= 16 // Weekend afternoons
    }
  }

  // Set up real-time subscription for booking changes
  useEffect(() => {
    if (!barberbarbershopId || !selectedDate) return

    const channel = supabase
      .channel(`bookings-${barberbarbershopId}-${selectedDate.toDateString()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `barberbarberbarbershop_id=eq.${barberbarbershopId}`
        },
        (payload) => {
          console.log('Booking change detected:', payload)
          
          // Check if the change affects our selected date
          const changeDate = new Date(payload.new?.scheduled_at || payload.old?.scheduled_at)
          if (changeDate.toDateString() === selectedDate.toDateString()) {
            // Refresh availability after a brief delay to ensure DB consistency
            setTimeout(generateRealTimeSlots, 1000)
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [barberbarbershopId, selectedDate, generateRealTimeSlots])

  // Set up periodic refresh (every 5 minutes)
  useEffect(() => {
    generateRealTimeSlots() // Initial load

    checkIntervalRef.current = setInterval(() => {
      generateRealTimeSlots()
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [generateRealTimeSlots])

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    generateRealTimeSlots()
  }, [generateRealTimeSlots])

  // Validation function to check if a specific time is still available
  const validateTimeSlot = useCallback(async (timeSlot) => {
    try {
      const slotStart = new Date(timeSlot)
      const slotEnd = new Date(slotStart.getTime() + duration * 60000)

      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id, scheduled_at, duration_minutes')
        .eq('barberbarbershop_id', barberbarbershopId)
        .eq('barber_id', barberId || 'any')
        .gte('scheduled_at', slotStart.toISOString())
        .lt('scheduled_at', slotEnd.toISOString())
        .in('status', ['CONFIRMED', 'CHECKED_IN'])

      return {
        available: !conflicts || conflicts.length === 0,
        conflicts: conflicts || []
      }
    } catch (error) {
      console.error('Error validating time slot:', error)
      return { available: false, error: error.message }
    }
  }, [barberbarbershopId, barberId, duration])

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {loading ? (
            <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />
          ) : error ? (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
          ) : (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          )}
          
          <div>
            <span className="text-sm font-medium text-gray-900">
              {loading ? 'Checking availability...' : 
               error ? 'Error loading times' :
               `${availableSlots.length} slots available`}
            </span>
            {lastUpdated && !loading && (
              <div className="text-xs text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={handleManualRefresh}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          title="Refresh availability"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
              <button
                onClick={handleManualRefresh}
                className="text-sm text-red-600 hover:text-red-800 underline mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflicted Slots Info (for debugging/transparency) */}
      {conflictedSlots.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start">
            <ClockIcon className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {conflictedSlots.length} times unavailable due to existing bookings
              </p>
              <p className="text-xs text-amber-700 mt-1">
                We're showing only available appointment times
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Status Indicator */}
      <div className="flex items-center space-x-1 text-xs text-gray-500">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span>Real-time availability • Updates automatically</span>
      </div>

      {/* Children components receive the real-time data */}
      {children}
    </div>
  )
}

// Hook for using real-time availability in other components
export function useRealtimeAvailability(barberbarbershopId, barberId, serviceId, selectedDate, duration = 30) {
  const [availableSlots, setAvailableSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const handleSlotsUpdate = useCallback((slots) => {
    setAvailableSlots(slots)
    setLastUpdated(new Date())
  }, [])

  return {
    availableSlots,
    loading,
    error,
    lastUpdated,
    RealtimeChecker: ({ children }) => (
      <RealtimeAvailabilityChecker
        barberbarbershopId={barberbarbershopId}
        barberId={barberId}
        serviceId={serviceId}
        selectedDate={selectedDate}
        duration={duration}
        onSlotsUpdate={handleSlotsUpdate}
      >
        {children}
      </RealtimeAvailabilityChecker>
    )
  }
}