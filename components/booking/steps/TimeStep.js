'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

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
      // In production, fetch from API based on barber, service, and date
      // This would check the barber's schedule and existing appointments
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' })
      const businessHours = shopSettings.businessHours?.[dayName]
      
      if (!businessHours) {
        setAvailableSlots([])
        setLoading(false)
        return
      }
      
      // Generate time slots based on business hours and service duration
      const slots = []
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
            // Mock availability (in production, check against existing bookings)
            const Booked = Math.random() > 0.7 // 30% chance of being booked
            
            slots.push({
              time: currentSlot.toTimeString().slice(0, 5),
              display: currentSlot.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit' 
              }),
              available: !mockBooked,
              dateTime: new Date(currentSlot).toISOString()
            })
          }
        }
        
        // Move to next slot
        currentSlot.setMinutes(currentSlot.getMinutes() + serviceMinutes + bufferMinutes)
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Date & Time</h2>
        <p className="text-gray-600">
          Select an available time slot for your {bookingData.duration}-minute appointment
        </p>
      </div>
      
      {/* Service & Barber Reminder */}
      <div className="bg-olive-50 border border-olive-200 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Date</h3>
        
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
            disabled={currentWeek === 0}
            className={`p-2 rounded-lg ${
              currentWeek === 0 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <span className="text-sm font-medium text-gray-600">
            {currentWeek === 0 ? 'This Week' : 'Next Week'}
          </span>
          
          <button
            onClick={() => setCurrentWeek(Math.min(1, currentWeek + 1))}
            disabled={currentWeek === 1}
            className={`p-2 rounded-lg ${
              currentWeek === 1 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Date Cards */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, index) => {
            const dayStatus = getDayStatus(date)
            const isToday = date.toDateString() === new Date().toDateString()
            const isSelected = selectedDate?.toDateString() === date.toDateString()
            
            return (
              <button
                key={index}
                onClick={() => dayStatus.isOpen && handleDateSelect(date)}
                disabled={!dayStatus.isOpen}
                className={`relative p-3 rounded-lg text-center transition-all ${
                  isSelected
                    ? 'bg-olive-600 text-white ring-2 ring-olive-200'
                    : dayStatus.isOpen
                    ? 'bg-white border border-gray-200 hover:border-olive-300 hover:shadow-md cursor-pointer'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="text-xs font-medium mb-1">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-lg font-bold">
                  {date.getDate()}
                </div>
                <div className="text-xs mt-1">
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Available Times for {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          
          {loading ? (
            <div className="space-y-4">
              {['Morning', 'Afternoon', 'Evening'].map(period => (
                <div key={period}>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">{period}</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-gray-200 rounded-lg h-10"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(availableSlots).map(([period, slots]) => {
                if (slots.length === 0) return null
                
                return (
                  <div key={period}>
                    <h4 className="text-sm font-medium text-gray-500 capitalize mb-2">
                      {period}
                    </h4>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {slots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => handleTimeSelect(slot)}
                          disabled={!slot.available}
                          className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedTime?.dateTime === slot.dateTime
                              ? 'bg-olive-600 text-white ring-2 ring-olive-200'
                              : slot.available
                              ? 'bg-white border border-gray-200 hover:border-olive-300 hover:shadow-md cursor-pointer'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.display}
                          {!slot.available && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-gray-100 bg-opacity-90 rounded-lg px-2">
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
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No available slots for this date</p>
                  <p className="text-sm mt-1">Please try another date</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Quick Time Suggestions */}
      {selectedDate && !loading && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Suggestions</h4>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
              Next Available
            </button>
            <button className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
              Morning (9-12)
            </button>
            <button className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
              Lunch (12-2)
            </button>
            <button className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50">
              Evening (5-7)
            </button>
          </div>
        </div>
      )}
      
      {/* Selected Time Summary */}
      {selectedTime && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-900 font-medium">
              Selected: {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })} at {selectedTime.display}
            </span>
          </div>
        </div>
      )}
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
        >
          Back
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTime}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            selectedDate && selectedTime
              ? 'bg-olive-600 text-white hover:bg-olive-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Payment
        </button>
      </div>
    </div>
  )
}