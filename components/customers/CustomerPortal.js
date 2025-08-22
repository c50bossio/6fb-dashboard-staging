'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarDaysIcon,
  ClockIcon,
  CreditCardIcon,
  UserIcon,
  StarIcon,
  GiftIcon,
  ShoppingBagIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BellIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

export default function CustomerPortal({ customerId }) {
  const [activeTab, setActiveTab] = useState('appointments')
  const [customerData, setCustomerData] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [savedCards, setSavedCards] = useState([])
  const [preferences, setPreferences] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadCustomerData()
  }, [customerId])

  const loadCustomerData = async () => {
    setLoading(true)
    try {
      // Load customer profile
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()
      
      setCustomerData(customer)
      
      // Load appointments
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          services (name, duration_minutes, price),
          barbershop_staff (name, profile_image)
        `)
        .eq('user_id', customerId)
        .order('datetime', { ascending: false })
        .limit(20)
      
      setAppointments(bookings || [])
      
      // Load purchase history
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      setPurchases(orders || [])
      
      // Load loyalty points
      const { data: loyalty } = await supabase
        .from('loyalty_programs')
        .select('points_balance')
        .eq('customer_id', customerId)
        .single()
      
      setLoyaltyPoints(loyalty?.points_balance || 0)
      
      // Load saved payment methods
      const { data: cards } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
      
      setSavedCards(cards || [])
      
      // Load preferences
      const { data: prefs } = await supabase
        .from('customer_preferences')
        .select('*')
        .eq('customer_id', customerId)
        .single()
      
      setPreferences(prefs || {})
      
    } catch (error) {
      console.error('Failed to load customer data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReschedule = async (appointmentId, newDateTime) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          datetime: newDateTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
      
      if (!error) {
        await loadCustomerData()
        setShowRescheduleModal(false)
        setSelectedAppointment(null)
      }
    } catch (error) {
      console.error('Failed to reschedule:', error)
    }
  }

  const handleCancel = async (appointmentId) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
      
      if (!error) {
        await loadCustomerData()
        setShowCancelModal(false)
        setSelectedAppointment(null)
      }
    } catch (error) {
      console.error('Failed to cancel:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Appointments Tab
  const AppointmentsTab = () => {
    const upcomingAppointments = appointments.filter(
      apt => new Date(apt.datetime) > new Date() && apt.status !== 'cancelled'
    )
    const pastAppointments = appointments.filter(
      apt => new Date(apt.datetime) <= new Date() || apt.status === 'cancelled'
    )
    
    return (
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900">Book New Appointment</p>
            <p className="text-sm text-gray-600">Quick booking with saved preferences</p>
          </button>
          
          <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
            <ArrowPathIcon className="h-8 w-8 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">Rebook Last Service</p>
            <p className="text-sm text-gray-600">Same service, new time</p>
          </button>
          
          <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
            <StarIcon className="h-8 w-8 text-purple-600 mb-2" />
            <p className="font-medium text-gray-900">Book with Favorite</p>
            <p className="text-sm text-gray-600">Your preferred barber</p>
          </button>
        </div>
        
        {/* Upcoming Appointments */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Appointments ({upcomingAppointments.length})
          </h3>
          
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {appointment.services?.name || appointment.service}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center">
                          <CalendarDaysIcon className="h-4 w-4 mr-2" />
                          {formatDate(appointment.datetime)}
                        </p>
                        <p className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          {formatTime(appointment.datetime)} ({appointment.duration} minutes)
                        </p>
                        <p className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-2" />
                          {appointment.barbershop_staff?.name || 'Any available barber'}
                        </p>
                        <p className="flex items-center">
                          <CreditCardIcon className="h-4 w-4 mr-2" />
                          ${appointment.price}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment)
                          setShowRescheduleModal(true)
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment)
                          setShowCancelModal(true)
                        }}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No upcoming appointments</p>
              <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">
                Book an Appointment
              </button>
            </div>
          )}
        </div>
        
        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Past Appointments
            </h3>
            <div className="space-y-3">
              {pastAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {appointment.services?.name || appointment.service}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(appointment.datetime)} at {formatTime(appointment.datetime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Rebook
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Purchases Tab
  const PurchasesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Purchase History
        </h3>
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          Download Receipts
        </button>
      </div>
      
      {purchases.length > 0 ? (
        <div className="space-y-4">
          {purchases.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Order #{order.id.slice(-8)}</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Completed
                </span>
              </div>
              
              <div className="space-y-2">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-t">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">${item.price}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="font-semibold text-gray-900">Total</p>
                <p className="text-xl font-bold text-gray-900">${order.total}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No purchase history</p>
        </div>
      )}
    </div>
  )

  // Loyalty Tab
  const LoyaltyTab = () => (
    <div className="space-y-6">
      {/* Points Balance */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-100">Your Points Balance</p>
            <p className="text-4xl font-bold mt-2">{loyaltyPoints}</p>
            <p className="text-yellow-100 mt-1">Points</p>
          </div>
          <GiftIcon className="h-16 w-16 text-yellow-200" />
        </div>
      </div>
      
      {/* Available Rewards */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Available Rewards
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Free Haircut</h4>
              <span className="text-sm font-medium text-blue-600">500 points</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Redeem for a complimentary haircut service
            </p>
            <button 
              disabled={loyaltyPoints < 500}
              className="w-full py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loyaltyPoints >= 500 ? 'Redeem' : `Need ${500 - loyaltyPoints} more points`}
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">20% Off</h4>
              <span className="text-sm font-medium text-blue-600">200 points</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Get 20% off your next service
            </p>
            <button 
              disabled={loyaltyPoints < 200}
              className="w-full py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loyaltyPoints >= 200 ? 'Redeem' : `Need ${200 - loyaltyPoints} more points`}
            </button>
          </div>
        </div>
      </div>
      
      {/* Points History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Points Activity
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium text-gray-900">Haircut Service</p>
              <p className="text-sm text-gray-600">March 15, 2024</p>
            </div>
            <span className="text-green-600 font-medium">+35 points</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium text-gray-900">Referral Bonus</p>
              <p className="text-sm text-gray-600">March 10, 2024</p>
            </div>
            <span className="text-green-600 font-medium">+50 points</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium text-gray-900">Redeemed: 10% Off</p>
              <p className="text-sm text-gray-600">March 1, 2024</p>
            </div>
            <span className="text-red-600 font-medium">-100 points</span>
          </div>
        </div>
      </div>
    </div>
  )

  // Profile Tab
  const ProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={customerData?.name || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={customerData?.email || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={customerData?.phone || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Birthday
            </label>
            <input
              type="date"
              value={customerData?.birthday || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>
      
      {/* Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Preferences
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.emailReminders}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-gray-700">Email reminders</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.smsReminders}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-gray-700">SMS reminders</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.marketingEmails}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-gray-700">Promotional emails</span>
          </label>
        </div>
      </div>
      
      {/* Saved Payment Methods */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Saved Payment Methods
        </h3>
        {savedCards.length > 0 ? (
          <div className="space-y-3">
            {savedCards.map((card) => (
              <div key={card.id} className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center">
                  <CreditCardIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      •••• {card.last4}
                    </p>
                    <p className="text-sm text-gray-600">
                      Expires {card.exp_month}/{card.exp_year}
                    </p>
                  </div>
                </div>
                <button className="text-red-600 hover:text-red-800 text-sm">
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No saved payment methods</p>
        )}
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">
          Add Payment Method
        </button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'appointments', label: 'Appointments', icon: CalendarDaysIcon },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBagIcon },
    { id: 'loyalty', label: 'Loyalty', icon: GiftIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {customerData?.name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your appointments, view purchase history, and earn rewards
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === 'appointments' && <AppointmentsTab />}
        {activeTab === 'purchases' && <PurchasesTab />}
        {activeTab === 'loyalty' && <LoyaltyTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </div>
      
      {/* Modals would go here for reschedule/cancel */}
    </div>
  )
}