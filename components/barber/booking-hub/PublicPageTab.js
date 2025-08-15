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
import Image from 'next/image'
import QRCode from 'qrcode'
import { useState, useEffect } from 'react'
import { useAuth } from '../../SupabaseAuthProvider'

export default function PublicPageTab() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('preview')
  const [copied, setCopied] = useState({})
  const [qrSize, setQrSize] = useState(200)
  const [downloadingQR, setDownloadingQR] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [previewData, setPreviewData] = useState(null)
  const [loading, setLoading] = useState(true)

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
    }
    
    setTimeout(() => setDownloadingQR(false), 1000)
  }

  const openPreview = () => {
    window.open(urls.main, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
        <p className="ml-4 text-gray-600">Loading public page data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Public Booking Page</h2>
          <p className="text-sm text-gray-600">Manage your personal booking page and share it with clients</p>
        </div>
        <button
          onClick={openPreview}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
        >
          <EyeIcon className="h-5 w-5 mr-2" />
          View Live Page
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'preview', name: 'Preview', icon: EyeIcon },
            { id: 'share', name: 'Share & QR', icon: ShareIcon },
            { id: 'templates', name: 'Templates', icon: EnvelopeIcon },
            { id: 'analytics', name: 'Analytics', icon: ChartBarIcon }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-olive-500 text-olive-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <div className="bg-olive-50 border border-olive-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <EyeIcon className="h-6 w-6 text-olive-600" />
              <h3 className="text-lg font-semibold text-olive-900">Live Preview - Client View</h3>
            </div>
            <p className="text-olive-700 text-sm mb-4">
              This is exactly what clients see when they visit your booking page
            </p>
            
            {/* Mock Browser */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b">
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="bg-white rounded px-3 py-1 text-sm text-gray-600 font-mono">
                  {urls.main}
                </div>
              </div>
              
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-olive-600 text-white rounded-full text-2xl font-bold mb-4">
                  {barberData.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Book with {barberData.name}</h1>
                <p className="text-gray-600 mb-6">{barberData.business} • {barberData.location}</p>
                
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="h-5 w-5 fill-current" />
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm">
                    {barberData.rating} ({barberData.totalReviews} reviews)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {barberData.services.slice(0, 4).map((service) => (
                    <div key={service.id} className="border border-gray-200 rounded-lg p-4 text-left">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{service.name}</h3>
                          <p className="text-sm text-gray-600">{service.duration} min</p>
                        </div>
                        <span className="font-bold text-olive-600">${service.price}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-olive-600 hover:bg-olive-700">
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'share' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Code Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <QrCodeIcon className="h-5 w-5 text-gold-600" />
                QR Code
              </h3>
              
              <div className="text-center">
                {qrCodeUrl && (
                  <div className="inline-block p-4 bg-white rounded-lg shadow-sm border">
                    <Image src={qrCodeUrl} alt="Booking QR Code" width={qrSize} height={qrSize} className="mx-auto" />
                  </div>
                )}
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Size:</label>
                    <select
                      value={qrSize}
                      onChange={(e) => setQrSize(parseInt(e.target.value))}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value={150}>Small (150px)</option>
                      <option value={200}>Medium (200px)</option>
                      <option value={300}>Large (300px)</option>
                      <option value={400}>Extra Large (400px)</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={downloadQRCode}
                    disabled={downloadingQR}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gold-600 hover:bg-gold-700 disabled:opacity-50"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    {downloadingQR ? 'Downloading...' : 'Download QR Code'}
                  </button>
                </div>
              </div>
            </div>

            {/* Direct Links Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-olive-600" />
                Direct Links
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Main Booking Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={urls.main}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(urls.main, 'main')}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      {copied.main ? (
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ClipboardIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Social Media Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={urls.utmSocial}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(urls.utmSocial, 'social')}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      {copied.social ? (
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ClipboardIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={urls.utmEmail}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(urls.utmEmail, 'email')}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      {copied.email ? (
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ClipboardIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Social Media Templates */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Templates</h3>
              
              <div className="space-y-4">
                {Object.entries(shareTemplates.social).map(([platform, template]) => (
                  <div key={platform} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 capitalize">{platform}</h4>
                      <button
                        onClick={() => copyToClipboard(template, platform)}
                        className="text-sm text-olive-600 hover:text-olive-700"
                      >
                        {copied[platform] ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      value={template}
                      readOnly
                      className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 resize-none"
                      rows={3}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Email Template */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Template</h3>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Professional Email</h4>
                  <button
                    onClick={() => copyToClipboard(shareTemplates.business.email, 'business-email')}
                    className="text-sm text-olive-600 hover:text-olive-700"
                  >
                    {copied['business-email'] ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <textarea
                  value={shareTemplates.business.email}
                  readOnly
                  className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 resize-none"
                  rows={8}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Public Page Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-olive-600">1,247</div>
                <div className="text-sm text-gray-500">Page Views</div>
                <div className="text-xs text-green-600 mt-1">+12% from last month</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">89</div>
                <div className="text-sm text-gray-500">Bookings</div>
                <div className="text-xs text-green-600 mt-1">7.1% conversion rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gold-600">234</div>
                <div className="text-sm text-gray-500">QR Scans</div>
                <div className="text-xs text-olive-600 mt-1">18.8% of traffic</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                📊 Detailed analytics and conversion tracking coming soon. 
                Track clicks, bookings, and revenue from your public page.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}