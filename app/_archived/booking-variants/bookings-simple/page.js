'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlusIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline'

export default function SimpleBookingsPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // Generate time slots
  const timeSlots = []
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour}:00`)
    if (hour < 20) timeSlots.push(`${hour}:30`)
  }
  
  // Mock barbers
  const barbers = [
    { id: 1, name: 'John Smith', color: '#10b981' },
    { id: 2, name: 'Sarah Johnson', color: '#3b82f6' },
    { id: 3, name: 'Mike Brown', color: '#f59e0b' },
    { id: 4, name: 'Lisa Davis', color: '#8b5cf6' }
  ]
  
  // Generate mock appointments
  useEffect(() => {
    const mockAppointments = []
    const services = ['Haircut', 'Beard Trim', 'Fade Cut', 'Hair Color', 'Hot Shave']
    const clients = ['Alex Johnson', 'Sam Wilson', 'Chris Lee', 'Pat Davis', 'Jordan Brown']
    
    // Generate appointments for today
    barbers.forEach((barber, idx) => {
      // Add 2-3 appointments per barber
      for (let i = 0; i < 3; i++) {
        const hour = 9 + idx * 2 + i * 2
        if (hour < 18) {
          mockAppointments.push({
            id: `${barber.id}-${i}`,
            barberId: barber.id,
            barberName: barber.name,
            clientName: clients[Math.floor(Math.random() * clients.length)],
            service: services[Math.floor(Math.random() * services.length)],
            time: `${hour}:00`,
            duration: 60,
            price: 25 + Math.floor(Math.random() * 40),
            color: barber.color
          })
        }
      }
    })
    
    setAppointments(mockAppointments)
  }, [])
  
  // Get appointment for a specific time and barber
  const getAppointment = (time, barberId) => {
    return appointments.find(apt => apt.time === time && apt.barberId === barberId)
  }
  
  // Format date
  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }
  
  // Navigate dates
  const goToToday = () => setCurrentDate(new Date())
  const goToPrevDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    setCurrentDate(newDate)
  }
  const goToNextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    setCurrentDate(newDate)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Simple Booking Calendar</h1>
                <p className="text-sm text-gray-600">No FullCalendar - Just Pure React</p>
              </div>
            </div>
            
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <PlusIcon className="h-5 w-5" />
              <span>New Booking</span>
            </button>
          </div>
        </div>
        
        {/* Date Navigation */}
        <div className="px-6 pb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900 min-w-[280px] text-center">
              {formatDate(currentDate)}
            </h2>
            
            <button
              onClick={goToNextDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            
            <button
              onClick={goToToday}
              className="ml-4 px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
            >
              Today
            </button>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="h-4 w-4 mr-1" />
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Time
                  </th>
                  {barbers.map(barber => (
                    <th key={barber.id} className="px-4 py-3 text-left text-sm font-medium text-gray-900 min-w-[200px]">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: barber.color }}
                        />
                        <span>{barber.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeSlots.map((time, idx) => (
                  <tr key={time} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2 text-sm text-gray-500 font-medium">
                      {time}
                    </td>
                    {barbers.map(barber => {
                      const appointment = getAppointment(time, barber.id)
                      return (
                        <td key={barber.id} className="px-2 py-1 relative h-16">
                          {appointment && (
                            <div
                              className="absolute inset-x-2 inset-y-1 rounded-lg p-2 text-white text-sm cursor-pointer hover:shadow-lg transition-shadow"
                              style={{ 
                                backgroundColor: appointment.color,
                                opacity: 0.9
                              }}
                            >
                              <div className="font-semibold truncate">{appointment.clientName}</div>
                              <div className="text-xs opacity-90">{appointment.service}</div>
                              <div className="text-xs mt-1 flex justify-between">
                                <span>{appointment.duration}min</span>
                                <span className="font-bold">${appointment.price}</span>
                              </div>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${appointments.reduce((sum, apt) => sum + apt.price, 0)}
                </p>
              </div>
              <div className="h-8 w-8 text-green-500 opacity-50 font-bold text-2xl">$</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Barbers</p>
                <p className="text-2xl font-bold text-gray-900">{barbers.length}</p>
              </div>
              <UserIcon className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Booking Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${Math.round(appointments.reduce((sum, apt) => sum + apt.price, 0) / appointments.length)}
                </p>
              </div>
              <div className="h-8 w-8 text-amber-500 opacity-50">📊</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}