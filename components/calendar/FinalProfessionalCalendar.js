'use client'

import FullCalendar from '@fullcalendar/react'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useRef, useCallback, useEffect } from 'react'

export default function FinalProfessionalCalendar({
  onSlotClick,
  onEventClick,
  onEventDrop,
  height = '700px'
}) {
  const calendarRef = useRef(null)
  
  const resources = [
    { id: 'barber-1', title: 'John Smith', eventColor: '#10b981' },
    { id: 'barber-2', title: 'Sarah Johnson', eventColor: '#546355' },
    { id: 'barber-3', title: 'Mike Brown', eventColor: '#f59e0b' },
    { id: 'barber-4', title: 'Lisa Davis', eventColor: '#D4B878' }
  ]
  
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  
  const events = [
    {
      id: '1',
      title: 'John Doe - Haircut',
      start: `${dateStr}T09:00:00`,
      end: `${dateStr}T09:30:00`,
      resourceId: 'barber-1',
      backgroundColor: '#10b981'
    },
    {
      id: '2',
      title: 'Mike Wilson - Beard Trim',
      start: `${dateStr}T11:00:00`,
      end: `${dateStr}T11:30:00`,
      resourceId: 'barber-1',
      backgroundColor: '#10b981'
    },
    {
      id: '3',
      title: 'Tom Brown - Haircut',
      start: `${dateStr}T14:00:00`,
      end: `${dateStr}T14:45:00`,
      resourceId: 'barber-1',
      backgroundColor: '#10b981'
    },
    
    {
      id: '4',
      title: 'Jane Smith - Hair Color',
      start: `${dateStr}T10:00:00`,
      end: `${dateStr}T11:30:00`,
      resourceId: 'barber-2',
      backgroundColor: '#546355'
    },
    {
      id: '5',
      title: 'Emily Davis - Cut & Style',
      start: `${dateStr}T13:00:00`,
      end: `${dateStr}T14:00:00`,
      resourceId: 'barber-2',
      backgroundColor: '#546355'
    },
    {
      id: '6',
      title: 'Sarah Lee - Highlights',
      start: `${dateStr}T15:00:00`,
      end: `${dateStr}T16:30:00`,
      resourceId: 'barber-2',
      backgroundColor: '#546355'
    },
    
    {
      id: '7',
      title: 'Bob Wilson - Classic Cut',
      start: `${dateStr}T09:30:00`,
      end: `${dateStr}T10:00:00`,
      resourceId: 'barber-3',
      backgroundColor: '#f59e0b'
    },
    {
      id: '8',
      title: 'James Miller - Shave',
      start: `${dateStr}T12:00:00`,
      end: `${dateStr}T12:30:00`,
      resourceId: 'barber-3',
      backgroundColor: '#f59e0b'
    },
    {
      id: '9',
      title: 'David Clark - Fade Cut',
      start: `${dateStr}T16:00:00`,
      end: `${dateStr}T16:45:00`,
      resourceId: 'barber-3',
      backgroundColor: '#f59e0b'
    },
    
    {
      id: '10',
      title: 'Alice Brown - Kids Cut',
      start: `${dateStr}T10:30:00`,
      end: `${dateStr}T11:00:00`,
      resourceId: 'barber-4',
      backgroundColor: '#D4B878'
    },
    {
      id: '11',
      title: 'Charlie Wilson - Kids Cut',
      start: `${dateStr}T14:00:00`,
      end: `${dateStr}T14:30:00`,
      resourceId: 'barber-4',
      backgroundColor: '#D4B878'
    },
    {
      id: '12',
      title: 'Emma Johnson - Teen Style',
      start: `${dateStr}T15:30:00`,
      end: `${dateStr}T16:15:00`,
      resourceId: 'barber-4',
      backgroundColor: '#D4B878'
    }
  ]
  
  const handleDateSelect = useCallback((selectInfo) => {
    if (onSlotClick) {
      onSlotClick({
        start: selectInfo.start,
        end: selectInfo.end,
        resourceId: selectInfo.resource?.id,
        resource: selectInfo.resource
      })
    }
    selectInfo.view.calendar.unselect()
  }, [onSlotClick])
  
  const handleEventClick = useCallback((clickInfo) => {
    if (onEventClick) {
      onEventClick({
        event: clickInfo.event,
        element: clickInfo.el
      })
    }
  }, [onEventClick])
  
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
  
  useEffect(() => {
    console.log('📅 Final Calendar loaded with', events.length, 'events')
  }, [])
  
  return (
    <div className="professional-calendar-wrapper">
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimeGridPlugin, interactionPlugin]}
        
        initialView="resourceTimeGridDay"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimeGridDay,resourceTimeGridWeek'
        }}
        
        resources={resources}
        events={events}
        
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short'
        }}
        
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5, 6],
          startTime: '09:00',
          endTime: '18:00'
        }}
        
        height={height}
        nowIndicator={true}
        eventDisplay="block"
        
        editable={true}
        selectable={true}
        selectMirror={true}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        resourceAreaHeaderContent="Barbers"
        resourceAreaWidth="15%"
        
        lazyFetching={true}
        progressiveEventRendering={true}
      />
    </div>
  )
}