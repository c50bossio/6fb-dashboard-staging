'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
// Premium plugins enabled with proper licensing
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import rrulePlugin from '@fullcalendar/rrule'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useRef, useCallback, useEffect, useState } from 'react'
import { RRule } from 'rrule'

export default function EnhancedProfessionalCalendar({
  resources: externalResources,
  eventSources: externalEventSources,
  events: externalEvents, // Keep for backward compatibility
  currentView: controlledView,
  onViewChange,
  onSlotClick,
  onEventClick,
  onEventDrop,
  height = '700px',
  defaultView = 'timeGridDay'
}) {
  const calendarRef = useRef(null)
  const [currentView, setCurrentView] = useState(controlledView || defaultView)
  
  // Expose calendar API globally for debugging and manual refresh
  useEffect(() => {
    if (calendarRef.current) {
      window.fullCalendarApi = calendarRef.current.getApi()
      console.log('FullCalendar API exposed as window.fullCalendarApi')
    }
  }, [])
  
  useEffect(() => {
    if (controlledView && controlledView !== currentView) {
      setCurrentView(controlledView)
    }
  }, [controlledView])
  
  // Use external resources or empty array - let parent handle defaults
  const resources = externalResources || []
  
  // Use eventSources if provided, otherwise fallback to events for backward compatibility
  const eventSources = externalEventSources || null
  const events = externalEvents || []
  
  const processedEvents = events
  
  // Remove this useEffect - FullCalendar handles updates automatically
  // when events prop changes
  
  const handleDateSelect = useCallback((selectInfo) => {
    const duration = Math.round((selectInfo.end - selectInfo.start) / 60000)
    console.log('🎯 [Calendar] SELECT triggered:', selectInfo.view.type, selectInfo.resource?.id, 'duration:', duration, 'minutes')

    const viewType = selectInfo.view.type

    // In resource views, clicks also trigger 'select' event with very small duration
    // Treat selections under 2 minutes as clicks
    const isClick = duration <= 1
    const selectionType = isClick ? 'click' : 'drag'

    console.log(`🎯 [Calendar] Detected as: ${selectionType}`)

    const slotData = {
      start: selectInfo.start,
      end: selectInfo.end,
      startStr: selectInfo.startStr,
      endStr: selectInfo.endStr,
      allDay: selectInfo.allDay,
      viewType: viewType,
      resource: selectInfo.resource,  // Premium feature enabled
      resourceId: selectInfo.resource?.id,  // Premium feature enabled
      resourceTitle: selectInfo.resource?.title,  // Premium feature enabled
      selectedBarber: selectInfo.resource?.id,  // For modal pre-population
      selectedBarberName: selectInfo.resource?.title,  // For modal pre-population
      jsEvent: selectInfo.jsEvent,
      selectionType: selectionType,
      duration: isClick ? 30 : duration  // Default to 30 minutes for clicks
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
    } else if (viewType.includes('resourceTimeGrid') || viewType.includes('resourceTimeline')) {
      // Premium resource view handling enabled
      slotData.isResourceView = true
      slotData.exactTime = selectInfo.start.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
      slotData.selectedBarber = selectInfo.resource?.id
      slotData.selectedBarberName = selectInfo.resource?.title
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
    // Handle case when resources is undefined (premium feature removed)
    if (!resources || resources.length === 0) {
      return null
    }
    
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
  
  // Removed DOM manipulation useEffect - anti-pattern
  // Calendar API should be accessed through calendarRef.current.getApi()

  // Custom resource label rendering with profile images
  const renderResourceLabel = useCallback((resourceInfo) => {
    const resource = resourceInfo.resource
    const avatarUrl = resource.extendedProps?.avatar_url
    const name = resource.title || 'Unknown'

    // Generate colored initials fallback using consistent hashing
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']
    const bgColor = colors[colorIndex]

    return {
      html: `
        <div class="resource-label-wrapper">
          ${avatarUrl ?
            `<img src="${avatarUrl}" alt="${name}" class="resource-avatar"
              onerror="var div=document.createElement('div');div.className='resource-avatar-fallback';div.style.backgroundColor='${bgColor}';div.textContent='${initials}';this.replaceWith(div);" />` :
            `<div class="resource-avatar-fallback" style="background-color: ${bgColor}">${initials}</div>`
          }
          <span class="resource-name">${name}</span>
        </div>
      `
    }
  }, [])

  return (
    <div className="enhanced-professional-calendar-wrapper">
      <style jsx global>{`
        /* ===== BRAND THEME STYLING ===== */
        /* Calendar container background */
        .fc {
          background: transparent;
        }

        /* Header toolbar with solid brand color */
        .fc-toolbar {
          background: #546355 !important;
          padding: 1.25rem !important;
          border-radius: 0.75rem 0.75rem 0 0;
          margin-bottom: 0 !important;
          border-bottom: 3px solid #3C4A3E !important;
        }

        .fc-toolbar-title {
          color: white !important;
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.025em !important;
        }

        /* Toolbar buttons with improved solid styling */
        .fc-button {
          background: rgba(255, 255, 255, 0.15) !important;
          border: 2px solid rgba(255, 255, 255, 0.25) !important;
          color: white !important;
          border-radius: 0.5rem !important;
          padding: 0.625rem 1.25rem !important;
          font-weight: 600 !important;
          font-size: 0.875rem !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }

        .fc-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.25) !important;
          border-color: rgba(255, 255, 255, 0.35) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12) !important;
        }

        .fc-button:active {
          background: rgba(255, 255, 255, 0.2) !important;
          transform: translateY(0) !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }

        .fc-button-active {
          background: rgba(255, 255, 255, 0.3) !important;
          border-color: rgba(255, 255, 255, 0.4) !important;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15) !important;
        }

        .fc-button:disabled {
          opacity: 0.4 !important;
          cursor: not-allowed !important;
        }

        /* Day/week headers with dark theme */
        .fc-col-header {
          background: #3C4A3E !important;
          border-bottom: 2px solid #546355 !important;
        }

        .fc-col-header-cell {
          padding: 0.75rem 0.5rem !important;
          font-weight: 600 !important;
          color: #E5E7EB !important;
          border-color: #546355 !important;
        }

        .fc-col-header-cell-cushion {
          color: #E5E7EB !important;
          font-weight: 600 !important;
        }

        /* Time grid styling */
        .fc-timegrid-slot {
          height: 3rem !important;
          border-color: #546355 !important;
        }

        .fc-timegrid-slot-label {
          color: #6b7280 !important;
          font-size: 0.875rem !important;
          padding-right: 0.5rem !important;
        }

        /* Business hours highlighting with olive tint */
        .fc-non-business {
          background: rgba(243, 244, 246, 0.5) !important;
        }

        .fc-timegrid-col.fc-day-today {
          background: rgba(84, 99, 85, 0.03) !important;
        }

        /* Current time indicator - gold accent */
        .fc-timegrid-now-indicator-line {
          border-color: #C5A35B !important;
          border-width: 2px !important;
          box-shadow: 0 0 8px rgba(197, 163, 91, 0.5);
        }

        .fc-timegrid-now-indicator-arrow {
          border-color: #C5A35B !important;
        }

        /* Events with improved styling */
        .fc-event {
          border-radius: 0.375rem !important;
          cursor: pointer !important;
          border-width: 1px !important;
          padding: 0.25rem 0.5rem !important;
          font-size: 0.875rem !important;
          font-weight: 500 !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
        }

        .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15) !important;
          z-index: 10 !important;
        }

        .fc-event-title {
          font-weight: 600 !important;
          color: white !important;
        }

        .fc-event-time {
          font-weight: 500 !important;
          opacity: 0.9;
        }

        /* Resource area styling */
        .fc-resource-area {
          min-width: 180px !important;
          background: linear-gradient(to right, #2D3630, #3C4A3E);
        }

        .fc-resource-area-header {
          background: #546355 !important;
          color: white !important;
          font-weight: 700 !important;
          padding: 1rem !important;
          text-align: center !important;
        }

        .fc-resource-cell {
          border-right: 2px solid #546355 !important;
          background: #3C4A3E !important;
        }

        .fc-resource {
          padding: 0 !important;
          transition: background 0.2s ease !important;
        }

        .fc-resource:hover {
          background: rgba(84, 99, 85, 0.25) !important;
        }

        /* Resource label with avatar (inline layout) */
        .resource-label-wrapper {
          display: flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
          padding: 0.75rem !important;
          width: 100%;
        }

        .resource-avatar {
          width: 48px !important;
          height: 48px !important;
          border-radius: 50% !important;
          object-fit: cover !important;
          border: 2px solid rgba(255, 255, 255, 0.2) !important;
          flex-shrink: 0 !important;
        }

        .resource-avatar-fallback {
          width: 48px !important;
          height: 48px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: white !important;
          font-weight: 700 !important;
          font-size: 1rem !important;
          border: 2px solid rgba(255, 255, 255, 0.2) !important;
          flex-shrink: 0 !important;
        }

        .resource-name {
          font-weight: 600 !important;
          color: #E5E7EB !important;
          font-size: 0.875rem !important;
          line-height: 1.25 !important;
          flex: 1 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        /* Timeline view specific styling */
        .fc-timeline-header-row {
          background: linear-gradient(to bottom, #3C4A3E, #2D3630) !important;
        }

        .fc-timeline-slot {
          border-color: #546355 !important;
        }

        .fc-timeline-slot-label {
          color: #6b7280 !important;
        }

        /* Scrollbars with brand theme */
        .fc-scroller::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .fc-scroller::-webkit-scrollbar-track {
          background: #2D3630;
          border-radius: 4px;
        }

        .fc-scroller::-webkit-scrollbar-thumb {
          background: #C5A35B;
          border-radius: 4px;
        }

        .fc-scroller::-webkit-scrollbar-thumb:hover {
          background: #B8913A;
        }

        /* Selection overlay with olive tint */
        .fc-highlight {
          background: rgba(84, 99, 85, 0.15) !important;
          border: 2px dashed #546355 !important;
        }

        /* More events link */
        .fc-more-link {
          color: #546355 !important;
          font-weight: 600 !important;
          text-decoration: none !important;
        }

        .fc-more-link:hover {
          color: #C5A35B !important;
        }

        /* Popover styling */
        .fc-popover {
          border: 2px solid #546355 !important;
          border-radius: 0.75rem !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
        }

        .fc-popover-header {
          background: linear-gradient(135deg, #546355, #C5A35B) !important;
          color: white !important;
          font-weight: 700 !important;
          padding: 0.75rem 1rem !important;
          border-radius: 0.5rem 0.5rem 0 0 !important;
        }

        .fc-popover-body {
          background: #2D3630 !important;
          padding: 0.5rem !important;
        }

        /* Border colors */
        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: #546355 !important;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .fc-col-header {
            background: linear-gradient(to bottom, #1f2937, #111827);
          }

          .fc-col-header-cell-cushion {
            color: #9ca3af !important;
          }

          .fc-timegrid-slot-label {
            color: #9ca3af !important;
          }

          .fc-theme-standard td,
          .fc-theme-standard th {
            border-color: #374151 !important;
          }

          .fc-non-business {
            background: rgba(17, 24, 39, 0.5) !important;
          }

          .fc-resource-area {
            background: linear-gradient(to right, #111827, #1f2937);
          }

          .fc-resource {
            color: #e5e7eb !important;
          }

          .fc-scroller::-webkit-scrollbar-track {
            background: #1f2937;
          }
        }

        /* Drag and drop feedback */
        .fc-event-dragging {
          opacity: 0.75 !important;
          transform: scale(1.05);
        }

        .fc-event-resizing {
          opacity: 0.8 !important;
        }
      `}</style>
      <FullCalendar
        ref={calendarRef}
        plugins={[
          // Premium plugins enabled with proper licensing
          resourceTimeGridPlugin,
          resourceTimelinePlugin,
          dayGridPlugin,
          timeGridPlugin,
          listPlugin,
          interactionPlugin,
          rrulePlugin
        ]}
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        
        initialView={controlledView || defaultView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimeGridDay,resourceTimeGridWeek,resourceTimelineWeek,timeGridWeek,listWeek'
        }}
        views={{
          dayGridMonth: {
            buttonText: 'Month'
          },
          timeGridWeek: {
            buttonText: 'Week'
          },
          // Premium resource views enabled with proper licensing
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
        
        // Premium resources enabled with proper licensing
        resources={resources}  // Use resources prop for barber resources
        resourceLabelContent={renderResourceLabel}  // Custom rendering with profile images
        {...(eventSources ? { eventSources: eventSources } : { events: processedEvents })}  // Use eventSources or fallback to events
        // resourcesInitiallyExpanded={true}
        // refetchResourcesOnNavigate={false}  // Better performance - only refetch when needed
        
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
        
        // Production performance optimizations
        aspectRatio={1.35}  // Better aspect ratio for professional use
        contentHeight={600}  // Fixed content height for consistency
        
        editable={true}
        selectable={true}
        selectMirror={true}
        selectMinDistance={0}  // Allow clicks to trigger select event (duration-based detection in handler)
        selectLongPressDelay={250}  // Touch device long-press delay
        unselectAuto={true}  // Auto-unselect when clicking elsewhere
        unselectCancel=".fc-event,.modal"  // Don't unselect when clicking events or modals
        select={handleDateSelect}
        dateClick={(info) => {
          console.log('👆 [Calendar] CLICK detected:', info.view.type, info.resource?.id, info.date)
          if (info.view.type.includes('timeGrid')) {
            const provisionalEnd = new Date(info.date)
            provisionalEnd.setMinutes(provisionalEnd.getMinutes() + 30) // Default to 30-minute slot duration
            
            const slotData = {
              start: info.date,
              end: provisionalEnd, // Default 30-minute duration matching slot duration
              startStr: info.dateStr,
              endStr: provisionalEnd.toISOString(),
              allDay: false,
              viewType: info.view.type,
              resource: info.resource,  // Premium feature enabled with GPL license
              resourceId: info.resource?.id,  // Premium feature enabled with GPL license
              resourceTitle: info.resource?.title,  // Premium feature enabled with GPL license
              selectedBarber: info.resource?.id,  // For modal pre-population
              selectedBarberName: info.resource?.title,  // For modal pre-population
              jsEvent: info.jsEvent,
              selectionType: 'click',
              duration: 30, // Default to 30 minutes matching the calendar slot duration
              isProvisional: true // Indicates duration can be changed by service selection
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
          // // Debug log removed for production
}}
        
        // Production-ready event source error handling
        eventSourceSuccess={(rawEvents, response) => {
          console.log('[FullCalendar] Received events from API:', rawEvents?.length || 0)
          if (rawEvents && rawEvents.length > 0) {
            console.log('[FullCalendar] First event:', rawEvents[0])
            const blockedEvents = rawEvents.filter(e => e.extendedProps?.is_blocked_time || e.title?.includes('🚫'))
            if (blockedEvents.length > 0) {
              console.log(`[FullCalendar] Found ${blockedEvents.length} blocked events:`, blockedEvents)
            }
          }
          
          // Validate and sanitize events for production
          const validEvents = (rawEvents || []).filter(event => {
            const isValid = event.id && event.start && event.title
            if (!isValid) {
              console.warn('[FullCalendar] Invalid event filtered out:', event)
            }
            return isValid
          })
          
          if (validEvents.length !== rawEvents?.length) {
            console.warn(`[FullCalendar] Filtered ${(rawEvents?.length || 0) - validEvents.length} invalid events`)
          }
          
          console.log(`[FullCalendar] Returning ${validEvents.length} valid events to calendar`)
          return validEvents
        }}
        
        eventSourceFailure={(error) => {
          console.error('FullCalendar event source failed:', error)
          
          // Production-ready error reporting
          if (error.response?.status === 401) {
            console.warn('Authentication expired, user should re-login')
          } else if (error.response?.status === 403) {
            console.warn('Access denied to calendar events')
          } else if (error.response?.status >= 500) {
            console.error('Server error loading events:', error.response?.status)
          } else if (error.message?.includes('Network Error')) {
            console.error('Network connectivity issue loading events')
          }
          
          // Return empty array to prevent calendar from breaking
          return []
        }}
        
        eventTimeFormat={{  // Better time formatting
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
        displayEventTime={true}
        displayEventEnd={false}  // Don't show end time in event title
        eventOrder={['start', '-duration', 'title']}  // Optimize event sorting for production
        eventOrderStrict={true}  // Enforce consistent ordering for better performance
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
        
        dayHeaderFormat={{
          weekday: 'short', 
          month: 'numeric', 
          day: 'numeric'
        }}
        
        lazyFetching={true}
        progressiveEventRendering={true}
        
        rerenderDelay={10}
        eventMinHeight={25}
        eventShortHeight={35}
        slotEventOverlap={false}
        windowResizeDelay={100}
      />
    </div>
  )
}