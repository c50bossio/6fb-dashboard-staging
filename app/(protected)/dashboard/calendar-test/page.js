'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import FullCalendar from '@fullcalendar/react'

export default function CalendarTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Calendar Test</h1>
      <div className="bg-white rounded-lg shadow p-4" style={{ height: '600px' }}>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={[
            { title: 'Test Event 1', date: '2025-08-05' },
            { title: 'Test Event 2', date: '2025-08-06' }
          ]}
          height="100%"
        />
      </div>
    </div>
  )
}