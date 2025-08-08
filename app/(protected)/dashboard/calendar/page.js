'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { 
  CalendarIcon, 
  PlusCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  QrCodeIcon,
  LinkIcon,
  ShareIcon,
  CopyIcon,
  CheckIcon,
  MapPinIcon,
  UserIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'
import QRCode from 'qrcode'

// Dynamic import of FullCalendar to avoid SSR issues
// Using forwardRef to properly handle refs with dynamic imports
const FullCalendar = dynamic(
  () => import('@fullcalendar/react').then(mod => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
)

// Lazy load plugins
const loadCalendarPlugins = async () => {
  const [
    dayGridPlugin,
    timeGridPlugin,
    interactionPlugin,
    resourcePlugin,
    resourceTimeGridPlugin
  ] = await Promise.all([
    import('@fullcalendar/daygrid').then(mod => mod.default),
    import('@fullcalendar/timegrid').then(mod => mod.default),
    import('@fullcalendar/interaction').then(mod => mod.default),
    import('@fullcalendar/resource').then(mod => mod.default),
    import('@fullcalendar/resource-timegrid').then(mod => mod.default)
  ])
  
  return {
    dayGridPlugin,
    timeGridPlugin,
    interactionPlugin,
    resourcePlugin,
    resourceTimeGridPlugin
  }
}

export default function StableCalendarPage() {
  const [mounted, setMounted] = useState(false)
  const [plugins, setPlugins] = useState(null)
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState({})
  const [quickLinks, setQuickLinks] = useState([])
  // Remove ref since dynamic components don't support it directly
  // const calendarRef = useRef(null)

  // Initialize calendar
  useEffect(() => {
    setMounted(true)
    
    // Load plugins
    loadCalendarPlugins().then(setPlugins)
    
    // Set up mock data
    const mockResources = [
      { id: 'barber-1', title: 'John Smith', eventColor: '#10b981' },
      { id: 'barber-2', title: 'Sarah Johnson', eventColor: '#3b82f6' },
      { id: 'barber-3', title: 'Mike Brown', eventColor: '#f59e0b' },
      { id: 'barber-4', title: 'Lisa Davis', eventColor: '#8b5cf6' }
    ]
    
    const mockEvents = []
    const now = new Date()
    const services = [
      { name: 'Haircut', duration: 60, price: 35 },
      { name: 'Beard Trim', duration: 30, price: 25 },
      { name: 'Fade Cut', duration: 45, price: 45 },
      { name: 'Hair Color', duration: 90, price: 85 }
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
  }, [])

  const handleEventClick = useCallback((clickInfo) => {
    const event = clickInfo.event
    alert(`
Appointment Details:
Client: ${event.title}
Time: ${event.start.toLocaleTimeString()}
Service: ${event.extendedProps.service}
Duration: ${event.extendedProps.duration} minutes
Price: $${event.extendedProps.price}
    `.trim())
  }, [])

  const handleDateSelect = useCallback((selectInfo) => {
    const title = prompt('Enter client name and service:')
    if (title) {
      const calendarApi = selectInfo.view.calendar
      calendarApi.unselect()
      
      calendarApi.addEvent({
        id: `new-${Date.now()}`,
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        resourceId: selectInfo.resource?.id
      })
    }
  }, [])

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

  if (!mounted || !plugins) {
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
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <PlusCircleIcon className="h-5 w-5" />
                <span>New Appointment</span>
              </button>
              
              <button 
                onClick={() => setShowQRModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <QrCodeIcon className="h-5 w-5" />
                <span>QR Codes</span>
              </button>
              
              <div className="flex items-center text-sm text-gray-600">
                <ClockIcon className="h-4 w-4 mr-1" />
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <LinkIcon className="h-5 w-5 mr-2 text-blue-600" />
                Quick Booking Links
              </h2>
              <p className="text-sm text-gray-600">Generate QR codes and share booking links</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {quickLinks.map((link) => {
              const IconComponent = link.icon
              const colorClasses = {
                blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
                green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
                purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
              }
              
              return (
                <div key={link.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`h-10 w-10 bg-gradient-to-r ${colorClasses[link.color]} rounded-lg flex items-center justify-center`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{link.title}</h3>
                        <p className="text-xs text-gray-500">{link.subtitle}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => generateQRCode({ id: link.id, title: link.title, url: link.url })}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    >
                      <QrCodeIcon className="h-3 w-3" />
                      <span>QR Code</span>
                    </button>
                    
                    <button
                      onClick={() => copyToClipboard(link.url, link.id)}
                      className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    >
                      {copied[link.id] ? (
                        <>
                          <CheckIcon className="h-3 w-3 text-green-600" />
                          <span className="text-green-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-lg shadow-lg p-4" style={{ minHeight: '700px' }}>
          <FullCalendar
            plugins={[
              plugins.dayGridPlugin,
              plugins.timeGridPlugin,
              plugins.interactionPlugin,
              plugins.resourcePlugin,
              plugins.resourceTimeGridPlugin
            ]}
            initialView="resourceTimeGridDay"
            schedulerLicenseKey="0875458679-fcs-1754609365"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'resourceTimeGridDay,timeGridWeek,dayGridMonth'
            }}
            resources={resources}
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            eventClick={handleEventClick}
            select={handleDateSelect}
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5, 6],
              startTime: '09:00',
              endTime: '18:00'
            }}
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
            height="650px"
            nowIndicator={true}
            dayMaxEvents={true}
            weekends={true}
            eventDisplay="block"
            eventTimeFormat={{
              hour: 'numeric',
              minute: '2-digit',
              meridiem: 'short'
            }}
          />
        </div>

        {/* Instructions for License */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">FullCalendar License Setup</h3>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Add your FullCalendar license key to <code className="bg-white px-1 py-0.5 rounded">.env.local</code></li>
            <li>2. Set: <code className="bg-white px-1 py-0.5 rounded">NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY=your-actual-key</code></li>
            <li>3. Restart the Docker container: <code className="bg-white px-1 py-0.5 rounded">docker compose restart frontend</code></li>
            <li>4. The license warning will disappear once configured</li>
          </ol>
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
                          <CopyIcon className="h-4 w-4" />
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
    </div>
  )
}