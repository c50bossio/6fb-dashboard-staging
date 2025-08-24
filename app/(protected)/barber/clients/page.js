'use client'

import {
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  StarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { createClient } from '@supabase/supabase-js'
import ExportCSV from '../../../../components/customers/ExportCSV'
import PlatformTailoredImport from '../../../../components/onboarding/PlatformTailoredImport'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function BarberClients() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clients, setClients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, regular, new, vip
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  // Handle URL parameters for auto-opening modals
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'import') {
      setShowImportModal(true)
      // Clean up URL after opening modal
      router.replace('/barber/clients', { shallow: true })
    } else if (action === 'export') {
      setShowExportModal(true)
      // Clean up URL after opening modal
      router.replace('/barber/clients', { shallow: true })
    }
  }, [searchParams, router])

  useEffect(() => {
    if (profile?.barbershop_id || profile?.shop_id) {
      loadClients()
    }
  }, [profile])

  const loadClients = async () => {
    try {
      setLoading(true)
      
      // Get barbershop ID from profile
      const barbershopId = profile?.barbershop_id || profile?.shop_id
      
      if (!barbershopId) {
        console.error('No barbershop ID found in profile')
        toast.error('Unable to load clients - no barbershop associated')
        return
      }

      // Fetch real customers from API
      const response = await fetch(`/api/customers?barbershop_id=${barbershopId}&limit=100`)
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Transform data to include calculated fields
      const transformedClients = (data.customers || []).map(customer => {
        // Calculate client type based on visits and spending
        let type = 'new'
        if (customer.total_visits > 20 && customer.total_spent > 1000) {
          type = 'vip'
        } else if (customer.total_visits > 5) {
          type = 'regular'
        }

        // Calculate average service value
        const avgValue = customer.total_visits > 0 
          ? Math.round(customer.total_spent / customer.total_visits) 
          : 0

        return {
          ...customer,
          type,
          average_service_value: avgValue,
          rating: customer.rating || 5,
          loyalty_points: customer.loyalty_points || Math.round(customer.total_spent * 0.1),
          total_appointments: customer.total_visits || 0,
          last_appointment: customer.last_visit_at,
          next_appointment: customer.next_appointment_at,
          favorite_service: customer.preferred_service || 'Haircut'
        }
      })
      
      setClients(transformedClients)
    } catch (error) {
      console.error('Failed to load clients:', error)
      toast.error('Failed to load clients')
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
              <button 
                onClick={() => {
                  handleBookAppointment(client)
                  onClose()
                }}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Book Appointment
              </button>
              <button 
                onClick={() => {
                  handleSendMessage(client)
                  onClose()
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Send Message
              </button>
              <button 
                onClick={() => {
                  handleViewHistory(client)
                  onClose()
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
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

  // Handle client creation
  const handleAddClient = async (clientData) => {
    try {
      const barbershopId = profile?.barbershop_id || profile?.shop_id
      
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...clientData,
          barbershop_id: barbershopId
        })
      })

      const data = await response.json()
      
      if (data.error) {
        if (response.status === 409) {
          toast.error('Client already exists with this contact information')
        } else {
          toast.error(data.error)
        }
        return false
      }

      toast.success('Client added successfully!')
      await loadClients() // Reload the list
      return true
    } catch (error) {
      console.error('Failed to add client:', error)
      toast.error('Failed to add client')
      return false
    }
  }

  // Handle booking appointment
  const handleBookAppointment = (client) => {
    // Navigate to booking page with client pre-selected
    router.push(`/dashboard/appointments/new?client_id=${client.id}`)
  }

  // Handle sending message
  const handleSendMessage = (client) => {
    // For now, open email client. Later can integrate SMS/in-app messaging
    if (client.email) {
      window.location.href = `mailto:${client.email}?subject=Message from ${profile?.barbershop_name || 'Your Barber'}`
    } else if (client.phone) {
      window.location.href = `sms:${client.phone}`
    } else {
      toast.error('No contact method available for this client')
    }
  }

  // Handle viewing history
  const handleViewHistory = (client) => {
    router.push(`/dashboard/customers/${client.id}/history`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-sm text-gray-600">
                {loading ? 'Loading...' : `${clients.length} customers • Import or export data anytime`}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Export Button */}
              <ExportCSV
                customers={filteredClients}
                onExport={(data) => {
                  console.log('Exported:', data)
                  toast.success(`Exported ${data.customers.length} customers`)
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                triggerClassName="flex items-center space-x-2"
                triggerContent={
                  <>
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    <span>Export All</span>
                  </>
                }
              />
              
              {/* Import Button */}
              <button 
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                title="Import customers from CSV file"
              >
                <DocumentArrowUpIcon className="h-5 w-5" />
                <span>Import More</span>
              </button>
              
              {/* Add New Client Button */}
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add New Client</span>
              </button>
            </div>
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

      {/* Add Client Modal */}
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddClient}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Import Clients</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <PlatformTailoredImport
                onComplete={(importData) => {
                  console.log('Import completed:', importData)
                  if (!importData.skipped) {
                    toast.success('Import completed successfully!')
                    loadClients() // Reload the client list
                  }
                  setShowImportModal(false)
                }}
                profile={profile}
                initialData={{}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Add Client Modal Component
function AddClientModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    preferred_service: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || (!formData.email && !formData.phone)) {
      toast.error('Name and at least one contact method required')
      return
    }

    setLoading(true)
    const success = await onAdd(formData)
    setLoading(false)
    
    if (success) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full m-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Add New Client</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Service
            </label>
            <input
              type="text"
              value={formData.preferred_service}
              onChange={(e) => setFormData({ ...formData, preferred_service: e.target.value })}
              placeholder="e.g., Haircut, Beard Trim"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Preferences, allergies, special requests..."
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Note: Import functionality now uses the comprehensive PlatformTailoredImport component
// from the onboarding system which provides:
// - Platform-specific export instructions
// - File preview and validation
// - Progress tracking
// - Duplicate detection
// - Support for Square, Booksy, Schedulicity, Acuity, Trafft, and generic CSV