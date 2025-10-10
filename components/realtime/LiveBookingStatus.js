/**
 * Live Booking Status Component
 * Real-time booking updates and calendar synchronization
 */

import { 
  Calendar, 
  Clock, 
  User, 
  Check, 
  X, 
  AlertCircle,
  MapPin,
  Phone,
  CreditCard,
  Scissors,
  RefreshCw
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useLiveData, useEnhancedWebSocket } from '@/hooks/useEnhancedWebSocket'

const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
    confirmed: { color: 'bg-green-100 text-green-800', icon: Check, label: 'Confirmed' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: X, label: 'Cancelled' },
    completed: { color: 'bg-blue-100 text-blue-800', icon: Check, label: 'Completed' },
    no_show: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'No Show' },
    rescheduled: { color: 'bg-purple-100 text-purple-800', icon: RefreshCw, label: 'Rescheduled' }
  }

  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon size={12} className="mr-1" />
      {config.label}
    </span>
  )
}

const BookingCard = ({ booking, onStatusChange, isUpdating }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  const { date, time } = formatDateTime(booking.appointment_time || booking.created_at)

  const handleStatusChange = (newStatus) => {
    onStatusChange(booking.id, newStatus)
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200 ${
      isUpdating ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
    }`}>
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <User size={20} className="text-gray-600" />
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">
                {booking.client_name || booking.client?.full_name || 'Walk-in'}
              </h3>
              <p className="text-sm text-gray-500">
                {booking.service_name || 'General Service'} with {booking.barber_name || 'Staff'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <StatusBadge status={booking.status} />
            <p className="text-sm text-gray-500 mt-1">
              {date} at {time}
            </p>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{booking.duration || '30'} min</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <CreditCard size={14} className="text-gray-400" />
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium">${booking.price || '50'}</span>
                </div>
                
                {booking.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone size={14} className="text-gray-400" />
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{booking.phone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {booking.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{booking.location}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Scissors size={14} className="text-gray-400" />
                  <span className="text-gray-600">Service Type:</span>
                  <span className="font-medium">{booking.service_type || 'Haircut'}</span>
                </div>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                <strong>Notes:</strong> {booking.notes}
              </div>
            )}

            {/* Status Change Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {booking.status === 'pending' && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange('confirmed')
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange('cancelled')
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
              
              {booking.status === 'confirmed' && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange('completed')
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatusChange('no_show')
                    }}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                  >
                    No Show
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const BookingFilters = ({ filters, onFiltersChange }) => {
  const statusOptions = [
    { value: 'all', label: 'All Bookings' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const timeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ]

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Status:</label>
        <select
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
          className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700">Time:</label>
        <select
          value={filters.timeRange}
          onChange={(e) => onFiltersChange({ ...filters, timeRange: e.target.value })}
          className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {timeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Search client..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="border border-gray-300 rounded px-3 py-1 text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  )
}

export function LiveBookingStatus({ className = '', barbershopId = null }) {
  const [filters, setFilters] = useState({
    status: 'all',
    timeRange: 'today',
    search: ''
  })
  const [updatingBookings, setUpdatingBookings] = useState(new Set())

  const { wsClient } = useEnhancedWebSocket()
  
  // Build filters for the live data hook
  const dataFilters = {
    ...(barbershopId && { barbershop_id: barbershopId }),
    ...(filters.status !== 'all' && { status: filters.status })
  }

  const {
    data: bookings,
    isLoading,
    error,
    lastUpdate,
    refresh
  } = useLiveData('bookings', dataFilters, {
    refreshInterval: 15000 // Refresh every 15 seconds
  })

  // Listen for booking updates
  useEffect(() => {
    if (!wsClient) return

    const handleBookingUpdate = (data) => {
      // // Debug log removed for production
// Remove from updating set after a delay
      setTimeout(() => {
        setUpdatingBookings(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.bookingId)
          return newSet
        })
      }, 2000)
    }

    const unsubscribe = wsClient.on('booking_update', handleBookingUpdate)
    return () => unsubscribe()
  }, [wsClient])

  const handleStatusChange = async (bookingId, newStatus) => {
    setUpdatingBookings(prev => new Set(prev).add(bookingId))

    try {
      // Send update via WebSocket
      if (wsClient?.isConnected) {
        wsClient.sendMessage('booking_status_update', {
          booking_id: bookingId,
          status: newStatus,
          updated_by: 'staff', // This should come from user context
          timestamp: new Date().toISOString()
        })
      }

      // Also make direct API call as fallback
      const response = await fetch('/api/bookings/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: bookingId,
          status: newStatus
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update booking status')
      }

    } catch (error) {
      console.error('Failed to update booking status:', error)
      // Remove from updating set on error
      setUpdatingBookings(prev => {
        const newSet = new Set(prev)
        newSet.delete(bookingId)
        return newSet
      })
    }
  }

  // Filter bookings based on search and time range
  const filteredBookings = bookings.filter(booking => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const clientName = (booking.client_name || booking.client?.full_name || '').toLowerCase()
      const serviceName = (booking.service_name || '').toLowerCase()

      if (!clientName.includes(searchLower) && !serviceName.includes(searchLower)) {
        return false
      }
    }

    // Time range filter
    if (filters.timeRange !== 'all') {
      const bookingDate = new Date(booking.appointment_time || booking.created_at)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (filters.timeRange) {
        case 'today':
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          return bookingDate >= today && bookingDate < tomorrow
        
        case 'tomorrow':
          const dayAfterTomorrow = new Date(today)
          dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
          const tomorrowStart = new Date(today)
          tomorrowStart.setDate(tomorrowStart.getDate() + 1)
          return bookingDate >= tomorrowStart && bookingDate < dayAfterTomorrow
        
        case 'week':
          const weekEnd = new Date(today)
          weekEnd.setDate(weekEnd.getDate() + 7)
          return bookingDate >= today && bookingDate < weekEnd
        
        case 'month':
          const monthEnd = new Date(today)
          monthEnd.setMonth(monthEnd.getMonth() + 1)
          return bookingDate >= today && bookingDate < monthEnd
        
        default:
          return true
      }
    }

    return true
  })

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Failed to Load Bookings</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Bookings</h2>
          <p className="text-gray-600">
            Real-time booking status and management
            {lastUpdate && (
              <span className="ml-2 text-sm">
                • Last updated {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={refresh}
          className={`p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ${
            isLoading ? 'animate-spin' : ''
          }`}
          title="Refresh bookings"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Filters */}
      <BookingFilters 
        filters={filters} 
        onFiltersChange={setFilters}
      />

      {/* Bookings List */}
      {isLoading && filteredBookings.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
          <p className="text-gray-600">
            {filters.status !== 'all' || filters.search || filters.timeRange !== 'today'
              ? 'Try adjusting your filters to see more bookings.'
              : 'No bookings scheduled for today.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onStatusChange={handleStatusChange}
              isUpdating={updatingBookings.has(booking.id)}
            />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-900">
            {filteredBookings.filter(b => b.status === 'pending').length}
          </div>
          <div className="text-sm text-blue-600">Pending</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-900">
            {filteredBookings.filter(b => b.status === 'confirmed').length}
          </div>
          <div className="text-sm text-green-600">Confirmed</div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-900">
            {filteredBookings.filter(b => b.status === 'completed').length}
          </div>
          <div className="text-sm text-purple-600">Completed</div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-900">
            {filteredBookings.length}
          </div>
          <div className="text-sm text-yellow-600">Total</div>
        </div>
      </div>
    </div>
  )
}

export default LiveBookingStatus