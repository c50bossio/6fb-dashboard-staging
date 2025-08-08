'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect } from 'react'

import { FULLCALENDAR_LICENSE_KEY, premiumConfig } from '../../lib/fullcalendar-config'
import { captureException } from '../../lib/sentry'
import { createClient } from '../../lib/supabase/client'
import { useAuth } from '../SupabaseAuthProvider'

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

  // Fetch barbers/resources with individual business hours
  const fetchResources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('shop_id', user?.profile?.shop_id)
        .order('name')

      if (error) throw error

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

  // Fetch bookings/events with background events
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

      // Format regular bookings
      const formattedBookings = data.map(booking => ({
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