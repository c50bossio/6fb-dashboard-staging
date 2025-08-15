'use client'

import { 
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Head from 'next/head'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { generatePageTitle, generateMetaDescription } from '../../../lib/seo-utils'

function BookingPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [barberData, setBarberData] = useState(null)
  const [availableServices, setAvailableServices] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedDateTime, setSelectedDateTime] = useState(null)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    smsConsent: false
  })

  const urlServices = searchParams?.get('services')?.split(',') || []
  const urlTimeSlots = searchParams?.get('timeSlots')?.split(',') || []
  const urlDuration = searchParams?.get('duration')
  const urlPrice = searchParams?.get('price')
  const urlDiscount = searchParams?.get('discount')
  const urlExpires = searchParams?.get('expires')

  useEffect(() => {
    loadBarberData()
  }, [params.barberId])

  useEffect(() => {
    const trackPageView = async () => {
      try {
        const linkId = searchParams?.get('linkId')
        if (linkId) {
          let sessionId = sessionStorage.getItem('booking_session_id')
          if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            sessionStorage.setItem('booking_session_id', sessionId)
          }

          await fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              linkId: linkId,
              eventType: 'view',
              sessionId: sessionId,
              referrer: document.referrer,
              utmSource: searchParams?.get('utm_source'),
              utmMedium: searchParams?.get('utm_medium'),
              utmCampaign: searchParams?.get('utm_campaign'),
              utmTerm: searchParams?.get('utm_term'),
              utmContent: searchParams?.get('utm_content')
            })
          }).catch(error => {
            console.error('Analytics tracking failed:', error)
          })
        }
      } catch (error) {
        console.error('Page view tracking failed:', error)
      }
    }

    const timer = setTimeout(trackPageView, 1000)
    return () => clearTimeout(timer)
  }, [searchParams])

  useEffect(() => {
    if (urlServices.length > 0 && availableServices.length > 0) {
      const preSelectedServices = availableServices.filter(service => 
        urlServices.includes(service.id.toString()) || 
        urlServices.some(urlService => service.name.toLowerCase().includes(urlService.toLowerCase()))
      )
      setSelectedServices(preSelectedServices)
    }
  }, [urlServices, availableServices])

  const loadBarberData = async () => {
    try {
      setLoading(true)
      
      const Barber = {
        id: params.barberId,
        name: 'Marcus Johnson',
        title: 'Master Barber',
        image: '/barbers/marcus.jpg',
        rating: 4.9,
        reviewCount: 156,
        bio: 'Professional barber with over 10 years of experience specializing in fades, beard sculpting, and modern men\'s cuts.',
        location: {
          name: '6FB Downtown',
          address: '123 Main St, Downtown, NY 10001',
          phone: '(555) 123-4567'
        },
        specialties: ['Fades', 'Beard Sculpting', 'Hot Towel Shaves', 'Classic Cuts'],
        availability: {
          monday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
          tuesday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
          wednesday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
          thursday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
          friday: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
          saturday: ['09:00', '10:00', '11:00', '14:00', '15:00'],
          sunday: ['10:00', '11:00', '12:00', '14:00', '15:00']
        }
      }

      const Services = [
        { id: 1, name: 'Classic Cut', duration: 30, price: 35, description: 'Traditional scissor cut and style', category: 'Haircuts' },
        { id: 2, name: 'Fade Cut', duration: 45, price: 45, description: 'Modern fade with scissor work on top', category: 'Haircuts' },
        { id: 3, name: 'Buzz Cut', duration: 15, price: 25, description: 'Clean, uniform length all around', category: 'Haircuts' },
        { id: 4, name: 'Beard Trim', duration: 20, price: 20, description: 'Precision beard trimming and shaping', category: 'Beard Services' },
        { id: 5, name: 'Beard Sculpting', duration: 30, price: 35, description: 'Detailed beard design and sculpting', category: 'Beard Services' },
        { id: 6, name: 'Hot Towel Shave', duration: 45, price: 50, description: 'Traditional straight razor shave with hot towel', category: 'Premium Services' },
        { id: 7, name: 'Hair Wash & Style', duration: 25, price: 30, description: 'Professional wash and styling', category: 'Add-ons' },
        { id: 8, name: 'Eyebrow Trim', duration: 10, price: 15, description: 'Eyebrow trimming and shaping', category: 'Add-ons' }
      ]

      setBarberData(mockBarber)
      setAvailableServices(mockServices)
    } catch (error) {
      console.error('Failed to load barber data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleServiceToggle = (service) => {
    setSelectedServices(prev => 
      prev.find(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    )
  }

  const calculateTotalDuration = () => {
    if (urlDuration && !selectedServices.length) return parseInt(urlDuration)
    return selectedServices.reduce((total, service) => total + service.duration, 0)
  }

  const calculateTotalPrice = () => {
    if (urlPrice) return parseFloat(urlPrice)
    const basePrice = selectedServices.reduce((total, service) => total + service.price, 0)
    if (urlDiscount) {
      const discount = parseFloat(urlDiscount)
      return basePrice * (1 - discount / 100)
    }
    return basePrice
  }

  const getFilteredTimeSlots = () => {
    if (!urlTimeSlots.length) return ['morning', 'afternoon', 'evening']
    return urlTimeSlots
  }

  const generateAvailableSlots = () => {
    const slots = []
    const today = new Date()
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const daySlots = barberData?.availability[dayName] || []
      
      const filteredSlots = urlTimeSlots.length > 0 
        ? daySlots.filter(time => {
            const hour = parseInt(time.split(':')[0])
            return urlTimeSlots.some(slot => {
              if (slot === 'morning') return hour >= 9 && hour < 12
              if (slot === 'afternoon') return hour >= 12 && hour < 17
              if (slot === 'evening') return hour >= 17 && hour < 20
              if (slot === 'weekend') return date.getDay() === 0 || date.getDay() === 6
              if (slot === 'weekdays') return date.getDay() >= 1 && date.getDay() <= 5
              return true
            })
          })
        : daySlots

      if (filteredSlots.length > 0) {
        slots.push({
          date: date.toISOString().split('T')[0],
          dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
          dayMonth: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          times: filteredSlots
        })
      }
    }
    
    return slots
  }

  const handleBooking = async () => {
    setLoading(true)
    try {
      const bookingData = {
        barberId: params.barberId,
        services: selectedServices,
        dateTime: selectedDateTime,
        customer: customerInfo,
        totalDuration: calculateTotalDuration(),
        totalPrice: calculateTotalPrice(),
        source: 'booking_link',
        linkId: searchParams?.get('linkId'), // Include link ID for attribution
        smsConsent: customerInfo.smsConsent // Include SMS consent preference
      }

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })

      if (response.ok) {
        const booking = await response.json()
        
        const linkId = searchParams?.get('linkId')
        if (linkId) {
          const sessionId = sessionStorage.getItem('booking_session_id')
          
          await fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              linkId: linkId,
              eventType: 'conversion',
              sessionId: sessionId,
              bookingId: booking.id,
              conversionValue: calculateTotalPrice(),
              utmSource: searchParams?.get('utm_source'),
              utmMedium: searchParams?.get('utm_medium'),
              utmCampaign: searchParams?.get('utm_campaign')
            })
          }).catch(error => {
            console.error('Conversion tracking failed:', error)
          })
        }
        
        router.push(`/bookings/${booking.id}/success`)
      } else {
        throw new Error('Booking failed')
      }
    } catch (error) {
      console.error('Booking failed:', error)
      alert('Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const canProceedToStep2 = () => {
    return selectedServices.length > 0
  }

  const canProceedToStep3 = () => {
    return selectedDateTime !== null
  }

  const canCompleteBooking = () => {
    return customerInfo.name.trim() && 
           customerInfo.email.trim() && 
           customerInfo.phone.trim()
  }

  const availableSlots = useMemo(() => {
    return generateAvailableSlots()
  }, [urlTimeSlots, barberData])

  if (loading && !barberData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  if (!barberData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Barber Not Found</h2>
          <p className="text-gray-600">The barber you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const searchParamsObj = Object.fromEntries(searchParams?.entries() || [])
  const pageTitle = barberData ? generatePageTitle(barberData, searchParamsObj) : 'Book Appointment'
  const metaDescription = barberData ? generateMetaDescription(barberData, searchParamsObj) : 'Book your appointment online'

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
      </Head>
      
      {/* Header with enhanced SEO structure */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
              {barberData.image && (
                <img 
                  src={barberData.image} 
                  alt={`${barberData.name} - Professional Barber`}
                  className="w-full h-full object-cover"
                  loading="eager"
                  width={64}
                  height={64}
                />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Book {barberData.name} - {barberData.title}
              </h1>
              <p className="text-gray-600" itemProp="description">
                {barberData.bio?.substring(0, 100)}...
              </p>
              <div className="flex items-center gap-2 mt-1" itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
                <div className="flex items-center" aria-label={`${barberData.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIconSolid
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.floor(barberData.rating) ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  <span itemProp="ratingValue">{barberData.rating}</span> 
                  (<span itemProp="reviewCount">{barberData.reviewCount}</span> reviews)
                </span>
              </div>
            </div>
          </div>
          
          {/* Breadcrumb Navigation for SEO */}
          <nav aria-label="Breadcrumb" className="mt-4">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <a href="/" className="hover:text-gray-700">Home</a>
              </li>
              <li>/</li>
              <li>
                <a href="/book" className="hover:text-gray-700">Book Appointment</a>
              </li>
              <li>/</li>
              <li className="text-gray-900" aria-current="page">
                {barberData.name}
              </li>
            </ol>
          </nav>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className={currentStep >= 1 ? 'text-olive-600 font-medium' : 'text-gray-400'}>
              1. Choose Services
            </span>
            <span className={currentStep >= 2 ? 'text-olive-600 font-medium' : 'text-gray-400'}>
              2. Select Time
            </span>
            <span className={currentStep >= 3 ? 'text-olive-600 font-medium' : 'text-gray-400'}>
              3. Your Details
            </span>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-olive-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Choose Services */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Services</h2>
              <p className="text-gray-600">Select the services you'd like to book</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableServices.map(service => (
                <div
                  key={service.id}
                  onClick={() => handleServiceToggle(service)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedServices.find(s => s.id === service.id)
                      ? 'border-olive-500 bg-olive-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {service.duration} min
                        </div>
                        <div className="flex items-center gap-1">
                          <TagIcon className="h-4 w-4" />
                          {service.category}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">${service.price}</p>
                      {selectedServices.find(s => s.id === service.id) && (
                        <CheckCircleIcon className="h-5 w-5 text-olive-500 mt-1 ml-auto" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* URL-based discount display */}
            {urlDiscount && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">
                    Special Offer: {urlDiscount}% Off!
                  </span>
                </div>
              </div>
            )}

            {/* Summary */}
            {selectedServices.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Booking Summary</h3>
                <div className="space-y-2">
                  {selectedServices.map(service => (
                    <div key={service.id} className="flex justify-between text-sm">
                      <span>{service.name} ({service.duration} min)</span>
                      <span>${service.price}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total ({calculateTotalDuration()} min)</span>
                    <span>${calculateTotalPrice().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Time */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Date & Time</h2>
              <p className="text-gray-600">Choose when you'd like your appointment</p>
            </div>

            <div className="space-y-4">
              {availableSlots.map(day => (
                <div key={day.date} className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {day.dayName}, {day.dayMonth}
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {day.times.map(time => {
                      const dateTime = `${day.date}T${time}:00`
                      const isSelected = selectedDateTime === dateTime
                      
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedDateTime(dateTime)}
                          className={`p-3 text-sm rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-olive-500 bg-olive-50 text-olive-700'
                              : 'border-gray-200 hover:border-gray-300'
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
                </div>
              ))}
            </div>

            {availableSlots.length === 0 && (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Times</h3>
                <p className="text-gray-600">
                  No appointments available for the selected time preferences. 
                  Please try different time slots or contact the barber directly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Customer Details */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Information</h2>
              <p className="text-gray-600">We need a few details to confirm your booking</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                      placeholder="Enter your full name"
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
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
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
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="Any special instructions or requests..."
                />
              </div>

              {/* SMS Consent Checkbox */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <input
                    id="smsConsent"
                    name="smsConsent"
                    type="checkbox"
                    checked={customerInfo.smsConsent}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, smsConsent: e.target.checked }))}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded mt-0.5"
                  />
                  <label htmlFor="smsConsent" className="ml-2 text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Opt in to SMS appointment reminders</span> (optional)<br />
                    <span className="text-xs leading-5">
                      I agree to receive SMS appointment reminders from BookedBarber. 
                      Message frequency varies. Message and data rates may apply. 
                      Reply STOP to unsubscribe, HELP for help. View our{' '}
                      <a href="/sms-policy" target="_blank" className="text-olive-600 hover:underline">
                        SMS Policy
                      </a>
                      {' '}and{' '}
                      <a href="/terms" target="_blank" className="text-olive-600 hover:underline">
                        Terms
                      </a>.
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Final Summary */}
            <div className="bg-olive-50 rounded-lg border border-olive-200 p-6">
              <h3 className="text-lg font-semibold text-olive-900 mb-4">Booking Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-olive-700">Barber:</span>
                  <span className="font-medium text-olive-900">{barberData.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-olive-700">Services:</span>
                  <span className="font-medium text-olive-900">
                    {selectedServices.map(s => s.name).join(', ')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-olive-700">Date & Time:</span>
                  <span className="font-medium text-olive-900">
                    {selectedDateTime && new Date(selectedDateTime).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-olive-700">Duration:</span>
                  <span className="font-medium text-olive-900">{calculateTotalDuration()} minutes</span>
                </div>
                
                <div className="flex justify-between text-lg">
                  <span className="text-olive-700 font-semibold">Total:</span>
                  <span className="font-bold text-olive-900">${calculateTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8 border-t border-gray-200">
          <div>
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </button>
            )}
          </div>

          <div>
            {currentStep === 1 && (
              <button
                onClick={nextStep}
                disabled={!canProceedToStep2()}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  canProceedToStep2()
                    ? 'bg-olive-600 text-white hover:bg-olive-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                onClick={nextStep}
                disabled={!canProceedToStep3()}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  canProceedToStep3()
                    ? 'bg-olive-600 text-white hover:bg-olive-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                onClick={handleBooking}
                disabled={!canCompleteBooking() || loading}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  canCompleteBooking() && !loading
                    ? 'bg-moss-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckCircleIcon className="h-4 w-4" />
                )}
                {loading ? 'Booking...' : 'Book Appointment'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Location Info Footer */}
      <div className="bg-gray-100 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-start gap-4">
            <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-900">{barberData.location.name}</h3>
              <p className="text-sm text-gray-600">{barberData.location.address}</p>
              <p className="text-sm text-gray-600">{barberData.location.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    }>
      <BookingPageContent />
    </Suspense>
  )
}