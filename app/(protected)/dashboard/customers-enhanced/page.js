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
  PencilSquareIcon,
  TrashIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'

import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { createClient } from '../../../../lib/supabase/client'

// Customer segments
const SEGMENTS = {
  vip: { name: 'VIP', color: 'purple', minVisits: 10 },
  regular: { name: 'Regular', color: 'blue', minVisits: 5 },
  new: { name: 'New', color: 'green', minVisits: 0 },
  inactive: { name: 'Inactive', color: 'gray', daysInactive: 60 }
}

export default function CustomersEnhancedPage() {
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSegment, setSelectedSegment] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    newThisMonth: 0,
    vipCount: 0,
    averageSpent: 0
  })

  const { user } = useAuth()
  const supabase = createClient()

  // Load customers
  useEffect(() => {
    loadCustomers()
  }, [])

  // Filter customers when search or segment changes
  useEffect(() => {
    filterCustomers()
  }, [searchTerm, selectedSegment, customers])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      
      // For now, use demo data
      const demoCustomers = [
        {
          id: 1,
          name: 'John Smith',
          email: 'john@example.com',
          phone: '+1 (555) 123-4567',
          total_visits: 12,
          last_visit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          total_spent: 480,
          preferred_contact: 'email',
          created_at: '2024-03-15',
          notes: 'Prefers morning appointments, asks for Marcus',
          rating: 5
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          phone: '+1 (555) 234-5678',
          total_visits: 6,
          last_visit: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          total_spent: 240,
          preferred_contact: 'sms',
          created_at: '2024-06-20',
          notes: 'Likes beard trim with haircut',
          rating: 4
        },
        {
          id: 3,
          name: 'Mike Wilson',
          email: 'mike@example.com',
          phone: '+1 (555) 345-6789',
          total_visits: 15,
          last_visit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          total_spent: 750,
          preferred_contact: 'phone',
          created_at: '2023-12-10',
          notes: 'VIP customer, monthly full service',
          rating: 5
        },
        {
          id: 4,
          name: 'Emily Davis',
          email: 'emily@example.com',
          phone: '+1 (555) 456-7890',
          total_visits: 3,
          last_visit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          total_spent: 105,
          preferred_contact: 'email',
          created_at: '2024-11-01',
          notes: 'New customer, referred by John Smith',
          rating: 4
        }
      ]

      // Add segment to each customer
      const customersWithSegments = demoCustomers.map(customer => ({
        ...customer,
        segment: getCustomerSegment(customer)
      }))

      setCustomers(customersWithSegments)
      calculateStats(customersWithSegments)
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCustomerSegment = (customer) => {
    const daysSinceLastVisit = Math.floor((new Date() - new Date(customer.last_visit)) / (1000 * 60 * 60 * 24))
    
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

    // Filter by segment
    if (selectedSegment !== 'all') {
      filtered = filtered.filter(c => c.segment === selectedSegment)
    }

    // Filter by search term
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
    const newCustomer = {
      id: Date.now(),
      ...customerData,
      total_visits: 0,
      last_visit: null,
      total_spent: 0,
      created_at: new Date().toISOString(),
      rating: 0
    }
    
    newCustomer.segment = getCustomerSegment(newCustomer)
    
    setCustomers([...customers, newCustomer])
    setShowAddModal(false)
    calculateStats([...customers, newCustomer])
  }

  const handleUpdateCustomer = async (customerId, updates) => {
    const updatedCustomers = customers.map(c => 
      c.id === customerId ? { ...c, ...updates } : c
    )
    setCustomers(updatedCustomers)
    setShowEditModal(false)
    setSelectedCustomer(null)
  }

  const handleDeleteCustomer = async (customerId) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      const updatedCustomers = customers.filter(c => c.id !== customerId)
      setCustomers(updatedCustomers)
      calculateStats(updatedCustomers)
    }
  }

  // Customer Form Modal
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
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {customer ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="inline h-4 w-4 mr-1" />
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <EnvelopeIcon className="inline h-4 w-4 mr-1" />
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <PhoneIcon className="inline h-4 w-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred Contact Method
              </label>
              <select
                value={formData.preferred_contact}
                onChange={(e) => setFormData({...formData, preferred_contact: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="phone">Phone Call</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Preferences, special requirements, etc."
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {customer ? 'Update' : 'Add'} Customer
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Customer Details Modal
  const CustomerDetailsModal = ({ customer, onClose }) => {
    if (!customer) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{customer.name}</h3>
              <div className="flex items-center mt-2 space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${SEGMENTS[customer.segment].color}-100 text-${SEGMENTS[customer.segment].color}-800`}>
                  {SEGMENTS[customer.segment].name}
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
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{customer.email}</span>
                </div>
                <div className="flex items-center text-sm">
                  <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span>{customer.phone}</span>
                </div>
                <div className="flex items-center text-sm">
                  <CheckIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <span>Prefers {customer.preferred_contact} contact</span>
                </div>
              </div>
            </div>

            {/* Visit Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Visit Statistics</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Visits:</span>
                  <span className="font-medium">{customer.total_visits}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Visit:</span>
                  <span className="font-medium">
                    {customer.last_visit 
                      ? new Date(customer.last_visit).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="font-medium">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Spending Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Spending</h4>
              <div className="text-3xl font-bold text-blue-600">
                ${customer.total_spent}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Average per visit: ${customer.total_visits > 0 ? (customer.total_spent / customer.total_visits).toFixed(2) : '0'}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Notes</h4>
              <p className="text-sm text-gray-700">
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <PencilSquareIcon className="h-4 w-4 mr-2" />
              Edit Customer
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Close
            </button>
          </div>
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
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-sm text-gray-600">Track and manage your customer relationships</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Customer
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">VIP Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.vipCount}</p>
              </div>
              <StarIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Avg. Spent</p>
                <p className="text-2xl font-bold text-gray-900">${stats.averageSpent.toFixed(0)}</p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedSegment(key)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      selectedSegment === key 
                        ? `bg-${segment.color}-600 text-white` 
                        : `bg-${segment.color}-100 text-${segment.color}-700 hover:bg-${segment.color}-200`
                    }`}
                  >
                    {segment.name} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading customers...</p>
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No customers found</p>
            {searchTerm && (
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting your search terms
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium bg-${SEGMENTS[customer.segment].color}-100 text-${SEGMENTS[customer.segment].color}-800`}>
                      {SEGMENTS[customer.segment].name}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCustomer(customer)
                        setShowEditModal(true)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCustomer(customer.id)
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    {customer.email}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {customer.phone}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Last visit: {customer.last_visit 
                      ? new Date(customer.last_visit).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-600">Visits:</span>
                    <span className="font-medium ml-1">{customer.total_visits}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Spent:</span>
                    <span className="font-medium ml-1">${customer.total_spent}</span>
                  </div>
                </div>
              </div>
            ))}
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