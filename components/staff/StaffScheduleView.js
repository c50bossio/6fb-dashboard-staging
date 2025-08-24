'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import EnhancedProfessionalCalendar from '@/components/calendar/EnhancedProfessionalCalendar'
import { Card } from "@/components/ui/card"
import Button from '@/components/ui/Button'
import { 
  CalendarIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { formatTime } from '@/lib/utils'

export default function StaffScheduleView({ staff, onRefresh }) {
  const [resources, setResources] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('resourceTimeGridWeek')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)

  // Convert staff to calendar resources
  useEffect(() => {
    const calendarResources = staff.map(member => ({
      id: member.user_id,
      title: member.user?.full_name || member.user?.email || 'Staff Member',
      businessHours: [], // Will be populated from staff_schedules
      extendedProps: {
        role: member.role,
        isActive: member.is_active,
        staffId: member.id
      }
    }))
    setResources(calendarResources)
  }, [staff])

  // Load schedules and appointments
  const loadScheduleData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // Get barbershop ID from first staff member
      const barbershopId = staff[0]?.barbershop_id
      if (!barbershopId) return

      // Load staff schedules
      const { data: schedules } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)

      // Load time off requests
      const { data: timeOff } = await supabase
        .from('staff_time_off')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .in('status', ['approved', 'pending'])

      // Load appointments for the next 30 days
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString())

      // Convert to calendar events
      const calendarEvents = []

      // Add recurring schedules as background events
      if (schedules) {
        schedules.forEach(schedule => {
          const staffMember = staff.find(s => s.id === schedule.staff_id)
          if (staffMember) {
            // Create recurring background event for work hours
            calendarEvents.push({
              id: `schedule-${schedule.id}`,
              title: 'Available',
              resourceId: staffMember.user_id,
              startTime: schedule.start_time,
              endTime: schedule.end_time,
              daysOfWeek: [schedule.day_of_week],
              display: 'background',
              backgroundColor: '#e5f3e5',
              extendedProps: {
                type: 'schedule',
                isRecurring: true
              }
            })

            // Add break time if exists
            if (schedule.break_start && schedule.break_end) {
              calendarEvents.push({
                id: `break-${schedule.id}`,
                title: 'Break',
                resourceId: staffMember.user_id,
                startTime: schedule.break_start,
                endTime: schedule.break_end,
                daysOfWeek: [schedule.day_of_week],
                backgroundColor: '#fef3c7',
                borderColor: '#f59e0b',
                extendedProps: {
                  type: 'break',
                  isRecurring: true
                }
              })
            }
          }
        })
      }

      // Add time off events
      if (timeOff) {
        timeOff.forEach(request => {
          const staffMember = staff.find(s => s.id === request.staff_id)
          if (staffMember) {
            calendarEvents.push({
              id: `timeoff-${request.id}`,
              title: `Time Off: ${request.reason || request.type}`,
              resourceId: staffMember.user_id,
              start: request.start_date,
              end: request.end_date,
              allDay: true,
              backgroundColor: request.status === 'approved' ? '#fee2e2' : '#fef3c7',
              borderColor: request.status === 'approved' ? '#ef4444' : '#f59e0b',
              extendedProps: {
                type: 'timeoff',
                status: request.status
              }
            })
          }
        })
      }

      // Add appointment events
      if (appointments) {
        appointments.forEach(appointment => {
          if (appointment.barber_id) {
            calendarEvents.push({
              id: `appt-${appointment.id}`,
              title: appointment.customer_name || 'Appointment',
              resourceId: appointment.barber_id,
              start: appointment.appointment_date,
              end: appointment.appointment_end_date || 
                    new Date(new Date(appointment.appointment_date).getTime() + 60 * 60 * 1000).toISOString(),
              backgroundColor: getStatusColor(appointment.status),
              borderColor: getStatusBorderColor(appointment.status),
              extendedProps: {
                type: 'appointment',
                status: appointment.status,
                service: appointment.service_name,
                price: appointment.price
              }
            })
          }
        })
      }

      setEvents(calendarEvents)

    } catch (error) {
      console.error('Error loading schedule data:', error)
    } finally {
      setLoading(false)
    }
  }, [staff])

  useEffect(() => {
    if (staff.length > 0) {
      loadScheduleData()
    }
  }, [staff, loadScheduleData])

  // Helper functions for appointment status colors
  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return '#bbf7d0'
      case 'completed': return '#ddd6fe'
      case 'cancelled': return '#fecaca'
      case 'no_show': return '#fed7aa'
      default: return '#e5e7eb'
    }
  }

  const getStatusBorderColor = (status) => {
    switch(status) {
      case 'confirmed': return '#10b981'
      case 'completed': return '#8b5cf6'
      case 'cancelled': return '#ef4444'
      case 'no_show': return '#f97316'
      default: return '#6b7280'
    }
  }

  // Handle calendar slot click
  const handleSlotClick = (slotInfo) => {
    if (slotInfo.resourceId) {
      const staffMember = staff.find(s => s.user_id === slotInfo.resourceId)
      if (staffMember) {
        // Could open modal to add shift override or time off
        console.log('Staff slot clicked:', staffMember, slotInfo)
      }
    }
  }

  // Handle event click
  const handleEventClick = (eventInfo) => {
    const event = eventInfo.event
    if (event.extendedProps.type === 'appointment') {
      // Could open appointment details modal
      console.log('Appointment clicked:', event)
    } else if (event.extendedProps.type === 'timeoff') {
      // Could open time off approval modal
      console.log('Time off clicked:', event)
    }
  }

  // Summary stats
  const stats = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const todayEvents = events.filter(e => {
      if (e.start && e.start.includes(todayStr)) return true
      if (e.allDay && e.start <= todayStr && e.end >= todayStr) return true
      return false
    })

    const appointments = todayEvents.filter(e => e.extendedProps?.type === 'appointment')
    const timeOffToday = todayEvents.filter(e => e.extendedProps?.type === 'timeoff')
    
    return {
      staffWorking: staff.filter(s => s.is_active).length - timeOffToday.length,
      appointmentsToday: appointments.length,
      timeOffRequests: events.filter(e => e.extendedProps?.type === 'timeoff' && e.extendedProps?.status === 'pending').length,
      totalHoursToday: 0 // Could calculate from schedules
    }
  }, [staff, events])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Schedule Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Staff Working Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.staffWorking}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Appointments Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.appointmentsToday}</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Time Off</p>
              <p className="text-2xl font-bold text-gray-900">{stats.timeOffRequests}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setShowTimeOffModal(true)}
              className="w-full flex items-center justify-center"
              variant="secondary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Time Off
            </Button>
          </div>
        </Card>
      </div>

      {/* Calendar View */}
      <Card className="p-6">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Staff Schedule</h3>
          <div className="flex space-x-2">
            <Button
              onClick={() => setCurrentView('resourceTimeGridDay')}
              variant={currentView === 'resourceTimeGridDay' ? 'primary' : 'secondary'}
              size="sm"
            >
              Day
            </Button>
            <Button
              onClick={() => setCurrentView('resourceTimeGridWeek')}
              variant={currentView === 'resourceTimeGridWeek' ? 'primary' : 'secondary'}
              size="sm"
            >
              Week
            </Button>
            <Button
              onClick={() => setCurrentView('dayGridMonth')}
              variant={currentView === 'dayGridMonth' ? 'primary' : 'secondary'}
              size="sm"
            >
              Month
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-200 border border-green-500 rounded mr-2"></div>
            <span className="text-gray-600">Confirmed</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-200 border border-purple-500 rounded mr-2"></div>
            <span className="text-gray-600">Completed</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-500 rounded mr-2"></div>
            <span className="text-gray-600">Break</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-500 rounded mr-2"></div>
            <span className="text-gray-600">Time Off</span>
          </div>
        </div>

        {/* Calendar Component */}
        <EnhancedProfessionalCalendar
          resources={resources}
          events={events}
          currentView={currentView}
          onViewChange={setCurrentView}
          onSlotClick={handleSlotClick}
          onEventClick={handleEventClick}
          height="600px"
          defaultView="resourceTimeGridWeek"
        />
      </Card>

      {/* Quick Actions */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Click on any time slot to add shifts or manage schedules
          </p>
          <Button onClick={onRefresh} variant="secondary" size="sm">
            Refresh Schedule
          </Button>
        </div>
      </Card>
    </div>
  )
}