'use client'

import { useState, useEffect } from 'react'
import {
  PlusIcon,
  EyeIcon,
  LinkIcon,
  QrCodeIcon,
  ShareIcon,
  ChartBarIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../SupabaseAuthProvider'
import CreateBookingLinkModal from '../CreateBookingLinkModal'
import QRCodeModal from '../QRCodeModal'
import EmbedCodeModal from '../EmbedCodeModal'

export default function MarketingLinksTab() {
  const { user } = useAuth()
  const [bookingLinks, setBookingLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLink, setSelectedLink] = useState(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showEmbedModal, setShowEmbedModal] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success') // success, error, warning

  useEffect(() => {
    loadBookingLinks()
  }, [])

  const showToastNotification = (message, type = 'success') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  const loadBookingLinks = async () => {
    try {
      setLoading(true)
      
      // Try to fetch from API first, with fallback to mock data
      const response = await fetch(`/api/barber/booking-links/create?barberId=${user?.id || 'dev-user-123'}`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.length > 0) {
          setBookingLinks(result.data)
          setLoading(false)
          return
        }
      }
      
      // Fallback to mock data
      const mockBookingLinks = [
        {
          id: 'demo-link-1',
          name: 'Quick Haircut Booking',
          url: 'http://localhost:9999/book/demo-barber?service=haircut',
          services: ['Classic Cut', 'Fade Cut'],
          timeSlots: ['Morning', 'Afternoon'],
          duration: 45,
          customPrice: 45,
          clicks: 15,
          conversions: 3,
          conversionRate: '20.0',
          revenue: 135,
          createdAt: '2024-08-01',
          active: true,
          qrGenerated: false,
          embed_count: 7
        },
        {
          id: 'demo-link-2',
          name: 'Full Grooming Package',
          url: 'http://localhost:9999/book/demo-barber?service=full',
          services: ['Classic Cut', 'Beard Trim', 'Hot Towel Shave'],
          timeSlots: ['Morning', 'Afternoon', 'Evening'],
          duration: 90,
          customPrice: 85,
          clicks: 8,
          conversions: 2,
          conversionRate: '25.0',
          revenue: 170,
          createdAt: '2024-08-05',
          active: true,
          qrGenerated: true,
          embed_count: 12
        },
        {
          id: 'demo-link-3',
          name: 'Premium Experience',
          url: 'http://localhost:9999/book/demo-barber?service=premium',
          services: ['Fade Cut', 'Beard Styling', 'Hair Wash'],
          timeSlots: ['Afternoon', 'Evening'],
          duration: 75,
          customPrice: 95,
          clicks: 5,
          conversions: 1,
          conversionRate: '20.0',
          revenue: 95,
          createdAt: '2024-08-10',
          active: false,
          qrGenerated: true,
          embed_count: 3
        }
      ]
      
      setBookingLinks(mockBookingLinks)
    } catch (error) {
      console.error('Failed to load booking links:', error)
      showToastNotification('Failed to load booking links', 'error')
    } finally {
      setLoading(false)
    }
  }

  const saveBookingLink = async (linkData) => {
    try {
      const response = await fetch('/api/barber/booking-links/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barberId: user?.id || 'dev-user-123',
          ...linkData
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Add the new link to the beginning of the list
        setBookingLinks(prev => [result.data, ...prev])
        showToastNotification('Booking link created successfully!', 'success')
      } else {
        throw new Error(result.error || 'Failed to create booking link')
      }
      
    } catch (error) {
      console.error('Failed to save booking link:', error)
      showToastNotification('Failed to create booking link. Please try again.', 'error')
      throw error
    }
  }

  const generateQRCode = async (linkId) => {
    try {
      const response = await fetch('/api/barber/qr-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkId: linkId,
          options: {
            size: 300,
            margin: 4,
            foregroundColor: '#000000',
            backgroundColor: '#FFFFFF'
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        const link = bookingLinks.find(l => l.id === linkId)
        if (link) {
          // Add QR code data to the link for the modal
          const linkWithQR = {
            ...link,
            qrCodeUrl: result.data.qrCodeUrl,
            qrGenerated: true
          }
          
          setSelectedLink(linkWithQR)
          setShowQRModal(true)
          showToastNotification('QR code generated successfully!', 'success')
          
          // Update the link in the list to show QR as generated
          setBookingLinks(links => 
            links.map(l => l.id === linkId ? { ...l, qrGenerated: true } : l)
          )
        }
      } else {
        throw new Error(result.error || 'Failed to generate QR code')
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      showToastNotification('Failed to generate QR code. Please try again.', 'error')
    }
  }

  const showEmbedCode = (linkId) => {
    const link = bookingLinks.find(l => l.id === linkId)
    if (link) {
      // Update embed count
      const updatedLinks = bookingLinks.map(l => 
        l.id === linkId 
          ? { ...l, embed_count: (l.embed_count || 0) + 1 }
          : l
      )
      setBookingLinks(updatedLinks)
      
      setSelectedLink(link)
      setShowEmbedModal(true)
    }
  }

  const copyToClipboard = async (text, linkId) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedLinkId(linkId)
      showToastNotification('Link copied to clipboard!', 'success')
      setTimeout(() => setCopiedLinkId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      showToastNotification('Failed to copy link', 'error')
    }
  }

  const openInNewTab = (url) => {
    window.open(url, '_blank')
  }

  // Calculate summary statistics
  const stats = {
    activeLinks: bookingLinks.filter(l => l.active).length,
    totalClicks: bookingLinks.reduce((sum, l) => sum + (l.clicks || 0), 0),
    totalConversions: bookingLinks.reduce((sum, l) => sum + (l.conversions || 0), 0),
    totalRevenue: bookingLinks.reduce((sum, l) => sum + (l.revenue || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="ml-4 text-gray-600">Loading marketing links...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <LinkIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Active Links</dt>
                <dd className="text-2xl font-bold text-gray-900">{stats.activeLinks}</dd>
                <dd className="text-xs text-gray-500">{bookingLinks.length} total</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <EyeIcon className="h-8 w-8 text-olive-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Clicks</dt>
                <dd className="text-2xl font-bold text-gray-900">{stats.totalClicks}</dd>
                <dd className="text-xs text-gray-500">All time</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-gold-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Conversions</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {stats.totalConversions} 
                  <span className="text-sm text-gold-600">
                    ({stats.totalClicks > 0 ? ((stats.totalConversions / stats.totalClicks) * 100).toFixed(1) : 0}%)
                  </span>
                </dd>
                <dd className="text-xs text-gray-500">Clicks to bookings</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Revenue</dt>
                <dd className="text-2xl font-bold text-gray-900">
                  ${stats.totalRevenue > 0 ? stats.totalRevenue.toLocaleString() : 'NaN'}
                </dd>
                <dd className="text-xs text-gray-500">From link bookings</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Marketing Links</h2>
          <p className="text-sm text-gray-600">Create and manage custom booking links for your campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create New Link
        </button>
      </div>

      {/* Links List */}
      <div className="space-y-4">
        {bookingLinks.map((link) => (
          <div key={link.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{link.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    link.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {link.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                    {link.url}
                  </code>
                  <button
                    onClick={() => copyToClipboard(link.url, link.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                    title="Copy URL"
                  >
                    {copiedLinkId === link.id ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openInNewTab(link.url)}
                    className="ml-1 p-1 text-gray-400 hover:text-gray-600"
                    title="Open in new tab"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Services and Time Slots */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Services</h4>
                    <div className="flex flex-wrap gap-1">
                      {link.services?.map((service, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-olive-100 text-olive-800">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Time Slots</h4>
                    <div className="flex flex-wrap gap-1">
                      {link.timeSlots?.map((slot, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gold-100 text-gold-800">
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-olive-600">{link.clicks || 0}</div>
                    <div className="text-xs text-gray-500">Clicks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{link.conversions || 0}</div>
                    <div className="text-xs text-gray-500">Bookings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gold-600">{link.embed_count || 0}</div>
                    <div className="text-xs text-gray-500">Embeds</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{link.conversionRate || 0}%</div>
                    <div className="text-xs text-gray-500">Conversion</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">${link.revenue || 0}</div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 ml-6">
                <div className="flex items-center gap-2">
                  <div className="text-right text-xs text-gray-500">
                    <div>Duration: {link.duration} min</div>
                    <div>Price: ${link.customPrice}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(link.url, `copy-${link.id}`)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-all"
                    title="Copy Link"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Copy Link
                  </button>
                  
                  <button
                    onClick={() => generateQRCode(link.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all bg-olive-100 text-olive-700 hover:bg-olive-200"
                    title="Generate QR"
                  >
                    <QrCodeIcon className="h-4 w-4" />
                    Generate QR
                  </button>
                  
                  <button
                    onClick={() => showEmbedCode(link.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-100 text-olive-700 hover:bg-indigo-200 rounded-lg transition-all"
                    title="Embed Code"
                  >
                    <CodeBracketIcon className="h-4 w-4" />
                    Embed
                  </button>
                </div>
                
                <div className="text-xs text-gray-500 text-right">
                  Created {link.createdAt}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <CreateBookingLinkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={saveBookingLink}
      />

      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        bookingLink={selectedLink}
      />

      <EmbedCodeModal
        isOpen={showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
        bookingLink={selectedLink}
      />

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce z-60 ${
          toastType === 'success' ? 'bg-green-600 text-white' :
          toastType === 'error' ? 'bg-red-600 text-white' :
          'bg-yellow-600 text-white'
        }`}>
          {toastType === 'success' ? (
            <CheckCircleIcon className="h-5 w-5" />
          ) : toastType === 'error' ? (
            <XCircleIcon className="h-5 w-5" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5" />
          )}
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  )
}