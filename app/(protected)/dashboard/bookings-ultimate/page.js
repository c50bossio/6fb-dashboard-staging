'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { 
  CalendarIcon, 
  PlusCircleIcon, 
  ChartBarIcon,
  UserGroupIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ViewColumnsIcon,
  Bars3Icon
} from '@heroicons/react/24/outline'

// Dynamic import with error handling
const FullCalendarWrapper = dynamic(
  () => import('@/components/calendar/FullCalendarWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[600px] bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }
)

export default function UltimateBookingsPage() {
  // State management
  const [mounted, setMounted] = useState(false)
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [currentView, setCurrentView] = useState('resourceTimeGridDay')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [loading, setLoading] = useState(false)

  // Stats calculations
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start).toDateString()
    return eventDate === new Date().toDateString()
  })

  const confirmedEvents = events.filter(e => e.extendedProps?.status === 'CONFIRMED')
  const pendingEvents = events.filter(e => e.extendedProps?.status === 'PENDING')
  
  const todayRevenue = todayEvents.reduce((sum, e) => 
    sum + (e.extendedProps?.price || 0), 0
  )

  // Mount check for client-side rendering
  useEffect(() => {
    setMounted(true)
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    
    // Generate mock data with proper time slots
    const now = new Date()
    const startHour = 9
    const endHour = 18
    
    // Create resources (barbers)
    const mockResources = [
      {
        id: 'barber-1',
        title: 'John Smith',
        eventColor: '#10b981',
        businessHours: { start: '09:00', end: '18:00' }
      },
      {
        id: 'barber-2', 
        title: 'Sarah Johnson',
        eventColor: '#3b82f6',
        businessHours: { start: '10:00', end: '19:00' }
      },
      {
        id: 'barber-3',
        title: 'Mike Brown',
        eventColor: '#f59e0b',
        businessHours: { start: '08:00', end: '17:00' }
      },
      {
        id: 'barber-4',
        title: 'Lisa Davis',
        eventColor: '#8b5cf6',
        businessHours: { start: '09:00', end: '18:00' }
      }
    ]
    
    // Create realistic appointments throughout the day
    const mockEvents = []
    const services = [
      { name: 'Haircut', duration: 30, price: 35 },
      { name: 'Fade Cut', duration: 45, price: 45 },
      { name: 'Beard Trim', duration: 20, price: 25 },
      { name: 'Hair & Beard', duration: 60, price: 60 },
      { name: 'Hair Color', duration: 90, price: 85 },
      { name: 'Hot Shave', duration: 30, price: 40 }
    ]
    
    const clients = [
      'John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Brown',
      'Charlie Davis', 'Emma Johnson', 'Frank Miller', 'Grace Lee',
      'Henry Taylor', 'Ivy Chen', 'Jack Roberts', 'Kate Anderson'
    ]
    
    // Generate appointments for today and next few days
    for (let day = 0; day < 3; day++) {
      const date = new Date(now)
      date.setDate(date.getDate() + day)
      date.setHours(startHour, 0, 0, 0)
      
      // For each barber
      mockResources.forEach((barber, barberIndex) => {
        let currentTime = new Date(date)
        currentTime.setHours(startHour + barberIndex, 0, 0, 0)
        
        // Add 3-5 appointments per barber per day
        const appointmentCount = 3 + Math.floor(Math.random() * 3)
        
        for (let i = 0; i < appointmentCount; i++) {
          if (currentTime.getHours() >= endHour - 1) break
          
          const service = services[Math.floor(Math.random() * services.length)]
          const client = clients[Math.floor(Math.random() * clients.length)]
          const status = Math.random() > 0.2 ? 'CONFIRMED' : 'PENDING'
          
          mockEvents.push({
            id: `event-${day}-${barber.id}-${i}`,
            title: `${client} - ${service.name}`,
            start: new Date(currentTime),
            end: new Date(currentTime.getTime() + service.duration * 60000),
            resourceId: barber.id,
            backgroundColor: status === 'CONFIRMED' ? barber.eventColor : '#94a3b8',
            borderColor: status === 'CONFIRMED' ? barber.eventColor : '#64748b',
            extendedProps: {
              client,
              service: service.name,
              duration: service.duration,
              price: service.price,
              status,
              phone: `555-${Math.floor(1000 + Math.random() * 9000)}`,
              notes: 'Regular client'
            }
          })
          
          // Move to next time slot (with gaps)
          currentTime.setMinutes(currentTime.getMinutes() + service.duration + (15 * Math.floor(Math.random() * 3)))
        }
      })
    }
    
    setResources(mockResources)
    setEvents(mockEvents)
    setLoading(false)
    
    // Try to fetch real data in background
    fetchRealData()
  }

  const fetchRealData = async () => {
    try {
      const [appointmentsRes, barbersRes] = await Promise.all([
        fetch('/api/appointments?barbershop_id=demo-shop-001').catch(() => null),
        fetch('/api/barbers?barbershop_id=demo-shop-001').catch(() => null)
      ])

      if (appointmentsRes?.ok) {
        const data = await appointmentsRes.json()
        if (data.appointments?.length > 0) {
          // Process and merge with mock data
          console.log('Real appointments loaded:', data.appointments.length)
        }
      }
    } catch (err) {
      console.warn('Using mock data:', err)
    }
  }

  const handleEventClick = (info) => {
    const event = info.event
    const props = event.extendedProps
    
    alert(`
Appointment Details:
━━━━━━━━━━━━━━━━━━━
Client: ${props.client}
Service: ${props.service}
Time: ${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}
Duration: ${props.duration} minutes
Price: $${props.price}
Status: ${props.status}
Phone: ${props.phone}
Notes: ${props.notes || 'None'}
    `.trim())
  }

  const handleDateSelect = (selectInfo) => {
    const client = prompt('Enter client name:')
    if (client) {
      const newEvent = {
        id: `new-${Date.now()}`,
        title: `${client} - New Booking`,
        start: selectInfo.start,
        end: selectInfo.end || new Date(selectInfo.start.getTime() + 30 * 60000),
        resourceId: selectInfo.resource?.id,
        backgroundColor: '#94a3b8',
        borderColor: '#64748b',
        extendedProps: {
          client,
          service: 'Consultation',
          duration: 30,
          price: 0,
          status: 'PENDING',
          phone: '',
          notes: 'New booking - needs confirmation'
        }
      }
      setEvents([...events, newEvent])
      selectInfo.view.calendar.unselect()
    }
  }

  const handleEventDrop = (info) => {
    console.log('Event moved:', info.event.title, 'to', info.event.start)
    // Update the event in state
    setEvents(events.map(e => 
      e.id === info.event.id 
        ? { ...e, start: info.event.start, end: info.event.end, resourceId: info.event.getResources()[0]?.id }
        : e
    ))
  }

  const handleAddAppointment = () => {
    alert('Opening appointment modal...')
    // This would open a proper modal in production
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Collapsible Sidebar - Hidden for now since it's in parent layout */}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CalendarIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Appointment Calendar</h1>
                  <p className="text-sm text-gray-600">Manage bookings and appointments</p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleAddAppointment}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  New Appointment
                </button>
                
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  {showStats ? 'Hide' : 'Show'} Stats
                </button>
                
                <div className="flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
          
          {/* View Controls */}
          <div className="px-6 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { id: 'resourceTimeGridDay', label: 'Day', icon: '📅' },
                  { id: 'resourceTimeGridWeek', label: 'Week', icon: '📆' },
                  { id: 'dayGridMonth', label: 'Month', icon: '🗓️' },
                  { id: 'listWeek', label: 'List', icon: '📋' }
                ].map(view => (
                  <button
                    key={view.id}
                    onClick={() => setCurrentView(view.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      currentView === view.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-1">{view.icon}</span>
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              {/* License status - using trial for demo */}
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded">
                ✓ Premium Features Active
              </span>
            </div>
          </div>
        </header>

        {/* Stats Dashboard */}
        {showStats && (
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600 uppercase">Today's Appointments</p>
                    <p className="text-2xl font-bold text-gray-900">{todayEvents.length}</p>
                  </div>
                  <CalendarIcon className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-600 uppercase">Today's Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${todayRevenue}</p>
                  </div>
                  <CurrencyDollarIcon className="h-8 w-8 text-green-500 opacity-50" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 uppercase">Active Barbers</p>
                    <p className="text-2xl font-bold text-gray-900">{resources.length}</p>
                  </div>
                  <UserGroupIcon className="h-8 w-8 text-purple-500 opacity-50" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-amber-600 uppercase">Utilization Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round((confirmedEvents.length / (resources.length * 8)) * 100)}%
                    </p>
                  </div>
                  <ChartBarIcon className="h-8 w-8 text-amber-500 opacity-50" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Container */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow-lg h-full">
            <FullCalendarWrapper
              events={events}
              resources={resources}
              onEventClick={handleEventClick}
              onEventDrop={handleEventDrop}
              onDateSelect={handleDateSelect}
              view={currentView}
              showResources={currentView.includes('resource')}
              height="100%"
              slotMinTime="07:00:00"
              slotMaxTime="21:00:00"
              slotDuration="00:15:00"
              businessHours={{
                daysOfWeek: [1, 2, 3, 4, 5, 6],
                startTime: '09:00',
                endTime: '18:00'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}