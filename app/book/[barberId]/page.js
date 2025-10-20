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
  TagIcon,
  BoltIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Head from 'next/head'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo, Suspense } from 'react'
import BookingFlowOrchestrator from '../../../components/booking/BookingFlowOrchestrator'
import { useRealtimeAvailability } from '../../../components/booking/RealtimeAvailabilityChecker'
import { getCachedFeatureFlags } from '../../../lib/feature-flags'
import { generatePageTitle, generateMetaDescription } from '../../../lib/seo-utils'

function BookingPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Enhanced booking system state
  const [useEnhancedFlow, setUseEnhancedFlow] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [featureFlags, setFeatureFlags] = useState({})
  const [enhancementReady, setEnhancementReady] = useState(false)
  
  // Original booking state - maintained for backward compatibility
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

  // URL parameters - enhanced with new options
  const urlServices = searchParams?.get('services')?.split(',') || []
  const urlTimeSlots = searchParams?.get('timeSlots')?.split(',') || []
  const urlDuration = searchParams?.get('duration')
  const urlPrice = searchParams?.get('price')
  const urlDiscount = searchParams?.get('discount')
  const urlExpires = searchParams?.get('expires')
  
  // Enhancement flags from URL
  const urlEnhanced = searchParams?.get('enhanced') === 'true'
  const urlMobile = searchParams?.get('mobile') === 'true'
  const urlFlow = searchParams?.get('flow')
  const urlExperiment = searchParams?.get('exp')
  const urlDebug = searchParams?.get('debug') === 'true'

  // Enhanced booking system initialization
  useEffect(() => {
    const initializeEnhancedBooking = async () => {
      try {
        // Load feature flags
        const flags = await getCachedFeatureFlags()
        setFeatureFlags(flags)
        
        // Detect device capabilities
        const device = detectDeviceCapabilities()
        setDeviceInfo(device)
        
        // Determine if we should use enhanced flow
        const shouldUseEnhanced = determineBookingFlow(flags, device, {
          enhanced: urlEnhanced,
          mobile: urlMobile,
          flow: urlFlow,
          experiment: urlExperiment
        })
        
        setUseEnhancedFlow(shouldUseEnhanced)
        setEnhancementReady(true)
        
        // Track component selection for analytics
        if (shouldUseEnhanced) {
          trackComponentSelection('enhanced', {
            device,
            urlParams: { enhanced: urlEnhanced, mobile: urlMobile, flow: urlFlow },
            featureFlags: flags
          })
        }
        
      } catch (error) {
        console.error('Failed to initialize enhanced booking:', error)
        // Fallback to original flow
        setUseEnhancedFlow(false)
        setEnhancementReady(true)
      }
    }
    
    initializeEnhancedBooking()
    loadBarberData()
  }, [params.barberId, urlEnhanced, urlMobile, urlFlow])

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

      // Fetch real barber data from API
      const barberResponse = await fetch(`/api/book/${params.barberId}`)
      if (!barberResponse.ok) {
        throw new Error('Failed to load barber profile')
      }
      const barberData = await barberResponse.json()

      // Fetch real services from API
      const servicesResponse = await fetch(`/api/book/${params.barberId}/services`)
      if (!servicesResponse.ok) {
        throw new Error('Failed to load services')
      }
      const servicesData = await servicesResponse.json()

      // Transform barber data to match expected format
      const transformedBarber = {
        id: barberData.id,
        name: barberData.name,
        title: barberData.title || 'Professional Barber',
        image: barberData.image,
        rating: barberData.rating || 5.0,
        reviewCount: barberData.reviewCount || 0,
        bio: barberData.bio,
        location: {
          name: barberData.barbershop?.name,
          address: `${barberData.barbershop?.address}, ${barberData.barbershop?.city}, ${barberData.barbershop?.state} ${barberData.barbershop?.zip_code}`,
          phone: barberData.barbershop?.phone || barberData.phone
        },
        specialties: barberData.specialties || [],
        availability: {} // Will be loaded dynamically from availability API
      }

      // Transform services to match expected format
      const transformedServices = servicesData.services.map(service => ({
        id: service.id,
        name: service.name,
        duration: service.durationMinutes,
        price: parseFloat(service.price),
        description: service.description,
        category: service.category
      }))

      setBarberData(transformedBarber)
      setAvailableServices(transformedServices)
    } catch (error) {
      console.error('Failed to load barber data:', error)
      // Set empty state instead of showing mock data
      setBarberData(null)
      setAvailableServices([])
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

  // Device detection utility
  const detectDeviceCapabilities = () => {
    if (typeof window === 'undefined') return null
    
    const userAgent = navigator.userAgent.toLowerCase()
    const screenWidth = window.innerWidth
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || screenWidth <= 768
    const isTablet = screenWidth >= 768 && screenWidth <= 1024
    const isTouchDevice = 'ontouchstart' in window
    
    return {
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      isTouchDevice,
      screenWidth,
      screenHeight: window.innerHeight,
      supportsAdvancedFeatures: !isMobile && screenWidth > 1024,
      shouldUseEnhancedFlow: !isMobile || screenWidth > 900
    }
  }
  
  // Enhanced flow determination logic
  const determineBookingFlow = (flags, device, urlParams) => {
    // URL parameters take precedence
    if (urlParams.enhanced) return true
    if (urlParams.mobile) return false // Mobile forces original flow
    if (urlParams.flow === 'enhanced') return true
    if (urlParams.flow === 'original') return false
    
    // Feature flag checks
    if (!flags.new_booking_flow) return false
    
    // Device-based decision
    if (device?.isMobile && !flags.mobile_optimizer_enabled) return false
    if (device?.supportsAdvancedFeatures && flags.enhanced_booking_flow) return true
    
    // Default to original for safety
    return false
  }
  
  // Analytics tracking
  const trackComponentSelection = (type, context) => {
    try {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'booking_component_selected', {
          component_type: type,
          device_type: context.device?.isMobile ? 'mobile' : context.device?.isTablet ? 'tablet' : 'desktop',
          screen_width: context.device?.screenWidth,
          enhanced_enabled: context.urlParams?.enhanced,
          mobile_enabled: context.urlParams?.mobile,
          flow_override: context.urlParams?.flow
        })
      }
    } catch (error) {
      console.error('Analytics tracking failed:', error)
    }
  }

  const availableSlots = useMemo(() => {
    return generateAvailableSlots()
  }, [urlTimeSlots, barberData])

  // Enhanced loading state with system detection
  if (loading && !barberData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking system...</p>
          {enhancementReady && deviceInfo && (
            <div className="mt-2 flex items-center justify-center space-x-2 text-sm text-gray-500">
              {deviceInfo.isMobile ? (
                <DevicePhoneMobileIcon className="h-4 w-4" />
              ) : (
                <CheckCircleIcon className="h-4 w-4" />
              )}
              <span>{useEnhancedFlow ? 'Enhanced' : 'Standard'} experience</span>
              {useEnhancedFlow && <BoltIcon className="h-4 w-4 text-olive-600" />}
            </div>
          )}
        </div>
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

  // Enhanced flow rendering - use BookingFlowOrchestrator if enabled
  if (enhancementReady && useEnhancedFlow && barberData) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced flow indicator */}
        {urlDebug && (
          <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm">
            🚀 Enhanced Booking Flow Active - Barber: {barberData.name}
          </div>
        )}
        
        <BookingFlowOrchestrator
          barbershopId={barberData.location?.name || '6fb-downtown'}
          barbershopSlug="6fb-downtown"
          preselectedBarber={params.barberId}
          preselectedService={urlServices[0] || null}
          
          // URL parameter overrides
          enhanced={urlEnhanced}
          mobile={urlMobile}
          service={urlServices[0] || null}
          barber={params.barberId}
          
          // Configuration
          defaultFlow="auto"
          enableRealtimeAvailability={true}
          enableProgressiveAccount={true}
          
          // A/B testing
          experimentId={urlExperiment}
          onComponentSelection={trackComponentSelection}
          onConversionEvent={(event, data) => {
            console.log('Booking conversion event:', event, data)
          }}
          
          // Pass through all URL parameters for backward compatibility
          urlParams={{
            services: urlServices,
            timeSlots: urlTimeSlots,
            duration: urlDuration,
            price: urlPrice,
            discount: urlDiscount,
            expires: urlExpires
          }}
          
          // Barber data for context
          barberData={barberData}
          availableServices={availableServices}
          
          className="enhanced-booking-wrapper"
        />
        
        {/* Development indicator */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium z-40">
            Enhanced Flow
          </div>
        )}
      </div>
    )
  }
  
  // Original flow - preserved for backward compatibility
  const searchParamsObj = Object.fromEntries(searchParams?.entries() || [])
  const pageTitle = barberData ? generatePageTitle(barberData, searchParamsObj) : 'Book Appointment'
  const metaDescription = barberData ? generateMetaDescription(barberData, searchParamsObj) : 'Book your appointment online'

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
      </Head>
      
      {/* Backward compatibility indicator */}
      {urlDebug && (
        <div className="bg-amber-600 text-white px-4 py-2 text-center text-sm">
          📚 Original Booking Flow - Full Backward Compatibility Mode
        </div>
      )}
      
      {/* Enhancement available banner */}
      {enhancementReady && !useEnhancedFlow && featureFlags.new_booking_flow && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-center text-sm">
          <div className="flex items-center justify-center space-x-2">
            <BoltIcon className="h-4 w-4" />
            <span>Try our enhanced booking experience!</span>
            <button
              onClick={() => {
                const url = new URL(window.location)
                url.searchParams.set('enhanced', 'true')
                window.location.href = url.toString()
              }}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded text-xs font-medium transition-colors"
            >
              Enable Now
            </button>
          </div>
        </div>
      )}
      
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
                              : 'border-gray-200 hover:border-gray-300 text-gray-900'
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
      
      {/* Development debug panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white px-3 py-1 rounded-full text-xs font-medium z-40 flex items-center space-x-2">
          <span>Original Flow</span>
          {deviceInfo && (
            <span className="text-gray-300">
              {deviceInfo.isMobile ? '📱' : deviceInfo.isTablet ? '📟' : '🖥️'}
            </span>
          )}
        </div>
      )}
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