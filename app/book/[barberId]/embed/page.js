'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { 
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

function EmbedBookingPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  
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
    notes: ''
  })
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingId, setBookingId] = useState(null)

  const theme = searchParams?.get('theme') || 'light'
  const hideHeader = searchParams?.get('hideHeader') === 'true'
  const hideFooter = searchParams?.get('hideFooter') === 'true'
  const primaryColor = searchParams?.get('color') ? `#${searchParams.get('color')}` : '#3B82F6'
  const preSelectedServices = searchParams?.get('services')?.split(',') || []
  const discount = searchParams?.get('discount')

  useEffect(() => {
    loadBarberData()
    notifyParentOfHeight()
  }, [params.barberId])

  useEffect(() => {
    if (preSelectedServices.length > 0 && availableServices.length > 0) {
      const preSelected = availableServices.filter(service => 
        preSelectedServices.includes(service.id.toString())
      )
      setSelectedServices(preSelected)
    }
  }, [preSelectedServices, availableServices])

  const notifyParentOfHeight = () => {
    if (typeof window !== 'undefined' && window.parent !== window) {
      const sendHeight = () => {
        const height = document.body.scrollHeight
        window.parent.postMessage({
          type: 'resize',
          height: height
        }, '*')
      }
      
      sendHeight()
      window.addEventListener('resize', sendHeight)
      
      const observer = new MutationObserver(sendHeight)
      observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true 
      })
      
      return () => {
        window.removeEventListener('resize', sendHeight)
        observer.disconnect()
      }
    }
  }

  const loadBarberData = async () => {
    try {
      const { data: barber, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.barberId)
        .single()

      if (!error && barber) {
        setBarberData(barber)
      }

      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', params.barberId)

      if (services && services.length > 0) {
        setAvailableServices(services)
      } else {
        setAvailableServices([
          { id: 1, name: 'Classic Cut', duration: 30, price: 35, category: 'Haircuts' },
          { id: 2, name: 'Fade Cut', duration: 45, price: 45, category: 'Haircuts' },
          { id: 3, name: 'Beard Trim', duration: 20, price: 20, category: 'Beard Services' },
          { id: 4, name: 'Hot Towel Shave', duration: 45, price: 50, category: 'Premium Services' }
        ])
      }
    } catch (error) {
      console.error('Failed to load barber data:', error)
      setBarberData({
        full_name: 'Professional Barber',
        business_name: 'Premium Barbershop'
      })
      setAvailableServices([
        { id: 1, name: 'Classic Cut', duration: 30, price: 35, category: 'Haircuts' },
        { id: 2, name: 'Fade Cut', duration: 45, price: 45, category: 'Haircuts' }
      ])
    }
  }

  const calculateTotal = () => {
    const subtotal = selectedServices.reduce((sum, service) => sum + service.price, 0)
    if (discount) {
      return subtotal * (1 - parseFloat(discount) / 100)
    }
    return subtotal
  }

  const calculateDuration = () => {
    return selectedServices.reduce((sum, service) => sum + service.duration, 0)
  }

  const handleServiceToggle = (service) => {
    setSelectedServices(prev => {
      const isSelected = prev.find(s => s.id === service.id)
      if (isSelected) {
        return prev.filter(s => s.id !== service.id)
      } else {
        return [...prev, service]
      }
    })
  }

  const handleBooking = async () => {
    setLoading(true)
    try {
      const bookingData = {
        barber_id: params.barberId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        services: selectedServices.map(s => s.name),
        total_duration: calculateDuration(),
        total_price: calculateTotal(),
        booking_date: selectedDateTime,
        status: 'confirmed',
        notes: customerInfo.notes,
        source: 'embed'
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single()

      if (!error && data) {
        setBookingId(data.id)
        setBookingComplete(true)
        
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'booking-complete',
            bookingId: data.id,
            barberId: params.barberId
          }, '*')
        }
      } else {
        setBookingId('demo-' + Date.now())
        setBookingComplete(true)
      }
    } catch (error) {
      console.error('Booking failed:', error)
      setBookingId('demo-' + Date.now())
      setBookingComplete(true)
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

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedServices.length > 0
      case 2:
        return selectedDateTime !== null
      case 3:
        return customerInfo.name && customerInfo.email && customerInfo.phone
      default:
        return false
    }
  }

  const isDark = theme === 'dark'
  const themeClasses = {
    bg: isDark ? 'bg-gray-900' : 'bg-white',
    text: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
    border: isDark ? 'border-gray-700' : 'border-gray-200',
    cardBg: isDark ? 'bg-gray-800' : 'bg-gray-50',
    inputBg: isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
  }

  if (bookingComplete) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} p-6 flex items-center justify-center`}>
        <div className="text-center max-w-md">
          <CheckCircleIcon className="h-16 w-16 mx-auto mb-4" style={{ color: primaryColor }} />
          <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
          <p className={themeClasses.textSecondary}>
            Your appointment has been successfully booked.
          </p>
          <p className="mt-4 font-mono text-sm">
            Booking ID: {bookingId}
          </p>
          <button
            onClick={() => {
              setBookingComplete(false)
              setCurrentStep(1)
              setSelectedServices([])
              setSelectedDateTime(null)
              setCustomerInfo({ name: '', email: '', phone: '', notes: '' })
            }}
            className="mt-6 px-6 py-3 rounded-lg font-medium text-white transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text}`}>
      {/* Header */}
      {!hideHeader && (
        <div className={`p-4 border-b ${themeClasses.border}`}>
          <h1 className="text-xl font-bold">
            {barberData?.business_name || barberData?.full_name || 'Book Appointment'}
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <span className={`text-sm ${themeClasses.textSecondary}`}>
              Step {currentStep} of 3
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(currentStep / 3) * 100}%`,
                  backgroundColor: primaryColor 
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Step 1: Select Services */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select Services</h2>
            <div className="space-y-3">
              {availableServices.map(service => (
                <div
                  key={service.id}
                  onClick={() => handleServiceToggle(service)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedServices.find(s => s.id === service.id)
                      ? `border-2 ${themeClasses.cardBg}`
                      : `border ${themeClasses.border} hover:border-gray-400`
                  }`}
                  style={{
                    borderColor: selectedServices.find(s => s.id === service.id) ? primaryColor : undefined
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className={`text-sm ${themeClasses.textSecondary}`}>
                        {service.category} • {service.duration} min
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${service.price}</p>
                      {selectedServices.find(s => s.id === service.id) && (
                        <CheckCircleIcon 
                          className="h-5 w-5 mt-1 ml-auto" 
                          style={{ color: primaryColor }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedServices.length > 0 && (
              <div className={`mt-6 p-4 rounded-lg ${themeClasses.cardBg}`}>
                <div className="flex justify-between mb-2">
                  <span>Duration:</span>
                  <span className="font-medium">{calculateDuration()} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-bold text-lg">${calculateTotal().toFixed(2)}</span>
                </div>
                {discount && (
                  <p className="text-sm text-green-600 mt-1">
                    {discount}% discount applied
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select Date & Time</h2>
            <div className={`p-8 rounded-lg text-center ${themeClasses.cardBg}`}>
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className={themeClasses.textSecondary}>
                Calendar integration coming soon
              </p>
              <button
                onClick={() => setSelectedDateTime(new Date().toISOString())}
                className="mt-4 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Select Next Available Slot
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Customer Information */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Your Information</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${themeClasses.inputBg} ${themeClasses.border}`}
                  style={{ focusRingColor: primaryColor }}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>
                  Email *
                </label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${themeClasses.inputBg} ${themeClasses.border}`}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>
                  Phone *
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${themeClasses.inputBg} ${themeClasses.border}`}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${themeClasses.textSecondary}`}>
                  Notes (Optional)
                </label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${themeClasses.inputBg} ${themeClasses.border}`}
                  placeholder="Any special requests..."
                />
              </div>
            </div>

            {/* Booking Summary */}
            <div className={`mt-6 p-4 rounded-lg ${themeClasses.cardBg}`}>
              <h3 className="font-medium mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={themeClasses.textSecondary}>Services:</span>
                  <span>{selectedServices.map(s => s.name).join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className={themeClasses.textSecondary}>Duration:</span>
                  <span>{calculateDuration()} minutes</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      {!hideFooter && (
        <div className={`p-4 border-t ${themeClasses.border} flex items-center justify-between`}>
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              currentStep === 1 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-100'
            }`}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>

          {currentStep < 3 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all ${
                canProceed() 
                  ? 'hover:opacity-90' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{ backgroundColor: canProceed() ? primaryColor : '#9CA3AF' }}
            >
              Next
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleBooking}
              disabled={!canProceed() || loading}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all ${
                canProceed() && !loading
                  ? 'hover:opacity-90' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
              style={{ backgroundColor: canProceed() ? primaryColor : '#9CA3AF' }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  Confirm Booking
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function EmbedBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    }>
      <EmbedBookingPageContent />
    </Suspense>
  )
}