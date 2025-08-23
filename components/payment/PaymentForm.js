'use client'

import {
  CreditCardIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useState, useEffect } from 'react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_...')

const PaymentFormContent = ({ 
  clientSecret, 
  amount, 
  serviceName, 
  paymentType, 
  onSuccess, 
  onError,
  serviceAmount,
  processingFee,
  feeModel
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setMessage('')

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/bookings/payment-success`,
      },
      redirect: 'if_required'
    })

    if (error) {
      setMessage(error.message)
      setIsProcessing(false)
      onError?.(error)
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Payment succeeded!')
      setIsProcessing(false)
      onSuccess?.(paymentIntent)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Summary with Fee Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-3">
          {/* Service Amount */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{serviceName}</h3>
              <p className="text-sm text-gray-600">
                {paymentType === 'deposit' ? 'Deposit Payment' : 
                 paymentType === 'remaining_balance' ? 'Remaining Balance' : 'Service'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-medium text-gray-900">
                ${((serviceAmount || amount) / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Processing Fee if customer pays */}
          {feeModel === 'customer_pays' && processingFee > 0 && (
            <>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-gray-600">Processing Fee</span>
                    <div className="group relative">
                      <InformationCircleIcon className="h-4 w-4 text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="max-w-xs">
                          This fee covers payment processing costs (2.9% + $0.30).
                          The barbershop receives 100% of the service amount.
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                          <div className="border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    +${(processingFee / 100).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-gray-300 pt-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">Total Amount</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${(amount / 100).toFixed(2)}
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right mt-1">USD</div>
              </div>
            </>
          )}

          {/* Just show total if barbershop absorbs fee */}
          {feeModel !== 'customer_pays' && (
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                ${(amount / 100).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">USD</div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Element */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <CreditCardIcon className="h-5 w-5 text-gray-400" />
          <label className="block text-sm font-medium text-gray-700">
            Payment Information
          </label>
        </div>
        
        <div className="border border-gray-300 rounded-lg p-4">
          <PaymentElement 
            options={{
              layout: {
                type: 'tabs',
                defaultCollapsed: false,
              }
            }}
          />
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <LockClosedIcon className="h-4 w-4" />
        <span>Your payment information is secure and encrypted</span>
      </div>

      {/* Error/Success Message */}
      {message && (
        <div className={`rounded-md p-4 ${
          message.includes('succeeded') 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex">
            {message.includes('succeeded') ? (
              <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            )}
            <span className="text-sm">{message}</span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white transition-colors ${
          isProcessing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
        }`}
      >
        {isProcessing ? (
          <>
            <ClockIcon className="h-5 w-5 mr-2 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <LockClosedIcon className="h-5 w-5 mr-2" />
            Pay ${(amount / 100).toFixed(2)}
          </>
        )}
      </button>
    </form>
  )
}

export default function PaymentForm({ 
  clientSecret, 
  amount, 
  serviceName, 
  paymentType = 'full_payment',
  onSuccess,
  onError,
  serviceAmount,
  processingFee,
  feeModel
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !clientSecret) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="bg-gray-200 rounded-lg h-20"></div>
        <div className="bg-gray-200 rounded-lg h-32"></div>
        <div className="bg-gray-200 rounded-lg h-12"></div>
      </div>
    )
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#059669',
        colorBackground: '#ffffff',
        colorText: '#374151',
        colorDanger: '#dc2626',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  }

  return (
    <Elements options={options} stripe={stripePromise}>
      <PaymentFormContent
        clientSecret={clientSecret}
        amount={amount}
        serviceName={serviceName}
        paymentType={paymentType}
        onSuccess={onSuccess}
        onError={onError}
        serviceAmount={serviceAmount}
        processingFee={processingFee}
        feeModel={feeModel}
      />
    </Elements>
  )
}