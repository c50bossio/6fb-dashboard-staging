'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '../components/SupabaseAuthProvider'
import { createBrowserClient } from '@supabase/ssr'

const GlobalDashboardContext = createContext({})

export function GlobalDashboardProvider({ children }) {
  const { user, profile, userRole } = useAuth()
  const [initialized, setInitialized] = useState(false)
  
  // Core dashboard state
  const [selectedLocations, setSelectedLocations] = useState([])
  const [selectedBarbers, setSelectedBarbers] = useState([])
  const [viewMode, setViewMode] = useState('individual') // 'consolidated' | 'comparison' | 'individual'
  const [timeRange, setTimeRange] = useState({ 
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  
  // Available options based on user permissions
  const [availableLocations, setAvailableLocations] = useState([])
  const [availableBarbers, setAvailableBarbers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
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
      console.log('🔍 [DASHBOARD] No authenticated user, skipping location loading')
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
  
  // Load barbers for selected locations
  const loadAvailableBarbers = useCallback(async () => {
    if (selectedLocations.length === 0) {
      setAvailableBarbers([])
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('barbershop_staff')
        .select('*')
        .in('barbershop_id', selectedLocations)
        .eq('is_active', true)
        .in('role', ['barber', 'owner', 'manager'])
      
      // Fetch related data separately to avoid join syntax issues
      if (!error && data) {
        // Get unique user IDs and barbershop IDs
        const userIds = [...new Set(data.map(s => s.user_id).filter(Boolean))]
        const barbershopIds = [...new Set(data.map(s => s.barbershop_id).filter(Boolean))]
        
        // Guard: Only make API calls if we have valid IDs
        let profilesData = []
        let barbershopsData = []
        
        if (userIds.length > 0) {
          // Fetch profiles
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', userIds)
          
          if (profilesError) {
            console.warn('Error fetching profiles:', profilesError)
          } else {
            profilesData = profiles || []
          }
        }
        
        if (barbershopIds.length > 0) {
          // Fetch barbershops
          const { data: barbershops, error: barbershopsError } = await supabase
            .from('barbershops')
            .select('id, name')
            .in('id', barbershopIds)
          
          if (barbershopsError) {
            console.warn('Error fetching barbershops:', barbershopsError)
          } else {
            barbershopsData = barbershops || []
          }
        }
        
        // Create lookup maps
        const profilesMap = Object.fromEntries(
          (profilesData || []).map(p => [p.id, p])
        )
        const barbershopsMap = Object.fromEntries(
          (barbershopsData || []).map(b => [b.id, b])
        )
        
        // Map the data with related info
        const barbers = data.map(staff => {
          const profile = profilesMap[staff.user_id] || {}
          const barbershop = barbershopsMap[staff.barbershop_id] || {}
          
          return {
            id: staff.user_id,
            name: profile.full_name || profile.email?.split('@')[0] || 'Unknown',
            email: profile.email,
            avatar_url: profile.avatar_url,
            role: staff.role,
            location: barbershop.name,
            barbershop_id: staff.barbershop_id
          }
        })
        
        setAvailableBarbers(barbers)
      }
    } catch (error) {
      console.error('Error loading barbers:', error)
    }
  }, [selectedLocations, supabase])
  
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
      console.log('🔍 [DASHBOARD] User authenticated, loading dashboard context for:', user.email)
      loadContext()
      loadAvailableLocations()
    } else {
      console.log('🔍 [DASHBOARD] Waiting for authentication to complete...', {
        hasUser: !!user,
        hasUserId: !!user?.id,
        hasProfile: !!profile
      })
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
  
  // Update loading state
  useEffect(() => {
    setIsLoading(false)
  }, [availableLocations])
  
  // Context value with all state and setters
  const value = {
    // State
    selectedLocations,
    selectedBarbers,
    viewMode,
    timeRange,
    availableLocations,
    availableBarbers,
    isLoading,
    
    // Setters
    setSelectedLocations,
    setSelectedBarbers,
    setViewMode,
    setTimeRange,
    
    // Helpers
    permissions: getPermissions(),
    isMultiLocation: availableLocations.length > 1,
    hasLocations: availableLocations.length > 0,
    
    // Actions
    refreshLocations: loadAvailableLocations,
    refreshBarbers: loadAvailableBarbers,
    
    // Utility functions
    selectAllLocations: () => setSelectedLocations(availableLocations.map(l => l.id)),
    clearLocationSelection: () => setSelectedLocations([]),
    selectAllBarbers: () => setSelectedBarbers(availableBarbers.map(b => b.id)),
    clearBarberSelection: () => setSelectedBarbers([]),
    
    // Check if a specific location/barber is selected
    isLocationSelected: (locationId) => selectedLocations.includes(locationId),
    isBarberSelected: (barberId) => selectedBarbers.includes(barberId),
    
    // Get selected location/barber objects
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