'use client'

import {
  CalendarDaysIcon,
  ClockIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'

export default function MobileBookingOptimizer({ 
  services = [], 
  selectedService,
  onServiceSelect,
  availableSlots = [],
  selectedDateTime,
  onTimeSelect,
  loading = false,
  onBack
}) {
  const [touchStart, setTouchStart] = useState(null)
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0)
  const [showTimeSlots, setShowTimeSlots] = useState(false)
  const serviceScrollRef = useRef(null)
  const slotsRef = useRef(null)

  // Mobile-specific state
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('services') // 'services' | 'time'

  useEffect(() => {
    if (selectedService && services.length > 0) {
      const index = services.findIndex(s => s.id === selectedService.id)
      if (index !== -1) {
        setCurrentServiceIndex(index)
      }
    }
  }, [selectedService, services])

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e) => {
    if (!touchStart) return
    
    const touchEnd = e.touches[0].clientX
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && currentServiceIndex < services.length - 1) {
      setCurrentServiceIndex(prev => prev + 1)
      setTouchStart(null)
    }

    if (isRightSwipe && currentServiceIndex > 0) {
      setCurrentServiceIndex(prev => prev - 1)
      setTouchStart(null)
    }
  }

  const handleServiceSelect = (service, index) => {
    setCurrentServiceIndex(index)
    onServiceSelect?.(service)
    // Auto advance to time selection on mobile
    setTimeout(() => setViewMode('time'), 300)
  }

  const generateTimeSlots = () => {
    if (!availableSlots.length) return []
    
    // Group slots by time period for better mobile UX
    const periods = {
      morning: { label: 'Morning', slots: [], icon: '🌅' },
      afternoon: { label: 'Afternoon', slots: [], icon: '☀️' },
      evening: { label: 'Evening', slots: [], icon: '🌅' }
    }

    availableSlots.forEach(slot => {
      const hour = new Date(slot.time).getHours()
      if (hour < 12) periods.morning.slots.push(slot)
      else if (hour < 17) periods.afternoon.slots.push(slot)
      else periods.evening.slots.push(slot)
    })

    return periods
  }

  const ServiceCarousel = () => (
    <div className="relative">
      {/* Service Cards */}
      <div 
        ref={serviceScrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {services.map((service, index) => {
          const isActive = index === currentServiceIndex
          
          return (
            <motion.div
              key={service.id}
              className={`flex-shrink-0 w-72 bg-white rounded-xl shadow-lg overflow-hidden snap-center ${
                isActive ? 'ring-2 ring-blue-500' : ''
              }`}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleServiceSelect(service, index)}
            >
              {/* Service Image */}
              <div className="h-40 bg-gradient-to-br from-blue-100 to-purple-100 relative overflow-hidden">
                {service.image_url ? (
                  <img 
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    {service.category === 'haircut' ? '✂️' : 
                     service.category === 'beard' ? '🧔' : 
                     service.category === 'combo' ? '💈' : '✨'}
                  </div>
                )}
                
                {service.popular && (
                  <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold py-1 px-2 rounded-full">
                    Popular
                  </div>
                )}
              </div>
              
              {/* Service Info */}
              <div className="p-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    <span className="text-sm">{service.duration_minutes || service.duration} min</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    ${service.price}
                  </div>
                </div>
                
                {isActive && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center"
                  >
                    <CheckIcon className="h-5 w-5 mr-2" />
                    Selected
                  </motion.button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
      
      {/* Carousel Indicators */}
      <div className="flex justify-center space-x-2 mt-4">
        {services.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentServiceIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentServiceIndex 
                ? 'bg-blue-600 w-6' 
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      
      {/* Continue Button */}
      {selectedService && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setViewMode('time')}
          className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center shadow-lg"
        >
          Choose Time
          <ArrowRightIcon className="h-5 w-5 ml-2" />
        </motion.button>
      )}
    </div>
  )

  const TimeSlotSelector = () => {
    const timeSlots = generateTimeSlots()
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode('services')}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          
          <div className="text-center flex-1 mx-4">
            <h2 className="text-xl font-bold text-gray-900">Select Time</h2>
            <p className="text-gray-600 text-sm">{selectedService?.name}</p>
          </div>
          
          <div className="w-9 h-9" /> {/* Spacer for centering */}
        </div>
        
        {/* Date Selector */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Choose Date</h3>
            <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
          </div>
          
          <div className="flex gap-2 overflow-x-auto">
            {[0, 1, 2, 3, 4, 5, 6].map(days => {
              const date = new Date()
              date.setDate(date.getDate() + days)
              const isSelected = selectedDate.toDateString() === date.toDateString()
              const isToday = days === 0
              
              return (
                <button
                  key={days}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all min-w-[70px] ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-200 bg-white hover:border-gray-300'
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
        </div>
        
        {/* Time Slots by Period */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(timeSlots).map(([period, data]) => {
              if (!data.slots.length) return null
              
              return (
                <div key={period} className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center mb-3">
                    <span className="text-2xl mr-2">{data.icon}</span>
                    <h4 className="font-semibold text-gray-900">{data.label}</h4>
                    <span className="text-sm text-gray-500 ml-2">
                      {data.slots.length} slots
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {data.slots.map((slot) => (
                      <motion.button
                        key={slot.time}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onTimeSelect?.(slot)}
                        className={`py-3 px-4 border-2 rounded-lg transition-all font-medium ${
                          selectedDateTime?.time === slot.time
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="text-lg font-semibold">{slot.display}</div>
                        {slot.isPopular && (
                          <div className="text-xs text-amber-600 mt-1">Popular</div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {availableSlots.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">No available times</p>
            <p className="text-sm">Please try another date</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
          
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-gray-900">Book Appointment</h1>
            <div className="flex items-center justify-center mt-1">
              <div className={`w-2 h-2 rounded-full mr-2 ${viewMode === 'services' ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-2 h-2 rounded-full ${viewMode === 'time' ? 'bg-blue-600' : 'bg-gray-300'}`} />
            </div>
          </div>
          
          <div className="w-9 h-9" /> {/* Spacer */}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="px-4 py-6">
        <AnimatePresence mode="wait">
          {viewMode === 'services' ? (
            <motion.div
              key="services"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ServiceCarousel />
            </motion.div>
          ) : (
            <motion.div
              key="time"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <TimeSlotSelector />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Bottom Action Bar */}
      {selectedDateTime && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-600">Selected Time</p>
              <p className="font-semibold text-gray-900">
                {selectedDateTime.display} • ${selectedService?.price}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-semibold text-gray-900">
                {selectedService?.duration_minutes || selectedService?.duration} min
              </p>
            </div>
          </div>
          
          <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg">
            Continue to Details
          </button>
        </motion.div>
      )}
    </div>
  )
}

// Utility CSS classes for mobile optimization
export const mobileStyles = {
  // Improved touch targets
  touchTarget: "min-h-[44px] min-w-[44px]",
  
  // Better scroll behavior
  scrollArea: "overflow-x-auto scrollbar-hide scroll-smooth",
  
  // Responsive text sizing
  responsiveText: "text-base sm:text-lg",
  
  // Mobile-friendly spacing
  mobileSpacing: "p-4 sm:p-6",
  
  // Improved button sizing for mobile
  mobileButton: "py-3 px-6 text-base font-medium rounded-lg",
}