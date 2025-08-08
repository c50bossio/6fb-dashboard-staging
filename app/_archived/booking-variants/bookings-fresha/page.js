'use client'

import './calendar.css'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  UserIcon
} from '@heroicons/react/24/outline'

// Date utility functions (replacing date-fns)
const format = (date, formatString) => {
  const d = new Date(date)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December']
  
  if (formatString === 'MMMM d') {
    return `${months[d.getMonth()]} ${d.getDate()}`
  }
  if (formatString === 'd, yyyy') {
    return `${d.getDate()}, ${d.getFullYear()}`
  }
  if (formatString === 'h:mm a') {
    const hours = d.getHours()
    const minutes = d.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }
  return d.toLocaleString()
}

const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const startOfWeek = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

const addMinutes = (date, minutes) => {
  const result = new Date(date)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

// Custom Calendar Component (Fresha-style)
function FreshaCalendar({ date = new Date() }) {
  const [currentDate, setCurrentDate] = useState(date)
  const [selectedView, setSelectedView] = useState('week')
  const [appointments, setAppointments] = useState([])
  const scrollContainerRef = useRef(null)
  
  // Time slots from 8am to 8pm in 30-minute increments
  const timeSlots = []
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour}:00`)
    if (hour < 20) timeSlots.push(`${hour}:30`)
  }
  
  // Staff members
  const staff = [
    { id: 1, name: 'Any Smith', color: '#FF6B6B' },
    { id: 2, name: 'John Davis', color: '#4ECDC4' },
    { id: 3, name: 'Sarah Lee', color: '#45B7D1' },
    { id: 4, name: 'Mike Wilson', color: '#96CEB4' }
  ]
  
  // Generate sample appointments
  useEffect(() => {
    const generateAppointments = () => {
      const appts = []
      const services = [
        { name: 'Haircut', duration: 45, price: 35 },
        { name: 'Beard Trim', duration: 30, price: 25 },
        { name: 'Hair Color', duration: 120, price: 85 },
        { name: 'Fade Cut', duration: 60, price: 45 },
        { name: 'Hot Shave', duration: 45, price: 40 },
        { name: 'Hair & Beard', duration: 75, price: 60 }
      ]
      
      const clients = [
        'Alex Silva', 'Jamie Brown', 'Chris Johnson', 'Pat Davis',
        'Sam Wilson', 'Jordan Lee', 'Taylor Moore', 'Casey Jones'
      ]
      
      // For each day of the week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = addDays(startOfWeek(currentDate), dayOffset)
        
        // For each staff member
        staff.forEach((staffMember, staffIndex) => {
          // Add 2-4 appointments per day
          const appointmentCount = 2 + Math.floor(Math.random() * 3)
          let lastEndTime = new Date(dayDate)
          lastEndTime.setHours(9 + staffIndex, 0, 0, 0)
          
          for (let i = 0; i < appointmentCount; i++) {
            const service = services[Math.floor(Math.random() * services.length)]
            const client = clients[Math.floor(Math.random() * clients.length)]
            
            // Add some gap between appointments
            const gap = Math.random() > 0.5 ? 30 : 15
            const startTime = addMinutes(lastEndTime, gap)
            const endTime = addMinutes(startTime, service.duration)
            
            if (startTime.getHours() < 19) {
              appts.push({
                id: `${dayOffset}-${staffMember.id}-${i}`,
                staffId: staffMember.id,
                staffName: staffMember.name,
                clientName: client,
                service: service.name,
                price: service.price,
                startTime,
                endTime,
                duration: service.duration,
                color: staffMember.color,
                dayOffset
              })
              
              lastEndTime = endTime
            }
          }
        })
      }
      
      setAppointments(appts)
    }
    
    generateAppointments()
  }, [currentDate])
  
  // Get week dates
  const weekStart = startOfWeek(currentDate)
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  
  // Calculate appointment position
  const getAppointmentStyle = (apt) => {
    const startHour = apt.startTime.getHours()
    const startMinute = apt.startTime.getMinutes()
    const top = ((startHour - 8) * 60 + startMinute) * (60 / 30) // 60px per 30min slot
    
    const durationInMinutes = apt.duration
    const height = (durationInMinutes / 30) * 60 - 4 // -4 for margin
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: apt.color,
      left: '4px',
      right: '4px'
    }
  }
  
  // Scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date()
      const currentHour = now.getHours()
      if (currentHour >= 8 && currentHour <= 20) {
        const scrollPosition = (currentHour - 8) * 120 // 120px per hour (2 slots)
        scrollContainerRef.current.scrollTop = scrollPosition - 100
      }
    }
  }, [])
  
  // Get current time position
  const getCurrentTimePosition = () => {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    
    if (hours < 8 || hours >= 20) return null
    
    const position = ((hours - 8) * 60 + minutes) * (60 / 30)
    return position
  }
  
  const currentTimePosition = getCurrentTimePosition()
  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {format(weekStart, 'MMMM d')} - {format(weekDates[6], 'd, yyyy')}
              </h2>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                Today
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <CalendarDaysIcon className="h-4 w-4 text-gray-500" />
                <select className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer">
                  <option>Week</option>
                  <option>Day</option>
                  <option>Month</option>
                </select>
              </div>
              
              <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm">
                <PlusIcon className="h-4 w-4" />
                <span className="text-sm font-medium">New Booking</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Time Column */}
        <div className="w-16 border-r border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="h-14 border-b border-gray-200"></div>
          <div>
            {timeSlots.map((time, idx) => (
              <div 
                key={time} 
                className={`h-[60px] border-b border-gray-100 text-xs text-gray-500 pr-2 pt-1 text-right ${
                  time.includes(':30') ? 'border-dashed' : ''
                }`}
              >
                {!time.includes(':30') && time}
              </div>
            ))}
          </div>
        </div>
        
        {/* Calendar Content */}
        <div className="flex-1 overflow-auto calendar-scroll relative" ref={scrollContainerRef}>
          {/* Current Time Line - Spans all columns */}
          {currentTimePosition !== null && (
            <div 
              className="absolute left-0 right-0 h-0.5 bg-red-500 z-30 pointer-events-none"
              style={{ top: `${currentTimePosition + 56}px` }} // +56 for header
            >
              <div className="absolute -left-1 -top-1 w-3 h-3 bg-red-500 rounded-full time-indicator-dot"></div>
              <div className="absolute left-3 -top-3 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                {format(new Date(), 'h:mm a')}
              </div>
            </div>
          )}
          
          <div className="flex h-full relative">
            {/* Staff Columns */}
            {staff.map((staffMember) => (
              <div key={staffMember.id} className="flex-1 border-r border-gray-200 last:border-r-0 min-w-[200px]">
                {/* Staff Header */}
                <div className="h-14 border-b border-gray-200 bg-white sticky top-0 z-10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: staffMember.color }}></div>
                      <span className="text-sm font-medium text-gray-900">{staffMember.name}</span>
                    </div>
                  </div>
                </div>
                
                {/* Time Slots */}
                <div className="relative">
                  {timeSlots.map((time, idx) => (
                    <div 
                      key={time} 
                      className={`h-[60px] border-b ${
                        time.includes(':30') ? 'border-dashed border-gray-100' : 'border-gray-200'
                      } ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    />
                  ))}
                  
                  {/* Appointments */}
                  {appointments
                    .filter(apt => apt.staffId === staffMember.id)
                    .map(apt => (
                      <div
                        key={apt.id}
                        className="absolute rounded-md appointment-card cursor-pointer overflow-hidden"
                        style={{
                          ...getAppointmentStyle(apt),
                          border: '2px solid rgba(255, 255, 255, 0.3)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <div className="text-white h-full p-2 flex flex-col">
                          <div className="flex-1">
                            <div className="font-semibold text-sm leading-tight">{apt.clientName}</div>
                            <div className="text-xs opacity-95 mt-0.5">{apt.service}</div>
                          </div>
                          <div className="flex items-end justify-between mt-1">
                            <div className="text-xs opacity-90">
                              <div>{apt.duration}min</div>
                              <div>{format(apt.startTime, 'h:mm a')}</div>
                            </div>
                            <div className="text-sm font-bold">${apt.price}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FreshaBookingsPage() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Confirmed
                </button>
                <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Pending
                </button>
                <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancelled
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search appointments..."
                  className="pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all w-64"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <UserIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Calendar Container */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <FreshaCalendar date={new Date()} />
          </div>
        </div>
      </div>
    </div>
  )
}