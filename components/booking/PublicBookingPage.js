'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

// Step Components
import StaffProfileCard from './StaffProfileCard'
import ServiceSelector from './ServiceSelector'
import AvailabilityCalendar from './AvailabilityCalendar'
import BookingForm from './BookingForm'
import BookingConfirmation from './BookingConfirmation'

/**
 * Public Booking Page (Client Component)
 * Handles the interactive booking flow for clients
 */
export default function PublicBookingPage({ staff, services, barbershop }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [bookingData, setBookingData] = useState({
    staffId: staff.id,
    staffSlug: staff.booking_slug,
    serviceId: null,
    serviceDetails: null,
    dateTime: null,
    duration: null,
    price: null,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    notes: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const steps = [
    { number: 1, title: 'Select Service' },
    { number: 2, title: 'Choose Time' },
    { number: 3, title: 'Your Info' },
    { number: 4, title: 'Confirmation' },
  ]

  const handleServiceSelect = (service) => {
    setBookingData(prev => ({
      ...prev,
      serviceId: service.id,
      serviceDetails: service,
      duration: service.duration_minutes,
      price: service.price,
    }))
    setCurrentStep(2)
  }

  const handleTimeSelect = (dateTime) => {
    setBookingData(prev => ({
      ...prev,
      dateTime,
    }))
    setCurrentStep(3)
  }

  const handleClientInfoSubmit = (clientInfo) => {
    setBookingData(prev => ({
      ...prev,
      ...clientInfo,
    }))
    createBooking({
      ...bookingData,
      ...clientInfo,
    })
  }

  const createBooking = async (data) => {
    setIsLoading(true)
    setError(null)

    try {
      // Create booking via API
      const response = await fetch(`/api/book/${staff.booking_slug}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: data.staffId,
          service_id: data.serviceId,
          scheduled_at: data.dateTime,
          duration_minutes: data.duration,
          price: data.price,
          client_name: data.clientName,
          client_email: data.clientEmail,
          client_phone: data.clientPhone,
          notes: data.notes,
          booking_source: 'staff_link', // Track that this came from public link
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking')
      }

      // Update booking data with confirmation details
      setBookingData(prev => ({
        ...prev,
        bookingId: result.booking.id,
        confirmationNumber: result.booking.confirmation_number,
      }))

      setCurrentStep(4)
    } catch (err) {
      console.error('Booking error:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleStartOver = () => {
    setCurrentStep(1)
    setBookingData({
      staffId: staff.id,
      staffSlug: staff.booking_slug,
      serviceId: null,
      serviceDetails: null,
      dateTime: null,
      duration: null,
      price: null,
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      notes: '',
    })
    setError(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Staff Info */}
      <div className="bg-card dark:bg-card/95 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <StaffProfileCard staff={staff} barbershop={barbershop} compact />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Contact Options Banner */}
        {currentStep === 1 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start">
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Prefer to call or email?</strong> You can also reach us directly:
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-blue-800 dark:text-blue-200">
                {(staff.phone || barbershop?.phone) && (
                  <a
                    href={`tel:${staff.phone || barbershop.phone}`}
                    className="font-medium hover:text-blue-900 dark:hover:text-blue-100 underline"
                  >
                    📞 {staff.phone || barbershop.phone}
                  </a>
                )}
                {(staff.email || barbershop?.email) && (
                  <a
                    href={`mailto:${staff.email || barbershop.email}?subject=Appointment Request with ${staff.first_name} ${staff.last_name}`}
                    className="font-medium hover:text-blue-900 dark:hover:text-blue-100 underline"
                  >
                    ✉️ {staff.email || barbershop.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        {currentStep < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.slice(0, 3).map((step, index) => (
                <div key={step.number} className="flex-1">
                  <div className="relative">
                    {/* Connector Line */}
                    {index < 2 && (
                      <div
                        className={`absolute top-5 left-1/2 w-full h-0.5 ${
                          currentStep > step.number ? 'bg-olive-600' : 'bg-gray-300'
                        }`}
                      />
                    )}

                    {/* Step Circle */}
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mx-auto ${
                        currentStep === step.number
                          ? 'bg-olive-600 text-white ring-4 ring-olive-100'
                          : currentStep > step.number
                          ? 'bg-olive-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {currentStep > step.number ? '✓' : step.number}
                    </div>

                    {/* Step Title */}
                    <div className="text-center mt-2">
                      <span
                        className={`text-sm font-medium ${
                          currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-900 dark:text-red-100">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 1 && (
                <ServiceSelector
                  services={services}
                  onSelect={handleServiceSelect}
                />
              )}

              {currentStep === 2 && (
                <AvailabilityCalendar
                  staffSlug={staff.booking_slug}
                  serviceId={bookingData.serviceId}
                  duration={bookingData.duration}
                  onSelect={handleTimeSelect}
                  onBack={handleBack}
                />
              )}

              {currentStep === 3 && (
                <BookingForm
                  bookingData={bookingData}
                  onSubmit={handleClientInfoSubmit}
                  onBack={handleBack}
                  isLoading={isLoading}
                />
              )}

              {currentStep === 4 && (
                <BookingConfirmation
                  bookingData={bookingData}
                  staff={staff}
                  barbershop={barbershop}
                  onStartOver={handleStartOver}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Booking Summary (Right Sidebar on Desktop) */}
        {currentStep > 1 && currentStep < 4 && (
          <div className="mt-6 lg:mt-0">
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Booking Summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Barber:</span>
                  <span className="font-medium text-foreground">
                    {staff.first_name} {staff.last_name}
                  </span>
                </div>

                {bookingData.serviceDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service:</span>
                      <span className="font-medium text-foreground">
                        {bookingData.serviceDetails.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium text-foreground">
                        {bookingData.duration} min
                      </span>
                    </div>
                  </>
                )}

                {bookingData.dateTime && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date & Time:</span>
                    <span className="font-medium text-foreground">
                      {new Date(bookingData.dateTime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                {bookingData.price && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total:</span>
                      <span className="text-olive-600">${bookingData.price.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
