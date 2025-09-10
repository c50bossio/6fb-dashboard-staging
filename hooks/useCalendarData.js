'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { DEFAULT_RESOURCES, DEFAULT_SERVICES } from '../lib/calendar-data'

/**
 * Custom hook to manage calendar data, events, resources, and filters
 * Extracts data management logic from the main calendar page
 */
export function useCalendarData(barbershopId = 'demo-shop-001') {
  // Core data states
  const [mounted, setMounted] = useState(false)
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [services, setServices] = useState([])
  const [quickLinks, setQuickLinks] = useState([])
  const [currentTime, setCurrentTime] = useState('')

  // Calendar view state
  const [currentCalendarView, setCurrentCalendarView] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('calendar-view') || 'resourceTimeGridDay'
    }
    return 'resourceTimeGridDay'
  })

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBarber, setFilterBarber] = useState('all')
  const [filterService, setFilterService] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterLocation, setFilterLocation] = useState('all')

  // Tracking states
  const [appointmentIds, setAppointmentIds] = useState(() => new Set())
  const [selectedResource, setSelectedResource] = useState(null)

  // Initialize component
  useEffect(() => {
    setMounted(true)
    
    // Load initial data
    initializeCalendarData()
    
    // Start time updater
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      }))
    }
    updateTime()
    const timeInterval = setInterval(updateTime, 1000)

    return () => {
      clearInterval(timeInterval)
    }
  }, [])

  // Save calendar view to localStorage when it changes
  useEffect(() => {
    if (mounted && currentCalendarView) {
      localStorage.setItem('calendar-view', currentCalendarView)
    }
  }, [currentCalendarView, mounted])

  // Initialize calendar data
  const initializeCalendarData = useCallback(async () => {
    try {
      // Set default resources and services
      setResources(DEFAULT_RESOURCES)
      setServices(DEFAULT_SERVICES)
      
      // Import icons dynamically
      const { BuildingStorefrontIcon, UserIcon } = await import('@heroicons/react/24/outline')
      
      // Generate quick booking links
      const links = DEFAULT_RESOURCES.map(resource => ({
        id: resource.id,
        title: resource.title,
        subtitle: `Book with ${resource.title}`,
        url: `${window.location.origin}/book/${resource.id.replace('barber-', '')}`,
        type: 'barber',
        icon: UserIcon
      }))
      
      // Add location links
      links.push({
        id: 'location-main',
        title: 'Main Location',
        subtitle: 'Book at main location',
        url: `${window.location.origin}/book/location/main`,
        type: 'location',
        icon: BuildingStorefrontIcon
      })
      
      setQuickLinks(links)
      
    } catch (error) {
      console.error('Error initializing calendar data:', error)
    }
  }, [])

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    if (!events.length) return []

    return events.filter(event => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          event.title?.toLowerCase().includes(searchLower) ||
          event.extendedProps?.customer_name?.toLowerCase().includes(searchLower) ||
          event.extendedProps?.customer_phone?.toLowerCase().includes(searchLower) ||
          event.extendedProps?.service_name?.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      // Barber filter
      if (filterBarber !== 'all' && event.resourceId !== filterBarber) {
        return false
      }

      // Service filter
      if (filterService !== 'all') {
        const eventServiceId = event.extendedProps?.service_id
        const eventServiceName = event.extendedProps?.service_name
        const matchesService = eventServiceId === filterService || 
          services.some(s => s.id === filterService && s.name === eventServiceName)
        
        if (!matchesService) return false
      }

      // Status filter
      if (filterStatus !== 'all' && event.extendedProps?.status !== filterStatus) {
        return false
      }

      // Location filter (placeholder for multi-location support)
      if (filterLocation !== 'all') {
        // Add location filtering logic when multi-location is implemented
      }

      return true
    })
  }, [events, searchTerm, filterBarber, filterService, filterStatus, filterLocation, services])

  // Deduplication utility for appointments
  const deduplicateAppointments = useCallback((appointments) => {
    const seen = new Set()
    return appointments.filter(apt => {
      if (seen.has(apt.id)) return false
      seen.add(apt.id)
      return true
    })
  }, [])

  // Handle calendar view change
  const handleViewChange = useCallback((newView) => {
    setCurrentCalendarView(newView)
  }, [])

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('')
    setFilterBarber('all')
    setFilterService('all')
    setFilterStatus('all')
    setFilterLocation('all')
  }, [])

  // Add new event optimistically
  const addOptimisticEvent = useCallback((eventData) => {
    const optimisticEvent = {
      id: `temp-${Date.now()}`,
      ...eventData,
      classNames: ['optimistic-appointment'],
      extendedProps: {
        ...eventData.extendedProps,
        isOptimistic: true
      }
    }
    
    setEvents(prev => {
      const exists = prev.some(event => event.id === optimisticEvent.id)
      if (exists) return prev
      return [...prev, optimisticEvent]
    })
    
    return optimisticEvent.id
  }, [])

  // Remove optimistic event
  const removeOptimisticEvent = useCallback((eventId) => {
    setEvents(prev => prev.filter(event => event.id !== eventId))
  }, [])

  // Replace optimistic with real event
  const replaceOptimisticEvent = useCallback((optimisticId, realEvent) => {
    setEvents(prev => {
      const withoutOptimistic = prev.filter(event => event.id !== optimisticId)
      const combined = [...withoutOptimistic, realEvent]
      return deduplicateAppointments(combined)
    })
  }, [deduplicateAppointments])

  // Update appointment in events
  const updateEvent = useCallback((eventId, updates) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId ? { ...event, ...updates } : event
    ))
  }, [])

  // Remove event
  const removeEvent = useCallback((eventId) => {
    setEvents(prev => prev.filter(event => event.id !== eventId))
  }, [])

  // Batch update events
  const batchUpdateEvents = useCallback((newEvents) => {
    setEvents(deduplicateAppointments(newEvents))
  }, [deduplicateAppointments])

  // Get resource by ID
  const getResourceById = useCallback((resourceId) => {
    return resources.find(resource => resource.id === resourceId)
  }, [resources])

  // Get service by ID
  const getServiceById = useCallback((serviceId) => {
    return services.find(service => service.id === serviceId)
  }, [services])

  // Real-time subscription for bookings table
  useSupabaseRealtime('bookings', { shop_id: barbershopId }, (payload) => {
    console.log('📡 Real-time update received:', payload)
    
    switch (payload.eventType) {
      case 'INSERT':
        // Add new booking to events
        const newBooking = payload.new
        const newEvent = {
          id: newBooking.id,
          resourceId: newBooking.barber_id,
          title: `${newBooking.customer_name || 'Customer'} - ${newBooking.service_name || 'Service'}`,
          start: newBooking.start_time,
          end: newBooking.end_time,
          backgroundColor: newBooking.status === 'cancelled' ? '#ef4444' : '#546355',
          borderColor: newBooking.status === 'cancelled' ? '#dc2626' : '#546355',
          classNames: newBooking.status === 'cancelled' ? ['cancelled-appointment'] : [],
          extendedProps: {
            customer_name: newBooking.customer_name,
            customer_phone: newBooking.customer_phone,
            customer_email: newBooking.customer_email,
            service_name: newBooking.service_name,
            service_id: newBooking.service_id,
            barber_id: newBooking.barber_id,
            duration: newBooking.duration_minutes,
            price: newBooking.price,
            status: newBooking.status,
            notes: newBooking.notes,
            isRecurring: newBooking.is_recurring,
            isTest: newBooking.is_test
          }
        }
        setEvents(prev => [...prev.filter(e => e.id !== newEvent.id), newEvent])
        break
        
      case 'UPDATE':
        // Update existing booking
        const updatedBooking = payload.new
        setEvents(prev => prev.map(event => 
          event.id === updatedBooking.id ? {
            ...event,
            title: `${updatedBooking.customer_name || 'Customer'} - ${updatedBooking.service_name || 'Service'}`,
            start: updatedBooking.start_time,
            end: updatedBooking.end_time,
            backgroundColor: updatedBooking.status === 'cancelled' ? '#ef4444' : '#546355',
            borderColor: updatedBooking.status === 'cancelled' ? '#dc2626' : '#546355',
            classNames: updatedBooking.status === 'cancelled' ? ['cancelled-appointment'] : [],
            extendedProps: {
              ...event.extendedProps,
              customer_name: updatedBooking.customer_name,
              customer_phone: updatedBooking.customer_phone,
              customer_email: updatedBooking.customer_email,
              service_name: updatedBooking.service_name,
              status: updatedBooking.status,
              notes: updatedBooking.notes
            }
          } : event
        ))
        break
        
      case 'DELETE':
        // Remove deleted booking
        const deletedBooking = payload.old
        setEvents(prev => prev.filter(event => event.id !== deletedBooking.id))
        break
    }
  })

  return {
    // Core data
    mounted,
    events,
    resources,
    services,
    quickLinks,
    currentTime,
    barbershopId,
    
    // Loading states
    loading,
    error,
    lastFetch,

    // Calendar view
    currentCalendarView,
    handleViewChange,

    // Filters
    searchTerm,
    setSearchTerm,
    filterBarber,
    setFilterBarber,
    filterService,
    setFilterService,
    filterStatus,
    setFilterStatus,
    filterLocation,
    setFilterLocation,
    clearAllFilters,
    filteredEvents,

    // State management
    selectedResource,
    setSelectedResource,
    appointmentIds,
    setAppointmentIds,

    // Event management
    setEvents,
    loadEvents,
    refreshData,
    addOptimisticEvent,
    removeOptimisticEvent,
    replaceOptimisticEvent,
    updateEvent,
    removeEvent,
    batchUpdateEvents,
    deduplicateAppointments,

    // Utilities
    getResourceById,
    getServiceById,

    // Setters for direct access
    setResources,
    setServices,
    setQuickLinks
  }
}

export default useCalendarData