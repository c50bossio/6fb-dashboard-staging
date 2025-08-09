'use client'

import FullCalendar from '@fullcalendar/react'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useRef, useCallback, useState, useEffect } from 'react'

// Professional color scheme
const COLORS = {
  confirmed: '#3b82f6', // Blue
  pending: '#f59e0b',   // Amber
  completed: '#10b981', // Green
  cancelled: '#ef4444', // Red
}

export default function ProfessionalCalendar({
  resources = [],
  events = [],
  onSlotClick,
  onEventClick,
  onEventDrop,
  height = '700px'
}) {
  const calendarRef = useRef(null)
  const [calendarKey, setCalendarKey] = useState(0)

  // Debug logging
  useEffect(() => {
    console.log('📅 ProfessionalCalendar - Resources:', resources)
    console.log('📅 ProfessionalCalendar - Events:', events)
    console.log('📅 ProfessionalCalendar - Events count:', events.length)
  }, [resources, events])

  // Force re-render when resources change
  useEffect(() => {
    setCalendarKey(prev => prev + 1)
  }, [resources.length])

  // Handle date/time slot selection
  const handleDateSelect = useCallback((selectInfo) => {
    if (onSlotClick) {
      onSlotClick({
        start: selectInfo.start,
        end: selectInfo.end,
        resourceId: selectInfo.resource?.id,
        resource: selectInfo.resource
      })
    }
    // Clear selection
    selectInfo.view.calendar.unselect()
  }, [onSlotClick])

  // Handle event click
  const handleEventClick = useCallback((clickInfo) => {
    if (onEventClick) {
      onEventClick({
        event: clickInfo.event,
        element: clickInfo.el
      })
    }
  }, [onEventClick])

  // Handle event drag & drop
  const handleEventDrop = useCallback((dropInfo) => {
    if (onEventDrop) {
      onEventDrop({
        event: dropInfo.event,
        oldResource: dropInfo.oldResource,
        newResource: dropInfo.newResource,
        revert: dropInfo.revert
      })
    }
  }, [onEventDrop])

  return (
    <div className="professional-calendar-wrapper">
      <FullCalendar
        key={calendarKey}
        ref={calendarRef}
        plugins={[
          resourceTimeGridPlugin,
          interactionPlugin
        ]}
        
        // View configuration
        initialView="resourceTimeGridDay"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimeGridDay,resourceTimeGridWeek'
        }}
        
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
          daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat
          startTime: '09:00',
          endTime: '18:00'
        }}
        
        // Resources (Barbers)
        resources={resources.map(resource => ({
          id: resource.id,
          title: resource.title || resource.name,
          eventColor: resource.color || COLORS.confirmed
        }))}
        
        // Events (Appointments) - Fixed format
        events={events}
        
        // Display configuration
        height={height}
        aspectRatio={1.8}
        nowIndicator={true}
        eventDisplay="block"
        displayEventTime={true}
        displayEventEnd={false}
        
        // Interaction
        editable={true}
        selectable={true}
        selectMirror={true}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        
        // Resource configuration
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        resourceAreaHeaderContent="Barbers"
        resourceAreaWidth="15%"
        
        // Event rendering - simplified
        eventContent={(eventInfo) => {
          return {
            html: `<div class="fc-event-title">${eventInfo.event.title}</div>`
          }
        }}
        
        // Performance
        lazyFetching={true}
        progressiveEventRendering={true}
        
        // Mobile responsive
        dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
        
        // Constraints
        selectConstraint="businessHours"
        eventConstraint="businessHours"
      />
    </div>
  )
}