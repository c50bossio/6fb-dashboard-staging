'use client'

import { useState, useEffect } from 'react'
import {
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

export default function BarberClients() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, regular, new, vip
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState(null)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      
      // Mock client data - in production, this would fetch from database
      const Clients = [
        {
          id: 'client_001',
          name: 'John Smith',
          email: 'john.smith@example.com',
          phone: '(555) 123-4567',
          type: 'regular',
          total_appointments: 24,
          last_appointment: '2024-01-15',
          next_appointment: '2024-02-01',
          total_spent: 1080,
          average_service_value: 45,
          favorite_service: 'Premium Haircut',
          loyalty_points: 240,
          notes: 'Prefers morning appointments',
          rating: 5
        },
        {
          id: 'client_002',
          name: 'Michael Johnson',
          email: 'michael.j@example.com',
          phone: '(555) 234-5678',
          type: 'vip',
          total_appointments: 48,
          last_appointment: '2024-01-18',
          next_appointment: '2024-01-25',
          total_spent: 2880,
          average_service_value: 60,
          favorite_service: 'Full Service Package',
          loyalty_points: 576,
          notes: 'VIP client - always offer premium services',
          rating: 5
        },
        {
          id: 'client_003',
          name: 'David Williams',
          email: 'david.w@example.com',
          phone: '(555) 345-6789',
          type: 'new',
          total_appointments: 2,
          last_appointment: '2024-01-10',
          next_appointment: null,
          total_spent: 90,
          average_service_value: 45,
          favorite_service: 'Basic Haircut',
          loyalty_points: 18,
          notes: 'New client - follow up for rebooking',
          rating: 4
        },
        {
          id: 'client_004',
          name: 'Robert Brown',
          email: 'robert.b@example.com',
          phone: '(555) 456-7890',
          type: 'regular',
          total_appointments: 12,
          last_appointment: '2024-01-12',
          next_appointment: '2024-01-26',
          total_spent: 540,
          average_service_value: 45,
          favorite_service: 'Fade Cut',
          loyalty_points: 108,
          notes: 'Likes to book same time slot',
          rating: 5
        },
        {
          id: 'client_005',
          name: 'James Davis',
          email: 'james.d@example.com',
          phone: '(555) 567-8901',
          type: 'regular',
          total_appointments: 18,
          last_appointment: '2024-01-14',
          next_appointment: '2024-01-28',
          total_spent: 810,
          average_service_value: 45,
          favorite_service: 'Beard Trim & Cut',
          loyalty_points: 162,
          notes: 'Appreciates appointment reminders',
          rating: 4
        }
      ]
      
      setClients(mockClients)
    } catch (error) {
      console.error('Failed to load clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.phone.includes(searchTerm)
    
    const matchesFilter = filterType === 'all' || client.type === filterType
    
    return matchesSearch && matchesFilter
  })

  const getClientTypeBadge = (type) => {
    const badges = {
      vip: { bg: 'bg-gold-100', text: 'text-gold-800', label: 'VIP' },
      regular: { bg: 'bg-olive-100', text: 'text-olive-800', label: 'Regular' },
      new: { bg: 'bg-green-100', text: 'text-green-800', label: 'New' }
    }
    
    const badge = badges[type] || badges.regular
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const ClientDetailsModal = ({ client, onClose }) => {
    if (!client) return null
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Client Details</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                <UserGroupIcon className="h-8 w-8 text-amber-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  {getClientTypeBadge(client.type)}
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`h-4 w-4 ${i < client.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-sm font-medium text-gray-900">{client.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-sm font-medium text-gray-900">{client.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Appointments</p>
                <p className="text-sm font-medium text-gray-900">{client.total_appointments}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-sm font-medium text-gray-900">${client.total_spent}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Favorite Service</p>
                <p className="text-sm font-medium text-gray-900">{client.favorite_service}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Loyalty Points</p>
                <p className="text-sm font-medium text-gray-900">{client.loyalty_points} pts</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
              <p className="text-sm text-gray-600">{client.notes}</p>
            </div>
            
            <div className="flex space-x-3">
              <button className="flex-1 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-700">
                Book Appointment
              </button>
              <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                Send Message
              </button>
              <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                View History
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
              <p className="text-sm text-gray-600">Manage your client relationships</p>
            </div>
            <button className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-700">
              Add New Client
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg ${
                  filterType === 'all' 
                    ? 'bg-amber-700 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({clients.length})
              </button>
              <button
                onClick={() => setFilterType('regular')}
                className={`px-4 py-2 rounded-lg ${
                  filterType === 'regular' 
                    ? 'bg-amber-700 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Regular ({clients.filter(c => c.type === 'regular').length})
              </button>
              <button
                onClick={() => setFilterType('vip')}
                className={`px-4 py-2 rounded-lg ${
                  filterType === 'vip' 
                    ? 'bg-amber-700 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                VIP ({clients.filter(c => c.type === 'vip').length})
              </button>
              <button
                onClick={() => setFilterType('new')}
                className={`px-4 py-2 rounded-lg ${
                  filterType === 'new' 
                    ? 'bg-amber-700 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                New ({clients.filter(c => c.type === 'new').length})
              </button>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedClient(client)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-3 w-3 ${i < client.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {getClientTypeBadge(client.type)}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  {client.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  {client.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  {client.total_appointments} appointments
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                  ${client.total_spent} lifetime value
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last visit</span>
                  <span className="font-medium text-gray-900">
                    {new Date(client.last_appointment).toLocaleDateString()}
                  </span>
                </div>
                {client.next_appointment && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Next visit</span>
                    <span className="font-medium text-green-600">
                      {new Date(client.next_appointment).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>

      {/* Client Details Modal */}
      {selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  )
}