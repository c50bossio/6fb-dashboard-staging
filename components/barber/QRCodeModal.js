'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { 
  XMarkIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ShareIcon,
  ClipboardIcon,
  PaintBrushIcon,
  AdjustmentsHorizontalIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'

export default function QRCodeModal({ isOpen, onClose, bookingLink }) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrOptions, setQrOptions] = useState({
    size: 200,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M',
    includeText: true,
    customText: '',
    logoUrl: null
  })
  const [activeTab, setActiveTab] = useState('basic')
  const canvasRef = useRef(null)

  useEffect(() => {
    if (isOpen && bookingLink) {
      generateQRCode()
    }
  }, [isOpen, bookingLink, qrOptions])

  const generateQRCode = async () => {
    if (!bookingLink) return
    
    setLoading(true)
    try {
      const QRCode = (await import('qrcode')).default
      
      const fullUrl = `${window.location.origin}${bookingLink.url}`
      
      const qrCodeDataUrl = await QRCode.toDataURL(fullUrl, {
        width: qrOptions.size,
        margin: qrOptions.margin,
        color: qrOptions.color,
        errorCorrectionLevel: qrOptions.errorCorrectionLevel
      })
      
      if (qrOptions.includeText || qrOptions.logoUrl) {
        await drawEnhancedQR(qrCodeDataUrl, fullUrl)
      } else {
        setQrDataUrl(qrCodeDataUrl)
      }
      
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    } finally {
      setLoading(false)
    }
  }

  const drawEnhancedQR = async (qrDataUrl, url) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const qrImage = new Image()
    
    qrImage.onload = () => {
      const padding = 40
      const textHeight = qrOptions.includeText ? 60 : 0
      canvas.width = qrOptions.size + (padding * 2)
      canvas.height = qrOptions.size + (padding * 2) + textHeight
      
      ctx.fillStyle = qrOptions.color.light
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.drawImage(qrImage, padding, padding, qrOptions.size, qrOptions.size)
      
      if (qrOptions.includeText) {
        const text = qrOptions.customText || `Scan to book with ${bookingLink.name}`
        ctx.fillStyle = qrOptions.color.dark
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(text, canvas.width / 2, canvas.height - 30)
        
        ctx.font = '10px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = '#666666'
        const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url
        ctx.fillText(displayUrl, canvas.width / 2, canvas.height - 12)
      }
      
      setQrDataUrl(canvas.toDataURL('image/png'))
    }
    
    qrImage.src = qrDataUrl
  }

  const downloadQR = (format = 'png') => {
    if (!qrDataUrl) return
    
    const link = document.createElement('a')
    link.download = `booking-qr-${bookingLink.name.toLowerCase().replace(/\s+/g, '-')}.${format}`
    
    if (format === 'svg') {
      link.href = qrDataUrl
    } else {
      link.href = qrDataUrl
    }
    
    link.click()
  }

  const printQR = () => {
    if (!qrDataUrl) return
    
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${bookingLink.name}</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              display: flex; 
              flex-direction: column;
              align-items: center; 
              margin: 20px;
            }
            .qr-container {
              text-align: center;
              margin: 20px 0;
            }
            .info {
              margin: 20px 0;
              max-width: 400px;
            }
            .info h2 {
              margin: 0 0 10px 0;
              color: #333;
            }
            .info p {
              margin: 5px 0;
              color: #666;
              font-size: 14px;
            }
            .url {
              font-family: monospace;
              background: #f5f5f5;
              padding: 10px;
              border-radius: 4px;
              word-break: break-all;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="info">
            <h2>${bookingLink.name}</h2>
            <p><strong>Services:</strong> ${bookingLink.services.join(', ')}</p>
            <p><strong>Duration:</strong> ${bookingLink.duration} minutes</p>
            ${bookingLink.customPrice ? `<p><strong>Price:</strong> $${bookingLink.customPrice}</p>` : ''}
            <p><strong>Time Slots:</strong> ${bookingLink.timeSlots.join(', ')}</p>
          </div>
          <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR Code" style="max-width: 300px; height: auto;" />
          </div>
          <div class="url">
            <strong>Link:</strong> ${window.location.origin}${bookingLink.url}
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const shareQR = async () => {
    if (!qrDataUrl) return
    
    try {
      const response = await fetch(qrDataUrl)
      const blob = await response.blob()
      const file = new File([blob], `qr-code-${bookingLink.name}.png`, { type: 'image/png' })
      
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Booking QR Code - ${bookingLink.name}`,
          text: `Scan this QR code to book: ${bookingLink.name}`,
          files: [file]
        })
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}${bookingLink.url}`)
        alert('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Failed to share QR code:', error)
      try {
        await navigator.clipboard.writeText(`${window.location.origin}${bookingLink.url}`)
        alert('Link copied to clipboard!')
      } catch (clipError) {
        console.error('Failed to copy to clipboard:', clipError)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">QR Code Generator</h2>
            <p className="text-sm text-gray-600">{bookingLink?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-3 hover:bg-gray-100 rounded-lg transition-all flex items-center justify-center"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-all min-h-[44px] ${
                activeTab === 'basic'
                  ? 'text-olive-600 border-olive-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setActiveTab('customize')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-all min-h-[44px] ${
                activeTab === 'customize'
                  ? 'text-olive-600 border-olive-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              Customize
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR Code Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
              
              <div className="bg-gray-50 rounded-lg p-8 flex items-center justify-center min-h-[300px]">
                {loading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
                ) : qrDataUrl ? (
                  <Image 
                    src={qrDataUrl} 
                    alt="QR Code Preview" 
                    width={qrOptions.size}
                    height={qrOptions.size}
                    className="max-w-full h-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <PhotoIcon className="h-12 w-12 mx-auto mb-2" />
                    <p>QR Code will appear here</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => downloadQR('png')}
                  disabled={!qrDataUrl}
                  className="flex items-center gap-2 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download PNG
                </button>
                
                <button
                  onClick={printQR}
                  disabled={!qrDataUrl}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Print
                </button>
                
                <button
                  onClick={shareQR}
                  disabled={!qrDataUrl}
                  className="flex items-center gap-2 px-4 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ShareIcon className="h-4 w-4" />
                  Share
                </button>
              </div>

              {/* Link Info */}
              <div className="bg-olive-50 rounded-lg p-4">
                <h4 className="font-medium text-olive-900 mb-2">Booking Link</h4>
                <p className="text-sm text-olive-800 font-mono break-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}{bookingLink?.url}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}${bookingLink?.url}`)}
                  className="flex items-center gap-2 mt-2 text-sm text-olive-600 hover:text-olive-800 min-h-[44px] px-3 py-2 rounded-lg hover:bg-olive-50 transition-all"
                >
                  <ClipboardIcon className="h-4 w-4" />
                  Copy Link
                </button>
              </div>
            </div>

            {/* Customization Options */}
            <div className="space-y-6">
              {activeTab === 'basic' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Settings</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size: {qrOptions.size}px
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="500"
                      value={qrOptions.size}
                      onChange={(e) => setQrOptions(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Margin: {qrOptions.margin}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={qrOptions.margin}
                      onChange={(e) => setQrOptions(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foreground Color
                      </label>
                      <input
                        type="color"
                        value={qrOptions.color.dark}
                        onChange={(e) => setQrOptions(prev => ({ 
                          ...prev, 
                          color: { ...prev.color, dark: e.target.value }
                        }))}
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Background Color
                      </label>
                      <input
                        type="color"
                        value={qrOptions.color.light}
                        onChange={(e) => setQrOptions(prev => ({ 
                          ...prev, 
                          color: { ...prev.color, light: e.target.value }
                        }))}
                        className="w-full h-10 rounded border border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'customize' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Advanced Options</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Error Correction Level
                    </label>
                    <select
                      value={qrOptions.errorCorrectionLevel}
                      onChange={(e) => setQrOptions(prev => ({ ...prev, errorCorrectionLevel: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                    >
                      <option value="L">Low (7%)</option>
                      <option value="M">Medium (15%)</option>
                      <option value="Q">Quartile (25%)</option>
                      <option value="H">High (30%)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={qrOptions.includeText}
                        onChange={(e) => setQrOptions(prev => ({ ...prev, includeText: e.target.checked }))}
                        className="rounded border-gray-300 text-olive-600 focus:ring-olive-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include text below QR code</span>
                    </label>
                  </div>
                  
                  {qrOptions.includeText && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Text (optional)
                      </label>
                      <input
                        type="text"
                        value={qrOptions.customText}
                        onChange={(e) => setQrOptions(prev => ({ ...prev, customText: e.target.value }))}
                        placeholder={`Scan to book with ${bookingLink?.name}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden canvas for enhanced QR generation */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}