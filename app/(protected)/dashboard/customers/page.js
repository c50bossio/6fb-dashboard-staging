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
  ChartBarIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  XMarkIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useSearchParams } from 'next/navigation'
import React, { useState, useEffect, Suspense, useMemo } from 'react'
import { toast } from 'react-hot-toast'

import { CustomersHeader } from '@/components/layout/UnifiedDashboardHeader'
import { useBusinessContext } from '@/hooks/useBusinessContext'
import { 
  useCustomers, 
  useCustomerSearch, 
  useCustomersWithRealtime,
  useCreateCustomer,
  useUpdateCustomer,
  useCustomerCount,
  useAllCustomers,
  useCustomerLoyaltyStats
} from '@/hooks/useCustomersQuery'
import { isTier } from '@/lib/subscription-tiers'
import { 
  CustomerIntelligenceDashboard,
  CustomerJourneyVisualizer, 
  SegmentBuilder, 
  CustomerProfileEnhanced, 
  ChurnRiskMonitor,
  AchievementBadges,
  BadgeProgress,
  BadgeLeaderboard
} from '../../../../components/customers'
import AdvancedSearchFilter from '../../../../components/customers/AdvancedSearchFilter'
import ExportCSV from '../../../../components/customers/ExportCSV'
import FilterTags from '../../../../components/customers/FilterTags'
import LoyaltyPointsBadge, { QuickRedeemButton } from '../../../../components/customers/LoyaltyPointsBadge'
import SearchHighlight from '../../../../components/customers/SearchHighlight'
import SearchSuggestions from '../../../../components/customers/SearchSuggestions'
import SmartRebookButton from '../../../../components/customers/SmartRebookButton'
import SortOptions from '../../../../components/customers/SortOptions'
import PlatformTailoredImport from '../../../../components/onboarding/PlatformTailoredImport'
import { AnimatedContainer, StaggeredList } from '../../../../utils/animations'
import { fuzzySearch } from '../../../../utils/fuzzySearch'

// React Query hooks

