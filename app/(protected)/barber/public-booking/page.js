'use client'

import { 
  GlobeAltIcon, 
  ShareIcon,
  QrCodeIcon,
  ClipboardIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  LinkIcon,
  DevicePhoneMobileIcon,
  PhotoIcon,
  EyeIcon,
  EnvelopeIcon,
  StarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import QRCode from 'qrcode'
import { useState, useEffect } from 'react'


import { useAuth } from '@/components/SupabaseAuthProvider'

export default function PublicBookingPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('preview')
  const [copied, setCopied] = useState({})
  const [qrSize, setQrSize] = useState(200)
  const [downloadingQR, setDownloadingQR] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔄 PublicBookingPage mounted, all icons should be ClipboardIcon')
  }, [])

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
    services: [
      { id: 1, name: 'Classic Haircut', duration: 30, price: 35 },
      { id: 2, name: 'Fade Cut', duration: 45, price: 45 },
      { id: 3, name: 'Beard Trim', duration: 20, price: 25 },
      { id: 4, name: 'Hot Towel Shave', duration: 40, price: 40 },
      { id: 5, name: 'Full Service (Cut + Beard)', duration: 60, price: 65 }
    ]
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://6fb-ai.com'
  const barberId = user?.id || 'your-barber-id'
  const barberName = user?.full_name || 'Your Name'
  const businessName = 'Elite Cuts Barbershop'

  const urls = {
    main: `${baseUrl}/book/${barberId}`,
    utmSocial: `${baseUrl}/book/${barberId}?utm_source=social&utm_medium=share&utm_campaign=booking`,
    utmEmail: `${baseUrl}/book/${barberId}?utm_source=email&utm_medium=direct&utm_campaign=booking`,
    utmPrint: `${baseUrl}/book/${barberId}?utm_source=print&utm_medium=qr&utm_campaign=booking`
  }

  const shareTemplates = {
    social: {
      instagram: `Book your appointment with ${barberName} at ${businessName}! 🔥✂️\n\nEasy online booking: ${urls.utmSocial}\n\n#BookNow #Barbershop #EliteCuts`,
      facebook: `Looking for a great haircut? Book with ${barberName} at ${businessName}!\n\nQuick and easy online booking: ${urls.utmSocial}`,
      twitter: `Book your appointment with ${barberName} 🔥✂️\n\n${urls.utmSocial}\n\n#BookNow #Barbershop`,
      whatsapp: `Hi! Book your appointment with ${barberName} online: ${urls.utmSocial} 🔥✂️`
    },
    business: {
      email: `Book Your Appointment with ${barberName}\n\nHi there!\n\nReady for your next haircut? You can now book appointments with me online 24/7.\n\nClick here to book: ${urls.utmEmail}\n\nLooking forward to seeing you!\n\nBest regards,\n${barberName}\n${businessName}`
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewData(barberData)
      setLoading(false)
    }, 800)

    if (typeof window !== 'undefined') {
      QRCode.toDataURL(urls.utmPrint, { width: qrSize, margin: 2 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR Code generation failed:', err))
    }

    return () => clearTimeout(timer)
  }, [qrSize])

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied({ ...copied, [key]: true })
      setTimeout(() => setCopied({ ...copied, [key]: false }), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadQRCode = () => {
    setDownloadingQR(true)
    
    if (qrCodeUrl) {
      const link = document.createElement('a')
      link.download = `booking-qr-${barberName.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = qrCodeUrl
      link.click()
      setDownloadingQR(false)
    } else {
      QRCode.toDataURL(urls.utmPrint, { width: qrSize, margin: 2, scale: 8 })
        .then(url => {
          const link = document.createElement('a')
          link.download = `booking-qr-${barberName.replace(/\s+/g, '-').toLowerCase()}.png`
          link.href = url
          link.click()
          setDownloadingQR(false)
        })
        .catch(err => {
          console.error('QR Code download failed:', err)
          setDownloadingQR(false)
        })
    }
  }

  const tabs = [
    { id: 'preview', name: 'Preview', icon: EyeIcon },
    { id: 'share', name: 'Share & QR', icon: QrCodeIcon },
    { id: 'templates', name: 'Templates', icon: DevicePhoneMobileIcon },
    { id: 'analytics', name: 'Analytics', icon: ChartBarIcon }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your public booking page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <GlobeAltIcon className="h-6 w-6 text-olive-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Public Booking Page
              </h1>
              <span className="px-2 py-1 bg-indigo-100 text-olive-700 text-xs font-medium rounded-full">
                SEO Ready
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => copyToClipboard(urls.main, 'header')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {copied.header ? (
                  <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
                ) : (
                  <ClipboardIcon className="h-4 w-4 mr-2" />
                )}
                {copied.header ? 'Copied!' : 'Copy Link'}
              </button>
              
              <button
                onClick={() => window.open(urls.main, '_blank')}
                className="inline-flex items-center px-4 py-2 bg-olive-600 text-white text-sm font-medium rounded-lg hover:bg-olive-700"
              >
                <GlobeAltIcon className="h-4 w-4 mr-2" />
                View Live Page
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-olive-500 text-olive-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-gold-600 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <EyeIcon className="h-5 w-5 mr-2" />
                    Live Preview - Client View
                  </h2>
                  <p className="text-indigo-100 text-sm mt-1">
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
                      {urls.main}
                    </div>
                  </div>
                </div>

                {/* Booking Page Preview */}
                <div className="p-6">
                  <div className="text-center mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-gold-600 rounded-full mx-auto mb-4 flex items-center justify-center">
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

                  {/* Services */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Select a Service
                    </h3>
                    <div className="space-y-3">
                      {previewData.services.map((service) => (
                        <div
                          key={service.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors"
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

                  <button className="w-full bg-olive-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-olive-700 transition-colors">
                    Continue to Book Appointment
                  </button>
                </div>
              </div>
            </div>

            {/* Side Panel - Quick Actions */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ShareIcon className="h-5 w-5 mr-2 text-olive-600" />
                  Quick Actions
                </h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => window.open(urls.main, '_blank')}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <GlobeAltIcon className="h-4 w-4 mr-2" />
                    View Live Page
                  </button>
                  
                  <button
                    onClick={() => copyToClipboard(urls.main, 'sidebar')}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {copied.sidebar ? (
                      <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <ClipboardIcon className="h-4 w-4 mr-2" />
                    )}
                    {copied.sidebar ? 'Copied!' : 'Copy Link'}
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('share')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
                  >
                    <QrCodeIcon className="h-4 w-4 mr-2" />
                    Get QR Code
                  </button>
                </div>
              </div>

              {/* SEO Status */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <PhotoIcon className="h-5 w-5 mr-2 text-green-600" />
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
            </div>
          </div>
        )}

        {/* Share & QR Tab */}
        {activeTab === 'share' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* URL Variants */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <LinkIcon className="h-5 w-5 mr-2 text-olive-600" />
                  Booking URLs
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Main Booking URL
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={urls.main}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600"
                      />
                      <button
                        onClick={() => copyToClipboard(urls.main, 'main')}
                        className="px-3 py-2 bg-olive-600 text-white rounded-r-lg hover:bg-olive-700"
                      >
                        {copied.main ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Social Media Link
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={urls.utmSocial}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600"
                      />
                      <button
                        onClick={() => copyToClipboard(urls.utmSocial, 'social')}
                        className="px-3 py-2 bg-olive-600 text-white rounded-r-lg hover:bg-olive-700"
                      >
                        {copied.social ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Link
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={urls.utmEmail}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600"
                      />
                      <button
                        onClick={() => copyToClipboard(urls.utmEmail, 'email')}
                        className="px-3 py-2 bg-olive-600 text-white rounded-r-lg hover:bg-olive-700"
                      >
                        {copied.email ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Generator */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <QrCodeIcon className="h-5 w-5 mr-2 text-olive-600" />
                  QR Code Generator
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      QR Code Size
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="150"
                        max="400"
                        value={qrSize}
                        onChange={(e) => setQrSize(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 min-w-[60px]">
                        {qrSize}px
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg shadow-inner">
                      {qrCodeUrl ? (
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code"
                          width={qrSize}
                          height={qrSize}
                          className="block mx-auto"
                        />
                      ) : (
                        <div 
                          className="bg-gray-100 animate-pulse mx-auto"
                          style={{ width: qrSize, height: qrSize }}
                        ></div>
                      )}
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={downloadQRCode}
                        disabled={downloadingQR}
                        className="inline-flex items-center px-4 py-2 bg-olive-600 text-white text-sm font-medium rounded-lg hover:bg-olive-700 disabled:opacity-50"
                      >
                        {downloadingQR ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            Download PNG
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DevicePhoneMobileIcon className="h-5 w-5 mr-2 text-gold-600" />
                  Social Media Templates
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Instagram/Facebook
                      </label>
                      <button
                        onClick={() => copyToClipboard(shareTemplates.social.instagram, 'instagram')}
                        className="text-xs text-olive-600 hover:text-olive-800"
                      >
                        {copied.instagram ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      value={shareTemplates.social.instagram}
                      readOnly
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        WhatsApp
                      </label>
                      <button
                        onClick={() => copyToClipboard(shareTemplates.social.whatsapp, 'whatsapp')}
                        className="text-xs text-olive-600 hover:text-olive-800"
                      >
                        {copied.whatsapp ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      value={shareTemplates.social.whatsapp}
                      readOnly
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Twitter/X
                      </label>
                      <button
                        onClick={() => copyToClipboard(shareTemplates.social.twitter, 'twitter')}
                        className="text-xs text-olive-600 hover:text-olive-800"
                      >
                        {copied.twitter ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      value={shareTemplates.social.twitter}
                      readOnly
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <EnvelopeIcon className="h-5 w-5 mr-2 text-olive-600" />
                  Email Template
                </h2>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Professional Email
                    </label>
                    <button
                      onClick={() => copyToClipboard(shareTemplates.business.email, 'emailTemplate')}
                      className="text-xs text-olive-600 hover:text-olive-800"
                    >
                      {copied.emailTemplate ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    value={shareTemplates.business.email}
                    readOnly
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm resize-none"
                  />
                </div>
              </div>

              <div className="bg-olive-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-olive-900 mb-2">
                  Template Tips
                </h4>
                <ul className="text-xs text-olive-700 space-y-1">
                  <li>• Customize the templates with your personal touch</li>
                  <li>• Add specific services or promotions you're offering</li>
                  <li>• Include your business hours and contact information</li>
                  <li>• Use relevant hashtags for your local area</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2 text-green-600" />
                  UTM Tracking
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Source tracking (social, email, print)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Medium identification (share, direct, qr)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Campaign performance (booking)</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Geographic visitor data</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Marketing Attribution
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Social Media</span>
                    <span className="text-sm font-medium">utm_source=social</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Email Campaign</span>
                    <span className="text-sm font-medium">utm_source=email</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">QR Code</span>
                    <span className="text-sm font-medium">utm_source=print</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-olive-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-olive-600">0</div>
                    <div className="text-sm text-olive-700">Page Views</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">0</div>
                    <div className="text-sm text-green-700">Bookings</div>
                  </div>
                  <div className="bg-gold-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gold-600">0%</div>
                    <div className="text-sm text-gold-700">Conversion</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600">0</div>
                    <div className="text-sm text-orange-700">QR Scans</div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  <strong>Analytics Ready:</strong> Your booking page includes comprehensive tracking to help you understand which marketing channels bring the most bookings.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}