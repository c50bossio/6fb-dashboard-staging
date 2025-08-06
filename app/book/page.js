'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../lib/supabase/client'
import { 
  CalendarDaysIcon,
  UserGroupIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  StarIcon,
  MapPinIcon,
  CreditCardIcon,
  GiftIcon
} from '@heroicons/react/24/outline'
import { CheckIcon, StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

// Service types with customer-friendly descriptions
const SERVICES = [
  { 
    id: 'haircut', 
    name: 'Classic Haircut', 
    duration: 30, 
    price: 35, 
    color: '#3B82F6',
    description: 'Professional cut with wash and style',
    popular: true
  },
  { 
    id: 'beard', 
    name: 'Beard Trim & Shape', 
    duration: 20, 
    price: 20, 
    color: '#10B981',
    description: 'Precision beard trimming and styling',
    popular: false
  },
  { 
    id: 'full', 
    name: 'Full Service', 
    duration: 50, 
    price: 50, 
    color: '#8B5CF6',
    description: 'Complete haircut + beard trim + hot towel',
    popular: true
  },
  { 
    id: 'kids', 
    name: 'Kids Cut (12 & Under)', 
    duration: 20, 
    price: 25, 
    color: '#F59E0B',
    description: 'Kid-friendly cuts with patience and care',
    popular: false
  }
]

// Barbers with customer-facing information
const BARBERS = [
  { 
    id: '1', 
    name: 'Marcus Johnson', 
    title: 'Master Barber',
    specialty: 'Modern cuts & fades',
    experience: '8+ years',
    rating: 4.9,
    avatar: '/api/placeholder/100/100',
    bio: 'Specializes in contemporary styles and precision fades. Known for attention to detail.',
    available: true
  },
  { 
    id: '2', 
    name: 'David Rodriguez', 
    title: 'Senior Stylist',
    specialty: 'Classic styles & beard work',
    experience: '6+ years',
    rating: 4.8,
    avatar: '/api/placeholder/100/100',
    bio: 'Expert in traditional barbering techniques and beard grooming.',
    available: true
  },
  { 
    id: '3', 
    name: 'Mike Thompson', 
    title: 'Beard Specialist',
    specialty: 'Beard sculpting & styling',
    experience: '5+ years',
    rating: 4.9,
    avatar: '/api/placeholder/100/100',
    bio: 'Passionate about beard artistry and mens grooming.',
    available: false // Unavailable today
  }
]

const SHOP_INFO = {
  name: '6FB Barbershop',
  address: '123 Main Street, Downtown, CA 90210',
  phone: '(555) 123-4567',
  hours: {
    'Monday': '9:00 AM - 6:00 PM',
    'Tuesday': '9:00 AM - 6:00 PM',
    'Wednesday': '9:00 AM - 6:00 PM',
    'Thursday': '9:00 AM - 6:00 PM',
    'Friday': '9:00 AM - 7:00 PM',
    'Saturday': '9:00 AM - 5:00 PM',
    'Sunday': 'Closed'
  }
}

export default function CustomerBookingPage() {
  // Booking flow state
  const [currentStep, setCurrentStep] = useState('service') // service -> barber -> time -> details -> confirmation
  const [selectedService, setSelectedService] = useState(null)
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  
  // Customer details
  const [customerDetails, setCustomerDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
    isFirstTime: false,
    marketingOptIn: false,
    reminderPrefs: {
      sms: true,
      email: true
    }
  })

  const supabase = createClient()

  // Load available time slots when barber and date change
  useEffect(() => {
    if (selectedBarber && selectedDate && selectedService) {
      loadAvailableSlots()
    }
  }, [selectedBarber, selectedDate, selectedService])

  const loadAvailableSlots = async () => {
    setIsLoading(true)
    
    // Simulate API call to get available slots
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Generate available slots for the selected date
    const slots = generateTimeSlots(selectedDate, selectedBarber.id)
    setAvailableSlots(slots)
    setIsLoading(false)
  }

  const generateTimeSlots = (date, barberId) => {
    const slots = []
    const startHour = 9
    const endHour = 18
    const slotInterval = 30 // minutes
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        const slotTime = new Date(date)
        slotTime.setHours(hour, minute, 0, 0)
        
        // Skip past times
        if (slotTime <= new Date()) continue
        
        // Simulate some booked slots
        const isBooked = Math.random() < 0.3
        
        if (!isBooked) {
          slots.push({
            time: slotTime,
            available: true,
            price: selectedService.price
          })
        }
      }
    }
    
    return slots.slice(0, 12) // Limit to 12 slots for better UX
  }

  const handleServiceSelect = (service) => {
    setSelectedService(service)
    setCurrentStep('barber')
  }

  const handleBarberSelect = (barber) => {
    setSelectedBarber(barber)
    setCurrentStep('time')
  }

  const handleTimeSelect = (slot) => {
    setSelectedTime(slot)
    setCurrentStep('details')
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate booking creation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In production, this would create the booking and send confirmations
    console.log('Booking created:', {
      service: selectedService,
      barber: selectedBarber,
      time: selectedTime,
      customer: customerDetails
    })
    
    setBookingConfirmed(true)
    setCurrentStep('confirmation')
    setIsLoading(false)
  }

  // Step components
  const ServiceSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Service</h2>
        <p className="text-gray-600">Select the service you'd like to book</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {SERVICES.map((service) => (
          <button
            key={service.id}
            onClick={() => handleServiceSelect(service)}
            className="relative p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
          >
            {service.popular && (
              <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full">
                Popular
              </div>
            )}
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">{service.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {service.duration} min
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      ${service.price}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const BarberSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Barber</h2>
        <p className="text-gray-600">Select your preferred barber for {selectedService.name}</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {BARBERS.filter(barber => barber.available).map((barber) => (
          <button
            key={barber.id}
            onClick={() => handleBarberSelect(barber)}
            className="p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-start space-x-4">
              <img
                src={barber.avatar}
                alt={barber.name}
                className="w-16 h-16 rounded-full bg-gray-200"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">{barber.name}</h3>
                <p className="text-sm text-blue-600 font-medium">{barber.title}</p>
                
                <div className="flex items-center mt-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarIconSolid 
                        key={i} 
                        className={`h-4 w-4 ${i < Math.floor(barber.rating) ? 'text-yellow-400' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 ml-2">{barber.rating} ({barber.experience})</span>
                </div>
                
                <p className="text-sm text-gray-600 mt-2">{barber.bio}</p>
                <p className="text-sm text-gray-500 mt-1">
                  <strong>Specialty:</strong> {barber.specialty}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      <button
        onClick={() => setCurrentStep('service')}
        className="w-full py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        ← Back to Services
      </button>
    </div>
  )

  const TimeSelection = () => {
    const today = new Date()
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() + i + 1) // Start from tomorrow
      return date
    })

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Date & Time</h2>
          <p className="text-gray-600">
            {selectedService.name} with {selectedBarber.name}
          </p>
        </div>
        
        {/* Date Selection */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Choose Date</h3>
          <div className="grid grid-cols-7 gap-2">
            {dates.map((date) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString()
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
              const dayNumber = date.getDate()
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`p-3 text-center border rounded-lg transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-xs text-gray-500">{dayName}</div>
                  <div className="text-lg font-semibold">{dayNumber}</div>
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Time Selection */}
        {selectedDate && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Available Times</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading available times...</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
                {availableSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => handleTimeSelect(slot)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-center"
                  >
                    <div className="text-sm font-medium">
                      {slot.time.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {!isLoading && availableSlots.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No available times for this date</p>
                <p className="text-sm">Please try another date</p>
              </div>
            )}
          </div>
        )}
        
        <button
          onClick={() => setCurrentStep('barber')}
          className="w-full py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Barber Selection
        </button>
      </div>
    )
  }

  const CustomerDetailsForm = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Details</h2>
        <p className="text-gray-600">We'll send booking confirmation and reminders</p>
      </div>
      
      {/* Booking Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Booking Summary</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Service:</strong> {selectedService.name}</p>
          <p><strong>Barber:</strong> {selectedBarber.name}</p>
          <p><strong>Date & Time:</strong> {selectedTime.time.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })} at {selectedTime.time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          })}</p>
          <p><strong>Duration:</strong> {selectedService.duration} minutes</p>
          <p><strong>Price:</strong> ${selectedService.price}</p>
        </div>
      </div>
      
      <form onSubmit={handleBookingSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              required
              value={customerDetails.firstName}
              onChange={(e) => setCustomerDetails({...customerDetails, firstName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              required
              value={customerDetails.lastName}
              onChange={(e) => setCustomerDetails({...customerDetails, lastName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            required
            value={customerDetails.phone}
            onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email"
            required
            value={customerDetails.email}
            onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests (Optional)</label>
          <textarea
            value={customerDetails.notes}
            onChange={(e) => setCustomerDetails({...customerDetails, notes: e.target.value})}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any special requests or preferences..."
          />
        </div>

        {/* Preferences */}
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={customerDetails.isFirstTime}
              onChange={(e) => setCustomerDetails({...customerDetails, isFirstTime: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              This is my first time at {SHOP_INFO.name}
            </span>
          </label>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Send me reminders via:</p>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={customerDetails.reminderPrefs.sms}
                  onChange={(e) => setCustomerDetails({
                    ...customerDetails, 
                    reminderPrefs: {...customerDetails.reminderPrefs, sms: e.target.checked}
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 flex items-center">
                  <DevicePhoneMobileIcon className="h-4 w-4 mr-1" />
                  SMS reminders (recommended)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={customerDetails.reminderPrefs.email}
                  onChange={(e) => setCustomerDetails({
                    ...customerDetails, 
                    reminderPrefs: {...customerDetails.reminderPrefs, email: e.target.checked}
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 flex items-center">
                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                  Email reminders
                </span>
              </label>
            </div>
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={customerDetails.marketingOptIn}
              onChange={(e) => setCustomerDetails({...customerDetails, marketingOptIn: e.target.checked})}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Send me promotions and updates (optional)
            </span>
          </label>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center font-medium"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Booking Appointment...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5 mr-2" />
                Confirm Booking
              </>
            )}
          </button>
        </div>
      </form>
      
      <button
        onClick={() => setCurrentStep('time')}
        className="w-full py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        ← Back to Time Selection
      </button>
    </div>
  )

  const BookingConfirmation = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircleIcon className="h-10 w-10 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600">
          Your appointment has been scheduled and confirmation details have been sent to your email and phone.
        </p>
      </div>
      
      {/* Booking Details Card */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-left">
        <h3 className="font-semibold text-green-900 mb-4">Appointment Details</h3>
        <div className="space-y-2 text-sm text-green-700">
          <p><strong>Service:</strong> {selectedService.name}</p>
          <p><strong>Barber:</strong> {selectedBarber.name}</p>
          <p><strong>Date:</strong> {selectedTime.time.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
          <p><strong>Time:</strong> {selectedTime.time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          })}</p>
          <p><strong>Duration:</strong> {selectedService.duration} minutes</p>
          <p><strong>Total:</strong> ${selectedService.price}</p>
          <p><strong>Customer:</strong> {customerDetails.firstName} {customerDetails.lastName}</p>
        </div>
      </div>
      
      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
        <ul className="text-sm text-blue-700 space-y-1 text-left">
          <li>• You'll receive an SMS and email confirmation shortly</li>
          <li>• We'll send you a reminder 24 hours before your appointment</li>
          <li>• Please arrive 5 minutes early for your appointment</li>
          <li>• If you need to cancel or reschedule, call us at {SHOP_INFO.phone}</li>
        </ul>
      </div>
      
      {/* Shop Information */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-left">
            <p className="font-medium text-gray-900">{SHOP_INFO.name}</p>
            <p className="text-sm text-gray-600">{SHOP_INFO.address}</p>
            <p className="text-sm text-gray-600">{SHOP_INFO.phone}</p>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => window.location.reload()}
        className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-medium"
      >
        Book Another Appointment
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">{SHOP_INFO.name}</h1>
            <p className="text-gray-600 mt-2">Book your appointment online</p>
            
            {/* Progress Indicator */}
            <div className="flex justify-center mt-6">
              <div className="flex items-center space-x-4">
                {['service', 'barber', 'time', 'details', 'confirmation'].map((step, index) => {
                  const stepNumber = index + 1
                  const isCompleted = ['service', 'barber', 'time', 'details'].indexOf(currentStep) > index || currentStep === 'confirmation'
                  const isCurrent = currentStep === step
                  
                  return (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isCompleted 
                          ? 'bg-blue-600 text-white' 
                          : isCurrent 
                          ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {isCompleted ? <CheckIcon className="h-4 w-4" /> : stepNumber}
                      </div>
                      {index < 4 && (
                        <div className={`w-12 h-0.5 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
          {currentStep === 'service' && <ServiceSelection />}
          {currentStep === 'barber' && <BarberSelection />}
          {currentStep === 'time' && <TimeSelection />}
          {currentStep === 'details' && <CustomerDetailsForm />}
          {currentStep === 'confirmation' && <BookingConfirmation />}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Contact Information</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center">
                  <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{SHOP_INFO.address}</span>
                </div>
                <div className="flex items-center">
                  <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>{SHOP_INFO.phone}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Hours of Operation</h3>
              <div className="space-y-1 text-sm text-gray-300">
                {Object.entries(SHOP_INFO.hours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span>{day}:</span>
                    <span>{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>© 2024 {SHOP_INFO.name}. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}