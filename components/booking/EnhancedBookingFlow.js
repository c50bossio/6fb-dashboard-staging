'use client'

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
  BoltIcon,
  PhotoIcon,
  PlusIcon,
  MinusIcon,
  MapPinIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'
import { CheckIcon, HeartIcon } from '@heroicons/react/24/solid'
import { motion, AnimatePresence } from 'framer-motion'
import Cookies from 'js-cookie'
import { useState, useEffect, useCallback } from 'react'

// Enhanced service images with better categorization
const getServiceImage = (category, serviceName) => {
  const imageMap = {
    haircut: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=400&q=80',
    fade: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80', 
    beard: 'https://images.unsplash.com/photo-1503951458645-643d53bfd90f?auto=format&fit=crop&w=400&q=80',
    shave: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=400&q=80',
    styling: 'https://images.unsplash.com/photo-1560975286-5c67d0b3e3fe?auto=format&fit=crop&w=400&q=80',
    combo: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=400&q=80',
    kids: 'https://images.unsplash.com/photo-1582747652235-2d5b59da5b52?auto=format&fit=crop&w=400&q=80',
    color: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=400&q=80'
  }
  
  // Smart matching based on service name
  const lowerName = serviceName.toLowerCase()
  if (lowerName.includes('fade')) return imageMap.fade
  if (lowerName.includes('beard')) return imageMap.beard
  if (lowerName.includes('shave')) return imageMap.shave
  if (lowerName.includes('kid')) return imageMap.kids
  if (lowerName.includes('color')) return imageMap.color
  
  return imageMap[category] || imageMap.haircut
}

