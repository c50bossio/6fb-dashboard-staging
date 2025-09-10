'use client'

import { useState, useEffect, useCallback, lazy, Suspense, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import bookingAPI from '@/lib/booking-api'
import { usePerformanceTracking } from '@/lib/hooks/usePerformanceTracking'
import { useBookingCache } from '@/lib/hooks/useBookingCache'
import LoadingSkeletons from './LoadingSkeletons'

// Lazy load step components for code splitting
const LocationStep = lazy(() => import('./steps/LocationStep'))
const BarberStep = lazy(() => import('./steps/BarberStep'))  
const ServiceStep = lazy(() => import('./steps/ServiceStep'))
const TimeStep = lazy(() => import('./steps/TimeStep'))
const PaymentStep = lazy(() => import('./steps/PaymentStep'))
const ConfirmationStep = lazy(() => import('./steps/ConfirmationStep'))

// Step component mapping for dynamic loading
const STEP_COMPONENTS = {
  1: LocationStep,
  2: BarberStep,
  3: ServiceStep,
  4: TimeStep,
  5: PaymentStep,
  6: ConfirmationStep
}

const STEP_NAMES = {
  1: 'location',
  2: 'barber',
  3: 'service', 
  4: 'time',
  5: 'payment',
  6: 'confirmation'
}

export default function BookingWizardOptimized({ 
  initialLocation = null,
  onComplete = () => {},
  settings = {}
}) {
  const router = useRouter()
  const supabase = createClient()
  
  // Performance tracking
  const { trackEvent, trackTiming, trackWebVitals } = usePerformanceTracking('booking-wizard')
  
  // Optimized caching for booking data
  const {
    locations,
    barbers,
    services,
    availableSlots,
    isLoading: cacheLoading,
    error: cacheError,
    mutate: mutateCache
  } = useBookingCache()
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Optimized booking data with useMemo for performance
  const [bookingData, setBookingData] = useState(() => ({
    location: initialLocation,
    locationDetails: null,
    barber: null,
    barberDetails: null,
    service: null,
    serviceDetails: null,
    dateTime: null,
    duration: null,
    price: null,
    paymentMethod: settings.defaultPaymentMethod || 'online',
    customerInfo: null,
    notes: '',
    addOns: []
  }))
  
  // Memoized shop settings to prevent unnecessary re-renders
  const shopSettings = useMemo(() => ({
    acceptOnlinePayment: settings.acceptOnlinePayment ?? true,
    acceptInPersonPayment: settings.acceptInPersonPayment ?? true,
    requireDeposit: settings.requireDeposit ?? false,
    depositAmount: settings.depositAmount ?? 0,
    allowCancellation: settings.allowCancellation ?? true,
    cancellationWindow: settings.cancellationWindow ?? 24,
    ...settings
  }), [settings])

  // Performance-optimized step navigation
  const handleStepChange = useCallback((step) => {
    const startTime = performance.now()
    
    setCurrentStep(step)
    trackEvent('step_change', { 
      from: currentStep, 
      to: step,
      step_name: STEP_NAMES[step]
    })
    
    // Track step transition timing
    const endTime = performance.now()
    trackTiming('step_transition', endTime - startTime)
  }, [currentStep, trackEvent, trackTiming])

  // Optimized booking data update with batching
  const updateBookingData = useCallback((updates) => {
    setBookingData(prevData => {
      const newData = { ...prevData, ...updates }
      
      // Track data updates for performance monitoring
      trackEvent('booking_data_update', {
        step: currentStep,
        fields_updated: Object.keys(updates)
      })
      
      return newData
    })
  }, [currentStep, trackEvent])

  // Preload next step component
  const preloadNextStep = useCallback((nextStep) => {
    if (STEP_COMPONENTS[nextStep]) {
      // Dynamically import next component for faster transitions
      STEP_COMPONENTS[nextStep]()
    }
  }, [])

  // Optimized step navigation handlers
  const handleNext = useCallback(async (stepData = {}) => {
    const startTime = performance.now()
    setIsLoading(true)
    setError(null)
    
    try {
      // Update booking data with step-specific data
      updateBookingData(stepData)
      
      const nextStep = currentStep + 1
      
      // Preload next component while processing current step
      preloadNextStep(nextStep + 1)
      
      // Validate current step before proceeding
      const isValid = await validateCurrentStep(currentStep, { ...bookingData, ...stepData })
      
      if (isValid && nextStep <= 6) {
        handleStepChange(nextStep)
      } else if (nextStep > 6) {
        // Complete booking flow
        await handleComplete({ ...bookingData, ...stepData })
      }
      
      trackTiming('step_next_duration', performance.now() - startTime)
    } catch (err) {
      setError(err.message)
      trackEvent('step_error', { 
        step: currentStep, 
        error: err.message 
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentStep, bookingData, updateBookingData, handleStepChange, preloadNextStep, trackTiming, trackEvent])

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      handleStepChange(currentStep - 1)
    }
  }, [currentStep, handleStepChange])

  // Optimized step validation with caching
  const validateCurrentStep = useCallback(async (step, data) => {
    const validators = {
      1: () => Boolean(data.location),
      2: () => Boolean(data.barber),
      3: () => Boolean(data.service),
      4: () => Boolean(data.dateTime),
      5: () => Boolean(data.paymentMethod),
      6: () => true
    }
    
    return validators[step] ? validators[step]() : false
  }, [])

  // Optimized booking completion with error handling
  const handleComplete = useCallback(async (finalBookingData) => {
    const startTime = performance.now()
    
    try {
      setIsLoading(true)
      
      // Create booking with optimized API call
      const booking = await bookingAPI.createBooking(finalBookingData)
      
      // Invalidate relevant cache entries
      mutateCache()
      
      trackEvent('booking_completed', {
        booking_id: booking.id,
        total_time: performance.now() - startTime,
        payment_method: finalBookingData.paymentMethod
      })
      
      // Call completion callback
      onComplete(booking)
      
    } catch (err) {
      setError(`Failed to complete booking: ${err.message}`)
      trackEvent('booking_error', { 
        error: err.message,
        step: 'completion'
      })
    } finally {
      setIsLoading(false)
    }
  }, [mutateCache, onComplete, trackEvent])

  // Track Web Vitals when component mounts
  useEffect(() => {
    trackWebVitals()
  }, [trackWebVitals])

  // Preload first few components on mount
  useEffect(() => {
    // Preload next 2 components for faster transitions
    preloadNextStep(currentStep + 1)
    preloadNextStep(currentStep + 2)
  }, [currentStep, preloadNextStep])

  // Memoized current step component
  const CurrentStepComponent = useMemo(() => {
    return STEP_COMPONENTS[currentStep]
  }, [currentStep])

  // Memoized step props to prevent unnecessary re-renders
  const stepProps = useMemo(() => ({
    bookingData,
    shopSettings,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onUpdateData: updateBookingData,
    isLoading,
    error,
    // Cached data for performance
    locations: locations || [],
    barbers: barbers || [],
    services: services || [],
    availableSlots: availableSlots || []
  }), [
    bookingData,
    shopSettings,
    handleNext,
    handlePrevious,
    updateBookingData,
    isLoading,
    error,
    locations,
    barbers,
    services,
    availableSlots
  ])

  // Show loading state while cache is loading
  if (cacheLoading) {
    return <LoadingSkeletons type="booking-wizard" />
  }

  // Show error state
  if (cacheError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Unable to Load Booking System
          </h2>
          <p className="text-gray-600 mb-4">{cacheError.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
            <span className="text-sm text-gray-500">
              Step {currentStep} of 6
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content with Suspense for lazy loading */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <Suspense fallback={<LoadingSkeletons type={`step-${currentStep}`} />}>
              <CurrentStepComponent {...stepProps} />
            </Suspense>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1 || isLoading}
            className="px-6 py-3 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <button
            onClick={() => handleNext()}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {currentStep === 6 ? 'Complete Booking' : 'Next'}
          </button>
        </div>

        {/* Global Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}