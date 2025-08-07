'use client'

import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'

const TimePickerDropdown = ({ value, onChange, placeholder = "Select time", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Generate time options in 15-minute intervals from 6 AM to 11 PM
  const generateTimeOptions = () => {
    const options = []
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour === 12 ? 12 : hour
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const time12 = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`
        
        options.push({
          value: time24,
          label: time12,
          sortOrder: hour * 60 + minute
        })
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  // Format display value
  const getDisplayValue = (time24) => {
    if (!time24) return placeholder
    try {
      const option = timeOptions.find(opt => opt.value === time24)
      return option ? option.label : time24
    } catch (error) {
      console.warn('Error formatting time display:', error)
      return time24 || placeholder
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Popular time options for quick access
  const popularTimes = [
    { value: '09:00', label: '9:00 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '17:00', label: '5:00 PM' },
    { value: '18:00', label: '6:00 PM' },
    { value: '20:00', label: '8:00 PM' }
  ]

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {getDisplayValue(value)}
        </span>
        <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Popular Times Section */}
          <div className="p-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-500 mb-2">Popular Times</div>
            <div className="grid grid-cols-3 gap-1">
              {popularTimes.map((time) => (
                <button
                  key={time.value}
                  type="button"
                  onClick={() => {
                    onChange(time.value)
                    setIsOpen(false)
                  }}
                  className={`px-2 py-1 text-xs rounded hover:bg-blue-50 transition-colors ${
                    value === time.value ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {time.label}
                </button>
              ))}
            </div>
          </div>

          {/* All Times Section */}
          <div className="p-1">
            <div className="text-xs font-medium text-gray-500 px-2 py-1">All Times</div>
            {timeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                  value === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TimePickerDropdown