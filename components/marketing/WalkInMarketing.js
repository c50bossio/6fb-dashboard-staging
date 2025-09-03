'use client'

import {
  UserGroupIcon,
  CalendarDaysIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  FunnelIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  UserPlusIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { 
  UserGroupIcon as UserGroupSolid,
  ChartBarIcon as ChartBarSolid,
  StarIcon
} from '@heroicons/react/24/solid'
import { useState, useEffect, useCallback } from 'react'
import { format, subDays, subMonths, isAfter, isBefore } from 'date-fns'
import { formatPhoneForDisplay } from '../../lib/phone-utils.js'
import { showSuccess, showError, showWarning } from '../ui/BookedBarberNotification'

const WalkInMarketing = ({ barbershopId }) => {
  const [walkInCustomers, setWalkInCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCustomers, setSelectedCustomers] = useState(new Set())
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [campaignMessage, setCampaignMessage] = useState('')
  const [filters, setFilters] = useState({
    timeRange: '30', // days
    hasPhone: 'all',
    converted: 'all',
    searchTerm: '',
    visitCount: 'all'
  })

  // Load walk-in customer data
  const loadWalkInCustomers = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/customers/walk-ins?barbershop_id=${barbershopId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load walk-in customers')
      }

      if (data.success && data.customers) {
        setWalkInCustomers(data.customers)
      } else {
        setWalkInCustomers([])
      }
    } catch (error) {
      console.error('Failed to load walk-in customers:', error)
      setError('Failed to load walk-in customer data')
    } finally {
      setLoading(false)
    }
  }, [barbershopId])

  useEffect(() => {
    if (barbershopId) {
      loadWalkInCustomers()
    }
  }, [barbershopId, loadWalkInCustomers])

  // Filter customers based on current filters
  const filteredCustomers = walkInCustomers.filter(customer => {
    // Time range filter
    if (filters.timeRange !== 'all') {
      const daysAgo = parseInt(filters.timeRange)
      const cutoffDate = subDays(new Date(), daysAgo)
      const firstVisitDate = new Date(customer.first_visit_date)
      if (isBefore(firstVisitDate, cutoffDate)) return false
    }

    // Phone filter
    if (filters.hasPhone === 'yes' && !customer.phone) return false
    if (filters.hasPhone === 'no' && customer.phone) return false

    // Conversion filter
    if (filters.converted === 'yes' && !customer.walk_in_converted) return false
    if (filters.converted === 'no' && customer.walk_in_converted) return false

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      const nameMatch = customer.full_name?.toLowerCase().includes(searchLower)
      const phoneMatch = customer.phone?.includes(filters.searchTerm)
      if (!nameMatch && !phoneMatch) return false
    }

    // Visit count filter
    if (filters.visitCount === 'first-time' && (customer.walk_in_visit_count || 1) > 1) return false
    if (filters.visitCount === 'repeat' && (customer.walk_in_visit_count || 1) <= 1) return false

    return true
  })

  // Calculate stats
  const stats = {
    totalWalkIns: walkInCustomers.length,
    withPhone: walkInCustomers.filter(c => c.phone).length,
    converted: walkInCustomers.filter(c => c.walk_in_converted).length,
    recentVisits: walkInCustomers.filter(c => {
      const visitDate = new Date(c.first_visit_date || c.created_at)
      return isAfter(visitDate, subDays(new Date(), 7))
    }).length,
    conversionRate: walkInCustomers.length > 0 
      ? ((walkInCustomers.filter(c => c.walk_in_converted).length / walkInCustomers.length) * 100).toFixed(1)
      : 0
  }

  // Handle customer selection
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)))
    } else {
      setSelectedCustomers(new Set())
    }
  }

  const handleSelectCustomer = (customerId, checked) => {
    const newSelected = new Set(selectedCustomers)
    if (checked) {
      newSelected.add(customerId)
    } else {
      newSelected.delete(customerId)
    }
    setSelectedCustomers(newSelected)
  }

  // Send SMS campaign to selected customers
  const handleSendCampaign = async () => {
    if (selectedCustomers.size === 0 || !campaignMessage.trim()) {
      showWarning(
        'Campaign Setup Required',
        'Please select customers and enter a message',
        'Both customer selection and message are required'
      )
      return
    }

    const selectedWithPhone = filteredCustomers.filter(c => 
      selectedCustomers.has(c.id) && c.phone
    )

    if (selectedWithPhone.length === 0) {
      showError(
        'No Phone Numbers',
        'None of the selected customers have phone numbers',
        'SMS campaigns require customers with valid phone numbers'
      )
      return
    }

    const confirmMessage = `Send SMS to ${selectedWithPhone.length} customers?\n\nMessage: "${campaignMessage}"\n\nThis will charge your SMS credits.`
    
    if (!confirm(confirmMessage)) return

    try {
      setLoading(true)
      
      const promises = selectedWithPhone.map(customer =>
        fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'custom_message',
            message: campaignMessage,
            phone: customer.phone,
            barbershop_id: barbershopId
          })
        })
      )

      const results = await Promise.allSettled(promises)
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (failed === 0) {
        showSuccess(
          'Campaign Sent Successfully!',
          `All ${successful} messages were delivered`,
          'Your SMS campaign was completed successfully'
        )
      } else if (successful > 0) {
        showWarning(
          'Campaign Partially Sent',
          `${successful} successful, ${failed} failed`,
          'Some messages could not be delivered'
        )
      } else {
        showError(
          'Campaign Failed',
          `All ${failed} messages failed to send`,
          'Please check phone numbers and try again'
        )
      }
      
      setShowCampaignModal(false)
      setCampaignMessage('')
      setSelectedCustomers(new Set())

    } catch (error) {
      console.error('Failed to send campaign:', error)
      showError(
        'Campaign Error',
        'Failed to send SMS campaign',
        'Please check your connection and try again'
      )
    } finally {
      setLoading(false)
    }
  }

  // Mark customer as converted
  const handleMarkAsConverted = async (customerId) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/convert`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walk_in_converted: true,
          converted_date: new Date().toISOString()
        })
      })

      if (response.ok) {
        await loadWalkInCustomers()
        showSuccess(
          'Customer Converted!',
          'Customer has been marked as converted',
          'This customer is now tracked as a successful conversion'
        )
      } else {
        throw new Error('Failed to update customer')
      }
    } catch (error) {
      console.error('Failed to mark as converted:', error)
      showError(
        'Conversion Failed',
        'Failed to update customer conversion status',
        'Please try again or check your connection'
      )
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <UserGroupSolid className="h-8 w-8 text-olive-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Walk-in Customer Marketing</h2>
              <p className="text-gray-600">Track and market to walk-in customers</p>
            </div>
          </div>
          {selectedCustomers.size > 0 && (
            <button
              onClick={() => setShowCampaignModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <ChatBubbleLeftIcon className="h-5 w-5" />
              <span>Send SMS ({selectedCustomers.size})</span>
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Walk-ins</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalWalkIns}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">With Phone #</p>
                <p className="text-2xl font-bold text-green-900">{stats.withPhone}</p>
              </div>
              <PhoneIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Converted</p>
                <p className="text-2xl font-bold text-purple-900">{stats.converted}</p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600">This Week</p>
                <p className="text-2xl font-bold text-amber-900">{stats.recentVisits}</p>
              </div>
              <CalendarDaysIcon className="h-8 w-8 text-amber-600" />
            </div>
          </div>

          <div className="bg-rose-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-rose-900">{stats.conversionRate}%</p>
              </div>
              <ChartBarSolid className="h-8 w-8 text-rose-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <FunnelIcon className="h-4 w-4" />
            <span className="font-medium">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Time Range</label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-olive-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Has Phone</label>
              <select
                value={filters.hasPhone}
                onChange={(e) => setFilters({...filters, hasPhone: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-olive-500"
              >
                <option value="all">All</option>
                <option value="yes">With Phone</option>
                <option value="no">No Phone</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Converted</label>
              <select
                value={filters.converted}
                onChange={(e) => setFilters({...filters, converted: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-olive-500"
              >
                <option value="all">All</option>
                <option value="yes">Converted</option>
                <option value="no">Not Converted</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Visit Count</label>
              <select
                value={filters.visitCount}
                onChange={(e) => setFilters({...filters, visitCount: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-olive-500"
              >
                <option value="all">All</option>
                <option value="first-time">First Time</option>
                <option value="repeat">Repeat Visitors</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                  placeholder="Search by name or phone..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-olive-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="font-semibold text-gray-900">Walk-in Customers</h3>
              <span className="text-sm text-gray-500">({filteredCustomers.length} results)</span>
            </div>
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Select All</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <div className="flex items-center space-x-2 text-red-700">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-200">
          {filteredCustomers.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No walk-in customers match your filters</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div key={customer.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.has(customer.id)}
                    onChange={(e) => handleSelectCustomer(customer.id, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <p className="font-medium text-gray-900">{customer.full_name}</p>
                      
                      {customer.walk_in_converted && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Converted
                        </span>
                      )}
                      
                      {customer.phone && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          <PhoneIcon className="h-3 w-3 mr-1" />
                          SMS Ready
                        </span>
                      )}
                      
                      {(customer.walk_in_visit_count || 1) > 1 && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          <StarIcon className="h-3 w-3 mr-1" />
                          {customer.walk_in_visit_count} visits
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {customer.phone && (
                        <span className="flex items-center space-x-1">
                          <PhoneIcon className="h-4 w-4" />
                          <span>{formatPhoneForDisplay(customer.phone)}</span>
                        </span>
                      )}
                      
                      <span className="flex items-center space-x-1">
                        <CalendarDaysIcon className="h-4 w-4" />
                        <span>First visit: {format(new Date(customer.first_visit_date || customer.created_at), 'MMM d, yyyy')}</span>
                      </span>
                      
                      {customer.last_visit_date && customer.last_visit_date !== customer.first_visit_date && (
                        <span className="flex items-center space-x-1">
                          <CalendarDaysIcon className="h-4 w-4" />
                          <span>Last visit: {format(new Date(customer.last_visit_date), 'MMM d, yyyy')}</span>
                        </span>
                      )}
                    </div>
                    
                    {customer.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>"{customer.notes}"</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {customer.phone && (
                      <button
                        onClick={() => {
                          setSelectedCustomers(new Set([customer.id]))
                          setShowCampaignModal(true)
                        }}
                        className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                        title="Send SMS"
                      >
                        <ChatBubbleLeftIcon className="h-5 w-5" />
                      </button>
                    )}

                    {!customer.walk_in_converted && (
                      <button
                        onClick={() => handleMarkAsConverted(customer.id)}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
                        title="Mark as converted to regular customer"
                      >
                        Mark Converted
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Send SMS Campaign
              </h3>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Sending to {selectedCustomers.size} selected customers
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    Only customers with phone numbers will receive the message.
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={campaignMessage}
                  onChange={(e) => setCampaignMessage(e.target.value)}
                  rows={4}
                  placeholder="Enter your marketing message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {campaignMessage.length}/160 characters
                </p>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">SMS charges apply</p>
                    <p>Each message will consume SMS credits from your account.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCampaignModal(false)
                  setCampaignMessage('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCampaign}
                disabled={!campaignMessage.trim() || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Send Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalkInMarketing