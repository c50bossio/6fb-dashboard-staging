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
  MapPinIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import ProtectedRoute from '../../components/ProtectedRoute'
import GlobalNavigation from '../../components/GlobalNavigation'
import { useAuth } from '../../components/SupabaseAuthProvider'
import { createClient } from '../../lib/supabase/client'
import LoadingSpinner, { TableLoadingSkeleton } from '../../components/LoadingSpinner'
import Button from '../../components/Button'

export default function CustomersPage() {
  const { user, profile } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  
  // Add Customer Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [addCustomerForm, setAddCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    notes: ''
  })

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('customers')
          .select(`
            *,
            preferred_barber:staff(name)
          `)
          .is('deleted_at', null)
          .order('last_visit', { ascending: false, nullsFirst: false })
        
        if (error) {
          console.error('Error fetching customers:', error)
          throw error
        }
        
        // Transform data to match the expected format
        const transformedCustomers = data?.map(customer => ({
          ...customer,
          total_spent: `$${Number(customer.total_spent || 0).toFixed(2)}`,
          preferred_barber: customer.preferred_barber?.name || 'None assigned',
          join_date: customer.join_date || customer.created_at?.split('T')[0]
        })) || []
        
        setCustomers(transformedCustomers)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch customers:', err)
        setError(err.message || 'Failed to load customers')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchCustomers()
    }
  }, [user])

  // Add Customer Handler
  const handleAddCustomer = async (e) => {
    e.preventDefault()
    
    if (!addCustomerForm.name || !addCustomerForm.email) {
      alert('Please fill in all required fields')
      return
    }
    
    try {
      setAddingCustomer(true)
      const supabase = createClient()
      
      const newCustomer = {
        ...addCustomerForm,
        barbershop_id: profile?.barbershop_id || null,
        created_at: new Date().toISOString(),
        join_date: new Date().toISOString().split('T')[0],
        total_spent: 0,
        total_visits: 0,
        loyalty_points: 0,
        last_visit: null,
        preferred_barber_id: null
      }
      
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
      
      if (error) {
        console.error('Error adding customer:', error)
        alert(`Failed to add customer: ${error.message}`)
        return
      }
      
      // Add the new customer to the list
      const transformedCustomer = {
        ...data[0],
        total_spent: `$${Number(data[0].total_spent || 0).toFixed(2)}`,
        preferred_barber: 'None assigned'
      }
      
      setCustomers(prev => [transformedCustomer, ...prev])
      
      // Reset form and close modal
      setAddCustomerForm({
        name: '',
        email: '',
        phone: '',
        status: 'active',
        notes: ''
      })
      setShowAddModal(false)
      
    } catch (err) {
      console.error('Failed to add customer:', err)
      alert('Failed to add customer. Please try again.')
    } finally {
      setAddingCustomer(false)
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus
    return matchesSearch && matchesStatus
  })

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

  return (
    <ProtectedRoute>
      <GlobalNavigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center"
                  variant="primary"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Customer
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search customers..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <select
                  className="px-4 py-2 border border-gray-300 rounded-md"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="vip">VIP</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {loading ? (
                <TableLoadingSkeleton rows={5} />
              ) : error ? (
                <div className="text-center py-12">
                  <UsersIcon className="mx-auto h-12 w-12 text-red-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Customers</h3>
                  <p className="mt-1 text-sm text-gray-500">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredCustomers.length > 0 ? (
                <div className="grid gap-4">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-gray-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium text-gray-900">{customer.name}</h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(customer.status)}`}>
                                {customer.status === 'vip' ? 'VIP' : customer.status}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <EnvelopeIcon className="h-4 w-4 mr-1" />
                                {customer.email}
                              </span>
                              <span className="flex items-center">
                                <PhoneIcon className="h-4 w-4 mr-1" />
                                {customer.phone}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                              <span>Visits: {customer.total_visits}</span>
                              <span>Spent: {customer.total_spent}</span>
                              <span>Last visit: {customer.last_visit}</span>
                              <span className="flex items-center">
                                <StarIcon className="h-4 w-4 mr-1 text-amber-800" />
                                {customer.loyalty_points} points
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 bg-olive-50 border border-olive-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-olive-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-olive-800">
                  Advanced Customer Management Coming Soon
                </h3>
                <div className="mt-2 text-sm text-olive-700">
                  <p>We're building comprehensive customer relationship tools including:</p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Detailed customer profiles and preferences</li>
                    <li>Visit history and service tracking</li>
                    <li>Loyalty program management</li>
                    <li>Birthday and appointment reminders</li>
                    <li>Customer communication portal</li>
                    <li>Review and feedback collection</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Add New Customer</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={addingCustomer}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addCustomerForm.name}
                    onChange={(e) => setAddCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    disabled={addingCustomer}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={addCustomerForm.email}
                    onChange={(e) => setAddCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    disabled={addingCustomer}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={addCustomerForm.phone}
                    onChange={(e) => setAddCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    disabled={addingCustomer}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={addCustomerForm.status}
                    onChange={(e) => setAddCustomerForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    disabled={addingCustomer}
                  >
                    <option value="active">Active</option>
                    <option value="vip">VIP</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={addCustomerForm.notes}
                    onChange={(e) => setAddCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    disabled={addingCustomer}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddModal(false)}
                    disabled={addingCustomer}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={addingCustomer}
                    loadingText="Adding..."
                    className="flex-1"
                  >
                    Add Customer
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}