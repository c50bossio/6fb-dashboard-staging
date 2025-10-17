'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import bookingAPI from '@/lib/booking-api'
import { TimeSkeleton } from '../LoadingSkeletons'

export default function TimeStep({ bookingData, shopSettings, onNext, onBack }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(0)
  
  // Generate next 14 days
  const generateDates = () => {
    const dates = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date)
    }
    return dates
  }
  
  const [availableDates] = useState(generateDates())
  
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate)
    }
  }, [selectedDate, bookingData.barber, bookingData.service])
  
  const loadAvailableSlots = async (date) => {
    setLoading(true)
    try {
      // Format date for API
      const dateStr = date.toISOString().split('T')[0]
      
      // Try to fetch available slots from API first
      let slots = []
      try {
        const slotsData = await bookingAPI.getAvailableSlots({
          barbershopId: bookingData.location,
          barberId: bookingData.barber === 'barber_any' ? null : bookingData.barber,
          serviceId: bookingData.service,
          date: dateStr
        })
        
        // Transform API data to component format
        slots = slotsData.map(slot => ({
          time: slot.time || slot.scheduled_at?.slice(11, 16),
          display: new Date(slot.scheduled_at || `${dateStr}T${slot.time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          }),
          available: slot.is_available !== false,
          dateTime: slot.scheduled_at || `${dateStr}T${slot.time}:00.000Z`
        }))
      } catch (apiError) {
        console.error('Error fetching slots from API:', apiError)
        // Fall back to generating slots from business hours
      }
      
      // If no slots from API, generate based on business hours
      if (slots.length === 0) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' })
        const businessHours = shopSettings?.businessHours?.[dayName]
        
        if (!businessHours) {
          setAvailableSlots([])
          setLoading(false)
          return
        }
        
        // Generate time slots based on business hours and service duration
        const serviceMinutes = bookingData.duration || 30
        const bufferMinutes = 5 // Buffer between appointments
        
        // Parse business hours
        const [openHour, openMin] = businessHours.open.split(':').map(v => parseInt(v))
        const [closeHour, closeMin] = businessHours.close.split(':').map(v => parseInt(v))
        
        const startTime = new Date(date)
        startTime.setHours(openHour, openMin, 0, 0)
        
        const endTime = new Date(date)
        endTime.setHours(closeHour, closeMin, 0, 0)
        
        const now = new Date()
        const isToday = date.toDateString() === now.toDateString()
        
        // Generate slots
        let currentSlot = new Date(startTime)
        
        while (currentSlot < endTime) {
          const slotEnd = new Date(currentSlot)
          slotEnd.setMinutes(slotEnd.getMinutes() + serviceMinutes)
          
          // Check if slot fits within business hours
          if (slotEnd <= endTime) {
            // Check if slot is in the future (for today)
            if (!isToday || currentSlot > now) {
              // For now, mark all slots as available
              // In production, this will be determined by the API
              
              slots.push({
                time: currentSlot.toTimeString().slice(0, 5),
                display: currentSlot.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                }),
                available: true,
                dateTime: new Date(currentSlot).toISOString()
              })
            }
          }
          
          // Move to next slot
          currentSlot.setMinutes(currentSlot.getMinutes() + serviceMinutes + bufferMinutes)
        }
      }
      
      // Group slots by time period
      const groupedSlots = {
        morning: slots.filter(s => {
          const hour = parseInt(s.time.split(':')[0])
          return hour < 12
        }),
        afternoon: slots.filter(s => {
          const hour = parseInt(s.time.split(':')[0])
          return hour >= 12 && hour < 17
        }),
        evening: slots.filter(s => {
          const hour = parseInt(s.time.split(':')[0])
          return hour >= 17
        })
      }
      
      setAvailableSlots(groupedSlots)
      setLoading(false)
    } catch (error) {
      console.error('Error loading slots:', error)
      setLoading(false)
    }
  }
  
  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setSelectedTime(null) // Reset time when date changes
  }
  
  const handleTimeSelect = (slot) => {
    if (slot.available) {
      setSelectedTime(slot)
    }
  }
  
  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      onNext({
        dateTime: selectedTime.dateTime,
        displayDateTime: {
          date: selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          }),
          time: selectedTime.display
        }
      })
    }
  }
  
  const getDayStatus = (date) => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' })
    const businessHours = shopSettings.businessHours?.[dayName]
    
    if (!businessHours) {
      return { isOpen: false, hours: 'Closed' }
    }
    
    return { 
      isOpen: true, 
      hours: `${businessHours.open} - ${businessHours.close}` 
    }
  }
  
  const weekDates = availableDates.slice(currentWeek * 7, (currentWeek + 1) * 7)
  
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Choose Date & Time</h2>
        <p className="text-sm md:text-base text-gray-600">
          Select an available time slot for your {bookingData.duration}-minute appointment
        </p>
      </div>
      
      {/* Service & Barber Reminder - Mobile Optimized */}
      <div className="bg-olive-50 border border-olive-200 rounded-lg p-3">
        {/* Mobile Layout - Stacked */}
        <div className="md:hidden space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Service:</span>
            <span className="font-medium text-gray-900">{bookingData.serviceDetails?.name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">With:</span>
            <span className="font-medium text-gray-900">
              {bookingData.barberDetails?.name || 'First Available'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium text-gray-900">{bookingData.duration} min</span>
          </div>
        </div>
        
        {/* Desktop Layout - Horizontal */}
        <div className="hidden md:flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-600">Service:</span>
            <span className="ml-2 font-medium text-gray-900">{bookingData.serviceDetails?.name}</span>
          </div>
          <div>
            <span className="text-gray-600">With:</span>
            <span className="ml-2 font-medium text-gray-900">
              {bookingData.barberDetails?.name || 'First Available'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Duration:</span>
            <span className="ml-2 font-medium text-gray-900">{bookingData.duration} min</span>
          </div>
        </div>
      </div>
      
      {/* Date Selection */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Select Date</h3>
        
        {/* Week Navigation - Mobile Optimized */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <button
            onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
            disabled={currentWeek === 0}
            className={`p-3 md:p-2 rounded-lg touch-manipulation ${
              currentWeek === 0 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
            }`}
          >
            <ChevronLeftIcon className="h-6 w-6 md:h-5 md:w-5" />
          </button>
          
          <span className="text-sm md:text-base font-medium text-gray-600">
            {currentWeek === 0 ? 'This Week' : 'Next Week'}
          </span>
          
          <button
            onClick={() => setCurrentWeek(Math.min(1, currentWeek + 1))}
            disabled={currentWeek === 1}
            className={`p-3 md:p-2 rounded-lg touch-manipulation ${
              currentWeek === 1 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
            }`}
          >
            <ChevronRightIcon className="h-6 w-6 md:h-5 md:w-5" />
          </button>
        </div>
        
        {/* Date Cards - Mobile Optimized Grid */}
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {weekDates.map((date, index) => {
            const dayStatus = getDayStatus(date)
            const isToday = date.toDateString() === new Date().toDateString()
            const isSelected = selectedDate?.toDateString() === date.toDateString()
            
            return (
              <button
                key={index}
                onClick={() => dayStatus.isOpen && handleDateSelect(date)}
                disabled={!dayStatus.isOpen}
                className={`relative p-2 md:p-3 rounded-lg text-center transition-all touch-manipulation min-h-[60px] md:min-h-[80px] ${
                  isSelected
                    ? 'bg-olive-600 text-white ring-2 ring-olive-200'
                    : dayStatus.isOpen
                    ? 'bg-white border border-gray-200 hover:border-olive-300 hover:shadow-md cursor-pointer active:bg-olive-50'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="text-xs font-medium mb-0.5 md:mb-1">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-base md:text-lg font-bold">
                  {date.getDate()}
                </div>
                <div className="text-xs mt-0.5 md:mt-1">
                  {date.toLocaleDateString('en-US', { month: 'short' })}
                </div>
                
                {isToday && (
                  <div className="absolute top-1 right-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full block"></span>
                  </div>
                )}
                
                {!dayStatus.isOpen && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 rounded-lg">
                    <span className="text-xs text-gray-500">Closed</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Time Selection */}
      {selectedDate && (
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">
            Available Times for {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          
          {loading ? (
            <TimeSkeleton />
          ) : (
            <div className="space-y-3 md:space-y-4">
              {Object.entries(availableSlots).map(([period, slots]) => {
                if (slots.length === 0) return null
                
                return (
                  <div key={period}>
                    <h4 className="text-sm font-medium text-gray-500 capitalize mb-2">
                      {period}
                    </h4>
                    {/* Mobile: 3 columns, Tablet: 4 columns, Desktop: 6 columns */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {slots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => handleTimeSelect(slot)}
                          disabled={!slot.available}
                          className={`relative px-2 py-3 md:px-3 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all touch-manipulation min-h-[44px] ${
                            selectedTime?.dateTime === slot.dateTime
                              ? 'bg-olive-600 text-white ring-2 ring-olive-200'
                              : slot.available
                              ? 'bg-white border border-gray-200 hover:border-olive-300 hover:shadow-md cursor-pointer active:bg-olive-50'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                          }`}
                        >
                          <div className="text-center">
                            {slot.display}
                          </div>
                          {!slot.available && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-gray-100 bg-opacity-90 rounded-lg px-1">
                                <span className="text-xs text-gray-500">Booked</span>
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
              
              {Object.values(availableSlots).every(slots => slots.length === 0) && (
                <div className="text-center py-6 md:py-8 text-gray-500">
                  <CalendarIcon className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 text-gray-300" />
                  <p className="text-sm md:text-base">No available slots for this date</p>
                  <p className="text-xs md:text-sm mt-1">Please try another date</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Quick Time Suggestions - Mobile Hidden for Space */}
      {selectedDate && !loading && (
        <div className="hidden md:block bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Suggestions</h4>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50 touch-manipulation">
              Next Available
            </button>
            <button className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50 touch-manipulation">
              Morning (9-12)
            </button>
            <button className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50 touch-manipulation">
              Lunch (12-2)
            </button>
            <button className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50 touch-manipulation">
              Evening (5-7)
            </button>
          </div>
        </div>
      )}
      
      {/* Selected Time Summary - Mobile Optimized */}
      {selectedTime && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2 flex-shrink-0" />
            <span className="text-green-900 font-medium text-sm md:text-base">
              Selected: {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })} at {selectedTime.display}
            </span>
          </div>
        </div>
      )}
      
      {/* Navigation Buttons - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-4">
        <button
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
        >
          Back
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTime}
          className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-all touch-manipulation ${
            selectedDate && selectedTime
              ? 'bg-olive-600 text-white hover:bg-olive-700 active:bg-olive-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Payment
        </button>
      </div>
    </div>
  )
}