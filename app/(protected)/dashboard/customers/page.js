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
  TrashIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSegment, setSelectedSegment] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    // Mock customer data (replace with real API call)
    const Customers = [
      {
        id: 1,
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+1234567890',
        segment: 'vip',
        totalVisits: 12,
        lastVisit: '2025-07-25',
        totalSpent: 480,
        preferredContact: 'email',
        joinDate: '2024-03-15',
        notes: 'Prefers morning appointments'
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        email: 'sarah@example.com', 
        phone: '+1234567891',
        segment: 'regular',
        totalVisits: 6,
        lastVisit: '2025-07-20',
        totalSpent: 240,
        preferredContact: 'sms',
        joinDate: '2024-06-10',
        notes: 'Allergic to certain hair products'
      },
      {
        id: 3,
        name: 'Mike Wilson',
        email: 'mike@example.com',
        phone: '+1234567892',
        segment: 'lapsed',
        totalVisits: 3,
        lastVisit: '2025-05-15',
        totalSpent: 120,
        preferredContact: 'phone',
        joinDate: '2024-01-20',
        notes: 'Travels frequently for work'
      },
      {
        id: 4,
        name: 'Emily Chen',
        email: 'emily@example.com',
        phone: '+1234567893', 
        segment: 'new',
        totalVisits: 1,
        lastVisit: '2025-07-28',
        totalSpent: 45,
        preferredContact: 'email',
        joinDate: '2025-07-28',
        notes: 'First-time customer, very satisfied'
      }
    ]
    
    setCustomers(mockCustomers)
    setFilteredCustomers(mockCustomers)
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
      case 'vip': return 'bg-purple-100 text-purple-800'
      case 'regular': return 'bg-blue-100 text-blue-800'
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
    // Mock add customer (replace with real API call)
    const newCustomer = {
      id: customers.length + 1,
      ...customerData,
      segment: 'new',
      totalVisits: 0,
      totalSpent: 0,
      joinDate: new Date().toISOString().split('T')[0]
    }
    
    setCustomers([...customers, newCustomer])
    setShowAddModal(false)
    setNotification({
      type: 'success',
      message: 'Customer added successfully!'
    })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleEditCustomer = (customerId) => {
    setNotification({
      type: 'info',
      message: 'Customer editing feature is being developed. Contact support for changes.'
    })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleDeleteCustomer = (customerId) => {
    const customerName = customers.find(c => c.id === customerId)?.name
    // For production, this should be a proper modal confirmation
    if (window.confirm(`Are you sure you want to delete ${customerName}? This action cannot be undone.`)) {
      setCustomers(customers.filter(c => c.id !== customerId))
      setNotification({
        type: 'success',
        message: `${customerName} has been removed from your customer database.`
      })
      setTimeout(() => setNotification(null), 3000)
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
            'bg-blue-50 text-blue-800 border border-blue-200'
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
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>
        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <StarIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">VIP Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.segment === 'vip').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.segment === 'new').length}
                </p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {customers.filter(c => c.segment === 'lapsed').length}
                </p>
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
                          className="text-blue-600 hover:text-blue-900"
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