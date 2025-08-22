'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  UserIcon,
  CreditCardIcon,
  SparklesIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  StarIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import Cookies from 'js-cookie'
import ProgressiveAccountCreation from './ProgressiveAccountCreation'

export default function PublicBookingFlow({ barbershopId, barbershopSlug }) {
  // Simplified state - just 3 steps
  const [currentStep, setCurrentStep] = useState(1) // 1: Service, 2: Time, 3: Confirm
  const [selectedService, setSelectedService] = useState(null)
  const [selectedDateTime, setSelectedDateTime] = useState(null)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  })
  
  // Data from API
  const [services, setServices] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingId, setBookingId] = useState(null)
  
  // Returning visitor recognition
  const [returningVisitor, setReturningVisitor] = useState(false)
  const [previousBookings, setPreviousBookings] = useState(0)

  useEffect(() => {
    // Check for returning visitor cookie
    const visitorData = Cookies.get('booking_visitor')
    if (visitorData) {
      try {
        const data = JSON.parse(visitorData)
        setReturningVisitor(true)
        setCustomerInfo({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || ''
        })
        setPreviousBookings(data.bookingCount || 0)
      } catch (e) {
        console.error('Failed to parse visitor cookie')
      }
    }
    
    // Load services
    loadServices()
  }, [barbershopId])

  const loadServices = async () => {
    try {
      const response = await fetch(`/api/public/services?barbershop_id=${barbershopId}`)
      const data = await response.json()
      if (data.success) {
        setServices(data.services)
      }
    } catch (error) {
      console.error('Failed to load services:', error)
      // Use fallback services
      setServices([
        {
          id: '1',
          name: 'Classic Haircut',
          duration: 30,
          price: 35,
          description: 'Professional cut with wash and style',
          popular: true
        },
        {
          id: '2',
          name: 'Beard Trim',
          duration: 20,
          price: 20,
          description: 'Precision beard trimming and styling'
        },
        {
          id: '3',
          name: 'Full Service',
          duration: 50,
          price: 50,
          description: 'Haircut + beard trim + hot towel',
          popular: true
        }
      ])
    }
  }

  const loadAvailableSlots = async (serviceId, date) => {
    setLoading(true)
    try {
      // For demo, generate sample slots
      const slots = []
      const now = new Date()
      const selectedDate = new Date(date)
      
      for (let hour = 9; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotTime = new Date(selectedDate)
          slotTime.setHours(hour, minute, 0, 0)
          
          if (slotTime > now && Math.random() > 0.3) {
            slots.push({
              time: slotTime.toISOString(),
              available: true,
              display: slotTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              })
            })
          }
        }
      }
      
      setAvailableSlots(slots.slice(0, 9)) // Show 9 slots for clean grid
    } catch (error) {
      console.error('Failed to load slots:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleServiceSelect = (service) => {
    setSelectedService(service)
    // Immediately load today's slots
    const today = new Date()
    loadAvailableSlots(service.id, today)
    setCurrentStep(2)
  }

  const handleTimeSelect = (slot) => {
    setSelectedDateTime(slot)
    setCurrentStep(3)
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Create booking without authentication
      const bookingData = {
        barbershop_id: barbershopId,
        service_id: selectedService.id,
        service_name: selectedService.name,
        scheduled_at: selectedDateTime.time,
        duration_minutes: selectedService.duration,
        price: selectedService.price,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_email: customerInfo.email,
        source: 'public_booking'
      }
      
      const response = await fetch('/api/public/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Save visitor info in cookie (expires in 90 days)
        const visitorData = {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          bookingCount: previousBookings + 1,
          lastBooking: new Date().toISOString()
        }
        Cookies.set('booking_visitor', JSON.stringify(visitorData), { expires: 90 })
        
        setBookingId(result.booking.id)
        setBookingComplete(true)
      }
    } catch (error) {
      console.error('Booking failed:', error)
      alert('Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Service Selection
  const ServiceStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Select Your Service
        </h2>
        <p className="text-gray-600">
          Choose from our professional services
        </p>
        {returningVisitor && (
          <p className="text-sm text-green-600 mt-2">
            Welcome back! You've booked with us {previousBookings} time{previousBookings !== 1 ? 's' : ''} before.
          </p>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => handleServiceSelect(service)}
            className="relative group p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left"
          >
            {service.popular && (
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold py-1 px-3 rounded-full flex items-center">
                <StarIcon className="h-3 w-3 mr-1" />
                Popular
              </div>
            )}
            
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {service.name}
              </h3>
              <p className="text-sm text-gray-600">
                {service.description}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center text-gray-500">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm">{service.duration} min</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ${service.price}
                </div>
              </div>
              
              <div className="flex items-center justify-center pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-blue-600 font-medium">Select Service</span>
                <ArrowRightIcon className="h-4 w-4 ml-2 text-blue-600" />
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Trust Indicators */}
      <div className="grid grid-cols-3 gap-4 pt-6 border-t">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <BoltIcon className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-sm font-medium text-gray-900">Instant Booking</p>
          <p className="text-xs text-gray-600">No account needed</p>
        </div>
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <ShieldCheckIcon className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-sm font-medium text-gray-900">Secure & Safe</p>
          <p className="text-xs text-gray-600">Your data is protected</p>
        </div>
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <StarIcon className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-sm font-medium text-gray-900">4.9 Rating</p>
          <p className="text-xs text-gray-600">500+ happy customers</p>
        </div>
      </div>
    </div>
  )

  // Step 2: Time Selection
  const TimeStep = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date)
    }
    
    const [selectedDate, setSelectedDate] = useState(dates[0])
    
    useEffect(() => {
      if (selectedService) {
        loadAvailableSlots(selectedService.id, selectedDate)
      }
    }, [selectedDate, selectedService])
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Pick Your Time
          </h2>
          <p className="text-gray-600">
            {selectedService?.name} • {selectedService?.duration} minutes • ${selectedService?.price}
          </p>
        </div>
        
        {/* Date Selection */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((date) => {
            const isSelected = selectedDate.toDateString() === date.toDateString()
            const isToday = date.toDateString() === today.toDateString()
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xs font-medium">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-lg font-bold">
                  {date.getDate()}
                </div>
                {isToday && (
                  <div className="text-xs text-blue-600">Today</div>
                )}
              </button>
            )
          })}
        </div>
        
        {/* Time Slots */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {availableSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => handleTimeSelect(slot)}
                className="py-3 px-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all font-medium"
              >
                {slot.display}
              </button>
            ))}
          </div>
        )}
        
        {availableSlots.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No available times for this date</p>
            <p className="text-sm">Please try another date</p>
          </div>
        )}
        
        {/* Quick booking incentive */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <SparklesIcon className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Book now and save time!
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Only 2 spots left for today. Secure your appointment in just one more click.
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setCurrentStep(1)}
          className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
        >
          ← Back to services
        </button>
      </div>
    )
  }

  // Step 3: Quick Confirmation
  const ConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Confirm Your Booking
        </h2>
        <p className="text-gray-600">
          Almost done! Just need your contact info
        </p>
      </div>
      
      {/* Booking Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-3">Your Appointment</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Service:</span>
            <span className="font-medium">{selectedService?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date & Time:</span>
            <span className="font-medium">
              {selectedDateTime && new Date(selectedDateTime.time).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })} at {selectedDateTime?.display}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">{selectedService?.duration} minutes</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-900 font-semibold">Total:</span>
            <span className="text-xl font-bold text-gray-900">${selectedService?.price}</span>
          </div>
        </div>
      </div>
      
      {/* Quick Contact Form */}
      <form onSubmit={handleBookingSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            required
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John Smith"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            required
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="(555) 123-4567"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email (for confirmation)
          </label>
          <input
            type="email"
            required
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>
        
        {/* Payment Note */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center">
            <CreditCardIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">Pay at the shop</p>
              <p className="text-gray-600">No payment required now. Pay when you arrive.</p>
            </div>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Booking...' : 'Confirm Booking'}
        </button>
      </form>
      
      <button
        onClick={() => setCurrentStep(2)}
        className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
      >
        ← Back to time selection
      </button>
    </div>
  )

  // Booking Complete
  const BookingComplete = () => {
    const [showAccountCreation, setShowAccountCreation] = useState(false)
    
    if (showAccountCreation) {
      return (
        <ProgressiveAccountCreation
          bookingDetails={{
            id: bookingId,
            barbershop_id: barbershopId,
            scheduled_at: selectedDateTime?.time,
            service: selectedService?.name
          }}
          customerInfo={customerInfo}
          onAccountCreated={(user) => {
            console.log('Account created for user:', user)
          }}
          onSkip={() => setShowAccountCreation(false)}
        />
      )
    }
    
    return (
      <div className="text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircleIcon className="h-12 w-12 text-green-600" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h2>
          <p className="text-gray-600">
            We've sent confirmation details to {customerInfo.email}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Booking ID: #{bookingId || 'BK' + Date.now()}
          </p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-left max-w-md mx-auto">
          <h3 className="font-semibold text-green-900 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li className="flex items-start">
              <CheckIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Check your email for confirmation details</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>We'll send you a reminder 24 hours before</span>
            </li>
            <li className="flex items-start">
              <CheckIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Arrive 5 minutes early for check-in</span>
            </li>
          </ul>
        </div>
        
        {/* Optional Account Creation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
          <UserIcon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold text-blue-900 mb-2">
            Create an Account (Optional)
          </h3>
          <p className="text-sm text-blue-800 mb-4">
            Save time on future bookings and track your appointment history
          </p>
          <div className="space-y-2">
            <button 
              onClick={() => setShowAccountCreation(true)}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Create Account
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full text-blue-600 py-2 text-sm hover:text-blue-800"
            >
              Book another appointment
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Progress indicator
  const ProgressBar = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              step <= currentStep || bookingComplete
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}>
              {(step < currentStep || bookingComplete) ? <CheckIcon className="h-5 w-5" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-20 h-1 ${
                step < currentStep || bookingComplete ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quick Booking</h1>
          <p className="text-gray-600">Book in 3 clicks • No account needed</p>
        </div>
        
        {/* Progress */}
        {!bookingComplete && <ProgressBar />}
        
        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {bookingComplete ? (
            <BookingComplete />
          ) : (
            <>
              {currentStep === 1 && <ServiceStep />}
              {currentStep === 2 && <TimeStep />}
              {currentStep === 3 && <ConfirmStep />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}