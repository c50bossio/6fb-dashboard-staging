'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase/client'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { 
  CalendarDaysIcon,
  UserGroupIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  BoltIcon,
  CogIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'

// Service types
const SERVICES = [
  { id: 'haircut', name: 'Haircut', duration: 30, price: 35 },
  { id: 'beard', name: 'Beard Trim', duration: 20, price: 20 },
  { id: 'full', name: 'Full Service', duration: 50, price: 50 },
  { id: 'kids', name: 'Kids Cut', duration: 20, price: 25 }
]

// Barbers
const BARBERS = [
  { id: '1', name: 'Marcus Johnson', title: 'Master Barber' },
  { id: '2', name: 'David Rodriguez', title: 'Senior Stylist' },
  { id: '3', name: 'Mike Thompson', title: 'Beard Specialist' }
]

// Recurrence patterns
const RECURRENCE_PATTERNS = [
  { id: 'weekly', name: 'Weekly', description: 'Every week' },
  { id: 'biweekly', name: 'Bi-weekly', description: 'Every 2 weeks' },
  { id: 'monthly', name: 'Monthly', description: 'Every month' },
  { id: 'custom', name: 'Custom', description: 'Custom interval' }
]

export default function RecurringBookingsPage() {
  const [recurringSeries, setRecurringSeries] = useState([])
  const [upcomingOccurrences, setUpcomingOccurrences] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSeries, setSelectedSeries] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [analytics, setAnalytics] = useState({
    totalSeries: 0,
    activeSeries: 0,
    upcomingThis month: 0,
    autoBookingRate: 0
  })
  
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    loadRecurringSeries()
    loadUpcomingOccurrences()
    loadAnalytics()
  }, [])

  const loadRecurringSeries = async () => {
    // Demo data - in production, this would fetch from API
    const demoSeries = [
      {
        series_id: 'rec_001',
        customer_name: 'John Smith',
        customer_phone: '+1 (555) 123-4567',
        customer_email: 'john@example.com',
        barber_id: '1',
        barber_name: 'Marcus Johnson',
        service_id: 'haircut',
        service_name: 'Haircut',
        pattern: 'weekly',
        preferred_time: '14:00',
        preferred_day: 2, // Wednesday
        start_date: '2024-01-15',
        max_occurrences: 12,
        occurrences_completed: 8,
        is_active: true,
        auto_book: true,
        created_at: '2024-01-01T10:00:00Z',
        next_occurrence: '2024-08-07',
        notes: 'Regular customer, prefers consistency'
      },
      {
        series_id: 'rec_002',
        customer_name: 'Sarah Johnson',
        customer_phone: '+1 (555) 234-5678',
        customer_email: 'sarah@example.com',
        barber_id: '2',
        barber_name: 'David Rodriguez',
        service_id: 'full',
        service_name: 'Full Service',
        pattern: 'biweekly',
        preferred_time: '10:30',
        preferred_day: 5, // Saturday
        start_date: '2024-02-03',
        max_occurrences: 10,
        occurrences_completed: 6,
        is_active: true,
        auto_book: true,
        created_at: '2024-01-20T14:30:00Z',
        next_occurrence: '2024-08-10',
        notes: 'Flexible with timing, prefers morning slots'
      },
      {
        series_id: 'rec_003',
        customer_name: 'Mike Wilson',
        customer_phone: '+1 (555) 345-6789',
        customer_email: 'mike@example.com',
        barber_id: '3',
        barber_name: 'Mike Thompson',
        service_id: 'beard',
        service_name: 'Beard Trim',
        pattern: 'monthly',
        preferred_time: '16:00',
        preferred_day: 1, // Tuesday
        start_date: '2024-03-05',
        max_occurrences: 6,
        occurrences_completed: 3,
        is_active: false,
        auto_book: false,
        created_at: '2024-02-15T11:15:00Z',
        next_occurrence: null,
        notes: 'Paused series - customer traveling'
      }
    ]
    
    setRecurringSeries(demoSeries)
  }

  const loadUpcomingOccurrences = async () => {
    // Demo upcoming occurrences
    const demoOccurrences = [
      {
        occurrence_id: 'occ_001',
        series_id: 'rec_001',
        customer_name: 'John Smith',
        barber_name: 'Marcus Johnson',
        service_name: 'Haircut',
        scheduled_date: '2024-08-07',
        scheduled_time: '14:00',
        status: 'scheduled',
        auto_book: true,
        booking_id: null
      },
      {
        occurrence_id: 'occ_002',
        series_id: 'rec_002',
        customer_name: 'Sarah Johnson',
        barber_name: 'David Rodriguez',
        service_name: 'Full Service',
        scheduled_date: '2024-08-10',
        scheduled_time: '10:30',
        status: 'confirmed',
        auto_book: true,
        booking_id: 'book_123'
      },
      {
        occurrence_id: 'occ_003',
        series_id: 'rec_001',
        customer_name: 'John Smith',
        barber_name: 'Marcus Johnson',
        service_name: 'Haircut',
        scheduled_date: '2024-08-14',
        scheduled_time: '14:00',
        status: 'scheduled',
        auto_book: true,
        booking_id: null
      }
    ]
    
    setUpcomingOccurrences(demoOccurrences)
  }

  const loadAnalytics = async () => {
    // Demo analytics
    setAnalytics({
      totalSeries: 3,
      activeSeries: 2,
      upcomingThisMonth: 8,
      autoBookingRate: 95.5
    })
  }

  const handleCreateSeries = async (formData) => {
    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In production, this would call the recurring appointments API
    console.log('Creating recurring series:', formData)
    
    setShowCreateModal(false)
    setIsLoading(false)
    
    // Reload data
    loadRecurringSeries()
    loadUpcomingOccurrences()
    loadAnalytics()
  }

  const handleToggleSeriesStatus = async (seriesId, currentStatus) => {
    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Update series status
    setRecurringSeries(prev => prev.map(series => 
      series.series_id === seriesId 
        ? { ...series, is_active: !currentStatus }
        : series
    ))
    
    setIsLoading(false)
  }

  const handleRunAutoBooking = async () => {
    setIsLoading(true)
    
    // Simulate auto-booking process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Update occurrences with new bookings
    setUpcomingOccurrences(prev => prev.map(occ => 
      occ.status === 'scheduled' && Math.random() > 0.5
        ? { ...occ, status: 'confirmed', booking_id: `book_${Date.now()}` }
        : occ
    ))
    
    setIsLoading(false)
    
    // Show success notification
    alert('Auto-booking process completed! 2 appointments were automatically booked.')
  }

  // Create/Edit Modal Component
  const SeriesModal = ({ isEdit = false }) => {
    const [formData, setFormData] = useState({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      barber_id: '1',
      service_id: 'haircut',
      pattern: 'weekly',
      start_date: '',
      preferred_time: '10:00',
      preferred_day: 1,
      max_occurrences: 12,
      auto_book: true,
      notes: ''
    })

    useEffect(() => {
      if (isEdit && selectedSeries) {
        setFormData({
          customer_name: selectedSeries.customer_name,
          customer_phone: selectedSeries.customer_phone,
          customer_email: selectedSeries.customer_email,
          barber_id: selectedSeries.barber_id,
          service_id: selectedSeries.service_id,
          pattern: selectedSeries.pattern,
          start_date: selectedSeries.start_date,
          preferred_time: selectedSeries.preferred_time,
          preferred_day: selectedSeries.preferred_day,
          max_occurrences: selectedSeries.max_occurrences,
          auto_book: selectedSeries.auto_book,
          notes: selectedSeries.notes || ''
        })
      }
    }, [isEdit, selectedSeries])

    const handleSubmit = async (e) => {
      e.preventDefault()
      await handleCreateSeries(formData)
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {isEdit ? 'Edit Recurring Series' : 'Create Recurring Series'}
            </h3>
            <button 
              onClick={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Service Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barber</label>
                <select
                  value={formData.barber_id}
                  onChange={(e) => setFormData({...formData, barber_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BARBERS.map(barber => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <select
                  value={formData.service_id}
                  onChange={(e) => setFormData({...formData, service_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SERVICES.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} - ${service.price}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recurrence Pattern */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={formData.pattern}
                  onChange={(e) => setFormData({...formData, pattern: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RECURRENCE_PATTERNS.map(pattern => (
                    <option key={pattern.id} value={pattern.id}>
                      {pattern.name} - {pattern.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Appointments</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={formData.max_occurrences}
                  onChange={(e) => setFormData({...formData, max_occurrences: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Timing */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                <input
                  type="time"
                  value={formData.preferred_time}
                  onChange={(e) => setFormData({...formData, preferred_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <select
                  value={formData.preferred_day}
                  onChange={(e) => setFormData({...formData, preferred_day: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.auto_book}
                  onChange={(e) => setFormData({...formData, auto_book: e.target.checked})}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Automatically book appointments when available
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special preferences or notes..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                    {isEdit ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5 mr-2" />
                    {isEdit ? 'Update Series' : 'Create Series'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ArrowPathIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recurring Appointments</h1>
              <p className="text-sm text-gray-600">Manage customer appointment series and auto-booking</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRunAutoBooking}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 flex items-center"
            >
              <BoltIcon className="h-5 w-5 mr-2" />
              Run Auto-Booking
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Series
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Series</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.totalSeries}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Active Series</p>
            <p className="text-2xl font-bold text-green-600">{analytics.activeSeries}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Upcoming This Month</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.upcomingThisMonth}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Auto-Booking Rate</p>
            <p className="text-2xl font-bold text-purple-600">{analytics.autoBookingRate}%</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Recurring Series List */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recurring Series</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service & Barber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recurringSeries.map((series) => (
                    <tr key={series.series_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{series.customer_name}</div>
                          <div className="text-sm text-gray-500">{series.customer_phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{series.service_name}</div>
                          <div className="text-sm text-gray-500">{series.barber_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 capitalize">{series.pattern}</div>
                          <div className="text-sm text-gray-500">
                            {series.preferred_time} • {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][series.preferred_day]}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {series.occurrences_completed}/{series.max_occurrences}
                          </div>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(series.occurrences_completed / series.max_occurrences) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            series.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {series.is_active ? (
                              <>
                                <PlayIcon className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <PauseIcon className="h-3 w-3 mr-1" />
                                Paused
                              </>
                            )}
                          </span>
                          {series.auto_book && (
                            <BoltIcon className="h-4 w-4 text-green-600 ml-2" title="Auto-booking enabled" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleSeriesStatus(series.series_id, series.is_active)}
                            className={`p-1 rounded ${
                              series.is_active 
                                ? 'text-orange-600 hover:text-orange-900' 
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={series.is_active ? 'Pause series' : 'Resume series'}
                          >
                            {series.is_active ? (
                              <PauseIcon className="h-4 w-4" />
                            ) : (
                              <PlayIcon className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSeries(series)
                              setShowEditModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit series"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this recurring series?')) {
                                // Handle delete
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete series"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Upcoming Occurrences Sidebar */}
        <div className="w-80 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CalendarDaysIcon className="h-5 w-5 mr-2 text-blue-600" />
              Upcoming Appointments
            </h3>
            
            <div className="space-y-3">
              {upcomingOccurrences.map((occurrence) => (
                <div key={occurrence.occurrence_id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{occurrence.customer_name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      occurrence.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800'
                        : occurrence.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {occurrence.status === 'confirmed' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                      {occurrence.status === 'scheduled' && <ClockIcon className="h-3 w-3 mr-1" />}
                      {occurrence.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{occurrence.service_name} • {occurrence.barber_name}</p>
                    <p>{new Date(occurrence.scheduled_date).toLocaleDateString()} at {occurrence.scheduled_time}</p>
                    {occurrence.auto_book && (
                      <p className="flex items-center text-green-600">
                        <BoltIcon className="h-3 w-3 mr-1" />
                        Auto-booking enabled
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {upcomingOccurrences.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No upcoming appointments</p>
              </div>
            )}
          </div>
          
          {/* Auto-booking Status */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-medium text-green-900 mb-2 flex items-center">
              <BoltIcon className="h-5 w-5 mr-2" />
              Auto-Booking Status
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Last run: 2 hours ago</li>
              <li>• Success rate: 95.5%</li>
              <li>• Next run: In 22 hours</li>
              <li>• Appointments created: 24 this week</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && <SeriesModal />}
      {showEditModal && <SeriesModal isEdit={true} />}
    </div>
  )
}