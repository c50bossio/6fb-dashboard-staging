'use client'

import { 
  UsersIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  StarIcon,
  MapPinIcon,
  ChartBarIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  XMarkIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

import { 
  CustomerIntelligenceDashboard,
  CustomerIntelligenceDashboardOptimized,
  CustomerJourneyVisualizer, 
  SegmentBuilder, 
  CustomerProfileEnhanced, 
  ChurnRiskMonitor,
  AchievementBadges,
  BadgeProgress,
  BadgeLeaderboard
} from '../../../../components/customers'
import SmartRebookButton from '../../../../components/customers/SmartRebookButton'
import LoyaltyPointsBadge, { QuickRedeemButton } from '../../../../components/customers/LoyaltyPointsBadge'
import AdvancedSearchFilter from '../../../../components/customers/AdvancedSearchFilter'
import SearchSuggestions from '../../../../components/customers/SearchSuggestions'
import FilterTags from '../../../../components/customers/FilterTags'
import SortOptions from '../../../../components/customers/SortOptions'
import ExportCSV from '../../../../components/customers/ExportCSV'
import SearchHighlight from '../../../../components/customers/SearchHighlight'
import PlatformTailoredImport from '../../../../components/onboarding/PlatformTailoredImport'
import { fuzzySearch } from '../../../../utils/fuzzySearch'
import { AnimatedContainer, StaggeredList } from '../../../../utils/animations'

export default function CustomersPage() {
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSegment, setSelectedSegment] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCustomerForBadges, setSelectedCustomerForBadges] = useState(null)
  const [badgeView, setBadgeView] = useState('overview') // overview, customer-specific, leaderboard
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'intelligence')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedJourneyCustomer, setSelectedJourneyCustomer] = useState(null)
  
  // Advanced search and filtering state
  const [searchResults, setSearchResults] = useState([])
  const [activeFilters, setActiveFilters] = useState({})
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' })
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)

  const calculateSegment = (customer) => {
    const daysSinceLastVisit = customer.last_visit_at 
      ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
      : null
    
    if (customer.vip_status || customer.total_visits >= 10) return 'vip'
    if (daysSinceLastVisit && daysSinceLastVisit > 60) return 'lapsed'
    if (customer.total_visits === 0 || customer.total_visits === 1) return 'new'
    return 'regular'
  }

  const formatCustomerData = (apiCustomers, barbershopId) => {
    return apiCustomers.map(customer => ({
      id: customer.id,
      name: customer.name || 'Unknown',
      email: customer.email || '',
      phone: customer.phone || '',
      segment: calculateSegment(customer),
      totalVisits: customer.total_visits || 0,
      lastVisit: customer.last_visit_at ? new Date(customer.last_visit_at).toLocaleDateString() : 'Never',
      totalSpent: customer.total_spent || 0,
      preferredContact: customer.notification_preferences?.preferred_method || 'email',
      joinDate: customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '',
      notes: customer.notes || '',
      isVip: customer.vip_status || false,
      isActive: customer.is_active !== false,
      barbershopId: barbershopId
    }))
  }

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Fetching customer data...')
      
      // Get barbershop_id from user profile
      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()
      
      console.log('👤 User data received:', {
        authenticated: userData.authenticated,
        hasUser: !!userData.user,
        barbershopId: userData.user?.barbershop_id,
        hasCustomerAccess: userData.user?.has_customer_access,
        subscriptionTier: userData.user?.subscription_tier
      })
      
      if (!userData.authenticated) {
        setError('Please log in to access customer management.')
        setCustomers([])
        setFilteredCustomers([])
        setLoading(false)
        return
      }
      
      if (!userData.user?.barbershop_id) {
        setError('🏪 Barbershop setup incomplete. Your profile needs to be associated with a barbershop. Please contact support or try refreshing the page.')
        setCustomers([])
        setFilteredCustomers([])
        setLoading(false)
        return
      }
      
      if (!userData.user?.has_customer_access) {
        const subscriptionTier = userData.user?.subscription_tier || 'individual'
        if (subscriptionTier === 'individual') {
          setError('Customer management is included with your subscription. Please contact support if you\'re seeing this message.')
        } else {
          setError('Customer management access not enabled. Please ask your shop owner to grant customer management permissions in Staff Settings.')
        }
        setCustomers([])
        setFilteredCustomers([])
        setLoading(false)
        return
      }
      
      console.log('📞 Fetching customers for barbershop:', userData.user.barbershop_id)
      
      const response = await fetch(`/api/customers?limit=100&barbershop_id=${userData.user.barbershop_id}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      console.log('✅ Customer data received:', {
        count: data.customers?.length || 0,
        total: data.total
      })
      
      const formattedCustomers = formatCustomerData(data.customers || [], userData.user.barbershop_id)
      setCustomers(formattedCustomers)
      setFilteredCustomers(formattedCustomers)
      
      if (formattedCustomers.length === 0) {
        console.log('📝 No customers found - this is normal for new barbershops')
      }
      
    } catch (err) {
      console.error('❌ Error fetching customers:', err)
      setError(`Failed to load customers: ${err.message}. Please try refreshing the page.`)
      setCustomers([])
      setFilteredCustomers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Handle URL parameters for auto-opening import modal
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'import') {
      setShowImportModal(true)
      // Clean up URL after opening modal
      const url = new URL(window.location)
      url.searchParams.delete('action')
      window.history.replaceState({}, '', url)
    }
  }, [searchParams])

  // Advanced search and filtering with fuzzy matching
  useEffect(() => {
    let results = customers

    // Apply fuzzy search if there's a search term
    if (searchTerm && searchTerm.trim().length > 0) {
      const fuzzyResults = fuzzySearch(customers, searchTerm, { minScore: 0.2 })
      results = fuzzyResults.map(result => result.item)
      setSearchResults(fuzzyResults)
      
      // Add to search history
      if (searchTerm.length >= 2 && !searchHistory.includes(searchTerm)) {
        setSearchHistory(prev => [searchTerm, ...prev.slice(0, 9)]) // Keep last 10 searches
      }
    } else {
      setSearchResults([])
    }

    // Apply segment filter
    if (selectedSegment !== 'all') {
      results = results.filter(customer => customer.segment === selectedSegment)
    }

    // Apply advanced filters
    Object.entries(activeFilters).forEach(([filterKey, filterValue]) => {
      if (filterValue && filterValue.active) {
        results = results.filter(customer => {
          switch (filterKey) {
            case 'spendingRange':
              return customer.totalSpent >= filterValue.min && customer.totalSpent <= filterValue.max
            case 'visitCountRange':
              return customer.totalVisits >= filterValue.min && customer.totalVisits <= filterValue.max
            case 'dateRange':
              const customerDate = new Date(customer.joinDate || customer.created_at)
              return customerDate >= new Date(filterValue.start) && customerDate <= new Date(filterValue.end)
            case 'tags':
              return filterValue.values.some(tag => customer.tags?.includes(tag))
            case 'isVip':
              return customer.isVip === filterValue.value
            default:
              return true
          }
        })
      }
    })

    // Apply sorting
    if (sortConfig.key) {
      results.sort((a, b) => {
        const aValue = a[sortConfig.key] || ''
        const bValue = b[sortConfig.key] || ''
        
        let comparison = 0
        if (typeof aValue === 'string') {
          comparison = aValue.localeCompare(bValue)
        } else {
          comparison = aValue - bValue
        }
        
        return sortConfig.direction === 'desc' ? -comparison : comparison
      })
    }
    
    setFilteredCustomers(results)
  }, [customers, searchTerm, selectedSegment, activeFilters, sortConfig, searchHistory])

  const getSegmentColor = (segment) => {
    switch (segment) {
      case 'vip': return 'bg-gold-100 text-gold-800'
      case 'regular': return 'bg-olive-100 text-olive-800'
      case 'new': return 'bg-moss-100 text-moss-900'
      case 'lapsed': return 'bg-softred-100 text-softred-900'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'vip':
        return 'bg-gold-100 text-gold-800'
      case 'active':
        return 'bg-moss-100 text-moss-900'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const tabs = [
    {
      id: 'intelligence',
      label: 'Intelligence Dashboard',
      icon: ChartBarIcon,
      component: <CustomerIntelligenceDashboardOptimized />
    },
    {
      id: 'customers',
      label: 'Customer List',
      icon: UsersIcon,
      component: null // Handled separately
    },
    {
      id: 'badges',
      label: 'Achievement Badges',
      icon: SparklesIcon,
      component: null // Handled separately for badge system
    },
    {
      id: 'segments',
      label: 'Segment Builder',
      icon: FunnelIcon,
      component: <SegmentBuilder />
    },
    {
      id: 'churn',
      label: 'Churn Monitor',
      icon: ExclamationTriangleIcon,
      component: <ChurnRiskMonitor />
    }
  ]

  const getContactIcon = (type) => {
    switch (type) {
      case 'email': return <EnvelopeIcon className="h-4 w-4" />
      case 'sms': return <PhoneIcon className="h-4 w-4" />
      case 'phone': return <PhoneIcon className="h-4 w-4" />
      default: return <EnvelopeIcon className="h-4 w-4" />
    }
  }

  // Advanced search and filter handlers
  const handleAdvancedSearch = (filters) => {
    setActiveFilters(filters)
    setShowAdvancedSearch(false)
  }

  const handleFilterChange = (filterKey, filterValue) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: filterValue
    }))
  }

  const handleRemoveFilter = (filterKey) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[filterKey]
      return newFilters
    })
  }

  const handleClearAllFilters = () => {
    setActiveFilters({})
    setSearchTerm('')
    setSelectedSegment('all')
  }

  const handleSortChange = (key, direction) => {
    setSortConfig({ key, direction })
  }

  const handleSearchSuggestionSelect = (suggestion) => {
    setSearchTerm(suggestion.value)
    setShowSearchSuggestions(false)
  }

  const handleExportCustomers = (selectedFields, options) => {
    // Export logic will be handled by the ExportCSV component
    console.log('Exporting customers with fields:', selectedFields, 'and options:', options)
  }

  const addCustomer = async (customerData) => {
    try {
      // Get barbershop_id from user context
      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()
      
      if (!userData.user?.barbershop_id) {
        throw new Error('Please complete your barbershop setup first. Go to Settings > Barbershop Setup to get started.')
      }
      
      if (!userData.user?.has_customer_access) {
        const subscriptionTier = userData.user?.subscription_tier || 'individual'
        if (subscriptionTier === 'individual') {
          throw new Error('Customer management is included with your subscription. Please contact support if you\'re seeing this message.')
        } else {
          throw new Error('Customer management access not enabled. Please ask your shop owner to grant customer management permissions in Staff Settings.')
        }
      }

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id: userData.user.barbershop_id,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          notes: customerData.notes,
          notification_preferences: {
            preferred_method: customerData.preferredContact,
            sms: customerData.preferredContact === 'sms',
            email: customerData.preferredContact === 'email',
            reminders: true,
            confirmations: true
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add customer')
      }

      await fetchCustomers()
      
      setShowAddModal(false)
      setNotification({
        type: 'success',
        message: 'Customer added successfully!'
      })
      setTimeout(() => setNotification(null), 3000)
      
    } catch (err) {
      console.error('Error adding customer:', err)
      setNotification({
        type: 'error',
        message: err.message || 'Failed to add customer. Please try again.'
      })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleEditCustomer = async (customerId) => {
    const customer = customers.find(c => c.id === customerId)
    if (!customer) return

    const newName = prompt('Edit customer name:', customer.name)
    if (!newName || newName === customer.name) return

    try {
      const response = await fetch('/api/customers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: customerId,
          name: newName
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update customer')
      }

      await fetchCustomers()
      
      setNotification({
        type: 'success',
        message: 'Customer updated successfully!'
      })
      setTimeout(() => setNotification(null), 3000)
      
    } catch (err) {
      console.error('Error updating customer:', err)
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update customer. Please try again.'
      })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleDeleteCustomer = async (customerId) => {
    const customer = customers.find(c => c.id === customerId)
    if (!customer) return
    
    if (!window.confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: customerId,
          is_active: false
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete customer')
      }

      await fetchCustomers()
      
      setNotification({
        type: 'success',
        message: `${customer.name} has been removed from your customer database.`
      })
      setTimeout(() => setNotification(null), 3000)
      
    } catch (err) {
      console.error('Error deleting customer:', err)
      setNotification({
        type: 'error',
        message: err.message || 'Failed to delete customer. Please try again.'
      })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  // Render badges content
  const renderBadgesContent = () => {
    if (badgeView === 'customer-specific' && selectedCustomerForBadges) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Badges for {selectedCustomerForBadges.name}
              </h3>
              <p className="text-gray-600">Track achievement progress and earned badges</p>
            </div>
            <button
              onClick={() => {
                setBadgeView('overview')
                setSelectedCustomerForBadges(null)
              }}
              className="btn-secondary"
            >
              Back to Overview
            </button>
          </div>

          <AchievementBadges
            customerId={selectedCustomerForBadges.id}
            barbershopId="demo-barbershop"
            showProgress={true}
            autoRefresh={true}
            onBadgeUnlock={(badges) => {
              showNotification(`🎉 ${selectedCustomerForBadges.name} earned ${badges.length} new badge(s)!`, 'success')
            }}
          />

          <BadgeProgress
            customerId={selectedCustomerForBadges.id}
            barbershopId="demo-barbershop"
            showQuickActions={true}
            onProgressUpdate={(data) => {
              console.log('Badge progress updated:', data)
            }}
          />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Badges Overview Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Achievement Badges System</h3>
          <p className="text-gray-600">
            Gamify customer experience with achievement badges. Track customer milestones, spending levels, and special achievements.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setBadgeView('overview')}
            className={`pb-2 px-1 text-sm font-medium ${
              badgeView === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            System Overview
          </button>
          <button
            onClick={() => setBadgeView('leaderboard')}
            className={`pb-2 px-1 text-sm font-medium ${
              badgeView === 'leaderboard'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Leaderboard
          </button>
        </div>

        {badgeView === 'overview' && (
          <div className="space-y-6">
            {/* Badge System Statistics */}
            {customers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <SparklesIcon className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Active Badges</p>
                      <p className="text-2xl font-semibold text-gray-900">20</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <StarIcon className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Total Earned</p>
                      <p className="text-2xl font-semibold text-gray-900">157</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <UsersIcon className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Participating</p>
                      <p className="text-2xl font-semibold text-gray-900">{customers.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-8 w-8 text-orange-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-600">Avg Progress</p>
                      <p className="text-2xl font-semibold text-gray-900">72%</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="max-w-lg mx-auto">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center">
                    <SparklesIcon className="h-12 w-12 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Achievement System Ready!
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    Your badge system is set up and ready to gamify the customer experience. 
                    Add customers to start tracking achievements and milestones.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <div className="text-2xl mb-2">🎯</div>
                      <div className="text-sm font-medium text-blue-800">First Visit</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <div className="text-2xl mb-2">⭐</div>
                      <div className="text-sm font-medium text-green-800">Loyal Client</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <div className="text-2xl mb-2">👑</div>
                      <div className="text-sm font-medium text-purple-800">VIP Status</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                      <div className="text-2xl mb-2">💎</div>
                      <div className="text-sm font-medium text-orange-800">Top Spender</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Start Gamification Journey
                  </button>
                </div>
              </div>
            )}

            {/* Customer List with Badge Summary */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900">Customer Badge Progress</h4>
                <p className="text-sm text-gray-600">Click on a customer to view detailed badge progress</p>
              </div>
              <div className="divide-y divide-gray-200">
                {customers.slice(0, 10).map((customer) => (
                  <div
                    key={customer.id}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedCustomerForBadges(customer)
                      setBadgeView('customer-specific')
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UserIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">
                            {customer.totalVisits} visits • {customer.segment}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {Math.floor(Math.random() * 8) + 1} badges
                          </div>
                          <div className="text-sm text-gray-500">
                            {Math.floor(Math.random() * 500) + 100} points
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          {['🎯', '⭐', '👑', '💎'].slice(0, Math.floor(Math.random() * 4) + 1).map((icon, index) => (
                            <span key={index} className="text-lg">{icon}</span>
                          ))}
                        </div>
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {badgeView === 'leaderboard' && (
          <BadgeLeaderboard
            barbershopId="demo-barbershop"
            showFilters={true}
            showStatistics={true}
            allowSharing={true}
            onCustomerSelect={(customer) => {
              const customerData = customers.find(c => c.id === customer.customer_id)
              if (customerData) {
                setSelectedCustomerForBadges(customerData)
                setBadgeView('customer-specific')
              }
            }}
          />
        )}
      </div>
    )
  }

  const renderCustomersList = () => (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-olive-50 text-olive-800 border border-olive-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Directory</h2>
          <p className="text-gray-600">Manage your customer database and contact preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchCustomers}
            className="btn-secondary flex items-center space-x-2"
            disabled={loading}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
            data-testid="add-customer-btn"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Unable to load customer data</p>
              <p className="text-sm mt-1">{error}</p>
              <div className="mt-3 flex space-x-3">
                <button 
                  onClick={fetchCustomers}
                  className="text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded border border-red-300 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Retrying...' : 'Try Again'}
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-sm text-red-600 hover:text-red-800 underline hover:no-underline"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-olive-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <StarIcon className="h-8 w-8 text-gold-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">VIP Customers</p>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.segment === 'vip').length}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Customers</p>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.segment === 'new').length}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 font-bold">!</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Lapsed</p>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.segment === 'lapsed').length}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Search and Filter System */}
      <AnimatedContainer animation="slideInFromTop" className="space-y-4 mb-6">
        {/* Main Search Bar with Suggestions */}
        <div className="card">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input with Suggestions */}
            <div className="flex-1 relative">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers with smart suggestions..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowSearchSuggestions(e.target.value.length >= 2)
                  }}
                  onFocus={() => setShowSearchSuggestions(searchTerm.length >= 2)}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                  className="input-field pl-10 pr-20"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setShowSearchSuggestions(false)
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Search Suggestions */}
              {showSearchSuggestions && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1">
                  <SearchSuggestions
                    customers={customers}
                    searchQuery={searchTerm}
                    searchHistory={searchHistory}
                    onSuggestionSelect={handleSearchSuggestionSelect}
                    maxSuggestions={8}
                  />
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className={`btn-secondary flex items-center space-x-2 ${showAdvancedSearch ? 'bg-olive-100 text-olive-700' : ''}`}
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                <span>Advanced</span>
              </button>
              
              <SortOptions
                currentSort={sortConfig}
                onSortChange={handleSortChange}
                variant="dropdown"
              />
              
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-secondary flex items-center space-x-2"
                title="Import customers from CSV file"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <span>Import</span>
              </button>
              
              <ExportCSV
                customers={filteredCustomers}
                onExport={handleExportCustomers}
                filename={`customers-${new Date().toISOString().split('T')[0]}`}
              />
            </div>
          </div>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <AnimatedContainer animation="slideInFromTop" className="card">
            <AdvancedSearchFilter
              customers={customers}
              onFiltersChange={handleAdvancedSearch}
              initialFilters={activeFilters}
              availableSegments={['all', 'vip', 'regular', 'new', 'lapsed']}
              selectedSegment={selectedSegment}
              onSegmentChange={setSelectedSegment}
            />
          </AnimatedContainer>
        )}

        {/* Active Filter Tags */}
        {(Object.keys(activeFilters).length > 0 || searchTerm || selectedSegment !== 'all') && (
          <AnimatedContainer animation="slideInFromLeft">
            <FilterTags
              searchTerm={searchTerm}
              selectedSegment={selectedSegment}
              activeFilters={activeFilters}
              onRemoveFilter={handleRemoveFilter}
              onClearSearch={() => setSearchTerm('')}
              onClearSegment={() => setSelectedSegment('all')}
              onClearAll={handleClearAllFilters}
              totalResults={filteredCustomers.length}
              totalCustomers={customers.length}
            />
          </AnimatedContainer>
        )}
      </AnimatedContainer>

      {/* Customer List */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-flex items-center space-x-2">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />
            <span className="text-gray-500">Loading customers...</span>
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-8 text-center">
          <UserIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 font-medium">
            {searchTerm || selectedSegment !== 'all' 
              ? 'No customers match your filters' 
              : 'No customers yet'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {searchTerm || selectedSegment !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Add your first customer to start building your client database'}
          </p>
          {!searchTerm && selectedSegment === 'all' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 btn-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Your First Customer
            </button>
          )}
        </div>
      ) : (
        <StaggeredList 
          animation="slideInFromLeft" 
          staggerDelay={50}
          className="grid gap-4"
        >
          {filteredCustomers.map((customer, index) => {
            // Find the search result for this customer to get match information
            const searchResult = searchResults.find(r => r.item.id === customer.id)
            const hasMatches = searchTerm && searchResult && searchResult.matches.length > 0
            
            return (
              <div
                key={customer.id}
                className={`border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-all duration-200 hover:shadow-md ${
                  hasMatches ? 'ring-2 ring-olive-200 bg-olive-50/30' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {searchTerm ? (
                            <SearchHighlight 
                              text={customer.name}
                              searchQuery={searchTerm}
                              highlightColor="blue"
                              highlightStyle="background"
                            />
                          ) : (
                            customer.name
                          )}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSegmentColor(customer.segment)}`}>
                          {customer.segment === 'vip' ? 'VIP' : customer.segment.toUpperCase()}
                        </span>
                        {hasMatches && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-olive-100 text-olive-700">
                            <SparklesIcon className="h-3 w-3 mr-1" />
                            Match
                          </span>
                        )}
                      </div>
                      
                      {/* Loyalty Points Badge */}
                      <div className="mb-2">
                        <LoyaltyPointsBadge 
                          customerId={customer.id}
                          barbershopId={customer.barbershopId}
                          size="default"
                          showProgress={true}
                        />
                      </div>
                      
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-1" />
                          {searchTerm ? (
                            <SearchHighlight 
                              text={customer.email}
                              searchQuery={searchTerm}
                              highlightColor="green"
                              highlightStyle="underline"
                            />
                          ) : (
                            customer.email
                          )}
                        </span>
                        <span className="flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-1" />
                          {searchTerm ? (
                            <SearchHighlight 
                              text={customer.phone}
                              searchQuery={searchTerm}
                              highlightColor="orange"
                              highlightStyle="background"
                            />
                          ) : (
                            customer.phone
                          )}
                        </span>
                      </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span>Visits: {customer.totalVisits}</span>
                      <span>Spent: ${customer.totalSpent}</span>
                      <span>Last visit: {customer.lastVisit || 'Never'}</span>
                      <QuickRedeemButton 
                        customerId={customer.id}
                        barbershopId={customer.barbershopId}
                      />
                    </div>
                    
                    {/* Notes with highlighting */}
                    {customer.notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-gray-700">Notes: </span>
                          {searchTerm ? (
                            <SearchHighlight 
                              text={customer.notes}
                              searchQuery={searchTerm}
                              highlightColor="yellow"
                              highlightStyle="background"
                              maxLength={150}
                            />
                          ) : (
                            customer.notes.length > 150 
                              ? `${customer.notes.substring(0, 150)}...` 
                              : customer.notes
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <SmartRebookButton 
                    customer={{
                      ...customer,
                      last_visit: customer.lastVisit === 'Never' ? null : new Date(customer.lastVisit).toISOString(),
                      total_visits: customer.totalVisits,
                      total_spent: customer.totalSpent,
                      vip_status: customer.isVip
                    }}
                    onRebook={(id) => {
                      console.log('Rebook initiated for customer:', id)
                      fetchCustomers()
                    }}
                  />
                  <button
                    onClick={() => setSelectedCustomer(customer.id)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    <EyeIcon className="h-4 w-4 mr-1 inline" />
                    Profile
                  </button>
                  <button
                    onClick={() => setSelectedJourneyCustomer(customer.id)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Journey
                  </button>
                </div>
              </div>
            </div>
            )
          })}
        </StaggeredList>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      // Update URL without causing a page refresh
                      const url = new URL(window.location)
                      url.searchParams.set('tab', tab.id)
                      window.history.pushState({}, '', url)
                    }}
                    className={`py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-olive-500 text-olive-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow rounded-lg p-6">
          {activeTab === 'customers' ? renderCustomersList() :
           activeTab === 'badges' ? renderBadgesContent() :
           tabs.find(tab => tab.id === activeTab)?.component}
        </div>

        {/* Customer Profile Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-6xl w-full max-h-full overflow-y-auto">
              <CustomerProfileEnhanced
                customerId={selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
              />
            </div>
          </div>
        )}

        {/* Customer Journey Modal */}
        {selectedJourneyCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-6xl w-full max-h-full overflow-y-auto">
              <div className="bg-white rounded-lg shadow-lg">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Customer Journey</h2>
                  <button
                    onClick={() => setSelectedJourneyCustomer(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6">
                  <CustomerJourneyVisualizer customerId={selectedJourneyCustomer} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Customer Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Customer</h3>
              
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                addCustomer({
                  name: formData.get('name'),
                  email: formData.get('email'),
                  phone: formData.get('phone'),
                  preferredContact: formData.get('preferredContact'),
                  notes: formData.get('notes')
                })
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Contact
                    </label>
                    <select name="preferredContact" className="input-field">
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      rows="3"
                      className="input-field"
                      placeholder="Any special notes about this customer..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Customer Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Import Company Customers</h2>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Import customer data for company-wide analytics and management
                </p>
              </div>
              <div className="p-6">
                <PlatformTailoredImport
                  onComplete={(importData) => {
                    console.log('Company-wide import completed:', importData)
                    if (!importData.skipped) {
                      setNotification({
                        type: 'success',
                        message: `Successfully imported ${importData.imported_count || 0} customers!`
                      })
                      setTimeout(() => setNotification(null), 5000)
                      fetchCustomers() // Reload the customer list
                    }
                    setShowImportModal(false)
                  }}
                  profile={{
                    barbershop_id: customers.length > 0 ? customers[0].barbershopId : null
                  }}
                  initialData={{}}
                  context="company-wide"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}