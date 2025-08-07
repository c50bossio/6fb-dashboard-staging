'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import SimpleTimeRangePicker from './SimpleTimeRangePicker'
import TimePickerDropdown from './TimePickerDropdown'

const TimeRangePicker = ({ 
  openTime, 
  closeTime, 
  onOpenTimeChange, 
  onCloseTimeChange, 
  className = "",
  showLabels = true,
  error = null 
}) => {
  const [hasError, setHasError] = useState(false)

  // Error boundary effect
  useEffect(() => {
    const handleError = (error) => {
      console.warn('TimeRangePicker error, falling back to simple version:', error)
      setHasError(true)
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  // If there's an error, use the simple fallback
  if (hasError) {
    return (
      <SimpleTimeRangePicker
        openTime={openTime}
        closeTime={closeTime}
        onOpenTimeChange={onOpenTimeChange}
        onCloseTimeChange={onCloseTimeChange}
        showLabels={showLabels}
        className={className}
      />
    )
  }
  // Validate time range
  const validateTimeRange = (open, close) => {
    try {
      if (!open || !close) return null
      
      const [openHour, openMin] = open.split(':').map(Number)
      const [closeHour, closeMin] = close.split(':').map(Number)
      
      // Check if parsing was successful
      if (isNaN(openHour) || isNaN(openMin) || isNaN(closeHour) || isNaN(closeMin)) {
        return "Invalid time format"
      }
      
      const openMinutes = openHour * 60 + openMin
      const closeMinutes = closeHour * 60 + closeMin
      
      if (closeMinutes <= openMinutes) {
        return "Closing time must be after opening time"
      }
      
      if (closeMinutes - openMinutes < 60) {
        return "Minimum 1 hour between open and close times"
      }
      
      return null
    } catch (error) {
      console.warn('Error validating time range:', error)
      return "Invalid time format"
    }
  }

  const validationError = error || validateTimeRange(openTime, closeTime)

  // Calculate duration
  const calculateDuration = () => {
    try {
      if (!openTime || !closeTime || validationError) return null
      
      const [openHour, openMin] = openTime.split(':').map(Number)
      const [closeHour, closeMin] = closeTime.split(':').map(Number)
      
      if (isNaN(openHour) || isNaN(openMin) || isNaN(closeHour) || isNaN(closeMin)) {
        return null
      }
      
      const openMinutes = openHour * 60 + openMin
      const closeMinutes = closeHour * 60 + closeMin
      const durationMinutes = closeMinutes - openMinutes
      
      if (durationMinutes <= 0) return null
      
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      
      if (minutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`
      } else {
        return `${hours}h ${minutes}m`
      }
    } catch (error) {
      console.warn('Error calculating duration:', error)
      return null
    }
  }

  const duration = calculateDuration()

  try {
    return (
      <div className={className}>
        <div className="flex items-center space-x-4">
          {/* Open Time */}
          <div className="flex-1">
            {showLabels && (
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Open
              </label>
            )}
            <TimePickerDropdown
              value={openTime}
              onChange={onOpenTimeChange}
              placeholder="Opening time"
              className="w-full"
            />
          </div>

          {/* Separator with duration */}
          <div className="flex flex-col items-center px-2">
            <div className="h-px w-8 bg-gray-300 mt-6"></div>
            {duration && (
              <span className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                {duration}
              </span>
            )}
          </div>

          {/* Close Time */}
          <div className="flex-1">
            {showLabels && (
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Close
              </label>
            )}
            <TimePickerDropdown
              value={closeTime}
              onChange={onCloseTimeChange}
              placeholder="Closing time"
              className="w-full"
            />
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="mt-2 flex items-center text-sm text-red-600">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Time Range Summary */}
        {!validationError && openTime && closeTime && (
          <div className="mt-2 text-sm text-gray-600">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
              Open {duration} • {openTime} - {closeTime}
            </span>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.warn('TimeRangePicker render error, falling back:', error)
    return (
      <SimpleTimeRangePicker
        openTime={openTime}
        closeTime={closeTime}
        onOpenTimeChange={onOpenTimeChange}
        onCloseTimeChange={onCloseTimeChange}
        showLabels={showLabels}
        className={className}
      />
    )
  }
}

export default TimeRangePicker