'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
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
  ChatBubbleLeftIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useState, useEffect, useRef } from 'react'

import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { createClient } from '../../../../lib/supabase/client'

// Service types with colors matching FullCalendar
const SERVICES = [
  { id: 'haircut', name: 'Haircut', duration: 30, price: 35, color: '#3B82F6' }, // blue
  { id: 'beard', name: 'Beard Trim', duration: 20, price: 20, color: '#10B981' }, // green
  { id: 'full', name: 'Full Service', duration: 50, price: 50, color: '#8B5CF6' }, // purple
  { id: 'kids', name: 'Kids Cut', duration: 20, price: 25, color: '#F59E0B' } // orange
]

// Barbers as resources
const BARBERS = [
  { id: '1', name: 'Marcus', title: 'Modern Cuts Specialist', color: '#3B82F6' },
  { id: '2', name: 'David', title: 'Classic Styles Expert', color: '#10B981' },
  { id: '3', name: 'Mike', title: 'Beard Specialist', color: '#8B5CF6' }
]

// AI Agent insights
const AI_AGENTS = {
  marcus: { 
    name: 'Marcus', 
    role: 'Client Acquisition', 
    icon: UserGroupIcon,
    color: 'blue'
  },
  sophia: { 
    name: 'Sophia', 
    role: 'Business Coach', 
    icon: ChartBarIcon,
    color: 'purple'
  },
  david: { 
    name: 'David', 
    role: 'Growth Strategist', 
    icon: ArrowTrendingUpIcon,
    color: 'green'
  }
}

