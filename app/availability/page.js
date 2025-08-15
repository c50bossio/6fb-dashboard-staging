'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { 
  CalendarDaysIcon,
  ClockIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

export default function AvailabilityPage() {
  const [loading, setLoading] = useState(true)
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setTimeout(() => {
      const slots = [
        { id: 1, date: 'Today', time: '2:00 PM', barber: 'Marcus Johnson', shop: '6FB Downtown' },
        { id: 2, date: 'Today', time: '3:30 PM', barber: 'Jay Thompson', shop: '6FB Downtown' },
        { id: 3, date: 'Tomorrow', time: '10:00 AM', barber: 'Mike Rodriguez', shop: '6FB Midtown' },
        { id: 4, date: 'Tomorrow', time: '11:30 AM', barber: 'Marcus Johnson', shop: '6FB Downtown' },
        { id: 5, date: 'Saturday', time: '9:00 AM', barber: 'Jay Thompson', shop: '6FB Downtown' },
        { id: 6, date: 'Saturday', time: '1:00 PM', barber: 'Mike Rodriguez', shop: '6FB Midtown' }
      ]
      setAvailableSlots(slots)
      setLoading(false)
    }, 1000)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSlot || !phoneNumber || !smsConsent) return

    console.log('Booking slot:', selectedSlot, 'Phone:', phoneNumber, 'SMS Consent:', smsConsent)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-olive-50 to-gold-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Request Received!</h1>
          <p className="text-gray-600 mb-6">
            We'll text you at {phoneNumber} to confirm your appointment details.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
          >
            Back to Home
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-olive-50 to-gold-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-olive-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">6FB</span>
            </div>
            <span className="text-xl font-bold text-gray-900">BookedBarber</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <CalendarDaysIcon className="h-16 w-16 text-olive-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Limited Spots Available!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Book your appointment now before these premium time slots are gone. 
            Get instant SMS confirmation and reminders.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading available appointments...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Available Slots */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-olive-600" />
                Select Your Preferred Time
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableSlots.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSlot?.id === slot.id
                        ? 'border-olive-500 bg-olive-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{slot.date}</p>
                        <p className="text-lg text-olive-600">{slot.time}</p>
                        <p className="text-sm text-gray-600 mt-1">with {slot.barber}</p>
                        <p className="text-xs text-gray-500">{slot.shop}</p>
                      </div>
                      {selectedSlot?.id === slot.id && (
                        <CheckCircleIcon className="h-5 w-5 text-olive-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone Number and SMS Consent */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <PhoneIcon className="h-5 w-5 mr-2 text-olive-600" />
                Your Contact Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>

                {/* SMS Consent Checkbox - CRITICAL FOR TWILIO */}
                <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <input
                      id="smsConsent"
                      type="checkbox"
                      checked={smsConsent}
                      onChange={(e) => setSmsConsent(e.target.checked)}
                      className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded mt-0.5"
                      required
                    />
                    <label htmlFor="smsConsent" className="ml-2 text-sm">
                      <span className="font-semibold text-gray-900 flex items-center">
                        <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1 text-olive-600" />
                        Yes, text me appointment updates! *
                      </span>
                      <span className="text-gray-600 block mt-1">
                        I agree to receive SMS appointment confirmations, reminders, and occasional 
                        promotional offers from BookedBarber and participating barbershops. 
                        Message frequency varies (2-10 msgs/month). Message and data rates may apply.
                      </span>
                      <span className="text-xs text-gray-500 block mt-2">
                        Reply STOP to unsubscribe, HELP for assistance. 
                        View our <Link href="/sms-policy" className="text-olive-600 hover:underline">SMS Policy</Link> and{' '}
                        <Link href="/terms" className="text-olive-600 hover:underline">Terms of Service</Link>.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <p className="font-semibold mb-1">📱 SMS Keywords:</p>
                  <ul className="space-y-1">
                    <li>• Text <strong>STOP</strong> to opt out at any time</li>
                    <li>• Text <strong>HELP</strong> for support</li>
                    <li>• Text <strong>START</strong> to opt back in</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={!selectedSlot || !phoneNumber || !smsConsent}
                className={`inline-flex items-center px-8 py-4 rounded-lg font-semibold text-lg transition-all ${
                  selectedSlot && phoneNumber && smsConsent
                    ? 'bg-olive-600 text-white hover:bg-olive-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CalendarDaysIcon className="h-5 w-5 mr-2" />
                Lock In My Appointment
              </button>
              
              {(!selectedSlot || !phoneNumber || !smsConsent) && (
                <p className="text-sm text-gray-500 mt-2">
                  Please select a time slot and agree to SMS updates to continue
                </p>
              )}
            </div>
          </form>
        )}

        {/* Trust Badges */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">Trusted by thousands of customers</p>
          <div className="flex justify-center space-x-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">10,000+</p>
              <p className="text-sm text-gray-600">Happy Customers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">4.9/5</p>
              <p className="text-sm text-gray-600">Average Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">24/7</p>
              <p className="text-sm text-gray-600">SMS Support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="mb-4">© 2025 BookedBarber. All rights reserved.</p>
          <div className="flex justify-center space-x-6 text-sm">
            <Link href="/terms" className="hover:text-olive-400">Terms</Link>
            <Link href="/privacy" className="hover:text-olive-400">Privacy</Link>
            <Link href="/sms-policy" className="hover:text-olive-400">SMS Policy</Link>
            <Link href="/contact" className="hover:text-olive-400">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}