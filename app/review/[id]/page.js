'use client'

import { 
  StarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  UserCircleIcon,
  PhoneIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function ReviewPage() {
  const params = useParams()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setAppointment({
        id: params.id,
        barbershop: 'Headlines Barbershop',
        barber: 'Marcus Johnson',
        service: 'Fade Cut & Beard Trim',
        date: 'December 15, 2024'
      })
      setLoading(false)
    }, 1000)
  }, [params.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) return

    console.log('Review submitted:', {
      rating,
      reviewText,
      phoneNumber,
      smsConsent,
      appointmentId: params.id
    })
    setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your appointment details...</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-olive-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You for Your Review!</h1>
          <p className="text-gray-600 mb-6">
            Your feedback helps us provide better service to all our customers.
            {smsConsent && phoneNumber && (
              <span className="block mt-2">
                We'll text you at {phoneNumber} with exclusive offers as a thank you!
              </span>
            )}
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

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Appointment Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            How was your experience?
          </h1>
          <p className="text-gray-600 mb-4">
            We'd love to hear about your visit to {appointment.barbershop}
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <UserCircleIcon className="h-12 w-12 text-gray-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{appointment.barber}</p>
                <p className="text-sm text-gray-600">{appointment.service}</p>
                <p className="text-sm text-gray-500">{appointment.date}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Rate Your Experience
            </h2>
            
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none"
                >
                  {star <= (hoveredRating || rating) ? (
                    <StarIconSolid className="h-10 w-10 text-yellow-400 transition-all" />
                  ) : (
                    <StarIcon className="h-10 w-10 text-gray-300 transition-all" />
                  )}
                </button>
              ))}
            </div>
            
            <p className="text-center text-sm text-gray-600">
              {rating === 0 && 'Click to rate'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Great'}
              {rating === 5 && 'Excellent!'}
            </p>
          </div>

          {/* Review Text */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Tell Us More (Optional)
            </h2>
            
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              placeholder="What did you like about your visit? Any suggestions for improvement?"
            />
          </div>

          {/* SMS Opt-in Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-olive-600" />
              Stay Connected (Optional)
            </h2>

            <p className="text-gray-600 mb-4">
              Want to receive exclusive offers and priority booking? Enter your phone number below.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {phoneNumber && (
                <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <input
                      id="smsConsent"
                      type="checkbox"
                      checked={smsConsent}
                      onChange={(e) => setSmsConsent(e.target.checked)}
                      className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded mt-0.5"
                    />
                    <label htmlFor="smsConsent" className="ml-2 text-sm">
                      <span className="font-semibold text-gray-900">
                        Yes, send me exclusive offers via SMS!
                      </span>
                      <span className="text-gray-600 block mt-1">
                        I agree to receive SMS messages with special offers, appointment reminders, 
                        and updates from BookedBarber and {appointment.barbershop}. 
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
              )}

              {/* SMS Keywords Info */}
              {phoneNumber && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <p className="font-semibold mb-1">📱 SMS Keywords:</p>
                  <ul className="space-y-1">
                    <li>• Text <strong>STOP</strong> to opt out at any time</li>
                    <li>• Text <strong>HELP</strong> for support</li>
                    <li>• Text <strong>START</strong> or <strong>SUBSCRIBE</strong> to opt in</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={rating === 0}
              className={`inline-flex items-center px-8 py-3 rounded-lg font-semibold transition-all ${
                rating > 0
                  ? 'bg-olive-600 text-white hover:bg-olive-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Submit Review
            </button>
            
            {rating === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Please select a star rating to continue
              </p>
            )}
          </div>
        </form>

        {/* Trust Message */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Your review helps other customers make informed decisions.</p>
          <p>All reviews are verified and authentic.</p>
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