'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import resourcePlugin from '@fullcalendar/resource'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
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
      const { event } = info
      const startHour = event.start.getHours()
      const endHour = event.end.getHours()
      
      // Additional validation with user feedback
      if (startHour < 9 || endHour > 18) {
        alert('❌ Cannot schedule appointments outside business hours (9 AM - 6 PM)')
        info.revert()
        return
      }
      
      if (event.start.getDay() === 0) {
        alert('❌ Barbershop is closed on Sundays')
        info.revert()
        return
      }
      
      if (startHour < 13 && endHour > 12) {
        alert('❌ Cannot schedule during lunch break (12:00 PM - 1:00 PM)')
        info.revert()
        return
      }
      
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
    plugins.push(resourcePlugin, resourceTimeGridPlugin, resourceTimelinePlugin)
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
            ? 'dayGridMonth,timeGridWeek,timeGridDay,resourceTimeGridDay,resourceTimelineWeek,resourceTimelineDay,listWeek'
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
        // Advanced event constraints
        eventConstraint="businessHours"
        selectConstraint="businessHours"
        eventOverlap={false}
        selectOverlap={false}
        // Event validation and constraints
        eventAllow={(dropInfo, draggedEvent) => {
          // Prevent dropping events on non-business hours
          const startHour = dropInfo.start.getHours()
          const endHour = dropInfo.end.getHours()
          
          // Check if within business hours (9 AM - 6 PM)
          if (startHour < 9 || endHour > 18) {
            return false
          }
          
          // Prevent scheduling on Sundays
          if (dropInfo.start.getDay() === 0) {
            return false
          }
          
          // Prevent scheduling during lunch breaks (12-1 PM)
          if (startHour < 13 && endHour > 12) {
            return false
          }
          
          return true
        }}
        selectAllow={(selectInfo) => {
          // Only allow selection on business hours
          const startHour = selectInfo.start.getHours()
          const endHour = selectInfo.end.getHours()
          
          // Check if within business hours
          if (startHour < 9 || endHour > 18) {
            return false
          }
          
          // Prevent selection on Sundays
          if (selectInfo.start.getDay() === 0) {
            return false
          }
          
          // Minimum appointment duration (15 minutes)
          const durationMinutes = (selectInfo.end - selectInfo.start) / (1000 * 60)
          if (durationMinutes < 15) {
            return false
          }
          
          // Maximum appointment duration (4 hours)
          if (durationMinutes > 240) {
            return false
          }
          
          return true
        }}
        // Event duration constraints
        eventMinWidth={50}
        eventMinHeight={20}
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
        // Accessibility and Popovers
        eventDidMount={(info) => {
          // Add accessibility attributes
          info.el.setAttribute('role', 'button')
          info.el.setAttribute('aria-label', `Event: ${info.event.title}`)
          
          // Add custom popover with rich appointment details
          const { event } = info
          const props = event.extendedProps
          
          // Create popover content
          const popoverContent = `
            <div class="appointment-popover bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
              <div class="border-b border-gray-100 pb-3 mb-3">
                <h4 class="font-bold text-gray-900 text-lg">${event.title}</h4>
                <p class="text-sm text-gray-600">
                  ${event.start.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p class="text-sm text-gray-600">
                  ${event.start.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })} - ${event.end.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
              
              ${props.customer ? `
                <div class="space-y-2 mb-3">
                  <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <span class="font-medium text-gray-900">${props.customer}</span>
                  </div>
                  
                  ${props.customerPhone ? `
                    <div class="flex items-center text-sm">
                      <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                      </svg>
                      <a href="tel:${props.customerPhone}" class="text-blue-600 hover:text-blue-800">${props.customerPhone}</a>
                    </div>
                  ` : ''}
                  
                  ${props.customerEmail ? `
                    <div class="flex items-center text-sm">
                      <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                      <a href="mailto:${props.customerEmail}" class="text-blue-600 hover:text-blue-800">${props.customerEmail}</a>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              
              <div class="space-y-2 mb-3">
                ${props.service ? `
                  <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                    </svg>
                    <span class="text-gray-900">${props.service}</span>
                  </div>
                ` : ''}
                
                ${props.duration ? `
                  <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="text-gray-900">${props.duration} minutes</span>
                  </div>
                ` : ''}
                
                ${props.price ? `
                  <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                    </svg>
                    <span class="text-gray-900 font-medium">$${props.price}</span>
                  </div>
                ` : ''}
                
                ${props.status ? `
                  <div class="flex items-center text-sm">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${
                      props.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      props.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      props.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }">${props.status || 'confirmed'}</span>
                  </div>
                ` : ''}
              </div>
              
              ${props.notes ? `
                <div class="border-t border-gray-100 pt-3">
                  <p class="text-sm text-gray-600">
                    <span class="font-medium">Notes:</span> ${props.notes}
                  </p>
                </div>
              ` : ''}
              
              <div class="border-t border-gray-100 pt-3 mt-3">
                <div class="flex space-x-2">
                  <button class="flex-1 bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 transition-colors">
                    Edit
                  </button>
                  <button class="flex-1 bg-gray-100 text-gray-700 text-xs px-3 py-2 rounded hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button class="bg-green-600 text-white text-xs px-3 py-2 rounded hover:bg-green-700 transition-colors">
                    ✓ Complete
                  </button>
                </div>
              </div>
            </div>
          `
          
          // Add click handler for custom popover
          let popoverElement = null
          let popoverTimeout = null
          
          const showPopover = (e) => {
            // Clear existing popover
            if (popoverElement) {
              popoverElement.remove()
            }
            
            // Create new popover
            popoverElement = document.createElement('div')
            popoverElement.innerHTML = popoverContent
            popoverElement.style.cssText = `
              position: absolute;
              z-index: 1000;
              pointer-events: auto;
            `
            
            document.body.appendChild(popoverElement)
            
            // Position popover
            const rect = info.el.getBoundingClientRect()
            const popoverRect = popoverElement.firstElementChild.getBoundingClientRect()
            
            let left = rect.left + (rect.width / 2) - (popoverRect.width / 2)
            let top = rect.top - popoverRect.height - 10
            
            // Adjust if popover goes off screen
            if (left < 10) left = 10
            if (left + popoverRect.width > window.innerWidth - 10) {
              left = window.innerWidth - popoverRect.width - 10
            }
            if (top < 10) {
              top = rect.bottom + 10
            }
            
            popoverElement.style.left = left + 'px'
            popoverElement.style.top = top + 'px'
            
            // Auto-hide after 10 seconds
            popoverTimeout = setTimeout(hidePopover, 10000)
          }
          
          const hidePopover = () => {
            if (popoverElement) {
              popoverElement.remove()
              popoverElement = null
            }
            if (popoverTimeout) {
              clearTimeout(popoverTimeout)
              popoverTimeout = null
            }
          }
          
          // Event listeners
          info.el.addEventListener('click', showPopover)
          info.el.addEventListener('mouseleave', () => {
            setTimeout(hidePopover, 2000) // Hide after 2 seconds
          })
          
          // Close popover when clicking outside
          document.addEventListener('click', (e) => {
            if (popoverElement && !popoverElement.contains(e.target) && !info.el.contains(e.target)) {
              hidePopover()
            }
          })
        })
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
        
        /* Background Events Styling */
        .fc-bg-event {
          opacity: 0.7;
        }
        
        .fc-lunch-break {
          background-color: #fef3c7 !important;
          border: 1px solid #f59e0b !important;
        }
        
        .fc-holiday {
          background-color: #fecaca !important;
          border: 1px solid #ef4444 !important;
        }
        
        .fc-maintenance {
          background-color: #e0e7ff !important;
          border: 1px solid #6366f1 !important;
        }
        
        .fc-closed-day {
          background-color: #f3f4f6 !important;
          border: 1px solid #d1d5db !important;
        }
        
        .fc-bg-event:hover {
          opacity: 0.9;
          cursor: default;
        }

        /* Resource hierarchy styling */
        .fc-resource-timeline-lane[data-resource-id^="shop-"] {
          background-color: #f9fafb;
          font-weight: 700;
          color: #1f2937;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .fc-resource-timeline-lane[data-resource-id^="station-"] {
          background-color: #f3f4f6;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #d1d5db;
          font-style: italic;
        }
        
        .fc-resource-timeline-lane[data-resource-id^="shop-"] .fc-timeline-lane-frame {
          padding-left: 8px !important;
        }
        
        .fc-resource-timeline-lane[data-resource-id^="station-"] .fc-timeline-lane-frame {
          padding-left: 20px !important;
        }
        
        .fc-resource-timeline-lane:not([data-resource-id^="shop-"]):not([data-resource-id^="station-"]) .fc-timeline-lane-frame {
          padding-left: 35px !important;
        }

        /* Resource cell styling for hierarchy */
        .fc-resource-cell[data-resource-id^="shop-"] {
          background-color: #f9fafb;
          font-weight: 700;
        }
        
        .fc-resource-cell[data-resource-id^="station-"] {
          background-color: #f3f4f6;
          font-weight: 600;
          font-style: italic;
          padding-left: 20px !important;
        }
        
        .fc-resource-cell:not([data-resource-id^="shop-"]):not([data-resource-id^="station-"]) {
          padding-left: 35px !important;
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
          
          .fc-resource-timeline-lane[data-resource-id^="shop-"] {
            background-color: #1f2937;
            color: #f9fafb;
          }
          
          .fc-resource-timeline-lane[data-resource-id^="station-"] {
            background-color: #374151;
            color: #d1d5db;
          }
          
          .fc-resource-cell[data-resource-id^="shop-"] {
            background-color: #1f2937;
            color: #f9fafb;
          }
          
          .fc-resource-cell[data-resource-id^="station-"] {
            background-color: #374151;
            color: #d1d5db;
          }
        }
      `}</style>
    </div>
  )
}