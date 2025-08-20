'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import rrulePlugin from '@fullcalendar/rrule'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { RRule } from 'rrule'

export default function EnhancedProfessionalCalendar({
  resources: externalResources,
  events: externalEvents,
  currentView: controlledView,
  onViewChange,
  onSlotClick,
  onEventClick,
  onEventDrop,
  height = '700px',
  defaultView = 'resourceTimeGridDay'
}) {
  const calendarRef = useRef(null)
  const [currentView, setCurrentView] = useState(controlledView || defaultView)
  
  useEffect(() => {
    if (controlledView && controlledView !== currentView) {
      setCurrentView(controlledView)
    }
  }, [controlledView])
  
  // Use external resources or empty array - let parent handle defaults
  const resources = externalResources || []
  
  const events = externalEvents || []
  
  const processedEvents = events
  
  useEffect(() => {
    // Calendar state updates handled by FullCalendar internally
  }, [events.length, currentView])
  
  const handleDateSelect = useCallback((selectInfo) => {
    const viewType = selectInfo.view.type
    
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
      duration: Math.round((selectInfo.end - selectInfo.start) / 60000)
    }
    
    if (viewType === 'dayGridMonth') {
      slotData.isMonthView = true
      slotData.needsTimePicker = true
      slotData.selectedDate = selectInfo.start.toLocaleDateString()
      
      const dateStr = selectInfo.start.toISOString().split('T')[0]
      const dayEvents = events.filter(e => e.start && e.start.startsWith(dateStr))
      slotData.existingAppointments = dayEvents.length
      slotData.suggestedTime = findFirstAvailableSlot(dateStr, dayEvents)
    } else if (viewType === 'listWeek' || viewType === 'listDay') {
      slotData.isListView = true
      slotData.nearbyEvents = findNearbyEvents(selectInfo.start)
    } else if (viewType === 'timeGridDay' || viewType === 'timeGridWeek') {
      slotData.isTimeGrid = true
      slotData.exactTime = selectInfo.start.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
      slotData.suggestedBarber = findAvailableBarber(selectInfo.start, selectInfo.end)
    } else if (viewType.includes('resourceTimeGrid')) {
      slotData.isResourceView = true
      slotData.exactTime = selectInfo.start.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const durationHours = Math.round(slotData.duration / 60 * 10) / 10  // Round to 1 decimal place
    const durationDisplay = durationHours >= 1 
      ? `${durationHours}h` 
      : `${slotData.duration}min`
    
    const enhancedSlotData = {
      ...slotData,
      durationDisplay,
      isLongSelection: slotData.duration >= 120  // 2+ hours
    }
    
    if (slotData.duration >= 240) {  // 4+ hours
    }
    
    if (onSlotClick) {
      onSlotClick(enhancedSlotData)
    }
    
    selectInfo.view.calendar.unselect()
  }, [onSlotClick, events])
  
  const findFirstAvailableSlot = (dateStr, dayEvents = []) => {
    const slots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
    for (const slot of slots) {
      const slotTime = `${dateStr}T${slot}:00`
      const isOccupied = dayEvents.some(e => {
        if (!e.start || !e.end) return false
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
  
  const findAvailableBarber = (start, end) => {
    if (!events || events.length === 0) {
      return resources.length > 0 ? {
        id: resources[0].id,
        name: resources[0].title,
        available: true
      } : {
        id: null,
        name: 'No barbers configured',
        available: false
      }
    }
    
    const startStr = start.toISOString()
    const endStr = end.toISOString()
    
    for (const barber of resources) {
      const hasConflict = events.some(event => {
        if (!event.start || !event.end || event.resourceId !== barber.id) return false
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
  
  const findNearbyEvents = (time) => {
    if (!events || events.length === 0) return []
    
    const timeMs = time.getTime()
    const hourBefore = new Date(timeMs - 3600000)
    const hourAfter = new Date(timeMs + 3600000)
    
    return events.filter(event => {
      if (!event.start) return false
      const eventStart = new Date(event.start)
      return eventStart >= hourBefore && eventStart <= hourAfter
    })
  }
  
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
  
  const handleViewChange = useCallback((arg) => {
    const newView = arg.view.type
    setCurrentView(newView)
    if (onViewChange) {
      onViewChange(newView)
    }
  }, [onViewChange])
  
  useEffect(() => {
    // Ensure calendar API is accessible for external references
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi()
      if (calendarApi) {
        const calendarEl = document.querySelector('.fc')
        if (calendarEl) {
          calendarEl._fcApi = calendarApi
        }
      }
    }
  }, [events.length])
  
  return (
    <div className="enhanced-professional-calendar-wrapper">
      <style jsx global>{`
        /* Essential calendar styling - keep minimal for stability */
        .fc-event {
          border-radius: 4px !important;
          cursor: pointer !important;
        }
        .fc-timegrid-now-indicator-line {
          border-color: #ef4444 !important;
          border-width: 2px !important;
        }
        .fc-resource-area {
          min-width: 120px !important;
        }
        .fc-resource-area-header {
          background: #f3f4f6 !important;
          font-weight: 600 !important;
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
        
        initialView={controlledView || defaultView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimeGridDay,timeGridWeek,resourceTimeGridWeek,dayGridMonth,listWeek'
        }}
        views={{
          dayGridMonth: {
            buttonText: 'Month'
          },
          timeGridWeek: {
            buttonText: 'Week'
          },
          resourceTimeGridWeek: {
            buttonText: 'Barber Week'
          },
          resourceTimelineWeek: {
            buttonText: 'Timeline',
            slotDuration: '01:00:00',
            slotLabelInterval: '01:00:00'
          },
          resourceTimeGridDay: {
            buttonText: 'Barber Day'
          },
          listWeek: {
            buttonText: 'Agenda'
          }
        }}
        
        resources={resources}  // Only use resources prop, not initialResources
        events={processedEvents}  // Use processed events
        resourcesInitiallyExpanded={true}
        refetchResourcesOnNavigate={false}  // Prevent unnecessary resource refetching
        resourceLabelDidMount={(info) => {
          // Resource labels use default styling
        }}
        
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
        
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5, 6],
          startTime: '09:00',
          endTime: '18:00'
        }}
        
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
        
        editable={true}
        selectable={true}
        selectMirror={true}
        selectMinDistance={0}  // Remove distance requirement for better long drag selection
        selectLongPressDelay={250}  // Touch device long-press delay
        unselectAuto={true}  // Auto-unselect when clicking elsewhere
        unselectCancel=".fc-event,.modal"  // Don't unselect when clicking events or modals
        select={handleDateSelect}
        dateClick={(info) => {
          if (info.view.type.includes('timeGrid') || info.view.type.includes('resource')) {
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
              barberId: info.resource?.id || null,
              barberName: info.resource?.title || null
            }
            
            if (onSlotClick) {
              onSlotClick(slotData)
            }
          } else if (info.view.type === 'dayGridMonth') {
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
          const duration = selectInfo.end - selectInfo.start
          const maxDuration = 12 * 60 * 60 * 1000  // Max 12 hours selection (full business day)
          
          if (duration > maxDuration) {
            console.warn('Selection too long:', Math.round(duration / 60000), 'minutes. Max:', Math.round(maxDuration / 60000), 'minutes')
            return false
          }
          
          return true
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
          // Loading state handled by parent component
        }}
        
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
        
        eventDidMount={(info) => {
          const { event } = info
          if (event.extendedProps?.isOptimistic) {
            info.el.classList.add('optimistic-event')
            info.el.style.opacity = '0.7'
          }
          if (event.extendedProps?.isRecurring) {
            info.el.classList.add('recurring-event')
          }
          if (event.extendedProps?.status) {
            info.el.classList.add(`event-status-${event.extendedProps.status}`)
          }
        }}
        
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
        
        dayHeaderFormat={currentView.includes('resource') ? 
          { day: '2-digit' } :  // For resource views: just "10", "11", "12"
          { weekday: 'short', month: 'numeric', day: 'numeric' }  // For other views: "Mon 8/10"
        }
        dayHeaderContent={currentView.includes('resource') ? (arg) => {
          const dayNames = ['S', 'M', 'T', 'W', 'Th', 'F', 'S']
          const dayOfWeek = arg.date.getDay()
          const dayNum = arg.date.getDate()
          
          return {
            html: `<div style="text-align: center; line-height: 1.2;">
              <span style="font-size: 0.7rem; color: #6b7280;">${dayNames[dayOfWeek]}</span><br/>
              <span style="font-size: 0.9rem; font-weight: 600;">${dayNum}</span>
            </div>`
          }
        } : undefined}
        
        lazyFetching={true}
        progressiveEventRendering={true}
      />
    </div>
  )
}