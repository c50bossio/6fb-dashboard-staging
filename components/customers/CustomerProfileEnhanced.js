'use client'

import React, { 
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarDaysIcon,
  StarIcon,
  GiftIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  BookmarkIcon,
  HeartIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect } from 'react'
import React, { useAuth } from '../SupabaseAuthProvider'
import React, { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../ui'

// Health Score Gauge Component
const HealthScoreGauge = ({ score, size = 'sm' }) => {
  const radius = size === 'lg' ? 50 : 35
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  const getColor = (score) => {
    if (score >= 80) return '#10B981'
    if (score >= 60) return '#F59E0B'
    if (score >= 40) return '#F97316'
    return '#EF4444'
  }

  return (
    <div className="relative flex items-center justify-center">
      <svg 
        width={radius * 2.2} 
        height={radius * 2.2} 
        className="transform -rotate-90"
      >
        <circle
          cx={radius * 1.1}
          cy={radius * 1.1}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx={radius * 1.1}
          cy={radius * 1.1}
          r={radius}
          stroke={getColor(score)}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{score}</span>
      </div>
    </div>
  )
}

// Communication History Item
const CommunicationItem = ({ item }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'email':
        return <EnvelopeIcon className="h-4 w-4" />
      case 'sms':
        return <ChatBubbleLeftRightIcon className="h-4 w-4" />
      case 'call':
        return <PhoneIcon className="h-4 w-4" />
      default:
        return <ChatBubbleLeftRightIcon className="h-4 w-4" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-600'
      case 'sms':
        return 'bg-green-100 text-green-600'
      case 'call':
        return 'bg-purple-100 text-purple-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
      <div className={`flex-shrink-0 p-2 rounded-full ${getTypeColor(item.type)}`}>
        {getIcon(item.type)}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">{item.subject || item.type.toUpperCase()}</h4>
          <span className="text-xs text-gray-500">
            {new Date(item.timestamp).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">{item.content}</p>
        {item.status && (
          <Badge className={`text-xs mt-2 ${item.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {item.status}
          </Badge>
        )}
      </div>
    </div>
  )
}

// Appointment History Item
const AppointmentItem = ({ appointment }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'no_show':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{appointment.service_name}</h4>
            <Badge className={`text-xs ${getStatusColor(appointment.status)}`}>
              {appointment.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}
          </p>
          <p className="text-sm text-gray-600">
            Barber: {appointment.barber_name}
          </p>
          {appointment.rating && (
            <div className="flex items-center mt-2">
              <StarIcon className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="text-sm text-gray-600">{appointment.rating}/5</span>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">${appointment.price}</p>
          {appointment.duration && (
            <p className="text-xs text-gray-500">{appointment.duration} min</p>
          )}
        </div>
      </div>
      {appointment.notes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">{appointment.notes}</p>
        </div>
      )}
    </div>
  )
}

// Add Note Modal
const AddNoteModal = ({ isOpen, onClose, onSave, customerId }) => {
  const [note, setNote] = useState('')
  const [noteType, setNoteType] = useState('general')
  const [isPrivate, setIsPrivate] = useState(false)

  const handleSave = () => {
    if (note.trim()) {
      onSave({
        customer_id: customerId,
        note_content: note.trim(),
        note_type: noteType,
        is_private: isPrivate,
        created_at: new Date().toISOString()
      })
      setNote('')
      setNoteType('general')
      setIsPrivate(false)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Note</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note Type
            </label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="general">General</option>
              <option value="preference">Preference</option>
              <option value="service">Service Note</option>
              <option value="behavioral">Behavioral</option>
              <option value="reminder">Reminder</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter note..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-olive-600 rounded border-gray-300"
            />
            <label htmlFor="private" className="ml-2 text-sm text-gray-700">
              Private note (only visible to staff)
            </label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!note.trim()}
            className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 disabled:opacity-50"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CustomerProfileEnhanced({ customerId, onClose }) {
  const { user, profile } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [healthScore, setHealthScore] = useState(null)
  const [clvData, setCLVData] = useState(null)
  const [loyaltyData, setLoyaltyData] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [communications, setCommunications] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showAddNote, setShowAddNote] = useState(false)

  // Fetch complete customer profile data
  useEffect(() => {
    if (!user || !profile?.barbershop_id || !customerId) return

    const fetchCustomerProfile = async () => {
      try {
        setLoading(true)
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://your-api-domain.com'
          : 'http://localhost:8001'

        const token = await user.getIdToken()

        // Fetch all customer data in parallel
        const [
          customerResponse,
          healthResponse,
          clvResponse,
          loyaltyResponse,
          appointmentsResponse,
          communicationsResponse,
          notesResponse
        ] = await Promise.all([
          fetch(`${baseUrl}/customers/${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/customer-health-scores?customer_id=${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/customer-clv?customer_id=${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/loyalty/customer/${customerId}/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/appointments?customer_id=${customerId}&limit=20`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/communications?customer_id=${customerId}&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${baseUrl}/customer-notes?customer_id=${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ])

        // Process responses
        if (customerResponse.ok) {
          const customerData = await customerResponse.json()
          setCustomer(customerData)
        }

        if (healthResponse.ok) {
          const healthData = await healthResponse.json()
          setHealthScore(healthData[0] || null)
        }

        if (clvResponse.ok) {
          const clvResult = await clvResponse.json()
          setCLVData(clvResult[0] || null)
        }

        if (loyaltyResponse.ok) {
          const loyaltyResult = await loyaltyResponse.json()
          setLoyaltyData(loyaltyResult)
        }

        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json()
          setAppointments(appointmentsData)
        }

        if (communicationsResponse.ok) {
          const commData = await communicationsResponse.json()
          setCommunications(commData)
        }

        if (notesResponse.ok) {
          const notesData = await notesResponse.json()
          setNotes(notesData)
        }

      } catch (err) {
        setError(err.message)
        console.error('Error fetching customer profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomerProfile()
  }, [user, profile?.barbershop_id, customerId])

  // Save note
  const saveNote = async (noteData) => {
    try {
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://your-api-domain.com'
        : 'http://localhost:8001'

      const token = await user.getIdToken()

      const response = await fetch(`${baseUrl}/customer-notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
      })

      if (response.ok) {
        const newNote = await response.json()
        setNotes([newNote, ...notes])
      }
    } catch (err) {
      console.error('Error saving note:', err)
    }
  }

  // Quick actions
  const quickActions = [
    {
      label: 'Book Appointment',
      icon: CalendarDaysIcon,
      action: () => console.log('Book appointment'),
      className: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      label: 'Send Message',
      icon: ChatBubbleLeftRightIcon,
      action: () => console.log('Send message'),
      className: 'bg-green-600 hover:bg-green-700'
    },
    {
      label: 'Add Note',
      icon: PencilSquareIcon,
      action: () => setShowAddNote(true),
      className: 'bg-purple-600 hover:bg-purple-700'
    }
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Profile</h3>
          <p className="text-gray-600">{error || 'Customer not found'}</p>
          {onClose && (
            <button 
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center">
              {customer.avatar_url ? (
                <img
                  src={customer.avatar_url}
                  alt={customer.full_name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="h-8 w-8 text-gray-600" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{customer.full_name}</h1>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                <span className="flex items-center">
                  <EnvelopeIcon className="h-4 w-4 mr-1" />
                  {customer.email}
                </span>
                {customer.phone && (
                  <span className="flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {customer.phone}
                  </span>
                )}
                {customer.city && (
                  <span className="flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    {customer.city}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className="bg-blue-100 text-blue-800">
                  Customer since {new Date(customer.created_at).getFullYear()}
                </Badge>
                {customer.is_vip && (
                  <Badge className="bg-gold-100 text-gold-800">
                    <TrophyIcon className="h-3 w-3 mr-1" />
                    VIP
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`px-3 py-2 text-white rounded-md text-sm ${action.className}`}
              >
                <action.icon className="h-4 w-4 mr-1 inline" />
                {action.label}
              </button>
            ))}
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border-b border-gray-200">
        <div className="text-center">
          {healthScore ? (
            <div className="flex flex-col items-center">
              <HealthScoreGauge score={healthScore.overall_score} />
              <p className="text-sm font-medium text-gray-700 mt-2">Health Score</p>
              <Badge className={`text-xs mt-1 ${
                healthScore.churn_risk === 'low' ? 'bg-green-100 text-green-800' :
                healthScore.churn_risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {healthScore.churn_risk} risk
              </Badge>
            </div>
          ) : (
            <div className="text-center">
              <HeartIcon className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600 mt-2">No health data</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <CurrencyDollarIcon className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${clvData?.total_clv?.toFixed(0) || '0'}
          </p>
          <p className="text-sm text-gray-600">Customer Lifetime Value</p>
          {clvData?.predicted_clv && (
            <p className="text-xs text-gray-500 mt-1">
              Predicted: ${clvData.predicted_clv.toFixed(0)}
            </p>
          )}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <CalendarDaysIcon className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {customer.total_visits || 0}
          </p>
          <p className="text-sm text-gray-600">Total Visits</p>
          <p className="text-xs text-gray-500 mt-1">
            Last visit: {customer.last_visit_date ? 
              new Date(customer.last_visit_date).toLocaleDateString() : 
              'Never'
            }
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <GiftIcon className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loyaltyData?.current_points || 0}
          </p>
          <p className="text-sm text-gray-600">Loyalty Points</p>
          {loyaltyData?.tier && (
            <Badge className="text-xs mt-1 bg-purple-100 text-purple-800">
              {loyaltyData.tier} Tier
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'appointments', label: 'Appointments' },
            { key: 'communications', label: 'Communications' },
            { key: 'notes', label: 'Notes' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 text-sm font-medium border-b-2 ${
                activeTab === tab.key
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Spent:</span>
                  <span className="font-medium">${customer.total_spent || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Order Value:</span>
                  <span className="font-medium">
                    ${clvData?.average_order_value?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Visit Frequency:</span>
                  <span className="font-medium">
                    {clvData?.purchase_frequency?.toFixed(1) || '0'} visits/month
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preferred Barber:</span>
                  <span className="font-medium">{customer.preferred_barber || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preferred Services:</span>
                  <span className="font-medium">{customer.preferred_services || 'None'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.slice(0, 3).map((appointment, index) => (
                  <div key={index} className="border-b border-gray-200 pb-3 mb-3 last:border-b-0 last:mb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{appointment.service_name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(appointment.appointment_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={`text-xs ${
                        appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {appointment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {appointments.length > 0 ? (
              appointments.map((appointment, index) => (
                <AppointmentItem key={index} appointment={appointment} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No appointments found
              </div>
            )}
          </div>
        )}

        {activeTab === 'communications' && (
          <div className="space-y-4">
            {communications.length > 0 ? (
              communications.map((item, index) => (
                <CommunicationItem key={index} item={item} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No communications found
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Customer Notes</h3>
              <button
                onClick={() => setShowAddNote(true)}
                className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 text-sm"
              >
                <PlusIcon className="h-4 w-4 mr-2 inline" />
                Add Note
              </button>
            </div>
            
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className="text-xs capitalize bg-gray-100 text-gray-700">
                            {note.note_type}
                          </Badge>
                          {note.is_private && (
                            <Badge className="text-xs bg-yellow-100 text-yellow-800">
                              Private
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-900 mt-2">{note.note_content}</p>
                      </div>
                      <span className="text-xs text-gray-500 ml-4">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No notes added yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={showAddNote}
        onClose={() => setShowAddNote(false)}
        onSave={saveNote}
        customerId={customerId}
      />
    </div>
  )
}