'use client'

import { 
  DevicePhoneMobileIcon, 
  BoltIcon, 
  SparklesIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import BookingFlowOrchestrator from '@/components/booking/BookingFlowOrchestrator'
import { trackEvent } from '@/lib/analytics'

// Enhanced Loading Component with better UX
function EnhancedLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header Skeleton */}
        <div className="text-center mb-12 animate-pulse">
          <div className="h-8 bg-gray-300 rounded-lg w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-36 mx-auto"></div>
        </div>
        
        {/* Service Selection Skeleton */}
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="h-6 bg-gray-300 rounded w-40 mb-4 animate-pulse"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                  <div className="h-40 bg-gray-200"></div>
                  <div className="p-6">
                    <div className="h-5 bg-gray-300 rounded mb-3 w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-300 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="bg-white shadow-lg rounded-full px-6 py-3 flex items-center space-x-3">
          <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-gray-700">Preparing your booking experience...</span>
        </div>
      </motion.div>
    </div>
  )
}

// Error component with retry functionality
function BookingErrorDisplay({ error, onRetry, barbershopName }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="h-8 w-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error === 'Barbershop not found' ? 'Shop Not Found' : 'Booking Unavailable'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {error === 'Barbershop not found' 
              ? 'This booking link may be outdated or incorrect.'
              : 'We\'re having trouble loading the booking system. Please try again.'}
          </p>
          
          {barbershopName && (
            <p className="text-sm text-gray-500 mb-6">
              Looking for: <span className="font-medium">{barbershopName}</span>
            </p>
          )}
          
          <button
            onClick={onRetry}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Try Again
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            If the problem persists, please contact the barbershop directly.
          </p>
        </div>
      </div>
    </div>
  )
}

// Main component with search params wrapper
function PublicBookingPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const barberbarbershopId = params.barberbarbershopId
  
  // State management
  const [barbershopInfo, setBarbershopInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  
  // Extract URL parameters for enhanced features
  const urlParams = {
    enhanced: searchParams.get('enhanced') === 'true',
    mobile: searchParams.get('mobile') === 'true',
    service: searchParams.get('service'),
    barber: searchParams.get('barber'),
    flow: searchParams.get('flow'),
    experiment: searchParams.get('exp'),
    debug: searchParams.get('debug') === 'true'
  }

  useEffect(() => {
    loadBarbershopInfo()
  }, [barberbarbershopId, retryCount])

  const loadBarbershopInfo = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/public/barbershop/${barberbarbershopId}`)
      const data = await response.json()
      
      if (data.success) {
        setBarbershopInfo(data.barbershop)
        
        // Track successful load
        trackEvent('public_booking_loaded', {
          barberbarbershop_id: barberbarbershopId,
          barbershop_name: data.barbershop.name,
          has_url_params: Object.keys(urlParams).some(key => urlParams[key]),
          enhanced_requested: urlParams.enhanced,
          mobile_requested: urlParams.mobile,
          preselected_service: urlParams.service,
          preselected_barber: urlParams.barber
        })
      } else {
        setError(data.error || 'Barbershop not found')
      }
    } catch (err) {
      console.error('Failed to load barbershop:', err)
      setError('Failed to load barbershop information')
      
      // Track error
      trackEvent('public_booking_error', {
        barberbarbershop_id: barberbarbershopId,
        error: err.message,
        retry_count: retryCount
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setError(null)
  }

  const handleComponentSelection = (componentName, selectionData) => {
    // Analytics tracking for component selection
    trackEvent('booking_component_selected', {
      component: componentName,
      barberbarbershop_id: barberbarbershopId,
      device_type: selectionData.device?.isMobile ? 'mobile' : 
                   selectionData.device?.isTablet ? 'tablet' : 'desktop',
      screen_width: selectionData.device?.screenWidth,
      connection_type: selectionData.device?.effectiveConnectionType,
      url_params: selectionData.urlParams,
      feature_flags: Object.keys(selectionData.featureFlags)
    })
  }

  const handleConversionEvent = (eventType, eventData) => {
    // Track conversion events
    trackEvent('booking_conversion_event', {
      event_type: eventType,
      barberbarbershop_id: barberbarbershopId,
      ...eventData
    })
  }

  // Loading state
  if (loading) {
    return <EnhancedLoadingSkeleton />
  }

  // Error state
  if (error) {
    return (
      <BookingErrorDisplay 
        error={error}
        onRetry={handleRetry}
        barbershopName={barbershopInfo?.name}
      />
    )
  }

  // Success state - render enhanced booking system
  return (
    <div className="public-booking-page">
      {/* Enhanced Booking Orchestrator */}
      <BookingFlowOrchestrator
        // Core props
        barberbarbershopId={barberbarbershopId}
        barbershopSlug={barbershopInfo?.slug}
        
        // URL parameter integration
        enhanced={urlParams.enhanced}
        mobile={urlParams.mobile}
        service={urlParams.service}
        barber={urlParams.barber}
        
        // Configuration
        defaultFlow="auto"
        enableRealtimeAvailability={true}
        enableProgressiveAccount={true}
        
        // Analytics & tracking
        experimentId={urlParams.experiment}
        onComponentSelection={handleComponentSelection}
        onConversionEvent={handleConversionEvent}
        
        // Additional context
        barbershopName={barbershopInfo?.name}
        businessHours={barbershopInfo?.business_hours}
        timezone={barbershopInfo?.timezone}
        bookingSettings={barbershopInfo?.booking_settings}
        
        // SEO & metadata context
        seoData={{
          title: `Book at ${barbershopInfo?.name}`,
          description: barbershopInfo?.description,
          image: barbershopInfo?.image_url,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/book/public/${barberbarbershopId}`
        }}
        
        // Debug mode
        debugMode={urlParams.debug}
        
        className="w-full"
      />
      
      {/* Debug Information Panel */}
      {urlParams.debug && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs max-w-sm z-50">
          <div className="font-bold mb-2">Public Booking Debug Info</div>
          <div>Barbershop: {barbershopInfo?.name}</div>
          <div>ID: {barberbarbershopId}</div>
          <div>Slug: {barbershopInfo?.slug}</div>
          <div>Enhanced: {urlParams.enhanced ? 'Yes' : 'No'}</div>
          <div>Mobile: {urlParams.mobile ? 'Yes' : 'No'}</div>
          <div>Flow: {urlParams.flow || 'auto'}</div>
          {urlParams.service && <div>Service: {urlParams.service}</div>}
          {urlParams.barber && <div>Barber: {urlParams.barber}</div>}
          {urlParams.experiment && <div>Experiment: {urlParams.experiment}</div>}
          <div>Retry Count: {retryCount}</div>
        </div>
      )}
      
      {/* Feature Indicator for Development */}
      {process.env.NODE_ENV === 'development' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 left-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-xs font-medium z-40 flex items-center space-x-2"
        >
          <BoltIcon className="h-4 w-4" />
          <span>Enhanced Public Booking</span>
          {urlParams.enhanced && <SparklesIcon className="h-3 w-3" />}
          {urlParams.mobile && <DevicePhoneMobileIcon className="h-3 w-3" />}
        </motion.div>
      )}
    </div>
  )
}

// Main exported component with Suspense wrapper
export default function PublicBookingPage() {
  return (
    <Suspense fallback={<EnhancedLoadingSkeleton />}>
      <PublicBookingPageContent />
    </Suspense>
  )
}