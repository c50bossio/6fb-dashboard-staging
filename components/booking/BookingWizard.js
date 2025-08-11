'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

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
      // In production, fetch from database
      // For now, use mock settings
      const Settings = {
        acceptOnlinePayment: true,
        acceptInPersonPayment: true,
        requireOnlinePayment: false,
        depositRequired: false,
        depositAmount: 0,
        depositPercentage: 20,
        cancellationWindow: 24,
        businessHours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { open: '09:00', close: '18:00' },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '18:00' },
          saturday: { open: '09:00', close: '16:00' },
          sunday: null // Closed
        }
      }
      
      setShopSettings(prev => ({ ...prev, ...mockSettings }))
    } catch (err) {
      console.error('Error loading shop settings:', err)
    }
  }
  
  // Step configuration
  const steps = [
    { number: 1, title: 'Location', component: LocationStep },
    { number: 2, title: 'Barber', component: BarberStep },
    { number: 3, title: "Unknown Service", component: ServiceStep },
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
  
  const handleComplete = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Create booking through API
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking')
      }
      
      // Call completion handler
      onComplete(result.booking)
      
      // Redirect to booking details
      router.push(`/bookings/${result.booking.id}/success`)
      
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book Your Appointment</h1>
          <p className="text-gray-600 mt-2">Follow the steps below to schedule your visit</p>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex-1">
                <div className="relative">
                  {/* Line */}
                  {index < steps.length - 1 && (
                    <div className={`absolute top-5 w-full h-0.5 ${
                      currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
                    }`} style={{ left: '50%' }} />
                  )}
                  
                  {/* Step Circle */}
                  <button
                    onClick={() => handleStepClick(step.number)}
                    disabled={step.number > currentStep}
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      currentStep === step.number
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : currentStep > step.number
                        ? 'bg-blue-600 text-white cursor-pointer hover:ring-2 hover:ring-blue-200'
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
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
        
        {/* Booking Summary Sidebar */}
        {currentStep > 1 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
                      <span className="text-blue-600">
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
  )
}