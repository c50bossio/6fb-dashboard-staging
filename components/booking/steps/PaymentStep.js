'use client'

import { useState, useEffect } from 'react'
import { CreditCardIcon, CurrencyDollarIcon, ShieldCheckIcon, LockClosedIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

function CardInput({ onCardComplete }) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardError, setCardError] = useState(null)
  const [processing, setProcessing] = useState(false)
  
  const handleCardChange = (event) => {
    setCardError(event.error ? event.error.message : null)
    onCardComplete(event.complete)
  }
  
  return (
    <div className="space-y-4">
      <div className="p-4 border border-gray-300 rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
          onChange={handleCardChange}
        />
      </div>
      
      {cardError && (
        <div className="text-red-600 text-sm">{cardError}</div>
      )}
    </div>
  )
}

function PaymentStepContent({ bookingData, shopSettings, onNext, onBack }) {
  const stripe = useStripe()
  const elements = useElements()
  
  const [paymentMethod, setPaymentMethod] = useState(
    shopSettings.requireOnlinePayment ? 'online' : bookingData.paymentMethod || 'online'
  )
  const [savedCards, setSavedCards] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [useNewCard, setUseNewCard] = useState(false)
  const [cardComplete, setCardComplete] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  })
  
  const totalAmount = bookingData.price || 0
  const depositAmount = shopSettings.depositRequired 
    ? (shopSettings.depositPercentage 
        ? totalAmount * (shopSettings.depositPercentage / 100)
        : shopSettings.depositAmount || 0)
    : 0
  
  const paymentAmount = paymentMethod === 'online' 
    ? (shopSettings.depositRequired ? depositAmount : totalAmount)
    : 0
    
  const remainingAmount = totalAmount - paymentAmount
  
  useEffect(() => {
    loadSavedCards()
  }, [])
  
  const loadSavedCards = async () => {
    try {
      const Cards = [
        {
          id: 'card_1',
          brand: 'Visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025,
          isDefault: true
        },
        {
          id: 'card_2',
          brand: 'Mastercard',
          last4: '5555',
          expMonth: 6,
          expYear: 2024,
          isDefault: false
        }
      ]
      
      setSavedCards([]) // Start with no saved cards for demo
    } catch (error) {
      console.error('Error loading saved cards:', error)
    }
  }
  
  const handlePaymentMethodChange = (method) => {
    if (!shopSettings.requireOnlinePayment || method === 'online') {
      setPaymentMethod(method)
      setError(null)
    }
  }
  
  const validateForm = () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      setError('Please fill in all contact information')
      return false
    }
    
    if (paymentMethod === 'online') {
      if (!useNewCard && !selectedCard) {
        setError('Please select a payment card')
        return false
      }
      
      if (useNewCard && !cardComplete) {
        setError('Please enter valid card details')
        return false
      }
    }
    
    return true
  }
  
  const handleContinue = async () => {
    if (!validateForm()) return
    
    setProcessing(true)
    setError(null)
    
    try {
      let paymentData = {
        paymentMethod,
        customerInfo,
        amountPaid: paymentAmount,
        remainingAmount
      }
      
      if (paymentMethod === 'online') {
        if (useNewCard) {
          
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          paymentData.paymentIntentId = 'pi_mock_' + Date.now()
          paymentData.paymentStatus = 'succeeded'
        } else {
          paymentData.cardId = selectedCard
          paymentData.paymentStatus = 'succeeded'
        }
      } else {
        paymentData.paymentStatus = 'pending'
        paymentData.paymentNote = 'Payment to be collected at appointment'
      }
      
      onNext(paymentData)
      
    } catch (err) {
      setError(err.message || 'Payment processing failed')
      setProcessing(false)
    }
  }
  
  const getCardBrandIcon = (brand) => {
    const icons = {
      'Visa': '💳',
      'Mastercard': '💳',
      'American Express': '💳',
      'Discover': '💳'
    }
    return icons[brand] || '💳'
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Information</h2>
        <p className="text-gray-600">
          {shopSettings.acceptOnlinePayment && shopSettings.acceptInPersonPayment
            ? 'Choose your payment method'
            : shopSettings.acceptOnlinePayment
            ? 'Secure online payment'
            : 'Payment will be collected at the shop'}
        </p>
      </div>
      
      {/* Price Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Payment Summary</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Service Total</span>
            <span className="font-medium">${totalAmount.toFixed(2)}</span>
          </div>
          
          {shopSettings.depositRequired && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Deposit ({shopSettings.depositPercentage}%)
                </span>
                <span className="font-medium">${depositAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Due at Shop</span>
                <span className="font-medium">${remainingAmount.toFixed(2)}</span>
              </div>
            </>
          )}
          
          <div className="pt-2 border-t">
            <div className="flex justify-between">
              <span className="font-semibold">
                {paymentMethod === 'online' ? 'Pay Now' : 'Total Due'}
              </span>
              <span className="text-xl font-bold text-olive-600">
                ${paymentMethod === 'online' ? paymentAmount.toFixed(2) : totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payment Method Selection */}
      {shopSettings.acceptOnlinePayment && shopSettings.acceptInPersonPayment && !shopSettings.requireOnlinePayment && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Payment Method</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePaymentMethodChange('online')}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                paymentMethod === 'online'
                  ? 'border-olive-500 bg-olive-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCardIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <div className="font-medium">Pay Online</div>
              <div className="text-xs text-gray-500 mt-1">Secure payment</div>
              
              {paymentMethod === 'online' && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-olive-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
            
            <button
              onClick={() => handlePaymentMethodChange('in-person')}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                paymentMethod === 'in-person'
                  ? 'border-olive-500 bg-olive-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <BanknotesIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <div className="font-medium">Pay at Shop</div>
              <div className="text-xs text-gray-500 mt-1">Cash or card</div>
              
              {paymentMethod === 'in-person' && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-olive-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Contact Information */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
              placeholder="Enter your name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
                placeholder="john@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Online Payment Form */}
      {paymentMethod === 'online' && shopSettings.acceptOnlinePayment && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
          
          {/* Saved Cards */}
          {savedCards.length > 0 && (
            <div className="space-y-2 mb-4">
              {savedCards.map(card => (
                <label
                  key={card.id}
                  className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="payment-card"
                    checked={selectedCard === card.id && !useNewCard}
                    onChange={() => {
                      setSelectedCard(card.id)
                      setUseNewCard(false)
                    }}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{getCardBrandIcon(card.brand)}</span>
                      <span className="font-medium">{card.brand} •••• {card.last4}</span>
                      {card.isDefault && (
                        <span className="ml-2 px-2 py-0.5 bg-olive-100 text-olive-800 text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Expires {card.expMonth}/{card.expYear}
                    </div>
                  </div>
                </label>
              ))}
              
              <button
                onClick={() => {
                  setUseNewCard(true)
                  setSelectedCard(null)
                }}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
              >
                + Use a different card
              </button>
            </div>
          )}
          
          {/* New Card Form */}
          {(useNewCard || savedCards.length === 0) && (
            <div>
              <CardInput onCardComplete={setCardComplete} />
              
              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Save this card for future appointments
                  </span>
                </label>
              </div>
            </div>
          )}
          
          {/* Security Badge */}
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <LockClosedIcon className="h-4 w-4 mr-1" />
            <span>Your payment information is secure and encrypted</span>
          </div>
        </div>
      )}
      
      {/* In-Person Payment Notice */}
      {paymentMethod === 'in-person' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <CurrencyDollarIcon className="h-5 w-5 text-amber-800 mt-0.5" />
            <div className="ml-3">
              <h4 className="font-medium text-yellow-900">Payment at Shop</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Please bring ${totalAmount.toFixed(2)} to your appointment. 
                We accept cash, debit, and credit cards.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                Note: Cancellations less than {shopSettings.cancellationWindow} hours 
                before your appointment may incur a fee.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={processing}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        
        <button
          onClick={handleContinue}
          disabled={processing}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center ${
            processing
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-olive-600 text-white hover:bg-olive-700'
          }`}
        >
          {processing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : paymentMethod === 'online' ? (
            `Pay ${shopSettings.depositRequired ? 'Deposit' : 'Now'} $${paymentAmount.toFixed(2)}`
          ) : (
            'Confirm Booking'
          )}
        </button>
      </div>
    </div>
  )
}

export default function PaymentStep(props) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentStepContent {...props} />
    </Elements>
  )
}