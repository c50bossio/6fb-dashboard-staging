'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/browser-client'
import { getDisplayName, normalizeNameData } from '../lib/name-utils'
import unifiedStaffService from '../lib/unified-staff-service'
import contextAwareCache from '../lib/context-aware-cache'

// Development mode mock data
const DEV_MOCK_USER = {
  id: 'mock-user-123',
  email: 'test@barbershop.com',
  user_metadata: {
    full_name: 'Test Owner',
    role: 'SHOP_OWNER'
  }
}

const DEV_MOCK_PROFILE = {
  id: 'mock-user-123',
  email: 'test@barbershop.com',
  full_name: 'Test Owner',
  role: 'SHOP_OWNER',
  shop_id: '1ca6138d-eae8-46ed-abf4-5d6c52fbd21b', // Using actual barbershop ID
  barbershop_id: '1ca6138d-eae8-46ed-abf4-5d6c52fbd21b'
}

const GlobalDashboardContext = createContext({})

export function GlobalDashboardProvider({ children }) {
  const { user: authUser, profile: authProfile, userRole: authUserRole } = useAuth()
  const [initialized, setInitialized] = useState(false)
  
  // Use mock data in development when no real user is authenticated
  const isDevelopmentMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_MODE === 'true'
  const useMockData = isDevelopmentMode && !authUser
  
  const user = useMockData ? DEV_MOCK_USER : authUser
  const profile = useMockData ? DEV_MOCK_PROFILE : authProfile
  const userRole = useMockData ? DEV_MOCK_PROFILE.role : authUserRole
  
  // Core dashboard state (existing)
  const [selectedLocations, setSelectedLocations] = useState([])
  const [selectedBarbers, setSelectedBarbers] = useState([])
  const [viewMode, setViewMode] = useState('individual') // 'consolidated' | 'comparison' | 'individual'
  const [timeRange, setTimeRange] = useState({ 
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  
  // Enhanced unified context state
  const [activeContext, setActiveContext] = useState(null)
  const [contextData, setContextData] = useState({})
  const [contextLoading, setContextLoading] = useState(false)
  const [contextCache, setContextCache] = useState(new Map())
  
  // Barber color generation helper
  const generateBarberColor = (barberId) => {
    if (!barberId) return '#6B7280'
    
    const colors = [
      '#546355', // Olive
      '#7C3AED', // Purple
      '#2563EB', // Blue
      '#059669', // Green
      '#DC2626', // Red
      '#EA580C', // Orange
      '#CA8A04', // Yellow
      '#0891B2', // Cyan
      '#DB2777', // Pink
      '#7C2D12'  // Brown
    ]
    
    // Generate a consistent index based on barber ID
    const hash = barberId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    
    return colors[Math.abs(hash) % colors.length]
  }

  // Available options based on user permissions
  const [availableLocations, setAvailableLocations] = useState([])
  const [availableBarbers, setAvailableBarbers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = useMemo(() => createClient(), [])

  // Generate available contexts based on user's locations and role
  const generateAvailableContexts = useCallback((locations, userRole) => {
    if (!locations || locations.length === 0) return []
    
    const contexts = []
    
    locations.forEach(location => {
      // Base context info
      const baseContext = {
        locationId: location.id,
        locationName: location.name,
        locationAddress: `${location.city}, ${location.state}`,
        userId: user?.id,
        role: userRole
      }
      
      // Role-specific context variants
      if (['SUPER_ADMIN', 'ENTERPRISE_OWNER'].includes(userRole)) {
        contexts.push({
          ...baseContext,
          id: `${location.id}-executive`,
          displayName: `📍 ${location.name} - Executive Dashboard`,
          contextType: 'executive',
          primaryView: 'analytics',
          permissions: ['view_all', 'manage_all', 'financial_reports', 'cross_location']
        })
      }
      
      if (['SHOP_OWNER', 'LOCATION_MANAGER', 'BARBER & MANAGER'].includes(userRole)) {
        contexts.push({
          ...baseContext,
          id: `${location.id}-manager`,
          displayName: `📍 ${location.name} - Manager Dashboard`, 
          contextType: 'manager',
          primaryView: 'shop-calendar',
          permissions: ['manage_staff', 'view_analytics', 'book_appointments', 'manage_schedules']
        })
      }
      
      if (['BARBER', 'SHOP_OWNER', 'LOCATION_MANAGER', 'BARBER & MANAGER'].includes(userRole)) {
        contexts.push({
          ...baseContext,
          id: `${location.id}-personal`,
          displayName: `📍 ${location.name} - My Schedule`,
          contextType: 'personal', 
          primaryView: 'my-schedule',
          permissions: ['view_own_schedule', 'book_appointments', 'set_availability']
        })
      }
      
      // Customer booking context (available to all roles for booking)
      contexts.push({
        ...baseContext,
        id: `${location.id}-booking`,
        displayName: `📍 ${location.name} - Book Appointment`,
        contextType: 'booking',
        primaryView: 'book-appointment', 
        permissions: ['book_appointments', 'view_availability']
      })
    })
    
    return contexts
  }, [user?.id])

  // Fetch context-specific data with intelligent caching
  const fetchContextualData = useCallback(async (context) => {
    if (!context) return {}
    
    // Try intelligent cache first
    const cachedData = contextAwareCache.get('contextualData', context, { timeRange })
    if (cachedData) {
      return cachedData
    }
    
    try {
      // Fetch data based on context and permissions
      const dataPromises = {}
      
      // Always fetch basic appointment data for the location
      // Using separate queries to avoid PostgREST foreign key syntax issues
      dataPromises.appointments = (async () => {
        // First, get appointments with customers and services
        const { data: appointments, error: appError } = await supabase
          .from('appointments')
          .select(`
            *,
            customers (id, name, email, phone),
            services (id, name, duration_minutes, price)
          `)
          .eq('barbershop_id', context.locationId)
          .gte('start_time', timeRange.start)
          .lte('start_time', timeRange.end)
          .neq('status', 'deleted')
          .order('start_time')
        
        if (appError || !appointments) return { data: [], error: appError }
        
        // Get unique barber IDs from appointments
        const barberIds = [...new Set(appointments.map(a => a.barber_id).filter(Boolean))]
        
        if (barberIds.length > 0) {
          // Fetch barbershop_staff records
          const { data: staffRecords } = await supabase
            .from('barbershop_staff')
            .select('*')
            .in('id', barberIds)
          
          if (staffRecords && staffRecords.length > 0) {
            // Get user IDs from staff records
            const userIds = [...new Set(staffRecords.map(s => s.user_id).filter(Boolean))]
            
            // Fetch profiles for those users
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, first_name, last_name, email, avatar_url')
              .in('id', userIds)
            
            // Merge data back together
            const staffWithProfiles = staffRecords.map(staff => ({
              ...staff,
              profile: profiles?.find(p => p.id === staff.user_id) || null
            }))
            
            // Add staff data to appointments
            appointments.forEach(appointment => {
              if (appointment.barber_id) {
                appointment.barbershop_staff = staffWithProfiles.find(s => s.id === appointment.barber_id) || null
              }
            })
          }
        }
        
        return { data: appointments, error: null }
      })()
      
      // Fetch staff data for the location
      if (context.permissions.includes('manage_staff') || context.permissions.includes('view_all')) {
        dataPromises.staff = (async () => {
          // First get staff records
          const { data: staffRecords, error: staffError } = await supabase
            .from('barbershop_staff')
            .select('*')
            .eq('barbershop_id', context.locationId)
            .eq('is_active', true)
          
          if (staffError || !staffRecords) return { data: [], error: staffError }
          
          // Get unique user IDs
          const userIds = [...new Set(staffRecords.map(s => s.user_id).filter(Boolean))]
          
          if (userIds.length > 0) {
            // Fetch profiles for those users
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name, first_name, last_name, email, avatar_url')
              .in('id', userIds)
            
            // Merge profiles with staff records
            const staffWithProfiles = staffRecords.map(staff => ({
              ...staff,
              profile: profiles?.find(p => p.id === staff.user_id) || null
            }))
            
            return { data: staffWithProfiles, error: null }
          }
          
          return { data: staffRecords, error: null }
        })()
      }
      
      // Fetch services for the location
      dataPromises.services = supabase
        .from('services')
        .select('*')
        .eq('shop_id', context.locationId)
        .eq('is_active', true)
        .order('name')
      
      // Fetch customers if user has permission
      if (context.permissions.includes('manage_staff') || context.permissions.includes('view_all')) {
        dataPromises.customers = supabase
          .from('customers')
          .select('*')
          .eq('shop_id', context.locationId)
          .order('name')
      }
      
      // Resolve all promises
      const results = await Promise.allSettled(Object.entries(dataPromises).map(
        async ([key, promise]) => [key, await promise]
      ))
      
      // Process results and handle errors gracefully
      const contextualData = {}
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const [key, { data, error }] = result.value
          if (!error && data) {
            contextualData[key] = data
          } else if (error) {
            console.warn(`Error fetching ${key}:`, error)
            contextualData[key] = []
          }
        } else {
          console.warn('Promise rejected:', result.reason)
        }
      })
      
      // Cache the result with intelligent caching
      contextAwareCache.set('contextualData', context, contextualData, { timeRange })
      
      return contextualData
    } catch (error) {
      console.error('Error fetching contextual data:', error)
      return {}
    }
  }, [supabase, timeRange])

  // Switch to new context (main context switching function)
  const switchContext = useCallback(async (newContext) => {
    if (!newContext) return
    
    setContextLoading(true)
    
    try {
      // 1. Optimistically update active context for immediate UI response
      setActiveContext(newContext)
      
      // 2. Update legacy state for backward compatibility
      setSelectedLocations([newContext.locationId])
      setSelectedBarbers([]) // Reset barber selection on context change
      
      // 3. Fetch fresh contextual data
      const freshData = await fetchContextualData(newContext)
      setContextData(freshData)
      
      // 4. Save context preference
      if (user?.id) {
        localStorage.setItem(`activeContext_${user.id}`, JSON.stringify(newContext))
      }
      
      // 5. Predictive preloading for likely next contexts (non-blocking)
      setTimeout(() => {
        contextAwareCache.preloadPredictedContexts(newContext, fetchContextualData)
          .catch(error => console.warn('Preload failed:', error))
      }, 100) // Small delay to not block current context switch
      
    } catch (error) {
      console.error('Error switching context:', error)
      // Revert context on error
      setActiveContext(null)
    } finally {
      setContextLoading(false)
    }
  }, [fetchContextualData, user?.id])

  // Compute contextual data with filtering and processing
  const contextualData = useMemo(() => {
    if (!activeContext || !contextData.appointments) {
      return {
        appointments: [],
        staff: [],
        services: [],
        customers: [],
        calendarEvents: [],
        availableBarbers: [],
        analytics: {}
      }
    }
    
    // Process appointments into calendar events
    const calendarEvents = (contextData.appointments || []).map(apt => ({
      id: apt.id,
      title: `${apt.customers?.name || 'Customer'} - ${apt.services?.name || 'Service'}`,
      start: apt.start_time,
      end: apt.end_time,
      resourceId: apt.barber_id,
      backgroundColor: generateBarberColor(apt.barber_id),
      borderColor: generateBarberColor(apt.barber_id),
      extendedProps: {
        appointmentId: apt.id,
        customerId: apt.customer_id,
        customerName: apt.customers?.name,
        customerEmail: apt.customers?.email,
        customerPhone: apt.customers?.phone,
        serviceId: apt.service_id,
        serviceName: apt.services?.name,
        serviceDuration: apt.services?.duration_minutes,
        servicePrice: apt.services?.price,
        barberId: apt.barber_id,
        barberName: apt.barbershop_staff?.profiles?.full_name,
        status: apt.status,
        notes: apt.notes,
        barbershopId: apt.barbershop_id
      }
    }))
    
    // Process staff into available barbers
    const availableBarbers = (contextData.staff || []).map(staff => {
      const profile = staff.profiles || {}
      const normalizedNames = normalizeNameData({
        firstName: profile.first_name,
        lastName: profile.last_name,
        fullName: profile.full_name
      })
      
      return {
        id: staff.user_id,
        name: getDisplayName({
          firstName: normalizedNames.firstName,
          lastName: normalizedNames.lastName,
          fullName: normalizedNames.fullName,
          email: profile.email,
          defaultName: 'Unknown Staff'
        }),
        email: profile.email,
        avatar: profile.avatar_url,
        role: staff.role,
        color: generateBarberColor(staff.user_id)
      }
    })
    
    // Basic analytics computation
    const today = new Date().toISOString().split('T')[0]
    const todaysAppointments = calendarEvents.filter(event => 
      event.start.startsWith(today)
    )
    const analytics = {
      todayAppointmentCount: todaysAppointments.length,
      todayRevenue: todaysAppointments.reduce((sum, apt) => 
        sum + (apt.extendedProps?.servicePrice || 0), 0
      ),
      totalAppointments: calendarEvents.length,
      activeStaff: availableBarbers.length
    }
    
    return {
      appointments: contextData.appointments || [],
      staff: contextData.staff || [],
      services: contextData.services || [],
      customers: contextData.customers || [],
      calendarEvents,
      availableBarbers,
      analytics
    }
  }, [activeContext, contextData])
  
  // Determine user permissions based on role
  const getPermissions = useCallback(() => {
    const rolePermissions = {
      'SUPER_ADMIN': {
        canSeeAllLocations: true,
        canAddLocations: true,
        canSeeAllBarbers: true,
        canViewFinancials: true,
        canBulkEdit: true,
        canCrossLocationManage: true
      },
      'ENTERPRISE_OWNER': {
        canSeeAllLocations: true,
        canAddLocations: true,
        canSeeAllBarbers: true,
        canViewFinancials: true,
        canBulkEdit: true,
        canCrossLocationManage: true
      },
      'SHOP_OWNER': {
        canSeeOwnLocation: true,
        canAddBarbers: true,
        canViewLocationFinancials: true,
        canEditSchedules: true,
        canManageStaff: true
      },
      'LOCATION_MANAGER': {
        canSeeOwnLocation: true,
        canAddBarbers: true,
        canViewLocationFinancials: true,
        canEditSchedules: true,
        canManageStaff: true
      },
      'BARBER': {
        canSeeOwnSchedule: true,
        canViewOwnMetrics: true,
        canBookOwnAppointments: true,
        canSetAvailability: true
      },
      'CLIENT': {
        canBookAppointments: true,
        canViewAvailability: true,
        canSeeOwnHistory: true
      },
      'CUSTOMER': {
        canBookAppointments: true,
        canViewAvailability: true,
        canSeeOwnHistory: true
      }
    }
    
    return rolePermissions[userRole] || rolePermissions['CLIENT']
  }, [userRole])
  
  // Load user's accessible locations
  const loadAvailableLocations = useCallback(async () => {
    if (!user || !user.id) {
      
      return
    }
    
    const permissions = getPermissions()
    
    try {
      let locations = []
      
      if (permissions.canSeeAllLocations) {
        // Enterprise users see all locations
        const { data, error } = await supabase
          .from('barbershops')
          .select('id, name, city, state, address, phone, owner_id')
          .order('name')
        
        if (!error && data) {
          locations = data
        }
      } else if (permissions.canSeeOwnLocation) {
        // Shop owners/managers see their location
        const shopId = profile?.shop_id || profile?.barbershop_id
        
        if (shopId) {
          const { data, error } = await supabase
            .from('barbershops')
            .select('id, name, city, state, address, phone, owner_id')
            .eq('id', shopId)
          
          if (!error && data) {
            locations = data
          }
        } else {
          // Check barbershop_staff table for employee associations
          if (user.id) {
            const { data: staffData, error: staffError } = await supabase
              .from('barbershop_staff')
              .select('barbershop_id, barbershops(id, name, city, state, address, phone, owner_id)')
              .eq('user_id', user.id)
              .eq('is_active', true)
            
            if (!staffError && staffData && staffData.length > 0) {
              locations = staffData.map(s => s.barbershops).filter(Boolean)
            }
          }
        }
      } else if (userRole === 'BARBER') {
        // Individual barbers see their assigned location
        if (user.id) {
          const { data: staffData, error } = await supabase
            .from('barbershop_staff')
            .select('barbershop_id, barbershops(id, name, city, state, address, phone)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single()
          
          if (!error && staffData?.barbershops) {
            locations = [staffData.barbershops]
          }
        }
      }
      
      setAvailableLocations(locations)
      
      // Auto-select first location if none selected and this is initial load
      if (locations.length > 0 && selectedLocations.length === 0 && !initialized) {
        setSelectedLocations([locations[0].id])
      }
      
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }, [user, profile, userRole, getPermissions, supabase])
  
  // Load barbers for selected locations using unifiedStaffService for consistency
  const loadAvailableBarbers = useCallback(async () => {
    if (selectedLocations.length === 0) {
      setAvailableBarbers([])
      return
    }
    
    try {
      // Use unifiedStaffService for consistency with staff management page
      const allBarbers = []
      
      // Load staff for each selected location
      for (const locationId of selectedLocations) {
        try {
          const staffData = await unifiedStaffService.getStaff(locationId, {
            useCache: true,
            includeAvailability: false,
            includeServices: false,
            forceRefresh: false
          })
          
          if (staffData.staff && staffData.staff.length > 0) {
            // Transform staff data to barber format for context system
            const locationBarbers = staffData.staff
              .filter(staff => staff.is_active)
              .map(staff => ({
                id: staff.user_id || staff.id,
                name: getDisplayName({
                  firstName: staff.first_name,
                  lastName: staff.last_name,
                  fullName: staff.full_name,
                  email: staff.email,
                  defaultName: 'Unknown Staff'
                }),
                firstName: staff.first_name,
                lastName: staff.last_name,
                fullName: staff.full_name,
                email: staff.email,
                avatar_url: staff.avatar_url,
                role: staff.role,
                location: staff.barbershop_name || staff.metadata?.barbershop_name,
                barbershop_id: locationId
              }))
            
            allBarbers.push(...locationBarbers)
          }
        } catch (locationError) {
          console.warn(`Error loading staff for location ${locationId}:`, locationError)
          // Continue with other locations
        }
      }
      
      setAvailableBarbers(allBarbers)
      
    } catch (error) {
      console.error('Error loading barbers:', error)
      setAvailableBarbers([])
    }
  }, [selectedLocations])
  
  // Persist context to localStorage
  const saveContext = useCallback(() => {
    if (!initialized) return
    
    const contextData = {
      selectedLocations,
      selectedBarbers,
      viewMode,
      timeRange,
      lastUpdated: Date.now()
    }
    
    localStorage.setItem(`globalDashboardContext_${user?.id}`, JSON.stringify(contextData))
  }, [initialized, selectedLocations, selectedBarbers, viewMode, timeRange, user?.id])
  
  // Load context from localStorage
  const loadContext = useCallback(() => {
    if (!user?.id) return
    
    const savedContext = localStorage.getItem(`globalDashboardContext_${user.id}`)
    if (savedContext) {
      try {
        const parsed = JSON.parse(savedContext)
        
        // Only restore if saved within last 24 hours
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000)
        if (parsed.lastUpdated && parsed.lastUpdated > dayAgo) {
          if (parsed.selectedLocations?.length > 0) {
            setSelectedLocations(parsed.selectedLocations)
          }
          if (parsed.selectedBarbers) {
            setSelectedBarbers(parsed.selectedBarbers)
          }
          if (parsed.viewMode) {
            setViewMode(parsed.viewMode)
          }
          if (parsed.timeRange) {
            setTimeRange(parsed.timeRange)
          }
        }
      } catch (error) {
        console.error('Error loading saved context:', error)
      }
    }
    
    setInitialized(true)
  }, [user?.id])
  
  // Initialize on mount
  useEffect(() => {
    if (user && user.id && profile) {
      
      loadContext()
      loadAvailableLocations()
    } else {
      
    }
  }, [user, profile, loadContext, loadAvailableLocations])
  
  // Load barbers when locations change
  useEffect(() => {
    if (selectedLocations.length > 0) {
      loadAvailableBarbers()
    }
  }, [selectedLocations, loadAvailableBarbers])
  
  // Save context when it changes
  useEffect(() => {
    saveContext()
  }, [saveContext])
  
  // Generate available contexts when locations or userRole changes
  const availableContexts = useMemo(() => {
    return generateAvailableContexts(availableLocations, userRole)
  }, [availableLocations, userRole, generateAvailableContexts])

  // Initialize active context on first load
  useEffect(() => {
    if (availableContexts.length > 0 && !activeContext && initialized) {
      // Try to load saved context first
      const savedActiveContext = localStorage.getItem(`activeContext_${user?.id}`)
      if (savedActiveContext) {
        try {
          const parsed = JSON.parse(savedActiveContext)
          const matchingContext = availableContexts.find(ctx => ctx.id === parsed.id)
          if (matchingContext) {
            switchContext(matchingContext)
            return
          }
        } catch (error) {
          console.warn('Error loading saved active context:', error)
        }
      }
      
      // Default to first appropriate context based on role
      const defaultContext = availableContexts.find(ctx => {
        if (['SUPER_ADMIN', 'ENTERPRISE_OWNER'].includes(userRole)) {
          return ctx.contextType === 'executive'
        }
        if (['SHOP_OWNER', 'LOCATION_MANAGER', 'BARBER & MANAGER'].includes(userRole)) {
          return ctx.contextType === 'manager'
        }
        if (userRole === 'BARBER') {
          return ctx.contextType === 'personal'
        }
        return ctx.contextType === 'booking'
      }) || availableContexts[0]
      
      if (defaultContext) {
        switchContext(defaultContext)
      }
    }
  }, [availableContexts, activeContext, initialized, userRole, user?.id, switchContext])

  // Update loading state
  useEffect(() => {
    setIsLoading(false)
  }, [availableLocations])
  
  // Context value with all state and setters
  const value = {
    // Legacy State (maintained for backward compatibility)
    selectedLocations,
    selectedBarbers,
    viewMode,
    timeRange,
    availableLocations,
    availableBarbers,
    isLoading,
    
    // Enhanced Unified Context State
    activeContext,
    availableContexts,
    contextualData,
    contextLoading,
    
    // Legacy Setters (maintained for backward compatibility)
    setSelectedLocations,
    setSelectedBarbers,
    setViewMode,
    setTimeRange,
    
    // New Unified Context Actions
    switchContext,
    
    // Cache Management (for staff-context integration)
    invalidateStaffCache: useCallback(() => {
      // Invalidate unified staff service cache
      unifiedStaffService.invalidateCache()
      
      // Invalidate intelligent cache for staff-related data
      contextAwareCache.invalidate('staff', { locationId: activeContext?.locationId })
      contextAwareCache.invalidate('contextualData', { locationId: activeContext?.locationId })
      
      // Refresh context system barbers
      loadAvailableBarbers()
    }, [loadAvailableBarbers, activeContext?.locationId]),
    
    // Advanced Cache Management
    getCacheStats: useCallback(() => contextAwareCache.getStats(), []),
    clearCache: useCallback(() => contextAwareCache.clear(), []),
    invalidateCache: useCallback((dataType, context) => {
      contextAwareCache.invalidate(dataType, context)
    }, []),
    
    // Enhanced Helpers
    permissions: activeContext?.permissions || getPermissions(),
    isMultiLocation: availableLocations.length > 1,
    hasLocations: availableLocations.length > 0,
    isManager: activeContext?.contextType === 'manager' || activeContext?.contextType === 'executive',
    canManageStaff: activeContext?.permissions?.includes('manage_staff') || activeContext?.permissions?.includes('view_all'),
    currentLocation: activeContext?.locationName,
    currentLocationId: activeContext?.locationId,
    
    // Context-aware data getters
    getOptimalCalendarView: () => {
      if (!activeContext) return 'timeGridWeek'
      
      const viewMap = {
        'executive': 'timeGridWeek',
        'manager': 'resourceTimeGridWeek', // Use premium resource view
        'personal': 'timeGridWeek',
        'booking': 'resourceTimeGridDay'   // Use premium resource view
      }
      
      return viewMap[activeContext.contextType] || 'timeGridWeek'
    },
    
    getPageDefaults: (pageType) => {
      if (!activeContext) return {}
      
      const getOptimalView = () => {
        const viewMap = {
          'executive': 'timeGridWeek',
          'manager': 'resourceTimeGridWeek', // Use premium resource view
          'personal': 'timeGridWeek',
          'booking': 'resourceTimeGridDay'   // Use premium resource view
        }
        return viewMap[activeContext.contextType] || 'timeGridWeek'
      }
      
      const defaults = {
        calendar: {
          view: getOptimalView(),
          quickActions: ['Today', 'This Week', 'Available Now', '+ New Appointment'],
          filters: { location: activeContext.locationId }
        },
        analytics: {
          quickActions: ['Today', 'This Week', 'This Month', 'Custom Range'],
          metrics: ['appointments', 'revenue', 'utilization'],
          filters: { location: activeContext.locationId }
        },
        staff: {
          quickActions: ['Active Staff', 'Schedules', 'Performance', '+ Add Staff'],
          filters: { location: activeContext.locationId, active: true }
        }
      }
      
      return defaults[pageType] || {}
    },
    
    // Legacy Actions (maintained for backward compatibility)
    refreshLocations: loadAvailableLocations,
    refreshBarbers: loadAvailableBarbers,
    
    // Legacy Utility functions (maintained for backward compatibility)
    selectAllLocations: () => setSelectedLocations(availableLocations.map(l => l.id)),
    clearLocationSelection: () => setSelectedLocations([]),
    selectAllBarbers: () => setSelectedBarbers(availableBarbers.map(b => b.id)),
    clearBarberSelection: () => setSelectedBarbers([]),
    
    // Legacy Check functions (maintained for backward compatibility)
    isLocationSelected: (locationId) => selectedLocations.includes(locationId),
    isBarberSelected: (barberId) => selectedBarbers.includes(barberId),
    
    // Legacy Get functions (maintained for backward compatibility)
    getSelectedLocations: () => availableLocations.filter(l => selectedLocations.includes(l.id)),
    getSelectedBarbers: () => availableBarbers.filter(b => selectedBarbers.includes(b.id))
  }
  
  return (
    <GlobalDashboardContext.Provider value={value}>
      {children}
    </GlobalDashboardContext.Provider>
  )
}

// Custom hook to use global dashboard context
export function useGlobalDashboard() {
  const context = useContext(GlobalDashboardContext)
  
  if (!context) {
    throw new Error('useGlobalDashboard must be used within GlobalDashboardProvider')
  }
  
  return context
}

// Export context for direct access if needed
export { GlobalDashboardContext }