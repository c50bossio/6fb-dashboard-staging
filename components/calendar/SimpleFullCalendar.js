'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import rrulePlugin from '@fullcalendar/rrule'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useEffect, useRef, useState } from 'react'

import { RRule } from 'rrule'

export default function SimpleFullCalendar({ events: externalEvents }) {
  const calendarRef = useRef(null)
  const [debugInfo, setDebugInfo] = useState('')

  const testEvents = [
    {
      id: 'simple-test-1',
      title: '🔄 RRule Test - Weekly Meeting',
      start: '2025-08-11T13:00:00',
      end: '2025-08-11T13:30:00',
      rrule: 'FREQ=WEEKLY;INTERVAL=1;COUNT=4',
      backgroundColor: '#546355'
    },
    {
      id: 'simple-test-2', 
      title: 'Regular Event',
      start: '2025-08-12T10:00:00',
      end: '2025-08-12T11:00:00',
      backgroundColor: '#10b981'
    }
  ]

  const events = externalEvents || testEvents

  useEffect(() => {
    console.log('=== SimpleFullCalendar Debug ===')
    console.log('RRule imported:', typeof RRule)
    console.log('rrulePlugin:', typeof rrulePlugin)
    console.log('Events to use:', events.length)
    console.log('External events provided:', !!externalEvents)
    
    setTimeout(() => {
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi()
        const events = calendarApi.getEvents()
        console.log('Events loaded in simple calendar:', events.length)
        
        setDebugInfo(`RRule: ${typeof RRule}, Events: ${events.length}`)
        
        const recurringEvents = events.filter(e => 
          (e._def && e._def.recurringDef) ||
          (e.extendedProps && e.extendedProps.rrule)
        )
        console.log('Recurring events found:', recurringEvents.length)
        
        calendarApi.gotoDate('2025-08-11')
      }
    }, 1000)
  }, [])

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event
    const isRecurring = !!(event._def && event._def.recurringDef)
    alert(`Event: ${event.title}
Date: ${event.start.toDateString()}
Time: ${event.start.toLocaleTimeString()}
Recurring: ${isRecurring}
Original RRule: ${event.extendedProps?.rrule || 'None'}`)
  }

  return (
    <div className="p-4">
      <div className="mb-4 p-3 bg-olive-50 rounded">
        <h3 className="font-semibold text-olive-900">🧪 Simple RRule Test Calendar</h3>
        <p className="text-sm text-olive-700">
          Testing RRule functionality in isolation. Debug: {debugInfo}
        </p>
        <p className="text-xs text-olive-600">
          Expected: Weekly meeting on Aug 11, 18, 25, Sep 1 + Regular event on Aug 12
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow" style={{ height: '600px' }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin]}
          
          initialView='timeGridWeek'
          initialDate='2025-08-11'
          
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          
          events={events}
          eventClick={handleEventClick}
          
          height="100%"
          timeZone="local"
          
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          
          eventDidMount={(info) => {
            console.log('Event mounted:', {
              id: info.event.id,
              title: info.event.title,
              start: info.event.start.toISOString(),
              isRecurring: !!(info.event._def && info.event._def.recurringDef)
            })
          }}
        />
      </div>
      
      {/* Navigation buttons for testing */}
      <div className="mt-4 text-center space-x-2">
        <button
          onClick={() => calendarRef.current?.getApi().gotoDate('2025-08-11')}
          className="px-3 py-1 bg-olive-500 text-white rounded"
        >
          Aug 11 (Original)
        </button>
        <button
          onClick={() => calendarRef.current?.getApi().gotoDate('2025-08-18')}
          className="px-3 py-1 bg-moss-600 text-white rounded"
        >
          Aug 18 (Recurring)
        </button>
        <button
          onClick={() => calendarRef.current?.getApi().gotoDate('2025-08-25')}
          className="px-3 py-1 bg-orange-500 text-white rounded"
        >
          Aug 25 (Recurring)
        </button>
        <button
          onClick={() => calendarRef.current?.getApi().gotoDate('2025-09-01')}
          className="px-3 py-1 bg-gold-700 text-white rounded"
        >
          Sep 1 (Recurring)
        </button>
      </div>
    </div>
  )
}