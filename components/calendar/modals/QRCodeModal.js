'use client'

import { memo } from 'react'
import { 
  CheckIcon,
  ClipboardIcon,
  ShareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

/**
 * QR Code Modal Component
 * Displays QR codes for booking links with download and sharing functionality
 */
const QRCodeModal = memo(function QRCodeModal({
  isOpen,
  onClose,
  selectedResource,
  qrCodeUrl,
  quickLinks = [],
  copied = {},
  onCopyToClipboard,
  onDownloadQRCode,
  onGenerateQRCode
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedResource ? `QR Code - ${selectedResource.title}` : 'Booking QR Codes'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {selectedResource && qrCodeUrl ? (
          <div className="text-center">
            <div className="mb-4 p-4 bg-gray-50 rounded-lg inline-block">
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
            </div>
            
            <div className="space-y-3">
              <div className="text-left">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Booking URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={selectedResource.url}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600"
                  />
                  <button
                    onClick={() => onCopyToClipboard(selectedResource.url, 'modal')}
                    className="px-3 py-2 bg-olive-600 text-white rounded-r-lg hover:bg-olive-700 flex items-center"
                  >
                    {copied.modal ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <ClipboardIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={onDownloadQRCode}
                  className="flex-1 px-4 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download</span>
                </button>
                
                <button
                  onClick={() => window.open(selectedResource.url, '_blank')}
                  className="flex-1 px-4 py-2 bg-gold-700 text-white rounded-lg hover:bg-gold-700 flex items-center justify-center space-x-2"
                >
                  <ShareIcon className="h-4 w-4" />
                  <span>Test Link</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 text-center mb-4">
              Select a barber or location to generate a QR code:
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              {quickLinks.map((link) => {
                const IconComponent = link.icon
                return (
                  <button
                    key={link.id}
                    onClick={() => onGenerateQRCode({ id: link.id, title: link.title, url: link.url })}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className={`h-8 w-8 bg-gradient-to-r ${
                      link.color === 'blue' 
                        ? 'from-olive-500 to-olive-600' 
                        : link.color === 'green' 
                        ? 'from-green-500 to-green-600' 
                        : 'from-gold-500 to-gold-600'
                    } rounded flex items-center justify-center`}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{link.title}</div>
                      <div className="text-sm text-gray-500">{link.subtitle}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

QRCodeModal.displayName = 'QRCodeModal'

export default QRCodeModal