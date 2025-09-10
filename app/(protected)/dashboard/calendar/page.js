'use client'

import { useCallback } from 'react'
import dynamic from 'next/dynamic'

// Use the existing working EnhancedProfessionalCalendar component
const EnhancedProfessionalCalendar = dynamic(
  () => import('@/components/calendar/EnhancedProfessionalCalendar'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
        <p className="mt-4 text-gray-600">Loading Calendar...</p>
      </div>
    )
  }
)

export default function CalendarPage() {
  // Sample resources (barbers)
  const resources = [
    { id: 'barber-1', title: 'John Smith', eventColor: '#10b981' },
    { id: 'barber-2', title: 'Sarah Johnson', eventColor: '#546355' },
    { id: 'barber-3', title: 'Mike Brown', eventColor: '#f59e0b' }
  ]

  // Sample events (appointments)
  const events = [
    {
      id: 'test-1',
      title: 'John Doe - Haircut',
      start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      resourceId: 'barber-1',
      backgroundColor: '#10b981'
    },
    {
      id: 'test-2',
      title: 'Jane Smith - Color & Cut',
      start: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString(),
      resourceId: 'barber-2',
      backgroundColor: '#546355'
    }
  ]

  // Handle slot click (for new appointments)
  const handleSlotClick = useCallback((slotInfo) => {
    console.log('Slot clicked:', slotInfo)
    alert(`Create appointment at ${slotInfo.start.toLocaleString()}`)
  }, [])

  // Handle event click (for existing appointments)
  const handleEventClick = useCallback((clickInfo) => {
    console.log('Event clicked:', clickInfo.event)
    alert(`Appointment: ${clickInfo.event.title}`)
  }, [])

  // Handle event drop (reschedule)
  const handleEventDrop = useCallback((dropInfo) => {
    console.log('Event dropped:', dropInfo)
    alert(`Appointment moved to ${dropInfo.event.start.toLocaleString()}`)
  }, [])

  return (
    <div className="p-6">
      {/* Calendar Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Appointment Calendar
        </h1>
        <p className="text-gray-600">
          Manage your barbershop appointments with drag-and-drop scheduling
        </p>
      </div>

      {/* Calendar Component */}
      <div className="bg-white rounded-lg shadow">
        <EnhancedProfessionalCalendar
          resources={resources}
          events={events}
          currentView="resourceTimeGridDay"
          onSlotClick={handleSlotClick}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          height="700px"
        />
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-olive-50 border border-olive-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-olive-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-olive-800 mb-2">
              How to Use the Calendar
            </h3>
            <ul className="text-sm text-olive-700 space-y-1 list-disc list-inside">
              <li>Click on time slots to create new appointments</li>
              <li>Click on existing appointments to view details</li>
              <li>Use the view buttons to switch between day, week, and month views</li>
              <li>Drag appointments to reschedule them</li>
              <li>Business hours are highlighted (9 AM - 6 PM)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}