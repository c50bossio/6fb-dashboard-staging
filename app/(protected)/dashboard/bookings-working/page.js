'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/SupabaseAuthProvider'

// Dynamic import to avoid SSR issues
const FullCalendarWrapper = dynamic(
  () => import('@/components/calendar/FullCalendarWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }
)

export default function BookingsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Mock data for testing
  const mockEvents = [
    {
      id: 'event-001',
      title: 'John Doe - Haircut',
      start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
      resourceId: 'barber-001',
      backgroundColor: '#4CAF50',
      extendedProps: {
        client_name: 'John Doe',
        service: 'Classic Haircut',
        price: 35,
        status: 'confirmed'
      }
    },
    {
      id: 'event-002',
      title: 'Jane Smith - Fade Cut',
      start: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 4.75 * 60 * 60 * 1000).toISOString(),
      resourceId: 'barber-002',
      backgroundColor: '#2196F3',
      extendedProps: {
        client_name: 'Jane Smith',
        service: 'Fade Cut',
        price: 45,
        status: 'confirmed'
      }
    },
    {
      id: 'event-003',
      title: 'Bob Wilson - Beard Trim',
      start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 24.33 * 60 * 60 * 1000).toISOString(),
      resourceId: 'barber-003',
      backgroundColor: '#FF9800',
      extendedProps: {
        client_name: 'Bob Wilson',
        service: 'Beard Trim',
        price: 25,
        status: 'pending'
      }
    }
  ]

  const mockResources = [
    {
      id: 'barber-001',
      title: 'John Smith',
      eventColor: '#4CAF50'
    },
    {
      id: 'barber-002', 
      title: 'Mike Johnson',
      eventColor: '#2196F3'
    },
    {
      id: 'barber-003',
      title: 'Sarah Williams',
      eventColor: '#FF9800'
    }
  ]

  useEffect(() => {
    // Set mock data immediately
    setEvents(mockEvents)
    setResources(mockResources)
    
    // Try to fetch real data in background
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch appointments
      const appointmentsRes = await fetch('/api/appointments?barbershop_id=demo-shop-001')
      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json()
        const formattedEvents = (data.appointments || []).map(apt => ({
          id: apt.id,
          title: `${apt.client_name || 'Guest'} - ${apt.service?.name || 'Service'}`,
          start: apt.scheduled_at,
          end: new Date(new Date(apt.scheduled_at).getTime() + apt.duration_minutes * 60000).toISOString(),
          resourceId: apt.barber_id,
          backgroundColor: apt.status === 'CONFIRMED' ? '#4CAF50' : '#FF9800',
          extendedProps: {
            ...apt,
            client_name: apt.client_name,
            service: apt.service?.name,
            price: apt.service_price
          }
        }))
        if (formattedEvents.length > 0) {
          setEvents(formattedEvents)
        }
      }

      // Fetch barbers as resources
      const barbersRes = await fetch('/api/barbers?barbershop_id=demo-shop-001')
      if (barbersRes.ok) {
        const data = await barbersRes.json()
        const formattedResources = (data.barbers || []).map(barber => ({
          id: barber.id,
          title: barber.name,
          eventColor: '#' + Math.floor(Math.random()*16777215).toString(16)
        }))
        if (formattedResources.length > 0) {
          setResources(formattedResources)
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Using demo data')
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = (info) => {
    console.log('Event clicked:', info.event)
    alert(`Appointment: ${info.event.title}\nStatus: ${info.event.extendedProps.status}\nPrice: $${info.event.extendedProps.price}`)
  }

  const handleEventDrop = async (info) => {
    console.log('Event dropped:', info.event)
    // Here you would update the appointment time via API
  }

  const handleDateSelect = (info) => {
    console.log('Date selected:', info)
    const title = prompt('Enter client name:')
    if (title) {
      const newEvent = {
        id: `temp-${Date.now()}`,
        title: `${title} - New Booking`,
        start: info.start,
        end: info.end,
        resourceId: info.resource?.id,
        backgroundColor: '#9C27B0'
      }
      setEvents([...events, newEvent])
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Booking Calendar</h1>
        <p className="text-gray-600 mt-2">
          Manage your appointments and schedule
          {error && <span className="ml-2 text-sm text-amber-600">({error})</span>}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6" style={{ minHeight: '700px' }}>
        <FullCalendarWrapper
          events={events}
          resources={resources}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          onDateSelect={handleDateSelect}
          view="resourceTimeGridDay"
          showResources={true}
          height="650px"
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:15:00"
        />
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Today's Appointments</h3>
          <p className="text-2xl font-bold text-gray-900">{events.filter(e => {
            const eventDate = new Date(e.start).toDateString()
            const today = new Date().toDateString()
            return eventDate === today
          }).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Active Barbers</h3>
          <p className="text-2xl font-bold text-gray-900">{resources.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
          <p className="text-2xl font-bold text-gray-900">{events.length}</p>
        </div>
      </div>
    </div>
  )
}