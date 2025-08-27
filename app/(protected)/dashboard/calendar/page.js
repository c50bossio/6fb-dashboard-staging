'use client'

import { 
  CalendarIcon, 
  PlusCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClockIcon,
  QrCodeIcon,
  LinkIcon,
  ShareIcon,
  ClipboardIcon,
  CheckIcon,
  MapPinIcon,
  UserIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import QRCode from 'qrcode'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import AutoRefreshComponent from '../../../../components/calendar/AutoRefreshComponent'
import CalendarFilters from '../../../../components/calendar/CalendarFilters'
import CalendarViewSelector from '../../../../components/calendar/CalendarViewSelector'
import EmptyBarberState from '../../../../components/calendar/EmptyBarberState'
import RealtimeIndicator from '../../../../components/calendar/RealtimeIndicator'
import RealtimeStatusIndicator from '../../../../components/calendar/RealtimeStatusIndicator'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { useToast } from '../../../../components/ToastContainer'
import { useGlobalDashboard } from '../../../../contexts/GlobalDashboardContext'
import { useRealtimeAppointmentsSimple as useRealtimeAppointments } from '../../../../hooks/useRealtimeAppointmentsSimple' // Simplified version
import { 
  DEFAULT_RESOURCES, 
  EMPTY_BARBER_PLACEHOLDER,
  DEFAULT_SERVICES, 
  fetchRealEvents,
  fetchRecurringEvents,
  formatAppointment,
  exportToCSV 
} from '../../../../lib/calendar-data'
import unifiedStaffService from '../../../../lib/unified-staff-service'
import { FULLCALENDAR_VIEW_MAP } from '../../../../lib/calendar-permissions'
import { getOrAssignShopId } from '../../../../lib/ensure-user-shop'

const ProfessionalCalendar = dynamic(
  () => import('../../../../components/calendar/EnhancedProfessionalCalendar'), // Enhanced version with multiple views
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

import '../../../../styles/professional-calendar.css'
import '../../../../styles/cancelled-appointments.css'

const AppointmentBookingModal = dynamic(
  () => import('../../../../components/calendar/AppointmentBookingModal'),
  { ssr: false }
)

const RescheduleConfirmationModal = dynamic(
  () => import('../../../../components/calendar/RescheduleConfirmationModal'),
  { ssr: false }
)

const BookingConfirmationModal = dynamic(
  () => import('../../../../components/calendar/BookingConfirmationModal'),
  { ssr: false }
)

const CancelConfirmationModal = dynamic(
  () => import('../../../../components/calendar/CancelConfirmationModal'),
  { ssr: false }
)

export default function CalendarPage() {
  // Get auth context
  const { user, profile, loading } = useAuth()
  
  // Get global dashboard context
  const {
    selectedLocations: globalSelectedLocations,
    selectedBarbers: globalSelectedBarbers,
    availableLocations,
    availableBarbers: globalAvailableBarbers,
    permissions,
    isMultiLocation,
    viewMode
  } = useGlobalDashboard()
  
  const [mounted, setMounted] = useState(false)
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [currentCalendarView, setCurrentCalendarView] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('calendarView') || 'resourceTimeGridDay'
    }
    return 'resourceTimeGridDay'
  })
  const [selectedResource, setSelectedResource] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState({})
  const [quickLinks, setQuickLinks] = useState([])
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const { success, error: showError, info } = useToast()
  
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [pendingReschedule, setPendingReschedule] = useState(null)
  const [confirmedAppointment, setConfirmedAppointment] = useState(null)
  const [appointmentToCancel, setAppointmentToCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [services, setServices] = useState([])
  const [barbershopId, setBarbershopId] = useState(null) // Dynamic shop ID from user context
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBarber, setFilterBarber] = useState('all')
  const [filterService, setFilterService] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterLocation, setFilterLocation] = useState('all')
  
  // New state for dynamic calendar views
  const [selectedView, setSelectedView] = useState('personal')
  const [selectedLocations, setSelectedLocations] = useState([])
  const [selectedBarbers, setSelectedBarbers] = useState([])
  const [userLocations, setUserLocations] = useState([])
  const [availableBarbers, setAvailableBarbers] = useState([])
  const [advancedFilters, setAdvancedFilters] = useState({
    status: 'all',
    serviceCategories: [],
    priceRange: { min: null, max: null },
    timeRange: { start: null, end: null },
    customerType: 'all',
    recurring: null
  })
  
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  
  const [appointmentIds, setAppointmentIds] = useState(() => new Set())
  
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [realtimeError, setRealtimeError] = useState(null)
  const [calendarFilters, setCalendarFilters] = useState({})

  const { 
    appointments: realtimeAppointments, 
    loading: realtimeLoading, 
    error: realtimeErrorMsg,
    isConnected: realtimeHookConnected,
    lastUpdate,
    stats: realtimeStats,
    refresh: refreshAppointments,
    log: websocketLog
  } = useRealtimeAppointments(barbershopId)
  
  const diagnostics = useMemo(() => ({
    subscriptionStatus: realtimeHookConnected ? 'connected' : 'disconnected',
    channelStatus: realtimeHookConnected ? 'SUBSCRIBED' : 'CLOSED',
    eventCounts: realtimeStats || { INSERT: 0, UPDATE: 0, DELETE: 0 },
    connectionTime: null,
    errorHistory: realtimeErrorMsg ? [{ error: realtimeErrorMsg, timestamp: new Date().toISOString() }] : [],
    subscriptionStatusHistory: [],
    connected: realtimeStats?.connected || false
  }), [realtimeHookConnected, realtimeStats, realtimeErrorMsg])
  
  const connectionAttempts = 1 // V2 always connects on first attempt

  const handleViewChange = useCallback((newView) => {
    
    setSelectedView(newView)
    
    // Map the logical view to FullCalendar view
    const fullCalendarView = FULLCALENDAR_VIEW_MAP[newView] || newView
    setCurrentCalendarView(fullCalendarView)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarView', fullCalendarView)
      localStorage.setItem('selectedView', newView)
    }
    
    // Data will be loaded automatically by FullCalendar.io event sources when view changes
    // // Debug log removed for production
}, [])
  
  const handleLocationChange = useCallback((locationIds) => {
    // // Debug log removed for production
setSelectedLocations(locationIds)
    // FullCalendar event sources will automatically update when dependencies change
  }, [])
  
  const handleBarbersChange = useCallback((barberIds) => {
    
    setSelectedBarbers(barberIds)
  }, [])
  
  const handleFiltersChange = useCallback((filters) => {
    
    setAdvancedFilters(filters)
    setCalendarFilters(filters) // Keep for backward compatibility
    applyFiltersToEvents(filters)
  }, [])

  useEffect(() => {
    setMounted(true)
    
    // Get or assign shop ID for the user
    const setupShopId = async () => {
      const shopId = await getOrAssignShopId(user, profile)
      setBarbershopId(shopId)
      
    }
    setupShopId()
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('componentDebugAfter', JSON.stringify({
        hookReturned: true,
        hasAppointments: !!realtimeAppointments,
        appointmentCount: realtimeAppointments?.length || 0,
        loading: realtimeLoading,
        error: realtimeErrorMsg,
        isConnected: realtimeHookConnected,
        timestamp: new Date().toISOString()
      }))
    }
    
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    
    updateTime() // Set initial time
    const timeInterval = setInterval(updateTime, 1000)
    
    // Don't set default resources immediately - let loadCalendarData handle it
    setServices(DEFAULT_SERVICES)
    
    return () => clearInterval(timeInterval)
  }, [user, profile])
  
  // Load calendar data when barbershopId is available or global selections change
  useEffect(() => {
    if (globalSelectedLocations.length > 0) {
      // Use global context selections AND load staff resources
      setSelectedLocations(globalSelectedLocations)
      // // Debug log removed for production
// Still need to load calendar data (staff resources) for the selected location
      loadCalendarData()
    } else if (barbershopId) {
      // Fallback to barbershopId if no global selections
      loadCalendarData()
    }
  }, [barbershopId, globalSelectedLocations, globalSelectedBarbers])
  
  const loadCalendarData = async () => {
    if (!barbershopId) {
      console.warn('No barbershop ID available for loading calendar data')
      return
    }
    
    try {
      // Load barbers using unified staff service and regular services
      // Use the selected location from global context or fall back to the real Tomb45 ID
      const locationId = globalSelectedLocations?.[0] || barbershopId || '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'
      // // Debug log removed for production
const [staffResponse, servicesData] = await Promise.all([
        unifiedStaffService.getStaff(locationId, { 
          useCache: true, 
          includeAvailability: false,
          includeServices: false,
          forceRefresh: false
        }),
        fetchServices()
      ])

      // // Debug log removed for production
// Unified staff service returns data directly, not wrapped in success
      if (staffResponse?.staff && staffResponse.staff.length > 0) {
        // Transform staff data to calendar resource format
        const barbersData = staffResponse.staff.map(staff => ({
          id: staff.user_id || staff.id,
          title: staff.display_name || staff.name || staff.full_name || 'Barber',
          eventColor: staff.calendar_color || '#546355',
          extendedProps: {
            email: staff.email,
            phone: staff.phone,
            specialties: staff.specialties || [],
            isActive: staff.is_active !== false,
            isRealData: true
          }
        }))
        
        // // Debug log removed for production
setResources(barbersData)
        generateQuickLinks(barbersData)
        
        // Remove invalid onStaffUpdate handler (doesn't exist)
      } else {
        console.warn('📅 No staff found, showing empty state')
        setResources(EMPTY_BARBER_PLACEHOLDER)
      }
    } catch (error) {
      console.error('Error loading calendar data:', error)
      setResources(EMPTY_BARBER_PLACEHOLDER)
    }
  }
  
  // Create FullCalendar.io event sources following best practices
  const createEventSources = useMemo(() => {
    const eventSources = []
    
    if (selectedView === 'all-locations' || selectedView === 'consolidated') {
      // Multi-location view with proper FullCalendar event source pattern
      if (selectedLocations && selectedLocations.length > 0) {
        eventSources.push({
          url: '/api/calendar/events',
          method: 'GET',
          extraParams: function() {
            return {
              location_ids: selectedLocations.join(','),
              // FullCalendar automatically adds start, end, timeZone parameters
            }
          },
          success: function(events) {
            // // Debug log removed for production
return events
          },
          failure: function(error) {
            console.error('Multi-location event source failed:', error)
            
            // Production-ready error classification
            let userMessage = 'Failed to load calendar events. Please refresh the page.'
            let duration = 5000
            
            if (error.response?.status === 401) {
              userMessage = 'Your session has expired. Please log in again.'
              duration = 10000
            } else if (error.response?.status === 403) {
              userMessage = 'You do not have permission to view these calendar events.'
              duration = 8000
            } else if (error.response?.status === 429) {
              userMessage = 'Too many requests. Please wait a moment and try again.'
              duration = 6000
            } else if (error.response?.status >= 500) {
              userMessage = 'Server is temporarily unavailable. Please try again in a few moments.'
              duration = 8000
            } else if (error.message?.includes('Network Error')) {
              userMessage = 'Network connection issue. Please check your internet connection.'
              duration = 10000
            }
            
            showError(userMessage, {
              title: 'Calendar Error',
              duration,
              action: error.response?.status === 401 ? 'login' : 'retry'
            })
            return []
          }
        })
      }
    } else {
      // Single location view with proper FullCalendar event source pattern
      if (barbershopId) {
        eventSources.push({
          url: '/api/calendar/events', 
          method: 'GET',
          extraParams: function() {
            return {
              shop_id: barbershopId,
              // FullCalendar automatically adds start, end, timeZone parameters
            }
          },
          success: function(events) {
            // // Debug log removed for production
return events
          },
          failure: function(error) {
            console.error('Single-location event source failed:', error)
            
            // Production-ready error classification
            let userMessage = 'Failed to load calendar events. Please refresh the page.'
            let duration = 5000
            
            if (error.response?.status === 401) {
              userMessage = 'Your session has expired. Please log in again.'
              duration = 10000
            } else if (error.response?.status === 403) {
              userMessage = 'You do not have permission to view these calendar events.'
              duration = 8000
            } else if (error.response?.status === 429) {
              userMessage = 'Too many requests. Please wait a moment and try again.'
              duration = 6000
            } else if (error.response?.status >= 500) {
              userMessage = 'Server is temporarily unavailable. Please try again in a few moments.'
              duration = 8000
            } else if (error.message?.includes('Network Error')) {
              userMessage = 'Network connection issue. Please check your internet connection.'
              duration = 10000
            }
            
            showError(userMessage, {
              title: 'Calendar Error',
              duration,
              action: error.response?.status === 401 ? 'login' : 'retry'
            })
            return []
          }
        })
      }
    }
    
    return eventSources
  }, [selectedView, selectedLocations, barbershopId, showError])
  
  // Create FullCalendar.io resources following best practices  
  const createResources = useMemo(() => {
    if (selectedView === 'all-locations' || selectedView === 'consolidated') {
      // Multi-location resources
      if (globalAvailableBarbers.length > 0) {
        // Filter barbers for selected locations
        let barbersToShow = globalAvailableBarbers.filter(b => 
          selectedLocations.includes(b.barbershop_id)
        )
        
        // Further filter by selected barbers if any
        if (globalSelectedBarbers.length > 0) {
          barbersToShow = barbersToShow.filter(b => 
            globalSelectedBarbers.includes(b.id)
          )
        }
        
        // Transform to FullCalendar resource format
        return barbersToShow.map(barber => ({
          id: barber.id,
          title: barber.name,
          businessHours: {
            daysOfWeek: [1, 2, 3, 4, 5, 6],
            startTime: '09:00',
            endTime: '18:00'
          },
          extendedProps: {
            locationId: barber.barbershop_id,
            email: barber.email,
            phone: barber.phone,
            specialties: barber.specialties || [],
            isActive: barber.is_active !== false
          }
        }))
      }
    } else {
      // Single location resources
      return resources.map(resource => ({
        ...resource,
        businessHours: {
          daysOfWeek: [1, 2, 3, 4, 5, 6],
          startTime: '09:00',
          endTime: '18:00'
        }
      }))
    }
    
    return []
  }, [selectedView, selectedLocations, globalAvailableBarbers, globalSelectedBarbers, resources])
  
  // Apply filters to calendar events
  const applyFiltersToEvents = (filters) => {
    if (!filters || Object.keys(filters).length === 0) {
      // No filters, show all events
      return
    }
    
    // Filter events based on criteria
    const filteredEvents = events.filter(event => {
      // Service category filter
      if (filters.serviceCategories?.length > 0) {
        const category = event.extendedProps?.serviceCategory
        if (!filters.serviceCategories.includes(category)) return false
      }
      
      // Status filter
      if (filters.statuses?.length > 0) {
        const status = event.extendedProps?.status
        if (!filters.statuses.includes(status)) return false
      }
      
      // Price range filter
      if (filters.priceRange?.min || filters.priceRange?.max) {
        const price = event.extendedProps?.servicePrice || 0
        if (filters.priceRange.min && price < filters.priceRange.min) return false
        if (filters.priceRange.max && price > filters.priceRange.max) return false
      }
      
      // Recurring filter
      if (!filters.showRecurring && event.extendedProps?.isRecurring) {
        return false
      }
      
      // Walk-in filter
      if (!filters.showWalkIns && !event.extendedProps?.customerId) {
        return false
      }
      
      return true
    })

    // Note: We're not updating events state here to preserve the original data
    // The calendar component should handle the filtering display
  }
  
  const deduplicateAppointments = (appointments) => {
    const seen = new Map()
    const result = []
    
    const prioritized = [...appointments].sort((a, b) => {
      const aIsOptimistic = a.id?.toString().startsWith('temp-') || a.extendedProps?.isOptimistic
      const bIsOptimistic = b.id?.toString().startsWith('temp-') || b.extendedProps?.isOptimistic
      
      if (aIsOptimistic && !bIsOptimistic) return 1  // b comes first
      if (!aIsOptimistic && bIsOptimistic) return -1 // a comes first
      return 0 // same priority
    })
    
    for (const apt of prioritized) {
      if (!apt.id) continue // Skip invalid appointments
      
      const dedupKey = `${apt.start}-${apt.resourceId}-${apt.title?.replace(/^❌\s*/, '')}`
      
      const idKey = apt.id.toString()
      
      if (seen.has(idKey) || seen.has(dedupKey)) {
        continue
      }
      
      seen.set(idKey, true)
      seen.set(dedupKey, true)
      result.push(apt)
    }

    return result
  }

  useEffect(() => {
    console.log('Realtime debug:', {
      appointmentsCount: Array.isArray(realtimeAppointments) ? realtimeAppointments.length : 'not array',
      isConnected: realtimeHookConnected,
      lastUpdate: lastUpdate,
      timestamp: new Date().toISOString()
    })
    
    if (realtimeAppointments && Array.isArray(realtimeAppointments) && realtimeAppointments.length > 0) {
      // 🚨 CRITICAL FIX: Use WebSocket data directly instead of ignoring it

      const cancelledCount = realtimeAppointments.filter(apt => 
        apt.extendedProps?.status === 'cancelled' || apt.title?.startsWith('❌')
      ).length

      setEvents(realtimeAppointments)
      setRealtimeConnected(realtimeHookConnected)
      
      const newIds = new Set(realtimeAppointments.map(apt => apt.id))
      setAppointmentIds(newIds)
    } else if (!realtimeLoading && (!realtimeAppointments || realtimeAppointments.length === 0)) {
      // FullCalendar.io event sources will handle data fetching automatically
      // // Debug log removed for production
}
  }, [realtimeAppointments, realtimeHookConnected, lastUpdate]) // Removed .length to prevent infinite loops
  
  useEffect(() => {
    // FullCalendar.io event sources handle data fetching automatically
    // No manual API calls needed - event sources will refresh when dependencies change
    if (createEventSources.length === 0 && barbershopId) {
      console.log('No event sources created yet, barbershopId:', barbershopId)
    } else if (createEventSources.length > 0) {
      console.log(`Event sources created: ${createEventSources.length}`)
    }
  }, [createEventSources, barbershopId])
  
  useEffect(() => {
    if (resources.length > 0) {
      
    }
  }, [resources])

  // Auto-refresh handler for FullCalendar.io event sources
  const handleAutoRefresh = useCallback(() => {
    // FullCalendar.io will automatically refetch when event sources change
    // We can trigger a refetch by updating the dependency that eventSources depends on
    const timestamp = new Date().getTime()
    setLastUpdate(timestamp)
    console.log('Calendar refresh triggered:', new Date().toLocaleTimeString())
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/calendar/services')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Services API Error ${response.status}:`, errorText)
        
        if (response.status === 404) {
          // // Debug log removed for production
} else if (response.status === 500) {
          console.error('Services API server error - check backend logs')
        }
        
        setServices(DEFAULT_SERVICES)
        return
      }

      const result = await response.json()

      if (result.services?.length) {
        // // Debug log removed for production
setServices(result.services)
      } else {
        // // Debug log removed for production
setServices(DEFAULT_SERVICES)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error - check if backend is running')
      }
      setServices(DEFAULT_SERVICES)
    }
  }

  // Legacy fetchRealBarbers function removed - now handled by loadCalendarData()

  const generateQuickLinks = (barberResources) => {
    const baseUrl = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://6fb-ai.com'
    const QuickLinks = [
      {
        id: 'main-location',
        type: 'location',
        title: 'Main Barbershop',
        subtitle: 'Downtown Location',
        url: `${baseUrl}/book/location/main-downtown`,
        icon: BuildingStorefrontIcon,
        color: 'blue'
      },
      {
        id: 'north-location',
        type: 'location', 
        title: 'North Branch',
        subtitle: 'Uptown Location',
        url: `${baseUrl}/book/location/north-uptown`,
        icon: MapPinIcon,
        color: 'green'
      },
      ...(barberResources || resources).map(barber => ({
        id: barber.id,
        type: 'barber',
        title: barber.title,
        subtitle: 'Book directly',
        url: `${baseUrl}/book/${barber.id}`,
        icon: UserIcon,
        color: 'purple'
      }))
    ]
    
    setQuickLinks(QuickLinks)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareDropdownOpen && !event.target.closest('.share-dropdown')) {
        setShareDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [shareDropdownOpen])

  // Load user locations on mount
  useEffect(() => {
    const loadUserLocations = async () => {
      try {
        const response = await fetch('/api/calendar/user-locations', {
          credentials: 'same-origin'
        })
        if (response.ok) {
          const data = await response.json()
          setUserLocations(data.locations || [])
          
          // For single location users, auto-select their location
          if (data.locations?.length === 1) {
            setSelectedLocations([data.locations[0].id])
          }
        }
      } catch (error) {
        console.error('Error loading user locations:', error)
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('Network error loading locations')
        } else {
          console.error('Location API error:', error.message)
        }
        
        setUserLocations([])
      }
    }
    
    if (profile?.id) {
      loadUserLocations()
    }
  }, [profile?.id])

  const organizedLinks = useMemo(() => {
    const locations = quickLinks.filter(link => link.type === 'location')
    const barbers = quickLinks.filter(link => link.type === 'barber')
    return { locations, barbers }
  }, [quickLinks])

  const filteredEvents = useMemo(() => {
    // 🚨 CRITICAL FIX: Merge both events and appointments arrays
    const safeEvents = Array.isArray(events) ? events : []
    const safeRealtimeAppointments = Array.isArray(realtimeAppointments) ? realtimeAppointments : []
    const combinedEvents = [...safeEvents, ...safeRealtimeAppointments]
    const uniqueEvents = deduplicateAppointments(combinedEvents)

    let currentEvents = [...uniqueEvents]
    
    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      currentEvents = currentEvents.filter(event => 
        event.title?.toLowerCase().includes(searchLower) ||
        event.extendedProps?.customer?.toLowerCase().includes(searchLower) ||
        event.extendedProps?.service?.toLowerCase().includes(searchLower) ||
        event.extendedProps?.notes?.toLowerCase().includes(searchLower)
      )
    }
    
    // Apply location filter (from multi-select)
    if (selectedLocations.length > 0) {
      currentEvents = currentEvents.filter(event => 
        selectedLocations.includes(event.extendedProps?.barbershopId)
      )
    }
    
    // Apply barber filter (from multi-select)
    if (selectedBarbers.length > 0) {
      currentEvents = currentEvents.filter(event => 
        selectedBarbers.includes(event.resourceId) || 
        selectedBarbers.includes(event.extendedProps?.barberId)
      )
    }
    
    // Apply advanced filters
    if (advancedFilters.status && advancedFilters.status !== 'all') {
      currentEvents = currentEvents.filter(event => 
        event.extendedProps?.status === advancedFilters.status
      )
    }
    
    if (advancedFilters.serviceCategories?.length > 0) {
      currentEvents = currentEvents.filter(event => 
        advancedFilters.serviceCategories.includes(event.extendedProps?.serviceCategory)
      )
    }
    
    if (advancedFilters.priceRange?.min !== null || advancedFilters.priceRange?.max !== null) {
      currentEvents = currentEvents.filter(event => {
        const price = event.extendedProps?.servicePrice || 0
        const meetsMin = advancedFilters.priceRange.min === null || price >= advancedFilters.priceRange.min
        const meetsMax = advancedFilters.priceRange.max === null || price <= advancedFilters.priceRange.max
        return meetsMin && meetsMax
      })
    }
    
    if (advancedFilters.recurring !== null) {
      currentEvents = currentEvents.filter(event => 
        event.extendedProps?.isRecurring === advancedFilters.recurring
      )
    }
    
    const filteredResult = currentEvents
    
    return filteredResult
  }, [events, realtimeAppointments, searchTerm, selectedLocations, selectedBarbers, advancedFilters])
  
  // Filtering is now handled by createResources useMemo - no separate filteredResources needed
  
  useEffect(() => {
    if (filterLocation !== 'all' && filterBarber !== 'all') {
      const currentResources = createResources
      const isBarberInLocation = currentResources.some(resource => resource.id === filterBarber)
      if (!isBarberInLocation) {
        setFilterBarber('all')
      }
    }
  }, [filterLocation, filterBarber, createResources])
  
  const uniqueServices = useMemo(() => {
    const services = new Set()
    const safeEvents = Array.isArray(events) ? events : []
    safeEvents.forEach(event => {
      const service = event.extendedProps?.service || 
                     (event.title && event.title.includes(' - ') ? event.title.split(' - ')[1] : '') || ''
      if (service && service.trim()) services.add(service.trim())
    })
    return Array.from(services).sort()
  }, [events])

  const handleEventClick = useCallback((clickInfo) => {
    const event = clickInfo.event

    setSelectedEvent({
      id: event.id,
      title: event.title,
      scheduled_at: event.start,
      end_time: event.end,
      start: event.start, // Add start for delete handler
      barber_id: event.extendedProps.barber_id || event.resourceId, // Use extendedProps barber_id first, fallback to resourceId
      service_id: event.extendedProps.service_id || '',
      service: event.extendedProps.service,
      client_name: event.extendedProps.customer,
      client_phone: event.extendedProps.customerPhone || '',
      client_email: event.extendedProps.customerEmail || '',
      duration_minutes: event.extendedProps.duration || 30,
      service_price: event.extendedProps.price || 0,
      client_notes: event.extendedProps.notes || '',
      status: event.extendedProps.status || 'confirmed',
      isRecurring: event.extendedProps.isRecurring || false,
      extendedProps: event.extendedProps // Pass all extended props for delete handler
    })
    setShowAppointmentModal(true)
  }, [])

  const handleDateSelect = useCallback((selectInfo) => {

    const slotData = {
      start: selectInfo.start,
      end: selectInfo.end,
      barberId: selectInfo.barberId || selectInfo.resourceId || selectInfo.resource?.id,
      barberName: selectInfo.barberName || selectInfo.resource?.title || resources.find(r => r.id === (selectInfo.resourceId || selectInfo.barberId))?.title,
      viewType: selectInfo.viewType,
      allDay: selectInfo.allDay,
      duration: selectInfo.duration || 60,
      selectionType: selectInfo.selectionType
    }
    
    if (selectInfo.isMonthView) {
      slotData.needsTimePicker = true
      slotData.suggestedTime = selectInfo.suggestedTime || '09:00'
      slotData.selectedDate = selectInfo.selectedDate
      info(`Selected date: ${selectInfo.selectedDate}. Please choose a time.`)
    } else if (selectInfo.isListView) {
      slotData.nearbyEvents = selectInfo.nearbyEvents
      info('Smart booking mode - checking availability...')
    } else if (selectInfo.isTimeGrid && !selectInfo.resourceId) {
      if (selectInfo.suggestedBarber?.available) {
        slotData.barberId = selectInfo.suggestedBarber.id
        slotData.barberName = selectInfo.suggestedBarber.name
        info(`Auto-selected ${selectInfo.suggestedBarber.name} for this time slot`)
      } else {
        showError('No barbers available for this time slot')
        return
      }
    }
    
    if (selectInfo.exactTime) {
      slotData.displayTime = selectInfo.exactTime
    }
    
    setSelectedSlot(slotData)
    setShowAppointmentModal(true)
  }, [resources, info, showError])

  const handleRescheduleConfirm = async (rescheduleData) => {
    try {
      const response = await fetch('/api/calendar/appointments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: rescheduleData.appointmentId,
          start_time: rescheduleData.newTime.start,
          end_time: rescheduleData.newTime.end,
          barber_id: rescheduleData.newTime.barberId,
          notify_customer: rescheduleData.notifyCustomer,
          notification_methods: rescheduleData.notificationMethods,
          custom_message: rescheduleData.customMessage
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        const eventIndex = events.findIndex(e => e.id === rescheduleData.appointmentId)
        if (eventIndex !== -1) {
          const updatedEvents = [...events]
          updatedEvents[eventIndex] = {
            ...updatedEvents[eventIndex],
            start: rescheduleData.newTime.start,
            end: rescheduleData.newTime.end,
            resourceId: rescheduleData.newTime.barberId
          }
          setEvents(updatedEvents)
        }
        
        success('Appointment rescheduled successfully!', {
          title: 'Success',
          duration: 3000
        })
        
        if (rescheduleData.notifyCustomer) {
          info('Customer notification sent', {
            duration: 3000
          })
        }
        
      } else {
        showError(result.error || 'Failed to reschedule appointment', {
          title: 'Reschedule Failed',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error)
      showError('Failed to reschedule appointment', {
        title: 'Error',
        duration: 5000
      })
    } finally {
      setShowRescheduleModal(false)
      setPendingReschedule(null)
    }
  }

  const handleAppointmentSave = async (appointmentData) => {
    if (appointmentData?.isDeleted) {

      success('Appointment deleted successfully!', {
        title: 'Success',
        duration: 3000
      })
      setShowAppointmentModal(false)

      return
    }

    if (appointmentData?.isCancelled) {

      success('Appointment cancelled successfully!', {
        title: 'Success',
        duration: 3000
      })
      setShowAppointmentModal(false)
      
      return
    }

    if (appointmentData?.isUncancelled) {

      success('Appointment uncancelled successfully!', {
        title: 'Success',
        duration: 3000
      })
      setShowAppointmentModal(false)
      
      return
    }
    
    if (appointmentData?.id && appointmentData?.is_recurring) {

      setConfirmedAppointment(appointmentData)
      
      setShowAppointmentModal(false)
      setShowBookingConfirmation(true)
      
      return
    }
    
    let optimisticAppointment = null

    const scheduledDate = appointmentData.scheduled_at || appointmentData.start_time || appointmentData.start || appointmentData.dateTime
    if (!scheduledDate) {
      console.error('No valid date field found in appointment data:', appointmentData)
      showError('Invalid appointment date', {
        title: 'Booking Failed',
        duration: 3000
      })
      return
    }
    
    const startDate = new Date(scheduledDate)
    const durationMinutes = appointmentData.duration_minutes || 60
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    
    // // Debug log removed for production
,
      endTime: endDate.toLocaleTimeString()
    })
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date for optimistic appointment:', {
        scheduled_at: scheduledDate,
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        rawData: appointmentData
      })
    } else {
      const barberColor = resources.find(r => r.id === appointmentData.barber_id)?.eventColor || '#546355'
      
      optimisticAppointment = {
        id: `temp-${Date.now()}`, // Temporary ID
        title: `${appointmentData.client_name} - ${appointmentData.service_name || 'Unknown Service'}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        resourceId: appointmentData.barber_id,
        backgroundColor: `${barberColor}88`, // Add transparency (88 = ~53% opacity)
        borderColor: barberColor,
        classNames: ['optimistic-appointment'], // Add CSS class for additional styling
        extendedProps: {
          customer_name: appointmentData.client_name,
          customer_phone: appointmentData.client_phone,
          service_name: appointmentData.service_name || 'Unknown Service',
          status: 'booking', // Special status for optimistic update
          isOptimistic: true // Flag to identify optimistic appointments
        }
      }
      
      setEvents(prev => {
        const exists = prev.some(apt => apt.id === optimisticAppointment.id)
        if (exists) {
          
          return prev
        }
        
        return [...prev, optimisticAppointment]
      })
      info('Booking appointment...', {
        title: 'Processing',
        duration: 2000
      })
    }

    try {
      const response = await fetch('/api/calendar/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...appointmentData,
          shop_id: barbershopId, // Include shop ID
          customer_name: appointmentData.client_name,
          customer_email: appointmentData.client_email,
          customer_phone: appointmentData.client_phone
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setConfirmedAppointment(result.appointment || result)
        
        setShowAppointmentModal(false)
        setShowBookingConfirmation(true)
        
        if (optimisticAppointment && result.appointment) {
          setEvents(prev => {
            const withoutOptimistic = prev.filter(event => event.id !== optimisticAppointment.id)
            
            const realAppointment = {
              id: result.appointment.id,
              title: `${result.appointment.customer_name} - ${result.appointment.service_name}`,
              start: result.appointment.start_time,
              end: result.appointment.end_time,
              resourceId: result.appointment.barber_id,
              backgroundColor: resources.find(r => r.id === result.appointment.barber_id)?.eventColor || '#546355',
              borderColor: resources.find(r => r.id === result.appointment.barber_id)?.eventColor || '#546355',
              extendedProps: {
                customer_name: result.appointment.customer_name,
                customer_phone: result.appointment.customer_phone,
                service_name: result.appointment.service_name,
                status: result.appointment.status,
                isOptimistic: false // Real appointment
              }
            }

            const combined = [...withoutOptimistic, realAppointment]
            return deduplicateAppointments(combined)
          })
        } else {
          
        }
      } else {
        if (optimisticAppointment) {
          setEvents(prev => prev.filter(event => event.id !== optimisticAppointment.id))
          
        }
        
        showError(result.error || 'Failed to book appointment', {
          title: 'Booking Failed',
          duration: 5000
        })
      }
    } catch (error) {
      if (optimisticAppointment) {
        setEvents(prev => prev.filter(event => event.id !== optimisticAppointment.id))
        
      }
      
      showError('Failed to book appointment: ' + error.message, {
        title: 'Error',
        duration: 5000
      })
    }
  }

  const handleExportCSV = () => {
    try {
      const csv = exportToCSV(filteredEvents, resources)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calendar-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      success('Calendar exported to CSV successfully')
    } catch (error) {
      console.error('Export error:', error)
      showError('Failed to export calendar')
    }
  }
  
  const handleExportICS = () => {
    try {
      let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//BookedBarber//Calendar Export//EN\n'
      
      filteredEvents.forEach(event => {
        const start = new Date(event.start).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        const end = new Date(event.end || event.start).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        const created = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        
        icsContent += 'BEGIN:VEVENT\n'
        icsContent += `UID:${event.id}@bookedbarber.com\n`
        icsContent += `DTSTART:${start}\n`
        icsContent += `DTEND:${end}\n`
        icsContent += `SUMMARY:${event.title}\n`
        icsContent += `DESCRIPTION:${event.extendedProps?.notes || ''}\n`
        icsContent += `LOCATION:${event.extendedProps?.location || 'Barbershop'}\n`
        icsContent += `STATUS:${event.extendedProps?.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}\n`
        icsContent += `CREATED:${created}\n`
        icsContent += 'END:VEVENT\n'
      })
      
      icsContent += 'END:VCALENDAR'
      
      const blob = new Blob([icsContent], { type: 'text/calendar' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calendar-export-${new Date().toISOString().split('T')[0]}.ics`
      a.click()
      window.URL.revokeObjectURL(url)
      success('Calendar exported to iCal format successfully')
    } catch (error) {
      console.error('Export error:', error)
      showError('Failed to export calendar')
    }
  }

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return
    
    setCancelling(true)
    
    try {
      const response = await fetch(`/api/calendar/appointments?id=${appointmentToCancel.id}&soft_delete=true&reason=Customer%20Request`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (response.ok) {
        success('Appointment cancelled successfully', {
          title: 'Cancelled',
          duration: 3000
        })
        
        setShowCancelModal(false)
        setAppointmentToCancel(null)
        
      } else {
        showError(result.error || 'Failed to cancel appointment', {
          title: 'Error',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Cancel error:', error)
      showError('Failed to cancel appointment: ' + error.message, {
        title: 'Error',
        duration: 5000
      })
    } finally {
      setCancelling(false)
    }
  }

  const generateQRCode = useCallback(async (resource) => {
    setSelectedResource(resource)
    
    if (typeof window === 'undefined') return
    
    const baseUrl = window.location ? window.location.origin : 'https://6fb-ai.com'
    const bookingUrl = `${baseUrl}/book/${resource.id}?utm_source=qr&utm_medium=calendar&utm_campaign=booking`
    
    try {
      const qrDataUrl = await QRCode.toDataURL(bookingUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(qrDataUrl)
      setShowQRModal(true)
    } catch (error) {
      console.error('QR Code generation failed:', error)
    }
  }, [])

  const copyToClipboard = async (text, key) => {
    if (typeof window === 'undefined' || !navigator.clipboard) return
    
    try {
      await navigator.clipboard.writeText(text)
      setCopied({ ...copied, [key]: true })
      setTimeout(() => setCopied({ ...copied, [key]: false }), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadQRCode = () => {
    if (qrCodeUrl && selectedResource) {
      const link = document.createElement('a')
      link.download = `booking-qr-${selectedResource.title.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = qrCodeUrl
      link.click()
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  // Check if barbershop has no barbers (empty state)
  const hasEmptyBarbers = resources.length === 0 || 
    (resources.length === 1 && resources[0]?.extendedProps?.isEmpty)
  
  const shopName = profile?.shop_name || user?.user_metadata?.shop_name || 'your barbershop'

  const handleAddBarber = () => {

    // Use the existing global onboarding system
    // This will trigger the DashboardOnboarding component in the protected layout
    window.dispatchEvent(new CustomEvent('launchOnboarding', { 
      detail: { 
        from: 'calendar_empty_state',
        action: 'complete_setup',
        forced: true // Force show even if previously completed
      },
      bubbles: true
    }))
    
    // Set a flag in case the event listener hasn't mounted yet
    window.__pendingOnboardingLaunch = true
  }
  
  // Removed handleGoToOnboarding and handleProceedToAddBarber - no longer needed
  // The handleAddBarber function now directly triggers the onboarding flow

  // Show empty state if no barbers are configured
  if (hasEmptyBarbers && barbershopId) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CalendarIcon className="h-8 w-8 text-olive-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
                  <p className="text-gray-600">Set up your first barber to start accepting bookings</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="px-6 py-8">
          <EmptyBarberState 
            onAddBarber={handleAddBarber}
            shopName={shopName}
            onboardingIncomplete={!profile?.onboarding_completed || !barbershopId}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* WebSocket Debug Panel - Temporarily disabled due to logs error */}
      {/* <WebSocketDebugPanel /> */}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CalendarIcon className="h-8 w-8 text-olive-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Realtime Status Indicator */}
              <RealtimeStatusIndicator 
                isConnected={realtimeHookConnected}
                lastUpdate={lastUpdate}
                connectionAttempts={1}
                appointmentCount={events.length}
                eventCounts={realtimeStats ? {
                  INSERT: realtimeStats.inserts,
                  UPDATE: realtimeStats.updates,
                  DELETE: realtimeStats.deletes
                } : null}
                error={realtimeErrorMsg}
              />
              
              <button 
                onClick={() => {
                  setSelectedSlot(null)
                  setSelectedEvent(null)
                  setShowAppointmentModal(true)
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
              >
                <PlusCircleIcon className="h-5 w-5" />
                <span>New Appointment</span>
              </button>
              
              {/* Share Dropdown */}
              <div className="relative share-dropdown">
                <button 
                  onClick={() => setShareDropdownOpen(!shareDropdownOpen)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ShareIcon className="h-5 w-5" />
                  <span>Share</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </button>

                {/* Dropdown Menu */}
                {shareDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-screen sm:w-80 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    {/* Locations Section */}
                    {organizedLinks.locations.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                          📍 LOCATIONS
                        </div>
                        {organizedLinks.locations.map((link) => {
                          const IconComponent = link.icon
                          return (
                            <div key={link.id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50 border-b border-gray-100">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-olive-100 rounded-lg flex items-center justify-center">
                                  <IconComponent className="h-4 w-4 text-olive-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{link.title}</div>
                                  <div className="text-xs text-gray-500">{link.subtitle}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => generateQRCode({ id: link.id, title: link.title, url: link.url })}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Generate QR Code"
                                >
                                  <QrCodeIcon className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(link.url, link.id)}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Copy Link"
                                >
                                  {copied[link.id] ? (
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ClipboardIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Barbers Section */}
                    {organizedLinks.barbers.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                          👤 BARBERS
                        </div>
                        {organizedLinks.barbers.map((link) => {
                          const IconComponent = link.icon
                          return (
                            <div key={link.id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-gold-100 rounded-lg flex items-center justify-center">
                                  <IconComponent className="h-4 w-4 text-gold-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{link.title}</div>
                                  <div className="text-xs text-gray-500">{link.subtitle}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => generateQRCode({ id: link.id, title: link.title, url: link.url })}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Generate QR Code"
                                >
                                  <QrCodeIcon className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(link.url, link.id)}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Copy Link"
                                >
                                  {copied[link.id] ? (
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ClipboardIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {mounted && (
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {currentTime}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Search and Filter Bar - Mobile Responsive */}
      <div className="bg-gray-50 border-b px-3 sm:px-6 py-3">
        {/* Mobile-First Layout: Stack on small screens, row on larger screens */}
        <div className="flex flex-col space-y-3 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-center">
          {/* Calendar View Selector - Dynamic based on permissions */}
          <div className="flex items-center space-x-3">
            <CalendarViewSelector
              currentView={selectedView}
              onViewChange={handleViewChange}
              userRole={profile?.role || 'CLIENT'}
              userLocations={userLocations}
              selectedLocations={selectedLocations}
              onLocationChange={handleLocationChange}
              selectedBarbers={selectedBarbers}
              onBarbersChange={handleBarbersChange}
              availableBarbers={availableBarbers}
            />
            
            {/* Advanced Filters */}
            <CalendarFilters
              filters={advancedFilters}
              onFiltersChange={handleFiltersChange}
              services={uniqueServices}
              serviceCategories={['Haircuts', 'Beard', 'Treatments', 'Color', 'Other']}
            />
          </div>
          
          {/* Search Input */}
          <div className="flex-1 lg:max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers, services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent text-base"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            {/* Clear All Filters */}
            {(searchTerm || selectedLocations.length > 0 || selectedBarbers.length > 0 || 
              Object.values(advancedFilters).some(v => v && v !== 'all' && (Array.isArray(v) ? v.length > 0 : true))) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedLocations([])
                  setSelectedBarbers([])
                  setAdvancedFilters({
                    status: 'all',
                    serviceCategories: [],
                    priceRange: { min: null, max: null },
                    timeRange: { start: null, end: null },
                    customerType: 'all',
                    recurring: null
                  })
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm flex items-center space-x-1"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Clear All</span>
              </button>
            )}
            
            {/* Export Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center space-x-1"
                title="Export to CSV"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">CSV</span>
              </button>
              
              <button
                onClick={handleExportICS}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-1"
                title="Export to iCal"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">iCal</span>
              </button>
            </div>
          </div>
          
          {/* Results Count */}
          <div className="text-sm text-gray-600 ml-auto">
            {filteredEvents.length !== events.length ? (
              <span>
                Showing <span className="font-semibold">{filteredEvents.length}</span> of {events.length} appointments
              </span>
            ) : (
              <span>
                <span className="font-semibold">{events.length}</span> appointments
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-lg shadow-lg p-4" style={{ minHeight: '700px' }}>
          <ProfessionalCalendar
            resources={currentCalendarView?.includes('resource') ? createResources : undefined} // Use production-ready resources for resource views
            eventSources={createEventSources} // Use FullCalendar.io native event sources with error handling
            currentView={currentCalendarView}
            onViewChange={(view) => setCurrentCalendarView(view)}
            onEventClick={handleEventClick}
            onSlotClick={handleDateSelect}
            onEventDrop={(dropInfo) => {

              const appointment = {
                id: dropInfo.event.id,
                title: dropInfo.event.title,
                start: dropInfo.oldEvent.start,
                end: dropInfo.oldEvent.end,
                resourceId: dropInfo.oldEvent.resourceId || dropInfo.oldResource?.id,
                extendedProps: dropInfo.event.extendedProps
              }
              
              const newSlot = {
                start: dropInfo.event.start,
                end: dropInfo.event.end,
                resourceId: dropInfo.event.resourceId || dropInfo.newResource?.id,
                barberName: dropInfo.newResource?.title || resources.find(r => r.id === dropInfo.event.resourceId)?.title
              }
              
              dropInfo.revert()
              
              setPendingReschedule({
                appointment,
                newSlot,
                dropInfo
              })
              setShowRescheduleModal(true)
            }}
            height="650px"
          />
        </div>

      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedResource ? `QR Code - ${selectedResource.title}` : 'Booking QR Codes'}
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {selectedResource && qrCodeUrl ? (
              <div className="text-center">
                <div className="mb-4 p-4 bg-gray-50 rounded-lg inline-block">
                  <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
                </div>
                
                <div className="space-y-3">
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Booking URL
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={selectedResource.url}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600"
                      />
                      <button
                        onClick={() => copyToClipboard(selectedResource.url, 'modal')}
                        className="px-3 py-2 bg-olive-600 text-white rounded-r-lg hover:bg-olive-700 flex items-center"
                      >
                        {copied.modal ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <ClipboardIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={downloadQRCode}
                      className="flex-1 px-4 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => window.open(selectedResource.url, '_blank')}
                      className="flex-1 px-4 py-2 bg-gold-700 text-white rounded-lg hover:bg-gold-700 flex items-center justify-center space-x-2"
                    >
                      <ShareIcon className="h-4 w-4" />
                      <span>Test Link</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 text-center mb-4">
                  Select a barber or location to generate a QR code:
                </p>
                
                <div className="grid grid-cols-1 gap-3">
                  {quickLinks.map((link) => {
                    const IconComponent = link.icon
                    return (
                      <button
                        key={link.id}
                        onClick={() => generateQRCode({ id: link.id, title: link.title, url: link.url })}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className={`h-8 w-8 bg-gradient-to-r ${link.color === 'blue' ? 'from-olive-500 to-olive-600' : link.color === 'green' ? 'from-green-500 to-green-600' : 'from-gold-500 to-gold-600'} rounded flex items-center justify-center`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{link.title}</div>
                          <div className="text-sm text-gray-500">{link.subtitle}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setAppointmentToCancel(null)
        }}
        onConfirm={handleCancelAppointment}
        appointment={appointmentToCancel}
        loading={cancelling}
      />

      {/* Appointment Booking Modal */}
      {showAppointmentModal && (
        <AppointmentBookingModal
          isOpen={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false)
            setSelectedSlot(null)
            setSelectedEvent(null)
          }}
          selectedSlot={selectedSlot}
          barbershopId={barbershopId}
          barbers={resources.map(r => ({ id: r.id, name: r.title }))}
          services={services}
          onBookingComplete={handleAppointmentSave}
          editingAppointment={selectedEvent}
        />
      )}
      
      {/* Reschedule Confirmation Modal */}
      {showRescheduleModal && pendingReschedule && (
        <RescheduleConfirmationModal
          isOpen={showRescheduleModal}
          onClose={() => {
            setShowRescheduleModal(false)
            setPendingReschedule(null)
          }}
          onConfirm={handleRescheduleConfirm}
          appointmentDetails={pendingReschedule.appointment}
          newTimeSlot={pendingReschedule.newSlot}
        />
      )}

      {/* Booking Confirmation Modal */}
      {showBookingConfirmation && confirmedAppointment && (
        <BookingConfirmationModal
          isOpen={showBookingConfirmation}
          onClose={() => {
            setShowBookingConfirmation(false)
            setConfirmedAppointment(null)
            setSelectedSlot(null)
            setSelectedEvent(null)
          }}
          appointmentData={confirmedAppointment}
          barberName={
            resources.find(r => 
              r.id === confirmedAppointment.barber_id || 
              r.id === confirmedAppointment.resource_id
            )?.title || 'Unknown Barber'
          }
          serviceName={
            services.find(s => 
              s.id === confirmedAppointment.service_id
            )?.name || confirmedAppointment.service_name || 'Unknown Service'
          }
        />
      )}
      
      {/* Developer Diagnostics Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-gray-900 text-white transition-transform duration-300 ${showDiagnostics ? 'transform translate-y-0' : 'transform translate-y-full'} z-40`}>
        <div className="px-6 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Real-time Diagnostics</h3>
          <button
            onClick={() => setShowDiagnostics(false)}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 py-4 max-h-60 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Connection Status */}
            <div className="bg-gray-800 rounded p-3">
              <div className="font-semibold text-olive-400 mb-2">Connection Status</div>
              <div className={`text-${realtimeHookConnected ? 'green' : 'red'}-400 font-mono`}>
                {diagnostics.subscriptionStatus || 'unknown'}
              </div>
              <div className="text-gray-400 mt-1">
                Attempts: {connectionAttempts}
              </div>
              <div className="text-gray-400">
                Channel: {diagnostics.channelStatus || 'unknown'}
              </div>
            </div>

            {/* Event Counts */}
            <div className="bg-gray-800 rounded p-3">
              <div className="font-semibold text-green-400 mb-2">Event Counts</div>
              <div className="space-y-1 font-mono">
                <div>INSERT: {diagnostics.eventCounts?.INSERT || 0}</div>
                <div>UPDATE: {diagnostics.eventCounts?.UPDATE || 0}</div>
                <div>DELETE: {diagnostics.eventCounts?.DELETE || 0}</div>
              </div>
            </div>

            {/* Timing Info */}
            <div className="bg-gray-800 rounded p-3">
              <div className="font-semibold text-yellow-400 mb-2">Timing</div>
              <div className="text-gray-300 text-xs">
                <div>Last Update:</div>
                <div className="font-mono">
                  {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'None'}
                </div>
                <div className="mt-1">Connection Time:</div>
                <div className="font-mono">
                  {diagnostics.connectionTime ? `${diagnostics.connectionTime}ms` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Data Status */}
            <div className="bg-gray-800 rounded p-3">
              <div className="font-semibold text-gold-400 mb-2">Data Status</div>
              <div className="space-y-1">
                <div>Appointments: {realtimeAppointments?.length || 0}</div>
                <div>Filtered: {filteredEvents?.length || 0}</div>
                <div>Loading: {realtimeLoading ? 'Yes' : 'No'}</div>
                <div className={`text-${realtimeErrorMsg ? 'red' : 'green'}-400`}>
                  Status: {realtimeErrorMsg ? 'Error' : 'OK'}
                </div>
              </div>
            </div>

            {/* Error History */}
            {diagnostics.errorHistory?.length > 0 && (
              <div className="bg-gray-800 rounded p-3 md:col-span-2">
                <div className="font-semibold text-red-400 mb-2">Recent Errors</div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {diagnostics.errorHistory.slice(-3).map((error, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-red-400">[{error.type}]</span> {error.message}
                      <div className="text-gray-500">{new Date(error.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subscription History */}
            {diagnostics.subscriptionStatusHistory?.length > 0 && (
              <div className="bg-gray-800 rounded p-3 md:col-span-2">
                <div className="font-semibold text-olive-400 mb-2">Status History</div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {diagnostics.subscriptionStatusHistory.slice(-3).map((status, i) => (
                    <div key={i} className="text-xs font-mono">
                      <span className="text-olive-300">{status.status}</span>
                      <div className="text-gray-500">{new Date(status.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3 mt-4 pt-3 border-t border-gray-700">
            <button
              onClick={() => // // Debug log removed for production
}
              className="px-3 py-1 bg-olive-600 hover:bg-olive-700 rounded text-xs"
            >
              Log Full Diagnostics
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
            >
              Force Reload
            </button>
          </div>
        </div>
      </div>

      {/* Auto-refresh component - Only when WebSocket V2 is not connected */}
      {!realtimeHookConnected && (
        <AutoRefreshComponent 
          onRefresh={handleAutoRefresh}
          intervalMs={10000} // Check every 10 seconds as fallback
        />
      )}
      
      {/* Dialogs removed - using global onboarding system instead */}
      
      {/* Diagnostics Toggle Button */}
      <button
        onClick={() => setShowDiagnostics(true)}
        className={`fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 z-30 ${showDiagnostics ? 'hidden' : 'block'}`}
        title="Show Real-time Diagnostics"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
      
    </div>
  )
}