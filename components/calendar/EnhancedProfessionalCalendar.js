'use client'

import FullCalendar from '@fullcalendar/react'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import rrulePlugin from '@fullcalendar/rrule'
// Import RRule class explicitly to ensure proper plugin initialization
import { RRule } from 'rrule'
import { useRef, useCallback, useEffect, useState } from 'react'

export default function EnhancedProfessionalCalendar({
  resources: externalResources,
  events: externalEvents,
  onSlotClick,
  onEventClick,
  onEventDrop,
  height = '700px',
  defaultView = 'resourceTimeGridWeek'
}) {
  const calendarRef = useRef(null)
  const [currentView, setCurrentView] = useState(defaultView)
  
  // Use external resources if provided, otherwise use defaults
  const defaultResources = [
    { id: 'barber-1', title: 'John Smith', eventColor: '#10b981' },
    { id: 'barber-2', title: 'Sarah Johnson', eventColor: '#3b82f6' },
    { id: 'barber-3', title: 'Mike Brown', eventColor: '#f59e0b' },
    { id: 'barber-4', title: 'Lisa Davis', eventColor: '#8b5cf6' }
  ]
  
  const resources = externalResources || defaultResources
  
  // Generate default events if none provided
  const generateWeekEvents = () => {
    const events = []
    const today = new Date()
    const currentDay = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1))
    
    // Generate events for each day of the week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + dayOffset)
      const dateStr = date.toISOString().split('T')[0]
      
      // Skip Sunday
      if (date.getDay() === 0) continue
      
      // Add some appointments for each barber
      resources.forEach((barber, barberIndex) => {
        // Morning appointment
        events.push({
          id: `${dateStr}-${barber.id}-1`,
          title: `Customer ${dayOffset + 1}${barberIndex + 1} - Haircut`,
          start: `${dateStr}T09:${barberIndex * 15 < 10 ? '0' : ''}${barberIndex * 15}:00`,
          end: `${dateStr}T09:${45 + barberIndex * 15 < 60 ? 45 + barberIndex * 15 : '00'}:00`,
          resourceId: barber.id,
          backgroundColor: barber.eventColor
        })
        
        // Afternoon appointment
        events.push({
          id: `${dateStr}-${barber.id}-2`,
          title: `Customer ${dayOffset + 5}${barberIndex + 1} - Service`,
          start: `${dateStr}T14:${barberIndex * 15 < 10 ? '0' : ''}${barberIndex * 15}:00`,
          end: `${dateStr}T14:${45 + barberIndex * 15 < 60 ? 45 + barberIndex * 15 : '00'}:00`,
          resourceId: barber.id,
          backgroundColor: barber.eventColor
        })
      })
    }
    
    return events
  }
  
  const events = externalEvents || generateWeekEvents()
  
  // Debug: Log events to see what we're working with
  useEffect(() => {
    console.log('🔍 Calendar Debug:', {
      externalEventsCount: externalEvents?.length || 0,
      usingExternalEvents: !!externalEvents,
      finalEventsCount: events.length,
      resourcesCount: resources.length,
      resources: resources.map(r => r.id)
    })
  }, [externalEvents, events, resources])
  
  // Enhanced slot selection handler with view awareness
  const handleDateSelect = useCallback((selectInfo) => {
    const viewType = selectInfo.view.type
    
    // Capture comprehensive slot data
    const slotData = {
      start: selectInfo.start,
      end: selectInfo.end,
      startStr: selectInfo.startStr,
      endStr: selectInfo.endStr,
      allDay: selectInfo.allDay,
      viewType: viewType,
      resource: selectInfo.resource,
      resourceId: selectInfo.resource?.id,
      resourceTitle: selectInfo.resource?.title,
      jsEvent: selectInfo.jsEvent
    }
    
    // Add view-specific enhancements
    if (viewType === 'dayGridMonth') {
      // Month view: Need to handle day selection
      slotData.isMonthView = true
      slotData.needsTimePicker = true
      slotData.selectedDate = selectInfo.start.toLocaleDateString()
      
      // Find available time slots for this date
      const dateStr = selectInfo.start.toISOString().split('T')[0]
      const dayEvents = events.filter(e => e.start.startsWith(dateStr))
      slotData.existingAppointments = dayEvents.length
      slotData.suggestedTime = findFirstAvailableSlot(dateStr, dayEvents)
    } else if (viewType === 'listWeek' || viewType === 'listDay') {
      // List view: Smart slot detection
      slotData.isListView = true
      slotData.nearbyEvents = findNearbyEvents(selectInfo.start)
    } else if (viewType === 'timeGridDay' || viewType === 'timeGridWeek') {
      // Standard time grid views (non-resource)
      slotData.isTimeGrid = true
      slotData.exactTime = selectInfo.start.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
      // Suggest a barber based on availability
      slotData.suggestedBarber = findAvailableBarber(selectInfo.start, selectInfo.end)
    } else if (viewType.includes('resourceTimeGrid')) {
      // Resource views: Already have barber from column
      slotData.isResourceView = true
      slotData.exactTime = selectInfo.start.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    // Log for debugging
    console.log('📅 Slot selected:', slotData)
    
    if (onSlotClick) {
      onSlotClick(slotData)
    }
    
    selectInfo.view.calendar.unselect()
  }, [onSlotClick, events])
  
  // Helper function to find first available slot
  const findFirstAvailableSlot = (dateStr, dayEvents) => {
    const slots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
    for (const slot of slots) {
      const slotTime = `${dateStr}T${slot}:00`
      const isOccupied = dayEvents.some(e => {
        const eventStart = new Date(e.start)
        const eventEnd = new Date(e.end)
        const checkTime = new Date(slotTime)
        return checkTime >= eventStart && checkTime < eventEnd
      })
      if (!isOccupied) {
        return slot
      }
    }
    return '09:00' // Default
  }
  
  // Helper function to find available barber
  const findAvailableBarber = (start, end) => {
    const startStr = start.toISOString()
    const endStr = end.toISOString()
    
    for (const barber of resources) {
      const hasConflict = events.some(event => {
        if (event.resourceId !== barber.id) return false
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        return (start < eventEnd && end > eventStart)
      })
      
      if (!hasConflict) {
        return {
          id: barber.id,
          name: barber.title,
          available: true
        }
      }
    }
    
    return {
      id: null,
      name: 'No barber available',
      available: false
    }
  }
  
  // Helper function to find nearby events
  const findNearbyEvents = (time) => {
    const timeMs = time.getTime()
    const hourBefore = new Date(timeMs - 3600000)
    const hourAfter = new Date(timeMs + 3600000)
    
    return events.filter(event => {
      const eventStart = new Date(event.start)
      return eventStart >= hourBefore && eventStart <= hourAfter
    })
  }
  
  // Handle event click
  const handleEventClick = useCallback((clickInfo) => {
    if (onEventClick) {
      onEventClick({
        event: clickInfo.event,
        element: clickInfo.el,
        jsEvent: clickInfo.jsEvent,
        view: clickInfo.view
      })
    }
  }, [onEventClick])
  
  // Handle event drop
  const handleEventDrop = useCallback((dropInfo) => {
    if (onEventDrop) {
      onEventDrop({
        event: dropInfo.event,
        oldEvent: dropInfo.oldEvent,
        oldResource: dropInfo.oldResource,
        newResource: dropInfo.newResource,
        delta: dropInfo.delta,
        revert: dropInfo.revert,
        view: dropInfo.view
      })
    }
  }, [onEventDrop])
  
  // Handle view change
  const handleViewChange = useCallback((arg) => {
    setCurrentView(arg.view.type)
    console.log('📅 View changed to:', arg.view.type)
  }, [])
  
  useEffect(() => {
    console.log('📅 Enhanced Calendar loaded with', events.length, 'events')
    if (events.length > 0) {
      console.log('📅 Sample event:', events[0])
      console.log('📅 Event start type:', typeof events[0].start)
    }
    
    // Make FullCalendar API accessible for debugging
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      if (calendarApi) {
        // Store API reference on the DOM element for debugging
        const calendarEl = document.querySelector('.fc')
        if (calendarEl) {
          calendarEl._fcApi = calendarApi
          console.log('📅 FullCalendar API initialized and attached to DOM')
        }
      }
    }
  }, [events.length])
  
  return (
    <div className="enhanced-professional-calendar-wrapper">
      <style jsx global>{`
        .fc-event {
          border-radius: 4px !important;
          padding: 4px !important;
          margin-bottom: 2px !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          cursor: pointer !important;
        }
        .fc-event-title {
          font-weight: 600 !important;
          font-size: 12px !important;
          line-height: 1.3 !important;
        }
        .fc-event-time {
          font-size: 11px !important;
          font-weight: 500 !important;
        }
        .fc-timegrid-event {
          min-height: 30px !important;
        }
        .fc-timegrid-event-harness {
          margin-right: 2px !important;
        }
        /* Fix the now indicator line */
        .fc-timegrid-now-indicator-line {
          border-color: #ef4444 !important;
          border-width: 2px !important;
          z-index: 10 !important;
        }
        .fc-timegrid-now-indicator-arrow {
          border-color: #ef4444 !important;
        }
      `}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[
          resourceTimeGridPlugin,
          dayGridPlugin,
          timeGridPlugin,
          listPlugin,
          interactionPlugin,
          rrulePlugin
        ]}
        
        // Timezone configuration
        timeZone='local'
        
        // View configuration
        initialView={defaultView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,resourceTimeGridWeek,resourceTimeGridDay,listWeek'
        }}
        views={{
          dayGridMonth: {
            buttonText: 'Month'
          },
          timeGridWeek: {
            buttonText: 'Week'
          },
          resourceTimeGridWeek: {
            buttonText: 'Week (Resources)'
          },
          resourceTimeGridDay: {
            buttonText: 'Day'
          },
          listWeek: {
            buttonText: 'Agenda'
          }
        }}
        
        // Data
        resources={resources}
        events={events}
        
        // Time configuration
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
        
        // Business hours
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5, 6],
          startTime: '09:00',
          endTime: '18:00'
        }}
        
        // Display
        height={height}
        nowIndicator={true}
        eventDisplay="auto"  // Changed from "block" to "auto" for proper event rendering
        dayMaxEvents={true}
        weekNumbers={false}
        eventInteractive={true}  // Ensure events are interactive
        
        // Interaction
        editable={true}
        selectable={true}
        selectMirror={true}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        viewDidMount={handleViewChange}
        
        // Event content rendering - Re-enable with proper click handling
        eventContent={(arg) => {
          const { event } = arg
          const isRecurring = event.extendedProps?.isRecurring
          const isRecurringInstance = event.extendedProps?.isRecurringInstance
          
          // Parse the title to separate customer and service
          const title = event.title || ''
          const titleParts = title.split(' - ')
          const customer = titleParts[0] || ''
          const service = titleParts[1] || ''
          
          return {
            html: `
              <div class="fc-event-main-frame" style="height: 100%; cursor: pointer;">
                <div class="fc-event-title-container">
                  <div class="fc-event-title fc-sticky" style="font-weight: 600; font-size: 12px;">
                    ${isRecurring || isRecurringInstance ? '🔄 ' : ''}${customer}
                  </div>
                  ${service ? `<div style="font-size: 11px; opacity: 0.9;">${service}</div>` : ''}
                </div>
              </div>
            `
          }
        }}
        // Old custom eventContent that was causing issues - kept commented
        // eventContent={(arg) => {
        //   const { event } = arg
        //   const isRecurring = event.extendedProps?.isRecurring
        //   const isRecurringInstance = event.extendedProps?.isRecurringInstance
          
        //   // Parse the title to separate customer and service
        //   const title = event.title || ''
        //   const titleParts = title.split(' - ')
        //   const customer = titleParts[0] || ''
        //   const service = titleParts[1] || ''
          
        //   return (
        //     <div className="p-1 h-full overflow-hidden">
        //       <div className="flex items-start justify-between mb-1">
        //         <div className="flex items-center min-w-0 flex-1">
        //           {(isRecurring || isRecurringInstance) && (
        //             <span className="text-xs mr-1 flex-shrink-0" title={isRecurring ? 'Recurring Series' : 'Recurring Instance'}>
        //               🔄
        //             </span>
        //           )}
        //           <div className="min-w-0 flex-1">
        //             <div className="font-semibold text-xs leading-tight truncate" title={customer}>
        //               {customer}
        //             </div>
        //             {service && (
        //               <div className="text-xs leading-tight opacity-90 truncate" title={service}>
        //                 {service}
        //               </div>
        //             )}
        //           </div>
        //         </div>
        //       </div>
        //       {event.extendedProps?.status && event.extendedProps.status !== 'confirmed' && (
        //         <div className="text-xs opacity-75 leading-tight">
        //           {event.extendedProps.status}
        //         </div>
        //       )}
        //     </div>
        //   )
        // }}
        
        // Resources
        schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
        resourceAreaHeaderContent="Barbers"
        resourceAreaWidth="15%"
        
        // Mobile responsiveness
        dayHeaderFormat={{ weekday: 'short', month: 'numeric', day: 'numeric' }}
        
        // Performance
        lazyFetching={true}
        progressiveEventRendering={true}
      />
    </div>
  )
}