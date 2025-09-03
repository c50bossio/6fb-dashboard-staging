'use client'

import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UserIcon,
  XMarkIcon,
  CogIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import NoShowAnalyticsDashboard from '@/components/analytics/NoShowAnalyticsDashboard'
import AutomationSettings from '@/components/booking/AutomationSettings'
import ClientCareFlow from '@/components/booking/ClientCareFlow'
import ClientHistoryTracker from '@/components/booking/ClientHistoryTracker'
import GoodClientBenefitsManager from '@/components/booking/GoodClientBenefitsManager'
import SimplifiedClientBenefits from '@/components/booking/SimplifiedClientBenefits'
import BookingRulesSetup from '@/components/onboarding/BookingRulesSetup'
import OnboardingStepBanner from '@/components/onboarding/OnboardingStepBanner'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { OnboardingProvider } from '@/contexts/OnboardingContext'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { cn } from '@/lib/utils'

export default function BookingRulesPage() {
  const { user, profile, supabase } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState(null)
  const [barbershopId, setbarbershopId] = useState(null)
  const [bookingRules, setBookingRules] = useState({})
  const [originalRules, setOriginalRules] = useState({})
  
  // Recovery settings state
  const [recoverySettings, setRecoverySettings] = useState({
    requireFeePayment: true,
    requireManagerApproval: true,
    requireDeposit: false,
    firstOffenseWaitPeriod: 'immediate',
    repeatOffenseWaitPeriod: '7days'
  })
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState('policies')
  
  // Modal states for components that need them
  const [showAutomationSettings, setShowAutomationSettings] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [showCareFlow, setShowCareFlow] = useState(false)
  const [showBlockedClientsModal, setShowBlockedClientsModal] = useState(false)
  const [blockedClients, setBlockedClients] = useState([])
  const [selectedClients, setSelectedClients] = useState(new Set())
  
  // Client benefits mode - default to simplified for new users
  const [useSimplifiedBenefits, setUseSimplifiedBenefits] = useState(true)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Check for dev mode
  const [isDev, setIsDev] = useState(false)
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    setIsDev(urlParams.get('dev') === 'true')
  }, [])

  // Reset saving state when page becomes visible (handles tab switches)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && saving) {
        // Page became visible and we're in saving state - this shouldn't happen
        // Reset the saving state to prevent UI confusion
        setSaving(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also reset saving state on component mount if it's somehow stuck
    if (saving) {
      setSaving(false)
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [saving])

  // Reset saving state on page unload to prevent it from persisting
  useEffect(() => {
    const handleBeforeUnload = () => {
      setSaving(false)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
  
  // Role-based access control (bypass in dev mode)
  const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN']
  const hasAccess = isDev || (profile?.role && authorizedRoles.includes(profile.role))

  useEffect(() => {
    // Always call loadBookingRules - it handles the dev/localhost case internally
    loadBookingRules()
  }, [profile?.id, isDev])

  // Check if user has complex benefits setup and should use advanced mode
  useEffect(() => {
    if (bookingRules.goodClientBenefits) {
      const hasComplexSetup = Object.keys(bookingRules.goodClientBenefits).length > 2 || 
        Object.values(bookingRules.goodClientBenefits).some(benefit => 
          benefit.timeWindow !== 60 && benefit.allowances > 3
        )
      
      if (hasComplexSetup) {
        setUseSimplifiedBenefits(false)
      }
    }
  }, [bookingRules.goodClientBenefits])

  // Load blocked clients
  const loadBlockedClients = async () => {
    if (isDev) {
      // Mock data for dev mode
      setBlockedClients([
        {
          id: 'demo-blocked-1',
          client_id: 'client-1',
          customer: { name: 'John Smith', email: 'john@example.com', phone: '555-0123' },
          active_strikes: 3,
          total_strikes: 5,
          is_blocked: true,
          blocked_at: '2024-01-28T10:30:00Z',
          blocked_reason: 'Exceeded maximum allowed no-shows (3 strikes)',
          outstanding_balance: 75.00,
          risk_score: 0.8,
          recent_incidents: []
        },
        {
          id: 'demo-blocked-2', 
          client_id: 'client-2',
          customer: { name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0456' },
          active_strikes: 4,
          total_strikes: 6,
          is_blocked: true,
          blocked_at: '2024-01-25T15:45:00Z',
          blocked_reason: 'Exceeded maximum allowed no-shows (4 strikes)',
          outstanding_balance: 100.00,
          risk_score: 0.95,
          recent_incidents: []
        }
      ])
      return
    }
    
    try {
      const response = await fetch(`/api/no-show/strikes?is_blocked=true`)
      if (!response.ok) throw new Error('Failed to load blocked clients')
      
      const data = await response.json()
      setBlockedClients(data.strikes || [])
    } catch (err) {
      console.error('Error loading blocked clients:', err)
      setBlockedClients([])
    }
  }

  // Bulk operations for blocked clients
  const handleBulkUnblock = async () => {
    if (selectedClients.size === 0) return
    
    if (!confirm(`Are you sure you want to unblock ${selectedClients.size} client(s)? This will reset their strike counts.`)) {
      return
    }
    
    setBulkActionLoading(true)
    
    try {
      const promises = Array.from(selectedClients).map(clientId => {
        const client = blockedClients.find(c => c.client_id === clientId)
        return fetch('/api/no-show/strikes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            action: 'reset_strikes',
            reason: 'Bulk unblock by manager'
          })
        })
      })
      
      await Promise.all(promises)
      
      setNotification({
        type: 'success',
        message: `Successfully unblocked ${selectedClients.size} client(s)`
      })
      
      setSelectedClients(new Set())
      loadBlockedClients() // Refresh the list
    } catch (err) {
      console.error('Bulk unblock error:', err)
      setNotification({
        type: 'error',
        message: 'Failed to unblock some clients. Please try again.'
      })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleSelectAllClients = () => {
    if (selectedClients.size === blockedClients.length) {
      setSelectedClients(new Set())
    } else {
      setSelectedClients(new Set(blockedClients.map(c => c.client_id)))
    }
  }

  const handleSelectClient = (_clientId) => {
    const newSelection = new Set(selectedClients)
    if (newSelection.has(clientId)) {
      newSelection.delete(clientId)
    } else {
      newSelection.add(clientId)
    }
    setSelectedClients(newSelection)
  }

  const loadBookingRules = async () => {
    // Skip loading in dev mode or if running on localhost (auto-detected dev mode)
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('192.168.') ||
      window.location.port === '9999'
    )
    
    if (isDev || isLocalhost) {
      setLoading(false)
      setbarbershopId('mock-barbershop-id')
      setBookingRules({})
      setOriginalRules({})
      return
    }
    
    if (!user || !profile) {
      setLoading(false) // Important: Set loading to false even when no profile
      return
    }
    
    // Don't reload if already loading or saving
    if (loading || saving) return
    
    try {
      setLoading(true)
      setSaving(false) // Ensure saving state is cleared when loading
      
      // Get user's barbershop
      const { data: profile } = await supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', user.id)
        .single()
      
      if (!profile?.barbershop_id) {
        setNotification({
          type: 'error',
          message: 'No barbershop found for this user'
        })
        setLoading(false)
        return
      }
      
      setbarbershopId(profile.barbershop_id)
      
      // Load booking rules from business_settings table
      const { data: settings, error } = await supabase
        .from('business_settings')
        .select('booking_rules')
        .eq('user_id', user.id)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows
        throw error
      }
      
      const rules = settings?.booking_rules || {}
      setBookingRules(rules)
      setOriginalRules(rules)
      
      // Load recovery settings if they exist
      if (rules.recovery) {
        setRecoverySettings(rules.recovery)
      }
    } catch (error) {
      console.error('Error loading booking rules:', error)
      setNotification({
        type: 'error',
        message: 'Failed to load booking rules'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    setNotification(null)
    
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from('business_settings')
          .update({
            booking_rules: { ...bookingRules, recovery: recoverySettings },
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
        
        if (error) throw error
      } else {
        // Create new settings
        const { error } = await supabase
          .from('business_settings')
          .insert({
            user_id: user.id,
            booking_rules: { ...bookingRules, recovery: recoverySettings },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) throw error
      }
      
      setOriginalRules({ ...bookingRules, recovery: recoverySettings })
      setNotification({
        type: 'success',
        message: 'Booking rules saved successfully'
      })
    } catch (error) {
      console.error('Error saving booking rules:', error)
      setNotification({
        type: 'error',
        message: 'Failed to save booking rules'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setBookingRules(originalRules)
    // Reset recovery settings to original values
    if (originalRules.recovery) {
      setRecoverySettings(originalRules.recovery)
    }
    setNotification(null)
  }

  const hasChanges = useMemo(() => {
    const currentState = { ...bookingRules, recovery: recoverySettings }
    return JSON.stringify(currentState) !== JSON.stringify(originalRules)
  }, [bookingRules, recoverySettings, originalRules])

  // Memoized update function to prevent infinite loops
  const updateBookingRules = useCallback((newData) => {
    setBookingRules(newData)
  }, [])

  // Validation function for onboarding completion
  const validateBookingCompletion = async () => {
    try {
      const response = await fetch('/api/onboarding/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        const bookingComplete = data.steps?.booking?.complete || false
        return {
          valid: bookingComplete,
          message: bookingComplete 
            ? 'Booking policies configured successfully! Your cancellation and booking rules are set up.'
            : 'Please configure at least one booking or cancellation policy'
        }
      }
    } catch (error) {
      console.error('Error validating booking completion:', error)
    }
    
    return {
      valid: false,
      message: 'Unable to validate booking policies. Please ensure you have configured cancellation and booking rules.'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  // Show unauthorized message for users without access
  if (!hasAccess) {
    return (
      <div className="max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-olive-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Booking Rules</h1>
              <p className="mt-1 text-sm text-gray-600">
                Configure booking policies, cancellations, and client requirements
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <InformationCircleIcon className="h-6 w-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Access Restricted</h3>
              <p className="text-sm text-blue-800 mb-4">
                Booking rules management is available for shop owners and administrators only. 
                These settings control business policies like cancellation fees, no-show policies, 
                and payment requirements.
              </p>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">If you need to modify booking policies:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Contact your shop owner or manager</li>
                  <li>Request the necessary permissions</li>
                  <li>Discuss specific policy changes needed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Tab configuration
  const tabs = [
    { id: 'policies', name: 'Booking Policies', icon: CalendarDaysIcon },
    { id: 'noshow', name: 'No-Show Management', icon: ExclamationTriangleIcon },
    { id: 'benefits', name: 'Good Client Benefits', icon: ClockIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
    { id: 'recovery', name: 'Recovery Settings', icon: ShieldCheckIcon },
    { id: 'automation', name: 'Automation', icon: CogIcon }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Onboarding Step Banner */}
      <OnboardingStepBanner 
        stepId="booking"
        validateCompletion={validateBookingCompletion}
        completionMessage="Booking policies configured successfully!"
      />

      <div className="mb-8">
        <div className="flex items-center">
          <CalendarDaysIcon className="h-8 w-8 text-olive-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking & No-Show Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure booking policies, no-show rules, grace periods, and recovery workflows
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                  activeTab === tab.id
                    ? 'border-olive-500 text-olive-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon
                  className={cn(
                    'mr-2 h-5 w-5',
                    activeTab === tab.id ? 'text-olive-500' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-lg flex items-start ${
          notification.type === 'success' ? 'bg-green-50' :
          notification.type === 'error' ? 'bg-red-50' :
          'bg-yellow-50'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-2" />
          ) : (
            <ExclamationTriangleIcon className={`h-5 w-5 mt-0.5 mr-2 ${
              notification.type === 'error' ? 'text-red-400' : 'text-yellow-400'
            }`} />
          )}
          <span className={`text-sm ${
            notification.type === 'success' ? 'text-green-800' :
            notification.type === 'error' ? 'text-red-800' :
            'text-yellow-800'
          }`}>
            {notification.message}
          </span>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          {/* Policies Tab */}
          {activeTab === 'policies' && (
            <OnboardingProvider>
              <BookingRulesSetup 
                data={bookingRules}
                updateData={updateBookingRules}
                onComplete={() => {}}
                hideSaveButton={true}
              />
            </OnboardingProvider>
          )}

          {/* No-Show Management Tab */}
          {activeTab === 'noshow' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">No-Show Management</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Monitor client behavior, manage strikes, and initiate recovery processes for blocked clients.
                </p>
              </div>
              
              {/* Client History Tracker */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Client Strike History</h4>
                <ClientHistoryTracker 
                  barbershopId={barbershopId}
                  onClientSelect={(client) => {
                    setSelectedClient(client)
                    if (client?.isBlocked) {
                      setShowCareFlow(true)
                    }
                  }}
                  onClientUpdate={(client) => {
                    setSelectedClient(client)
                  }}
                />
              </div>

              {/* Quick Actions */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowCareFlow(true)}
                    className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
                  >
                    Reach Out with Care
                  </button>
                  <button
                    onClick={() => {
                      loadBlockedClients()
                      setShowBlockedClientsModal(true)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    View Blocked Clients
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Good Client Benefits Tab */}
          {activeTab === 'benefits' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Good Client Benefits</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Reward loyalty and show understanding for clients who've earned your trust and flexibility.
                </p>
              </div>
              {useSimplifiedBenefits ? (
                <div className="space-y-4">
                  <SimplifiedClientBenefits 
                    barbershopId={barbershopId}
                    currentRules={bookingRules}
                    onUpdate={(benefitSettings) => {
                      setBookingRules(prev => ({ ...prev, goodClientBenefits: benefitSettings }))
                    }}
                    isManager={authorizedRoles.includes(profile?.role)}
                  />
                  
                  {/* Switch to Advanced */}
                  <div className="pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Need more customization?</p>
                        <p className="text-sm text-gray-600">Switch to advanced mode for complex tier management</p>
                      </div>
                      <button
                        onClick={() => setUseSimplifiedBenefits(false)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Switch to Advanced →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Switch to Simple */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-blue-900">Using Advanced Mode</p>
                        <p className="text-sm text-blue-700">Complex tier management with full customization</p>
                      </div>
                      <button
                        onClick={() => setUseSimplifiedBenefits(true)}
                        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                      >
                        ← Switch to Simple
                      </button>
                    </div>
                  </div>
                  
                  <GoodClientBenefitsManager 
                    barbershopId={barbershopId}
                    currentRules={bookingRules}
                    onUpdate={(benefitSettings) => {
                      setBookingRules(prev => ({ ...prev, goodClientBenefits: benefitSettings }))
                    }}
                    isManager={authorizedRoles.includes(profile?.role)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">No-Show Analytics</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Track patterns, revenue impact, and policy effectiveness.
                </p>
              </div>
              <NoShowAnalyticsDashboard 
                barbershopId={barbershopId}
                dateRange={{ start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }}
                onExport={(data) => {
                  // Handle export functionality
                  
                }}
              />
            </div>
          )}

          {/* Recovery Settings Tab */}
          {activeTab === 'recovery' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recovery Process Settings</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure how blocked clients can recover their booking privileges.
                </p>
              </div>

              {/* Recovery Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Recovery Requirements</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                        checked={recoverySettings.requireFeePayment}
                        onChange={(e) => setRecoverySettings(prev => ({ ...prev, requireFeePayment: e.target.checked }))}
                      />
                      <span className="text-sm text-gray-700">Require fee payment</span>
                      <div className="group relative">
                        <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="absolute left-0 bottom-6 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-64 z-10">
                          Clients must pay outstanding no-show fees before being unblocked. This ensures accountability and compensates for lost revenue.
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                        checked={recoverySettings.requireManagerApproval}
                        onChange={(e) => setRecoverySettings(prev => ({ ...prev, requireManagerApproval: e.target.checked }))}
                      />
                      <span className="text-sm text-gray-700">Require manager approval</span>
                      <div className="group relative">
                        <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="absolute left-0 bottom-6 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-64 z-10">
                          A manager must manually review and approve the client's unblocking request. Adds oversight to the recovery process.
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                        checked={recoverySettings.requireDeposit}
                        onChange={(e) => setRecoverySettings(prev => ({ ...prev, requireDeposit: e.target.checked }))}
                      />
                      <span className="text-sm text-gray-700">Require deposit for future bookings</span>
                      <div className="group relative">
                        <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="absolute left-0 bottom-6 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-64 z-10">
                          Client must pay a refundable deposit for their next appointment as insurance against future no-shows.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Waiting Periods</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          First offense recovery
                        </label>
                        <div className="group relative">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                          <div className="absolute left-0 bottom-6 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-64 z-10">
                            Waiting period after first policy violation. 'Immediate' allows instant recovery once requirements are met.
                          </div>
                        </div>
                      </div>
                      <select 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        value={recoverySettings.firstOffenseWaitPeriod}
                        onChange={(e) => setRecoverySettings(prev => ({ ...prev, firstOffenseWaitPeriod: e.target.value }))}
                      >
                        <option value="immediate">Immediate</option>
                        <option value="24hours">24 hours</option>
                        <option value="3days">3 days</option>
                        <option value="7days">7 days</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Repeat offense recovery
                        </label>
                        <div className="group relative">
                          <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                          <div className="absolute left-0 bottom-6 hidden group-hover:block bg-gray-900 text-white text-xs rounded p-2 w-64 z-10">
                            Extended waiting period for clients with multiple violations. Longer periods discourage repeat offenses.
                          </div>
                        </div>
                      </div>
                      <select 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        value={recoverySettings.repeatOffenseWaitPeriod}
                        onChange={(e) => setRecoverySettings(prev => ({ ...prev, repeatOffenseWaitPeriod: e.target.value }))}
                      >
                        <option value="7days">7 days</option>
                        <option value="14days">14 days</option>
                        <option value="30days">30 days</option>
                        <option value="90days">90 days</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Automation Tab */}
          {activeTab === 'automation' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Settings</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure AI-powered automation for no-show prevention and management.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6">
                <button
                  onClick={() => setShowAutomationSettings(true)}
                  className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
                >
                  Open Automation Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end space-x-3">
        {hasChanges && (
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`px-4 py-2 rounded-lg transition-colors ${
            !hasChanges || saving
              ? 'bg-gray-400 text-gray-500 cursor-not-allowed'
              : 'bg-olive-600 text-white hover:bg-olive-700'
          }`}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Modals */}
      {/* Automation Settings Modal */}
      <AutomationSettings 
        currentRules={bookingRules}
        onSettingsChange={(settings) => {
          setBookingRules(prev => ({ ...prev, automationSettings: settings }))
        }}
        isOpen={showAutomationSettings}
        onClose={() => setShowAutomationSettings(false)}
        isManager={authorizedRoles.includes(profile?.role)}
        shopSettings={{ barbershopId }}
      />

      {/* Client Care Flow Modal */}
      {showCareFlow && (
        <ClientCareFlow
          clientId={selectedClient?.id}
          clientData={selectedClient}
          rules={bookingRules}
          onCareComplete={(result) => {
            setShowCareFlow(false)
            setSelectedClient(null)
            setNotification({
              type: 'success',
              message: 'Client care outreach completed successfully! We\'re building stronger relationships.'
            })
          }}
          onClose={() => {
            setShowCareFlow(false)
            setSelectedClient(null)
          }}
          isOpen={showCareFlow}
          isManager={authorizedRoles.includes(profile?.role)}
        />
      )}

      {/* Blocked Clients Modal */}
      {showBlockedClientsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                 onClick={() => setShowBlockedClientsModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" />
                      Blocked Clients ({blockedClients.length})
                      {selectedClients.size > 0 && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {selectedClients.size} selected
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => {
                        setShowBlockedClientsModal(false)
                        setSelectedClients(new Set())
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {blockedClients.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircleIcon className="mx-auto h-16 w-16 text-green-400 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Blocked Clients</h4>
                      <p className="text-gray-500">
                        Great news! You currently have no clients blocked due to no-show violations.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Bulk Actions Bar */}
                      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={blockedClients.length > 0 && selectedClients.size === blockedClients.length}
                              onChange={handleSelectAllClients}
                              className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Select All ({blockedClients.length})
                            </span>
                          </label>
                          
                          {selectedClients.size > 0 && (
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={handleBulkUnblock}
                                disabled={bulkActionLoading}
                                className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {bulkActionLoading ? 'Unblocking...' : `Unblock ${selectedClients.size}`}
                              </button>
                              <button
                                onClick={() => setSelectedClients(new Set())}
                                className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200"
                              >
                                Clear Selection
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {blockedClients.map((client, index) => (
                          <div key={client.id || index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={selectedClients.has(client.client_id)}
                                  onChange={() => handleSelectClient(client.client_id)}
                                  className="rounded border-gray-300 text-olive-600 focus:ring-olive-500 mr-4"
                                />
                                <UserIcon className="h-10 w-10 text-gray-400 mr-4" />
                                <div>
                                <h4 className="font-medium text-gray-900">
                                  {client.customer?.name || `Client ${client.client_id}`}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {client.customer?.email} • {client.customer?.phone}
                                </p>
                                <div className="flex items-center mt-1 space-x-4">
                                  <span className="text-xs text-red-600">
                                    {client.active_strikes} strikes
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Outstanding: ${client.outstanding_balance?.toFixed(2) || '0.00'}
                                  </span>
                                  <span className="text-xs text-orange-600">
                                    Risk: {Math.round((client.risk_score || 0) * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedClient(client)
                                  setShowCareFlow(true)
                                  setShowBlockedClientsModal(false)
                                }}
                                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                              >
                                Reach Out
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm('Are you sure you want to unblock this client? This will reset their strike count.')) {
                                    try {
                                      const response = await fetch('/api/no-show/strikes', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          client_id: client.client_id,
                                          action: 'reset_strikes',
                                          reason: 'Manual unblock by manager'
                                        })
                                      })
                                      if (response.ok) {
                                        loadBlockedClients() // Refresh the list
                                        setNotification({
                                          type: 'success',
                                          message: `Client ${client.customer?.name} has been unblocked successfully`
                                        })
                                      }
                                    } catch (err) {
                                      console.error('Unblock error:', err)
                                    }
                                  }
                                }}
                                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                              >
                                Unblock
                              </button>
                            </div>
                          </div>
                          
                          {client.blocked_reason && (
                            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              <strong>Blocked:</strong> {client.blocked_reason}
                            </div>
                          )}
                          
                          {client.blocked_at && (
                            <div className="mt-2 text-xs text-gray-500">
                              Blocked on: {new Date(client.blocked_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                      </div>
                    </>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowBlockedClientsModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      onClick={loadBlockedClients}
                      className="px-4 py-2 bg-olive-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-olive-700"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1 inline" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}