'use client'

import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import BookingPaymentModal from '../../../components/booking/BookingPaymentModal'
import { useAuth } from '../../../components/SupabaseAuthProvider'

export default function BookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    booking: null,
    paymentType: 'full_payment'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load services
      const servicesResponse = await fetch('/api/services')
      const servicesData = await servicesResponse.json()
      if (servicesData.success !== false) {
        setServices(servicesData.services || [])
      }

      // Load user's bookings from database
      if (user?.id) {
        const bookingsResponse = await fetch(`/api/appointments?client_id=${user.id}`)
        const bookingsData = await bookingsResponse.json()
        
        if (bookingsData.appointments) {
          setBookings(bookingsData.appointments)
        } else if (bookingsData.error) {
          console.error('Failed to load bookings:', bookingsData.error)
          setBookings([])
        }
      } else {
        setBookings([])
      }

    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openPaymentModal = (booking, paymentType = 'full_payment') => {
    setPaymentModal({
      isOpen: true,
      booking,
      paymentType
    })
  }

  const closePaymentModal = () => {
    setPaymentModal({
      isOpen: false,
      booking: null,
      paymentType: 'full_payment'
    })
  }

  const handlePaymentSuccess = (paymentIntent, data) => {
    console.log('Payment successful:', paymentIntent, data)
    // Update booking status
    setBookings(prev => prev.map(booking => 
      booking.id === paymentModal.booking?.id 
        ? { ...booking, payment_status: 'paid' }
        : booking
    ))
    closePaymentModal()
  }

  const handlePaymentError = (error) => {
    console.error('Payment failed:', error)
    alert(`Payment failed: ${error.message}`)
  }

  const getPaymentStatusBadge = (paymentStatus) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Payment Pending' },
      deposit_paid: { bg: 'bg-olive-100', text: 'text-olive-800', label: 'Deposit Paid' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      refunded: { bg: 'bg-red-100', text: 'text-red-800', label: 'Refunded' }
    }
    
    const config = statusConfig[paymentStatus] || statusConfig.pending
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-gray-600 mt-2">Manage your appointments and payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">{booking.service_name}</h3>
              <p className="text-amber-100 text-sm">{booking.barber_name}</p>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <CalendarDaysIcon className="h-4 w-4" />
                <span className="text-sm">{new Date(booking.scheduled_at).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <ClockIcon className="h-4 w-4" />
                <span className="text-sm">{booking.start_time} - {booking.end_time}</span>
              </div>

              <div className="flex items-center space-x-2 text-gray-600">
                <UserIcon className="h-4 w-4" />
                <span className="text-sm">{booking.client_name || booking.customer_name || 'Customer'}</span>
              </div>

              {/* Payment Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Payment Status</span>
                {getPaymentStatusBadge(booking.payment_status)}
              </div>

              {/* Payment Actions */}
              <div className="pt-4 border-t border-gray-100">
                {booking.payment_status === 'pending' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => openPaymentModal(booking, 'full_payment')}
                      className="w-full flex items-center justify-center px-4 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CreditCardIcon className="h-4 w-4 mr-2" />
                      Pay Now
                    </button>
                    
                    {/* Check if service requires deposit */}
                    {services.find(s => s.id === booking.service_id)?.deposit_required && (
                      <button
                        onClick={() => openPaymentModal(booking, 'deposit')}
                        className="w-full flex items-center justify-center px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
                      >
                        <CreditCardIcon className="h-4 w-4 mr-2" />
                        Pay Deposit
                      </button>
                    )}
                  </div>
                )}

                {booking.payment_status === 'deposit_paid' && (
                  <button
                    onClick={() => openPaymentModal(booking, 'remaining_balance')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <CreditCardIcon className="h-4 w-4 mr-2" />
                    Pay Remaining Balance
                  </button>
                )}

                {booking.payment_status === 'paid' && (
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Payment Complete</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {bookings.length === 0 && (
        <div className="text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any bookings yet. Book your first appointment!
          </p>
        </div>
      )}

      {/* Payment Modal */}
      <BookingPaymentModal
        isOpen={paymentModal.isOpen}
        onClose={closePaymentModal}
        booking={paymentModal.booking}
        paymentType={paymentModal.paymentType}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </div>
  )
}