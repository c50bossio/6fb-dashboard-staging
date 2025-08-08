'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { 
  CalendarIcon, 
  PlusCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClockIcon,
  QrCodeIcon,
  LinkIcon,
  ShareIcon,
  ClipboardIcon,
  CheckIcon,
  MapPinIcon,
  UserIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import QRCode from 'qrcode'
import { useToast } from '../../../../components/ToastContainer'

// Use our standardized FullCalendarWrapper component with FullCalendar SDK
const FullCalendarWrapper = dynamic(
  () => import('../../../../components/calendar/FullCalendarWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading FullCalendar...</p>
      </div>
    )
  }
)

// Import the appointment modal
const AppointmentBookingModal = dynamic(
  () => import('../../../../components/calendar/AppointmentBookingModal'),
  { ssr: false }
)

export default function StableCalendarPage() {
  const [mounted, setMounted] = useState(false)
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState({})
  const [quickLinks, setQuickLinks] = useState([])
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false)
  const { success, error: showError, info } = useToast()
  
  // Modal states
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [services, setServices] = useState([])
  const [barbershopId] = useState('demo-shop-001') // For production, get from context

  // Initialize calendar with real data
  useEffect(() => {
    setMounted(true)
    
    // Fetch real data from API instead of using mock data
    fetchRealAppointments()
    fetchRealBarbers()
    fetchServices()
  }, [])

  // Fetch real appointments from API
  const fetchRealAppointments = async () => {
    try {
      const params = new URLSearchParams()
      const now = new Date()
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      params.append('start_date', now.toISOString())
      params.append('end_date', oneWeekFromNow.toISOString())

      const response = await fetch(`/api/appointments?${params.toString()}`)
      const result = await response.json()
      
      if (response.ok) {
        const appointments = result.appointments || []
        const formattedEvents = appointments.map(appointment => ({
          id: appointment.id,
          title: `${appointment.client_name || 'Client'} - ${appointment.service?.name || 'Service'}`,
          start: appointment.scheduled_at,
          end: new Date(new Date(appointment.scheduled_at).getTime() + (appointment.duration_minutes || 30) * 60000).toISOString(),
          resourceId: appointment.barber_id,
          backgroundColor: '#3b82f6',
          extendedProps: {
            customer: appointment.client_name,
            service: appointment.service?.name,
            duration: appointment.duration_minutes,
            price: appointment.service_price,
            status: appointment.status
          }
        }))
        setEvents(formattedEvents)
      } else {
        // Fallback to mock events if API fails
        generateMockEvents()
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
      generateMockEvents()
    }
  }

  // Fetch services from API
  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services')
      const result = await response.json()
      
      if (response.ok) {
        setServices(result.services || [])
      } else {
        // Use mock services if API fails
        setServices([
          { id: '1', name: 'Haircut', price: 35, duration_minutes: 30, description: 'Professional haircut' },
          { id: '2', name: 'Beard Trim', price: 20, duration_minutes: 20, description: 'Beard shaping and trim' },
          { id: '3', name: 'Hair & Beard', price: 50, duration_minutes: 45, description: 'Complete grooming package' },
          { id: '4', name: 'Kids Cut', price: 25, duration_minutes: 25, description: 'Children\'s haircut' },
          { id: '5', name: 'Shave', price: 30, duration_minutes: 30, description: 'Traditional hot towel shave' }
        ])
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      // Use mock services on error
      setServices([
        { id: '1', name: 'Haircut', price: 35, duration_minutes: 30, description: 'Professional haircut' },
        { id: '2', name: 'Beard Trim', price: 20, duration_minutes: 20, description: 'Beard shaping and trim' },
        { id: '3', name: 'Hair & Beard', price: 50, duration_minutes: 45, description: 'Complete grooming package' },
        { id: '4', name: 'Kids Cut', price: 25, duration_minutes: 25, description: 'Children\'s haircut' },
        { id: '5', name: 'Shave', price: 30, duration_minutes: 30, description: 'Traditional hot towel shave' }
      ])
    }
  }

  // Fetch real barbers from API or use mock data
  const fetchRealBarbers = () => {
    // Use mock barbers data (can be enhanced later to fetch from API)
    const mockResources = [
      { id: 'barber-1', title: 'John Smith', eventColor: '#10b981' },
      { id: 'barber-2', title: 'Sarah Johnson', eventColor: '#3b82f6' },
      { id: 'barber-3', title: 'Mike Brown', eventColor: '#f59e0b' },
      { id: 'barber-4', title: 'Lisa Davis', eventColor: '#8b5cf6' }
    ]
    
    setResources(mockResources)
    generateQuickLinks(mockResources)
  }

  // Generate quick links for QR code sharing
  const generateQuickLinks = (barberResources) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://6fb-ai.com'
    const mockQuickLinks = [
      {
        id: 'main-location',
        type: 'location',
        title: 'Main Barbershop',
        subtitle: 'Downtown Location',
        url: `${baseUrl}/book/location/main-downtown`,
        icon: BuildingStorefrontIcon,
        color: 'blue'
      },
      {
        id: 'north-location',
        type: 'location', 
        title: 'North Branch',
        subtitle: 'Uptown Location',
        url: `${baseUrl}/book/location/north-uptown`,
        icon: MapPinIcon,
        color: 'green'
      },
      ...(barberResources || resources).map(barber => ({
        id: barber.id,
        type: 'barber',
        title: barber.title,
        subtitle: 'Book directly',
        url: `${baseUrl}/book/${barber.id}`,
        icon: UserIcon,
        color: 'purple'
      }))
    ]
    
    setQuickLinks(mockQuickLinks)
  }

  // Fallback mock events when API is not available
  const generateMockEvents = () => {
    const mockEvents = []
    const now = new Date()
    const services = [
      { name: 'Haircut', duration: 60, price: 35 },
      { name: 'Beard Trim', duration: 30, price: 25 },
      { name: 'Fade Cut', duration: 45, price: 45 },
      { name: 'Hair Color', duration: 90, price: 85 }
    ]
    
    const mockResources = [
      { id: 'barber-1', title: 'John Smith', eventColor: '#10b981' },
      { id: 'barber-2', title: 'Sarah Johnson', eventColor: '#3b82f6' },
      { id: 'barber-3', title: 'Mike Brown', eventColor: '#f59e0b' },
      { id: 'barber-4', title: 'Lisa Davis', eventColor: '#8b5cf6' }
    ]
    
    // Generate events for today
    mockResources.forEach((resource, idx) => {
      for (let i = 0; i < 3; i++) {
        const startHour = 9 + idx * 2 + i
        if (startHour < 18) {
          const service = services[Math.floor(Math.random() * services.length)]
          const start = new Date(now)
          start.setHours(startHour, 0, 0, 0)
          const end = new Date(start.getTime() + service.duration * 60000)
          
          mockEvents.push({
            id: `${resource.id}-${i}`,
            title: `Client ${idx * 3 + i + 1} - ${service.name}`,
            start,
            end,
            resourceId: resource.id,
            backgroundColor: resource.eventColor,
            extendedProps: {
              service: service.name,
              price: service.price,
              duration: service.duration
            }
          })
        }
      }
    })
    
    setResources(mockResources)
    setEvents(mockEvents)
    
    // Generate quick links for barbershop locations and barbers
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://6fb-ai.com'
    const mockQuickLinks = [
      {
        id: 'main-location',
        type: 'location',
        title: 'Main Barbershop',
        subtitle: 'Downtown Location',
        url: `${baseUrl}/book/location/main-downtown`,
        icon: BuildingStorefrontIcon,
        color: 'blue'
      },
      {
        id: 'north-location',
        type: 'location', 
        title: 'North Branch',
        subtitle: 'Uptown Location',
        url: `${baseUrl}/book/location/north-uptown`,
        icon: MapPinIcon,
        color: 'green'
      },
      ...mockResources.map(barber => ({
        id: barber.id,
        type: 'barber',
        title: barber.title,
        subtitle: 'Book directly',
        url: `${baseUrl}/book/${barber.id}`,
        icon: UserIcon,
        color: 'purple'
      }))
    ]
    
    setQuickLinks(mockQuickLinks)
  }

  // Click outside detection for share dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareDropdownOpen && !event.target.closest('.share-dropdown')) {
        setShareDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [shareDropdownOpen])

  // Organize quick links by type for dropdown
  const organizedLinks = useMemo(() => {
    const locations = quickLinks.filter(link => link.type === 'location')
    const barbers = quickLinks.filter(link => link.type === 'barber')
    return { locations, barbers }
  }, [quickLinks])

  const handleEventClick = useCallback((clickInfo) => {
    const event = clickInfo.event
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      barber_id: event.resourceId,
      service: event.extendedProps.service,
      customer: event.extendedProps.customer,
      duration: event.extendedProps.duration,
      price: event.extendedProps.price,
      status: event.extendedProps.status
    })
    setShowAppointmentModal(true)
  }, [])

  const handleDateSelect = useCallback((selectInfo) => {
    // Open appointment modal with selected slot info
    setSelectedSlot({
      start: selectInfo.start,
      end: selectInfo.end,
      barberId: selectInfo.resource?.id
    })
    setShowAppointmentModal(true)
    
    // Unselect the time slot
    const calendarApi = selectInfo.view.calendar
    calendarApi.unselect()
  }, [])

  // Handle appointment save
  const handleAppointmentSave = async (appointmentData) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        success('Appointment booked successfully!', {
          title: 'Success',
          duration: 3000
        })
        
        // Refresh appointments
        fetchRealAppointments()
        setShowAppointmentModal(false)
      } else {
        showError(result.error || 'Failed to book appointment', {
          title: 'Booking Failed',
          duration: 5000
        })
      }
    } catch (error) {
      showError('Failed to book appointment: ' + error.message, {
        title: 'Error',
        duration: 5000
      })
    }
  }

  const generateQRCode = useCallback(async (resource) => {
    setSelectedResource(resource)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://6fb-ai.com'
    const bookingUrl = `${baseUrl}/book/${resource.id}?utm_source=qr&utm_medium=calendar&utm_campaign=booking`
    
    try {
      const qrDataUrl = await QRCode.toDataURL(bookingUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(qrDataUrl)
      setShowQRModal(true)
    } catch (error) {
      console.error('QR Code generation failed:', error)
    }
  }, [])

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
    if (qrCodeUrl && selectedResource) {
      const link = document.createElement('a')
      link.download = `booking-qr-${selectedResource.title.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = qrCodeUrl
      link.click()
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
                <p className="text-sm text-gray-600">Stable FullCalendar Implementation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => {
                  setSelectedSlot(null)
                  setSelectedEvent(null)
                  setShowAppointmentModal(true)
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusCircleIcon className="h-5 w-5" />
                <span>New Appointment</span>
              </button>
              
              {/* Share Dropdown */}
              <div className="relative share-dropdown">
                <button 
                  onClick={() => setShareDropdownOpen(!shareDropdownOpen)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ShareIcon className="h-5 w-5" />
                  <span>Share</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </button>

                {/* Dropdown Menu */}
                {shareDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-screen sm:w-80 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    {/* Locations Section */}
                    {organizedLinks.locations.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                          📍 LOCATIONS
                        </div>
                        {organizedLinks.locations.map((link) => {
                          const IconComponent = link.icon
                          return (
                            <div key={link.id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50 border-b border-gray-100">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <IconComponent className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{link.title}</div>
                                  <div className="text-xs text-gray-500">{link.subtitle}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => generateQRCode({ id: link.id, title: link.title, url: link.url })}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Generate QR Code"
                                >
                                  <QrCodeIcon className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(link.url, link.id)}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Copy Link"
                                >
                                  {copied[link.id] ? (
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ClipboardIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Barbers Section */}
                    {organizedLinks.barbers.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                          👤 BARBERS
                        </div>
                        {organizedLinks.barbers.map((link) => {
                          const IconComponent = link.icon
                          return (
                            <div key={link.id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <IconComponent className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{link.title}</div>
                                  <div className="text-xs text-gray-500">{link.subtitle}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => generateQRCode({ id: link.id, title: link.title, url: link.url })}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Generate QR Code"
                                >
                                  <QrCodeIcon className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(link.url, link.id)}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Copy Link"
                                >
                                  {copied[link.id] ? (
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ClipboardIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <ClockIcon className="h-4 w-4 mr-1" />
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Calendar Container */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-lg shadow-lg p-4" style={{ minHeight: '700px' }}>
          <FullCalendarWrapper
            view="resourceTimeGridDay"
            resources={resources}
            events={events}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
            showResources={true}
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5, 6],
              startTime: '09:00',
              endTime: '18:00'
            }}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
            height="650px"
          />
        </div>

      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedResource ? `QR Code - ${selectedResource.title}` : 'Booking QR Codes'}
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                        onClick={() => copyToClipboard(selectedResource.url, 'modal')}
                        className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 flex items-center"
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
                      onClick={downloadQRCode}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => window.open(selectedResource.url, '_blank')}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
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
                        onClick={() => generateQRCode({ id: link.id, title: link.title, url: link.url })}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className={`h-8 w-8 bg-gradient-to-r ${link.color === 'blue' ? 'from-blue-500 to-blue-600' : link.color === 'green' ? 'from-green-500 to-green-600' : 'from-purple-500 to-purple-600'} rounded flex items-center justify-center`}>
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
      )}

      {/* Appointment Booking Modal */}
      {showAppointmentModal && (
        <AppointmentBookingModal
          isOpen={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false)
            setSelectedSlot(null)
            setSelectedEvent(null)
          }}
          selectedSlot={selectedSlot}
          barbershopId={barbershopId}
          barbers={resources.map(r => ({ id: r.id, name: r.title }))}
          services={services}
          onBookingComplete={handleAppointmentSave}
          editingAppointment={selectedEvent}
        />
      )}
    </div>
  )
}