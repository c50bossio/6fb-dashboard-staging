'use client'

import {
  XMarkIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import PaymentForm from '../payment/PaymentForm'
import { useAuth } from '../SupabaseAuthProvider'
import TipSelectionWidget from '../checkout/TipSelectionWidget'

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
  const [serviceAmount, setServiceAmount] = useState(0)
  const [processingFee, setProcessingFee] = useState(0)
  const [feeModel, setFeeModel] = useState('barbershop_absorbs')
  const [tipAmount, setTipAmount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)

  useEffect(() => {
    if (isOpen && booking) {
      initializePayment()
    }
  }, [isOpen, booking, paymentType])

  // Update total amount when tip changes
  useEffect(() => {
    const subtotal = serviceAmount / 100 // Convert from cents
    const tip = tipAmount
    const fee = processingFee / 100 // Convert from cents
    
    let total = subtotal + tip
    if (feeModel === 'customer_pays') {
      total += fee
    }
    
    setTotalAmount(total)
  }, [serviceAmount, tipAmount, processingFee, feeModel])

  const initializePayment = async () => {
    try {
      setLoading(true)
      setError('')

      // First, check shop's accepted payment methods
      const shopId = booking.shop_id || booking.barbershop_id
      if (shopId) {
        const paymentMethodsResponse = await fetch(`/api/shop/payment-methods?shop_id=${shopId}`)
        if (paymentMethodsResponse.ok) {
          const { accepted_methods } = await paymentMethodsResponse.json()
          
          // Check if card payments are accepted
          if (!accepted_methods.includes('card')) {
            setError('Online card payments are not currently accepted by this shop. Please contact the shop directly.')
            setLoading(false)
            return
          }
        }
      }

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
          payment_type: paymentType,
          barbershop_id: shopId,
          amount: booking.price || booking.service_price,
          tip_amount: tipAmount
        })
      })

      const data = await response.json()

      if (data.success) {
        setClientSecret(data.client_secret)
        setAmount(data.amount * 100) // Convert to cents for Stripe
        setServiceInfo(data.service_info)
        
        // Set fee information from the response
        setServiceAmount((data.service_amount || data.amount) * 100) // Convert to cents
        setProcessingFee((data.processing_fee || 0) * 100) // Convert to cents
        
        // Determine fee model from the response
        if (data.fee_configuration) {
          setFeeModel(data.fee_configuration.model)
        } else if (data.routing && data.routing.fee_paid_by === 'customer') {
          setFeeModel('customer_pays')
        }
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

            {/* Tip Selection Widget */}
            {!loading && booking && (
              <TipSelectionWidget
                barbershopId={booking.shop_id || booking.barbershop_id}
                barberId={booking.barber_id}
                serviceId={booking.service_id}
                serviceAmount={serviceAmount / 100} // Convert from cents
                onTipChange={setTipAmount}
                className="mb-6"
              />
            )}

            {/* Total Amount Summary */}
            {!loading && totalAmount > 0 && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Payment Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service</span>
                    <span className="text-gray-900">${(serviceAmount / 100).toFixed(2)}</span>
                  </div>
                  {tipAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tip</span>
                      <span className="text-gray-900">${tipAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {feeModel === 'customer_pays' && processingFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processing Fee</span>
                      <span className="text-gray-900">${(processingFee / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-blue-200 font-semibold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${totalAmount.toFixed(2)}</span>
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
              <PaymentForm
                clientSecret={clientSecret}
                amount={amount}
                serviceName={serviceInfo?.name || booking?.service_name || 'Barbershop Service'}
                paymentType={paymentType}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                serviceAmount={serviceAmount}
                processingFee={processingFee}
                feeModel={feeModel}
                tipAmount={tipAmount * 100} // Convert to cents
                totalAmount={totalAmount * 100} // Convert to cents
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
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
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

            {/* Fee Transparency Notice */}
            {feeModel === 'customer_pays' && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <InformationCircleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium mb-1">Processing Fee Notice</p>
                    <p>
                      A small processing fee (2.9% + $0.30) is added to cover payment processing costs. 
                      This ensures your barber receives 100% of the service amount. This is an industry-standard 
                      practice adopted by 68% of service businesses.
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