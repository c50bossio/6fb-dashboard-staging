'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import resourcePlugin from '@fullcalendar/resource'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import rrulePlugin from '@fullcalendar/rrule'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useState, useCallback, useRef } from 'react'

import { captureException } from '@/lib/sentry'

export default function FullCalendarWrapper({
  events = [],
  resources = [],
  onEventClick,
  onEventDrop,
  onEventResize,
  onDateSelect,
  onEventAdd,
  view = 'timeGridWeek',
  height = '100%',
  businessHours = {
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday
    startTime: '09:00',
    endTime: '18:00',
  },
  slotMinTime = '08:00:00',
  slotMaxTime = '20:00:00',
  slotDuration = '00:30:00',
  showResources = false,
}) {
  const calendarRef = useRef(null)
  const [currentView, setCurrentView] = useState(view)

  const handleEventClick = useCallback((info) => {
    try {
      if (onEventClick) {
        onEventClick({
          event: info.event,
          element: info.el,
          jsEvent: info.jsEvent,
          view: info.view,
        })
      }
    } catch (error) {
      captureException(error, { context: 'FullCalendar.eventClick' })
    }
  }, [onEventClick])

  const handleEventDrop = useCallback((info) => {
    try {
      if (onEventDrop) {
        onEventDrop({
          event: info.event,
          oldEvent: info.oldEvent,
          delta: info.delta,
          revert: info.revert,
          jsEvent: info.jsEvent,
          view: info.view,
        })
      }
    } catch (error) {
      captureException(error, { context: 'FullCalendar.eventDrop' })
      info.revert()
    }
  }, [onEventDrop])

  const handleEventResize = useCallback((info) => {
    try {
      if (onEventResize) {
        onEventResize({
          event: info.event,
          oldEvent: info.oldEvent,
          endDelta: info.endDelta,
          revert: info.revert,
          jsEvent: info.jsEvent,
          view: info.view,
        })
      }
    } catch (error) {
      captureException(error, { context: 'FullCalendar.eventResize' })
      info.revert()
    }
  }, [onEventResize])

  const handleDateSelect = useCallback((info) => {
    try {
      if (onDateSelect) {
        onDateSelect({
          start: info.start,
          end: info.end,
          allDay: info.allDay,
          resource: info.resource,
          jsEvent: info.jsEvent,
          view: info.view,
        })
      }
      // Clear the selection
      const calendarApi = calendarRef.current?.getApi()
      if (calendarApi) {
        calendarApi.unselect()
      }
    } catch (error) {
      captureException(error, { context: 'FullCalendar.dateSelect' })
    }
  }, [onDateSelect])

  const handleEventAdd = useCallback((info) => {
    try {
      if (onEventAdd) {
        onEventAdd({
          event: info.event,
          revert: info.revert,
        })
      }
    } catch (error) {
      captureException(error, { context: 'FullCalendar.eventAdd' })
      info.revert()
    }
  }, [onEventAdd])

  const handleViewDidMount = useCallback((info) => {
    setCurrentView(info.view.type)
  }, [])

  // FullCalendar plugins configuration
  const plugins = [
    dayGridPlugin,
    timeGridPlugin,
    interactionPlugin,
    listPlugin,
    rrulePlugin,
  ]

  if (showResources) {
    plugins.push(resourcePlugin, resourceTimelinePlugin)
  }

  return (
    <div className="fc-wrapper" style={{ height }}>
      <FullCalendar
        ref={calendarRef}
        plugins={plugins}
        initialView={view}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: showResources 
            ? 'dayGridMonth,timeGridWeek,timeGridDay,resourceTimelineWeek,resourceTimelineDay,listWeek'
            : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        events={events}
        resources={showResources ? resources : undefined}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        select={handleDateSelect}
        eventAdd={handleEventAdd}
        viewDidMount={handleViewDidMount}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        businessHours={businessHours}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        slotDuration={slotDuration}
        height="100%"
        // Appearance
        eventDisplay="block"
        eventColor="#3b82f6"
        eventTextColor="#ffffff"
        nowIndicator={true}
        // Performance
        lazyFetching={true}
        progressiveEventRendering={true}
        // Accessibility
        eventDidMount={(info) => {
          // Add accessibility attributes
          info.el.setAttribute('role', 'button')
          info.el.setAttribute('aria-label', `Event: ${info.event.title}`)
        }}
        // Custom event content
        eventContent={(eventInfo) => {
          const { event } = eventInfo
          return (
            <div className="fc-event-content-custom p-1">
              <div className="font-semibold text-sm truncate">{event.title}</div>
              {event.extendedProps.customer && (
                <div className="text-xs opacity-90 truncate">
                  {event.extendedProps.customer}
                </div>
              )}
              {event.extendedProps.service && (
                <div className="text-xs opacity-75 truncate">
                  {event.extendedProps.service}
                </div>
              )}
            </div>
          )
        }}
        // Responsive
        aspectRatio={1.8}
        handleWindowResize={true}
        windowResizeDelay={100}
      />
      
      <style jsx global>{`
        .fc-wrapper {
          font-family: inherit;
        }
        
        .fc-event {
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .fc-timegrid-slot {
          height: 60px;
        }
        
        .fc-col-header-cell {
          background-color: #f9fafb;
          font-weight: 600;
        }
        
        .fc-scrollgrid {
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .fc-today {
          background-color: rgba(59, 130, 246, 0.05) !important;
        }
        
        .fc-event-selected {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .fc-col-header-cell {
            background-color: #1f2937;
          }
          
          .fc-scrollgrid,
          .fc-scrollgrid-section > td {
            background-color: #111827;
            border-color: #374151;
          }
          
          .fc-event {
            border-color: #374151;
          }
          
          .fc-today {
            background-color: rgba(59, 130, 246, 0.1) !important;
          }
        }
      `}</style>
    </div>
  )
}