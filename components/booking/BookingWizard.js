'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import bookingAPI from '@/lib/booking-api'

// Step Components
import LocationStep from './steps/LocationStep'
import BarberStep from './steps/BarberStep'
import ServiceStep from './steps/ServiceStep'
import TimeStep from './steps/TimeStep'
import PaymentStep from './steps/PaymentStep'
import ConfirmationStep from './steps/ConfirmationStep'

export default function BookingWizard({ 
  initialLocation = null,
  onComplete = () => {},
  settings = {}
}) {
  const router = useRouter()
  const supabase = createClient()
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Booking data
  const [bookingData, setBookingData] = useState({
    location: initialLocation,
    locationDetails: null,
    barber: null,
    barberDetails: null,
    service: null,
    serviceDetails: null,
    dateTime: null,
    duration: null,
    price: null,
    paymentMethod: settings.defaultPaymentMethod || 'online', // 'online' or 'in-person'
    customerInfo: null,
    notes: '',
    addOns: []
  })
  
  // Shop settings
  const [shopSettings, setShopSettings] = useState({
    acceptOnlinePayment: true,
    acceptInPersonPayment: true,
    requireOnlinePayment: false,
    depositRequired: false,
    depositAmount: 0,
    depositPercentage: 0,
    cancellationWindow: 24, // hours
    ...settings
  })
  
  // Load shop settings
  useEffect(() => {
    loadShopSettings()
  }, [bookingData.location])
  
  const loadShopSettings = async () => {
    if (!bookingData.location) return
    
    try {
      // Fetch real shop settings from API
      const settings = await bookingAPI.getBarbershopSettings(bookingData.location)
      
      // Merge with defaults
      const finalSettings = {
        acceptOnlinePayment: settings.acceptOnlinePayment ?? true,
        acceptInPersonPayment: settings.acceptInPersonPayment ?? true,
        requireOnlinePayment: settings.requireOnlinePayment ?? false,
        depositRequired: settings.depositRequired ?? false,
        depositAmount: settings.depositAmount ?? 0,
        depositPercentage: settings.depositPercentage ?? 20,
        cancellationWindow: settings.cancellationWindow ?? 24,
        businessHours: settings.businessHours || {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '09:00', close: '16:00' },
          sunday: null // Closed
        }
      }
      
      setShopSettings(prev => ({ ...prev, ...finalSettings }))
    } catch (err) {
      console.error('Error loading shop settings:', err)
      // Use default settings on error
      setShopSettings(prev => ({ 
        ...prev,
        businessHours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '09:00', close: '16:00' },
          sunday: null
        }
      }))
    }
  }
  
  // Step configuration
  const steps = [
    { number: 1, title: 'Location', component: LocationStep },
    { number: 2, title: 'Barber', component: BarberStep },
    { number: 3, title: 'Service', component: ServiceStep },
    { number: 4, title: 'Time', component: TimeStep },
    { number: 5, title: 'Payment', component: PaymentStep },
    { number: 6, title: 'Confirmation', component: ConfirmationStep }
  ]
  
  // Navigation handlers
  const handleNext = useCallback((stepData) => {
    setBookingData(prev => ({ ...prev, ...stepData }))
    
    // Skip payment step if only in-person payment is accepted
    if (currentStep === 4 && !shopSettings.acceptOnlinePayment && shopSettings.acceptInPersonPayment) {
      setBookingData(prev => ({ ...prev, paymentMethod: 'in-person' }))
      setCurrentStep(6)
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep, shopSettings])
  
  const handleBack = useCallback(() => {
    // Handle skip back from confirmation if payment was skipped
    if (currentStep === 6 && !shopSettings.acceptOnlinePayment) {
      setCurrentStep(4)
    } else {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep, shopSettings])
  
  const handleStepClick = useCallback((stepNumber) => {
    // Only allow going back to completed steps
    if (stepNumber < currentStep) {
      setCurrentStep(stepNumber)
    }
  }, [currentStep])

  // Swipe gesture handlers for mobile navigation
  const handleSwipeGesture = useCallback((event, info) => {
    const { offset, velocity } = info
    const swipeThreshold = 50
    const velocityThreshold = 500

    // Swipe right (go back) - only if not on first step
    if ((offset.x > swipeThreshold || velocity.x > velocityThreshold) && currentStep > 1) {
      handleBack()
    }
    // Swipe left (go forward) - only if not on last step and current step has required data
    else if ((offset.x < -swipeThreshold || velocity.x < -velocityThreshold) && currentStep < steps.length) {
      // Check if current step has minimum required data before allowing swipe forward
      const canProceed = checkStepCanProceed(currentStep)
      if (canProceed) {
        // Simulate Next button click based on current step
        if (currentStep === 1 && bookingData.location) {
          // Location step
        } else if (currentStep === 2 && bookingData.barber) {
          // Barber step  
        } else if (currentStep === 3 && bookingData.service) {
          // Service step
        } else if (currentStep === 4 && bookingData.dateTime) {
          // Time step
        }
      }
    }
  }, [currentStep, bookingData, handleBack])

  const checkStepCanProceed = (step) => {
    switch (step) {
      case 1: return bookingData.location
      case 2: return bookingData.barber
      case 3: return bookingData.service
      case 4: return bookingData.dateTime
      case 5: return true // Payment step
      default: return false
    }
  }
  
  const handleComplete = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Prepare booking data for API
      const bookingPayload = {
        barbershop_id: bookingData.location,
        barber_id: bookingData.barber === 'barber_any' ? null : bookingData.barber,
        service_id: bookingData.service,
        scheduled_at: bookingData.dateTime,
        client_name: bookingData.customerInfo?.name || '',
        client_email: bookingData.customerInfo?.email || '',
        client_phone: bookingData.customerInfo?.phone || '',
        duration_minutes: bookingData.duration,
        price: bookingData.price,
        notes: bookingData.notes,
        payment_method: bookingData.paymentMethod,
        add_ons: bookingData.addOns
      }
      
      // Create booking through API
      const booking = await bookingAPI.createBooking(bookingPayload)
      
      // Call completion handler
      onComplete(booking)
      
      // Redirect to booking details
      router.push(`/bookings/${booking.id}/success`)
      
    } catch (err) {
      setError(err.message)
      console.error('Booking error:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Get current step component
  const CurrentStepComponent = steps[currentStep - 1].component
  
  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="max-w-4xl mx-auto px-3 md:px-4">
        {/* Header - Mobile Optimized */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Book Your Appointment</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Follow the steps below to schedule your visit</p>
        </div>
        
        {/* Progress Bar - Mobile Responsive */}
        <div className="mb-4 md:mb-8">
          {/* Mobile Progress - Horizontal Scrollable */}
          <div className="md:hidden">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => handleStepClick(step.number)}
                    disabled={step.number > currentStep}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      currentStep === step.number
                        ? 'bg-olive-600 text-white ring-2 ring-olive-100'
                        : currentStep > step.number
                        ? 'bg-olive-600 text-white cursor-pointer'
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {currentStep > step.number ? '✓' : step.number}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={`w-4 h-0.5 mx-1 ${
                      currentStep > step.number ? 'bg-olive-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-2">
              <span className="text-sm font-medium text-gray-900">
                Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
              </span>
            </div>
          </div>

          {/* Desktop Progress - Original Design */}
          <div className="hidden md:flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex-1">
                <div className="relative">
                  {/* Line */}
                  {index < steps.length - 1 && (
                    <div className={`absolute top-5 w-full h-0.5 ${
                      currentStep > step.number ? 'bg-olive-600' : 'bg-gray-300'
                    }`} style={{ left: '50%' }} />
                  )}
                  
                  {/* Step Circle */}
                  <button
                    onClick={() => handleStepClick(step.number)}
                    disabled={step.number > currentStep}
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      currentStep === step.number
                        ? 'bg-olive-600 text-white ring-4 ring-olive-100'
                        : currentStep > step.number
                        ? 'bg-olive-600 text-white cursor-pointer hover:ring-2 hover:ring-olive-200'
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {currentStep > step.number ? '✓' : step.number}
                  </button>
                  
                  {/* Step Title */}
                  <div className="text-center mt-2">
                    <span className={`text-xs font-medium ${
                      currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Error Alert */}
        {error && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm md:text-base">{error}</p>
          </div>
        )}
        
        {/* Mobile Layout - Step Content + Summary */}
        <div className="md:hidden space-y-4">
          {/* Booking Summary for Mobile - Top */}
          {currentStep > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Booking Summary</h3>
              
              <div className="space-y-2">
                {bookingData.locationDetails && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium text-right">{bookingData.locationDetails.name}</span>
                  </div>
                )}
                
                {bookingData.barberDetails && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Barber:</span>
                    <span className="font-medium text-right">{bookingData.barberDetails.name}</span>
                  </div>
                )}
                
                {bookingData.serviceDetails && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium text-right">{bookingData.serviceDetails.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium text-right">{bookingData.duration} min</span>
                    </div>
                  </>
                )}
                
                {bookingData.dateTime && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="font-medium text-right">
                      {new Date(bookingData.dateTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                
                {bookingData.price && (
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium">${bookingData.price.toFixed(2)}</span>
                    </div>
                    
                    {bookingData.addOns && bookingData.addOns.length > 0 && (
                      <>
                        {bookingData.addOns.map((addon, index) => (
                          <div key={index} className="flex justify-between text-xs mt-1">
                            <span className="text-gray-600 pl-2">+ {addon.name}:</span>
                            <span className="font-medium">${addon.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </>
                    )}
                    
                    <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-olive-600">
                        ${(bookingData.price + bookingData.addOns.reduce((sum, addon) => sum + addon.price, 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step Content for Mobile with Swipe Gestures */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleSwipeGesture}
                className="touch-pan-x"
              >
                {/* Swipe Indicators for Mobile */}
                <div className="md:hidden flex justify-center mb-2">
                  <div className="flex space-x-1">
                    {currentStep > 1 && (
                      <div className="w-4 h-1 bg-gray-300 rounded-full opacity-50" />
                    )}
                    <div className="w-6 h-1 bg-olive-600 rounded-full" />
                    {currentStep < steps.length && (
                      <div className="w-4 h-1 bg-gray-300 rounded-full opacity-50" />
                    )}
                  </div>
                </div>

                <CurrentStepComponent
                  bookingData={bookingData}
                  shopSettings={shopSettings}
                  onNext={handleNext}
                  onBack={handleBack}
                  onComplete={handleComplete}
                  isLoading={isLoading}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Layout - Side by Side */}
        <div className="hidden md:flex md:space-x-6">
          {/* Step Content for Desktop */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CurrentStepComponent
                  bookingData={bookingData}
                  shopSettings={shopSettings}
                  onNext={handleNext}
                  onBack={handleBack}
                  onComplete={handleComplete}
                  isLoading={isLoading}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Booking Summary Sidebar for Desktop */}
          {currentStep > 1 && (
            <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>
            
            <div className="space-y-3">
              {bookingData.locationDetails && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">{bookingData.locationDetails.name}</span>
                </div>
              )}
              
              {bookingData.barberDetails && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Barber:</span>
                  <span className="font-medium">{bookingData.barberDetails.name}</span>
                </div>
              )}
              
              {bookingData.serviceDetails && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">{bookingData.serviceDetails.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{bookingData.duration} minutes</span>
                  </div>
                </>
              )}
              
              {bookingData.dateTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-medium">
                    {new Date(bookingData.dateTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              
              {bookingData.price && (
                <>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Service Price:</span>
                      <span className="font-medium">${bookingData.price.toFixed(2)}</span>
                    </div>
                    
                    {bookingData.addOns && bookingData.addOns.length > 0 && (
                      <>
                        {bookingData.addOns.map((addon, index) => (
                          <div key={index} className="flex justify-between text-sm mt-1">
                            <span className="text-gray-600 pl-4">+ {addon.name}:</span>
                            <span className="font-medium">${addon.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </>
                    )}
                    
                    <div className="flex justify-between text-base font-semibold mt-3 pt-3 border-t">
                      <span>Total:</span>
                      <span className="text-olive-600">
                        ${(bookingData.price + bookingData.addOns.reduce((sum, addon) => sum + addon.price, 0)).toFixed(2)}
                      </span>
                    </div>
                    
                    {bookingData.paymentMethod && (
                      <div className="mt-2 text-sm text-gray-600">
                        Payment: {bookingData.paymentMethod === 'online' ? '💳 Online' : '💵 At Shop'}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}