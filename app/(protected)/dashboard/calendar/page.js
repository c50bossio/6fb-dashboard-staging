'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { toast } from 'sonner'

// Use the existing working EnhancedProfessionalCalendar component
const EnhancedProfessionalCalendar = dynamic(
  () => import('@/components/calendar/EnhancedProfessionalCalendar'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading Calendar...</p>
        </div>
      </div>
    )
  }
)

// Import appointment modals
const AppointmentBookingModal = dynamic(
  () => import('@/components/calendar/AppointmentBookingModal'),
  {
    ssr: false,
    loading: () => null
  }
)

// Import the industry-standard appointment detail modal
const AppointmentDetailModal = dynamic(
  () => import('@/components/calendar/AppointmentDetailModal'),
  {
    ssr: false,
    loading: () => null
  }
)

export default function CalendarPage() {
  const { profile } = useAuth()
  const { activeContext, currentLocationId } = useGlobalDashboard()

  // State management
  const [resources, setResources] = useState([])
  const [events, setEvents] = useState([])
  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [barbershopId, setBarbershopId] = useState(null)

  // Modal state management
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false) // NEW: Detail modal for viewing appointments
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false) // Renamed from isModalOpen
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null) // NEW: For detail modal
  const [editingAppointment, setEditingAppointment] = useState(null)

  // Drag & drop reschedule state
  const [isDragRescheduling, setIsDragRescheduling] = useState(false)
  const [pendingDropInfo, setPendingDropInfo] = useState(null)

  // Function to jump calendar to first appointment
  const jumpToFirstAppointment = useCallback(() => {
    if (events.length > 0 && window.fullCalendarApi) {
      const earliestDate = new Date(Math.min(...events.map(e => new Date(e.start))))
      window.fullCalendarApi.gotoDate(earliestDate)
      toast.success(`Jumped to ${earliestDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
    }
  }, [events])

  // Get barbershop ID from GlobalDashboardContext (respects sidebar selector) or profile
  useEffect(() => {
    // Priority: 1) currentLocationId from context, 2) activeContext.locationId, 3) profile.barbershop_id
    const locationId = currentLocationId || activeContext?.locationId || profile?.barbershop_id
    if (locationId) {
      console.log('📍 [CALENDAR] Setting barbershop ID to:', locationId, {
        source: currentLocationId ? 'currentLocationId' : activeContext?.locationId ? 'activeContext' : 'profile',
        currentLocationId,
        activeContextLocationId: activeContext?.locationId,
        profileBarbershopId: profile?.barbershop_id
      })
      setBarbershopId(locationId)
    }
  }, [currentLocationId, activeContext, profile])

  // Load calendar data when barbershop ID is available
  useEffect(() => {
    if (barbershopId) {
      loadCalendarData()
    }
  }, [barbershopId])

  // Load all calendar data (resources, events, services)
  const loadCalendarData = async () => {
    if (!barbershopId) {
      setError('No barbershop configured')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Calculate date range for appointments (±1 month from today for better performance)
      const today = new Date()
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString()
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString()

      // Load resources (barbers/staff) in parallel with appointments and services
      // IMPORTANT: Pass barbershop_id explicitly to avoid tenant-resolver cache issues
      // IMPORTANT: Request high limit (1000) for appointments to show all on calendar (not paginated)
      // IMPORTANT: Filter by date range (±1 month) to only load relevant appointments
      const [resourcesRes, appointmentsRes, servicesRes] = await Promise.all([
        fetch(`/api/staff?format=resources&barbershop_id=${barbershopId}`),
        fetch(`/api/appointments?barbershop_id=${barbershopId}&limit=1000&start_date=${startDate}&end_date=${endDate}`),
        fetch(`/api/services?barbershop_id=${barbershopId}`)
      ])

      // Handle resources
      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json()
        setResources(resourcesData.resources || [])
      } else {
        console.error('Failed to load resources:', await resourcesRes.text())
        toast.error('Failed to load staff members')
      }

      // Handle appointments
      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json()
        const formattedEvents = formatAppointmentsAsEvents(appointmentsData.data || [])
        setEvents(formattedEvents)
      } else {
        console.error('Failed to load appointments:', await appointmentsRes.text())
        toast.error('Failed to load appointments')
      }

      // Handle services
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json()
        setServices(servicesData.services || [])
      } else {
        console.error('Failed to load services:', await servicesRes.text())
      }

    } catch (err) {
      console.error('Error loading calendar data:', err)
      setError('Failed to load calendar data')
      toast.error('Failed to load calendar data')
    } finally {
      setIsLoading(false)
    }
  }

  // Format appointments data for FullCalendar
  const formatAppointmentsAsEvents = (appointments) => {
    return appointments.map(appointment => {
      const start = new Date(appointment.scheduled_at)
      const end = new Date(start.getTime() + (appointment.duration_minutes || 30) * 60000)

      return {
        id: appointment.id,
        title: `${appointment.client_name || 'Walk-in'} - ${appointment.service?.name || 'Service'}`,
        start: start.toISOString(),
        end: end.toISOString(),
        resourceId: appointment.barber_id,
        backgroundColor: appointment.status?.toUpperCase() === 'COMPLETED' ? '#10b981' :
          appointment.status?.toUpperCase() === 'CANCELLED' ? '#ef4444' :
            appointment.status?.toUpperCase() === 'CONFIRMED' ? '#3b82f6' : '#f59e0b',
        borderColor: appointment.status?.toUpperCase() === 'COMPLETED' ? '#059669' :
          appointment.status?.toUpperCase() === 'CANCELLED' ? '#dc2626' :
            appointment.status?.toUpperCase() === 'CONFIRMED' ? '#2563eb' : '#d97706',
        extendedProps: {
          appointment_id: appointment.id,
          client_id: appointment.client_id,
          client_name: appointment.client_name,
          client_phone: appointment.client_phone,
          client_email: appointment.client_email,
          barber_id: appointment.barber_id,
          barber_name: appointment.barber?.full_name,
          service_id: appointment.service_id,
          service_name: appointment.service?.name,
          service_price: appointment.service_price,
          duration_minutes: appointment.duration_minutes,
          status: appointment.status,
          notes: appointment.notes
        }
      }
    })
  }

  // Handle slot click (for new appointments) - Opens booking modal directly
  const handleSlotClick = useCallback((slotInfo) => {
    console.log('📅 [PAGE] handleSlotClick called with:', slotInfo)
    setSelectedSlot(slotInfo)
    setEditingAppointment(null)
    setIsBookingModalOpen(true) // Open booking modal for new appointments
  }, [])

  // Handle event click (for existing appointments) - Opens detail modal first
  const handleEventClick = useCallback((clickInfo) => {
    console.log('📅 [PAGE] Event clicked:', clickInfo.event)
    const appointment = clickInfo.event

    // Show detail modal for existing appointments (industry standard)
    setSelectedAppointment(appointment)
    setIsDetailModalOpen(true)
  }, [])

  // Handle edit from detail modal - Opens booking modal
  const handleEditFromDetail = useCallback((appointment) => {
    console.log('📅 [PAGE] Edit clicked from detail modal')

    // Close detail modal
    setIsDetailModalOpen(false)

    // Set up slot info from the appointment
    setSelectedSlot({
      start: appointment.start,
      end: appointment.end,
      resourceId: appointment.extendedProps?.barber_id
    })

    // Open booking modal for editing
    setEditingAppointment(appointment)
    setIsBookingModalOpen(true)
  }, [])

  // Handle reschedule from detail modal - Opens booking modal
  const handleRescheduleFromDetail = useCallback((appointment) => {
    console.log('📅 [PAGE] Reschedule clicked from detail modal')

    // Close detail modal
    setIsDetailModalOpen(false)

    // Set up slot info from the appointment (keeping current time initially)
    setSelectedSlot({
      start: appointment.start,
      end: appointment.end,
      resourceId: appointment.extendedProps?.barber_id
    })

    // Mark as rescheduling mode
    setIsDragRescheduling(true)

    // Open booking modal for rescheduling
    setEditingAppointment(appointment)
    setIsBookingModalOpen(true)
  }, [])

  // Handle event drop (reschedule) - Show confirmation modal instead of immediate save
  const handleEventDrop = useCallback(async (dropInfo) => {
    console.log('Event dropped:', dropInfo)

    // ⚠️ IMPORTANT: Revert the visual change immediately
    // We'll show a modal for confirmation instead of auto-saving
    dropInfo.revert()

    // Extract appointment data from the dropped event
    const appointment = dropInfo.event
    const newStart = dropInfo.event.start
    const newResourceId = dropInfo.newResource?.id || appointment.extendedProps?.barber_id

    console.log('Opening reschedule modal with new time:', newStart)

    // Set up the appointment for editing with the new time
    setSelectedSlot({
      start: newStart,
      end: new Date(newStart.getTime() + (appointment.extendedProps?.duration_minutes || 60) * 60000),
      resourceId: newResourceId
    })

    // Mark this as a drag reschedule operation
    setIsDragRescheduling(true)

    // Store the pending drop info for later use
    setPendingDropInfo({
      originalStart: dropInfo.oldEvent.start,
      newStart: newStart,
      originalBarber: dropInfo.oldResource?.id || appointment.extendedProps?.barber_id,
      newBarber: newResourceId
    })

    // Pass the event object for editing
    setEditingAppointment(appointment)

    // Open the booking modal for drag-drop confirmation
    setIsBookingModalOpen(true)
  }, [barbershopId])

  // Handle booking complete (refresh calendar)
  const handleBookingComplete = useCallback(async () => {
    console.log('Booking completed, refreshing calendar...')

    // Show success message based on operation type
    if (isDragRescheduling) {
      toast.success('Appointment rescheduled successfully')
    }

    await loadCalendarData()

    // Close both modals
    setIsBookingModalOpen(false)
    setIsDetailModalOpen(false)
    setSelectedSlot(null)
    setEditingAppointment(null)
    setSelectedAppointment(null)

    // Reset drag reschedule state
    setIsDragRescheduling(false)
    setPendingDropInfo(null)
  }, [barbershopId, isDragRescheduling])

  // Show error state if needed
  if (error && !isLoading) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <svg className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Unable to Load Calendar
          </h3>
          <p className="text-red-700 dark:text-red-300 mb-4">
            {error}
          </p>
          <button
            onClick={loadCalendarData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        {/* Calendar Header - Solid brand colors */}
        <div className="mb-6 bg-olive-600 rounded-xl p-6 text-white shadow-md border border-olive-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                Appointment Calendar
              </h1>
              <p className="text-white/90 text-sm lg:text-base">
                Manage your barbershop appointments with drag-and-drop scheduling
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:gap-4">
              {/* Quick Stats - Gold accent borders */}
              <div className="bg-white/15 backdrop-blur-sm px-5 py-3 rounded-lg text-center border-2 border-brand-600/40 hover:bg-white/20 hover:border-brand-500/60 transition-all min-w-[120px] shadow-sm">
                <div className="text-2xl lg:text-3xl font-bold tracking-tight text-brand-100">{events.length}</div>
                <div className="text-sm text-white/85 font-medium mt-0.5">Appointments</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm px-5 py-3 rounded-lg text-center border-2 border-brand-600/40 hover:bg-white/20 hover:border-brand-500/60 transition-all min-w-[120px] shadow-sm">
                <div className="text-2xl lg:text-3xl font-bold tracking-tight text-brand-100">{resources.length}</div>
                <div className="text-sm text-white/85 font-medium mt-0.5">Barbers</div>
              </div>
              {/* Jump to First Appointment Button - Only show when appointments exist */}
              {events.length > 0 && (
                <button
                  onClick={jumpToFirstAppointment}
                  className="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 border-2 border-brand-400 hover:border-brand-300 px-4 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 group ring-2 ring-brand-300/50"
                  title="Navigate to first appointment"
                >
                  <svg className="h-5 w-5 text-white group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="text-sm font-semibold text-white hidden sm:inline">
                    Jump to First
                  </span>
                </button>
              )}
              <button
                onClick={loadCalendarData}
                disabled={isLoading}
                className="bg-white/15 hover:bg-brand-500/30 active:bg-brand-600/40 border-2 border-brand-600/40 hover:border-brand-500/60 px-5 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm min-w-[56px] flex items-center justify-center group"
                aria-label="Refresh calendar data"
              >
                <svg className={`h-6 w-6 text-white group-hover:text-brand-200 transition-colors ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Component with Loading State */}
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 h-[700px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-brand-600 dark:border-t-brand-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 bg-brand-600 dark:bg-brand-500 rounded-full opacity-20"></div>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-semibold text-base">Loading Calendar...</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">Please wait while we fetch your appointments</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
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
        )}

        {/* Industry-Standard Appointment Detail Modal (View & Quick Actions) */}
        <AppointmentDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedAppointment(null)
          }}
          appointment={selectedAppointment}
          onEdit={handleEditFromDetail}
          onReschedule={handleRescheduleFromDetail}
          onRefresh={loadCalendarData}
        />

        {/* Advanced Appointment Booking Modal (Create & Edit) */}
        <AppointmentBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false)
            setSelectedSlot(null)
            setEditingAppointment(null)
            // Reset drag reschedule state on cancel
            setIsDragRescheduling(false)
            setPendingDropInfo(null)
          }}
          onBookingComplete={handleBookingComplete}
          selectedSlot={selectedSlot}
          editingAppointment={editingAppointment}
          barbers={resources}
          services={services}
          barbershopId={barbershopId}
          isDragRescheduling={isDragRescheduling}
          pendingDropInfo={pendingDropInfo}
        />

        {/* Instructions Panel - Olive background with gold accents */}
        <div className="mt-6 bg-olive-50 dark:bg-olive-900/20 border-2 border-olive-200 dark:border-olive-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-olive-600 to-olive-700 dark:from-olive-500 dark:to-olive-600 rounded-lg flex items-center justify-center shadow-sm ring-2 ring-brand-500/30">
                <svg className="h-6 w-6 text-brand-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-olive-900 dark:text-olive-100 mb-3">
                How to Use the Calendar
              </h3>
              <ul className="text-sm text-olive-800 dark:text-olive-300 space-y-2.5">
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-brand-600 dark:text-brand-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="leading-relaxed">Click on time slots to create new appointments</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-brand-600 dark:text-brand-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="leading-relaxed">Click on existing appointments to view details and quick actions</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-brand-600 dark:text-brand-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="leading-relaxed">Drag and drop appointments to reschedule them</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-brand-600 dark:text-brand-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="leading-relaxed">Use the view buttons to switch between different calendar layouts</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}