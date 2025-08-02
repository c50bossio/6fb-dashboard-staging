'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { captureException } from '@/lib/sentry'
import { FULLCALENDAR_LICENSE_KEY, premiumConfig } from '@/lib/fullcalendar-config'

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

  // Fetch barbers/resources
  const fetchResources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('shop_id', user?.profile?.shop_id)
        .order('name')

      if (error) throw error

      const formattedResources = data.map(barber => ({
        id: barber.id,
        title: barber.name,
        businessHours: barber.business_hours || {
          start: '09:00',
          end: '18:00',
        },
        capacity: barber.max_concurrent_bookings || 1,
        eventColor: barber.color || '#3b82f6',
      }))

      setResources(formattedResources)
    } catch (error) {
      captureException(error, { context: 'BookingCalendar.fetchResources' })
    }
  }, [user, supabase])

  // Fetch bookings/events
  const fetchEvents = useCallback(async () => {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(name, email, phone),
          service:services(name, duration, price),
          barber:barbers(name, color)
        `)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (barberId) {
        query = query.eq('barber_id', barberId)
      } else if (user?.profile?.shop_id) {
        query = query.eq('shop_id', user.profile.shop_id)
      }

      const { data, error } = await query

      if (error) throw error

      const formattedEvents = data.map(booking => ({
        id: booking.id,
        title: booking.service?.name || 'Booking',
        start: booking.start_time,
        end: booking.end_time,
        resourceId: booking.barber_id,
        backgroundColor: booking.barber?.color || '#3b82f6',
        borderColor: booking.barber?.color || '#3b82f6',
        extendedProps: {
          customer: booking.customer?.name || 'Unknown',
          customerEmail: booking.customer?.email,
          customerPhone: booking.customer?.phone,
          service: booking.service?.name,
          duration: booking.service?.duration,
          price: booking.service?.price,
          status: booking.status,
          notes: booking.notes,
        },
        // Recurring events using RRule
        ...(booking.recurrence_rule && {
          rrule: booking.recurrence_rule,
          duration: booking.service?.duration || 60,
        }),
      }))

      setEvents(formattedEvents)
    } catch (error) {
      captureException(error, { context: 'BookingCalendar.fetchEvents' })
    } finally {
      setLoading(false)
    }
  }, [barberId, user, supabase])

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
      .channel('bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: user.profile?.shop_id 
            ? `shop_id=eq.${user.profile.shop_id}`
            : undefined,
        },
        (payload) => {
          console.log('Booking change:', payload)
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
    if (!onBookingCreate) return

    // Create new booking
    const newBooking = {
      start: info.start,
      end: info.end,
      resourceId: info.resource?.id,
      allDay: info.allDay,
    }

    try {
      await onBookingCreate(newBooking)
      fetchEvents()
    } catch (error) {
      captureException(error, { context: 'BookingCalendar.handleDateSelect' })
    }
  }, [onBookingCreate, fetchEvents])

  const handleEventDrop = useCallback(async (info) => {
    if (!onBookingUpdate) return

    const { event } = info

    try {
      await onBookingUpdate(event.id, {
        start_time: event.start.toISOString(),
        end_time: event.end.toISOString(),
        barber_id: event.getResources()[0]?.id,
      })
      fetchEvents()
    } catch (error) {
      captureException(error, { context: 'BookingCalendar.handleEventDrop' })
      info.revert()
    }
  }, [onBookingUpdate, fetchEvents])

  const handleEventResize = useCallback(async (info) => {
    if (!onBookingUpdate) return

    const { event } = info

    try {
      await onBookingUpdate(event.id, {
        start_time: event.start.toISOString(),
        end_time: event.end.toISOString(),
      })
      fetchEvents()
    } catch (error) {
      captureException(error, { context: 'BookingCalendar.handleEventResize' })
      info.revert()
    }
  }, [onBookingUpdate, fetchEvents])

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