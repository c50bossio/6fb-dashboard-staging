/**
 * RealtimeBookingWrapper Usage Examples
 * 
 * This file demonstrates various ways to use the RealtimeBookingWrapper
 * in different scenarios within the 6FB AI Agent System.
 */

import React, { useState } from 'react'
import RealtimeBookingWrapper, { useRealtimeBooking } from '../RealtimeBookingWrapper'

// =============================================================================
// Example 1: Basic Public Booking Page
// =============================================================================

export function BasicPublicBookingPage({ params }) {
  return (
    <RealtimeBookingWrapper
      barberbarbershopId={params.barbershopId}
      barbershopSlug={params.slug}
      enableRealtime={true}
      enableConflictPrevention={true}
      flowComponent="public"
    />
  )
}

// =============================================================================
// Example 2: Enhanced Booking with Pre-selected Services
// =============================================================================

export function PreselectedServiceBooking({ barbershopId, serviceId, barberId }) {
  const [analyticsData, setAnalyticsData] = useState({
    conversionEvents: [],
    conflictEvents: [],
    realtimeEvents: []
  })

  const handleSlotConflict = (event) => {
    console.warn('Slot conflict detected:', event)
    setAnalyticsData(prev => ({
      ...prev,
      conflictEvents: [...prev.conflictEvents, {
        ...event,
        timestamp: new Date()
      }]
    }))
    
    // Show user-friendly conflict resolution
    alert(`Sorry, that time is no longer available. Please select another time.`)
  }

  const handleAvailabilityUpdate = (data) => {
    setAnalyticsData(prev => ({
      ...prev,
      realtimeEvents: [...prev.realtimeEvents, {
        type: 'availability_update',
        slotsCount: data.slots.length,
        conflictsCount: data.conflicts.length,
        timestamp: new Date()
      }]
    }))
  }

  const handleBookingAttempt = (bookingData) => {
    setAnalyticsData(prev => ({
      ...prev,
      conversionEvents: [...prev.conversionEvents, {
        type: 'booking_attempt',
        service: bookingData.service_name,
        timestamp: new Date()
      }]
    }))
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <RealtimeBookingWrapper
        barberbarbershopId={barbershopId}
        preselectedService={serviceId}
        preselectedBarber={barberId}
        flowComponent="enhanced"
        enableRealtime={true}
        enableConflictPrevention={true}
        enableOptimisticUpdates={true}
        enableAnalytics={true}
        onSlotConflict={handleSlotConflict}
        onAvailabilityUpdate={handleAvailabilityUpdate}
        onBookingAttempt={handleBookingAttempt}
        refreshInterval={20000} // More frequent updates for high-traffic shops
        conflictCheckDelay={300} // Faster conflict detection
      />
      
      {/* Analytics Dashboard */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Real-time Analytics</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Conversions:</strong> {analyticsData.conversionEvents.length}
            </div>
            <div>
              <strong>Conflicts:</strong> {analyticsData.conflictEvents.length}
            </div>
            <div>
              <strong>Updates:</strong> {analyticsData.realtimeEvents.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Example 3: Mobile-Optimized Booking with Network Handling
// =============================================================================

export function MobileOptimizedBooking({ barbershopId }) {
  const [networkStatus, setNetworkStatus] = useState({ online: true, slow: false })

  const handleNetworkStatusChange = (status) => {
    setNetworkStatus({
      online: status.online,
      slow: status.effectiveType === 'slow-2g' || status.effectiveType === '2g'
    })
  }

  const handleRealtimeError = (error) => {
    console.error('Realtime connection failed:', error)
    // Track error in your analytics service
    if (window.gtag) {
      window.gtag('event', 'realtime_error', {
        error_message: error.message,
        barberbarbershop_id: barbershopId
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Network Status Banner */}
      {!networkStatus.online && (
        <div className="bg-red-100 border-b border-red-200 p-3 text-center">
          <p className="text-red-800 text-sm">
            You're offline. Booking features may be limited.
          </p>
        </div>
      )}
      
      {networkStatus.slow && networkStatus.online && (
        <div className="bg-amber-100 border-b border-amber-200 p-3 text-center">
          <p className="text-amber-800 text-sm">
            Slow connection detected. Using simplified booking flow.
          </p>
        </div>
      )}

      <RealtimeBookingWrapper
        barberbarbershopId={barbershopId}
        flowComponent={networkStatus.slow ? "public" : "auto"}
        enableRealtime={networkStatus.online}
        enableConflictPrevention={networkStatus.online}
        refreshInterval={networkStatus.slow ? 60000 : 30000} // Longer intervals for slow connections
        onNetworkStatusChange={handleNetworkStatusChange}
        onRealtimeError={handleRealtimeError}
        // Mobile-specific optimizations
        optimizeForMobile={true}
        enableTouchOptimizations={true}
        reducedAnimations={networkStatus.slow}
      />
    </div>
  )
}

// =============================================================================
// Example 4: Custom Booking Component using the Hook
// =============================================================================

export function CustomBookingComponent({ barbershopId, className = '' }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState(null)
  
  const {
    availableSlots,
    conflicts,
    loading,
    error,
    realtimeConnected,
    checkAvailability,
    validateSlot,
    refreshAvailability
  } = useRealtimeBooking({
    barberbarbershopId: barbershopId,
    enableRealtime: true,
    enableConflictPrevention: true
  })

  React.useEffect(() => {
    checkAvailability(selectedDate, 30)
  }, [selectedDate, checkAvailability])

  const handleSlotSelect = async (slot) => {
    const validation = await validateSlot(slot.time, slot.duration)
    if (!validation.valid) {
      alert(`Time slot unavailable: ${validation.error}`)
      // Refresh to get latest availability
      await refreshAvailability(selectedDate, null, 30)
      return
    }
    setSelectedSlot(slot)
  }

  const handleDateChange = (date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  return (
    <div className={`custom-booking-component ${className}`}>
      {/* Real-time Status */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Select Your Time</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            realtimeConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          }`} />
          <span className="text-sm text-gray-600">
            {realtimeConnected ? 'Live Updates' : 'Manual Refresh'}
          </span>
          {!realtimeConnected && (
            <button 
              onClick={() => refreshAvailability(selectedDate)}
              className="text-blue-600 text-sm underline hover:no-underline"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Date Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Date:</label>
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => handleDateChange(new Date(e.target.value))}
          min={new Date().toISOString().split('T')[0]}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading available times...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">Error loading times: {error}</p>
          <button 
            onClick={() => checkAvailability(selectedDate, 30)}
            className="mt-2 text-red-600 underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Available Slots */}
      {!loading && availableSlots.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium mb-3">Available Times ({availableSlots.length})</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {availableSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => handleSlotSelect(slot)}
                className={`p-3 border rounded-lg text-sm hover:border-blue-500 hover:bg-blue-50 transition-colors ${
                  selectedSlot?.time === slot.time
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                } ${slot.isPopular ? 'ring-2 ring-amber-300 ring-opacity-50' : ''}`}
              >
                <div className="font-medium">{slot.display}</div>
                {slot.isPopular && (
                  <div className="text-xs text-amber-600">⭐ Popular</div>
                )}
                {slot.hasBuffer && (
                  <div className="text-xs text-gray-500">
                    {slot.bufferTime}min buffer
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Slots Available */}
      {!loading && availableSlots.length === 0 && !error && (
        <div className="text-center py-8 text-gray-500">
          <p>No available times for this date</p>
          <p className="text-sm">Try selecting a different date</p>
        </div>
      )}

      {/* Conflicts Information */}
      {conflicts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-amber-800 mb-2">
            {conflicts.length} time{conflicts.length !== 1 ? 's' : ''} unavailable
          </h4>
          <p className="text-sm text-amber-700">
            Some times are already booked. We're showing only available slots.
          </p>
        </div>
      )}

      {/* Selected Slot Confirmation */}
      {selectedSlot && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">Time Selected</h4>
          <p className="text-green-700">
            {selectedDate.toLocaleDateString()} at {selectedSlot.display}
          </p>
          <p className="text-sm text-green-600 mt-1">
            Duration: {selectedSlot.duration} minutes
          </p>
          <button 
            className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            onClick={() => {
              // Proceed to booking confirmation
              console.log('Proceeding with booking:', {
                date: selectedDate,
                slot: selectedSlot
              })
            }}
          >
            Continue Booking
          </button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Example 5: A/B Testing with Orchestrator
// =============================================================================

export function ABTestingBookingPage({ barbershopId, experimentId }) {
  const [conversionData, setConversionData] = useState({
    component: null,
    startTime: new Date(),
    interactions: []
  })

  const handleComponentSelection = (component, context) => {
    setConversionData(prev => ({
      ...prev,
      component,
      deviceType: context.device?.isMobile ? 'mobile' : 'desktop',
      experimentVariant: context.urlParams.experiment || 'control'
    }))
    
    // Track component selection in analytics
    if (window.gtag) {
      window.gtag('event', 'booking_component_selected', {
        component_name: component,
        experiment_id: experimentId,
        device_type: context.device?.isMobile ? 'mobile' : 'desktop'
      })
    }
  }

  const handleConversionEvent = (event) => {
    setConversionData(prev => ({
      ...prev,
      interactions: [...prev.interactions, {
        type: event.type || 'interaction',
        timestamp: new Date(),
        data: event
      }]
    }))
  }

  return (
    <div className="ab-testing-booking-page">
      <RealtimeBookingWrapper
        barberbarbershopId={barbershopId}
        flowComponent="orchestrator" // Let orchestrator choose optimal component
        experimentId={experimentId}
        enableRealtime={true}
        enableConflictPrevention={true}
        enableAnalytics={true}
        onComponentSelection={handleComponentSelection}
        onConversionEvent={handleConversionEvent}
        // A/B testing specific props
        enhanced={experimentId === 'enhanced_flow'}
        mobile={experimentId === 'mobile_optimized'}
        debugMode={process.env.NODE_ENV === 'development'}
      />
      
      {/* A/B Testing Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-white border rounded-lg p-3 text-xs shadow-lg">
          <div className="font-semibold mb-1">A/B Test Debug</div>
          <div>Experiment: {experimentId}</div>
          <div>Component: {conversionData.component}</div>
          <div>Device: {conversionData.deviceType}</div>
          <div>Interactions: {conversionData.interactions.length}</div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Example 6: High-Traffic Shop with Advanced Optimization
// =============================================================================

export function HighTrafficBookingPage({ barbershopId }) {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: null,
    realtimeLatency: null,
    conflictResolutions: 0,
    optimisticUpdates: 0
  })

  React.useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      setPerformanceMetrics(prev => ({
        ...prev,
        loadTime: endTime - startTime
      }))
    }
  }, [])

  const handleSlotConflict = (event) => {
    setPerformanceMetrics(prev => ({
      ...prev,
      conflictResolutions: prev.conflictResolutions + 1
    }))
    
    // Show real-time conflict resolution
    const conflictMessage = `Time ${event.datetime} is no longer available. ${event.conflicts?.length || 0} other customers may be booking simultaneously.`
    
    // Use toast notification instead of alert for better UX
    showToast(conflictMessage, 'warning')
  }

  const showToast = (message, type = 'info') => {
    // Implement your toast notification system
    console.log(`Toast [${type}]:`, message)
  }

  return (
    <div className="high-traffic-booking">
      <RealtimeBookingWrapper
        barberbarbershopId={barbershopId}
        flowComponent="orchestrator"
        enableRealtime={true}
        enableConflictPrevention={true}
        enableOptimisticUpdates={true}
        enablePrefetch={true}
        
        // High-traffic optimizations
        refreshInterval={15000} // More frequent updates
        conflictCheckDelay={250} // Faster conflict detection
        
        // Enhanced event handling
        onSlotConflict={handleSlotConflict}
        onAvailabilityUpdate={(data) => {
          // Track slot velocity for insights
          const velocity = data.slots.length / (data.conflicts.length + 1)
          if (window.analytics) {
            window.analytics.track('booking_availability_update', {
              barbershop_id: barbershopId,
              available_slots: data.slots.length,
              conflicts: data.conflicts.length,
              velocity_ratio: velocity
            })
          }
        }}
        
        // Performance monitoring
        onBookingAttempt={(data) => {
          setPerformanceMetrics(prev => ({
            ...prev,
            optimisticUpdates: prev.optimisticUpdates + 1
          }))
        }}
      />
      
      {/* Performance Monitoring Dashboard */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-dashboard fixed top-4 right-4 bg-black bg-opacity-80 text-white p-3 rounded text-xs">
          <div className="font-semibold mb-2">Performance Metrics</div>
          <div>Load Time: {performanceMetrics.loadTime?.toFixed(2)}ms</div>
          <div>Conflicts Resolved: {performanceMetrics.conflictResolutions}</div>
          <div>Optimistic Updates: {performanceMetrics.optimisticUpdates}</div>
          <div>Memory: {(performance.memory?.usedJSHeapSize / 1048576)?.toFixed(1)}MB</div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Example 7: URL Parameter Integration
// =============================================================================

export function URLParameterBooking() {
  React.useEffect(() => {
    // Example URL: /book/shop-123?service=haircut&barber=john&enhanced=true&debug=true
    const urlParams = new URLSearchParams(window.location.search)
    
    console.log('URL Parameters detected:', {
      service: urlParams.get('service'),
      barber: urlParams.get('barber'),
      enhanced: urlParams.get('enhanced') === 'true',
      flow: urlParams.get('flow'),
      debug: urlParams.get('debug') === 'true'
    })
  }, [])

  // Extract shop ID from URL path
  const barbershopId = window.location.pathname.split('/').pop()

  return (
    <RealtimeBookingWrapper
      barberbarbershopId={barbershopId}
      flowComponent="orchestrator" // Will auto-detect URL parameters
      enableRealtime={true}
      enableConflictPrevention={true}
      
      // URL parameters are automatically parsed by the orchestrator:
      // - ?service=haircut -> preselectedService
      // - ?barber=john -> preselectedBarber  
      // - ?enhanced=true -> forces enhanced flow
      // - ?mobile=true -> forces mobile flow
      // - ?flow=public -> forces specific component
      // - ?debug=true -> enables debug mode
    />
  )
}

// =============================================================================
// Export all examples for easy importing
// =============================================================================

export default {
  BasicPublicBookingPage,
  PreselectedServiceBooking,
  MobileOptimizedBooking,
  CustomBookingComponent,
  ABTestingBookingPage,
  HighTrafficBookingPage,
  URLParameterBooking
}