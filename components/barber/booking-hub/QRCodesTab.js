'use client'

import { useState, useEffect } from 'react'
import { 
  QrCodeIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ClipboardIcon,
  CheckIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

export default function QRCodesTab() {
  const [qrCodes, setQrCodes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading QR codes
    const timer = setTimeout(() => {
      const mockQRCodes = [
        {
          id: 'qr-1',
          name: 'Business Card QR',
          url: 'http://localhost:9999/book/demo-barber',
          size: 200,
          downloads: 15,
          scans: 45,
          createdAt: '2024-08-01',
          type: 'booking'
        },
        {
          id: 'qr-2', 
          name: 'Social Media QR',
          url: 'http://localhost:9999/book/demo-barber?utm_source=social',
          size: 300,
          downloads: 8,
          scans: 23,
          createdAt: '2024-08-05',
          type: 'social'
        },
        {
          id: 'qr-3',
          name: 'Flyer QR Code',
          url: 'http://localhost:9999/book/demo-barber?utm_source=print',
          size: 400,
          downloads: 12,
          scans: 67,
          createdAt: '2024-08-08',
          type: 'print'
        }
      ]
      setQrCodes(mockQRCodes)
      setLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600"></div>
        <p className="ml-4 text-gray-600">Loading QR codes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">QR Code Manager</h2>
          <p className="text-sm text-gray-600">Generate and manage QR codes for all your booking sources</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gold-600 hover:bg-gold-700">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create QR Code
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <QrCodeIcon className="h-8 w-8 text-gold-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{qrCodes.length}</div>
              <div className="text-xs text-gray-500">Total QR Codes</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <ArrowDownTrayIcon className="h-8 w-8 text-olive-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {qrCodes.reduce((sum, qr) => sum + qr.downloads, 0)}
              </div>
              <div className="text-xs text-gray-500">Total Downloads</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {qrCodes.reduce((sum, qr) => sum + qr.scans, 0)}
              </div>
              <div className="text-xs text-gray-500">Total Scans</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <QrCodeIcon className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {qrCodes.length > 0 ? (qrCodes.reduce((sum, qr) => sum + qr.scans, 0) / qrCodes.reduce((sum, qr) => sum + qr.downloads, 0) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-xs text-gray-500">Scan Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Codes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {qrCodes.map((qr) => (
          <div key={qr.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{qr.name}</h3>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  qr.type === 'booking' ? 'bg-olive-100 text-olive-800' :
                  qr.type === 'social' ? 'bg-green-100 text-green-800' :
                  'bg-gold-100 text-gold-800'
                }`}>
                  {qr.type}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-red-600">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* QR Code Preview */}
            <div className="bg-gray-50 rounded-lg p-4 text-center mb-4">
              <div className="w-24 h-24 bg-gray-200 rounded mx-auto flex items-center justify-center">
                <QrCodeIcon className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">{qr.size}x{qr.size}px</p>
            </div>

            {/* URL */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Target URL:</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono block truncate">
                {qr.url}
              </code>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div>
                <div className="text-lg font-bold text-olive-600">{qr.downloads}</div>
                <div className="text-xs text-gray-500">Downloads</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{qr.scans}</div>
                <div className="text-xs text-gray-500">Scans</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50">
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Download
              </button>
              <button className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50">
                <ClipboardIcon className="h-4 w-4 mr-1" />
                Copy URL
              </button>
            </div>

            <div className="text-xs text-gray-500 text-center mt-3">
              Created {qr.createdAt}
            </div>
          </div>
        ))}
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-gold-50 border border-gold-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <QrCodeIcon className="h-6 w-6 text-gold-600" />
          <div>
            <h3 className="font-semibold text-gold-900">Centralized QR Management</h3>
            <p className="text-sm text-gold-700 mt-1">
              This unified QR code manager consolidates all QR generation from Marketing Links, Public Page, 
              and Calendar appointments. Create, customize, and track all your QR codes in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}