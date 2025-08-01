'use client'

import SimpleTimePicker from './SimpleTimePicker'

const SimpleTimeRangePicker = ({ 
  openTime, 
  closeTime, 
  onOpenTimeChange, 
  onCloseTimeChange, 
  showLabels = true,
  className = ""
}) => {
  // Calculate duration
  const calculateDuration = () => {
    if (!openTime || !closeTime) return null
    
    const [openHour, openMin] = openTime.split(':').map(Number)
    const [closeHour, closeMin] = closeTime.split(':').map(Number)
    
    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin
    
    if (closeMinutes <= openMinutes) return null
    
    const durationMinutes = closeMinutes - openMinutes
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    
    if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    } else {
      return `${hours}h ${minutes}m`
    }
  }

  const duration = calculateDuration()

  // Validation
  const hasError = openTime && closeTime && !duration

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
          <SimpleTimePicker
            value={openTime}
            onChange={onOpenTimeChange}
            placeholder="Opening time"
          />
        </div>

        {/* Separator */}
        <div className="flex flex-col items-center px-2">
          <div className="text-xs text-gray-500 mt-6">to</div>
          {duration && (
            <span className="text-xs text-gray-500 mt-1">
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
          <SimpleTimePicker
            value={closeTime}
            onChange={onCloseTimeChange}
            placeholder="Closing time"
          />
        </div>
      </div>

      {/* Error message */}
      {hasError && (
        <div className="mt-2 text-sm text-red-600">
          Closing time must be after opening time
        </div>
      )}

      {/* Success summary */}
      {duration && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
            {duration} • {openTime} - {closeTime}
          </span>
        </div>
      )}
    </div>
  )
}

export default SimpleTimeRangePicker