'use client'

import {
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { EnhancedNoShowPolicy } from '@/lib/booking-rules-engine/EnhancedNoShowPolicy'

/**
 * ClientHistoryTracker - Comprehensive client no-show history tracking and display
 * Integrates with EnhancedNoShowPolicy to show current penalty status and recommendations
 */
export default function ClientHistoryTracker({ 
  clientId, 
  rules = {}, 
  onClientUpdate,
  onClientSelect,
  barbershopId,
  showFullHistory = false,
  compact = false 
}) {
  const [clientHistory, setClientHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIncident, setExpandedIncident] = useState(null)
  
  // Client selection state
  const [availableClients, setAvailableClients] = useState([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [loadingClients, setLoadingClients] = useState(false)
  
  // Manual override state
  const [showManualOverride, setShowManualOverride] = useState(false)
  const [manualOverrideReason, setManualOverrideReason] = useState('')
  const [manualOverrideLoading, setManualOverrideLoading] = useState(false)
  const [overrideAction, setOverrideAction] = useState('reset_missed appointments') // 'reset_missed appointments' or 'reduce_missed appointments'
  const [missedAppointmentReductionAmount, setMissedAppointmentReductionAmount] = useState(1)
  
  // Reconnection process state
  const [showReconnectionModal, setShowReconnectionModal] = useState(false)
  const [reconnectionLoading, setReconnectionLoading] = useState(false)

  const noShowPolicy = new EnhancedNoShowPolicy(rules)

  useEffect(() => {
    if (clientId) {
      loadClientHistory()
    } else {
      // No client selected, show empty state
      setLoading(false)
      setClientHistory(null)
      setError(null)
    }
  }, [clientId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showClientDropdown && !event.target.closest('.client-dropdown')) {
        setShowClientDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showClientDropdown])

  // Reset missed appointment reduction amount when client changes or action changes
  useEffect(() => {
    if (clientHistory && overrideAction === 'reduce_missed appointments') {
      const currentMissedAppointments = clientHistory.noShowMissedAppointments || 0
      
      // If client has no missed appointments, switch to reset_missed appointments action
      if (currentMissedAppointments === 0) {
        setOverrideAction('reset_missed appointments')
        return
      }
      
      // Adjust reduction amount if it exceeds current missed appointments
      if (missedAppointmentReductionAmount > currentMissedAppointments) {
        setMissedAppointmentReductionAmount(Math.min(currentMissedAppointments, 1))
      }
    }
  }, [clientHistory, overrideAction, missedAppointmentReductionAmount])

  // Handle manual override
  const handleManualOverride = async () => {
    if (!clientHistory || !manualOverrideReason.trim()) return
    
    // Additional validation for reduce_missed appointments action
    if (overrideAction === 'reduce_missed appointments') {
      const currentMissedAppointments = clientHistory.noShowMissedAppointments || 0
      
      if (currentMissedAppointments === 0) {
        setError({ type: 'error', message: 'Client has no missed appointments to remove. Use "Reset All Missed Appointments" if you need to clear taking a break status.' })
        return
      }
      
      if (!missedAppointmentReductionAmount || missedAppointmentReductionAmount < 1) {
        setError({ type: 'error', message: 'Please enter a valid number of missed appointments to remove (minimum 1).' })
        return
      }
      
      if (missedAppointmentReductionAmount > currentMissedAppointments) {
        setError({ type: 'error', message: `Cannot remove ${missedAppointmentReductionAmount} missed appointments. Client only has ${currentMissedAppointments} active missed appointments.` })
        return
      }
    }
    
    setManualOverrideLoading(true)
    
    try {
      // Add timeout handling for API calls
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

      const requestBody = {
        client_id: clientHistory.clientId,
        action: overrideAction,
        reason: `Manual override: ${manualOverrideReason}`
      }
      
      // Add missed appointment reduction amount for reduce_missed appointments action
      if (overrideAction === 'reduce_missed appointments') {
        requestBody.missedAppointmentReductionAmount = parseInt(missedAppointmentReductionAmount)
      }

      const response = await fetch('/api/no-show/strikes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      
      if (response.ok) {
        const responseData = await response.json().catch(() => ({}))
        
        // Calculate new missed appointment count based on action
        let newMissedAppointmentCount
        if (overrideAction === 'reset_missed appointments') {
          newMissedAppointmentCount = 0
        } else if (overrideAction === 'reduce_missed appointments') {
          newMissedAppointmentCount = Math.max(0, (clientHistory.noShowMissedAppointments || 0) - parseInt(missedAppointmentReductionAmount))
        }
        
        // Update local state to reflect the override
        setClientHistory(prev => ({
          ...prev,
          noShowMissedAppointments: newMissedAppointmentCount,
          isBlocked: newMissedAppointmentCount === 0 ? false : prev.isBlocked,
          blockedAt: newMissedAppointmentCount === 0 ? null : prev.blockedAt,
          outstandingBalance: newMissedAppointmentCount === 0 ? 0 : prev.outstandingBalance,
          riskScore: Math.max(0, newMissedAppointmentCount * 0.25)
        }))
        
        // Reset form
        setShowManualOverride(false)
        setManualOverrideReason('')
        setOverrideAction('reset_missed appointments')
        setMissedAppointmentReductionAmount(1)
        
        // Show success message from server
        setError({ type: 'success', message: responseData.message || 'Missed Appointment management completed successfully!' })
        setTimeout(() => setError(null), 4000)
        
        // Notify parent if available
        if (onClientUpdate) {
          onClientUpdate({
            ...clientHistory,
            noShowMissedAppointments: newMissedAppointmentCount,
            isBlocked: newMissedAppointmentCount === 0 ? false : clientHistory.isBlocked
          })
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Override failed (${response.status})`)
      }
    } catch (err) {
      console.error('Manual override error:', err)
      
      // Provide user-friendly error messages
      let errorMessage = err.message
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.'
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.'
      } else if (err.message.includes('Network request failed')) {
        errorMessage = 'Network error. Please try again later.'
      }
      
      setError({ type: 'error', message: `Override failed: ${errorMessage}` })
    } finally {
      setManualOverrideLoading(false)
    }
  }

  // Handle reconnection process initiation
  const handleReconnectionProcess = async () => {
    if (!clientHistory?.clientId) {
      setError({ type: 'error', message: 'No client selected for reconnection process' })
      return
    }

    try {
      setReconnectionLoading(true)
      setError(null)

      // Call reconnection process API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('/api/client-care/outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientHistory.clientId,
          careOption: 'caring_outreach',
          send_email: true,
          send_sms: true,
          approach: 'relationship_building',
          tone: 'warm_and_caring'
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Reconnection process failed (${response.status})`)
      }

      const data = await response.json()
      
      // Update the client history to reflect reconnection status
      if (clientHistory) {
        setClientHistory({
          ...clientHistory,
          reconnectionStatus: 'in_progress',
          reconnectionInitiatedAt: new Date().toISOString()
        })
      }

      // Notify parent component
      if (onClientUpdate) {
        onClientUpdate({
          ...clientHistory,
          reconnectionStatus: 'in_progress'
        })
      }

      // Show success message
      setError({ type: 'success', message: 'Reconnection process initiated successfully!' })
      setShowReconnectionModal(false)
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => setError(null), 5000)

    } catch (err) {
      console.error('Reconnection process error:', err)
      
      // Provide user-friendly error messages
      let errorMessage = err.message
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.'
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.'
      } else if (err.message.includes('Network request failed')) {
        errorMessage = 'Network error. Please try again later.'
      }
      
      setError({ type: 'error', message: errorMessage })
    } finally {
      setReconnectionLoading(false)
    }
  }

  // Create a test customer for demo purposes
  const createTestCustomer = async () => {
    if (!barbershopId) {
      setError({ type: 'error', message: 'No barbershop ID available. Please try refreshing the page.' })
      return
    }
    
    try {
      setLoadingClients(true)
      
      const testCustomerData = {
        barbershop_id: barbershopId,
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '555-0123',
        notes: 'Demo customer created for testing booking rules'
      }
      
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCustomerData)
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Add the new customer to available clients immediately
        const newCustomer = {
          id: result.customer.id,
          name: result.customer.name,
          email: result.customer.email,
          phone: result.customer.phone
        }
        setAvailableClients([newCustomer])
        
        // Auto-select the new customer
        loadClientHistory(newCustomer.id)
        setShowClientDropdown(false)
        
        setError({ type: 'success', message: 'Test customer created successfully! You can now demo booking rules.' })
        setTimeout(() => setError(null), 4000)
        
        if (onClientUpdate) {
          onClientUpdate(newCustomer)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error === 'Customer already exists') {
          // Customer already exists, just load them
          setError({ type: 'success', message: 'Test customer already exists. Loading their data...' })
          loadAvailableClients()
        } else {
          throw new Error(errorData.error || 'Failed to create test customer')
        }
      }
    } catch (err) {
      console.error('Error creating test customer:', err)
      setError({ type: 'error', message: 'Failed to create test customer. ' + err.message })
    } finally {
      setLoadingClients(false)
    }
  }

  // Load available clients for selection
  const loadAvailableClients = async () => {
    if (!barbershopId) return
    
    try {
      setLoadingClients(true)
      
      const response = await fetch(`/api/customers?barbershop_id=${barbershopId}&limit=50`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.customers && Array.isArray(data.customers)) {
          // Transform API response to match expected format
          const clientsFromAPI = data.customers.map(customer => ({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone
          }))
          setAvailableClients(clientsFromAPI)
          return
        } else {
          // API returned successfully but no customers - this is expected for new barbershops
          setAvailableClients([])
          return
        }
      } else {
        // API returned error status
        const errorData = await response.json().catch(() => ({}))
        console.warn('API error loading customers:', errorData)
        setAvailableClients([])
      }
      
    } catch (err) {
      console.warn('Network error loading clients:', err)
      // Network error - still provide empty array so UI doesn't break
      setAvailableClients([])
    } finally {
      setLoadingClients(false)
    }
  }

  const loadClientHistory = async (selectedClientId = clientId) => {
    try {
      setLoading(true)
      setError(null)

      // Validate client ID
      if (!selectedClientId) {
        throw new Error('No client selected. Please select a client first.')
      }

      // Since client_strike_history table doesn't exist, provide a simplified history
      // This will be populated when the proper database table is created
      const history = {
        clientId: selectedClientId,
        noShowMissedAppointments: 0,
        totalBookings: 0,
        lastNoShow: null,
        isBlocked: false,
        blockedAt: null,
        reconnectionStatus: null,
        outstandingBalance: 0,
        riskScore: 0,
        recentIncidents: [],
        appointmentHistory: []
      }
      
      setClientHistory(history)
      
      if (onClientUpdate) {
        onClientUpdate(history)
      }

      // Show success message for refresh
      if (selectedClientId === clientId) {
        setError({ type: 'success', message: 'Client history refreshed successfully!' })
        setTimeout(() => setError(null), 3000) // Clear success message after 3 seconds
      }

    } catch (err) {
      console.error('Error loading client history:', err)
      setError({ type: 'error', message: err.message })
      
      // Only use fallback data if this is not a validation error
      if (!err.message.includes('No client selected')) {
        setClientHistory({
          clientId: selectedClientId,
          noShowMissedAppointments: 0,
          totalBookings: 0,
          lastNoShow: null,
          isBlocked: false,
          recentIncidents: [],
          appointmentHistory: []
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateCurrentStatus = () => {
    if (!clientHistory) return null

    const result = noShowPolicy.shouldBlockClient(clientHistory)
    const penaltyPreview = noShowPolicy.calculateNoShowPenalty(
      { servicePrice: 50, serviceDuration: 60 }, // Sample appointment
      clientHistory
    )

    return {
      ...result,
      nextPenalty: penaltyPreview,
      clientSummary: {
        totalAppointments: clientHistory.totalBookings || 0,
        completedAppointments: (clientHistory.totalBookings || 0) - (clientHistory.noShowMissedAppointments || 0),
        noShowCount: clientHistory.noShowMissedAppointments || 0,
        lastNoShow: clientHistory.lastNoShow || null,
        loyaltyStatus: (clientHistory.loyaltyMonths >= 6 && clientHistory.totalBookings >= 10) ? 'loyal' : 'standard'
      }
    }
  }

  const renderStatusBadge = (status) => {
    const statusConfig = {
      completed: { 
        color: 'text-green-700 bg-green-50 border-green-200', 
        icon: CheckCircleIcon,
        label: 'Completed' 
      },
      no_show: { 
        color: 'text-red-700 bg-red-50 border-red-200', 
        icon: XMarkIcon,
        label: 'No Show' 
      },
      cancelled: { 
        color: 'text-yellow-700 bg-yellow-50 border-yellow-200', 
        icon: ClockIcon,
        label: 'Cancelled' 
      },
      late_cancellation: { 
        color: 'text-orange-700 bg-orange-50 border-orange-200', 
        icon: ExclamationTriangleIcon,
        label: 'Late Cancel' 
      }
    }

    const config = statusConfig[status] || statusConfig.completed
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    )
  }

  const renderCompactView = (currentStatus) => {
    if (!currentStatus) return null

    const { clientSummary, shouldBlock, nextPenalty } = currentStatus
    
    return (
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <UserIcon className="h-4 w-4 text-gray-600 mr-2" />
            <span className="text-sm font-medium text-gray-900">
              Client History
            </span>
            {clientSummary.loyaltyStatus === 'loyal' && (
              <ShieldCheckIcon className="h-4 w-4 text-green-600 ml-2" />
            )}
          </div>
          {shouldBlock && (
            <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded">
              BLOCKED
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Total Visits</span>
            <div className="font-medium">{clientSummary.totalAppointments}</div>
          </div>
          <div>
            <span className="text-gray-500">No Shows</span>
            <div className="font-medium text-red-600">{clientSummary.noShowCount}</div>
          </div>
          <div>
            <span className="text-gray-500">Success Rate</span>
            <div className="font-medium text-green-600">
              {clientSummary.totalAppointments > 0 
                ? Math.round((clientSummary.completedAppointments / clientSummary.totalAppointments) * 100)
                : 0}%
            </div>
          </div>
        </div>

        {nextPenalty && nextPenalty.shouldChargeFee && (
          <div className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded">
            Next no-show fee: ${nextPenalty.feeAmount}
          </div>
        )}
      </div>
    )
  }

  const renderFullHistory = (currentStatus) => {
    if (!currentStatus || !clientHistory.appointmentHistory) return null

    const { clientSummary, shouldBlock, reconnectionOptions, nextPenalty } = currentStatus
    
    return (
      <div className="bg-white border rounded-lg">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 text-gray-600 mr-2" />
              <h3 className="font-medium text-gray-900">Client History & Status</h3>
              {clientSummary.loyaltyStatus === 'loyal' && (
                <div className="ml-2 flex items-center">
                  <ShieldCheckIcon className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-xs font-medium text-green-700">Loyal Client</span>
                </div>
              )}
            </div>
            {shouldBlock && (
              <div className="text-sm font-medium text-red-700 bg-red-100 px-3 py-1 rounded-full">
                BOOKING BLOCKED
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="px-4 py-3 bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{clientSummary.totalAppointments}</div>
            <div className="text-xs text-gray-600">Total Appointments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{clientSummary.completedAppointments}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{clientSummary.noShowCount}</div>
            <div className="text-xs text-gray-600">No Shows</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {clientSummary.totalAppointments > 0 
                ? Math.round((clientSummary.completedAppointments / clientSummary.totalAppointments) * 100)
                : 0}%
            </div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>
        </div>

        {/* Current Status */}
        {(shouldBlock || nextPenalty?.shouldChargeFee) && (
          <div className="px-4 py-3 border-b">
            <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
            
            {shouldBlock && (
              <div className="mb-3">
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium mb-1">Booking Taking a Break</div>
                      <div className="text-xs">{currentStatus.reason}</div>
                    </div>
                  </div>
                </div>

                {reconnectionOptions && reconnectionOptions.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-gray-900 mb-2">Reconnection Options:</div>
                    <div className="space-y-2">
                      {reconnectionOptions.map((option, index) => (
                        <div key={index} className="text-xs bg-blue-50 border border-blue-200 rounded p-2">
                          <div className="font-medium text-blue-900">{option.title}</div>
                          <div className="text-blue-700">{option.description}</div>
                          <div className="text-blue-600 mt-1">
                            Timeframe: {option.timeframe} | Difficulty: {option.difficulty}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {nextPenalty && nextPenalty.shouldChargeFee && (
              <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-3">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-orange-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium mb-1">Next No-Show Penalty</div>
                    <div className="text-xs">
                      Fee: ${nextPenalty.feeAmount} | Level: {nextPenalty.penaltyLevel}
                    </div>
                    {nextPenalty.loyaltyDiscountApplied && (
                      <div className="text-xs text-green-700 mt-1">
                        ✓ Loyalty discount applied (25% reduction)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Appointment History */}
        <div className="px-4 py-3">
          <h4 className="font-medium text-gray-900 mb-3">Recent Appointment History</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {clientHistory.appointmentHistory.slice(-10).reverse().map((appointment, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedIncident(expandedIncident === index ? null : index)}
              >
                <div className="flex items-center flex-1">
                  <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {appointment.serviceName || 'Service'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {appointment.date} at {appointment.time}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  {appointment.feeCharged && (
                    <span className="text-xs text-red-600 mr-2">
                      ${appointment.feeCharged}
                    </span>
                  )}
                  {renderStatusBadge(appointment.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="animate-pulse space-y-4">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="rounded-full bg-gray-200 h-8 w-8"></div>
              <div className="space-y-2">
                <div className="bg-gray-200 h-4 w-32 rounded"></div>
                <div className="bg-gray-200 h-3 w-24 rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded text-center">
              <div className="bg-gray-200 h-6 w-8 mx-auto rounded mb-1"></div>
              <div className="bg-gray-200 h-3 w-16 mx-auto rounded"></div>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <div className="bg-gray-200 h-6 w-8 mx-auto rounded mb-1"></div>
              <div className="bg-gray-200 h-3 w-16 mx-auto rounded"></div>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <div className="bg-gray-200 h-6 w-8 mx-auto rounded mb-1"></div>
              <div className="bg-gray-200 h-3 w-16 mx-auto rounded"></div>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <div className="bg-gray-200 h-6 w-8 mx-auto rounded mb-1"></div>
              <div className="bg-gray-200 h-3 w-16 mx-auto rounded"></div>
            </div>
          </div>
          
          {/* Loading message */}
          <div className="text-center py-4">
            <div className="inline-flex items-center text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              Loading client history...
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    const isSuccess = error.type === 'success'
    const isError = error.type === 'error'
    const message = typeof error === 'object' ? error.message : error
    
    return (
      <div className={`rounded-lg border-l-4 p-4 ${isSuccess ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
        <div className="flex items-center">
          {isSuccess ? (
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" />
          )}
          <div>
            <h3 className={`text-sm font-medium ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
              {isSuccess ? 'Success!' : 'Error Loading Client History'}
            </h3>
            <div className={`mt-1 text-sm ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
              {message}
            </div>
            {isError && (
              <div className="mt-3">
                <button
                  onClick={() => setError(null)}
                  className="text-xs font-medium text-red-800 hover:text-red-900 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!clientHistory) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-200">
        <div className="text-center">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-2">No Client Selected</h3>
          <p className="text-sm text-gray-500 mb-4">
            Select a client to view their no-show history and missed appointment record
          </p>
          
          {/* Client Selection Dropdown */}
          <div className="space-y-2">
            <div className="relative client-dropdown">
              <button
                onClick={() => {
                  if (availableClients.length === 0) {
                    loadAvailableClients()
                  }
                  setShowClientDropdown(!showClientDropdown)
                }}
                disabled={loadingClients}
                className="w-full px-4 py-2 text-sm font-medium text-olive-700 bg-olive-50 border border-olive-200 rounded-md hover:bg-olive-100 transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center">
                  {loadingClients && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-olive-700 mr-2"></div>
                  )}
                  {loadingClients ? 'Loading Clients...' : 'Select Client to View History'}
                </span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>
              
              {showClientDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {/* Search input */}
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-olive-500"
                    />
                  </div>
                  
                  {loadingClients ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Loading clients...</div>
                  ) : availableClients.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="text-sm text-gray-600 mb-3">
                        <strong>No customers found</strong>
                      </div>
                      <div className="text-xs text-gray-500 mb-4">
                        This is normal for a new barbershop! Once you start booking appointments, 
                        your clients will appear here and you can track their booking patterns.
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="text-xs text-blue-800">
                          <div className="font-medium mb-1">💡 Quick Setup:</div>
                          <div className="mb-3">Visit the <strong>Customers</strong> page to add your first clients, or they'll be created automatically when appointments are booked.</div>
                          <button
                            onClick={createTestCustomer}
                            disabled={loadingClients}
                            className="w-full px-3 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingClients ? 'Creating...' : 'Create Test Customer for Demo'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      {availableClients
                        .filter(client => 
                          client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                          client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
                        )
                        .map(client => (
                          <button
                            key={client.id}
                            onClick={() => {
                              // Simulate selecting this client by loading their data
                              loadClientHistory(client.id)
                              setShowClientDropdown(false)
                              setClientSearchTerm('')
                              if (onClientUpdate) {
                                onClientUpdate(client)
                              }
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="text-sm font-medium text-gray-900">{client.name}</div>
                            <div className="text-xs text-gray-500">{client.email}</div>
                          </button>
                        ))
                      }
                      {availableClients.filter(client => 
                        client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                        client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No clients found matching "{clientSearchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
          
          {/* Info Message */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs text-blue-800">
                  <strong>How it works:</strong> We track missed appointments to understand patterns and help clients 
                  stay connected with caring, supportive outreach when life gets busy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentStatus = calculateCurrentStatus()

  return (
    <div className="space-y-3">
      
      {/* Back to Selection Button when viewing client data */}
      {clientHistory && !compact && (
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => {
              setClientHistory(null)
              setError(null)
              setLoading(false)
            }}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            ← Back to Client Selection
          </button>
          <div className="text-sm text-gray-500">
            <span className="font-medium">Client History</span>
          </div>
        </div>
      )}
      
      {compact ? renderCompactView(currentStatus) : renderFullHistory(currentStatus)}
      
      {/* Action Buttons for Full View */}
      {!compact && currentStatus && (
        <div className="flex flex-wrap gap-2">
          {currentStatus.shouldBlock && currentStatus.canRecover && (
            <button
              onClick={() => setShowReconnectionModal(true)}
              disabled={reconnectionLoading}
              className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {reconnectionLoading && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700 mr-1"></div>
              )}
              Reach Out with Care
            </button>
          )}
          
          <button
            onClick={() => setShowManualOverride(true)}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            Manual Override
          </button>
          
          <button
            onClick={loadClientHistory}
            disabled={loading}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading && (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-700 mr-1"></div>
            )}
            {loading ? 'Refreshing...' : 'Refresh History'}
          </button>
        </div>
      )}
      
      {/* Manual Override Modal */}
      {showManualOverride && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Manual Missed Appointment Override
            </h3>
            
            <div className="space-y-4">
              {/* Current Missed Appointment Count Display */}
              {clientHistory && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-900">Current Missed Appointments</span>
                    </div>
                    <span className="text-lg font-bold text-blue-900">
                      {clientHistory.noShowMissedAppointments || 0}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Override Action *
                </label>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <input
                      type="radio"
                      id="reset_missed appointments"
                      name="overrideAction"
                      value="reset_missed appointments"
                      checked={overrideAction === 'reset_missed appointments'}
                      onChange={(e) => setOverrideAction(e.target.value)}
                      className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <label htmlFor="reset_missed appointments" className="ml-3 block text-sm">
                      <span className="font-medium text-gray-900">Reset All Missed Appointments</span>
                      <p className="text-gray-600">Remove all missed appointments and unblock the client completely</p>
                    </label>
                  </div>
                  
                  <div className="flex items-start">
                    <input
                      type="radio"
                      id="reduce_missed appointments"
                      name="overrideAction"
                      value="reduce_missed appointments"
                      checked={overrideAction === 'reduce_missed appointments'}
                      onChange={(e) => setOverrideAction(e.target.value)}
                      disabled={(clientHistory?.noShowMissedAppointments || 0) === 0}
                      className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="reduce_missed appointments" className={`ml-3 block text-sm ${(clientHistory?.noShowMissedAppointments || 0) === 0 ? 'opacity-50' : ''}`}>
                      <span className="font-medium text-gray-900">Remove Specific Number</span>
                      <p className="text-gray-600">
                        {(clientHistory?.noShowMissedAppointments || 0) === 0 
                          ? 'Not available - client has no active missed appointments' 
                          : 'Remove a certain number of missed appointments (partial reduction)'
                        }
                      </p>
                    </label>
                  </div>
                </div>
              </div>

              {/* Missed Appointment Reduction Amount Input */}
              {overrideAction === 'reduce_missed appointments' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Missed Appointments to Remove *
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="1"
                      max={clientHistory?.noShowMissedAppointments || 1}
                      value={missedAppointmentReductionAmount}
                      onChange={(e) => setMissedAppointmentReductionAmount(Math.max(1, Math.min(parseInt(e.target.value) || 1, clientHistory?.noShowMissedAppointments || 1)))}
                      className="w-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center"
                    />
                    <span className="text-sm text-gray-600">
                      → Will leave <strong>{Math.max(0, (clientHistory?.noShowMissedAppointments || 0) - missedAppointmentReductionAmount)}</strong> missed appointments remaining
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Override Reason *
                </label>
                <textarea
                  value={manualOverrideReason}
                  onChange={(e) => setManualOverrideReason(e.target.value)}
                  placeholder={overrideAction === 'reset_missed appointments' 
                    ? "Explain why you're resetting this client's missed appointments..."
                    : `Explain why you're removing ${missedAppointmentReductionAmount} missed appointment${missedAppointmentReductionAmount > 1 ? 's' : ''}...`
                  }
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
              
              {/* Confirmation Warning */}
              {clientHistory?.clientId && (
                <div className={`border rounded-md p-3 ${overrideAction === 'reset_missed appointments' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${overrideAction === 'reset_missed appointments' ? 'text-red-600' : 'text-orange-600'}`} />
                    <div className={`text-sm ${overrideAction === 'reset_missed appointments' ? 'text-red-800' : 'text-orange-800'}`}>
                      <div className="font-medium mb-1">
                        {overrideAction === 'reset_missed appointments' ? 'Confirm Complete Missed Appointment Reset' : 'Confirm Partial Missed Appointment Reduction'}
                      </div>
                      <div>
                        {overrideAction === 'reset_missed appointments' 
                          ? 'This will reset all missed appointments for the selected client and unblock them if they are currently taking a break.'
                          : `This will remove ${missedAppointmentReductionAmount} missed appointment${missedAppointmentReductionAmount > 1 ? 's' : ''} from the client (${clientHistory.noShowMissedAppointments} → ${Math.max(0, (clientHistory.noShowMissedAppointments || 0) - missedAppointmentReductionAmount)}).`
                        }
                        {' '}This action cannot be undone.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowManualOverride(false)
                  setManualOverrideReason('')
                  setOverrideAction('reset_missed appointments')
                  setMissedAppointmentReductionAmount(1)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={manualOverrideLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleManualOverride}
                disabled={!manualOverrideReason.trim() || manualOverrideLoading}
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                  overrideAction === 'reset_missed appointments' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {manualOverrideLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {overrideAction === 'reset_missed appointments' 
                  ? 'Reset All Missed Appointments' 
                  : `Remove ${missedAppointmentReductionAmount} Missed Appointment${missedAppointmentReductionAmount > 1 ? 's' : ''}`
                }
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reconnection Process Modal */}
      {showReconnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reach Out with Care
            </h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Caring Outreach</div>
                    <div>
                      This will reach out to the client with genuine care and understanding, including:
                    </div>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Warm, empathetic email showing we care about them</li>
                      <li>Caring text message (if phone available)</li>
                      <li>Flexible solutions and support options</li>
                      <li>Personal touch to rebuild the relationship</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {clientHistory?.clientId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <div className="font-medium mb-1">Ready to Reach Out?</div>
                      <div>
                        This will send caring, supportive messages to help this valued client reconnect with us.
                        They'll receive warm communication showing we miss them and want to help.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowReconnectionModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={reconnectionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleReconnectionProcess}
                disabled={reconnectionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {reconnectionLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                Send Caring Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

