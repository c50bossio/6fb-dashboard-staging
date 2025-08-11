'use client'

import FullCalendar from '@fullcalendar/react'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import rrulePlugin from '@fullcalendar/rrule'
// Import RRule class explicitly to ensure proper plugin initialization
import { RRule } from 'rrule'
import { useRef, useCallback, useEffect, useState, useMemo } from 'react'

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
  
  // Use events directly without processing
  // FullCalendar handles resource vs non-resource views internally
  const processedEvents = events
  
  // Minimal debug logging
  useEffect(() => {
    if (events.length > 0) {
      console.log('📅 Calendar events loaded:', events.length, 'for view:', currentView)
    }
  }, [events.length, currentView])
  
  // Enhanced slot selection handler with view awareness (for drag selection)
  const handleDateSelect = useCallback((selectInfo) => {
    const viewType = selectInfo.view.type
    
    // Capture comprehensive slot data from drag selection
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
      jsEvent: selectInfo.jsEvent,
      selectionType: 'drag',
      // Calculate duration in minutes
      duration: Math.round((selectInfo.end - selectInfo.start) / 60000)
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
        /* Force resource area to be visible */
        .fc-resource-area {
          width: 15% !important;
          min-width: 120px !important;
          display: block !important;
        }
        .fc-resource-area-header {
          background: #f3f4f6 !important;
          font-weight: 600 !important;
        }
        .fc-resource-cell {
          padding: 8px !important;
          background: #ffffff !important;
          border-right: 1px solid #e5e7eb !important;
        }
        .fc-resource-lane {
          min-height: 50px !important;
        }
        /* Ensure resource time grid view shows columns */
        .fc-resource-timegrid .fc-resource-col {
          width: 25% !important; /* 4 barbers = 25% each */
        }
        .fc-resource-timegrid-divider {
          display: block !important;
        }
        /* Pulse animation for optimistic updates */
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[
          resourceTimeGridPlugin,
          resourceTimelinePlugin,
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
          right: 'dayGridMonth,timeGridWeek,resourceTimeGridWeek,resourceTimelineWeek,listWeek'
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
          resourceTimelineWeek: {
            buttonText: 'Timeline',
            slotDuration: '01:00:00',
            slotLabelInterval: '01:00:00'
          },
          resourceTimeGridDay: {
            buttonText: 'Day'
          },
          listWeek: {
            buttonText: 'Agenda'
          }
        }}
        
        // Data - resources must be passed as initialResources for proper rendering
        // For non-resource views, we'll let FullCalendar handle resource events properly
        initialResources={resources}
        resources={resources}
        events={processedEvents}  // Use processed events
        // This allows resource events to display in non-resource views
        resourcesInitiallyExpanded={true}
        refetchResourcesOnNavigate={false}  // Prevent unnecessary resource refetching
        resourceLabelDidMount={(info) => {
          // Ensure resource labels are visible
          console.log('Resource mounted:', info.resource.title)
        }}
        
        // Time configuration
        timeZone="local"  // Use local timezone to prevent date/time issues
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
        slotEventOverlap={false}  // Prevent visual event overlap in time slots
        scrollTime="09:00:00"  // Initial scroll position to 9am
        expandRows={true}  // Expand rows to fill available height
        
        // Business hours
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5, 6],
          startTime: '09:00',
          endTime: '18:00'
        }}
        
        // Display
        height={height}
        nowIndicator={true}
        nowIndicatorClassNames={['current-time-indicator']}
        eventDisplay="auto"  // Changed from "block" to "auto" for proper event rendering
        dayMaxEvents={3}  // Show max 3 events, rest in popover
        moreLinkClick="popover"  // Show events in popover when there are too many
        moreLinkClassNames={['more-events-link']}
        weekNumbers={false}
        eventInteractive={true}  // Ensure events are interactive
        lazyFetching={true}  // Enable lazy loading for better performance
        progressiveEventRendering={true}  // Progressive rendering for better performance
        eventMaxStack={3}  // Max 3 events stacked in TimeGrid views
        eventMinHeight={20}  // Minimum height for events
        eventShortHeight={30}  // Height for short events
        
        // Interaction
        editable={true}
        selectable={true}
        selectMirror={true}
        selectMinDistance={2}  // Reduce to make selection easier
        selectLongPressDelay={250}  // Touch device long-press delay
        unselectAuto={true}  // Auto-unselect when clicking elsewhere
        unselectCancel=".fc-event,.modal"  // Don't unselect when clicking events or modals
        select={handleDateSelect}
        dateClick={(info) => {
          // Handle single clicks on dates/times
          console.log('📅 Single click on date/time:', info)
          
          // Only process clicks in time-based views (not month view)
          if (info.view.type.includes('timeGrid') || info.view.type.includes('resource')) {
            // For single clicks, we'll pass the start time and let the service selection determine duration
            // Initially show a provisional 1-hour slot, but this will update based on selected service
            const provisionalEnd = new Date(info.date)
            provisionalEnd.setHours(provisionalEnd.getHours() + 1)
            
            const slotData = {
              start: info.date,
              end: provisionalEnd, // This is provisional and will be recalculated based on service
              startStr: info.dateStr,
              endStr: provisionalEnd.toISOString(),
              allDay: false,
              viewType: info.view.type,
              resource: info.resource,
              resourceId: info.resource?.id,
              resourceTitle: info.resource?.title,
              jsEvent: info.jsEvent,
              selectionType: 'click',
              duration: null, // Will be determined by service selection
              isProvisional: true, // Indicates duration needs to be set by service
              // Add barber info for resource views
              barberId: info.resource?.id || null,
              barberName: info.resource?.title || null
            }
            
            console.log('📅 Opening modal from single click with data:', slotData)
            
            // Call the slot click handler
            if (onSlotClick) {
              onSlotClick(slotData)
            }
          } else if (info.view.type === 'dayGridMonth') {
            // For month view, create an all-day selection or default morning slot
            const slotData = {
              start: info.date,
              end: info.date,
              startStr: info.dateStr,
              endStr: info.dateStr,
              allDay: true,
              viewType: info.view.type,
              needsTimePicker: true,
              suggestedTime: '09:00',
              selectedDate: info.dateStr,
              selectionType: 'click',
              duration: 60
            }
            
            console.log('📅 Month view click - needs time selection:', slotData)
            
            if (onSlotClick) {
              onSlotClick(slotData)
            }
          }
        }}
        selectConstraint={{  // Constrain selection to business hours
          startTime: '08:00',
          endTime: '20:00'
        }}
        selectAllow={(selectInfo) => {
          // Additional validation for selection
          const duration = selectInfo.end - selectInfo.start
          return duration <= 4 * 60 * 60 * 1000  // Max 4 hours selection
        }}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResizableFromStart={true}  // Allow resizing from both ends
        eventDragMinDistance={5}  // Minimum drag distance before event moves
        dragRevertDuration={500}  // Animation duration when drag is reverted
        dragScroll={true}  // Enable auto-scroll while dragging
        viewDidMount={handleViewChange}
        datesSet={handleViewChange}  // Also handle when navigating dates
        loading={(isLoading) => {
          // Handle loading state
          console.log('Calendar loading:', isLoading)
        }}
        eventAdd={(info) => {
          console.log('Event added:', info.event.id)
        }}
        eventChange={(info) => {
          console.log('Event changed:', info.event.id)
        }}
        eventRemove={(info) => {
          console.log('Event removed:', info.event.id)
        }}
        
        // Event Display Configuration
        eventTimeFormat={{  // Better time formatting
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
        displayEventTime={true}
        displayEventEnd={false}  // Don't show end time in event title
        eventOrder="-duration,title"  // Order by duration (longest first), then title
        eventOrderStrict={false}  // Allow some flexibility in ordering
        nextDayThreshold="06:00:00"  // Events ending before 6am count as previous day
        
        // Event content rendering - Using eventDidMount for styling instead of eventContent
        // This preserves React event handling while allowing customization
        eventDidMount={(info) => {
          // Add custom classes based on event properties
          const { event } = info
          if (event.extendedProps?.isOptimistic) {
            info.el.classList.add('optimistic-event')
            info.el.style.opacity = '0.7'
          }
          if (event.extendedProps?.isRecurring) {
            info.el.classList.add('recurring-event')
          }
          // Add status-based styling
          if (event.extendedProps?.status) {
            info.el.classList.add(`event-status-${event.extendedProps.status}`)
          }
        }}
        // eventContent={(arg) => {
        //   const { event } = arg
        //   const isRecurring = event.extendedProps?.isRecurring
        //   const isRecurringInstance = event.extendedProps?.isRecurringInstance
        //   const isOptimistic = event.extendedProps?.isOptimistic
        //   const status = event.extendedProps?.status
        //   
        //   // Parse the title to separate customer and service
        //   const title = event.title || ''
        //   const titleParts = title.split(' - ')
        //   const customer = titleParts[0] || ''
        //   const service = titleParts[1] || ''
        //   
        //   return {
        //     html: `
        //       <div class="fc-event-main-frame" style="height: 100%; cursor: pointer; ${isOptimistic ? 'opacity: 0.7; position: relative;' : ''}">
        //         ${isOptimistic ? '<div style="position: absolute; top: 2px; right: 2px; width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; animation: pulse 1.5s infinite;"></div>' : ''}
        //         <div class="fc-event-title-container">
        //           <div class="fc-event-title fc-sticky" style="font-weight: 600; font-size: 12px;">
        //             ${isRecurring || isRecurringInstance ? '🔄 ' : ''}${isOptimistic ? '⏳ ' : ''}${customer}
        //           </div>
        //           ${service ? `<div style="font-size: 11px; opacity: 0.9;">${service}</div>` : ''}
        //           ${isOptimistic ? '<div style="font-size: 10px; opacity: 0.7; font-style: italic;">Booking...</div>' : ''}
        //         </div>
        //       </div>
        //     `
        //   }
        // }}
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
        
        // Resources - Enhanced configuration for proper rendering
        schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
        resourceAreaHeaderContent="Barbers"
        resourceAreaWidth="12%"
        resourceAreaColumns={[
          {
            field: 'title',
            headerContent: 'Barbers'
          }
        ]}
        datesAboveResources={false}
        refetchResourcesOnNavigate={true}
        resourceOrder="title"
        
        // Mobile responsiveness and better date formatting
        dayHeaderFormat={currentView.includes('resource') ? 
          { day: '2-digit' } :  // For resource views: just "10", "11", "12"
          { weekday: 'short', month: 'numeric', day: 'numeric' }  // For other views: "Mon 8/10"
        }
        dayHeaderContent={currentView.includes('resource') ? (arg) => {
          // Custom day names with "Th" for Thursday to avoid confusion with Tuesday
          const dayNames = ['S', 'M', 'T', 'W', 'Th', 'F', 'S']
          const dayOfWeek = arg.date.getDay()
          const dayNum = arg.date.getDate()
          
          // Return HTML structure with different sizes
          return {
            html: `<div style="text-align: center; line-height: 1.2;">
              <span style="font-size: 0.7rem; color: #6b7280;">${dayNames[dayOfWeek]}</span><br/>
              <span style="font-size: 0.9rem; font-weight: 600;">${dayNum}</span>
            </div>`
          }
        } : undefined}
        
        // Performance
        lazyFetching={true}
        progressiveEventRendering={true}
      />
    </div>
  )
}