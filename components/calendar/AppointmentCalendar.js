'use client'

import { useState, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import rrulePlugin from '@fullcalendar/rrule'

// Mock data for barbers/resources
const mockBarbers = [
  { id: 'marcus', title: 'Marcus Johnson', color: '#3B82F6' },
  { id: 'david', title: 'David Wilson', color: '#10B981' },
  { id: 'sophia', title: 'Sophia Martinez', color: '#8B5CF6' },
]

// Mock appointments data
const mockAppointments = [
  {
    id: '1',
    title: 'John Smith - Haircut',
    resourceId: 'marcus',
    start: '2025-08-06T10:00:00',
    end: '2025-08-06T10:30:00',
    color: '#3B82F6',
    extendedProps: {
      customer: 'John Smith',
      service: 'Classic Haircut',
      phone: '(555) 123-4567',
      price: '$25',
      status: 'confirmed'
    }
  },
  {
    id: '2',
    title: 'Mike Davis - Beard Trim',
    resourceId: 'david',
    start: '2025-08-06T14:30:00',
    end: '2025-08-06T15:00:00',
    color: '#10B981',
    extendedProps: {
      customer: 'Mike Davis',
      service: 'Beard Trim',
      phone: '(555) 987-6543',
      price: '$15',
      status: 'pending'
    }
  },
  {
    id: '3',
    title: 'Alex Rodriguez - Full Service',
    resourceId: 'marcus',
    start: '2025-08-07T11:00:00',
    end: '2025-08-07T12:00:00',
    color: '#3B82F6',
    extendedProps: {
      customer: 'Alex Rodriguez',
      service: 'Haircut + Beard + Shave',
      phone: '(555) 456-7890',
      price: '$45',
      status: 'confirmed'
    }
  }
]

// Service types with durations
const services = [
  { id: 'haircut', name: 'Classic Haircut', duration: 30, price: 25 },
  { id: 'beard', name: 'Beard Trim', duration: 15, price: 15 },
  { id: 'shave', name: 'Hot Shave', duration: 20, price: 20 },
  { id: 'combo', name: 'Haircut + Beard', duration: 45, price: 35 },
  { id: 'premium', name: 'Premium Package', duration: 60, price: 45 },
]

export default function AppointmentCalendar({ onAppointmentSelect, onCreateAppointment }) {
  const [events, setEvents] = useState(mockAppointments)
  const [view, setView] = useState('resourceTimeGridDay')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const calendarRef = useRef()

  // Calendar configuration
  const calendarConfig = {
    plugins: [
      dayGridPlugin,
      timeGridPlugin,
      resourceTimeGridPlugin,
      resourceTimelinePlugin,
      interactionPlugin,
      listPlugin,
      rrulePlugin
    ],
    initialView: view,
    initialDate: selectedDate,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'resourceTimeGridDay,timeGridWeek,dayGridMonth'
    },
    resources: mockBarbers,
    events: events,
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    slotDuration: '00:15:00',
    slotLabelInterval: '01:00:00',
    height: 'auto',
    contentHeight: 600,
    
    // Business hours
    businessHours: {
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday
      startTime: '09:00',
      endTime: '18:00',
    },

    // Event handlers
    select: (selectInfo) => {
      handleTimeSlotSelect(selectInfo)
    },
    
    eventClick: (info) => {
      if (onAppointmentSelect) {
        onAppointmentSelect(info.event)
      }
    },
    
    eventDrop: (info) => {
      handleAppointmentMove(info)
    },
    
    eventResize: (info) => {
      handleAppointmentResize(info)
    },

    // Custom event rendering
    eventContent: (eventInfo) => {
      const event = eventInfo.event
      const props = event.extendedProps
      
      return (
        <div className="p-1 text-xs">
          <div className="font-semibold truncate">{props.customer}</div>
          <div className="truncate opacity-90">{props.service}</div>
          <div className="font-medium">{props.price}</div>
        </div>
      )
    },

    // Resource rendering
    resourceLabelContent: (resourceInfo) => {
      return (
        <div className="flex items-center space-x-2 p-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: resourceInfo.resource.color }}
          />
          <span className="font-medium text-sm">{resourceInfo.resource.title}</span>
        </div>
      )
    }
  }

  const handleTimeSlotSelect = (selectInfo) => {
    const calendarApi = selectInfo.view.calendar
    const { start, end, resource } = selectInfo

    // Show appointment creation modal/form
    if (onCreateAppointment) {
      onCreateAppointment({
        start,
        end,
        resourceId: resource?.id,
        barberName: resource?.title
      })
    }

    // Clear the selection
    calendarApi.unselect()
  }

  const handleAppointmentMove = (info) => {
    const { event, delta, revert } = info
    
    // Check for conflicts
    if (hasConflict(event, events.filter(e => e.id !== event.id))) {
      alert('Time slot conflict detected!')
      revert()
      return
    }

    // Update the event in state
    setEvents(prevEvents => 
      prevEvents.map(e => 
        e.id === event.id 
          ? { ...e, start: event.start, end: event.end, resourceId: event.getResources()[0]?.id }
          : e
      )
    )

    console.log('Appointment moved:', {
      id: event.id,
      newStart: event.start,
      newEnd: event.end,
      newBarber: event.getResources()[0]?.title
    })
  }

  const handleAppointmentResize = (info) => {
    const { event, delta, revert } = info
    
    // Validate minimum/maximum duration
    const duration = event.end - event.start
    const minDuration = 15 * 60 * 1000 // 15 minutes in ms
    const maxDuration = 120 * 60 * 1000 // 2 hours in ms
    
    if (duration < minDuration || duration > maxDuration) {
      alert('Invalid appointment duration!')
      revert()
      return
    }

    // Update the event in state
    setEvents(prevEvents => 
      prevEvents.map(e => 
        e.id === event.id 
          ? { ...e, end: event.end }
          : e
      )
    )

    console.log('Appointment resized:', {
      id: event.id,
      newEnd: event.end,
      duration: Math.round(duration / 60000) + ' minutes'
    })
  }

  const hasConflict = (newEvent, existingEvents) => {
    const newStart = new Date(newEvent.start)
    const newEnd = new Date(newEvent.end)
    const resourceId = newEvent.getResources()[0]?.id

    return existingEvents.some(event => {
      if (event.resourceId !== resourceId) return false
      
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      
      return (newStart < eventEnd && newEnd > eventStart)
    })
  }

  const changeView = (newView) => {
    setView(newView)
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(newView)
    }
  }

  const goToDate = (date) => {
    setSelectedDate(date)
    if (calendarRef.current) {
      calendarRef.current.getApi().gotoDate(date)
    }
  }

  const addAppointment = (appointmentData) => {
    const newEvent = {
      id: Date.now().toString(),
      title: `${appointmentData.customerName} - ${appointmentData.service}`,
      resourceId: appointmentData.barberId,
      start: appointmentData.start,
      end: appointmentData.end,
      color: mockBarbers.find(b => b.id === appointmentData.barberId)?.color,
      extendedProps: {
        customer: appointmentData.customerName,
        service: appointmentData.service,
        phone: appointmentData.customerPhone,
        price: `$${appointmentData.price}`,
        status: 'pending'
      }
    }

    setEvents(prevEvents => [...prevEvents, newEvent])
    
    // Add to calendar
    if (calendarRef.current) {
      calendarRef.current.getApi().addEvent(newEvent)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Toolbar */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">Appointment Calendar</h3>
            <div className="flex items-center space-x-2">
              {mockBarbers.map(barber => (
                <div key={barber.id} className="flex items-center space-x-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: barber.color }}
                  />
                  <span className="text-sm text-gray-600">{barber.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={view}
              onChange={(e) => changeView(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="resourceTimeGridDay">Day View</option>
              <option value="timeGridWeek">Week View</option>
              <option value="dayGridMonth">Month View</option>
            </select>
          </div>
        </div>
      </div>

      {/* FullCalendar Component */}
      <div className="p-6">
        <FullCalendar
          ref={calendarRef}
          {...calendarConfig}
        />
      </div>

      {/* Instructions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="text-sm text-gray-600">
          <p className="font-medium mb-1">Calendar Instructions:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Click and drag on empty time slots to create new appointments</li>
            <li>Drag appointments to reschedule them</li>
            <li>Resize appointments by dragging the bottom edge</li>
            <li>Click appointments to view details and edit</li>
          </ul>
        </div>
      </div>
    </div>
  )
}