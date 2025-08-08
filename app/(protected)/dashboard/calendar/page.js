'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { 
  CalendarIcon, 
  PlusCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

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
              
              <div className="flex items-center text-sm text-gray-600">
                <ClockIcon className="h-4 w-4 mr-1" />
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="p-6">
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
    </div>
  )
}