'use client'

import {
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ClipboardDocumentIcon,
  QrCodeIcon,
  ShareIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import QRCode from 'qrcode'
import { useState, useEffect } from 'react'

export default function LivePreview({ 
  businessData = {}, 
  services = [], 
  brandingData = {},
  slug = 'your-business'
}) {
  const [viewMode, setViewMode] = useState('mobile') // mobile, desktop
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState(false)
  
  const bookingUrl = `https://bookedbarber.com/${slug || 'your-business'}`
  
  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(bookingUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeUrl(url)
      } catch (err) {
        console.error('Error generating QR code:', err)
      }
    }
    generateQR()
  }, [bookingUrl])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: businessData.businessName || 'Book an appointment',
          text: 'Book your appointment online!',
          url: bookingUrl
        })
      } catch (err) {
        console.log('Error sharing:', err)
      }
    } else {
      handleCopyLink()
    }
  }

  const primaryColor = brandingData.primaryColor || '#3B82F6'
  const secondaryColor = brandingData.secondaryColor || '#1F2937'
  
  return (
    <div className="space-y-4">
      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('mobile')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'mobile' 
                ? 'bg-olive-100 text-olive-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <DevicePhoneMobileIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('desktop')}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'desktop' 
                ? 'bg-olive-100 text-olive-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ComputerDesktopIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyLink}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Copy link"
          >
            {copied ? (
              <span className="text-green-600 text-sm font-medium">Copied!</span>
            ) : (
              <ClipboardDocumentIcon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleShare}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Share"
          >
            <ShareIcon className="w-5 h-5" />
          </button>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="Open in new tab"
          >
            <ArrowTopRightOnSquareIcon className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* URL Preview */}
      <div className="bg-gray-50 rounded-lg px-4 py-2 flex items-center justify-between">
        <span className="text-sm text-gray-600 font-mono">{bookingUrl}</span>
        <button
          onClick={handleCopyLink}
          className="text-olive-600 hover:text-olive-700 text-sm font-medium"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Live Preview Frame */}
      <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${
        viewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
      }`}>
        {/* Browser Chrome */}
        <div className="bg-gray-200 px-4 py-2 flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
          <div className="flex-1 bg-white rounded px-2 py-0.5">
            <span className="text-xs text-gray-600">{bookingUrl}</span>
          </div>
        </div>
        
        {/* Page Content */}
        <div className="bg-white p-6" style={{ minHeight: viewMode === 'mobile' ? '500px' : '400px' }}>
          {/* Header */}
          <div 
            className="text-center mb-6 p-6 rounded-lg"
            style={{ backgroundColor: `${primaryColor}10` }}
          >
            {brandingData.logoUrl ? (
              <Image 
                src={brandingData.logoUrl} 
                alt="Logo" 
                width={80}
                height={80}
                className="mx-auto mb-3 rounded-full"
              />
            ) : (
              <div 
                className="w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {(businessData.businessName || 'BB').substring(0, 2).toUpperCase()}
              </div>
            )}
            <h1 className="text-2xl font-bold" style={{ color: secondaryColor }}>
              {businessData.businessName || 'Your Business Name'}
            </h1>
            <p className="text-gray-600 mt-1">
              {businessData.businessAddress || 'Your address will appear here'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {businessData.businessPhone || '(555) 123-4567'}
            </p>
          </div>
          
          {/* Services */}
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Select a Service</h2>
            <div className="space-y-2">
              {services.length > 0 ? (
                services.slice(0, 3).map((service, idx) => (
                  <div 
                    key={idx}
                    className="p-3 border border-gray-200 rounded-lg hover:border-olive-300 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {service.icon} {service.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {service.duration} min • ${service.price}
                        </p>
                      </div>
                      <button 
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                        style={{ 
                          backgroundColor: primaryColor,
                          color: 'white'
                        }}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Your services will appear here
                </div>
              )}
            </div>
          </div>
          
          {/* Call to Action */}
          <button 
            className="w-full py-3 rounded-lg font-medium text-white transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            View All Services & Book
          </button>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
          <QrCodeIcon className="w-5 h-5 mr-2" />
          QR Code for Quick Access
        </h3>
        <div className="flex items-center space-x-4">
          {qrCodeUrl && (
            <Image src={qrCodeUrl} alt="QR Code" width={128} height={128} />
          )}
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">
              Customers can scan this code to instantly access your booking page
            </p>
            <button
              onClick={() => {
                const link = document.createElement('a')
                link.download = `${slug}-qr-code.png`
                link.href = qrCodeUrl
                link.click()
              }}
              className="text-olive-600 hover:text-olive-700 text-sm font-medium"
            >
              Download QR Code
            </button>
          </div>
        </div>
      </div>

      {/* Embed Code */}
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="font-medium text-gray-900 cursor-pointer">
          Embed on Your Website
        </summary>
        <div className="mt-3">
          <p className="text-sm text-gray-600 mb-2">
            Copy this code to add a booking button to your website:
          </p>
          <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`<a href="${bookingUrl}" 
   target="_blank" 
   style="display:inline-block;
          background:${primaryColor};
          color:white;
          padding:12px 24px;
          border-radius:8px;
          text-decoration:none;
          font-weight:bold;">
  Book Now
</a>`}
          </pre>
          <button
            onClick={() => {
              const embedCode = `<a href="${bookingUrl}" target="_blank" style="display:inline-block;background:${primaryColor};color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Book Now</a>`
              navigator.clipboard.writeText(embedCode)
            }}
            className="mt-2 text-olive-600 hover:text-olive-700 text-sm font-medium"
          >
            Copy Embed Code
          </button>
        </div>
      </details>
    </div>
  )
}