export default function BookingsAIPage() {
  const calendarRef = useRef(null)
  const [events, setEvents] = useState([])
  const [customers, setCustomers] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [aiInsights, setAiInsights] = useState([])
  const [stats, setStats] = useState({
    todayBookings: 0,
    weekRevenue: 0,
    utilizationRate: 0,
    peakHours: [],
    recommendedActions: []
  })
  
  const { user } = useAuth()
  const supabase = createClient()

  // Load initial data
  useEffect(() => {
    loadCustomers()
    loadEvents()
    generateAIInsights()
  }, [])

  const loadCustomers = async () => {
    // Demo customers with rich data for AI analysis
    const demoCustomers = [
      {
        id: 1,
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        totalVisits: 12,
        lastVisit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        totalSpent: 480,
        preferredService: 'haircut',
        preferredBarber: '1',
        segment: 'vip',
        bookingPatterns: { preferredDay: 'Friday', preferredTime: '10:00' }
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '+1 (555) 234-5678',
        totalVisits: 6,
        lastVisit: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        totalSpent: 240,
        preferredService: 'full',
        preferredBarber: '2',
        segment: 'regular',
        bookingPatterns: { preferredDay: 'Saturday', preferredTime: '14:00' }
      }
    ]
    setCustomers(demoCustomers)
  }

  const loadEvents = async () => {
    // Demo events with AI-enriched data
    const demoEvents = [
      {
        id: '1',
        title: 'John Smith - Haircut',
        start: new Date(new Date().setHours(10, 0, 0, 0)),
        end: new Date(new Date().setHours(10, 30, 0, 0)),
        resourceId: '1',
        backgroundColor: '#3B82F6',
        extendedProps: {
          customerId: 1,
          customerName: 'John Smith',
          service: 'haircut',
          price: 35,
          status: 'confirmed',
          segment: 'vip',
          phone: '+1 (555) 123-4567',
          notes: 'Regular customer, prefers #3 guard',
          aiScore: 95 // AI confidence score
        }
      },
      {
        id: '2',
        title: 'Sarah Johnson - Full Service',
        start: new Date(new Date().setHours(14, 30, 0, 0)),
        end: new Date(new Date().setHours(15, 20, 0, 0)),
        resourceId: '2',
        backgroundColor: '#8B5CF6',
        extendedProps: {
          customerId: 2,
          customerName: 'Sarah Johnson',
          service: 'full',
          price: 50,
          status: 'confirmed',
          segment: 'regular',
          phone: '+1 (555) 234-5678',
          notes: 'Prefers beard trim with haircut',
          aiScore: 88
        }
      }
    ]
    
    setEvents(demoEvents)
    calculateStats(demoEvents)
  }

  const calculateStats = (eventList) => {
    const today = new Date()
    const todayEvents = eventList.filter(e => 
      new Date(e.start).toDateString() === today.toDateString()
    )
    
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()))
    const weekEvents = eventList.filter(e => new Date(e.start) >= weekStart)
    
    const weekRevenue = weekEvents.reduce((sum, e) => sum + (e.extendedProps.price || 0), 0)
    
    // Calculate utilization
    const totalSlots = 9 * 2 * 3 * 7 // 9 hours * 2 slots/hour * 3 barbers * 7 days
    const bookedSlots = weekEvents.length
    const utilizationRate = Math.round((bookedSlots / totalSlots) * 100)
    
    // Find peak hours
    const hourCounts = {}
    eventList.forEach(event => {
      const hour = new Date(event.start).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`)
    
    setStats({
      todayBookings: todayEvents.length,
      weekRevenue,
      utilizationRate,
      peakHours,
      recommendedActions: generateRecommendations(utilizationRate, weekRevenue)
    })
  }

  const generateRecommendations = (utilization, revenue) => {
    const recommendations = []
    
    if (utilization < 60) {
      recommendations.push({
        type: 'opportunity',
        message: 'Low utilization detected. Consider promotional offers for off-peak hours.',
        agent: 'marcus'
      })
    }
    
    if (revenue < 2000) {
      recommendations.push({
        type: 'revenue',
        message: 'Revenue below target. Upsell opportunities available with beard trims.',
        agent: 'sophia'
      })
    }
    
    recommendations.push({
      type: 'growth',
      message: 'Saturday afternoons show high demand. Consider extending hours.',
      agent: 'david'
    })
    
    return recommendations
  }

  const generateAIInsights = () => {
    // Simulate AI agent insights
    const insights = [
      {
        id: 1,
        agent: 'marcus',
        type: 'acquisition',
        priority: 'high',
        insight: 'New customer bookings are down 15% this week. Launch targeted social media campaign for first-time customers.',
        actionable: true,
        impact: 'Could increase new bookings by 25%'
      },
      {
        id: 2,
        agent: 'sophia',
        type: 'optimization',
        priority: 'medium',
        insight: 'Tuesday and Wednesday show 40% lower utilization. Implement "Midweek Special" pricing.',
        actionable: true,
        impact: 'Potential $300/week revenue increase'
      },
      {
        id: 3,
        agent: 'david',
        type: 'retention',
        priority: 'high',
        insight: '3 VIP customers haven\'t booked in 30+ days. Send personalized re-engagement offers.',
        actionable: true,
        impact: 'Retain $150/month recurring revenue'
      }
    ]
    
    setAiInsights(insights)
  }

  // FullCalendar event handlers
  const handleDateSelect = (selectInfo) => {
    setSelectedDate({
      start: selectInfo.start,
      end: selectInfo.end,
      allDay: selectInfo.allDay,
      resource: selectInfo.resource
    })
    setShowBookingModal(true)
  }

  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event)
    // Could open event details modal
  }

  const handleEventDrop = async (dropInfo) => {
    // Get the updated event data
    const eventId = dropInfo.event.id
    const newStart = dropInfo.event.start
    const newEnd = dropInfo.event.end
    const newResourceId = dropInfo.event.getResources()[0]?.id || dropInfo.event.extendedProps.resourceId
    
    // Update the event in state
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              start: newStart,
              end: newEnd,
              resourceId: newResourceId
            }
          : event
      )
    )
    
    // Show success message
    console.log('Event moved successfully:', {
      id: eventId,
      newStart: newStart.toISOString(),
      newEnd: newEnd.toISOString(),
      newBarber: newResourceId
    })
    
    // AI insight on the move
    generateMoveInsight(dropInfo.event, dropInfo.oldEvent)
  }

  const handleEventResize = async (resizeInfo) => {
    // Get the updated event data
    const eventId = resizeInfo.event.id
    const newStart = resizeInfo.event.start
    const newEnd = resizeInfo.event.end
    
    // Update the event in state
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              start: newStart,
              end: newEnd
            }
          : event
      )
    )
    
    console.log('Event resized:', {
      id: eventId,
      newDuration: (newEnd - newStart) / 60000 + ' minutes'
    })
  }

  const generateMoveInsight = (newEvent, oldEvent) => {
    const newHour = newEvent.start.getHours()
    const oldHour = oldEvent.start.getHours()
    
    if (newHour < 12 && oldHour >= 12) {
      alert('AI Insight: Moving to morning slot - customer typically prefers afternoons. Send confirmation reminder.')
    }
  }

  const handleCreateAppointment = (appointmentData) => {
    const service = SERVICES.find(s => s.id === appointmentData.serviceType)
    const barber = BARBERS.find(b => b.id === appointmentData.barberId)
    
    const newEvent = {
      id: Date.now().toString(),
      title: `${appointmentData.customerName} - ${service.name}`,
      start: appointmentData.start,
      end: appointmentData.end,
      resourceId: appointmentData.barberId,
      backgroundColor: service.color,
      extendedProps: {
        customerId: appointmentData.customerId,
        customerName: appointmentData.customerName,
        service: appointmentData.serviceType,
        price: service.price,
        status: 'confirmed',
        segment: appointmentData.segment || 'new',
        phone: appointmentData.customerPhone,
        email: appointmentData.customerEmail,
        notes: appointmentData.notes,
        aiScore: Math.floor(Math.random() * 20) + 80
      }
    }
    
    setEvents([...events, newEvent])
    calculateStats([...events, newEvent])
    setShowBookingModal(false)
    
    // Generate AI insight for new booking
    generateBookingInsight(newEvent)
  }

  const generateBookingInsight = (event) => {
    const insights = []
    const hour = new Date(event.start).getHours()
    
    if (hour >= 17) {
      insights.push('Evening booking detected - customer may appreciate reminder about parking availability.')
    }
    
    if (event.extendedProps.segment === 'new') {
      insights.push('First-time customer! Ensure exceptional service for retention.')
    }
    
    if (insights.length > 0) {
      console.log('AI Booking Insights:', insights)
    }
  }

  // Booking Modal Component
  const BookingModal = () => {
    const [formData, setFormData] = useState({
      customerName: selectedCustomer?.name || '',
      customerPhone: selectedCustomer?.phone || '',
      customerEmail: selectedCustomer?.email || '',
      serviceType: selectedCustomer?.preferredService || 'haircut',
      barberId: selectedDate?.resource?.id || '1',
      notes: ''
    })

    const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase())
    )

    const handleSubmit = (e) => {
      e.preventDefault()
      
      const service = SERVICES.find(s => s.id === formData.serviceType)
      const startTime = new Date(selectedDate.start)
      const endTime = new Date(startTime.getTime() + service.duration * 60000)
      
      handleCreateAppointment({
        ...formData,
        customerId: selectedCustomer?.id,
        segment: selectedCustomer?.segment,
        start: startTime,
        end: endTime
      })
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Book Appointment</h3>
            <button onClick={() => setShowBookingModal(false)} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* AI Recommendation */}
          {selectedDate && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">AI Recommendation</p>
                  <p className="text-blue-700">
                    {new Date(selectedDate.start).getHours() < 12 
                      ? 'Morning slots have 15% higher show-up rate'
                      : 'Consider offering a package deal - 70% of afternoon customers add beard trim'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerDropdown(true)
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search existing customer..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              
              {showCustomerDropdown && customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
                  {filteredCustomers.map(customer => (
                    <div
                      key={customer.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedCustomer(customer)
                        setFormData({
                          customerName: customer.name,
                          customerPhone: customer.phone,
                          customerEmail: customer.email,
                          serviceType: customer.preferredService,
                          barberId: customer.preferredBarber || formData.barberId,
                          notes: ''
                        })
                        setCustomerSearch(customer.name)
                        setShowCustomerDropdown(false)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{customer.totalVisits} visits</div>
                          {customer.segment === 'vip' && <StarIconSolid className="h-4 w-4 text-yellow-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
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
            </div>

            {/* Service Selection */}
            <div className="grid grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Barber</label>
                <select
                  value={formData.barberId}
                  onChange={(e) => setFormData({...formData, barberId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BARBERS.map(barber => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name} - {barber.title}
                    </option>
                  ))}
                </select>
              </div>
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
        AI Agent Insights
      </h3>
      <div className="space-y-3">
        {aiInsights.map(insight => {
          const agent = AI_AGENTS[insight.agent]
          return (
            <div key={insight.id} className={`p-3 rounded-lg border ${
              insight.priority === 'high' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start">
                <agent.icon className={`h-5 w-5 mr-2 text-${agent.color}-600 flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{agent.name} - {agent.role}</span>
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
          )
        })}
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
              <h1 className="text-2xl font-bold text-gray-900">AI-Powered Booking System</h1>
              <p className="text-sm text-gray-600">Smart scheduling with AI insights and recommendations</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
              <PlusIcon className="h-5 w-5 mr-2" />
              Quick Book
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Today's Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{stats.todayBookings}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Week Revenue</p>
            <p className="text-2xl font-bold text-green-600">${stats.weekRevenue}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Utilization Rate</p>
            <p className="text-2xl font-bold text-blue-600">{stats.utilizationRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Peak Hours</p>
            <p className="text-sm font-medium text-gray-900">{stats.peakHours.join(', ')}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">AI Score</p>
            <p className="text-2xl font-bold text-purple-600">92</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Calendar */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, resourceTimeGridPlugin]}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,resourceTimeGridDay,listWeek'
            }}
            initialView='resourceTimeGridDay'
            resources={BARBERS}
            schedulerLicenseKey='CC-Attribution-NonCommercial-NoDerivatives'
            editable={true}
            selectable={true}
            selectMirror={true}
            events={events}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventDragStart={(info) => {
              console.log('Drag started:', info.event.title)
            }}
            eventDragStop={(info) => {
              console.log('Drag stopped:', info.event.title)
            }}
            droppable={true}
            eventStartEditable={true}
            eventDurationEditable={true}
            eventResourceEditable={true}
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
              const { segment, customerName, service } = eventInfo.event.extendedProps
              return (
                <div className="p-1 text-xs">
                  <div className="font-medium">{customerName}</div>
                  <div className="opacity-90">{service}</div>
                  {segment === 'vip' && <StarIconSolid className="h-3 w-3 text-yellow-300 inline" />}
                </div>
              )
            }}
            eventClassNames="cursor-move hover:shadow-lg transition-shadow"
            dayCellClassNames="hover:bg-gray-50"
          />
          
          {/* Add custom styles for better drag and drop */}
          <style jsx global>{`
            .fc-event {
              cursor: move !important;
              transition: opacity 0.2s, transform 0.2s;
            }
            .fc-event:hover {
              opacity: 0.9;
              transform: scale(1.02);
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .fc-event-dragging {
              opacity: 0.75;
              z-index: 999 !important;
            }
            .fc-event.fc-event-resizing {
              opacity: 0.75;
            }
            .fc-highlight {
              background: rgba(59, 130, 246, 0.15) !important;
            }
            .fc-timegrid-slot {
              cursor: pointer;
            }
            .fc-timegrid-slot:hover {
              background-color: rgba(0, 0, 0, 0.02);
            }
          `}</style>
        </div>

        {/* AI Insights Sidebar */}
        <div className="w-96 space-y-4">
          <AIInsightsPanel />
          
          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <BoltIcon className="h-5 w-5 mr-2 text-orange-600" />
              AI Recommendations
            </h3>
            <div className="space-y-2">
              {stats.recommendedActions.map((action, index) => (
                <div key={index} className="flex items-start p-2 rounded-lg bg-orange-50">
                  <LightBulbIcon className="h-4 w-4 text-orange-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-700">{action.message}</p>
                    <p className="text-xs text-gray-600 mt-0.5">By {AI_AGENTS[action.agent].name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && <BookingModal />}
    </div>
  )
}