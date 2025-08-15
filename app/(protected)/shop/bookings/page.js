'use client'

import { 
  CalendarDaysIcon,
  UserGroupIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PencilIcon,
  ScissorsIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function ShopBookingsManagement() {
  const { user, profile } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState('day') // day, week, month
  const [filterBarber, setFilterBarber] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadBookingsData()
  }, [selectedDate, filterBarber, filterStatus])

  const loadBookingsData = async () => {
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(filterBarber !== 'all' && { barber_id: filterBarber })
      })
      
      const response = await fetch(`/api/shop/schedule?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAppointments(data.appointments || [])
        setSummary(data.summary || {})
      }
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-700 bg-green-100'
      case 'confirmed': return 'text-olive-700 bg-olive-100'
      case 'in_progress': return 'text-yellow-700 bg-yellow-100'
      case 'cancelled': return 'text-red-700 bg-red-100'
      case 'no_show': return 'text-gray-700 bg-gray-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return CheckCircleIcon
      case 'confirmed': return ClockIcon
      case 'in_progress': return ArrowPathIcon
      case 'cancelled': return XCircleIcon
      case 'no_show': return ExclamationTriangleIcon
      default: return ClockIcon
    }
  }

  const filteredAppointments = appointments.filter(apt => {
    if (filterStatus !== 'all' && apt.status !== filterStatus) return false
    if (searchTerm && !apt.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-olive-100 flex items-center justify-center">
              <CalendarDaysIcon className="h-8 w-8 text-olive-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bookings Management</h1>
              <p className="text-gray-600">Manage all appointments across your shop</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Export Schedule
            </button>
            <button className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              New Booking
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-olive-100 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-olive-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary.total_appointments || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Total Appointments</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary.completed || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Completed</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-amber-800" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary.confirmed || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Upcoming</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">${summary.total_revenue || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Revenue Today</p>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barber</label>
                <select
                  value={filterBarber}
                  onChange={(e) => setFilterBarber(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Barbers</option>
                  <option value="barber-alex-123">Alex Rodriguez</option>
                  <option value="barber-jamie-123">Jamie Chen</option>
                  <option value="barber-mike-123">Mike Thompson</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="divide-y divide-gray-200">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((appointment) => {
              const StatusIcon = getStatusIcon(appointment.status)
              
              return (
                <div key={appointment.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserGroupIcon className="h-6 w-6 text-gray-500" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-lg font-medium text-gray-900">
                            {appointment.customer_name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {appointment.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {new Date(appointment.start_time).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })} - {new Date(appointment.end_time).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                          <span className="flex items-center">
                            <ScissorsIcon className="h-4 w-4 mr-1" />
                            {appointment.barber_name}
                          </span>
                          <span className="flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {appointment.service_name}
                          </span>
                        </div>
                        
                        {appointment.customer_phone && (
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              {appointment.customer_phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">${appointment.price}</p>
                        <p className="text-sm text-gray-500">{appointment.duration_minutes} min</p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600">
                          <PhoneIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {appointment.notes && (
                    <div className="mt-3 ml-16">
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <strong>Notes:</strong> {appointment.notes}
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="p-12 text-center">
              <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No appointments found for the selected criteria</p>
              <button className="inline-flex items-center px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700">
                <PlusIcon className="h-5 w-5 mr-2" />
                Create New Booking
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}