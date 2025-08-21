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
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import GlobalNavigation from '../../components/GlobalNavigation'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../components/SupabaseAuthProvider'
import { 
  CustomerIntelligenceDashboard, 
  CustomerJourneyVisualizer, 
  SegmentBuilder, 
  CustomerProfileEnhanced, 
  ChurnRiskMonitor 
} from '../../components/customers'

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
  const [activeTab, setActiveTab] = useState('intelligence')
  const [selectedJourneyCustomer, setSelectedJourneyCustomer] = useState(null)

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

  const tabs = [
    {
      id: 'intelligence',
      label: 'Intelligence Dashboard',
      icon: ChartBarIcon,
      component: <CustomerIntelligenceDashboard />
    },
    {
      id: 'customers',
      label: 'Customer List',
      icon: UsersIcon,
      component: null // Handled separately
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

  const renderCustomersList = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Directory</h2>
        <button className="inline-flex items-center px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Customer
        </button>
      </div>

      <div className="flex gap-4">
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
              className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50"
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
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedCustomer(customer.id)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    <EyeIcon className="h-4 w-4 mr-1 inline" />
                    View Profile
                  </button>
                  <button
                    onClick={() => setSelectedJourneyCustomer(customer.id)}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    Journey
                  </button>
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
  )

  return (
    <ProtectedRoute>
      <GlobalNavigation />
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
                      onClick={() => setActiveTab(tab.id)}
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
        </div>
      </div>
    </ProtectedRoute>
  )
}