export default function EnhancedBookingFlow({ 
  barbershopId, 
  barbershopSlug, 
  preselectedBarber = null,
  preselectedService = null 
}) {
  // Streamlined state - 3 steps max
  const [currentStep, setCurrentStep] = useState(1) // 1: Service & Time, 2: Details, 3: Confirm
  const [selectedService, setSelectedService] = useState(preselectedService)
  const [selectedAddOns, setSelectedAddOns] = useState([])
  const [selectedDateTime, setSelectedDateTime] = useState(null)
  const [selectedBarber, setSelectedBarber] = useState(preselectedBarber)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  })
  
  // Data from API
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [addOns, setAddOns] = useState([])
  const [loading, setLoading] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingId, setBookingId] = useState(null)
  const [barbershopInfo, setBarbershopInfo] = useState(null)
  
  // UI state
  const [showAddOns, setShowAddOns] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [returningVisitor, setReturningVisitor] = useState(false)

  useEffect(() => {
    // Check for returning visitor
    const visitorData = Cookies.get('booking_visitor')
    if (visitorData) {
      try {
        const data = JSON.parse(visitorData)
        setReturningVisitor(true)
        setCustomerInfo({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          notes: ''
        })
      } catch (e) {
        console.error('Failed to parse visitor cookie')
      }
    }
    
    // Load initial data
    loadBarbershopData()
    loadServices()
    loadBarbers()
    loadAddOns()
  }, [barbershopId])

  useEffect(() => {
    // Auto-load slots when service and barber are selected
    if (selectedService && (selectedBarber || preselectedBarber)) {
      loadAvailableSlots()
    }
  }, [selectedService, selectedBarber, selectedDate])

  const loadBarbershopData = async () => {
    try {
      const response = await fetch(`/api/public/barbershop?id=${barbershopId}`)
      const data = await response.json()
      if (data.success) {
        setBarbershopInfo(data.barbershop)
      }
    } catch (error) {
      console.error('Failed to load barbershop data:', error)
    }
  }

  const loadServices = async () => {
    try {
      const response = await fetch(`/api/public/services?barbershop_id=${barbershopId}`)
      const data = await response.json()
      if (data.success) {
        setServices(data.services.map(service => ({
          ...service,
          image_url: service.image_url || getServiceImage(service.category, service.name)
        })))
      }
    } catch (error) {
      console.error('Failed to load services:', error)
      // Fallback services
      setServices([
        {
          id: '1',
          name: 'Classic Haircut',
          duration_minutes: 30,
          price: 35,
          description: 'Professional cut with wash and style',
          category: 'haircut',
          popular: true,
          image_url: getServiceImage('haircut', 'Classic Haircut')
        },
        {
          id: '2',
          name: 'Beard Trim',
          duration_minutes: 20,
          price: 20,
          description: 'Precision beard trimming and styling',
          category: 'beard',
          image_url: getServiceImage('beard', 'Beard Trim')
        },
        {
          id: '3',
          name: 'Full Service',
          duration_minutes: 50,
          price: 50,
          description: 'Haircut + beard trim + hot towel',
          category: 'combo',
          popular: true,
          image_url: getServiceImage('combo', 'Full Service')
        }
      ])
    }
  }

  const loadBarbers = async () => {
    try {
      const response = await fetch(`/api/public/barbers?barbershop_id=${barbershopId}`)
      const data = await response.json()
      if (data.success) {
        setBarbers(data.barbers)
      }
    } catch (error) {
      console.error('Failed to load barbers:', error)
      // If preselected barber exists, create a fallback
      if (preselectedBarber) {
        setBarbers([{ 
          id: preselectedBarber, 
          name: 'Your Barber', 
          rating: 4.9,
          experience_years: 5 
        }])
      }
    }
  }

  const loadAddOns = async () => {
    const addOnsList = [
      {
        id: 'addon_1',
        name: 'Hot Towel Treatment',
        description: 'Relaxing hot towel service',
        price: 10,
        duration_minutes: 5,
        icon: '♨️',
        popular: true
      },
      {
        id: 'addon_2',
        name: 'Hair Wash',
        description: 'Shampoo and conditioning',
        price: 10,
        duration_minutes: 10,
        icon: '🚿',
        popular: true
      },
      {
        id: 'addon_3',
        name: 'Scalp Massage',
        description: '5-minute relaxing scalp massage',
        price: 15,
        duration_minutes: 5,
        icon: '💆‍♂️'
      },
      {
        id: 'addon_4',
        name: 'Line Up Touch-up',
        description: 'Perfect edge and line work',
        price: 8,
        duration_minutes: 5,
        icon: '✂️'
      },
      {
        id: 'addon_5',
        name: 'Premium Styling',
        description: 'Premium product application',
        price: 12,
        duration_minutes: 5,
        icon: '💈'
      }
    ]
    
    setAddOns(addOnsList)
  }

  const loadAvailableSlots = async () => {
    setLoadingSlots(true)
    try {
      const slots = []
      const now = new Date()
      const targetDate = new Date(selectedDate)
      
      // Generate realistic slots based on business hours
      const startHour = targetDate.toDateString() === now.toDateString() ? Math.max(9, now.getHours() + 1) : 9
      const endHour = 18
      
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotTime = new Date(targetDate)
          slotTime.setHours(hour, minute, 0, 0)
          
          // Skip past times
          if (slotTime <= now) continue
          
          // Simulate realistic availability (70% available)
          if (Math.random() > 0.3) {
            slots.push({
              time: slotTime.toISOString(),
              available: true,
              display: slotTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }),
              isPopular: hour >= 12 && hour <= 16, // Afternoon slots are popular
              price: selectedService?.price || 0
            })
          }
        }
      }
      
      setAvailableSlots(slots.slice(0, 12)) // Show 12 slots for clean grid
    } catch (error) {
      console.error('Failed to load slots:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleServiceSelect = (service) => {
    setSelectedService(service)
    // Auto-show add-ons if service supports them
    if (['combo', 'premium'].includes(service.category)) {
      setShowAddOns(true)
    }
  }

  const handleAddOnToggle = (addOn) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.id === addOn.id)
      if (exists) {
        return prev.filter(a => a.id !== addOn.id)
      } else {
        return [...prev, addOn]
      }
    })
  }

  const calculateTotals = () => {
    const basePrice = selectedService?.price || 0
    const addOnPrice = selectedAddOns.reduce((sum, addon) => sum + addon.price, 0)
    const baseDuration = selectedService?.duration_minutes || 0
    const addOnDuration = selectedAddOns.reduce((sum, addon) => sum + addon.duration_minutes, 0)
    
    return {
      price: basePrice + addOnPrice,
      duration: baseDuration + addOnDuration
    }
  }

  const handleTimeSelect = (slot) => {
    setSelectedDateTime(slot)
    setCurrentStep(2) // Move to customer details
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const totals = calculateTotals()
      const bookingData = {
        barbershop_id: barbershopId,
        barber_id: selectedBarber?.id || 'any',
        service_id: selectedService.id,
        service_name: selectedService.name,
        scheduled_at: selectedDateTime.time,
        duration_minutes: totals.duration,
        service_price: totals.price,
        tip_amount: 0,
        client_name: customerInfo.name,
        client_phone: customerInfo.phone,
        client_email: customerInfo.email,
        client_notes: customerInfo.notes,
        payment_method: 'cash',
        addOns: selectedAddOns,
        source: 'enhanced_booking_flow'
      }
      
      const response = await fetch('/api/public/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Save visitor info
        const visitorData = {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email,
          bookingCount: (returningVisitor ? 1 : 0) + 1,
          lastBooking: new Date().toISOString()
        }
        Cookies.set('booking_visitor', JSON.stringify(visitorData), { expires: 90 })
        
        setBookingId(result.booking.id)
        setBookingComplete(true)
        setCurrentStep(3)
      }
    } catch (error) {
      console.error('Booking failed:', error)
      alert('Booking failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Generate date options for next 7 days
  const getDateOptions = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  // Step 1: Enhanced Service & Time Selection
  const ServiceTimeStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Choose Your Service
        </h2>
        <p className="text-gray-600">
          Select a service and your preferred time
        </p>
        {returningVisitor && (
          <motion.p 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-sm text-green-600 mt-2 flex items-center justify-center"
          >
            <HeartIcon className="h-4 w-4 mr-1" />
            Welcome back! Great to see you again.
          </motion.p>
        )}
      </div>
      
      {/* Services Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const isSelected = selectedService?.id === service.id
          
          return (
            <motion.button
              key={service.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleServiceSelect(service)}
              className={`relative group bg-white border-2 rounded-xl hover:shadow-lg transition-all text-left overflow-hidden ${
                isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {(service.popular || service.is_featured) && (
                <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold py-1 px-3 rounded-full flex items-center shadow-lg">
                  <StarIcon className="h-3 w-3 mr-1" />
                  {service.is_featured ? 'Featured' : 'Popular'}
                </div>
              )}
              
              {/* Service Image */}
              <div className="relative h-36 bg-gray-100 overflow-hidden">
                <img 
                  src={service.image_url}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.target.src = getServiceImage('haircut', service.name)
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              
              <div className="p-4 space-y-2">
                <h3 className={`text-lg font-semibold transition-colors ${
                  isSelected ? 'text-blue-600' : 'text-gray-900 group-hover:text-blue-600'
                }`}>
                  {service.name}
                </h3>
                
                <p className="text-sm text-gray-600 line-clamp-2">
                  {service.description}
                </p>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    <span className="text-sm">{service.duration_minutes} min</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    ${service.price}
                  </div>
                </div>
                
                {isSelected && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center pt-2 text-blue-600"
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    <span className="font-medium">Selected</span>
                  </motion.div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
      
      {/* Add-ons Section */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t pt-6"
          >
            <button
              onClick={() => setShowAddOns(!showAddOns)}
              className="flex items-center justify-between w-full text-left mb-4"
            >
              <div className="flex items-center">
                <PlusIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="font-medium text-gray-900">Enhance Your Service</span>
                {selectedAddOns.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {selectedAddOns.length} selected
                  </span>
                )}
              </div>
              <motion.div
                animate={{ rotate: showAddOns ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </button>
            
            <AnimatePresence>
              {showAddOns && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {addOns.map(addOn => {
                    const isSelected = selectedAddOns.some(a => a.id === addOn.id)
                    
                    return (
                      <motion.label
                        key={addOn.id}
                        whileHover={{ scale: 1.02 }}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleAddOnToggle(addOn)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">{addOn.icon}</span>
                              <span className="font-medium text-gray-900">{addOn.name}</span>
                              {addOn.popular && (
                                <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                                  Popular
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 text-sm">
                              <span className="text-gray-500">+{addOn.duration_minutes} min</span>
                              <span className="font-medium text-green-600">+${addOn.price}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">{addOn.description}</p>
                        </div>
                      </motion.label>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Date & Time Selection */}
      {selectedService && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-semibold text-gray-900">Select Date & Time</h3>
          
          {/* Date Selection */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {getDateOptions().map((date) => {
              const isSelected = selectedDate.toDateString() === date.toDateString()
              const isToday = date.toDateString() === new Date().toDateString()
              
              return (
                <motion.button
                  key={date.toISOString()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all min-w-[80px] ${
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
                </motion.button>
              )
            })}
          </div>
          
          {/* Time Slots */}
          {loadingSlots ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {availableSlots.map((slot) => (
                <motion.button
                  key={slot.time}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTimeSelect(slot)}
                  className={`py-3 px-2 border-2 rounded-lg transition-all font-medium text-center ${
                    slot.isPopular
                      ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-sm font-semibold">{slot.display}</div>
                  {slot.isPopular && (
                    <div className="text-xs text-amber-600 mt-1">Popular</div>
                  )}
                </motion.button>
              ))}
            </div>
          )}
          
          {availableSlots.length === 0 && !loadingSlots && (
            <div className="text-center py-8 text-gray-500">
              <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No available times for this date</p>
              <p className="text-sm">Please try another date</p>
            </div>
          )}
        </motion.div>
      )}
      
      {/* Booking Summary */}
      {selectedService && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Your Selection</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Service:</span>
              <span className="font-medium">{selectedService.name}</span>
            </div>
            {selectedAddOns.length > 0 && (
              <>
                {selectedAddOns.map(addOn => (
                  <div key={addOn.id} className="flex justify-between pl-4">
                    <span className="text-gray-600">+ {addOn.name}:</span>
                    <span className="font-medium">+${addOn.price}</span>
                  </div>
                ))}
              </>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-900 font-semibold">Total:</span>
              <span className="text-xl font-bold text-blue-600">${calculateTotals().price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{calculateTotals().duration} minutes</span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )

  // Step 2: Customer Details
  const CustomerDetailsStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Almost There!
        </h2>
        <p className="text-gray-600">
          Just need your contact information
        </p>
      </div>
      
      {/* Booking Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
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
            <span className="font-medium">{calculateTotals().duration} minutes</span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-900 font-semibold">Total:</span>
            <span className="text-xl font-bold text-green-600">${calculateTotals().price}</span>
          </div>
        </div>
      </div>
      
      {/* Contact Form */}
      <form onSubmit={handleBookingSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name *
            </label>
            <input
              type="text"
              required
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Smith"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            required
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Requests (Optional)
          </label>
          <textarea
            value={customerInfo.notes}
            onChange={(e) => setCustomerInfo({...customerInfo, notes: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any specific requests or preferences..."
            rows={3}
          />
        </div>
        
        {/* Payment Note */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start">
            <CreditCardIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">Pay at the shop</p>
              <p className="text-gray-600">No payment required now. Pay when you arrive.</p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Booking...
              </div>
            ) : (
              'Confirm Booking'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  )

  // Step 3: Booking Success
  const BookingSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"
      >
        <CheckCircleIcon className="h-12 w-12 text-green-600" />
      </motion.div>
      
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Booking Confirmed! 🎉
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
      
      {/* Shop Info */}
      {barbershopInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="flex items-start">
            <MapPinIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <h3 className="font-semibold text-blue-900 mb-1">{barbershopInfo.name}</h3>
              <p className="text-sm text-blue-800">{barbershopInfo.address}</p>
              {barbershopInfo.phone && (
                <p className="text-sm text-blue-800 mt-1 flex items-center">
                  <PhoneIcon className="h-4 w-4 mr-1" />
                  {barbershopInfo.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="space-y-3">
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Book Another Appointment
        </button>
        
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full text-blue-600 py-2 text-sm hover:text-blue-800 transition-colors"
        >
          Back to Homepage
        </button>
      </div>
    </motion.div>
  )

  // Progress indicator
  const ProgressIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[
          { step: 1, label: 'Service' },
          { step: 2, label: 'Details' },
          { step: 3, label: 'Done' }
        ].map(({ step, label }, index) => (
          <div key={step} className="flex items-center">
            <motion.div 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step <= currentStep || bookingComplete
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
              whileHover={step <= currentStep ? { scale: 1.1 } : {}}
            >
              {(step < currentStep || bookingComplete) ? <CheckIcon className="h-5 w-5" /> : step}
            </motion.div>
            <div className="text-xs font-medium text-gray-600 mt-2 ml-1">
              {label}
            </div>
            {index < 2 && (
              <div className={`w-20 h-1 mx-4 ${
                step < currentStep || bookingComplete ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quick Booking</h1>
          <p className="text-gray-600">Book your appointment in just a few clicks</p>
        </motion.div>
        
        {/* Progress */}
        {!bookingComplete && <ProgressIndicator />}
        
        {/* Main Content */}
        <motion.div 
          layout
          className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
        >
          <AnimatePresence mode="wait">
            {bookingComplete ? (
              <BookingSuccess />
            ) : (
              <motion.div key={currentStep}>
                {currentStep === 1 && <ServiceTimeStep />}
                {currentStep === 2 && <CustomerDetailsStep />}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Trust Indicators */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto"
        >
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <BoltIcon className="h-6 w-6 text-yellow-500" />
            </div>
            <p className="text-sm font-medium text-gray-900">Instant Booking</p>
            <p className="text-xs text-gray-600">Quick & easy</p>
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
        </motion.div>
      </div>
    </div>
  )
}