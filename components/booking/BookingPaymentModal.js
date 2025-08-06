'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../SupabaseAuthProvider'
import PaymentForm from '../payment/PaymentForm'
import {
  XMarkIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

export default function BookingPaymentModal({
  isOpen,
  onClose,
  booking,
  paymentType = 'full_payment', // 'full_payment', 'deposit', 'remaining_balance'
  onPaymentSuccess,
  onPaymentError
}) {
  const { user } = useAuth()
  const [clientSecret, setClientSecret] = useState('')
  const [amount, setAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [serviceInfo, setServiceInfo] = useState(null)

  useEffect(() => {
    if (isOpen && booking) {
      initializePayment()
    }
  }, [isOpen, booking, paymentType])

  const initializePayment = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          customer_id: booking.customer_id || user?.id,
          barber_id: booking.barber_id,
          service_id: booking.service_id,
          payment_type: paymentType
        })
      })

      const data = await response.json()

      if (data.success) {
        setClientSecret(data.client_secret)
        setAmount(data.amount)
        setServiceInfo(data.service_info)
      } else {
        setError(data.error || 'Failed to initialize payment')
      }
    } catch (err) {
      setError('Failed to initialize payment')
      console.error('Payment initialization error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      // Confirm payment on backend
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntent.id
        })
      })

      const data = await response.json()

      if (data.success) {
        onPaymentSuccess?.(paymentIntent, data)
        onClose()
      } else {
        onPaymentError?.(new Error(data.error || 'Payment confirmation failed'))
      }
    } catch (err) {
      console.error('Payment confirmation error:', err)
      onPaymentError?.(err)
    }
  }

  const handlePaymentError = (error) => {
    setError(error.message || 'Payment failed')
    onPaymentError?.(error)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 rounded-full p-2">
                <CreditCardIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {paymentType === 'deposit' ? 'Pay Deposit' : 
                   paymentType === 'remaining_balance' ? 'Pay Balance' : 'Complete Payment'}
                </h3>
                <p className="text-sm text-gray-500">Secure payment processing</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Booking Details */}
            {booking && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Booking Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CalendarDaysIcon className="h-4 w-4" />
                    <span>{new Date(booking.appointment_date).toLocaleDateString()} at {booking.start_time}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <UserIcon className="h-4 w-4" />
                    <span>{booking.barber_name || 'Professional Barber'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4" />
                    <span>{serviceInfo?.duration_minutes || 30} minutes</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span>
                      {paymentType === 'deposit' && serviceInfo 
                        ? `${serviceInfo.deposit_percentage}% deposit of $${serviceInfo.base_price}`
                        : `Service: $${serviceInfo?.base_price || '0.00'}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="animate-pulse space-y-6">
                <div className="bg-gray-200 rounded-lg h-20"></div>
                <div className="bg-gray-200 rounded-lg h-32"></div>
                <div className="bg-gray-200 rounded-lg h-12"></div>
              </div>
            ) : clientSecret && amount > 0 ? (
              /* Payment Form */
              <PaymentForm
                clientSecret={clientSecret}
                amount={amount}
                serviceName={serviceInfo?.name || booking?.service_name || 'Barbershop Service'}
                paymentType={paymentType}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            ) : (
              <div className="text-center py-8">
                <ExclamationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to process payment</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Please try again or contact support if the problem persists.
                </p>
              </div>
            )}

            {/* Payment Types Info */}
            {paymentType === 'deposit' && serviceInfo?.deposit_required && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Deposit Payment</p>
                    <p>
                      You're paying a ${((serviceInfo.base_price * serviceInfo.deposit_percentage) / 100).toFixed(2)} deposit now. 
                      The remaining ${(serviceInfo.base_price - ((serviceInfo.base_price * serviceInfo.deposit_percentage) / 100)).toFixed(2)} 
                      will be collected at your appointment.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Powered by Stripe</span>
              <span>256-bit SSL encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}