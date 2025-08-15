'use client'

import { useState } from 'react'
import { CheckCircleIcon, CalendarIcon, ClockIcon, MapPinIcon, UserIcon, CreditCardIcon, DocumentDuplicateIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

export default function ConfirmationStep({ bookingData, shopSettings, onComplete, onBack, isLoading }) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [notes, setNotes] = useState(bookingData.notes || '')
  const [copied, setCopied] = useState(false)
  
  const handleConfirm = () => {
    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions')
      return
    }
    
    const finalBookingData = {
      ...bookingData,
      notes,
      marketingConsent,
      agreedToTerms,
      confirmedAt: new Date().toISOString()
    }
    
    onComplete(finalBookingData)
  }
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const generateBookingText = () => {
    return `
Appointment at ${bookingData.locationDetails?.name}
Date: ${bookingData.displayDateTime?.date}
Time: ${bookingData.displayDateTime?.time}
Service: ${bookingData.serviceDetails?.name}
Barber: ${bookingData.barberDetails?.name || 'First Available'}
Duration: ${bookingData.duration} minutes
Total: $${bookingData.price?.toFixed(2)}
Payment: ${bookingData.paymentMethod === 'online' ? 'Paid Online' : 'Pay at Shop'}
    `.trim()
  }
  
  const formatPhoneNumber = (phone) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  }
  
  return (
    <div className="space-y-6">
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircleIcon className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Almost Done!</h2>
        <p className="text-gray-600 mt-2">Review your appointment details and confirm your booking</p>
      </motion.div>
      
      {/* Booking Summary Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 space-y-4">
          {/* Location */}
          <div className="flex items-start">
            <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{bookingData.locationDetails?.name}</p>
              <p className="text-sm text-gray-600">{bookingData.locationDetails?.address}</p>
              <p className="text-sm text-gray-600">{bookingData.locationDetails?.phone}</p>
            </div>
          </div>
          
          {/* Date & Time */}
          <div className="flex items-start">
            <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{bookingData.displayDateTime?.date}</p>
              <p className="text-sm text-gray-600">{bookingData.displayDateTime?.time}</p>
            </div>
          </div>
          
          {/* Barber */}
          <div className="flex items-start">
            <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {bookingData.barberDetails?.name || 'First Available Barber'}
              </p>
              {bookingData.barberDetails?.title && (
                <p className="text-sm text-gray-600">{bookingData.barberDetails.title}</p>
              )}
            </div>
          </div>
          
          {/* Service */}
          <div className="flex items-start">
            <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{bookingData.serviceDetails?.name}</p>
              <p className="text-sm text-gray-600">{bookingData.duration} minutes</p>
              {bookingData.addOns && bookingData.addOns.length > 0 && (
                <div className="mt-1">
                  <p className="text-sm text-gray-600">Add-ons:</p>
                  {bookingData.addOns.map((addon, index) => (
                    <p key={index} className="text-sm text-gray-500 ml-2">
                      • {addon.name} (+${addon.price})
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Payment */}
          <div className="flex items-start">
            <CreditCardIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                Total: ${bookingData.price?.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                {bookingData.paymentMethod === 'online' 
                  ? `✅ Paid Online${bookingData.amountPaid < bookingData.price ? ` (Deposit: $${bookingData.amountPaid?.toFixed(2)})` : ''}`
                  : '💵 Pay at Shop'}
              </p>
              {bookingData.remainingAmount > 0 && (
                <p className="text-sm text-orange-600">
                  Remaining balance: ${bookingData.remainingAmount?.toFixed(2)} due at appointment
                </p>
              )}
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-gray-900 mb-2">Contact Information</p>
            <div className="space-y-1">
              <div className="flex items-center text-sm text-gray-600">
                <UserIcon className="h-4 w-4 mr-2" />
                {bookingData.customerInfo?.name}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                {bookingData.customerInfo?.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <PhoneIcon className="h-4 w-4 mr-2" />
                {formatPhoneNumber(bookingData.customerInfo?.phone || '')}
              </div>
            </div>
          </div>
        </div>
        
        {/* Copy Button */}
        <div className="px-6 pb-4">
          <button
            onClick={() => copyToClipboard(generateBookingText())}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Booking Details'}
          </button>
        </div>
      </div>
      
      {/* Special Requests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Special Requests or Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
          placeholder="Any special requests, parking instructions, or things your barber should know..."
        />
      </div>
      
      {/* Policies & Agreements */}
      <div className="space-y-3">
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded mt-0.5"
          />
          <span className="ml-2 text-sm text-gray-600">
            I agree to the{' '}
            <a href="#" className="text-olive-600 hover:underline">terms and conditions</a>
            {' '}and understand the{' '}
            <a href="#" className="text-olive-600 hover:underline">cancellation policy</a>
            {' '}(cancellations less than {shopSettings.cancellationWindow} hours before 
            appointment may incur a fee)
          </span>
        </label>
        
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded mt-0.5"
          />
          <span className="ml-2 text-sm text-gray-600">
            I would like to receive appointment reminders, special offers, and updates via SMS and email
          </span>
        </label>
      </div>
      
      {/* Important Reminders */}
      <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-olive-900 mb-2">Remember to:</h4>
        <ul className="text-sm text-olive-800 space-y-1">
          <li>• Arrive 5 minutes early for check-in</li>
          {bookingData.paymentMethod === 'in-person' && (
            <li>• Bring ${bookingData.price?.toFixed(2)} for payment (cash or card accepted)</li>
          )}
          <li>• You'll receive a confirmation email and SMS shortly</li>
          <li>• A reminder will be sent 24 hours before your appointment</li>
        </ul>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        
        <button
          onClick={handleConfirm}
          disabled={!agreedToTerms || isLoading}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center ${
            !agreedToTerms || isLoading
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-moss-600 text-white hover:bg-green-700'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Confirming...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Confirm Booking
            </>
          )}
        </button>
      </div>
    </div>
  )
}