function CustomersPageContent() {
  const searchParams = useSearchParams()
  
  // React Query hooks for business context and permissions
  const { businessContext, barbershopId, isLoading: contextLoading, error: contextError } = useBusinessContext()
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSegment, setSelectedSegment] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedCustomerForBadges, setSelectedCustomerForBadges] = useState(null)
  const [badgeView, setBadgeView] = useState('overview') // overview, customer-specific, leaderboard
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'intelligence')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedJourneyCustomer, setSelectedJourneyCustomer] = useState(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)
  
  // Advanced search and filtering state
  const [activeFilters, setActiveFilters] = useState({})
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' })
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  
  // React Query hooks for customer data
  const { 
    data: customersData, 
    isLoading: customersLoading, 
    error: customersError,
    refetch: refetchCustomers,
    isFetching: customersFetching,
    isPlaceholderData
  } = useCustomersWithRealtime(barbershopId, {
    limit: pageSize,
    offset: currentPage * pageSize,
    enabled: !!barbershopId && businessContext?.canManageAppointments()
  })
  
  // Search hook with debouncing
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError
  } = useCustomerSearch(barbershopId, searchTerm, 300)
  
  // All customers for export and advanced operations
  const {
    data: allCustomers,
    refetch: refetchAllCustomers
  } = useAllCustomers(barbershopId)
  
  // Customer count for stats
  const {
    data: customerCount = 0
  } = useCustomerCount(barbershopId)
  
  // Loyalty stats
  const {
    data: loyaltyStats
  } = useCustomerLoyaltyStats(barbershopId)
  
  // Mutations with optimistic updates
  const createCustomerMutation = useCreateCustomer()
  const updateCustomerMutation = useUpdateCustomer()
  
  // Track mutation states for better UX
  const isMutating = createCustomerMutation.isPending || updateCustomerMutation.isPending

  // Data processing utilities
  const calculateSegment = (customer) => {
    const daysSinceLastVisit = customer.last_visit_at 
      ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
      : null
    
    if (customer.vip_status || customer.total_visits >= 10) return 'vip'
    if (daysSinceLastVisit && daysSinceLastVisit > 60) return 'lapsed'
    if (customer.total_visits === 0 || customer.total_visits === 1) return 'new'
    return 'regular'
  }

  const formatCustomerData = (apiCustomers) => {
    if (!apiCustomers) return []
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
      barbershopId: customer.barbershop_id || barbershopId,
      loyaltyPoints: customer.loyalty_points || 0
    }))
  }
  
  // Processed customer data with memoization for performance
  const customers = useMemo(() => {
    return formatCustomerData(customersData)
  }, [customersData, barbershopId])

  // Determine loading and error states
  const isLoadingState = contextLoading || customersLoading || isMutating
  const isFetching = customersFetching || searchLoading
  const error = contextError || customersError || searchError
  
  // Permission checks
  const canManageCustomers = businessContext?.canManageAppointments() || false
  const hasCustomerAccess = canManageCustomers && !!barbershopId
  
  // Error messages based on context
  const getContextError = () => {
    if (!businessContext) return null
    if (!barbershopId) {
      return '🏪 Barbershop setup incomplete. Your profile needs to be associated with a barbershop. Please contact support or try refreshing the page.'
    }
    if (!canManageCustomers) {
      const role = businessContext?.role || 'unknown'
      if (role === 'CLIENT') {
        return 'Customer management is included with your subscription. Please contact support if you\'re seeing this message.'
      } else {
        return 'Customer management access not enabled. Please ask your shop owner to grant customer management permissions in Staff Settings.'
      }
    }
    return null
  }
  
  const contextErrorMessage = getContextError()
  const finalError = contextErrorMessage || (error?.message || error)

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

  // Determine which data source to use
  // When searching, use React Query's debounced search results for better performance
  // Otherwise use the paginated customers from the main query
  const customerDataSource = searchTerm && searchTerm.length >= 2 ? searchResults : customers
  
  // Advanced search and filtering with memoization for performance
  const filteredCustomers = useMemo(() => {
    let results = customerDataSource || []
    
    // Add to search history if we have a meaningful search term
    if (searchTerm && searchTerm.length >= 2 && !searchHistory.includes(searchTerm)) {
      setSearchHistory(prev => [searchTerm, ...prev.slice(0, 9)]) // Keep last 10 searches
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
    
    return results
  }, [customerDataSource, searchTerm, selectedSegment, activeFilters, sortConfig, searchHistory])
  
  // Compute fuzzy search results for highlighting when searching
  const fuzzySearchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return []
    return fuzzySearch(customers, searchTerm, { minScore: 0.2 })
  }, [customers, searchTerm])

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
      component: () => <CustomerIntelligenceDashboard />
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
    // The component now receives the allCustomers data for export
    toast.success('Export initiated! Check your downloads folder.')
  }

  // Customer CRUD operations using React Query mutations
  const addCustomer = async (customerData) => {
    if (!barbershopId) {
      toast.error('Please complete your barbershop setup first. Go to Settings > Barbershop Setup to get started.')
      return
    }
    
    if (!canManageCustomers) {
      const role = businessContext?.role || 'unknown'
      if (role === 'CLIENT') {
        toast.error('Customer management is included with your subscription. Please contact support if you\'re seeing this message.')
      } else {
        toast.error('Customer management access not enabled. Please ask your shop owner to grant customer management permissions in Staff Settings.')
      }
      return
    }

    try {
      await createCustomerMutation.mutateAsync({
        barbershop_id: barbershopId,
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
      
      setShowAddModal(false)
    } catch (err) {
      console.error('Error adding customer:', err)
      // Error handling is already done by the mutation hook
    }
  }

  const handleEditCustomer = async (customerId) => {
    const customer = customers.find(c => c.id === customerId)
    if (!customer) return

    const newName = prompt('Edit customer name:', customer.name)
    if (!newName || newName === customer.name) return

    try {
      await updateCustomerMutation.mutateAsync({
        customerId,
        updates: { name: newName }
      })
    } catch (err) {
      console.error('Error updating customer:', err)
      // Error handling is already done by the mutation hook
    }
  }

  const handleDeleteCustomer = async (customerId) => {
    const customer = customers.find(c => c.id === customerId)
    if (!customer) return
    
    if (!window.confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
      return
    }

    try {
      await updateCustomerMutation.mutateAsync({
        customerId,
        updates: { is_active: false }
      })
      
      toast.success(`${customer.name} has been removed from your customer database.`)
    } catch (err) {
      console.error('Error deleting customer:', err)
      // Error handling is already done by the mutation hook
    }
  }

  // Render badges content
  const renderBadgesContent = () => {
    if (badgeView === 'customer-specific' && selectedCustomerForBadges) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Badges for {selectedCustomerForBadges.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">Track achievement progress and earned badges</p>
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

            }}
          />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Badges Overview Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Achievement Badges System</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Gamify customer experience with achievement badges. Track customer milestones, spending levels, and special achievements.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setBadgeView('overview')}
            className={`pb-2 px-1 text-sm font-medium ${
              badgeView === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            System Overview
          </button>
          <button
            onClick={() => setBadgeView('leaderboard')}
            className={`pb-2 px-1 text-sm font-medium ${
              badgeView === 'leaderboard'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <SparklesIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Active Badges</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">20</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <StarIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Earned</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">157</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <UsersIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Participating</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{customers.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Avg Progress</p>
                      <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">72%</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="max-w-lg mx-auto">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                    <SparklesIcon className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                    Achievement System Ready!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                    Your badge system is set up and ready to gamify the customer experience.
                    Add customers to start tracking achievements and milestones.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg">
                      <div className="text-2xl mb-2">🎯</div>
                      <div className="text-sm font-medium text-blue-800 dark:text-blue-300">First Visit</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg">
                      <div className="text-2xl mb-2">⭐</div>
                      <div className="text-sm font-medium text-green-800 dark:text-green-300">Loyal Client</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg">
                      <div className="text-2xl mb-2">👑</div>
                      <div className="text-sm font-medium text-purple-800 dark:text-purple-300">VIP Status</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg">
                      <div className="text-2xl mb-2">💎</div>
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-300">Top Spender</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-8 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Start Gamification Journey
                  </button>
                </div>
              </div>
            )}

            {/* Customer List with Badge Summary */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Customer Badge Progress</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Click on a customer to view detailed badge progress</p>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {customers.slice(0, 10).map((customer) => (
                  <div
                    key={customer.id}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                    onClick={() => {
                      setSelectedCustomerForBadges(customer)
                      setBadgeView('customer-specific')
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <UserIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{customer.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {customer.totalVisits} visits • {customer.segment}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {Math.floor(Math.random() * 8) + 1} badges
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {Math.floor(Math.random() * 500) + 100} points
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          {['🎯', '⭐', '👑', '💎'].slice(0, Math.floor(Math.random() * 4) + 1).map((icon, index) => (
                            <span key={index} className="text-lg">{icon}</span>
                          ))}
                        </div>
                        <EyeIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
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
      {/* No notification div needed - using react-hot-toast */}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customer Directory</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your customer database and contact preferences</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              refetchCustomers()
              toast.success('Refreshing customer data...')
            }}
            className="btn-secondary flex items-center space-x-2"
            disabled={isLoadingState || isFetching}
          >
            <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
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
      {finalError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-400">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Unable to load customer data</p>
              <p className="text-sm mt-1">{finalError}</p>
              <div className="mt-3 flex space-x-3">
                <button
                  onClick={() => refetchCustomers()}
                  className="text-sm bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 px-3 py-1 rounded border border-red-300 dark:border-red-700 transition-colors"
                  disabled={isLoadingState || isFetching}
                >
                  {isFetching ? 'Retrying...' : 'Try Again'}
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 underline hover:no-underline"
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
            <UserIcon className="h-8 w-8 text-olive-600 dark:text-olive-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
              {isLoadingState ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customerCount}</p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <StarIcon className="h-8 w-8 text-gold-600 dark:text-gold-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">VIP Customers</p>
              {isLoadingState ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {customers.filter(c => c.segment === 'vip').length}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New Customers</p>
              {isLoadingState ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {customers.filter(c => c.segment === 'new').length}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400 font-bold">!</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Lapsed</p>
              {isLoadingState ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search customers with smart suggestions..."
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearchTerm(value)
                    setShowSearchSuggestions(value.length >= 2)

                    // Reset pagination when searching
                    if (value.length >= 2) {
                      setCurrentPage(0)
                    }
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
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
                customers={allCustomers || filteredCustomers}
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
      {isLoadingState ? (
        <div className="space-y-4">
          {/* Skeleton loading for customer cards */}
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse bg-white dark:bg-gray-800">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="flex space-x-4">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                  <div className="flex space-x-4">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-8 text-center">
          <UserIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {searchTerm || selectedSegment !== 'all'
              ? 'No customers match your filters'
              : 'No customers yet'}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
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
        <div className="relative">
          {/* Background fetch indicator */}
          {isFetching && !isLoadingState && (
            <div className="absolute top-0 right-0 z-10">
              <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Updating...</span>
              </div>
            </div>
          )}
          
          <StaggeredList 
            animation="slideInFromLeft" 
            staggerDelay={50}
            className="grid gap-4"
          >
            {filteredCustomers.map((customer, index) => {
            // Find the search result for this customer to get match information
            const searchResult = fuzzySearchResults.find(r => r.item.id === customer.id)
            const hasMatches = searchTerm && searchResult && searchResult.matches.length > 0
            
            return (
              <div
                key={customer.id}
                className={`border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200 hover:shadow-md ${
                  hasMatches ? 'ring-2 ring-olive-200 dark:ring-olive-700 bg-olive-50/30 dark:bg-olive-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
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
                      
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
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
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
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
                      <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Notes: </span>
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
                      // Optimistic update will be handled by the mutation
                      refetchCustomers()
                    }}
                  />
                  <button
                    onClick={() => setSelectedCustomer(customer.id)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    <EyeIcon className="h-4 w-4 mr-1 inline" />
                    Profile
                  </button>
                  <button
                    onClick={() => setSelectedJourneyCustomer(customer.id)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    Journey
                  </button>
                </div>
              </div>
            </div>
            )
            })}
          </StaggeredList>
        
        {/* Pagination */}
        {!searchTerm && customersData && customersData.length >= pageSize && (
          <div className="mt-8 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span>
                Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, customerCount)} of {customerCount} customers
                {isPlaceholderData && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">(loading newer data...)</span>
                )}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(0, page - 1))}
                disabled={currentPage === 0 || isFetching}
                className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage + 1}
              </span>
              <button
                onClick={() => setCurrentPage(page => page + 1)}
                disabled={(customersData?.length || 0) < pageSize || isFetching}
                className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Unified Context Header */}
      <CustomersHeader>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetchCustomers()}
            className="btn-secondary flex items-center space-x-2"
            disabled={isLoadingState || isFetching}
          >
            <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
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
      </CustomersHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
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
                        ? 'border-olive-500 text-olive-600 dark:text-olive-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          {activeTab === 'customers' ? renderCustomersList() :
           activeTab === 'badges' ? renderBadgesContent() :
           tabs.find(tab => tab.id === activeTab)?.component?.()}
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Customer Journey</h2>
                  <button
                    onClick={() => setSelectedJourneyCustomer(null)}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Add New Customer</h3>

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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Preferred Contact
                    </label>
                    <select name="preferredContact" className="input-field">
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Import Company Customers</h2>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Import customer data for company-wide analytics and management
                </p>
              </div>
              <div className="p-6">
                <PlatformTailoredImport
                  onComplete={(importData) => {
                    if (!importData.skipped) {
                      toast.success(`Successfully imported ${importData.imported_count || 0} customers!`)
                      refetchCustomers() // Reload the customer list
                      refetchAllCustomers() // Also refresh the all customers cache
                    }
                    setShowImportModal(false)
                  }}
                  profile={{
                    barbershop_id: barbershopId
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

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CustomersPageContent />
    </Suspense>
  )
}