'use client'

import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  StarIcon,
  StarIcon as StarIconSolid,
  PencilSquareIcon,
  TrashIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  CheckIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline'

import { useState, useEffect } from 'react'

import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { useGlobalDashboard } from '../../../../contexts/GlobalDashboardContext'

const SEGMENTS = {
  vip: { name: 'VIP', color: 'purple', minVisits: 10 },
  regular: { name: 'Regular', color: 'blue', minVisits: 5 },
  new: { name: 'New', color: 'green', minVisits: 0 },
  inactive: { name: 'Inactive', color: 'gray', daysInactive: 60 }
}

// Static Tailwind class mappings (required for JIT compilation)
const SEGMENT_STYLES = {
  vip: {
    badge: 'bg-purple-100 text-purple-800',
    button: 'bg-purple-600 text-white',
    buttonHover: 'hover:bg-purple-200'
  },
  regular: {
    badge: 'bg-blue-100 text-blue-800',
    button: 'bg-blue-600 text-white',
    buttonHover: 'hover:bg-blue-200'
  },
  new: {
    badge: 'bg-green-100 text-green-800',
    button: 'bg-green-600 text-white',
    buttonHover: 'hover:bg-green-200'
  },
  inactive: {
    badge: 'bg-gray-100 text-gray-800',
    button: 'bg-gray-600 text-white',
    buttonHover: 'hover:bg-gray-200'
  }
}

