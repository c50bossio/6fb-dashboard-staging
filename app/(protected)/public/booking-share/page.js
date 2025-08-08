'use client'

import { useState, useEffect } from 'react'
import { 
  GlobeAltIcon, 
  ShareIcon,
  QrCodeIcon,
  CopyIcon,
  CheckIcon,
  DownloadIcon,
  LinkIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  PhotoIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-config'
import QRCode from 'qrcode'

export default function BookingSharePage() {
  const { user } = useAuth()
  const [copied, setCopied] = useState({})
  const [qrSize, setQrSize] = useState(200)
  const [downloadingQR, setDownloadingQR] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  // Generate various booking URLs and sharing content
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://6fb-ai.com'
  const barberId = user?.id || 'your-barber-id'
  const barberName = user?.full_name || 'Your Name'
  const businessName = 'Elite Cuts Barbershop' // This would come from user profile

  const urls = {
    main: `${baseUrl}/book/${barberId}`,
    utmSocial: `${baseUrl}/book/${barberId}?utm_source=social&utm_medium=share&utm_campaign=booking`,
    utmEmail: `${baseUrl}/book/${barberId}?utm_source=email&utm_medium=direct&utm_campaign=booking`,
    utmPrint: `${baseUrl}/book/${barberId}?utm_source=print&utm_medium=qr&utm_campaign=booking`
  }

  useEffect(() => {
    // Generate QR code when component mounts or size changes
    if (typeof window !== 'undefined') {
      QRCode.toDataURL(urls.utmPrint, { width: qrSize, margin: 2 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR Code generation failed:', err))
    }
  }, [qrSize, urls.utmPrint])

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
    
    // Use the existing QR code data URL to download
    if (qrCodeUrl) {
      const link = document.createElement('a')
      link.download = `booking-qr-${barberName.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = qrCodeUrl
      link.click()
      setDownloadingQR(false)
    } else {
      // Generate a high-resolution QR code for download
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

  const shareTemplates = {
    social: {
      instagram: `Book your appointment with ${barberName} at ${businessName}! 🔥✂️\n\nEasy online booking: ${urls.utmSocial}\n\n#BookNow #Barbershop #EliteCuts`,
      facebook: `Looking for a great haircut? Book with ${barberName} at ${businessName}!\n\nQuick and easy online booking: ${urls.utmSocial}`,
      twitter: `Book your appointment with ${barberName} 🔥✂️\n\n${urls.utmSocial}\n\n#BookNow #Barbershop`
    },
    business: {
      email: `Book Your Appointment with ${barberName}\n\nHi there!\n\nReady for your next haircut? You can now book appointments with me online 24/7.\n\nClick here to book: ${urls.utmEmail}\n\nLooking forward to seeing you!\n\nBest regards,\n${barberName}\n${businessName}`,
      whatsapp: `Hi! Book your appointment with ${barberName} online: ${urls.utmSocial} 🔥✂️`,
      businessCard: `${barberName}\n${businessName}\n\nBook Online: ${urls.main}`
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <GlobeAltIcon className="h-6 w-6 text-indigo-600" />
              <h1 className="text-lg font-semibold text-gray-900">
                Share Your Booking Page
              </h1>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                SEO Ready
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sharing URLs */}
          <div className="space-y-6">
            {/* Main Booking URL */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <LinkIcon className="h-5 w-5 mr-2 text-blue-600" />
                Primary Booking Link
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
                      className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 flex items-center"
                    >
                      {copied.main ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use this for general sharing and business cards
                  </p>
                </div>
              </div>
            </div>

            {/* UTM Tracking URLs */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ShareIcon className="h-5 w-5 mr-2 text-green-600" />
                Marketing Links with Tracking
              </h2>
              
              <div className="space-y-4">
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
                      className="px-3 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700"
                    >
                      {copied.social ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    For Instagram, Facebook, Twitter posts
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Marketing Link
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
                      className="px-3 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700"
                    >
                      {copied.email ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    For email newsletters and direct messages
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Print/QR Code Link
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={urls.utmPrint}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600"
                    />
                    <button
                      onClick={() => copyToClipboard(urls.utmPrint, 'print')}
                      className="px-3 py-2 bg-green-600 text-white rounded-r-lg hover:bg-green-700"
                    >
                      {copied.print ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    For flyers, business cards, and QR codes
                  </p>
                </div>
              </div>
            </div>

            {/* Social Media Templates */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DevicePhoneMobileIcon className="h-5 w-5 mr-2 text-purple-600" />
                Ready-to-Use Templates
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Instagram/Facebook Post
                    </label>
                    <button
                      onClick={() => copyToClipboard(shareTemplates.social.instagram, 'instagram')}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {copied.instagram ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                  <textarea
                    value={shareTemplates.social.instagram}
                    readOnly
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      WhatsApp Message
                    </label>
                    <button
                      onClick={() => copyToClipboard(shareTemplates.business.whatsapp, 'whatsapp')}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {copied.whatsapp ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                  <textarea
                    value={shareTemplates.business.whatsapp}
                    readOnly
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Template
                    </label>
                    <button
                      onClick={() => copyToClipboard(shareTemplates.business.email, 'emailTemplate')}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {copied.emailTemplate ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                  <textarea
                    value={shareTemplates.business.email}
                    readOnly
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Generator */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <QrCodeIcon className="h-5 w-5 mr-2 text-indigo-600" />
                QR Code Generator
              </h2>
              
              <div className="space-y-6">
                {/* QR Size Control */}
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

                {/* QR Code Display */}
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
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingQR ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="h-4 w-4 mr-2" />
                          Download PNG
                        </>
                      )}
                    </button>
                    
                    <p className="text-xs text-gray-500">
                      Perfect for business cards, flyers, and storefront display
                    </p>
                  </div>
                </div>

                {/* QR Code Usage Tips */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    QR Code Best Practices
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Place QR codes at eye level for easy scanning</li>
                    <li>• Include clear "Scan to Book" text near the code</li>
                    <li>• Test scanning from different distances and lighting</li>
                    <li>• Use high contrast backgrounds for better readability</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Analytics Preview */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ComputerDesktopIcon className="h-5 w-5 mr-2 text-green-600" />
                Analytics Tracking
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">UTM parameters for source tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Geographic visitor data</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Device and browser analytics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Conversion rate tracking</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Track performance:</strong> See which sharing methods bring the most bookings in your analytics dashboard.
                </p>
              </div>
            </div>

            {/* SEO Benefits */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <PhotoIcon className="h-5 w-5 mr-2 text-purple-600" />
                SEO & Social Benefits
              </h2>
              
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <strong>Search Engine Optimized:</strong> Your booking page is optimized for Google search with proper meta tags, structured data, and mobile responsiveness.
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <strong>Social Media Ready:</strong> Rich previews on Facebook, Instagram, Twitter, and LinkedIn with custom images and descriptions.
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <strong>Local Business Schema:</strong> Helps Google understand your business for local search results and Google My Business integration.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}