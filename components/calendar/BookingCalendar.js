'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect } from 'react'

import { FULLCALENDAR_LICENSE_KEY, premiumConfig } from '../../lib/fullcalendar-config'
import { captureException } from '../../lib/sentry'
import { createClient } from '../../lib/supabase/client'
import { useAuth } from '../SupabaseAuthProvider'
import { useToast } from '../ToastContainer'

// Dynamic import to avoid SSR issues
const FullCalendarWrapper = dynamic(
  () => import('./FullCalendarWrapper'),
  { 
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center">Loading calendar...</div>
  }
)

export default function BookingCalendar({ 
  barberId = null,
  showResources = true,
  onBookingCreate,
  onBookingUpdate,
  onBookingDelete,
}) {
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()
  const { success, error: showError, info } = useToast()

  // Fetch barbers/resources with individual business hours
  const fetchResources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('shop_id', user?.profile?.shop_id)
        .order('name')

      if (error) {
        console.warn('Database query failed for barbers, using mock data:', error.message)
        // Use mock barbers data when database is not available
        const mockBarbers = [
          {
            id: 'barber-1',
            name: 'John Smith',
            color: '#10b981',
            specialty: 'Classic Styles',
            business_hours: [
              { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00' },
              { daysOfWeek: [6], startTime: '08:00', endTime: '14:00' }
            ]
          },
          {
            id: 'barber-2', 
            name: 'Sarah Johnson',
            color: '#3b82f6',
            specialty: 'Modern Cuts',
            business_hours: [
              { daysOfWeek: [2, 3, 4], startTime: '10:00', endTime: '19:00' },
              { daysOfWeek: [5, 6], startTime: '09:00', endTime: '17:00' }
            ]
          },
          {
            id: 'barber-3',
            name: 'Mike Brown', 
            color: '#f59e0b',
            specialty: 'Beard Specialist',
            business_hours: [
              { daysOfWeek: [1, 3, 5], startTime: '11:00', endTime: '20:00' },
              { daysOfWeek: [6], startTime: '09:00', endTime: '16:00' }
            ]
          }
        ]
        
        const formattedResources = mockBarbers.map(barber => ({
          id: barber.id,
          title: `${barber.name} (Expert)`,
          businessHours: barber.business_hours,
          capacity: 1,
          eventColor: barber.color,
          extendedProps: {
            specialty: barber.specialty,
            level: 'Expert',
            hourlyRate: 50,
            experience: 5,
            skills: ['haircut', 'beard', 'styling'],
            level: 'barber',
            shopId: user?.profile?.shop_id || 'demo-shop'
          }
        }))
        
        setResources(formattedResources)
        return
      }

      const formattedResources = data.map(barber => {
        // Default business hours if not set
        const defaultBusinessHours = [
          { daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '18:00' }
        ]

        // Parse custom business hours or use default
        let businessHours = defaultBusinessHours
        if (barber.business_hours) {
          try {
            const parsed = typeof barber.business_hours === 'string' 
              ? JSON.parse(barber.business_hours) 
              : barber.business_hours

            // Handle different business hour formats
            if (Array.isArray(parsed)) {
              businessHours = parsed
            } else if (parsed.start && parsed.end) {
              // Legacy format - convert to new format
              businessHours = [{
                daysOfWeek: parsed.workingDays || [1, 2, 3, 4, 5, 6],
                startTime: parsed.start,
                endTime: parsed.end
              }]
            }
          } catch (e) {
            console.warn('Invalid business hours format for barber:', barber.name)
            businessHours = defaultBusinessHours
          }
        }

        // Set different schedules based on barber specialty/role with enhanced specialty info
        const barberSchedules = {
          // Marcus - Modern Cuts Specialist (longer hours, closed Mondays)
          'Marcus': {
            schedule: [
              { daysOfWeek: [2, 3, 4], startTime: '10:00', endTime: '19:00' }, // Tue-Thu
              { daysOfWeek: [5, 6], startTime: '09:00', endTime: '17:00' }     // Fri-Sat
            ],
            specialty: 'Modern Cuts',
            level: 'Senior'
          },
          // David - Classic Styles Expert (standard hours)
          'David': {
            schedule: [
              { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00' }, // Mon-Fri
              { daysOfWeek: [6], startTime: '08:00', endTime: '14:00' }               // Saturday
            ],
            specialty: 'Classic Styles',
            level: 'Expert'
          },
          // Mike - Beard Specialist (flexible hours)
          'Mike': {
            schedule: [
              { daysOfWeek: [1, 3, 5], startTime: '11:00', endTime: '20:00' }, // Mon, Wed, Fri
              { daysOfWeek: [6], startTime: '09:00', endTime: '16:00' }        // Saturday
            ],
            specialty: 'Beard Specialist',
            level: 'Specialist'
          }
        }

        // Use barber-specific schedule and specialty if available, otherwise use database or default
        let enhancedSpecialty = barber.specialty || 'General'
        let barberLevel = 'Junior'
        
        if (barberSchedules[barber.name]) {
          businessHours = barberSchedules[barber.name].schedule
          enhancedSpecialty = barberSchedules[barber.name].specialty
          barberLevel = barberSchedules[barber.name].level
        }

        return {
          id: barber.id,
          title: `${barber.name} (${barberLevel})`,
          businessHours: businessHours,
          capacity: barber.max_concurrent_bookings || 1,
          eventColor: barber.color || '#3b82f6',
          // Resource hierarchy: Shop → Station → Barber
          parentId: barber.station_id || `station-${enhancedSpecialty.toLowerCase().replace(' ', '-')}`,
          extendedProps: {
            specialty: enhancedSpecialty,
            level: barberLevel,
            hourlyRate: barber.hourly_rate || 0,
            experience: barber.years_experience || 0,
            skills: barber.skills ? (typeof barber.skills === 'string' ? JSON.parse(barber.skills) : barber.skills) : [],
            phone: barber.phone,
            email: barber.email,
            level: 'barber',
            stationId: barber.station_id,
            shopId: user?.profile?.shop_id
          }
        }
      })

      // Create station-level resources (group by specialty)
      const specialties = [...new Set(data.map(barber => {
        // Use enhanced specialty from schedule config if available
        if (barberSchedules[barber.name]) {
          return barberSchedules[barber.name].specialty
        }
        return barber.specialty || 'General'
      }))]
      const stationResources = specialties.map(specialty => ({
        id: `station-${specialty.toLowerCase().replace(' ', '-')}`,
        title: `${specialty} Station`,
        parentId: `shop-${user?.profile?.shop_id}`,
        eventColor: '#6b7280',
        extendedProps: {
          specialty: specialty,
          level: 'station',
          shopId: user?.profile?.shop_id
        }
      }))

      // Create shop-level resource
      const shopResource = {
        id: `shop-${user?.profile?.shop_id}`,
        title: user?.profile?.shop_name || 'Barbershop',
        eventColor: '#1f2937',
        extendedProps: {
          level: 'shop',
          shopId: user?.profile?.shop_id
        }
      }

      // Combine all resources in hierarchy order: Shop → Stations → Barbers
      const hierarchicalResources = [shopResource, ...stationResources, ...formattedResources]

      setResources(hierarchicalResources)
    } catch (error) {
      captureException(error, { context: 'BookingCalendar.fetchResources' })
    }
  }, [user, supabase])

  // Fetch bookings/events using API endpoint
  const fetchEvents = useCallback(async () => {
    try {
      // Use the API endpoint instead of direct Supabase query
      const params = new URLSearchParams()
      const now = new Date()
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      params.append('start_date', now.toISOString())
      params.append('end_date', oneWeekFromNow.toISOString())
      
      if (barberId) {
        params.append('barber_id', barberId)
      }
      if (user?.profile?.shop_id) {
        params.append('barbershop_id', user.profile.shop_id)
      }

      const response = await fetch(`/api/appointments?${params.toString()}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch appointments')
      }

      const appointments = result.appointments || []

      // Format appointments for FullCalendar
      const formattedBookings = appointments.map(appointment => ({
        id: appointment.id,
        title: `${appointment.client_name || appointment.client?.name || 'Client'} - ${appointment.service?.name || 'Service'}`,
        start: appointment.scheduled_at,
        end: new Date(new Date(appointment.scheduled_at).getTime() + (appointment.duration_minutes || appointment.service?.duration_minutes || 30) * 60000).toISOString(),
        resourceId: appointment.barber_id,
        backgroundColor: appointment.barber?.color || '#3b82f6',
        borderColor: appointment.barber?.color || '#3b82f6',
        extendedProps: {
          customer: appointment.client_name || appointment.client?.name || 'Unknown',
          customerEmail: appointment.client_email || appointment.client?.email,
          customerPhone: appointment.client_phone || appointment.client?.phone,
          service: appointment.service?.name,
          duration: appointment.duration_minutes || appointment.service?.duration_minutes,
          price: appointment.service_price || appointment.service?.price,
          status: appointment.status,
          notes: appointment.client_notes,
          barberNotes: appointment.barber_notes,
        },
        // Recurring events using RRule
        ...(appointment.recurrence_rule && {
          rrule: appointment.recurrence_rule,
          duration: appointment.duration_minutes || appointment.service?.duration_minutes || 60,
        }),
      }))

      // Add background events for time blocking
      const backgroundEvents = generateBackgroundEvents()
      
      // Combine regular bookings with background events
      const allEvents = [...formattedBookings, ...backgroundEvents]
      
      setEvents(allEvents)
    } catch (error) {
      captureException(error, { context: 'BookingCalendar.fetchEvents' })
    } finally {
      setLoading(false)
    }
  }, [barberId, user, supabase])

  // Generate background events for time blocking
  const generateBackgroundEvents = useCallback(() => {
    const today = new Date()
    const backgroundEvents = []

    // Generate background events for the next 30 days
    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(today)
      currentDate.setDate(today.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]

      // Skip Sundays (barbershop closed)
      if (currentDate.getDay() === 0) {
        backgroundEvents.push({
          id: `closed-${dateStr}`,
          title: 'Closed - Sunday',
          start: dateStr,
          display: 'background',
          backgroundColor: '#f3f4f6',
          borderColor: '#d1d5db',
          classNames: ['fc-closed-day'],
        })
        continue
      }

      // Add lunch breaks for each barber (12:00 PM - 1:00 PM)
      if (resources.length > 0) {
        resources.forEach(resource => {
          backgroundEvents.push({
            id: `lunch-${resource.id}-${dateStr}`,
            title: 'Lunch Break',
            start: `${dateStr}T12:00:00`,
            end: `${dateStr}T13:00:00`,
            resourceId: resource.id,
            display: 'background',
            backgroundColor: '#fef3c7',
            borderColor: '#f59e0b',
            classNames: ['fc-lunch-break'],
            editable: false,
          })
        })
      }

      // Add holidays (example: Christmas Day)
      const isChristmas = currentDate.getMonth() === 11 && currentDate.getDate() === 25
      if (isChristmas) {
        backgroundEvents.push({
          id: `holiday-christmas-${dateStr}`,
          title: 'Holiday - Christmas Day',
          start: dateStr,
          display: 'background',
          backgroundColor: '#fecaca',
          borderColor: '#ef4444',
          classNames: ['fc-holiday'],
          editable: false,
        })
      }

      // Add maintenance blocks (example: first Monday of each month, 8:00 AM - 9:00 AM)
      if (currentDate.getDay() === 1 && currentDate.getDate() <= 7) {
        backgroundEvents.push({
          id: `maintenance-${dateStr}`,
          title: 'Equipment Maintenance',
          start: `${dateStr}T08:00:00`,
          end: `${dateStr}T09:00:00`,
          display: 'background',
          backgroundColor: '#e0e7ff',
          borderColor: '#6366f1',
          classNames: ['fc-maintenance'],
          editable: false,
        })
      }
    }

    return backgroundEvents
  }, [resources])

  // Initial data fetch
  useEffect(() => {
    if (user) {
      if (showResources) {
        fetchResources()
      }
      fetchEvents()
    }
  }, [user, showResources, fetchResources, fetchEvents])

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: user.profile?.shop_id 
            ? `barbershop_id=eq.${user.profile.shop_id}`
            : undefined,
        },
        (payload) => {
          console.log('Appointment change:', payload)
          fetchEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, supabase, fetchEvents])

  // Event handlers
  const handleEventClick = useCallback((info) => {
    const booking = info.event
    const props = booking.extendedProps

    // Show booking details modal or handle click
    console.log('Booking clicked:', {
      id: booking.id,
      title: booking.title,
      customer: props.customer,
      service: props.service,
      start: booking.start,
      end: booking.end,
    })

    // You can implement a modal here or call a parent handler
  }, [])

  const handleDateSelect = useCallback(async (info) => {
    // Create new appointment using API
    const startTime = new Date(info.start)
    const endTime = new Date(info.end)
    const durationMinutes = Math.round((endTime - startTime) / 1000 / 60)
    
    // Default appointment data (this could be enhanced with a modal)
    const appointmentData = {
      barbershop_id: user?.profile?.shop_id || 'demo-shop-001',
      barber_id: info.resource?.id || 'barber-1', 
      service_id: 'service-001', // Default service, could be selected by user
      scheduled_at: info.start.toISOString(),
      duration_minutes: Math.max(durationMinutes, 30), // Minimum 30 minutes
      service_price: 35, // Default price
      client_name: 'Walk-in Customer',
      is_walk_in: true
    }

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create appointment')
      }

      console.log('Appointment created:', result.appointment)
      
      // Show success message
      success('Appointment created successfully', {
        title: 'Booking Confirmed',
        duration: 3000
      })
      
      // Refresh events to show the new appointment
      fetchEvents()
      
      // Call parent handler if provided
      if (onBookingCreate) {
        await onBookingCreate({
          ...appointmentData,
          id: result.appointment.id
        })
      }
    } catch (error) {
      console.error('Error creating appointment:', error)
      captureException(error, { context: 'BookingCalendar.handleDateSelect' })
      showError(`Failed to create appointment: ${error.message}`, {
        title: 'Booking Failed',
        duration: 5000
      })
    }
  }, [user, fetchEvents, onBookingCreate])

  const handleEventDrop = useCallback(async (info) => {
    const { event } = info

    try {
      // Update appointment using API
      const updateData = {
        scheduled_at: event.start.toISOString(),
        barber_id: event.getResources()[0]?.id,
      }

      const response = await fetch(`/api/appointments/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update appointment')
      }

      console.log('Appointment updated:', result.appointment)
      
      // Show success message
      success('Appointment updated successfully', {
        title: 'Update Confirmed',
        duration: 2000
      })
      
      // Refresh events to show the updated appointment
      fetchEvents()
      
      // Call parent handler if provided
      if (onBookingUpdate) {
        await onBookingUpdate(event.id, updateData)
      }
    } catch (error) {
      console.error('Error updating appointment:', error)
      captureException(error, { context: 'BookingCalendar.handleEventDrop' })
      showError(`Failed to update appointment: ${error.message}`, {
        title: 'Update Failed',
        duration: 5000
      })
      info.revert() // Revert the visual change
    }
  }, [fetchEvents, onBookingUpdate])

  const handleEventResize = useCallback(async (info) => {
    const { event } = info

    try {
      // Calculate new duration
      const startTime = new Date(event.start)
      const endTime = new Date(event.end)
      const durationMinutes = Math.round((endTime - startTime) / 1000 / 60)

      // Update appointment using API
      const updateData = {
        scheduled_at: event.start.toISOString(),
        duration_minutes: Math.max(durationMinutes, 15), // Minimum 15 minutes
      }

      const response = await fetch(`/api/appointments/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update appointment duration')
      }

      console.log('Appointment duration updated:', result.appointment)
      
      // Show success message
      success('Appointment duration updated successfully', {
        title: 'Duration Updated',
        duration: 2000
      })
      
      // Refresh events to show the updated appointment
      fetchEvents()
      
      // Call parent handler if provided
      if (onBookingUpdate) {
        await onBookingUpdate(event.id, updateData)
      }
    } catch (error) {
      console.error('Error updating appointment duration:', error)
      captureException(error, { context: 'BookingCalendar.handleEventResize' })
      showError(`Failed to update appointment duration: ${error.message}`, {
        title: 'Duration Update Failed',
        duration: 5000
      })
      info.revert() // Revert the visual change
    }
  }, [fetchEvents, onBookingUpdate])

  // Delete/Cancel appointment handler
  const handleEventDelete = useCallback(async (eventId) => {
    try {
      const response = await fetch(`/api/appointments/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel appointment')
      }

      console.log('Appointment cancelled:', result.message)
      
      // Show success message
      success('Appointment cancelled successfully', {
        title: 'Appointment Cancelled',
        duration: 3000
      })
      
      // Refresh events to remove the cancelled appointment
      fetchEvents()
      
      // Call parent handler if provided
      if (onBookingDelete) {
        await onBookingDelete(eventId)
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      captureException(error, { context: 'BookingCalendar.handleEventDelete' })
      showError(`Failed to cancel appointment: ${error.message}`, {
        title: 'Cancellation Failed',
        duration: 5000
      })
    }
  }, [fetchEvents, onBookingDelete])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white rounded-lg shadow-sm p-4">
      <FullCalendarWrapper
        schedulerLicenseKey={FULLCALENDAR_LICENSE_KEY}
        events={events}
        resources={resources}
        showResources={showResources}
        onEventClick={handleEventClick}
        onDateSelect={handleDateSelect}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        view={showResources ? 'resourceTimeGridDay' : 'timeGridWeek'}
        height="100%"
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        slotDuration="00:15:00"
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
          startTime: '09:00',
          endTime: '18:00',
        }}
        {...premiumConfig}
      />
    </div>
  )
}