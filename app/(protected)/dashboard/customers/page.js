'use client'

import { 
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  StarIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSegment, setSelectedSegment] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Calculate customer segment based on visit data
  const calculateSegment = (customer) => {
    const daysSinceLastVisit = customer.last_visit_at 
      ? Math.floor((Date.now() - new Date(customer.last_visit_at).getTime()) / (1000 * 60 * 60 * 24))
      : null
    
    if (customer.vip_status || customer.total_visits >= 10) return 'vip'
    if (daysSinceLastVisit && daysSinceLastVisit > 60) return 'lapsed'
    if (customer.total_visits === 0 || customer.total_visits === 1) return 'new'
    return 'regular'
  }

  // Format customer data from API response
  const formatCustomerData = (apiCustomers) => {
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
      isActive: customer.is_active !== false
    }))
  }

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/customers?limit=100')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      const formattedCustomers = formatCustomerData(data.customers || [])
      setCustomers(formattedCustomers)
      setFilteredCustomers(formattedCustomers)
      
    } catch (err) {
      console.error('Error fetching customers:', err)
      setError(err.message)
      setCustomers([])
      setFilteredCustomers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    const filtered = customers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           customer.phone.includes(searchTerm)
      
      const matchesSegment = selectedSegment === 'all' || customer.segment === selectedSegment
      
      return matchesSearch && matchesSegment
    })
    
    setFilteredCustomers(filtered)
  }, [customers, searchTerm, selectedSegment])

  const getSegmentColor = (segment) => {
    switch (segment) {
      case 'vip': return 'bg-gold-100 text-gold-800'
      case 'regular': return 'bg-olive-100 text-olive-800'
      case 'new': return 'bg-green-100 text-green-800'
      case 'lapsed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getContactIcon = (type) => {
    switch (type) {
      case 'email': return <EnvelopeIcon className="h-4 w-4" />
      case 'sms': return <PhoneIcon className="h-4 w-4" />
      case 'phone': return <PhoneIcon className="h-4 w-4" />
      default: return <EnvelopeIcon className="h-4 w-4" />
    }
  }

  const addCustomer = async (customerData) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id: 'demo-shop-001',
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

      // Refresh customer list
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

    // For now, show edit modal with customer data
    // TODO: Implement full edit modal UI
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

      // Refresh customer list
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
      // Soft delete by marking as inactive
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

      // Refresh customer list
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Customer Management</h1>
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
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Customer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <p className="font-medium">Error loading customers</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchCustomers}
              className="text-sm underline mt-2 hover:no-underline"
            >
              Try again
            </button>
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

        {/* Search and Filter */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            
            <div className="sm:w-48">
              <select
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="input-field"
              >
                <option value="all">All Segments</option>
                <option value="vip">VIP</option>
                <option value="regular">Regular</option>
                <option value="new">New</option>
                <option value="lapsed">Lapsed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="card">
          <div className="overflow-x-auto">
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
                <p className="text-gray-500 font-medium">No customers found</p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm || selectedSegment !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Start by adding your first customer'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Segment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Visit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Spent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">
                            Joined {new Date(customer.joinDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.email}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        {getContactIcon(customer.preferredContact)}
                        <span className="ml-1">{customer.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSegmentColor(customer.segment)}`}>
                        {customer.segment.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.totalVisits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${customer.totalSpent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditCustomer(customer.id)}
                          className="text-olive-600 hover:text-olive-900"
                          title="Edit Customer"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCustomer(customer.id)}
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
            )}
          </div>
        </div>
      </div>

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
    </div>
  )
}