'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  StarIcon as StarIconOutline,
  MapPinIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

export default function MobileBookingFlow({ 
  barberId, 
  initialServices = [], 
  onBookingComplete,
  className = '' 
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [barberData, setBarberData] = useState(null)
  const [services, setServices] = useState([])
  const [selectedServices, setSelectedServices] = useState(initialServices)
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedDateTime, setSelectedDateTime] = useState(null)
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    smsConsent: false
  })

  const totalSteps = 4

  useEffect(() => {
    if (barberId) {
      loadBarberAndServices()
    }
  }, [barberId])

  useEffect(() => {
    if (selectedServices.length > 0 && barberData) {
      loadAvailableSlots()
    }
  }, [selectedServices, barberData])

  const loadBarberAndServices = async () => {
    try {
      setLoading(true)
      
      const [barberResponse, servicesResponse] = await Promise.all([
        fetch(`/api/bookings/availability?barberId=${barberId}&date=${new Date().toISOString().split('T')[0]}`),
        fetch(`/api/bookings/services?barberId=${barberId}`)
      ])

      if (barberResponse.ok) {
        const barberData = await barberResponse.json()
        setBarberData(barberData.barber)
      }

      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json()
        setServices(servicesData.services || [])
      }
    } catch (error) {
      console.error('Failed to load barber data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableSlots = async () => {
    if (!selectedServices.length) return

    try {
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0)
      const slots = []
      
      // Load next 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() + i)
        const dateString = date.toISOString().split('T')[0]
        
        const response = await fetch(
          `/api/bookings/availability?barberId=${barberId}&date=${dateString}&duration=${totalDuration}`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.availableSlots?.length > 0) {
            slots.push({
              date: dateString,
              dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
              dayMonth: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              times: data.availableSlots.map(slot => slot.time)
            })
          }
        }
      }
      
      setAvailableSlots(slots)
    } catch (error) {
      console.error('Failed to load available slots:', error)
    }
  }

  const calculateTotal = () => {
    return selectedServices.reduce((sum, service) => sum + service.price, 0)
  }

  const calculateDuration = () => {
    return selectedServices.reduce((sum, service) => sum + service.duration, 0)
  }

  const toggleService = (service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id)
      if (exists) {
        return prev.filter(s => s.id !== service.id)
      } else {
        return [...prev, service]
      }
    })
  }

  const handleBooking = async () => {
    if (!canProceed(currentStep)) return

    setLoading(true)
    try {
      const bookingData = {
        barbershop_id: 'default-barbershop',
        barber_id: barberId,
        service_id: selectedServices[0].id,
        scheduled_at: selectedDateTime,
        duration_minutes: calculateDuration(),
        service_price: calculateTotal(),
        client_name: clientInfo.name,
        client_phone: clientInfo.phone,
        client_email: clientInfo.email,
        client_notes: clientInfo.notes,
        payment_method: 'cash',
        is_walk_in: false,
        all_services: selectedServices
      }

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        if (onBookingComplete) {
          onBookingComplete(result.booking)
        }
        setCurrentStep(totalSteps + 1) // Success step
      } else {
        throw new Error(result.error || 'Booking failed')
      }
    } catch (error) {
      console.error('Booking error:', error)
      alert(`Booking failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const canProceed = (step) => {
    switch (step) {
      case 1: return selectedServices.length > 0
      case 2: return selectedDateTime !== null
      case 3: return clientInfo.name && clientInfo.email && clientInfo.phone
      case 4: return true
      default: return false
    }
  }

  const nextStep = () => {
    if (currentStep < totalSteps && canProceed(currentStep)) {
      setCurrentStep(currentStep + 1)
    } else if (currentStep === totalSteps) {
      handleBooking()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (loading && !barberData) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!barberData) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Barber Not Found</h2>
          <p className="text-gray-600">Please check the link and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden">
                {barberData.image && (
                  <img 
                    src={barberData.image} 
                    alt={barberData.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{barberData.name}</h1>
                <p className="text-sm text-gray-600">{barberData.title}</p>
                <div className="flex items-center">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <StarIconSolid
                        key={i}
                        className={`h-3 w-3 ${
                          i < Math.floor(barberData.rating || 5) ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 ml-1">
                    {barberData.rating || 5.0} ({barberData.reviewCount || 0})
                  </span>
                </div>
              </div>
            </div>
            {currentStep <= totalSteps && (
              <div className="text-sm text-gray-600">
                {currentStep}/{totalSteps}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {currentStep <= totalSteps && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-olive-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 py-6">
        {/* Step 1: Services */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Choose Services</h2>
            <p className="text-gray-600">Select the services you'd like</p>
            
            <div className="space-y-3">
              {services.map(service => (
                <div
                  key={service.id}
                  onClick={() => toggleService(service)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedServices.find(s => s.id === service.id)
                      ? 'border-olive-500 bg-olive-50'
                      : 'border-gray-200 bg-white active:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                      <div className="flex items-center space-x-3 mt-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {service.duration}min
                        </div>
                        <div className="flex items-center">
                          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                          ${service.price}
                        </div>
                      </div>
                    </div>
                    {selectedServices.find(s => s.id === service.id) && (
                      <CheckCircleIcon className="h-6 w-6 text-olive-500 ml-3 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {selectedServices.length > 0 && (
              <div className="bg-olive-50 rounded-lg p-4 border border-olive-200">
                <h3 className="font-semibold text-olive-900 mb-2">Selected Services</h3>
                <div className="space-y-1">
                  {selectedServices.map(service => (
                    <div key={service.id} className="flex justify-between text-sm">
                      <span>{service.name}</span>
                      <span>${service.price}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold text-olive-900 pt-2 border-t border-olive-200">
                    <span>Total ({calculateDuration()}min)</span>
                    <span>${calculateTotal()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Time Selection */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Choose Time</h2>
            <p className="text-gray-600">Pick a convenient time slot</p>
            
            <div className="space-y-4">
              {availableSlots.map(day => (
                <div key={day.date} className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {day.dayName}, {day.dayMonth}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {day.times.slice(0, 6).map(time => { // Show max 6 slots per day on mobile
                      const dateTime = `${day.date}T${time}:00`
                      const isSelected = selectedDateTime === dateTime
                      
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedDateTime(dateTime)}
                          className={`p-3 text-sm rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-olive-500 bg-olive-50 text-olive-700'
                              : 'border-gray-200 bg-white active:bg-gray-50'
                          }`}
                        >
                          {new Date(`2000-01-01T${time}:00`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </button>
                      )
                    })}
                  </div>
                  {day.times.length > 6 && (
                    <p className="text-xs text-gray-500 mt-2">
                      +{day.times.length - 6} more slots available
                    </p>
                  )}
                </div>
              ))}
            </div>

            {availableSlots.length === 0 && (
              <div className="text-center py-8">
                <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Times</h3>
                <p className="text-gray-600">Please try selecting different services or contact us directly.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Client Info */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Your Information</h2>
            <p className="text-gray-600">We need a few details to confirm your booking</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={clientInfo.notes}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="Any special instructions..."
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <input
                    id="smsConsent"
                    type="checkbox"
                    checked={clientInfo.smsConsent}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, smsConsent: e.target.checked }))}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded mt-0.5"
                  />
                  <label htmlFor="smsConsent" className="ml-3 text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Get SMS reminders</span> (optional)<br />
                    <span className="text-xs">
                      Receive appointment reminders via text message. Standard rates may apply.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Confirm Booking</h2>
            
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-olive-50 px-4 py-3 border-b border-olive-200">
                <h3 className="font-semibold text-olive-900">Booking Summary</h3>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Barber:</span>
                  <span className="font-medium">{barberData.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Services:</span>
                  <div className="text-right">
                    {selectedServices.map(service => (
                      <div key={service.id} className="font-medium">{service.name}</div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <div className="text-right font-medium">
                    {selectedDateTime && new Date(selectedDateTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                    <div className="text-sm text-gray-600">
                      {selectedDateTime && new Date(selectedDateTime).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{calculateDuration()} minutes</span>
                </div>
                
                <div className="flex justify-between text-lg border-t pt-4">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-olive-600">${calculateTotal()}</span>
                </div>
              </div>
            </div>

            {barberData.location && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start space-x-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">{barberData.location.name}</h4>
                    <p className="text-sm text-gray-600">{barberData.location.address}</p>
                    <p className="text-sm text-gray-600">{barberData.location.phone}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success Step */}
        {currentStep > totalSteps && (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-6">
              Your appointment has been successfully booked. You'll receive a confirmation email shortly.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                We'll send you a reminder before your appointment. If you need to make any changes, 
                please contact us as soon as possible.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {currentStep <= totalSteps && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex justify-between space-x-3">
            {currentStep > 1 ? (
              <button
                onClick={prevStep}
                className="flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={nextStep}
              disabled={!canProceed(currentStep) || loading}
              className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all ${
                canProceed(currentStep) && !loading
                  ? 'bg-olive-600 text-white hover:bg-olive-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {currentStep === totalSteps ? 'Book Appointment' : 'Continue'}
                  {currentStep < totalSteps && <ChevronRightIcon className="h-4 w-4 ml-1" />}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}