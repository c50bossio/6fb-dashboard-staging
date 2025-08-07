'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect, useMemo } from 'react'

import AppointmentBookingModal from './AppointmentBookingModal'

import { useAuth } from '@/components/SupabaseAuthProvider'
import { FULLCALENDAR_LICENSE_KEY, premiumConfig } from '@/lib/fullcalendar-config'
import { captureException } from '@/lib/sentry'
import { createClient } from '@/lib/supabase/client'


// Dynamic import to avoid SSR issues
const FullCalendarWrapper = dynamic(
  () => import('./FullCalendarWrapper'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-white rounded-lg shadow-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }
)

// Status color mapping
const statusColors = {
  PENDING: '#f59e0b',
  CONFIRMED: '#10b981',
  COMPLETED: '#6b7280',
  CANCELLED: '#ef4444',
  NO_SHOW: '#dc2626'
}

export default function EnhancedBookingCalendar({ 
  barbershop_id,
  barber_id = null,
  view = 'resourceTimeGridDay',
  onAppointmentCreated,
  onAppointmentUpdated,
  onAppointmentDeleted,
  className = ''
}) {
  // State management
  const [appointments, setAppointments] = useState([])
  const [barbers, setBarbers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const { user } = useAuth()
  const supabase = createClient()

  // Fetch barbers for the barbershop
  const fetchBarbers = useCallback(async () => {
    try {
      const response = await fetch(`/api/barbers?barbershop_id=${barbershop_id}&active_only=true`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch barbers')
      }
      
      setBarbers(data.barbers)
    } catch (error) {
      console.error('Error fetching barbers:', error)
      captureException(error, { context: 'EnhancedBookingCalendar.fetchBarbers' })
      setError('Failed to load barbers')
    }
  }, [barbershop_id])

  // Fetch services for the barbershop
  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch(`/api/services?barbershop_id=${barbershop_id}&active_only=true`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch services')
      }
      
      setServices(data.services)
    } catch (error) {
      console.error('Error fetching services:', error)
      captureException(error, { context: 'EnhancedBookingCalendar.fetchServices' })
      setError('Failed to load services')
    }
  }, [barbershop_id])

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 13) // Two weeks view
      
      const params = new URLSearchParams({
        barbershop_id: barbershop_id,
        start_date: startOfWeek.toISOString(),
        end_date: endOfWeek.toISOString(),
        limit: '200'
      })
      
      if (barber_id) {
        params.append('barber_id', barber_id)
      }
      
      const response = await fetch(`/api/appointments?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch appointments')
      }
      
      setAppointments(data.appointments)
      setError(null)
    } catch (error) {
      console.error('Error fetching appointments:', error)
      captureException(error, { context: 'EnhancedBookingCalendar.fetchAppointments' })
      setError('Failed to load appointments')
    }
  }, [barbershop_id, barber_id, currentDate])

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await Promise.all([
          fetchBarbers(),
          fetchServices(),
          fetchAppointments()
        ])
      } finally {
        setLoading(false)
      }
    }
    
    if (barbershop_id && user) {
      loadData()
    }
  }, [barbershop_id, user, fetchBarbers, fetchServices, fetchAppointments])

  // Real-time subscriptions
  useEffect(() => {
    if (!user || !barbershop_id) return

    const channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `barbershop_id=eq.${barbershop_id}`,
        },
        (payload) => {
          console.log('Appointment change:', payload)
          fetchAppointments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, barbershop_id, supabase, fetchAppointments])

  // Transform data for FullCalendar
  const calendarEvents = useMemo(() => {
    return appointments.map(appointment => {
      const barber = barbers.find(b => b.id === appointment.barber_id)
      const service = appointment.service
      
      return {
        id: appointment.id,
        title: service?.name || 'Appointment',
        start: appointment.scheduled_at,
        end: new Date(new Date(appointment.scheduled_at).getTime() + appointment.duration_minutes * 60000).toISOString(),
        resourceId: appointment.barber_id,
        backgroundColor: statusColors[appointment.status] || '#3b82f6',
        borderColor: statusColors[appointment.status] || '#3b82f6',
        textColor: '#ffffff',
        extendedProps: {
          appointment,
          customer: appointment.client?.name || appointment.customer?.name || appointment.client_name || 'Walk-in',
          customerEmail: appointment.client?.email || appointment.customer?.email || appointment.client_email,
          customerPhone: appointment.client?.phone || appointment.customer?.phone || appointment.client_phone,
          service: service?.name,
          serviceDuration: appointment.duration_minutes,
          servicePrice: appointment.service_price,
          tipAmount: appointment.tip_amount,
          totalAmount: appointment.total_amount,
          status: appointment.status,
          notes: appointment.client_notes,
          barberNotes: appointment.barber_notes,
          isWalkIn: appointment.is_walk_in,
          bookingSource: appointment.booking_source,
          priority: appointment.priority
        }
      }
    })
  }, [appointments, barbers])

  const calendarResources = useMemo(() => {
    return barbers.map(barber => ({
      id: barber.id,
      title: barber.name,
      eventColor: barber.color || '#3b82f6',
      businessHours: barber.business_hours || {
        daysOfWeek: [1, 2, 3, 4, 5, 6],
        startTime: '09:00',
        endTime: '18:00'
      }
    }))
  }, [barbers])

  // Event handlers
  const handleEventClick = useCallback((info) => {
    const appointment = info.event.extendedProps.appointment
    setSelectedEvent(appointment)
    // You can add a modal to show appointment details here
    console.log('Appointment clicked:', appointment)
  }, [])

  const handleDateSelect = useCallback((info) => {
    if (!info.resource) return // Only allow booking on barber resources
    
    const selectedBarber = barbers.find(b => b.id === info.resource.id)
    if (!selectedBarber) return
    
    setSelectedSlot({
      start: info.start,
      end: info.end,
      barberId: info.resource.id,
      barberName: selectedBarber.name,
      allDay: info.allDay
    })
    setBookingModalOpen(true)
  }, [barbers])

  const handleEventDrop = useCallback(async (info) => {
    const { event } = info
    const appointment = event.extendedProps.appointment
    
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduled_at: event.start.toISOString(),
          barber_id: event.getResources()[0]?.id || appointment.barber_id
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update appointment')
      }
      
      const data = await response.json()
      onAppointmentUpdated?.(data.appointment)
      fetchAppointments() // Refresh to ensure consistency
      
    } catch (error) {
      console.error('Error updating appointment:', error)
      captureException(error, { context: 'EnhancedBookingCalendar.handleEventDrop' })
      info.revert() // Revert the change
      alert('Failed to reschedule appointment: ' + error.message)
    }
  }, [fetchAppointments, onAppointmentUpdated])

  const handleEventResize = useCallback(async (info) => {
    const { event } = info
    const appointment = event.extendedProps.appointment
    
    const newDuration = Math.round((event.end - event.start) / (1000 * 60))
    
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduled_at: event.start.toISOString(),
          duration_minutes: newDuration
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update appointment')
      }
      
      const data = await response.json()
      onAppointmentUpdated?.(data.appointment)
      fetchAppointments() // Refresh to ensure consistency
      
    } catch (error) {
      console.error('Error resizing appointment:', error)
      captureException(error, { context: 'EnhancedBookingCalendar.handleEventResize' })
      info.revert() // Revert the change
      alert('Failed to update appointment duration: ' + error.message)
    }
  }, [fetchAppointments, onAppointmentUpdated])

  const handleAppointmentBooked = useCallback(async (appointmentData) => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...appointmentData,
          barbershop_id
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create appointment')
      }
      
      const data = await response.json()
      onAppointmentCreated?.(data.appointment)
      fetchAppointments() // Refresh calendar
      setBookingModalOpen(false)
      setSelectedSlot(null)
      
    } catch (error) {
      console.error('Error creating appointment:', error)
      captureException(error, { context: 'EnhancedBookingCalendar.handleAppointmentBooked' })
      alert('Failed to create appointment: ' + error.message)
    }
  }, [barbershop_id, fetchAppointments, onAppointmentCreated])

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center bg-white rounded-lg shadow-sm ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`h-full flex items-center justify-center bg-white rounded-lg shadow-sm ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Calendar</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              fetchAppointments()
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full bg-white rounded-lg shadow-sm ${className}`}>
      <FullCalendarWrapper
        schedulerLicenseKey={FULLCALENDAR_LICENSE_KEY}
        events={calendarEvents}
        resources={calendarResources}
        showResources={true}
        onEventClick={handleEventClick}
        onDateSelect={handleDateSelect}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        view={view}
        height="100%"
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        slotDuration="00:15:00"
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday-Saturday
          startTime: '09:00',
          endTime: '18:00',
        }}
        {...premiumConfig}
      />
      
      {/* Booking Modal */}
      {bookingModalOpen && selectedSlot && (
        <AppointmentBookingModal
          isOpen={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false)
            setSelectedSlot(null)
          }}
          selectedSlot={selectedSlot}
          barbers={barbers}
          services={services}
          onBookingComplete={handleAppointmentBooked}
          barbershopId={barbershop_id}
        />
      )}
    </div>
  )
}