'use client'

import Link from 'next/link'
import { useState } from 'react'
import { 
  SparklesIcon,
  StarIcon,
  CheckIcon,
  ArrowRightIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  GiftIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

export default function VIPPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [smsConsent, setSmsConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const vipBenefits = [
    { icon: ClockIcon, title: 'Priority Booking', description: 'Skip the wait with instant booking access' },
    { icon: GiftIcon, title: 'Free Upgrades', description: 'Complimentary hot towel service & premium products' },
    { icon: StarIcon, title: 'Exclusive Offers', description: 'VIP-only discounts and early access to promotions' },
    { icon: SparklesIcon, title: 'Premium Experience', description: 'Dedicated service from our master barbers' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!phoneNumber || !smsConsent) return

    console.log('VIP signup:', phoneNumber, 'SMS Consent:', smsConsent)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gold-900 to-black flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <StarIconSolid className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to VIP Status!</h1>
          <p className="text-gray-600 mb-6">
            We'll text you at {phoneNumber} with your exclusive VIP booking link and first offer.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-700 text-white rounded-lg hover:from-gold-700 hover:to-gold-800 transition-all"
          >
            Back to Home
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gold-900 via-black to-black">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg">VIP</span>
            </div>
            <span className="text-xl font-bold text-white">BookedBarber VIP</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-6">
            <StarIconSolid className="h-10 w-10 text-white" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Welcome Back!
          </h1>
          <p className="text-2xl text-yellow-400 mb-2">
            We've Missed You
          </p>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Come back this week and enjoy a complimentary upgrade to our exclusive VIP service. 
            Limited time offer for valued customers only.
          </p>
        </div>

        {/* VIP Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {vipBenefits.map((benefit, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-yellow-400/20">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                    <benefit.icon className="h-6 w-6 text-black" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">{benefit.title}</h3>
                  <p className="text-gray-300">{benefit.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* VIP Signup Form */}
        <div className="max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Claim Your VIP Upgrade
              </h2>
              <p className="text-gray-600">
                Enter your phone number to receive your exclusive VIP booking link
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>

              {/* SMS Consent Checkbox - CRITICAL FOR TWILIO */}
              <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                <div className="flex items-start">
                  <input
                    id="smsConsent"
                    type="checkbox"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded mt-0.5"
                    required
                  />
                  <label htmlFor="smsConsent" className="ml-2 text-sm">
                    <span className="font-semibold text-gray-900 flex items-center">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1 text-gold-600" />
                      Yes, text me VIP offers & booking priority! *
                    </span>
                    <span className="text-gray-600 block mt-1">
                      I agree to receive SMS messages about VIP benefits, exclusive offers, 
                      priority booking access, and appointment reminders from BookedBarber. 
                      Message frequency varies (2-10 msgs/month). Message and data rates may apply.
                    </span>
                    <span className="text-xs text-gray-500 block mt-2">
                      Reply STOP to unsubscribe, HELP for assistance. 
                      View our <Link href="/sms-policy" className="text-gold-600 hover:underline">SMS Policy</Link> and{' '}
                      <Link href="/terms" className="text-gold-600 hover:underline">Terms of Service</Link>.
                    </span>
                  </label>
                </div>
              </div>

              {/* SMS Keywords Info */}
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-semibold mb-1">📱 SMS Management:</p>
                <ul className="space-y-1">
                  <li>• Text <strong>STOP</strong> to opt out of all messages</li>
                  <li>• Text <strong>HELP</strong> for support</li>
                  <li>• Text <strong>VIP</strong> or <strong>START</strong> to opt in</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!phoneNumber || !smsConsent}
                className={`w-full py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center ${
                  phoneNumber && smsConsent
                    ? 'bg-gradient-to-r from-gold-600 to-gold-700 text-white hover:from-gold-700 hover:to-gold-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <StarIconSolid className="h-5 w-5 mr-2" />
                Activate VIP Status
              </button>

              {(!phoneNumber || !smsConsent) && (
                <p className="text-xs text-gray-500 text-center">
                  Please enter your phone number and agree to SMS updates to continue
                </p>
              )}
            </div>
          </form>
        </div>

        {/* What's Included */}
        <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-yellow-400/20">
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            Your VIP Upgrade Includes:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span className="text-gray-300">Free hot towel service</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span className="text-gray-300">Premium hair products</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span className="text-gray-300">Complimentary beard oil</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span className="text-gray-300">Priority booking access</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span className="text-gray-300">No-wait guarantee</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span className="text-gray-300">VIP-only time slots</span>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-bold text-white mb-6">What VIP Members Say</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'James K.', text: 'VIP service is next level. Never waiting, always perfect cuts.' },
              { name: 'Michael T.', text: 'The priority booking alone is worth it. Game changer!' },
              { name: 'David R.', text: 'Premium products and service every time. Highly recommend!' }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-yellow-400/20">
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <StarIconSolid key={i} className="h-4 w-4 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 italic mb-2">"{testimonial.text}"</p>
                <p className="text-yellow-400 font-semibold">- {testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="mb-4">© 2025 BookedBarber. All rights reserved. Message and data rates may apply.</p>
          <div className="flex justify-center space-x-6 text-sm">
            <Link href="/terms" className="hover:text-yellow-400">Terms</Link>
            <Link href="/privacy" className="hover:text-yellow-400">Privacy</Link>
            <Link href="/sms-policy" className="hover:text-yellow-400">SMS Policy</Link>
            <Link href="/contact" className="hover:text-yellow-400">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}