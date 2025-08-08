'use client'

import { useEffect, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import CalendarErrorBoundary from '@/components/calendar/CalendarErrorBoundary'

// Dynamic imports with proper loading states
const FullCalendarWrapper = dynamic(
  () => import('@/components/calendar/FullCalendarWrapper'),
  { 
    ssr: false,
    loading: () => <CalendarSkeleton />
  }
)

// Loading skeleton component
function CalendarSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-[600px] bg-gray-200 rounded-lg"></div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

export default function ProductionBookingsPage() {
  const [mounted, setMounted] = useState(false)
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedView, setSelectedView] = useState('resourceTimeGridDay')

  // Ensure client-side only rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize with mock data
  useEffect(() => {
    if (!mounted) return

    const initializeCalendar = async () => {
      try {
        setLoading(true)
        
        // Mock data for immediate display
        const now = new Date()
        const mockEvents = [
          {
            id: 'evt-1',
            title: 'John Doe - Haircut',
            start: new Date(now.getTime() + 2 * 60 * 60 * 1000),
            end: new Date(now.getTime() + 2.5 * 60 * 60 * 1000),
            resourceId: 'barber-1',
            backgroundColor: '#10b981',
            borderColor: '#059669',
            extendedProps: {
              client: 'John Doe',
              service: 'Classic Haircut',
              price: 35,
              status: 'confirmed',
              phone: '555-0101'
            }
          },
          {
            id: 'evt-2',
            title: 'Jane Smith - Color',
            start: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            end: new Date(now.getTime() + 5.5 * 60 * 60 * 1000),
            resourceId: 'barber-2',
            backgroundColor: '#3b82f6',
            borderColor: '#2563eb',
            extendedProps: {
              client: 'Jane Smith',
              service: 'Hair Color',
              price: 85,
              status: 'confirmed',
              phone: '555-0102'
            }
          },
          {
            id: 'evt-3',
            title: 'Mike Wilson - Beard',
            start: new Date(now.getTime() + 3 * 60 * 60 * 1000),
            end: new Date(now.getTime() + 3.33 * 60 * 60 * 1000),
            resourceId: 'barber-3',
            backgroundColor: '#f59e0b',
            borderColor: '#d97706',
            extendedProps: {
              client: 'Mike Wilson',
              service: 'Beard Trim',
              price: 25,
              status: 'pending',
              phone: '555-0103'
            }
          }
        ]

        const mockResources = [
          {
            id: 'barber-1',
            title: 'John Smith',
            businessHours: {
              startTime: '09:00',
              endTime: '18:00'
            }
          },
          {
            id: 'barber-2',
            title: 'Sarah Johnson',
            businessHours: {
              startTime: '10:00',
              endTime: '19:00'
            }
          },
          {
            id: 'barber-3',
            title: 'Mike Brown',
            businessHours: {
              startTime: '08:00',
              endTime: '17:00'
            }
          }
        ]

        setEvents(mockEvents)
        setResources(mockResources)
        
        // Try to fetch real data in background
        fetchRealData()
        
      } catch (err) {
        console.error('Calendar initialization error:', err)
        setError('Failed to initialize calendar')
      } finally {
        setLoading(false)
      }
    }

    initializeCalendar()
  }, [mounted])

  const fetchRealData = async () => {
    try {
      // Fetch appointments
      const [appointmentsRes, barbersRes] = await Promise.all([
        fetch('/api/appointments?barbershop_id=demo-shop-001').catch(() => null),
        fetch('/api/barbers?barbershop_id=demo-shop-001').catch(() => null)
      ])

      if (appointmentsRes?.ok) {
        const data = await appointmentsRes.json()
        if (data.appointments?.length > 0) {
          const formattedEvents = data.appointments.map(apt => ({
            id: apt.id,
            title: `${apt.client_name || 'Guest'} - ${apt.service?.name || 'Service'}`,
            start: new Date(apt.scheduled_at),
            end: new Date(new Date(apt.scheduled_at).getTime() + apt.duration_minutes * 60000),
            resourceId: apt.barber_id,
            backgroundColor: apt.status === 'CONFIRMED' ? '#10b981' : '#f59e0b',
            borderColor: apt.status === 'CONFIRMED' ? '#059669' : '#d97706',
            extendedProps: {
              ...apt,
              client: apt.client_name,
              service: apt.service?.name,
              price: apt.service_price
            }
          }))
          setEvents(formattedEvents)
        }
      }

      if (barbersRes?.ok) {
        const data = await barbersRes.json()
        if (data.barbers?.length > 0) {
          const formattedResources = data.barbers.map(barber => ({
            id: barber.id,
            title: barber.name,
            businessHours: barber.business_hours?.monday || {
              startTime: '09:00',
              endTime: '18:00'
            }
          }))
          setResources(formattedResources)
        }
      }
    } catch (err) {
      console.warn('Failed to fetch real data, using mock data:', err)
    }
  }

  const handleEventClick = (info) => {
    const event = info.event
    const props = event.extendedProps
    
    const message = `
Appointment Details:
- Client: ${props.client || 'N/A'}
- Service: ${props.service || 'N/A'}
- Time: ${event.start.toLocaleTimeString()}
- Duration: ${props.duration_minutes || 30} minutes
- Price: $${props.price || 0}
- Status: ${props.status || 'pending'}
- Phone: ${props.phone || 'N/A'}
    `.trim()
    
    alert(message)
  }

  const handleEventDrop = (info) => {
    console.log('Event rescheduled:', {
      event: info.event.title,
      newStart: info.event.start,
      newResource: info.newResource?.id
    })
    // Here you would call API to update appointment
  }

  const handleDateSelect = (info) => {
    const clientName = prompt('Enter client name:')
    if (clientName) {
      const newEvent = {
        id: `new-${Date.now()}`,
        title: `${clientName} - New Booking`,
        start: info.start,
        end: info.end || new Date(info.start.getTime() + 30 * 60000),
        resourceId: info.resource?.id || resources[0]?.id,
        backgroundColor: '#8b5cf6',
        borderColor: '#7c3aed',
        extendedProps: {
          client: clientName,
          service: 'New Booking',
          status: 'pending'
        }
      }
      setEvents([...events, newEvent])
    }
  }

  // Don't render until mounted (avoid SSR issues)
  if (!mounted) {
    return <CalendarSkeleton />
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Booking Calendar</h1>
        <p className="text-gray-600 mt-2">
          Manage appointments and schedules
          {error && <span className="ml-2 text-amber-600 text-sm">({error})</span>}
        </p>
      </div>

      {/* View Selector */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setSelectedView('resourceTimeGridDay')}
          className={`px-4 py-2 rounded-md transition ${
            selectedView === 'resourceTimeGridDay' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Day View
        </button>
        <button
          onClick={() => setSelectedView('resourceTimeGridWeek')}
          className={`px-4 py-2 rounded-md transition ${
            selectedView === 'resourceTimeGridWeek'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Week View
        </button>
        <button
          onClick={() => setSelectedView('dayGridMonth')}
          className={`px-4 py-2 rounded-md transition ${
            selectedView === 'dayGridMonth'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Month View
        </button>
      </div>

      {/* Calendar Container */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <CalendarErrorBoundary>
          <Suspense fallback={<CalendarSkeleton />}>
            {!loading ? (
              <FullCalendarWrapper
                events={events}
                resources={resources}
                onEventClick={handleEventClick}
                onEventDrop={handleEventDrop}
                onDateSelect={handleDateSelect}
                view={selectedView}
                showResources={selectedView.includes('resource')}
                height="650px"
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                slotDuration="00:15:00"
                businessHours={{
                  daysOfWeek: [1, 2, 3, 4, 5, 6],
                  startTime: '09:00',
                  endTime: '18:00'
                }}
              />
            ) : (
              <CalendarSkeleton />
            )}
          </Suspense>
        </CalendarErrorBoundary>
      </div>

      {/* Stats Dashboard */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => {
                  const eventDate = new Date(e.start).toDateString()
                  return eventDate === new Date().toDateString()
                }).length}
              </p>
            </div>
            <div className="text-green-600">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Confirmed</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => e.extendedProps?.status === 'confirmed').length}
              </p>
            </div>
            <div className="text-blue-600">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => e.extendedProps?.status === 'pending').length}
              </p>
            </div>
            <div className="text-amber-600">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Barbers</p>
              <p className="text-2xl font-bold text-gray-900">{resources.length}</p>
            </div>
            <div className="text-purple-600">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}