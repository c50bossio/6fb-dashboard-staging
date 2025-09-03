'use client'

import { CalendarIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

export default function TimeStep({ bookingData, shopSettings, onNext, onBack }) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(0)
  const [specialHours, setSpecialHours] = useState([])
  const [dateExceptions, setDateExceptions] = useState({})
  
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
  
  // Load special hours when component mounts
  useEffect(() => {
    loadSpecialHours()
  }, [shopSettings])

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate)
    }
  }, [selectedDate, bookingData.barber, bookingData.service, specialHours])
  
  const loadSpecialHours = async () => {
    if (!shopSettings?.barbershopId) return

    try {
      const supabase = createClient()
      
      // Load special hours for the next 2 weeks (including recurring holidays)
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(startDate.getDate() + 14)
      
      // Use the recurring function to get both regular and recurring exceptions
      const { data: exceptions, error } = await supabase.rpc('get_schedule_exceptions_for_period', {
        p_barbershop_id: shopSettings.barbershopId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      })

      if (error) {
        console.error('Error loading special hours (trying fallback):', error)
        
        // Fallback to direct query if function fails
        const { data: fallbackExceptions, error: fallbackError } = await supabase
          .from('schedule_exceptions')
          .select('*')
          .eq('barbershop_id', shopSettings.barbershopId)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
          .order('date', { ascending: true })

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError)
          return
        }
        
        setSpecialHours(fallbackExceptions || [])
        
        // Create lookup map using fallback data
        const exceptionsMap = {}
        fallbackExceptions?.forEach(exception => {
          exceptionsMap[exception.date] = exception
        })
        setDateExceptions(exceptionsMap)
        return
      }

      // Transform the function result to match expected format
      const transformedExceptions = exceptions?.map(ex => ({
        id: ex.id,
        barbershop_id: ex.barbershop_id,
        barber_id: ex.barber_id,
        date: ex.exception_date, // Function returns exception_date, we need date
        type: ex.type,
        start_time: ex.start_time,
        end_time: ex.end_time,
        all_day: ex.all_day,
        reason: ex.reason,
        is_recurring: ex.is_recurring,
        original_date: ex.original_date
      })) || []

      setSpecialHours(transformedExceptions)
      
      // Create a lookup map for quick access, using exception_date as key
      const exceptionsMap = {}
      transformedExceptions.forEach(exception => {
        exceptionsMap[exception.date] = exception
      })
      setDateExceptions(exceptionsMap)
      
      // Log success for debugging
      if (transformedExceptions.length > 0) {
        console.log(`✅ Loaded ${transformedExceptions.length} special hours (including recurring)`)
        const recurringCount = transformedExceptions.filter(ex => ex.is_recurring).length
        if (recurringCount > 0) {
          console.log(`🔄 ${recurringCount} recurring holidays found`)
        }
      }
      
    } catch (error) {
      console.error('Error loading special hours:', error)
    }
  }
  
  const loadAvailableSlots = async (date) => {
    setLoading(true)
    try {
      const dateString = date.toISOString().split('T')[0]
      const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' })
      
      // Check for schedule exceptions first
      const exception = dateExceptions[dateString]
      let effectiveHours
      
      if (exception) {
        // Handle different types of exceptions
        if (exception.type === 'holiday' || exception.type === 'time_off') {
          // Shop is closed
          setAvailableSlots([])
          setLoading(false)
          return
        } else if (exception.type === 'special_hours') {
          // Use special hours instead of regular hours
          if (exception.all_day) {
            // All day special hours - use regular hours as fallback
            effectiveHours = shopSettings.businessHours?.[dayName]
          } else if (exception.start_time && exception.end_time) {
            // Custom hours for this date
            effectiveHours = {
              open: exception.start_time,
              close: exception.end_time,
              closed: false
            }
          } else {
            // Closed for special hours without specific times
            setAvailableSlots([])
            setLoading(false)
            return
          }
        }
      } else {
        // Use regular business hours
        effectiveHours = shopSettings.businessHours?.[dayName]
      }
      
      if (!effectiveHours || effectiveHours.closed) {
        setAvailableSlots([])
        setLoading(false)
        return
      }
      
      const slots = []
      const serviceMinutes = bookingData.duration || 30
      const bufferMinutes = 5 // Buffer between appointments
      
      const [openHour, openMin] = effectiveHours.open.split(':').map(v => parseInt(v))
      const [closeHour, closeMin] = effectiveHours.close.split(':').map(v => parseInt(v))
      
      const startTime = new Date(date)
      startTime.setHours(openHour, openMin, 0, 0)
      
      const endTime = new Date(date)
      endTime.setHours(closeHour, closeMin, 0, 0)
      
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      
      const currentSlot = new Date(startTime)
      
      while (currentSlot < endTime) {
        const slotEnd = new Date(currentSlot)
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceMinutes)
        
        if (slotEnd <= endTime) {
          if (!isToday || currentSlot > now) {
            const mockBooked = Math.random() > 0.7 // 30% chance of being booked for demo
            
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
        
        currentSlot.setMinutes(currentSlot.getMinutes() + serviceMinutes + bufferMinutes)
      }
      
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
    const dateString = date.toISOString().split('T')[0]
    const dayName = date.toLocaleDateString('en-US', { weekday: 'lowercase' })
    
    // Check for schedule exceptions first
    const exception = dateExceptions[dateString]
    
    if (exception) {
      if (exception.type === 'holiday') {
        return { 
          isOpen: false, 
          hours: 'Closed',
          specialType: 'holiday',
          reason: exception.reason || 'Holiday',
          isRecurring: exception.is_recurring || false
        }
      } else if (exception.type === 'time_off') {
        return { 
          isOpen: false, 
          hours: 'Closed',
          specialType: 'time_off', 
          reason: exception.reason || 'Time Off',
          isRecurring: exception.is_recurring || false
        }
      } else if (exception.type === 'special_hours') {
        if (exception.all_day) {
          // All day special hours - show as open with regular hours
          const businessHours = shopSettings.businessHours?.[dayName]
          return {
            isOpen: businessHours && !businessHours.closed,
            hours: businessHours ? `${businessHours.open} - ${businessHours.close}` : 'Closed',
            specialType: 'special_hours',
            reason: exception.reason || 'Special Hours',
            isRecurring: exception.is_recurring || false
          }
        } else if (exception.start_time && exception.end_time) {
          return {
            isOpen: true,
            hours: `${exception.start_time} - ${exception.end_time}`,
            specialType: 'special_hours',
            reason: exception.reason || 'Special Hours',
            isRecurring: exception.is_recurring || false
          }
        } else {
          return {
            isOpen: false,
            hours: 'Closed',
            specialType: 'special_hours',
            reason: exception.reason || 'Special Hours',
            isRecurring: exception.is_recurring || false
          }
        }
      }
    }
    
    // Use regular business hours
    const businessHours = shopSettings.businessHours?.[dayName]
    
    if (!businessHours || businessHours.closed) {
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
                className={`relative p-4 min-h-[60px] rounded-lg text-center transition-all touch-manipulation ${
                  isSelected
                    ? 'bg-olive-600 text-white ring-2 ring-olive-200'
                    : dayStatus.isOpen
                    ? 'bg-white border border-gray-200 hover:border-olive-300 hover:shadow-md cursor-pointer active:bg-olive-50'
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
                
                {/* Special Hours Indicators */}
                {dayStatus.specialType && (
                  <div className="absolute top-1 left-1 flex items-center space-x-1">
                    <span className="text-xs">
                      {dayStatus.specialType === 'holiday' ? '🎉' : 
                       dayStatus.specialType === 'time_off' ? '🏖️' : 
                       '⏰'}
                    </span>
                    {/* Show recurring indicator for recurring holidays */}
                    {dayStatus.isRecurring && (
                      <span className="text-xs text-blue-600" title="Recurring annually">
                        🔄
                      </span>
                    )}
                  </div>
                )}
                
                {!dayStatus.isOpen && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 rounded-lg">
                    <div className="text-center">
                      <span className="text-xs text-gray-500 block">
                        {dayStatus.specialType === 'holiday' ? 'Holiday' : 
                         dayStatus.specialType === 'time_off' ? 'Time Off' : 
                         'Closed'}
                      </span>
                      {dayStatus.reason && (
                        <span className="text-xs text-gray-400 block mt-1">
                          {dayStatus.reason}
                        </span>
                      )}
                    </div>
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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Available Times for {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            
            {/* Special Hours Notice */}
            {(() => {
              const dateString = selectedDate.toISOString().split('T')[0]
              const exception = dateExceptions[dateString]
              
              if (exception && exception.type === 'special_hours') {
                return (
                  <div className="flex items-center space-x-2 text-sm bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                    <span className="text-lg">⏰</span>
                    <div>
                      <span className="font-medium text-blue-900">Special Hours</span>
                      {exception.reason && (
                        <span className="text-blue-700 ml-1">- {exception.reason}</span>
                      )}
                    </div>
                  </div>
                )
              }
              return null
            })()}
          </div>
          
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
                          className={`relative px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium transition-all touch-manipulation ${
                            selectedTime?.dateTime === slot.dateTime
                              ? 'bg-olive-600 text-white ring-2 ring-olive-200'
                              : slot.available
                              ? 'bg-white border border-gray-200 hover:border-olive-300 hover:shadow-md cursor-pointer active:bg-olive-50'
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