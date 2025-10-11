'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { useAuth } from '../components/SupabaseAuthProvider'
import contextAwareCache from '../lib/context-aware-cache'
import { getDisplayName, normalizeNameData } from '../lib/name-utils'
import unifiedStaffService from '../lib/unified-staff-service'

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
  barbershop_id: '1ca6138d-eae8-46ed-abf4-5d6c52fbd21b' // Using actual barbershop ID
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
  // Default to ±30 days to show more appointments
  const [timeRange, setTimeRange] = useState(() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - 30)
    const end = new Date(now)
    end.setDate(end.getDate() + 30)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  })
  
  // Enhanced unified context state
  const [activeContext, setActiveContext] = useState(null)
  const [contextData, setContextData] = useState({})
  const [contextLoading, setContextLoading] = useState(false)
  const [contextCache, setContextCache] = useState(new Map())
  const [isContextSwitching, setIsContextSwitching] = useState(false)
  
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
    console.log('[GlobalDashboardContext] generateAvailableContexts called with:', {
      locationsCount: locations?.length || 0,
      locations: locations?.map(loc => ({ id: loc.id, name: loc.name })) || 'No locations',
      userRole,
      userId: user?.id
    })
    
    if (!locations || locations.length === 0) {
      console.warn('[GlobalDashboardContext] No locations available for context generation')
      return []
    }
    
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
    
    console.log('[GlobalDashboardContext] Generated contexts:', {
      contextCount: contexts.length,
      contexts: contexts.map(ctx => ({ 
        id: ctx.id, 
        displayName: ctx.displayName, 
        contextType: ctx.contextType,
        locationName: ctx.locationName 
      }))
    })
    
    return contexts
  }, [user?.id])

  // Fetch context-specific data with intelligent caching and improved error handling
  const fetchContextualData = useCallback(async (context) => {
    if (!context) return {}
    
    console.log('[GlobalDashboardContext] Fetching contextual data for:', context.locationId)
    
    // Try intelligent cache first
    const cachedData = contextAwareCache.get('contextualData', context, { timeRange })
    if (cachedData) {
      console.log('[GlobalDashboardContext] Using cached data')
      return cachedData
    }
    
    // Helper function to create timeouts for database queries
    const withTimeout = (promise, timeout = 5000, queryName = 'query') => {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${queryName} timed out after ${timeout}ms`)), timeout)
        )
      ])
    }
    
    try {
      // Fetch data based on context and permissions with individual error handling
      const dataPromises = {}
      
      // Always fetch basic appointment data for the location
      // Using separate queries to avoid PostgREST foreign key syntax issues
      dataPromises.appointments = (async () => {
        try {
          console.log('[GlobalDashboardContext] Fetching appointments for location:', context.locationId)
          
          // Get appointments with services - client data is embedded in appointments table
          // NOTE: Using scheduled_at column (timestamp) NOT date column
          // NOTE: client_id is NULL - client data stored as client_name, client_phone, client_email
          const { data: appointments, error: appError } = await withTimeout(
            supabase
              .from('appointments')
              .select(`
                *,
                services (id, name, duration_minutes, price)
              `)
              .eq('barbershop_id', context.locationId)
              .gte('scheduled_at', `${timeRange.start}T00:00:00`)
              .lte('scheduled_at', `${timeRange.end}T23:59:59`)
              .neq('status', 'deleted')
              .order('scheduled_at'),
            5000,
            'appointments query'
          )
          
          if (appError) {
            console.error('[GlobalDashboardContext] Error fetching appointments:', appError)
            return { data: [], error: appError }
          }
          
          if (!appointments) {
            console.log('[GlobalDashboardContext] No appointments found')
            return { data: [], error: null }
          }
          
          console.log(`[GlobalDashboardContext] Found ${appointments.length} appointments`)
          
          // Get unique barber IDs from appointments
          const barberIds = [...new Set(appointments.map(a => a.barber_id).filter(Boolean))]

          if (barberIds.length > 0) {
            try {
              // Fetch staff records from barbershop_staff with profiles join
              const { data: barbershopStaffRecords, error: staffError } = await withTimeout(
                supabase
                  .from('barbershop_staff')
                  .select(`
                    *,
                    profile:profiles!barbershop_staff_user_id_fkey(
                      id, email, full_name, first_name, last_name, phone, avatar_url, role
                    )
                  `)
                  .in('user_id', barberIds),
                3000,
                'barbershop_staff with profiles query'
              )

              if (staffError) {
                console.warn('[GlobalDashboardContext] Error fetching staff records:', staffError)
                // Continue without staff data rather than failing entirely
              } else if (barbershopStaffRecords && barbershopStaffRecords.length > 0) {
                // Add staff data to appointments with profile compatibility
                appointments.forEach(appointment => {
                  if (appointment.barber_id) {
                    const staffRecord = barbershopStaffRecords.find(s => s.user_id === appointment.barber_id)
                    if (staffRecord && staffRecord.profile) {
                      appointment.barbershop_staff = {
                        ...staffRecord,
                        profiles: staffRecord.profile
                      }
                    }
                  }
                })
              }
            } catch (staffLookupError) {
              console.warn('[GlobalDashboardContext] Error in staff lookup:', staffLookupError)
              // Continue without staff data rather than failing entirely
            }
          }
          
          return { data: appointments, error: null }
          
        } catch (appointmentError) {
          console.error('[GlobalDashboardContext] Critical error in appointment fetching:', appointmentError)
          return { data: [], error: appointmentError }
        }
      })()
      
      // Fetch staff data for the location with improved error handling
      if (context.permissions.includes('manage_staff') || context.permissions.includes('view_all')) {
        dataPromises.staff = (async () => {
          try {
            console.log('[GlobalDashboardContext] Fetching staff for location:', context.locationId)

            // Query barbershop_staff with profiles join
            const { data: barbershopStaffRecords, error: staffError } = await withTimeout(
              supabase
                .from('barbershop_staff')
                .select(`
                  *,
                  profile:profiles!barbershop_staff_user_id_fkey(
                    id, email, full_name, first_name, last_name, phone, avatar_url, role
                  )
                `)
                .eq('barbershop_id', context.locationId)
                .eq('is_active', true)
                .order('created_at', { ascending: true }),
              3000,
              'barbershop_staff with profiles query'
            )

            if (staffError) {
              console.error('[GlobalDashboardContext] Error fetching staff records:', staffError)
              return { data: [], error: staffError }
            }

            if (!barbershopStaffRecords || barbershopStaffRecords.length === 0) {
              console.log('[GlobalDashboardContext] No staff records found')
              return { data: [], error: null }
            }

            console.log(`[GlobalDashboardContext] Found ${barbershopStaffRecords.length} staff members from barbershop_staff table`)

            // Transform barbershop_staff + profile data for backward compatibility
            const staffWithProfiles = barbershopStaffRecords.map(staffRecord => {
              const profile = staffRecord.profile || {}

              return {
                ...staffRecord,
                // Flatten profile data for easy access
                user_id: staffRecord.user_id,
                full_name: profile.full_name,
                first_name: profile.first_name,
                last_name: profile.last_name,
                email: profile.email,
                avatar_url: profile.avatar_url,
                // Keep profile reference for compatibility
                profile: profile,
                profiles: profile // Also add as "profiles" for some components
              }
            })

            return { data: staffWithProfiles, error: null }

          } catch (staffFetchError) {
            console.error('[GlobalDashboardContext] Critical error in staff fetching:', staffFetchError)
            return { data: [], error: staffFetchError }
          }
        })()
      }
      
      // Fetch services for the location with timeout protection
      dataPromises.services = (async () => {
        try {
          console.log('[GlobalDashboardContext] Fetching services for location:', context.locationId)
          
          const { data: services, error: servicesError } = await withTimeout(
            supabase
              .from('services')
              .select('*')
              .eq('barbershop_id', context.locationId)
              .eq('is_active', true)
              .order('name'),
            3000,
            'services query'
          )
          
          if (servicesError) {
            console.error('[GlobalDashboardContext] Error fetching services:', servicesError)
            return { data: [], error: servicesError }
          }
          
          console.log(`[GlobalDashboardContext] Found ${services?.length || 0} services`)
          return { data: services || [], error: null }
          
        } catch (servicesError) {
          console.error('[GlobalDashboardContext] Critical error in services fetching:', servicesError)
          return { data: [], error: servicesError }
        }
      })()
      
      // Fetch customers if user has permission with timeout protection
      if (context.permissions.includes('manage_staff') || context.permissions.includes('view_all')) {
        dataPromises.customers = (async () => {
          try {
            console.log('[GlobalDashboardContext] Fetching customers for location:', context.locationId)
            
            const { data: customers, error: customersError } = await withTimeout(
              supabase
                .from('customers')
                .select('*')
                .eq('barbershop_id', context.locationId)
                .order('name'),
              4000,
              'customers query'
            )
            
            if (customersError) {
              console.error('[GlobalDashboardContext] Error fetching customers:', customersError)
              return { data: [], error: customersError }
            }
            
            console.log(`[GlobalDashboardContext] Found ${customers?.length || 0} customers`)
            return { data: customers || [], error: null }
            
          } catch (customersError) {
            console.error('[GlobalDashboardContext] Critical error in customers fetching:', customersError)
            return { data: [], error: customersError }
          }
        })()
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
      
      // Ensure we have data for all expected keys, even if some queries failed
      const completeContextualData = {
        appointments: contextualData.appointments || [],
        staff: contextualData.staff || [],
        services: contextualData.services || [],
        customers: contextualData.customers || [],
        ...contextualData
      }
      
      console.log('[GlobalDashboardContext] Context data fetched successfully:', {
        appointments: completeContextualData.appointments.length,
        staff: completeContextualData.staff.length,
        services: completeContextualData.services.length,
        customers: completeContextualData.customers.length,
        locationId: context.locationId,
        totalTime: Date.now() - (context._startTime || Date.now())
      })
      
      // Cache the result with intelligent caching
      contextAwareCache.set('contextualData', context, completeContextualData, { timeRange })
      
      return completeContextualData
    } catch (error) {
      console.error('[GlobalDashboardContext] Critical error fetching contextual data:', {
        error: error.message,
        stack: error.stack,
        locationId: context.locationId,
        contextType: context.contextType
      })
      
      // Return a safe fallback structure
      return {
        appointments: [],
        staff: [],
        services: [],
        customers: []
      }
    }
  }, [supabase, timeRange])

  // Switch to new context (main context switching function)
  const switchContext = useCallback(async (newContext) => {
    if (!newContext) {
      console.warn('[GlobalDashboardContext] switchContext called with null context')
      return
    }

    const switchStartTime = Date.now()
    console.log('[GlobalDashboardContext] Starting context switch to:', {
      locationId: newContext.locationId,
      locationName: newContext.locationName,
      contextType: newContext.contextType
    })

    setIsContextSwitching(true)
    setContextLoading(true)

    try {
      // 1. Optimistically update active context for immediate UI response
      setActiveContext(newContext)

      // 2. Update legacy state for backward compatibility
      setSelectedLocations([newContext.locationId])
      setSelectedBarbers([]) // Reset barber selection on context change

      // 3. Fetch fresh contextual data with timing
      newContext._startTime = Date.now()
      const freshData = await fetchContextualData(newContext)
      setContextData(freshData)

      const switchEndTime = Date.now()
      console.log('[GlobalDashboardContext] Context switch completed successfully:', {
        locationId: newContext.locationId,
        totalTime: switchEndTime - switchStartTime,
        dataFetched: Object.keys(freshData).length
      })

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
      setIsContextSwitching(false)
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
    const calendarEvents = (contextData.appointments || []).map(apt => {
      // Handle different date/time formats
      let timeData = { startTime: null, endTime: null };
      
      if (apt.date && apt.time) {
        // Schema with separate date and time columns
        timeData.startTime = `${apt.date}T${apt.time}`;
        const start = new Date(timeData.startTime);
        const end = new Date(start.getTime() + (apt.duration_minutes || 60) * 60000);
        timeData.endTime = end.toISOString();
      } else if (apt.scheduled_at) {
        // Schema with scheduled_at timestamp
        timeData.startTime = apt.scheduled_at;
        const start = new Date(timeData.startTime);
        const end = new Date(start.getTime() + (apt.duration_minutes || 60) * 60000);
        timeData.endTime = end.toISOString();
      } else if (apt.date) {
        // Schema with just date column - assume it includes time
        timeData.startTime = apt.date;
        const start = new Date(timeData.startTime);
        const end = new Date(start.getTime() + (apt.duration_minutes || 60) * 60000);
        timeData.endTime = end.toISOString();
      } else {
        // Fallback - use current time as placeholder
        console.warn('Appointment missing date/time fields:', apt);
        timeData.startTime = new Date().toISOString();
        timeData.endTime = new Date(Date.now() + 60 * 60000).toISOString();
      }
      
      return {
      id: apt.id,
      title: `${apt.client_name || 'Customer'} - ${apt.services?.name || 'Service'}`,
      start: timeData.startTime,
      end: timeData.endTime,
      resourceId: apt.barber_id,
      backgroundColor: generateBarberColor(apt.barber_id),
      borderColor: generateBarberColor(apt.barber_id),
      extendedProps: {
        appointmentId: apt.id,
        customerId: apt.client_id,  // Using client_id (may be NULL)
        customerName: apt.client_name,  // Using embedded client_name field
        customerEmail: apt.client_email,  // Using embedded client_email field
        customerPhone: apt.client_phone,  // Using embedded client_phone field
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
    }
    })
    
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
  
  // Load user's accessible locations using the unified API endpoint
  const loadAvailableLocations = useCallback(async () => {
    if (!user || !user.id) {
      console.log('[GlobalDashboardContext] No user authenticated, skipping location load')
      return
    }
    
    console.log('[GlobalDashboardContext] Loading locations via unified API endpoint')
    
    try {
      // Use the same unified API endpoint that Location Management page uses
      const response = await fetch('/api/user/locations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'  // Include cookies for server-side authentication
      })
      
      console.log('[GlobalDashboardContext] Unified API response status:', response.status)
      
      const result = await response.json()
      console.log('[GlobalDashboardContext] Unified API result:', {
        success: result.success,
        dataLength: result.data?.length || 0,
        error: result.error,
        meta: result.meta,
        accessMethod: result.meta?.accessMethod
      })
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to load locations (HTTP ${response.status})`)
      }
      
      if (result.success && result.data) {
        // Transform API response to match GlobalDashboardContext format
        const locations = result.data.map(location => ({
          id: location.id,
          name: location.name,
          city: location.city,
          state: location.state,
          address: location.address,
          phone: location.phone,
          owner_id: location.managerId || location.owner_id,
          // Add debug info for troubleshooting
          _debug: location._debug
        }))
        
        setAvailableLocations(locations)
        console.log(`[GlobalDashboardContext] Successfully loaded ${locations.length} locations using unified API`)

        // Auto-select first location if none selected and this is initial load
        // Guard: Don't auto-select if we already have an active context (prevents override during context switch)
        if (locations.length > 0 && selectedLocations.length === 0 && !initialized && !activeContext) {
          setSelectedLocations([locations[0].id])
          console.log(`[GlobalDashboardContext] Auto-selected first location: ${locations[0].name}`)
        }
      } else {
        console.log('[GlobalDashboardContext] No locations returned from unified API')
        setAvailableLocations([])
      }
      
    } catch (error) {
      console.error('[GlobalDashboardContext] Error loading locations from unified API:', error)
      setAvailableLocations([])
    }
  }, [user?.id]) // Only depend on user ID, not the whole user object or other state
  
  // Load barbers for current location using unifiedStaffService for consistency
  const loadAvailableBarbers = useCallback(async () => {
    // FIXED: Use currentLocationId instead of selectedLocations to prevent cross-location staff contamination
    const locationToLoad = activeContext?.locationId

    if (!locationToLoad) {
      setAvailableBarbers([])
      return
    }

    try {
      // Use unifiedStaffService for consistency with staff management page
      const staffData = await unifiedStaffService.getStaff(locationToLoad, {
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
            barbershop_id: locationToLoad
          }))

        setAvailableBarbers(locationBarbers)
      } else {
        setAvailableBarbers([])
      }

    } catch (error) {
      console.error('Error loading barbers for location:', locationToLoad, error)
      setAvailableBarbers([])
    }
  }, [activeContext?.locationId])
  
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
  }, [user?.id, profile?.id]) // Only depend on IDs, not functions
  
  // Load barbers when active location changes
  useEffect(() => {
    loadAvailableBarbers()
  }, [activeContext?.locationId]) // Remove function dependency
  
  // Save context when it changes
  useEffect(() => {
    saveContext()
  }, [saveContext])
  
  // Generate available contexts when locations or userRole changes
  const availableContexts = useMemo(() => {
    console.log('[GlobalDashboardContext] availableContexts useMemo triggered with:', {
      availableLocationsCount: availableLocations?.length || 0,
      userRole,
      userId: user?.id
    })
    
    const generatedContexts = generateAvailableContexts(availableLocations, userRole)
    
    console.log('[GlobalDashboardContext] availableContexts result:', {
      contextCount: generatedContexts?.length || 0,
      contextIds: generatedContexts?.map(ctx => ctx.id) || 'No contexts'
    })
    
    return generatedContexts
  }, [availableLocations, userRole, generateAvailableContexts])

  // Initialize active context on first load
  useEffect(() => {
    // Guard: Don't re-initialize while a context switch is in progress
    if (isContextSwitching) return

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
  }, [availableContexts, activeContext, initialized, userRole, user?.id, isContextSwitching]) // Add isContextSwitching dependency

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
    currentLocation: availableLocations.find(loc => loc.id === activeContext?.locationId) || null,
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