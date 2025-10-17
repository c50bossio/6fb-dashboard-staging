'use client'

import { useEffect, useRef } from 'react'

export default function CalendarSimplePage() {
  const calendarRef = useRef(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.18/index.global.min.js'
    script.async = true
    script.onload = () => {
      if (window.FullCalendar && calendarRef.current) {
        const calendar = new window.FullCalendar.Calendar(calendarRef.current, {
          initialView: 'dayGridMonth',
          events: [
            { title: 'Haircut - John', date: '2025-08-05', color: '#10b981' },
            { title: 'Beard Trim - Mike', date: '2025-08-06', color: '#546355' },
            { title: 'Full Service - David', date: '2025-08-07', color: '#D4B878' }
          ],
          headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          },
          height: '100%'
        })
        calendar.render()
      }
    }
    document.head.appendChild(script)

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.18/index.global.min.css'
    document.head.appendChild(link)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
      if (link.parentNode) {
        link.parentNode.removeChild(link)
      }
    }
  }, [])

  return (
    <div className="p-8 h-full">
      <h1 className="text-2xl font-bold mb-4">Simple Calendar Test (CDN Version)</h1>
      <div className="bg-white rounded-lg shadow p-4" style={{ height: 'calc(100% - 80px)' }}>
        <div ref={calendarRef} style={{ height: '100%' }}></div>
      </div>
    </div>
  )
}