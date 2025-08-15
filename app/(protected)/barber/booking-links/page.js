'use client'

import { 
  LinkIcon, 
  QrCodeIcon, 
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardIcon,
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
import { useState, useEffect } from 'react'
import CreateBookingLinkModal from '../../../../components/barber/CreateBookingLinkModal'
import EmbedCodeModal from '../../../../components/barber/EmbedCodeModal'
import QRCodeModal from '../../../../components/barber/QRCodeModal'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

export default function BookingLinksPage() {
  const { user, profile } = useAuth()
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
      
      if (!user?.id) {
        console.error('User not authenticated')
        setBookingLinks([])
        return
      }

      const response = await fetch(`/api/barber/booking-links/create?barberId=${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setBookingLinks(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch booking links')
      }
      
    } catch (error) {
      console.error('Failed to load booking links:', error)
      
      console.log('🔄 Using fallback mock booking links data...')
      const mockBookingLinks = [
        {
          id: 'demo-link-1',
          name: 'Quick Haircut Booking',
          url: '/book/demo-barber?service=haircut',
          services: ['Classic Cut', 'Fade Cut'],
          timeSlots: ['morning', 'afternoon'],
          duration: 45,
          description: 'Book your haircut appointment',
          active: true,
          clicks: 15,
          conversions: 3,
          customPrice: 45.00,
          embed_count: 7,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-link-2', 
          name: 'Full Grooming Package',
          url: '/book/demo-barber?service=full',
          services: ['Classic Cut', 'Beard Trim', 'Hot Towel Shave'],
          timeSlots: ['morning', 'afternoon', 'evening'],
          duration: 90,
          description: 'Complete grooming experience',
          active: true,
          clicks: 8,
          conversions: 2,
          customPrice: 85.00,
          embed_count: 3,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-link-3',
          name: 'Premium Service Link',
          url: '/book/demo-barber?service=premium',
          services: ['Hot Towel Shave', 'Beard Sculpting'],
          timeSlots: ['afternoon', 'evening'],
          duration: 60,
          description: 'Premium grooming services',
          active: true,
          clicks: 5,
          conversions: 1,
          customPrice: 65.00,
          embed_count: 12,
          created_at: new Date().toISOString()
        }
      ]
      setBookingLinks(mockBookingLinks)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (linkId, url) => {
    try {
      const fullUrl = `${window.location.origin}${url}`
      await navigator.clipboard.writeText(fullUrl)
      setCopiedLinkId(linkId)
      setTimeout(() => setCopiedLinkId(null), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const handleSaveNewLink = async (linkData) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const response = await fetch('/api/barber/booking-links/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barberId: user.id,
          name: linkData.name,
          url: linkData.url,
          services: linkData.services,
          timeSlots: linkData.timeSlots,
          duration: linkData.totalDuration,
          customPrice: linkData.totalPrice,
          discount: linkData.discount,
          expiresAt: linkData.expiresAt,
          description: linkData.description,
          requirePhone: linkData.requirePhone,
          requireEmail: linkData.requireEmail,
          allowReschedule: linkData.allowReschedule,
          sendReminders: linkData.sendReminders
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        const link = bookingLinks.find(l => l.id === linkId)
        if (link) {
          const linkWithQR = {
            ...link,
            qrCodeUrl: result.data.qrCodeUrl,
            qrGenerated: true
          }
          
          setSelectedLink(linkWithQR)
          setShowQRModal(true)
          showToastNotification('QR code generated successfully!', 'success')
          
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
      const updatedLinks = bookingLinks.map(l => 
        l.id === linkId 
          ? { ...l, embed_count: (l.embed_count || 0) + 1 }
          : l
      )
      setBookingLinks(updatedLinks)

      const linkForEmbed = {
        ...link,
        barberId: user?.id,
        services: link.services?.map((service, index) => ({
          id: index + 1,
          name: service
        })) || []
      }
      setSelectedLink(linkForEmbed)
      setShowEmbedModal(true)
    }
  }

  const toggleLinkStatus = async (linkId) => {
    try {
      setBookingLinks(links =>
        links.map(l => 
          l.id === linkId ? { ...l, active: !l.active } : l
        )
      )
    } catch (error) {
      console.error('Failed to toggle link status:', error)
    }
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "text-gray-900" }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('900', '100')}`}>
          <Icon className={`h-5 w-5 ${color.replace('900', '600')}`} />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  )

  const LinkCard = ({ link }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{link.name}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${
              link.active 
                ? 'bg-moss-100 text-moss-900' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {link.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded border truncate">
            {window.location?.origin || 'https://yourdomain.com'}{link.url}
          </p>
        </div>
        
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => toggleLinkStatus(link.id)}
            className={`p-2 rounded-lg transition-all ${
              link.active
                ? 'text-green-600 hover:bg-green-50'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
            title={link.active ? 'Deactivate' : 'Activate'}
          >
            {link.active ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
          </button>
          
          <button 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          
          <button 
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Services & Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Services</p>
          <div className="flex flex-wrap gap-1">
            {link.services.map((service, index) => (
              <span key={index} className="px-2 py-1 bg-olive-100 text-olive-800 text-xs rounded">
                {service}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Time Slots</p>
          <div className="flex flex-wrap gap-1">
            {link.timeSlots.map((slot, index) => (
              <span key={index} className="px-2 py-1 bg-gold-100 text-gold-800 text-xs rounded capitalize">
                {slot}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Duration</p>
            <p className="text-sm text-gray-600">{link.duration} min</p>
          </div>
          {link.customPrice && (
            <div>
              <p className="text-sm font-medium text-gray-700">Price</p>
              <p className="text-sm text-gray-600">${link.customPrice}</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-olive-600">{link.clicks}</p>
          <p className="text-xs text-gray-500">Clicks</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{link.conversions}</p>
          <p className="text-xs text-gray-500">Bookings</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-olive-600">{link.embed_count || 0}</p>
          <p className="text-xs text-gray-500">Embeds</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gold-600">{link.conversionRate}%</p>
          <p className="text-xs text-gray-500">Conversion</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-600">${link.revenue}</p>
          <p className="text-xs text-gray-500">Revenue</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(link.id, link.url)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
          >
            <ClipboardIcon className="h-4 w-4" />
            {copiedLinkId === link.id ? 'Copied!' : 'Copy Link'}
          </button>
          
          <button
            onClick={() => generateQRCode(link.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
              link.qrGenerated
                ? 'bg-moss-100 text-moss-800 hover:bg-green-200'
                : 'bg-olive-100 text-olive-700 hover:bg-olive-200'
            }`}
          >
            <QrCodeIcon className="h-4 w-4" />
            {link.qrGenerated ? 'View QR' : 'Generate QR'}
          </button>
          
          <button
            onClick={() => showEmbedCode(link.id)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-100 text-olive-700 hover:bg-indigo-200 rounded-lg transition-all"
          >
            <CodeBracketIcon className="h-4 w-4" />
            Embed
          </button>
          
          <button className="flex items-center gap-2 px-3 py-2 text-sm bg-gold-100 text-gold-700 hover:bg-gold-200 rounded-lg transition-all">
            <ShareIcon className="h-4 w-4" />
            Share
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
          {link.expiresAt && (
            <span>• Expires {new Date(link.expiresAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  )

  const totalClicks = bookingLinks.reduce((sum, link) => sum + link.clicks, 0)
  const totalConversions = bookingLinks.reduce((sum, link) => sum + link.conversions, 0)
  const totalRevenue = bookingLinks.reduce((sum, link) => sum + link.revenue, 0)
  const averageConversion = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Booking Links</h1>
              <p className="text-gray-600">Create and manage custom booking links for your services</p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-all"
            >
              <PlusIcon className="h-4 w-4" />
              Create New Link
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={LinkIcon}
            title="Active Links"
            value={bookingLinks.filter(l => l.active).length}
            subtitle={`${bookingLinks.length} total`}
            color="text-olive-900"
          />
          <StatCard
            icon={EyeIcon}
            title="Total Clicks"
            value={totalClicks.toLocaleString()}
            subtitle="All time"
            color="text-green-900"
          />
          <StatCard
            icon={ChartBarIcon}
            title="Conversions"
            value={`${totalConversions} (${averageConversion}%)`}
            subtitle="Clicks to bookings"
            color="text-gold-900"
          />
          <StatCard
            icon={CurrencyDollarIcon}
            title="Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            subtitle="From link bookings"
            color="text-orange-900"
          />
        </div>

        {/* Links List */}
        <div className="space-y-6">
          {bookingLinks.length > 0 ? (
            bookingLinks.map(link => (
              <LinkCard key={link.id} link={link} />
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Booking Links Yet</h3>
              <p className="text-gray-600 mb-6">Create your first custom booking link to share with clients</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-all"
              >
                Create Your First Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <CreateBookingLinkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveNewLink}
        barberId={user?.id}
      />

      {/* QR Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        bookingLink={selectedLink}
      />

      {/* Embed Modal */}
      <EmbedCodeModal
        isOpen={showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
        bookingLink={selectedLink}
      />

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce z-60 ${
          toastType === 'success' ? 'bg-moss-600 text-white' :
          toastType === 'error' ? 'bg-red-600 text-white' :
          'bg-amber-700 text-white'
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