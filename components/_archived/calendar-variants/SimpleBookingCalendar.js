'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useState, useEffect, useRef } from 'react'

import { createClient } from '../../lib/supabase/client'
import { useAuth } from '../SupabaseAuthProvider'

export default function SimpleBookingCalendar({ 
  onBookingCreate,
  onBookingUpdate,
  onBookingDelete,
}) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()
  const calendarRef = useRef(null)

  // Fetch bookings from database
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('start_time', { ascending: true })

        if (error) throw error

        // Convert to FullCalendar events
        const formattedEvents = data.map(booking => ({
          id: booking.id,
          title: booking.title || booking.customer_name || 'Appointment',
          start: booking.start_time,
          end: booking.end_time,
          backgroundColor: booking.status === 'confirmed' ? '#10b981' : '#f59e0b',
          borderColor: booking.status === 'confirmed' ? '#10b981' : '#f59e0b',
          extendedProps: {
            ...booking
          }
        }))

        setEvents(formattedEvents)
      } catch (error) {
        console.error('Error fetching bookings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, 
        () => {
          fetchBookings()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleDateSelect = (selectInfo) => {
    const title = prompt('Please enter appointment details:')
    const calendarApi = selectInfo.view.calendar

    calendarApi.unselect() // clear date selection

    if (title) {
      const bookingData = {
        title,
        start: selectInfo.start,
        end: selectInfo.end,
        resourceId: selectInfo.resource?.id,
        customerName: title,
        serviceType: 'Haircut'
      }

      // Call parent handler
      if (onBookingCreate) {
        onBookingCreate(bookingData)
      }

      // Optimistically add event
      calendarApi.addEvent({
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        backgroundColor: '#10b981',
        borderColor: '#10b981'
      })
    }
  }

  const handleEventClick = (clickInfo) => {
    if (confirm(`Cancel appointment '${clickInfo.event.title}'?`)) {
      if (onBookingDelete) {
        onBookingDelete(clickInfo.event.id)
      }
      clickInfo.event.remove()
    }
  }

  const handleEventDrop = (dropInfo) => {
    const updates = {
      start_time: dropInfo.event.start.toISOString(),
      end_time: dropInfo.event.end.toISOString()
    }

    if (onBookingUpdate) {
      onBookingUpdate(dropInfo.event.id, updates)
    }
  }

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
    <div className="h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        initialView='timeGridWeek'
        editable={true}
        selectable={true}
        selectMirror={true}
        events={events}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventDrop}
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday
          startTime: '09:00',
          endTime: '18:00',
        }}
        slotMinTime="08:00"
        slotMaxTime="20:00"
        height="100%"
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
        nowIndicator={true}
        dayMaxEvents={true}
        weekends={true}
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
      />
    </div>
  )
}