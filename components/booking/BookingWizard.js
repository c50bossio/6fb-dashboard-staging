'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

import BarberStep from './steps/BarberStep'
import ConfirmationStep from './steps/ConfirmationStep'
import LocationStep from './steps/LocationStep'
import PaymentStep from './steps/PaymentStep'
import ServiceStep from './steps/ServiceStep'
import TimeStep from './steps/TimeStep'

export default function BookingWizard({ 
  initialLocation = null,
  onComplete = () => {},
  settings = {}
}) {
  const router = useRouter()
  const supabase = createClient()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
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
  
  useEffect(() => {
    loadShopSettings()
  }, [bookingData.location])
  
  const loadShopSettings = async () => {
    if (!bookingData.location) return
    
    try {
      // Load real shop settings from Supabase
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .select(`
          *,
          business_settings (
            accept_online_payment,
            accept_in_person_payment,
            require_online_payment,
            deposit_required,
            deposit_amount,
            deposit_percentage,
            cancellation_window,
            business_hours
          )
        `)
        .eq('id', bookingData.location)
        .single()

      if (shopError) {
        throw shopError
      }

      if (shopData?.business_settings) {
        const realSettings = {
          acceptOnlinePayment: shopData.business_settings.accept_online_payment ?? true,
          acceptInPersonPayment: shopData.business_settings.accept_in_person_payment ?? true,
          requireOnlinePayment: shopData.business_settings.require_online_payment ?? false,
          depositRequired: shopData.business_settings.deposit_required ?? false,
          depositAmount: shopData.business_settings.deposit_amount ?? 0,
          depositPercentage: shopData.business_settings.deposit_percentage ?? 20,
          cancellationWindow: shopData.business_settings.cancellation_window ?? 24,
          businessHours: shopData.business_settings.business_hours ?? {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '09:00', close: '16:00' },
            sunday: null // Closed
          }
        }
        
        setShopSettings(prev => ({ ...prev, ...realSettings }))
      } else {
        // Fallback to default settings if no business_settings found
        const defaultSettings = {
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
        
        setShopSettings(prev => ({ ...prev, ...defaultSettings }))
      }
    } catch (err) {
      // Use default settings as fallback on error
      const fallbackSettings = {
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
      
      setShopSettings(prev => ({ ...prev, ...fallbackSettings }))
    }
  }
  
  const steps = [
    { number: 1, title: 'Location', component: LocationStep },
    { number: 2, title: 'Barber', component: BarberStep },
    { number: 3, title: "Unknown Service", component: ServiceStep },
    { number: 4, title: 'Time', component: TimeStep },
    { number: 5, title: 'Payment', component: PaymentStep },
    { number: 6, title: 'Confirmation', component: ConfirmationStep }
  ]
  
  const handleNext = useCallback(async (stepData) => {
    setBookingData(prev => ({ ...prev, ...stepData }))
    
    // Handle payment step completion
    if (currentStep === 5) {
      setIsLoading(true)
      setError(null)
      
      try {
        // Create booking first
        const bookingToCreate = {
          ...bookingData,
          ...stepData,
          id: `booking_${Date.now()}_${Math.random().toString(36).substring(2)}`
        }
        
        // If payment was successful, booking is already confirmed via webhook
        // If in-person payment, create booking and move to confirmation
        if (stepData.paymentMethod === 'in-person' || stepData.paymentStatus === 'succeeded') {
          const response = await fetch('/api/bookings/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingData: bookingToCreate,
              paymentData: stepData
            })
          })
          
          const result = await response.json()
          
          if (!response.ok) {
            throw new Error(result.error || 'Failed to create booking')
          }
          
          // Send notification webhook to trigger booking confirmation
          try {
            await fetch('/api/v1/booking-notifications/webhooks/booking-wizard', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_type: 'booking_completed',
                booking_data: {
                  bookingId: result.booking.id,
                  customerInfo: bookingToCreate.customerInfo,
                  locationDetails: bookingToCreate.locationDetails,
                  barberDetails: bookingToCreate.barberDetails,
                  serviceDetails: bookingToCreate.serviceDetails,
                  dateTime: bookingToCreate.dateTime,
                  duration: bookingToCreate.duration,
                  price: bookingToCreate.price,
                  paymentMethod: stepData.paymentMethod,
                  paymentStatus: stepData.paymentStatus
                },
                timestamp: new Date().toISOString(),
                source: 'booking_wizard'
              })
            })
          } catch (notificationError) {
            // Log error but don't fail the booking
            console.error('Failed to send booking notification:', notificationError)
          }
          
          setBookingData(prev => ({ ...prev, ...result.booking, bookingId: result.booking.id }))
          setCurrentStep(6) // Move to confirmation
        } else {
          // Payment failed or was cancelled
          setError('Payment was not completed. Please try again.')
        }
        
      } catch (err) {
        setError(err.message)
        console.error('Booking creation error:', err)
      } finally {
        setIsLoading(false)
      }
      
      return // Don't proceed to normal step increment
    }
    
    // Handle other step transitions
    if (currentStep === 4 && !shopSettings.acceptOnlinePayment && shopSettings.acceptInPersonPayment) {
      setBookingData(prev => ({ ...prev, paymentMethod: 'in-person' }))
      setCurrentStep(6)
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep, shopSettings, bookingData])
  
  const handleBack = useCallback(() => {
    if (currentStep === 6 && !shopSettings.acceptOnlinePayment) {
      setCurrentStep(4)
    } else {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep, shopSettings])
  
  const handleStepClick = useCallback((stepNumber) => {
    if (stepNumber < currentStep) {
      setCurrentStep(stepNumber)
    }
  }, [currentStep])
  
  const handleComplete = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking')
      }
      
      onComplete(result.booking)
      
      router.push(`/bookings/${result.booking.id}/success`)
      
    } catch (err) {
      setError(err.message)
      console.error('Booking error:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
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
  )
}