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

// Mock customer data
const Customers = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "(555) 123-4567",
    address: "123 Main St, City, State 12345",
    join_date: "2024-03-15",
    total_visits: 12,
    total_spent: "$420.00",
    last_visit: "2025-07-28",
    preferred_barber: "Marcus Johnson",
    notes: "Prefers short sides, likes to chat about sports",
    loyalty_points: 42,
    status: "active"
  },
  {
    id: 2,
    name: "Mike Davis",
    email: "mike.davis@email.com",
    phone: "(555) 987-6543",
    address: "456 Oak Ave, City, State 12345",
    join_date: "2024-01-20",
    total_visits: 8,
    total_spent: "$200.00",
    last_visit: "2025-07-15",
    preferred_barber: "David Wilson",
    notes: "Usually comes in every 3 weeks",
    loyalty_points: 20,
    status: "active"
  },
  {
    id: 3,
    name: "Alex Rodriguez",
    email: "alex.rodriguez@email.com",
    phone: "(555) 456-7890",
    address: "789 Pine Rd, City, State 12345",
    join_date: "2023-11-08",
    total_visits: 25,
    total_spent: "$875.00",
    last_visit: "2025-08-02",
    preferred_barber: "Marcus Johnson",
    notes: "VIP customer, always books premium services",
    loyalty_points: 87,
    status: "vip"
  }
]

export default function CustomersPage() {
  const { user, profile } = useAuth()
  const [customers, setCustomers] = useState(Customers)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedCustomer, setSelectedCustomer] = useState(null)

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
        return 'bg-purple-100 text-purple-800'
      case 'active':
        return 'bg-green-100 text-green-800'
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
                <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Customer
                </button>
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

              {filteredCustomers.length > 0 ? (
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
                                <StarIcon className="h-4 w-4 mr-1 text-yellow-500" />
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

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Advanced Customer Management Coming Soon
                </h3>
                <div className="mt-2 text-sm text-blue-700">
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
    </ProtectedRoute>
  )
}