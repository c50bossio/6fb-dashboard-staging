'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/SupabaseAuthProvider'

// Dynamic import to avoid SSR issues
const EnhancedProfessionalCalendar = dynamic(
  () => import('@/components/calendar/EnhancedProfessionalCalendar'),
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

  // ALL MOCK DATA REMOVED - USING REAL DATABASE OPERATIONS ONLY

  useEffect(() => {
    // Load real data from database - NO MOCK DATA
    fetchRealData()
  }, [user])

  const fetchRealData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      
      const barbershopId = user.barbershop_id || 'demo-shop-001'
      
      // Load real appointments and barbers via API calls
      const today = new Date()
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const [appointmentsResponse, barbersResponse] = await Promise.all([
        fetch(`/api/calendar/appointments?shop_id=${barbershopId}&start_date=${today.toISOString()}&end_date=${nextWeek.toISOString()}`).then(r => r.json()),
        fetch(`/api/barbers?shop_id=${barbershopId}`).then(r => r.json())
      ])
      
      // Transform barber data to resource format
      const resources = (barbersResponse.barbers || []).map((barber, index) => ({
        id: barber.id,
        title: barber.name,
        eventColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'][index % 6],
        extendedProps: {
          email: barber.email,
          phone: barber.phone,
          specialization: barber.specialization || 'General Services',
          isRealData: true
        }
      }))
      
      const events = appointmentsResponse.appointments || []
      
      console.log(`📅 Loaded ${events.length} real appointments`)
      console.log(`👥 Loaded ${resources.length} real barber resources`)
      
      setEvents(events)
      setResources(resources)
      
      if (events.length === 0 && resources.length === 0) {
        setError('No bookings or barbers found. Database may need seeding.')
      }
      
    } catch (err) {
      console.error('Error fetching real data:', err)
      setError(`API error: ${err.message}`)
      // Show empty state instead of mock data
      setEvents([])
      setResources([])
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
        <EnhancedProfessionalCalendar
          initialEvents={events}
          initialResources={resources}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          onDateSelect={handleDateSelect}
          initialView="resourceTimeGridDay"
          height="650px"
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