'use client'

import { useState, useEffect } from 'react'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  PencilIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

export default function StaffBookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('today')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalBookings, setTotalBookings] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    loadBookings()
  }, [currentPage, statusFilter, dateFilter, searchTerm])

  const loadBookings = async () => {
    try {
      setLoading(true)
      
      // Calculate date range based on filter
      const now = new Date()
      let startDate, endDate
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
          endDate = new Date(now.setHours(23, 59, 59, 999)).toISOString()
          break
        case 'week':
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
          const endOfWeek = new Date(now.setDate(startOfWeek.getDate() + 6))
          startDate = startOfWeek.toISOString()
          endDate = endOfWeek.toISOString()
          break
        case 'month':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          startDate = startOfMonth.toISOString()
          endDate = endOfMonth.toISOString()
          break
        default:
          startDate = null
          endDate = null
      }

      // Build query parameters
      const params = new URLSearchParams()
      if (startDate) params.append('start', startDate)
      if (endDate) params.append('end', endDate)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('limit', '100') // Get more than just paginated items for filtering

      const response = await fetch(`/api/bookings/calendar?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        let filteredBookings = data.events || []
        
        // Apply search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          filteredBookings = filteredBookings.filter(booking =>
            booking.title.toLowerCase().includes(searchLower) ||
            booking.extendedProps?.clientEmail?.toLowerCase().includes(searchLower) ||
            booking.extendedProps?.clientPhone?.includes(searchTerm) ||
            booking.extendedProps?.serviceName?.toLowerCase().includes(searchLower)
          )
        }

        setTotalBookings(filteredBookings.length)
        
        // Paginate
        const startIndex = (currentPage - 1) * itemsPerPage
        const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage)
        
        setBookings(paginatedBookings)
      } else {
        console.error('Failed to fetch bookings')
        // Fallback to mock data for development
        setBookings(getMockBookings())
      }
    } catch (error) {
      console.error('Error loading bookings:', error)
      setBookings(getMockBookings())
    } finally {
      setLoading(false)
    }
  }

  const getMockBookings = () => {
    return [
      {
        id: 'booking_001',
        title: 'John Smith - Premium Cut',
        start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        extendedProps: {
          clientName: 'John Smith',
          clientEmail: 'john@example.com',
          clientPhone: '(555) 123-4567',
          serviceName: 'Premium Cut',
          servicePrice: 45,
          status: 'CONFIRMED',
          paymentStatus: 'pending',
          barberName: 'Mike Johnson',
          duration: 45,
          canEdit: true,
          canCancel: true
        }
      }
    ]
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ExclamationCircleIcon, label: 'Pending' },
      CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon, label: 'Confirmed' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon, label: 'Cancelled' },
      COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircleIcon, label: 'Completed' },
      NO_SHOW: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircleIcon, label: 'No Show' }
    }
    
    const config = statusConfig[status] || statusConfig.PENDING
    const IconComponent = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const getPaymentStatusBadge = (paymentStatus) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Payment Pending' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      refunded: { bg: 'bg-red-100', text: 'text-red-800', label: 'Refunded' }
    }
    
    const config = statusConfig[paymentStatus] || statusConfig.pending
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const handleUpdateBooking = async (bookingId, updates) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        loadBookings() // Refresh the list
        setShowDetails(false)
        alert('Booking updated successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to update booking: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating booking:', error)
      alert('Failed to update booking. Please try again.')
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadBookings() // Refresh the list
        setShowDetails(false)
        alert('Booking cancelled successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to cancel booking: ${error.message}`)
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Failed to cancel booking. Please try again.')
    }
  }

  const totalPages = Math.ceil(totalBookings / itemsPerPage)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-card-foreground">Booking Management</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Manage all customer appointments and bookings</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 bg-white dark:bg-card rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadBookings}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors flex items-center gap-2"
          >
            <FunnelIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white dark:bg-card rounded-lg shadow overflow-hidden">
        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-card-foreground">No bookings found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
              No bookings match your current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-background">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-card divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-background">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-card-foreground">
                            {booking.extendedProps?.clientName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1">
                            <EnvelopeIcon className="h-3 w-3" />
                            {booking.extendedProps?.clientEmail}
                          </div>
                          {booking.extendedProps?.clientPhone && (
                            <div className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1">
                              <PhoneIcon className="h-3 w-3" />
                              {booking.extendedProps?.clientPhone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-card-foreground">
                          {booking.extendedProps?.serviceName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {booking.extendedProps?.duration} min • ${booking.extendedProps?.servicePrice}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {booking.extendedProps?.barberName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-card-foreground">
                          {new Date(booking.start).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          {new Date(booking.start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.extendedProps?.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentStatusBadge(booking.extendedProps?.paymentStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedBooking(booking)
                              setShowDetails(true)
                            }}
                            className="text-olive-600 hover:text-olive-900 p-1 rounded"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {booking.extendedProps?.canEdit && (
                            <button
                              onClick={() => handleUpdateBooking(booking.id, { status: 'CONFIRMED' })}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="Confirm Booking"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                          {booking.extendedProps?.canCancel && (
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="Cancel Booking"
                            >
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-card px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-border">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-card hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-card hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, totalBookings)}
                      </span>{' '}
                      of <span className="font-medium">{totalBookings}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white dark:bg-card text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNumber
                                ? 'z-10 bg-olive-50 border-olive-500 text-olive-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-background'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        )
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white dark:bg-card text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking Details Modal */}
      {showDetails && selectedBooking && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-card-foreground">
                Booking Details
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
                  <p className="text-sm text-gray-900 dark:text-card-foreground">{selectedBooking.extendedProps?.clientName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedBooking.extendedProps?.clientEmail}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedBooking.extendedProps?.clientPhone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Service</label>
                  <p className="text-sm text-gray-900 dark:text-card-foreground">{selectedBooking.extendedProps?.serviceName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedBooking.extendedProps?.duration} minutes</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">${selectedBooking.extendedProps?.servicePrice}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date & Time</label>
                  <p className="text-sm text-gray-900 dark:text-card-foreground">
                    {new Date(selectedBooking.start).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Barber</label>
                  <p className="text-sm text-gray-900 dark:text-card-foreground">{selectedBooking.extendedProps?.barberName}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  {getStatusBadge(selectedBooking.extendedProps?.status)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment</label>
                  {getPaymentStatusBadge(selectedBooking.extendedProps?.paymentStatus)}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-background"
              >
                Close
              </button>
              {selectedBooking.extendedProps?.canEdit && (
                <button
                  onClick={() => handleUpdateBooking(selectedBooking.id, { status: 'CONFIRMED' })}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Confirm Booking
                </button>
              )}
              {selectedBooking.extendedProps?.canCancel && (
                <button
                  onClick={() => handleCancelBooking(selectedBooking.id)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}