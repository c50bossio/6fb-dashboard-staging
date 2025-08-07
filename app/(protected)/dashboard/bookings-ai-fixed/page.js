'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { 
  CalendarDaysIcon,
  UserGroupIcon,
  SparklesIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  BellIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useState, useEffect, useRef } from 'react'

import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { createClient } from '../../../../lib/supabase/client'

// Service types with colors matching FullCalendar
const SERVICES = [
  { id: 'haircut', name: 'Haircut', duration: 30, price: 35, color: '#3B82F6' },
  { id: 'beard', name: 'Beard Trim', duration: 20, price: 20, color: '#10B981' },
  { id: 'full', name: 'Full Service', duration: 50, price: 50, color: '#8B5CF6' },
  { id: 'kids', name: 'Kids Cut', duration: 20, price: 25, color: '#F59E0B' }
]

// Barbers
const BARBERS = [
  { id: '1', name: 'Marcus', title: 'Modern Cuts Specialist' },
  { id: '2', name: 'David', title: 'Classic Styles Expert' },
  { id: '3', name: 'Mike', title: 'Beard Specialist' }
]

export default function BookingsAIFixedPage() {
  const calendarRef = useRef(null)
  const [events, setEvents] = useState([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedBarber, setSelectedBarber] = useState('1')
  const [aiInsights, setAiInsights] = useState([])
  const [stats, setStats] = useState({
    todayBookings: 0,
    weekRevenue: 0,
    utilizationRate: 0,
    peakHours: []
  })
  
  const { user } = useAuth()
  const supabase = createClient()

  // Load initial data
  useEffect(() => {
    loadEvents()
    generateAIInsights()
  }, [selectedBarber])

  const loadEvents = async () => {
    // Demo events filtered by selected barber
    const allEvents = [
      {
        id: '1',
        title: 'John Smith - Haircut',
        start: new Date(new Date().setHours(10, 0, 0, 0)),
        end: new Date(new Date().setHours(10, 30, 0, 0)),
        backgroundColor: '#3B82F6',
        barberId: '1',
        extendedProps: {
          customerName: 'John Smith',
          service: 'haircut',
          price: 35,
          phone: '+1 (555) 123-4567',
          notes: 'Regular customer'
        }
      },
      {
        id: '2',
        title: 'Sarah Johnson - Full Service',
        start: new Date(new Date().setHours(14, 30, 0, 0)),
        end: new Date(new Date().setHours(15, 20, 0, 0)),
        backgroundColor: '#8B5CF6',
        barberId: '2',
        extendedProps: {
          customerName: 'Sarah Johnson',
          service: 'full',
          price: 50,
          phone: '+1 (555) 234-5678',
          notes: 'Prefers beard trim with haircut'
        }
      },
      {
        id: '3',
        title: 'Mike Wilson - Beard Trim',
        start: new Date(new Date().setHours(11, 0, 0, 0)),
        end: new Date(new Date().setHours(11, 20, 0, 0)),
        backgroundColor: '#10B981',
        barberId: '1',
        extendedProps: {
          customerName: 'Mike Wilson',
          service: 'beard',
          price: 20,
          phone: '+1 (555) 345-6789',
          notes: 'VIP customer'
        }
      }
    ]
    
    // Filter events by selected barber
    const filteredEvents = allEvents.filter(event => event.barberId === selectedBarber)
    setEvents(filteredEvents)
    calculateStats(filteredEvents)
  }

  const calculateStats = (eventList) => {
    const today = new Date()
    const todayEvents = eventList.filter(e => 
      new Date(e.start).toDateString() === today.toDateString()
    )
    
    const weekRevenue = eventList.reduce((sum, e) => sum + (e.extendedProps.price || 0), 0)
    const utilizationRate = Math.round((eventList.length / 18) * 100) // 18 slots per day
    
    setStats({
      todayBookings: todayEvents.length,
      weekRevenue,
      utilizationRate,
      peakHours: ['10:00', '14:00', '16:00']
    })
  }

  const generateAIInsights = () => {
    const insights = [
      {
        id: 1,
        agent: 'marcus',
        type: 'acquisition',
        priority: 'high',
        insight: 'Morning slots (9-11 AM) show 40% availability. Launch early bird special to boost bookings.',
        actionable: true,
        impact: 'Could fill 5-7 additional slots per week'
      },
      {
        id: 2,
        agent: 'sophia',
        type: 'optimization',
        priority: 'medium',
        insight: 'Customers booking haircuts often add beard trim. Bundle at $45 (save $10).',
        actionable: true,
        impact: '+$15 average ticket increase'
      },
      {
        id: 3,
        agent: 'david',
        type: 'retention',
        priority: 'high',
        insight: 'Set up automated SMS reminders 24h before appointments to reduce no-shows.',
        actionable: true,
        impact: 'Reduce no-show rate by 60%'
      }
    ]
    
    setAiInsights(insights)
  }

  // FullCalendar event handlers
  const handleDateSelect = (selectInfo) => {
    setSelectedDate({
      start: selectInfo.start,
      end: selectInfo.end,
      allDay: selectInfo.allDay
    })
    setShowBookingModal(true)
  }

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event
    alert(`
Appointment Details:
Customer: ${event.extendedProps.customerName}
Service: ${event.extendedProps.service}
Time: ${event.start.toLocaleTimeString()}
Notes: ${event.extendedProps.notes}
    `)
  }

  const handleEventDrop = (dropInfo) => {
    const event = dropInfo.event
    const oldStart = dropInfo.oldEvent.start
    const newStart = event.start
    
    // Update event in state
    setEvents(prevEvents => 
      prevEvents.map(e => 
        e.id === event.id 
          ? {
              ...e,
              start: newStart,
              end: new Date(newStart.getTime() + (e.end - e.start))
            }
          : e
      )
    )
    
    // Show feedback
    console.log(`Moved ${event.title} from ${oldStart.toLocaleTimeString()} to ${newStart.toLocaleTimeString()}`)
    
    // AI feedback
    if (newStart.getHours() < 12 && oldStart.getHours() >= 12) {
      alert('AI Tip: Morning appointments have higher show rates!')
    }
  }

  const handleEventResize = (resizeInfo) => {
    const event = resizeInfo.event
    
    setEvents(prevEvents => 
      prevEvents.map(e => 
        e.id === event.id 
          ? { ...e, end: event.end }
          : e
      )
    )
    
    console.log(`Resized ${event.title} to ${(event.end - event.start) / 60000} minutes`)
  }

  const handleCreateAppointment = (formData) => {
    const service = SERVICES.find(s => s.id === formData.serviceType)
    const startTime = new Date(selectedDate.start)
    const endTime = new Date(startTime.getTime() + service.duration * 60000)
    
    const newEvent = {
      id: Date.now().toString(),
      title: `${formData.customerName} - ${service.name}`,
      start: startTime,
      end: endTime,
      backgroundColor: service.color,
      barberId: selectedBarber,
      extendedProps: {
        customerName: formData.customerName,
        service: formData.serviceType,
        price: service.price,
        phone: formData.customerPhone,
        notes: formData.notes
      }
    }
    
    setEvents([...events, newEvent])
    setShowBookingModal(false)
    calculateStats([...events, newEvent])
  }

  // Booking Modal
  const BookingModal = () => {
    const [formData, setFormData] = useState({
      customerName: '',
      customerPhone: '',
      serviceType: 'haircut',
      notes: ''
    })

    const handleSubmit = (e) => {
      e.preventDefault()
      handleCreateAppointment(formData)
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Book Appointment</h3>
            <button onClick={() => setShowBookingModal(false)} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                required
                value={formData.customerPhone}
                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
              <select
                value={formData.serviceType}
                onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SERVICES.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.duration}min - ${service.price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p><strong>Date:</strong> {selectedDate?.start.toLocaleDateString()}</p>
              <p><strong>Time:</strong> {selectedDate?.start.toLocaleTimeString()}</p>
              <p><strong>Barber:</strong> {BARBERS.find(b => b.id === selectedBarber)?.name}</p>
            </div>

            <div className="flex space-x-3">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                Book Appointment
              </button>
              <button type="button" onClick={() => setShowBookingModal(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // AI Insights Panel
  const AIInsightsPanel = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
        AI Insights
      </h3>
      <div className="space-y-3">
        {aiInsights.map(insight => (
          <div key={insight.id} className={`p-3 rounded-lg border ${
            insight.priority === 'high' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 capitalize">{insight.agent}</span>
                  {insight.priority === 'high' && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">High Priority</span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{insight.insight}</p>
                {insight.impact && (
                  <p className="text-xs text-gray-600 mt-1">Impact: {insight.impact}</p>
                )}
                {insight.actionable && (
                  <button className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700">
                    Take Action
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI-Powered Booking Calendar</h1>
              <p className="text-sm text-gray-600">Drag & drop appointments to reschedule</p>
            </div>
          </div>
          
          {/* Barber Selector */}
          <div className="flex items-center space-x-4">
            <select
              value={selectedBarber}
              onChange={(e) => setSelectedBarber(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {BARBERS.map(barber => (
                <option key={barber.id} value={barber.id}>
                  {barber.name} - {barber.title}
                </option>
              ))}
            </select>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              Quick Book
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Today's Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{stats.todayBookings}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Week Revenue</p>
            <p className="text-2xl font-bold text-green-600">${stats.weekRevenue}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Utilization</p>
            <p className="text-2xl font-bold text-blue-600">{stats.utilizationRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Peak Hours</p>
            <p className="text-sm font-medium text-gray-900">{stats.peakHours.join(', ')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Calendar */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            initialView='timeGridWeek'
            editable={true}
            droppable={true}
            selectable={true}
            selectMirror={true}
            eventStartEditable={true}
            eventDurationEditable={true}
            events={events}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            slotMinTime="09:00"
            slotMaxTime="18:00"
            slotDuration="00:30:00"
            height="100%"
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5, 6],
              startTime: '09:00',
              endTime: '18:00'
            }}
            eventContent={(eventInfo) => {
              return (
                <div className="p-1 text-xs cursor-move">
                  <div className="font-medium">{eventInfo.event.extendedProps.customerName}</div>
                  <div className="opacity-90">{eventInfo.event.extendedProps.service}</div>
                </div>
              )
            }}
          />
          
          {/* Add custom styles */}
          <style jsx global>{`
            .fc-event {
              cursor: move !important;
              border: none !important;
              padding: 2px 4px !important;
              font-size: 12px !important;
            }
            .fc-event:hover {
              opacity: 0.9;
              transform: translateY(-1px);
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .fc-event-dragging {
              opacity: 0.75 !important;
              z-index: 999 !important;
            }
            .fc-event-resizing {
              opacity: 0.75 !important;
            }
            .fc-highlight {
              background: rgba(59, 130, 246, 0.15) !important;
            }
          `}</style>
        </div>

        {/* AI Insights Sidebar */}
        <div className="w-96">
          <AIInsightsPanel />
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && <BookingModal />}
    </div>
  )
}