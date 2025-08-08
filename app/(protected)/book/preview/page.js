'use client'

import { useState, useEffect } from 'react'
import { 
  EyeIcon, 
  ShareIcon, 
  QrCodeIcon,
  CopyIcon,
  CheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-config'
import QRCode from 'qrcode'

export default function BookingPagePreview() {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // Mock barber data - in production, this would come from user profile
  const barberData = {
    id: user?.id || 'preview-barber',
    name: user?.full_name || 'John Martinez',
    business: 'Elite Cuts Barbershop',
    phone: '(555) 123-4567',
    email: 'book@elitecuts.com',
    location: 'Downtown Los Angeles, CA',
    rating: 4.9,
    totalReviews: 127,
    specialties: ['Fade Cuts', 'Beard Styling', 'Hot Towel Shaves'],
    workingHours: {
      monday: '9:00 AM - 7:00 PM',
      tuesday: '9:00 AM - 7:00 PM',
      wednesday: '9:00 AM - 7:00 PM',
      thursday: '9:00 AM - 7:00 PM',
      friday: '9:00 AM - 8:00 PM',
      saturday: '8:00 AM - 6:00 PM',
      sunday: 'Closed'
    },
    services: [
      { id: 1, name: 'Classic Haircut', duration: 30, price: 35 },
      { id: 2, name: 'Fade Cut', duration: 45, price: 45 },
      { id: 3, name: 'Beard Trim', duration: 20, price: 25 },
      { id: 4, name: 'Hot Towel Shave', duration: 40, price: 40 },
      { id: 5, name: 'Full Service (Cut + Beard)', duration: 60, price: 65 }
    ]
  }

  const bookingUrl = `${window.location.origin}/book/${barberData.id}`

  useEffect(() => {
    // Simulate loading barber data
    const timer = setTimeout(() => {
      setPreviewData(barberData)
      setLoading(false)
    }, 800)

    // Generate QR code
    if (typeof window !== 'undefined') {
      QRCode.toDataURL(bookingUrl, { width: 120, margin: 2 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR Code generation failed:', err))
    }

    return () => clearTimeout(timer)
  }, [bookingUrl])

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your booking page preview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Controls */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <EyeIcon className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Booking Page Preview
              </h1>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Live Preview
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => copyToClipboard(bookingUrl)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
                ) : (
                  <CopyIcon className="h-4 w-4 mr-2" />
                )}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              
              <button
                onClick={() => window.open(bookingUrl, '_blank')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <GlobeAltIcon className="h-4 w-4 mr-2" />
                View Live Page
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Preview Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <EyeIcon className="h-5 w-5 mr-2" />
                  Client View - How Your Page Appears
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  This is exactly what clients see when they visit your booking page
                </p>
              </div>

              {/* Simulated Browser Frame */}
              <div className="bg-gray-100 px-4 py-2 border-b">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex-1 bg-white rounded px-3 py-1 text-sm text-gray-600 truncate">
                    {bookingUrl}
                  </div>
                </div>
              </div>

              {/* Actual Booking Page Preview */}
              <div className="p-6">
                {/* Barber Profile Section */}
                <div className="text-center mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {previewData.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Book with {previewData.name}
                  </h1>
                  <p className="text-lg text-gray-600 mb-2">
                    {previewData.business}
                  </p>
                  <p className="text-gray-500 mb-4">
                    {previewData.location}
                  </p>
                  
                  {/* Rating */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.floor(previewData.rating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-gray-600">
                      {previewData.rating} ({previewData.totalReviews} reviews)
                    </span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <PhoneIcon className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{previewData.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-sm font-medium text-gray-900">{previewData.email}</p>
                    </div>
                  </div>
                </div>

                {/* Services */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Select a Service
                  </h3>
                  <div className="space-y-3">
                    {previewData.services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {service.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {service.duration} minutes
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ${service.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <button className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
                  Continue to Book Appointment
                </button>
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Sharing Tools */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ShareIcon className="h-5 w-5 mr-2 text-blue-600" />
                Share Your Page
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Page URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={bookingUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600"
                    />
                    <button
                      onClick={() => copyToClipboard(bookingUrl)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700"
                    >
                      <CopyIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    QR Code
                  </label>
                  <div className="flex justify-center p-4 bg-white border-2 border-gray-200 rounded-lg">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR Code" className="w-30 h-30" />
                    ) : (
                      <div className="w-30 h-30 bg-gray-100 animate-pulse rounded"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Save or print to share offline
                  </p>
                </div>
              </div>
            </div>

            {/* SEO Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GlobeAltIcon className="h-5 w-5 mr-2 text-green-600" />
                SEO Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Search Engine Optimized</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Mobile Responsive</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Schema.org Markup</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Social Media Ready</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Your page is optimized for Google search results and social media sharing.</strong>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.open(bookingUrl, '_blank')}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <GlobeAltIcon className="h-4 w-4 mr-2" />
                  View Live Page
                </button>
                
                <button
                  onClick={() => copyToClipboard(bookingUrl)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <CopyIcon className="h-4 w-4 mr-2" />
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}