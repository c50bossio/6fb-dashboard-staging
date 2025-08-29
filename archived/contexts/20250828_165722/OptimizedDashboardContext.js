'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../components/SupabaseAuthProvider'
import { createBrowserClient } from '@supabase/ssr'
import { getDisplayName, normalizeNameData } from '../lib/name-utils'

/**
 * Optimized Dashboard Context
 * Consolidates GlobalDashboardContext and DashboardContext with:
 * - Selective subscriptions
 * - Efficient data fetching
 * - Smart caching
 * - Reduced re-renders
 */

// Split into focused contexts
const DashboardDataContext = createContext()
const DashboardActionsContext = createContext()
const DashboardSelectionContext = createContext()

// Cache management
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const METRICS_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for metrics

class DashboardCache {
  constructor() {
    this.cache = new Map()
  }

  get(key) {
    const entry = this.cache.get(key)
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data
    }
    return null
  }

  set(key, data, ttl = CACHE_DURATION) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }

  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export function OptimizedDashboardProvider({ children }) {
  const { user, profile, userRole } = useAuth()
  const [initialized, setInitialized] = useState(false)
  
  // Core data state (less frequent changes)
  const [dashboardData, setDashboardData] = useState({
    availableLocations: [],
    availableBarbers: [],
    systemHealth: null,
    metrics: null,
    lastUpdate: null
  })
  
  // Selection state (frequent changes)
  const [selectionState, setSelectionState] = useState({
    selectedLocations: [],
    selectedBarbers: [],
    viewMode: 'individual',
    timeRange: { 
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  })
  
  // UI state
  const [uiState, setUiState] = useState({
    loading: false,
    error: null,
    isRefreshing: false
  })
  
  // Cache instance
  const cache = useMemo(() => new DashboardCache(), [])
  
  // Supabase client
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ), [])

  // Cleanup cache periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cache.cleanup()
    }, 60000) // Every minute
    
    return () => clearInterval(cleanupInterval)
  }, [cache])

  // User permissions (memoized)
  const permissions = useMemo(() => {
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
      }
    }
    
    return rolePermissions[userRole] || rolePermissions['CLIENT']
  }, [userRole])

  // Optimized locations loading with caching
  const loadAvailableLocations = useCallback(async () => {
    if (!user?.id) return []
    
    const cacheKey = `locations_${user.id}_${userRole}`
    const cached = cache.get(cacheKey)
    if (cached) {
      setDashboardData(prev => ({ ...prev, availableLocations: cached }))
      return cached
    }
    
    try {
      let locations = []
      
      if (permissions.canSeeAllLocations) {
        const { data, error } = await supabase
          .from('barbershops')
          .select('id, name, city, state, address, phone, owner_id')
          .order('name')
        
        if (!error && data) locations = data
      } else if (permissions.canSeeOwnLocation) {
        const shopId = profile?.shop_id || profile?.barbershop_id
        
        if (shopId) {
          const { data, error } = await supabase
            .from('barbershops')
            .select('id, name, city, state, address, phone, owner_id')
            .eq('id', shopId)
          
          if (!error && data) locations = data
        } else if (user.id) {
          // Check staff associations
          const { data: staffData, error: staffError } = await supabase
            .from('barbershop_staff')
            .select('barbershop_id, barbershops(id, name, city, state, address, phone, owner_id)')
            .eq('user_id', user.id)
            .eq('is_active', true)
          
          if (!staffError && staffData?.length > 0) {
            locations = staffData.map(s => s.barbershops).filter(Boolean)
          }
        }
      }
      
      cache.set(cacheKey, locations)
      setDashboardData(prev => ({ ...prev, availableLocations: locations }))
      
      // Auto-select first location if none selected
      if (locations.length > 0 && selectionState.selectedLocations.length === 0 && !initialized) {
        setSelectionState(prev => ({
          ...prev,
          selectedLocations: [locations[0].id]
        }))
      }
      
      return locations
    } catch (error) {
      console.error('Error loading locations:', error)
      setUiState(prev => ({ ...prev, error: error.message }))
      return []
    }
  }, [user, profile, userRole, permissions, supabase, cache, selectionState.selectedLocations.length, initialized])

  // Optimized barbers loading
  const loadAvailableBarbers = useCallback(async () => {
    if (selectionState.selectedLocations.length === 0) {
      setDashboardData(prev => ({ ...prev, availableBarbers: [] }))
      return []
    }
    
    const cacheKey = `barbers_${selectionState.selectedLocations.join('_')}`
    const cached = cache.get(cacheKey)
    if (cached) {
      setDashboardData(prev => ({ ...prev, availableBarbers: cached }))
      return cached
    }
    
    try {
      const { data, error } = await supabase
        .from('barbershop_staff')
        .select('*')
        .in('barbershop_id', selectionState.selectedLocations)
        .eq('is_active', true)
        .in('role', ['barber', 'owner', 'manager'])
      
      if (error) throw error
      if (!data) return []
      
      // Fetch related data efficiently
      const userIds = [...new Set(data.map(s => s.user_id).filter(Boolean))]
      const barbershopIds = [...new Set(data.map(s => s.barbershop_id).filter(Boolean))]
      
      const [profilesData, barbershopsData] = await Promise.all([
        userIds.length > 0 ? supabase
          .from('profiles')
          .select('id, full_name, first_name, last_name, email, avatar_url')
          .in('id', userIds)
          .then(({ data, error }) => error ? [] : data || [])
          : [],
        barbershopIds.length > 0 ? supabase
          .from('barbershops')
          .select('id, name')
          .in('id', barbershopIds)
          .then(({ data, error }) => error ? [] : data || [])
          : []
      ])
      
      // Create lookup maps
      const profilesMap = Object.fromEntries(profilesData.map(p => [p.id, p]))
      const barbershopsMap = Object.fromEntries(barbershopsData.map(b => [b.id, b]))
      
      const barbers = data.map(staff => {
        const profile = profilesMap[staff.user_id] || {}
        const barbershop = barbershopsMap[staff.barbershop_id] || {}
        
        // Normalize name data for consistent handling
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
          firstName: normalizedNames.firstName,
          lastName: normalizedNames.lastName,
          fullName: normalizedNames.fullName,
          email: profile.email,
          avatar_url: profile.avatar_url,
          role: staff.role,
          location: barbershop.name,
          barbershop_id: staff.barbershop_id
        }
      })
      
      cache.set(cacheKey, barbers)
      setDashboardData(prev => ({ ...prev, availableBarbers: barbers }))
      return barbers
    } catch (error) {
      console.error('Error loading barbers:', error)
      setUiState(prev => ({ ...prev, error: error.message }))
      return []
    }
  }, [selectionState.selectedLocations, supabase, cache])

  // Optimized metrics loading
  const loadMetrics = useCallback(async () => {
    const cacheKey = `metrics_${selectionState.selectedLocations.join('_')}_${JSON.stringify(selectionState.timeRange)}`
    const cached = cache.get(cacheKey)
    if (cached) {
      setDashboardData(prev => ({ ...prev, metrics: cached }))
      return cached
    }
    
    try {
      const response = await fetch('/api/dashboard/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: selectionState.selectedLocations,
          timeRange: selectionState.timeRange,
          detailed: true
        })
      })
      
      if (!response.ok) throw new Error('Metrics loading failed')
      
      const metrics = await response.json()
      
      cache.set(cacheKey, metrics, METRICS_CACHE_DURATION)
      setDashboardData(prev => ({ 
        ...prev, 
        metrics,
        lastUpdate: new Date().toISOString() 
      }))
      
      return metrics
    } catch (error) {
      console.error('Error loading metrics:', error)
      setUiState(prev => ({ ...prev, error: error.message }))
      return null
    }
  }, [selectionState.selectedLocations, selectionState.timeRange, cache])

  // System health check
  const checkSystemHealth = useCallback(async () => {
    const cacheKey = 'system_health'
    const cached = cache.get(cacheKey)
    if (cached) {
      setDashboardData(prev => ({ ...prev, systemHealth: cached }))
      return cached
    }
    
    try {
      const response = await fetch('/api/ai/health')
      if (!response.ok) throw new Error('Health check failed')
      
      const health = await response.json()
      
      cache.set(cacheKey, health, 30000) // 30 second cache for health
      setDashboardData(prev => ({ ...prev, systemHealth: health }))
      
      return health
    } catch (error) {
      console.error('System health check failed:', error)
      return null
    }
  }, [cache])

  // Initialize dashboard
  useEffect(() => {
    if (user?.id && profile && !initialized) {

      const initialize = async () => {
        setUiState(prev => ({ ...prev, loading: true }))
        
        try {
          // Load context from localStorage
          const savedContext = localStorage.getItem(`dashboard_context_${user.id}`)
          if (savedContext) {
            const parsed = JSON.parse(savedContext)
            const dayAgo = Date.now() - (24 * 60 * 60 * 1000)
            
            if (parsed.lastUpdated && parsed.lastUpdated > dayAgo) {
              setSelectionState(prev => ({
                ...prev,
                ...parsed.selection
              }))
            }
          }
          
          // Load initial data
          await Promise.all([
            loadAvailableLocations(),
            checkSystemHealth()
          ])
          
          setInitialized(true)
        } catch (error) {
          console.error('Dashboard initialization failed:', error)
          setUiState(prev => ({ ...prev, error: error.message }))
        } finally {
          setUiState(prev => ({ ...prev, loading: false }))
        }
      }
      
      initialize()
    }
  }, [user, profile, initialized, loadAvailableLocations, checkSystemHealth])

  // Load barbers when locations change
  useEffect(() => {
    if (selectionState.selectedLocations.length > 0 && initialized) {
      loadAvailableBarbers()
    }
  }, [selectionState.selectedLocations, initialized, loadAvailableBarbers])

  // Save context changes
  useEffect(() => {
    if (initialized && user?.id) {
      const contextData = {
        selection: selectionState,
        lastUpdated: Date.now()
      }
      localStorage.setItem(`dashboard_context_${user.id}`, JSON.stringify(contextData))
    }
  }, [selectionState, initialized, user?.id])

  // Action handlers
  const updateSelection = useCallback((updates) => {
    setSelectionState(prev => ({ ...prev, ...updates }))
  }, [])

  const refreshData = useCallback(async () => {
    setUiState(prev => ({ ...prev, isRefreshing: true }))
    cache.clear() // Clear cache for fresh data
    
    try {
      await Promise.all([
        loadAvailableLocations(),
        loadAvailableBarbers(),
        loadMetrics(),
        checkSystemHealth()
      ])
    } finally {
      setUiState(prev => ({ ...prev, isRefreshing: false }))
    }
  }, [loadAvailableLocations, loadAvailableBarbers, loadMetrics, checkSystemHealth, cache])

  // Memoized context values
  const dataValue = useMemo(() => ({
    ...dashboardData,
    permissions,
    isInitialized: initialized
  }), [dashboardData, permissions, initialized])

  const actionsValue = useMemo(() => ({
    loadAvailableLocations,
    loadAvailableBarbers,
    loadMetrics,
    checkSystemHealth,
    refreshData,
    updateSelection,
    clearError: () => setUiState(prev => ({ ...prev, error: null }))
  }), [loadAvailableLocations, loadAvailableBarbers, loadMetrics, checkSystemHealth, refreshData, updateSelection])

  const selectionValue = useMemo(() => ({
    ...selectionState,
    ...uiState
  }), [selectionState, uiState])

  return (
    <DashboardDataContext.Provider value={dataValue}>
      <DashboardActionsContext.Provider value={actionsValue}>
        <DashboardSelectionContext.Provider value={selectionValue}>
          {children}
        </DashboardSelectionContext.Provider>
      </DashboardActionsContext.Provider>
    </DashboardDataContext.Provider>
  )
}

// Selective hooks
export const useDashboardData = () => {
  const context = useContext(DashboardDataContext)
  if (!context) {
    throw new Error('useDashboardData must be used within OptimizedDashboardProvider')
  }
  return context
}

export const useDashboardActions = () => {
  const context = useContext(DashboardActionsContext)
  if (!context) {
    throw new Error('useDashboardActions must be used within OptimizedDashboardProvider')
  }
  return context
}

export const useDashboardSelection = () => {
  const context = useContext(DashboardSelectionContext)
  if (!context) {
    throw new Error('useDashboardSelection must be used within OptimizedDashboardProvider')
  }
  return context
}

// Composite hook for backward compatibility
export const useOptimizedDashboard = () => {
  const data = useDashboardData()
  const actions = useDashboardActions()
  const selection = useDashboardSelection()
  
  return { ...data, ...actions, ...selection }
}