'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline'

/**
 * Availability Calendar
 * Displays available time slots for booking
 *
 * Note: This is a simplified calendar implementation.
 * For production, consider integrating FullCalendar v6 for advanced features.
 */
export default function AvailabilityCalendar({
  staffSlug,
  serviceId,
  duration,
  onSelect,
  onBack,
}) {
  const [selectedDate, setSelectedDate] = useState(null)
  const [availableSlots, setAvailableSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()))

  // Initialize with today's date
  useEffect(() => {
    const today = new Date()
    setSelectedDate(today)
    fetchAvailability(today)
  }, [])

  const fetchAvailability = async (date) => {
    setLoading(true)
    setError(null)

    try {
      const dateStr = date.toISOString().split('T')[0]
      const response = await fetch(
        `/api/book/${staffSlug}/availability?date=${dateStr}&service_id=${serviceId}`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch availability')
      }

      setAvailableSlots(data.slots || [])
    } catch (err) {
      console.error('Availability fetch error:', err)
      setError(err.message)
      setAvailableSlots([])
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    fetchAvailability(date)
  }

  const handleSlotSelect = (slot) => {
    onSelect(slot.start)
  }

  const handlePreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(newWeekStart.getDate() - 7)
    setCurrentWeekStart(newWeekStart)
  }

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(newWeekStart.getDate() + 7)
    setCurrentWeekStart(newWeekStart)
  }

  // Generate week days
  const weekDays = useMemo(() => {
    const days = []
    const start = new Date(currentWeekStart)

    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      days.push(date)
    }

    return days
  }, [currentWeekStart])

  // Check if date is today
  const isToday = (date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Check if date is selected
  const isSelectedDate = (date) => {
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  // Check if date is in the past
  const isPast = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Choose Date & Time</h2>
        <p className="text-muted-foreground mt-1">Select an available time slot</p>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePreviousWeek}
          disabled={isPast(weekDays[0])}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>

        <h3 className="text-lg font-semibold text-foreground">
          {weekDays[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>

        <button
          onClick={handleNextWeek}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekDays.map((date, index) => (
          <button
            key={index}
            onClick={() => handleDateSelect(date)}
            disabled={isPast(date)}
            className={`p-3 rounded-lg text-center transition-all ${
              isSelectedDate(date)
                ? 'bg-olive-600 text-white'
                : isToday(date)
                ? 'bg-olive-50 dark:bg-olive-900/30 text-olive-800 dark:text-olive-200 border-2 border-olive-300 dark:border-olive-700'
                : isPast(date)
                ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                : 'bg-card border border-border text-foreground hover:border-olive-300 hover:bg-olive-50 dark:hover:bg-olive-900/30'
            }`}
          >
            <div className="text-xs font-medium mb-1">
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="text-lg font-bold">{date.getDate()}</div>
          </button>
        ))}
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Available Times for {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </h4>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-900 dark:text-red-100 text-sm">{error}</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="p-8 text-center bg-muted/50 rounded-lg border-2 border-dashed border-border">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No available slots for this date</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try selecting a different date</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {availableSlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => handleSlotSelect(slot)}
                  className="p-3 border-2 border-border rounded-lg hover:border-olive-500 hover:bg-olive-50 dark:hover:bg-olive-900/30 transition-all text-center"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {new Date(slot.start).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 mt-6 border-t border-border">
        <button
          onClick={onBack}
          className="px-6 py-2 text-foreground bg-card border border-border rounded-lg hover:bg-muted"
        >
          Back to Services
        </button>
      </div>
    </div>
  )
}

// Helper function to get start of week (Monday)
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  return new Date(d.setDate(diff))
}