export default function CustomersEnhancedPage() {
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSegment, setSelectedSegment] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [viewMode, setViewMode] = useState('table') // 'cards' or 'table'
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    newThisMonth: 0,
    vipCount: 0,
    averageSpent: 0
  })

  const { user: _user } = useAuth()
  const _supabase = createClient()
  const { currentLocationId } = useGlobalDashboard()
  const [error, setError] = useState(null)

  useEffect(() => {
    if (currentLocationId) {
      loadCustomers()
    }
  }, [currentLocationId])

  useEffect(() => {
    filterCustomers()
  }, [searchTerm, selectedSegment, customers])

  const loadCustomers = async () => {
    if (!currentLocationId) {
      setError('No barbershop selected. Please select a location from the sidebar.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch real customers from database via API
      const response = await fetch(`/api/customers?barbershop_id=${currentLocationId}&limit=500&sort_by=last_visit_at&sort_order=desc`)

      if (!response.ok) {
        throw new Error(`Failed to load customers: ${response.status}`)
      }

      const result = await response.json()
      const customersData = result.customers || []

      // Transform API data to component format and add segments
      const customersWithSegments = customersData.map(customer => ({
        ...customer,
        // Map API fields to component fields
        name: customer.full_name || customer.name, // Map full_name from API to name
        email: customer.email || '',
        phone: customer.phone || '',
        last_visit: customer.last_visit_at,
        preferred_contact: customer.notification_preferences?.email ? 'email' :
                          customer.notification_preferences?.sms ? 'sms' : 'phone',
        rating: customer.vip_status || customer.is_vip ? 5 : (customer.total_visits >= 10 ? 4 : 3),
        segment: getCustomerSegment({
          total_visits: customer.total_visits || 0,
          last_visit: customer.last_visit_at,
          created_at: customer.created_at
        })
      }))

      setCustomers(customersWithSegments)
      calculateStats(customersWithSegments)
    } catch (error) {
      console.error('Error loading customers:', error)
      setError(`Failed to load customers: ${error.message}`)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const getCustomerSegment = (customer) => {
    // Handle customers without visit history
    if (!customer.last_visit || !customer.total_visits) {
      return 'new'
    }

    // Calculate days since last visit
    const lastVisitDate = new Date(customer.last_visit)

    // Validate date is valid
    if (isNaN(lastVisitDate.getTime())) {
      return 'new'
    }

    const daysSinceLastVisit = Math.floor((new Date() - lastVisitDate) / (1000 * 60 * 60 * 24))

    // Classify by activity and visit count
    if (daysSinceLastVisit > SEGMENTS.inactive.daysInactive) {
      return 'inactive'
    } else if (customer.total_visits >= SEGMENTS.vip.minVisits) {
      return 'vip'
    } else if (customer.total_visits >= SEGMENTS.regular.minVisits) {
      return 'regular'
    } else {
      return 'new'
    }
  }

  const calculateStats = (customerList) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const newThisMonth = customerList.filter(c => 
      new Date(c.created_at) >= startOfMonth
    ).length

    const vipCount = customerList.filter(c => c.segment === 'vip').length
    
    const totalSpent = customerList.reduce((sum, c) => sum + c.total_spent, 0)
    const averageSpent = customerList.length > 0 ? totalSpent / customerList.length : 0

    setStats({
      total: customerList.length,
      newThisMonth,
      vipCount,
      averageSpent
    })
  }

  const filterCustomers = () => {
    let filtered = [...customers]

    if (selectedSegment !== 'all') {
      filtered = filtered.filter(c => c.segment === selectedSegment)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.phone.includes(search)
      )
    }

    setFilteredCustomers(filtered)
  }

  const handleAddCustomer = async (customerData) => {
    if (!currentLocationId) {
      alert('No barbershop selected')
      return
    }

    try {
      // Create customer via API
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershop_id: currentLocationId,
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
          notes: customerData.notes,
          notification_preferences: {
            email: customerData.preferred_contact === 'email',
            sms: customerData.preferred_contact === 'sms',
            phone: customerData.preferred_contact === 'phone',
            reminders: true,
            confirmations: true
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 409) {
          alert(`Customer already exists: ${errorData.existing_customer?.name}`)
        } else {
          throw new Error(errorData.error || 'Failed to create customer')
        }
        return
      }

      const result = await response.json()
      console.log('Customer created:', result.customer)

      // Reload customers to get fresh data
      await loadCustomers()
      setShowAddModal(false)
    } catch (error) {
      console.error('Error creating customer:', error)
      alert(`Failed to create customer: ${error.message}`)
    }
  }

  const handleUpdateCustomer = async (customerId, updates) => {
    try {
      // Update customer via API
      const response = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: customerId,
          name: updates.name,
          phone: updates.phone,
          email: updates.email,
          notes: updates.notes,
          notification_preferences: {
            email: updates.preferred_contact === 'email',
            sms: updates.preferred_contact === 'sms',
            phone: updates.preferred_contact === 'phone',
            reminders: true,
            confirmations: true
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update customer')
      }

      const result = await response.json()
      console.log('Customer updated:', result.customer)

      // Reload customers to get fresh data
      await loadCustomers()
      setShowEditModal(false)
      setSelectedCustomer(null)
    } catch (error) {
      console.error('Error updating customer:', error)
      alert(`Failed to update customer: ${error.message}`)
    }
  }

  const handleDeleteCustomer = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return
    }

    try {
      // Delete customer using DELETE method
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete customer')
      }

      console.log('Customer deleted successfully')

      // Reload customers to refresh list
      await loadCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      alert(`Failed to delete customer: ${error.message}`)
    }
  }

  const CustomerFormModal = ({ customer, onSave, onClose }) => {
    const [formData, setFormData] = useState({
      name: customer?.name || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      preferred_contact: customer?.preferred_contact || 'email',
      notes: customer?.notes || ''
    })

    const handleSubmit = (e) => {
      e.preventDefault()
      onSave(formData)
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-card-foreground">
              {customer ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                <UserIcon className="inline h-4 w-4 mr-1" />
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-border bg-input text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                <EnvelopeIcon className="inline h-4 w-4 mr-1" />
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-border bg-input text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                <PhoneIcon className="inline h-4 w-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-border bg-input text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Preferred Contact Method
              </label>
              <select
                value={formData.preferred_contact}
                onChange={(e) => setFormData({...formData, preferred_contact: e.target.value})}
                className="w-full px-3 py-2 border border-border bg-input text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="phone">Phone Call</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-border bg-input text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Preferences, special requirements, etc."
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-olive-600 text-white py-2 rounded-md hover:bg-olive-700 transition-colors"
              >
                {customer ? 'Update' : 'Add'} Customer
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-muted text-muted-foreground py-2 rounded-md hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const CustomerDetailsModal = ({ customer, onClose }) => {
    if (!customer) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold text-card-foreground">{customer.name}</h3>
              <div className="flex items-center mt-2 space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${SEGMENT_STYLES[customer.segment]?.badge || 'bg-gray-100 text-gray-800'}`}>
                  {SEGMENTS[customer.segment]?.name || 'Unknown'}
                </span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <StarIconSolid
                      key={i}
                      className={`h-5 w-5 ${i < customer.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-semibold text-card-foreground mb-3">Contact Information</h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <EnvelopeIcon className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="text-foreground">{customer.email}</span>
                </div>
                <div className="flex items-center text-sm">
                  <PhoneIcon className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="text-foreground">{customer.phone}</span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckIcon className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="text-foreground">Prefers {customer.preferred_contact} contact</span>
                </div>
              </div>
            </div>

            {/* Visit Statistics */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-semibold text-card-foreground mb-3">Visit Statistics</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Visits:</span>
                  <span className="font-medium text-foreground">{customer.total_visits}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Visit:</span>
                  <span className="font-medium text-foreground">
                    {customer.last_visit
                      ? new Date(customer.last_visit).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Member Since:</span>
                  <span className="font-medium text-foreground">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Spending Information */}
            <div className="bg-olive-50 dark:bg-olive-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-card-foreground mb-3">Spending</h4>
              <div className="text-3xl font-bold text-olive-600 dark:text-olive-400">
                ${customer.total_spent}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Average per visit: ${customer.total_visits > 0 ? (customer.total_spent / customer.total_visits).toFixed(2) : '0'}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-semibold text-card-foreground mb-3">Notes</h4>
              <p className="text-sm text-foreground">
                {customer.notes || 'No notes added yet'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                setSelectedCustomer(customer)
                setShowEditModal(true)
                onClose()
              }}
              className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 flex items-center"
            >
              <PencilSquareIcon className="h-4 w-4 mr-2" />
              Edit Customer
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserGroupIcon className="h-8 w-8 text-olive-600" />
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">Customer Management</h1>
              <p className="text-sm text-muted-foreground">Track and manage your customer relationships</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-olive-600 text-white px-4 py-2 rounded-md hover:bg-olive-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Customer
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-olive-50 dark:bg-olive-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-olive-600 dark:text-olive-400 font-medium">Total Customers</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-olive-600 dark:text-olive-400" />
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">New This Month</p>
                <p className="text-2xl font-bold text-foreground">{stats.newThisMonth}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="bg-gold-50 dark:bg-gold-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gold-600 dark:text-gold-400 font-medium">VIP Customers</p>
                <p className="text-2xl font-bold text-foreground">{stats.vipCount}</p>
              </div>
              <StarIcon className="h-8 w-8 text-gold-600 dark:text-gold-400" />
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Avg. Spent</p>
                <p className="text-2xl font-bold text-foreground">${stats.averageSpent.toFixed(0)}</p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-border bg-input text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Segment Filter */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedSegment('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedSegment === 'all' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({customers.length})
              </button>
              {Object.entries(SEGMENTS).map(([key, segment]) => {
                const count = customers.filter(c => c.segment === key).length
                const styles = SEGMENT_STYLES[key]
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedSegment(key)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      selectedSegment === key
                        ? styles?.button || 'bg-gray-600 text-white'
                        : `${styles?.badge || 'bg-gray-100 text-gray-700'} ${styles?.buttonHover || 'hover:bg-gray-200'}`
                    }`}
                  >
                    {segment.name} ({count})
                  </button>
                )
              })}
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md ${viewMode === 'cards' ? 'bg-olive-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                title="Card View"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-olive-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                title="Table View"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading customers...</p>
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No customers found</p>
            {searchTerm && (
              <p className="text-sm text-muted-foreground/70 mt-2">
                Try adjusting your search terms
              </p>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-card-foreground">{customer.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${SEGMENT_STYLES[customer.segment]?.badge || 'bg-gray-100 text-gray-800'}`}>
                      {SEGMENTS[customer.segment]?.name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCustomer(customer)
                        setShowEditModal(true)
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCustomer(customer.id)
                      }}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    {customer.email}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {customer.phone}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Last visit: {customer.last_visit
                      ? new Date(customer.last_visit).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Visits:</span>
                    <span className="font-medium ml-1 text-foreground">{customer.total_visits}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Spent:</span>
                    <span className="font-medium ml-1 text-foreground">${customer.total_spent}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Segment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Visits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Visit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredCustomers.map(customer => (
                  <tr
                    key={customer.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Joined {new Date(customer.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{customer.email}</div>
                      <div className="text-sm text-muted-foreground">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${SEGMENT_STYLES[customer.segment]?.badge || 'bg-gray-100 text-gray-800'}`}>
                        {SEGMENTS[customer.segment]?.name.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {customer.total_visits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {customer.last_visit ? new Date(customer.last_visit).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      ${customer.total_spent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCustomer(customer)
                            setShowEditModal(true)
                          }}
                          className="text-olive-600 hover:text-olive-900"
                          title="Edit Customer"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCustomer(customer.id)
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Customer"
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
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <CustomerFormModal
          onSave={handleAddCustomer}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showEditModal && selectedCustomer && (
        <CustomerFormModal
          customer={selectedCustomer}
          onSave={(data) => handleUpdateCustomer(selectedCustomer.id, data)}
          onClose={() => {
            setShowEditModal(false)
            setSelectedCustomer(null)
          }}
        />
      )}

      {selectedCustomer && !showEditModal && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  )
}